"use client";

import { useCallback, useEffect, useState } from "react";
import { QuizPackQuestionFields } from "@/components/admin/QuizPackQuestionFields";
import {
  serializeQuestionsForApi,
  useQuizPackQuestions,
  validateQuizQuestions,
} from "@/components/admin/useQuizPackQuestions";

type TenantRow = { slug: string; name: string };

type Props = {
  bearer: string;
  tenantSlug: string;
  onTenantSlugChange: (slug: string) => void;
  onQuizTemplateCreated: (templateName: string) => void;
};

export function ExistingTenantQuizPack({
  bearer,
  tenantSlug,
  onTenantSlugChange,
  onQuizTemplateCreated,
}: Props) {
  const [tenantList, setTenantList] = useState<TenantRow[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Ny mal");
  const { questions, addQuestion, removeQuestion, updateStem, updateOption } =
    useQuizPackQuestions();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneHint, setDoneHint] = useState<string | null>(null);

  useEffect(() => {
    const secret = bearer.trim();
    if (!secret) {
      setTenantList([]);
      setListErr(null);
      return;
    }
    const ac = new AbortController();
    void fetch("/api/admin/tenants", {
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
        const tenants = (body as { tenants?: TenantRow[] }).tenants ?? [];
        setTenantList(tenants);
        setListErr(null);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setTenantList([]);
        setListErr(e instanceof Error ? e.message : "Kunne ikke hente tenant-liste.");
      });
    return () => ac.abort();
  }, [bearer]);

  const submit = useCallback(async () => {
    setErr(null);
    setDoneHint(null);
    const secret = bearer.trim();
    if (!secret) {
      setErr("Legg inn admin-token først.");
      return;
    }
    const slug = tenantSlug.trim().toLowerCase();
    const qt = templateName.trim();
    if (!slug) {
      setErr("Velg eller skriv inn tenant-slug.");
      return;
    }
    if (!qt) {
      setErr("Skriv inn navn på quiz-mal.");
      return;
    }
    const qErr = validateQuizQuestions(questions);
    if (qErr) {
      setErr(qErr);
      return;
    }

    setBusy(true);
    try {
      const r = await fetch(`/api/admin/tenants/by-slug/${encodeURIComponent(slug)}/quiz-pack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          quizTemplateName: qt,
          questions: serializeQuestionsForApi(questions),
        }),
      });
      const payload: unknown = await r.json();
      if (!r.ok) {
        let msg = `Feil ${r.status}`;
        if (typeof payload === "object" && payload !== null && "error" in payload) {
          const e = (payload as { error: unknown }).error;
          if (typeof e === "string") msg = e;
          else msg = JSON.stringify(e);
        }
        throw new Error(msg);
      }
      setDoneHint(
        `La til quiz-mal «${qt}» (${questions.length} spørsmål) på «${slug}». Mal-navnet er fylt inn under «Ny økt».`,
      );
      onQuizTemplateCreated(qt);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kunne ikke opprette mal.");
    } finally {
      setBusy(false);
    }
  }, [bearer, onQuizTemplateCreated, questions, templateName, tenantSlug]);

  return (
    <section className="space-y-4 rounded-2xl border border-accent-soft bg-background/80 p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Ny quiz-mal på eksisterende tenant
        </h2>
        <p className="text-sm text-muted">
          Tenant må allerede finnes (f.eks. <span className="font-mono">demo</span> eller en du har
          opprettet over). Mal-navn må være <strong className="text-foreground">unikt</strong> for
          denne tenanten.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="exist-tenant-pick" className="block text-sm font-medium text-muted">
            Velg tenant
          </label>
          <select
            id="exist-tenant-pick"
            value={tenantList.some((t) => t.slug === tenantSlug) ? tenantSlug : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onTenantSlugChange(v);
            }}
            className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
          >
            <option value="">— Velg —</option>
            {tenantList.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          {listErr ? <p className="text-xs text-accent">{listErr}</p> : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="exist-tenant-slug" className="block text-sm font-medium text-muted">
            Eller skriv slug direkte
          </label>
          <input
            id="exist-tenant-slug"
            value={tenantSlug}
            onChange={(e) => onTenantSlugChange(e.target.value)}
            placeholder="demo"
            className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 font-mono text-sm lowercase"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="exist-template-name" className="block text-sm font-medium text-muted">
          Navn på ny quiz-mal
        </label>
        <input
          id="exist-template-name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
        />
      </div>

      <QuizPackQuestionFields
        questions={questions}
        addQuestion={addQuestion}
        removeQuestion={removeQuestion}
        updateStem={updateStem}
        updateOption={updateOption}
      />

      {err ? <p className="text-sm text-accent">{err}</p> : null}
      {doneHint ? <p className="text-sm text-muted">{doneHint}</p> : null}

      <button
        type="button"
        disabled={busy || !bearer.trim()}
        onClick={() => void submit()}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background disabled:opacity-40"
      >
        {busy ? "Oppretter …" : "Legg til quiz-mal"}
      </button>
    </section>
  );
}
