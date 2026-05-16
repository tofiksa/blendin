"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminQuizQuestionPreview } from "@/components/admin/AdminQuizQuestionPreview";
import { ExistingTenantQuizPack } from "@/components/admin/ExistingTenantQuizPack";
import { TenantQuizBootstrap } from "@/components/admin/TenantQuizBootstrap";
import { demoQuizTemplateName } from "@/lib/constants";

const STORAGE_KEY = "blendin_admin_bearer";

type TenantPreview = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  surfaceColor: string | null;
};

type CreatedSessionResponse = {
  publicId: string;
  sessionId: string;
  newHirePlainToken: string;
  teamJoinPlainTokens: string[];
  paths: {
    newHire: string;
    newHireApi: string;
    presenter: string;
    mobil: string;
    teamJoin: string[];
    teamJoinApi: string[];
  };
  urls: {
    newHire: string | null;
    newHireApi: string | null;
    presenter: string | null;
    mobil: string | null;
    teamJoin: (string | null)[];
    teamJoinApi: (string | null)[];
  };
};

function absolutize(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (typeof window === "undefined") return href;
  return new URL(href, window.location.origin).href;
}

function pickDisplayUrl(path: string, resolved: string | null): string {
  return resolved ?? absolutize(path);
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function AdminDashboard() {
  const [bearer, setBearer] = useState("");
  const [bearerSaved, setBearerSaved] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("demo");
  const [tenantPreview, setTenantPreview] = useState<TenantPreview | null>(null);
  const [tenantErr, setTenantErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"async" | "live">("async");
  const [teamLinkCount, setTeamLinkCount] = useState(14);
  const [quizTemplateName, setQuizTemplateName] = useState("");
  const [quizTemplateList, setQuizTemplateList] = useState<{ id: string; name: string }[]>([]);
  const [quizTemplatesLoadErr, setQuizTemplatesLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedSessionResponse | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [copiedHint, setCopiedHint] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        setBearer(s);
        setBearerSaved(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const slug = tenantSlug.trim();
    if (!slug) {
      setTenantPreview(null);
      setTenantErr(null);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/tenants/by-slug/${encodeURIComponent(slug)}`, { signal: ac.signal })
        .then(async (r) => {
          const body: unknown = await r.json();
          if (!r.ok) {
            const msg =
              typeof body === "object" && body !== null && "error" in body
                ? String((body as { error: unknown }).error)
                : "Kunne ikke hente tenant.";
            throw new Error(msg);
          }
          setTenantPreview(body as TenantPreview);
          setTenantErr(null);
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          setTenantPreview(null);
          setTenantErr(e instanceof Error ? e.message : "Ukjent feil ved tenant.");
        });
    }, 350);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [tenantSlug]);

  useEffect(() => {
    const secret = bearer.trim();
    const slug = tenantSlug.trim();
    if (!secret || !slug) {
      setQuizTemplateList([]);
      setQuizTemplatesLoadErr(null);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/tenants/by-slug/${encodeURIComponent(slug)}/quiz-templates`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: ac.signal,
      })
        .then(async (r) => {
          const body: unknown = await r.json();
          if (!r.ok) {
            const msg =
              typeof body === "object" && body !== null && "error" in body
                ? String((body as { error: unknown }).error)
                : `Feil ${r.status}`;
            throw new Error(msg);
          }
          const templates =
            (body as { templates?: { id: string; name: string }[] }).templates ?? [];
          setQuizTemplateList(templates);
          setQuizTemplatesLoadErr(null);
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          setQuizTemplateList([]);
          setQuizTemplatesLoadErr(e instanceof Error ? e.message : "Kunne ikke hente mal-liste.");
        });
    }, 400);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [bearer, tenantSlug]);

  const saveBearer = useCallback(() => {
    const t = bearer.trim();
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, t);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setBearerSaved(Boolean(t));
    setFormErr(null);
  }, [bearer]);

  const onQuizPackCreated = useCallback((info: { slug: string; quizTemplateName: string }) => {
    setTenantSlug(info.slug);
    setQuizTemplateName(info.quizTemplateName);
  }, []);

  const displayUrls = useMemo(() => {
    if (!created) return null;
    return {
      newHire: pickDisplayUrl(created.paths.newHire, created.urls.newHire),
      newHireApi: pickDisplayUrl(created.paths.newHireApi, created.urls.newHireApi),
      presenter: pickDisplayUrl(created.paths.presenter, created.urls.presenter),
      mobil: pickDisplayUrl(created.paths.mobil, created.urls.mobil),
      teamJoin: created.paths.teamJoin.map((p, i) =>
        pickDisplayUrl(p, created.urls.teamJoin[i] ?? null),
      ),
      teamJoinApi: created.paths.teamJoinApi.map((p, i) =>
        pickDisplayUrl(p, created.urls.teamJoinApi[i] ?? null),
      ),
    };
  }, [created]);

  useEffect(() => {
    if (!created || !displayUrls) {
      setQrMap({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const entries: [string, string][] = [
          ["nh", displayUrls.newHire],
          ["presenter", displayUrls.presenter],
          ["mobil", displayUrls.mobil],
          ...displayUrls.teamJoin.map((u, i): [string, string] => [`team_${i}`, u]),
        ];
        const next: Record<string, string> = {};
        await Promise.all(
          entries.map(async ([key, url]) => {
            next[key] = await QRCode.toDataURL(url, { margin: 1, width: 216 });
          }),
        );
        if (!cancelled) setQrMap(next);
      } catch {
        if (!cancelled) setQrMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [created, displayUrls]);

  const createSession = useCallback(async () => {
    setFormErr(null);
    setCopiedHint(null);
    const secret = bearer.trim();
    if (!secret) {
      setFormErr("Legg inn admin-token (Bearer-hemmeligheten).");
      return;
    }
    const slug = tenantSlug.trim();
    if (!slug) {
      setFormErr("Tenant-slug kan ikke være tom.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { mode };
      if (Number.isFinite(teamLinkCount)) body.teamLinkCount = teamLinkCount;
      const qt = quizTemplateName.trim();
      if (qt) body.quizTemplateName = qt;

      const r = await fetch(`/api/admin/tenants/by-slug/${encodeURIComponent(slug)}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(body),
      });
      const payload: unknown = await r.json();
      if (!r.ok) {
        let msg = `Feil ${r.status}`;
        if (typeof payload === "object" && payload !== null && "error" in payload) {
          const err = (payload as { error: unknown }).error;
          if (typeof err === "string") msg = err;
          else msg = JSON.stringify(err);
        }
        throw new Error(msg);
      }
      setCreated(payload as CreatedSessionResponse);
    } catch (e) {
      setCreated(null);
      setFormErr(e instanceof Error ? e.message : "Kunne ikke opprette økt.");
    } finally {
      setBusy(false);
    }
  }, [bearer, mode, quizTemplateName, teamLinkCount, tenantSlug]);

  const flashCopied = useCallback((label: string) => {
    setCopiedHint(label);
    window.setTimeout(() => setCopiedHint(null), 2400);
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-5 py-10 sm:px-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Blend-In</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Admin</h1>
        <p className="max-w-prose text-muted">
          Opprett quiz-økter med magiske lenker og QR-koder. Krever{" "}
          <code className="rounded bg-accent-soft px-1 py-0.5 font-mono text-sm">
            BLEND_ADMIN_SECRET
          </code>{" "}
          som Bearer — lagres kun i denne nettleseren.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-accent-soft bg-accent-soft/25 p-6">
        <h2 className="text-lg font-semibold text-foreground">Innlogging</h2>
        <label htmlFor="admin-bearer" className="block text-sm font-medium text-muted">
          Admin Bearer
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="admin-bearer"
            type="password"
            autoComplete="off"
            value={bearer}
            onChange={(e) => setBearer(e.target.value)}
            className="min-w-[16rem] flex-1 rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
            placeholder="Lim inn hemmelighet …"
          />
          <button
            type="button"
            onClick={() => saveBearer()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            Lagre token
          </button>
        </div>
        {bearerSaved ? <p className="text-xs text-muted">Token lagret for denne økten.</p> : null}
      </section>

      <TenantQuizBootstrap bearer={bearer} onPackCreated={onQuizPackCreated} />

      <ExistingTenantQuizPack
        bearer={bearer}
        tenantSlug={tenantSlug}
        onTenantSlugChange={setTenantSlug}
        onQuizTemplateCreated={(name) => setQuizTemplateName(name)}
      />

      <section className="space-y-4 rounded-2xl border border-accent-soft bg-background/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Tenant</h2>
        <div className="space-y-2">
          <label htmlFor="tenant-slug" className="block text-sm font-medium text-muted">
            Slug
          </label>
          <input
            id="tenant-slug"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="w-full max-w-md rounded-xl border border-accent-soft bg-background px-3 py-2 font-mono text-sm"
          />
        </div>
        {tenantErr ? <p className="text-sm text-accent">{tenantErr}</p> : null}
        {tenantPreview ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-accent-soft/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{tenantPreview.name}</p>
              <p className="text-xs text-muted">/{tenantPreview.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["Primær", tenantPreview.primaryColor],
                ["Accent", tenantPreview.accentColor],
                ["Overflate", tenantPreview.surfaceColor],
              ].map(([label, hex]) =>
                hex ? (
                  <div key={label} className="flex items-center gap-2 text-xs text-muted">
                    <span
                      className="h-8 w-8 rounded-full border border-accent-soft shadow-inner"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                    {label}
                  </div>
                ) : null,
              )}
            </div>
            <p className="w-full text-xs text-muted">
              Redigering av branding kommer senere — foreløpig styres dette i databasen / seed.
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-accent-soft bg-background/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Ny økt</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="session-mode" className="block text-sm font-medium text-muted">
              Modus
            </label>
            <select
              id="session-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as "async" | "live")}
              className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
            >
              <option value="async">Asynkron</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="team-count" className="block text-sm font-medium text-muted">
              Antall team-lenker
            </label>
            <input
              id="team-count"
              type="number"
              min={1}
              max={100}
              value={teamLinkCount}
              onChange={(e) => setTeamLinkCount(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="quiz-template" className="block text-sm font-medium text-muted">
            Quiz-mal (valgfritt)
          </label>
          <input
            id="quiz-template"
            list="admin-quiz-template-options"
            value={quizTemplateName}
            onChange={(e) => setQuizTemplateName(e.target.value)}
            placeholder={demoQuizTemplateName}
            autoComplete="off"
            className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
          />
          <datalist id="admin-quiz-template-options">
            {quizTemplateList.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
          <p className="text-xs text-muted">
            Tom felt bruker standard demo-mal (
            <span className="font-mono">{demoQuizTemplateName}</span>) når den finnes for tenanten.
            Skriv eller velg fra forslag — navnet må stemme nøyaktig.
          </p>
          {bearer.trim() && tenantSlug.trim() && quizTemplatesLoadErr ? (
            <p className="text-xs text-accent">{quizTemplatesLoadErr}</p>
          ) : null}
          {bearer.trim() &&
          tenantSlug.trim() &&
          !quizTemplatesLoadErr &&
          quizTemplateList.length > 0 ? (
            <p className="text-xs text-muted">
              {quizTemplateList.length} mal(er) for denne tenanten.
            </p>
          ) : null}
        </div>

        <AdminQuizQuestionPreview
          key={`${tenantSlug.trim().toLowerCase()}:${quizTemplateName.trim()}`}
          bearer={bearer}
          tenantSlug={tenantSlug}
          quizTemplateName={quizTemplateName}
        />

        {formErr ? <p className="text-sm text-accent">{formErr}</p> : null}
        <button
          type="button"
          disabled={busy || !bearer.trim()}
          onClick={() => void createSession()}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background disabled:opacity-40"
        >
          {busy ? "Oppretter …" : "Opprett økt"}
        </button>
        {!bearer.trim() ? (
          <p className="text-xs text-muted">Du må lime inn admin-token over for å opprette økt.</p>
        ) : null}
      </section>

      {created && displayUrls ? (
        <section className="space-y-6 rounded-2xl border border-accent-soft bg-accent-soft/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Lenker & QR</h2>
            <p className="font-mono text-sm text-muted">{created.publicId}</p>
          </div>
          {copiedHint ? <p className="text-sm text-muted">Kopierte: {copiedHint}</p> : null}

          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <UrlQrBlock
                title="Nyansatt-skjerm"
                description="Quiz for ny kollega · åpnes i vanlig nettleser (samme lenke som QR)."
                url={displayUrls.newHire}
                qrSrc={qrMap.nh}
                onCopy={() => {
                  void copyText(displayUrls.newHire);
                  flashCopied("Nyansatt-URL");
                }}
              />
              <div className="rounded-xl border border-accent-soft bg-accent-soft/35 px-4 py-3 text-xs">
                <p className="font-medium text-foreground">JSON-API (integrasjon / debugging)</p>
                <code className="mt-2 block break-all rounded-lg bg-background/80 px-2 py-2 font-mono">
                  {displayUrls.newHireApi}
                </code>
                <button
                  type="button"
                  className="mt-2 text-accent underline"
                  onClick={() => {
                    void copyText(displayUrls.newHireApi);
                    flashCopied("Nyansatt API");
                  }}
                >
                  Kopier API-URL
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <UrlQrBlock
                title="Presenter"
                description="Fullskjerm reveal og facilitator."
                url={displayUrls.presenter}
                qrSrc={qrMap.presenter}
                onCopy={() => {
                  void copyText(displayUrls.presenter);
                  flashCopied("Presenter-URL");
                }}
              />
              <UrlQrBlock
                title="Mobil-følger"
                description="Enkel live-visning for telefoner."
                url={displayUrls.mobil}
                qrSrc={qrMap.mobil}
                onCopy={() => {
                  void copyText(displayUrls.mobil);
                  flashCopied("Mobil-URL");
                }}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl bg-background/70 px-4 py-4">
            <p className="text-sm font-medium text-foreground">
              Team-lenker ({displayUrls.teamJoin.length})
            </p>
            <p className="text-xs text-muted">
              Hvert spor åpner quiz-skjerm for ett gjett · QR viser samme URL som du deler i chat.
            </p>
            <ul className="flex flex-col gap-6">
              {displayUrls.teamJoin.map((url, i) => (
                <li
                  key={created.teamJoinPlainTokens[i]}
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Lenke {i + 1}
                    </p>
                    <code className="block break-all rounded-lg bg-accent-soft/50 px-3 py-2 font-mono text-xs">
                      {url}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        void copyText(url);
                        flashCopied(`Team ${i + 1}`);
                      }}
                      className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      Kopier lag-URL
                    </button>
                    <div className="rounded-lg border border-accent-soft/80 bg-background/60 px-2 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                        JSON-API
                      </p>
                      <code className="mt-1 block break-all font-mono text-[11px] text-muted">
                        {displayUrls.teamJoinApi[i]}
                      </code>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-accent underline"
                        onClick={() => {
                          void copyText(displayUrls.teamJoinApi[i] ?? "");
                          flashCopied(`Team API ${i + 1}`);
                        }}
                      >
                        Kopier API-URL
                      </button>
                    </div>
                  </div>
                  {qrMap[`team_${i}`] ? (
                    <Image
                      src={qrMap[`team_${i}`]}
                      alt=""
                      width={140}
                      height={140}
                      unoptimized
                      className="rounded-lg border border-accent-soft bg-background p-1"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-xl border border-accent-soft bg-background/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Tekniske token (hemmelige)
            </summary>
            <p className="mt-2 text-xs text-muted">
              Vis kun for fasilitator — ikke del på skjerm. Brukes som query-parameter og i
              klienter.
            </p>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <p>
                <span className="text-muted">nh:</span> {created.newHirePlainToken}
                <button
                  type="button"
                  className="ml-2 text-accent underline"
                  onClick={() => {
                    void copyText(created.newHirePlainToken);
                    flashCopied("nh-token");
                  }}
                >
                  kopier
                </button>
              </p>
              {created.teamJoinPlainTokens.map((t, i) => (
                <p key={t}>
                  <span className="text-muted">team {i + 1}:</span> {t}
                  <button
                    type="button"
                    className="ml-2 text-accent underline"
                    onClick={() => {
                      void copyText(t);
                      flashCopied(`team-token-${i + 1}`);
                    }}
                  >
                    kopier
                  </button>
                </p>
              ))}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}

function UrlQrBlock({
  title,
  description,
  url,
  qrSrc,
  onCopy,
}: {
  title: string;
  description: string;
  url: string;
  qrSrc: string | undefined;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent-soft bg-background/70 p-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <code className="break-all rounded-lg bg-accent-soft/40 px-3 py-2 font-mono text-xs">
        {url}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="self-start text-xs font-semibold text-accent underline-offset-2 hover:underline"
      >
        Kopier URL
      </button>
      {qrSrc ? (
        <Image
          src={qrSrc}
          alt=""
          width={160}
          height={160}
          unoptimized
          className="rounded-lg border border-accent-soft bg-background p-1"
        />
      ) : null}
    </div>
  );
}
