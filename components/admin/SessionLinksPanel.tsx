"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SessionControls } from "@/components/admin/SessionControls";
import type { AdminSessionState, AdminStoredSession } from "@/lib/adminStoredSession";

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

type Props = {
  session: AdminStoredSession;
  onStateChange?: (state: AdminSessionState) => void;
  onRemove?: () => void;
  defaultExpanded?: boolean;
};

export function SessionLinksPanel({
  session,
  onStateChange,
  onRemove,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [copiedHint, setCopiedHint] = useState<string | null>(null);

  const displayUrls = useMemo(
    () => ({
      newHire: pickDisplayUrl(session.paths.newHire, session.urls.newHire),
      newHireApi: pickDisplayUrl(session.paths.newHireApi, session.urls.newHireApi),
      presenter: pickDisplayUrl(session.paths.presenter, session.urls.presenter),
      mobil: pickDisplayUrl(session.paths.mobil, session.urls.mobil),
      teamJoin: session.paths.teamJoin.map((p, i) =>
        pickDisplayUrl(p, session.urls.teamJoin[i] ?? null),
      ),
      teamJoinApi: session.paths.teamJoinApi.map((p, i) =>
        pickDisplayUrl(p, session.urls.teamJoinApi[i] ?? null),
      ),
    }),
    [session],
  );

  useEffect(() => {
    if (!expanded) return;
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
  }, [displayUrls, expanded]);

  const flashCopied = useCallback((label: string) => {
    setCopiedHint(label);
    window.setTimeout(() => setCopiedHint(null), 2400);
  }, []);

  return (
    <section className="rounded-3xl bg-secondary-container/20 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-surface-white">
            {expanded ? "−" : "+"}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">Lenker & QR</h2>
            <p className="text-xs text-muted">
              Tenant <span className="font-mono">/{session.tenantSlug}</span>
            </p>
          </div>
        </button>
        <span className="rounded-full bg-surface-container-highest px-3 py-1 font-mono text-xs text-muted">
          {session.publicId}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-white/60 hover:text-foreground"
          >
            Fjern fra liste
          </button>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="mt-6 rounded-2xl bg-surface-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-foreground">Øktstyring</h3>
            <SessionControls
              publicId={session.publicId}
              initialState={session.state}
              onStateChange={onStateChange}
            />
          </div>
          {copiedHint ? (
            <p className="mt-2 text-sm text-secondary">Kopierte: {copiedHint}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-8">
            <div className="space-y-4">
              <UrlQrBlock
                title="Nyansatt-skjerm"
                description="Quiz for ny kollega."
                url={displayUrls.newHire}
                qrSrc={qrMap.nh}
                onCopy={() => {
                  void copyText(displayUrls.newHire);
                  flashCopied("Nyansatt-URL");
                }}
              />
              <div className="rounded-2xl bg-surface-container-low px-5 py-4 text-xs">
                <p className="font-bold text-foreground">JSON-API</p>
                <code className="mt-2 block break-all rounded-xl bg-surface-container-highest/50 px-3 py-2 font-mono">
                  {displayUrls.newHireApi}
                </code>
                <button
                  type="button"
                  className="mt-2 text-secondary underline"
                  onClick={() => {
                    void copyText(displayUrls.newHireApi);
                    flashCopied("Nyansatt API");
                  }}
                >
                  Kopier API-URL
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <UrlQrBlock
                title="Presenter"
                description="Fullskjerm reveal og fasilitator."
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

          <div className="mt-8 rounded-2xl bg-surface-white p-5">
            <p className="text-sm font-bold text-foreground">
              Team-lenker ({displayUrls.teamJoin.length})
            </p>
            <p className="mt-1 text-xs text-muted">Hvert spor åpner quiz-skjerm for ett gjett.</p>
            <ul className="mt-4 flex flex-col gap-6">
              {displayUrls.teamJoin.map((url, i) => (
                <li
                  key={session.teamJoinPlainTokens[i]}
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Lenke {i + 1}
                    </p>
                    <code className="block break-all rounded-xl bg-surface-container-low px-3 py-2 font-mono text-xs">
                      {url}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        void copyText(url);
                        flashCopied(`Team ${i + 1}`);
                      }}
                      className="text-xs font-bold text-secondary underline-offset-2 hover:underline"
                    >
                      Kopier lag-URL
                    </button>
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        JSON-API
                      </p>
                      <code className="mt-1 block break-all font-mono text-[11px] text-muted">
                        {displayUrls.teamJoinApi[i]}
                      </code>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-secondary underline"
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
                      className="rounded-2xl border border-outline-variant/20 bg-surface-white p-1"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <details className="mt-6 rounded-2xl bg-surface-container-low px-5 py-4">
            <summary className="cursor-pointer text-sm font-bold text-foreground">
              Tekniske token (hemmelige)
            </summary>
            <p className="mt-2 text-xs text-muted">Vis kun for fasilitator — ikke del på skjerm.</p>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <p>
                <span className="text-muted">nh:</span> {session.newHirePlainToken}
                <button
                  type="button"
                  className="ml-2 text-secondary underline"
                  onClick={() => {
                    void copyText(session.newHirePlainToken);
                    flashCopied("nh-token");
                  }}
                >
                  kopier
                </button>
              </p>
              {session.teamJoinPlainTokens.map((t, i) => (
                <p key={t}>
                  <span className="text-muted">team {i + 1}:</span> {t}
                  <button
                    type="button"
                    className="ml-2 text-secondary underline"
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
        </>
      ) : null}
    </section>
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
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-white p-5 shadow-sm">
      <div>
        <h3 className="font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <code className="break-all rounded-xl bg-surface-container-low px-3 py-2 font-mono text-xs">
        {url}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="self-start text-xs font-bold text-secondary underline-offset-2 hover:underline"
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
          className="rounded-2xl border border-outline-variant/20 bg-surface-white p-1"
        />
      ) : null}
    </div>
  );
}
