"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { AdminQuizQuestionPreview } from "@/components/admin/AdminQuizQuestionPreview";
import { useAdminStoredSessions } from "@/hooks/useAdminStoredSessions";
import type { AdminCreatedSession } from "@/lib/adminStoredSession";
import { demoQuizTemplateName } from "@/lib/constants";

type TenantPreview = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  surfaceColor: string | null;
};

export function SessionsPage() {
  const router = useRouter();
  const { bearer } = useAdminAuth();
  const { saveCreated } = useAdminStoredSessions();
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

  // Tenant preview lookup
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

  // Quiz template list
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

  const createSession = useCallback(async () => {
    setFormErr(null);
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
      const created = payload as AdminCreatedSession;
      saveCreated(created, slug);
      router.push(`/admin/pagaende?open=${encodeURIComponent(created.publicId)}`);
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Kunne ikke opprette økt.");
    } finally {
      setBusy(false);
    }
  }, [bearer, mode, quizTemplateName, router, saveCreated, teamLinkCount, tenantSlug]);

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: Choose tenant */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-surface-white">
            1
          </span>
          <h2 className="text-lg font-bold text-foreground">Velg tenant</h2>
        </div>
        <div className="mt-4 space-y-2">
          <label htmlFor="tenant-slug" className="block text-sm font-semibold text-muted">
            Slug
          </label>
          <input
            id="tenant-slug"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="w-full max-w-md rounded-2xl border-0 bg-surface-container-low px-4 py-3 font-mono text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-secondary/40"
          />
        </div>
        {tenantErr ? <p className="mt-3 text-sm text-error">{tenantErr}</p> : null}
        {tenantPreview ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low px-5 py-4">
            <div>
              <p className="text-sm font-bold text-foreground">{tenantPreview.name}</p>
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
                      className="h-8 w-8 rounded-full border border-outline-variant shadow-inner"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                    {label}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* Step 2: Configure session */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-surface-white">
            2
          </span>
          <h2 className="text-lg font-bold text-foreground">Konfigurer økt</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="session-mode" className="block text-sm font-semibold text-muted">
              Modus
            </label>
            <select
              id="session-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as "async" | "live")}
              className="w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none"
            >
              <option value="async">Asynkron</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="team-count" className="block text-sm font-semibold text-muted">
              Antall team-lenker
            </label>
            <input
              id="team-count"
              type="number"
              min={1}
              max={100}
              value={teamLinkCount}
              onChange={(e) => setTeamLinkCount(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <label htmlFor="quiz-template" className="block text-sm font-semibold text-muted">
            Quiz-mal (valgfritt)
          </label>
          <input
            id="quiz-template"
            list="admin-quiz-template-options"
            value={quizTemplateName}
            onChange={(e) => setQuizTemplateName(e.target.value)}
            placeholder={demoQuizTemplateName}
            autoComplete="off"
            className="w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none"
          />
          <datalist id="admin-quiz-template-options">
            {quizTemplateList.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
          <p className="text-xs text-muted">
            Tom felt bruker standard demo-mal (
            <span className="font-mono">{demoQuizTemplateName}</span>).
          </p>
          {bearer.trim() && tenantSlug.trim() && quizTemplatesLoadErr ? (
            <p className="text-xs text-error">{quizTemplatesLoadErr}</p>
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

        {formErr ? <p className="mt-4 text-sm text-error">{formErr}</p> : null}
        <button
          type="button"
          disabled={busy || !bearer.trim()}
          onClick={() => void createSession()}
          className="mt-6 rounded-2xl bg-secondary px-6 py-3.5 text-sm font-bold text-surface-white shadow-md shadow-secondary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "Oppretter ..." : "Opprett økt"}
        </button>
        <p className="mt-4 text-xs text-muted">
          Etter opprettelse lagres lenker og QR under{" "}
          <Link href="/admin/pagaende" className="font-semibold text-secondary underline-offset-2">
            Pågående økter
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
