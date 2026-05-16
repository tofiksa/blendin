"use client";

import { useCallback, useState } from "react";
import { QuizPackQuestionFields } from "@/components/admin/QuizPackQuestionFields";
import {
  serializeQuestionsForApi,
  useQuizPackQuestions,
  validateQuizQuestions,
} from "@/components/admin/useQuizPackQuestions";

type Props = {
  bearer: string;
  onPackCreated: (info: { slug: string; quizTemplateName: string }) => void;
};

export function TenantQuizBootstrap({ bearer, onPackCreated }: Props) {
  const [slug, setSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [templateName, setTemplateName] = useState("Min onboarding-quiz");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [surfaceColor, setSurfaceColor] = useState("");
  const { questions, addQuestion, removeQuestion, updateStem, updateOption } =
    useQuizPackQuestions();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneHint, setDoneHint] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setErr(null);
    setDoneHint(null);
    const secret = bearer.trim();
    if (!secret) {
      setErr("Legg inn admin-token først.");
      return;
    }
    const s = slug.trim().toLowerCase();
    const tn = tenantName.trim();
    const qt = templateName.trim();
    if (!s || !tn || !qt) {
      setErr("Fyll ut tenant-slug, visningsnavn og quiz-navn.");
      return;
    }
    const qErr = validateQuizQuestions(questions);
    if (qErr) {
      setErr(qErr);
      return;
    }

    setBusy(true);
    try {
      const tenantPayload: Record<string, unknown> = { slug: s, name: tn };
      const lu = logoUrl.trim();
      if (lu) tenantPayload.logoUrl = lu;
      const pc = primaryColor.trim();
      const ac = accentColor.trim();
      const sc = surfaceColor.trim();
      if (pc) tenantPayload.primaryColor = pc;
      if (ac) tenantPayload.accentColor = ac;
      if (sc) tenantPayload.surfaceColor = sc;

      const r = await fetch("/api/admin/tenant-quiz-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          tenant: tenantPayload,
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
        `Opprettet tenant «${s}» med ${questions.length} spørsmål. Slug og mal er satt under — du kan opprette økt.`,
      );
      onPackCreated({ slug: s, quizTemplateName: qt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kunne ikke opprette pakke.");
    } finally {
      setBusy(false);
    }
  }, [
    accentColor,
    bearer,
    logoUrl,
    onPackCreated,
    primaryColor,
    questions,
    slug,
    surfaceColor,
    tenantName,
    templateName,
  ]);

  return (
    <section className="space-y-4 rounded-2xl border border-accent-soft bg-background/80 p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Ny tenant og quiz</h2>
        <p className="text-sm text-muted">
          Opprett virksomhet, quiz-mal og spørsmål med{" "}
          <strong className="text-foreground">fire svar</strong> per spørsmål — samme opplegg som
          nyansatt og lag. Bruk{" "}
          <code className="rounded bg-accent-soft px-1 font-mono text-xs">{"{name}"}</code> der du
          vil ha nyansattes navn (valgfritt).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="bootstrap-slug" className="block text-sm font-medium text-muted">
            Tenant-slug (URL-vennlig)
          </label>
          <input
            id="bootstrap-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="min-bedrift"
            className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 font-mono text-sm lowercase"
            autoComplete="off"
          />
          <p className="text-xs text-muted">Små bokstaver, tall og bindestrek. Må være unik.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="bootstrap-name" className="block text-sm font-medium text-muted">
            Visningsnavn
          </label>
          <input
            id="bootstrap-name"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Min bedrift AS"
            className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <details className="rounded-xl border border-accent-soft bg-accent-soft/15 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Merking (valgfritt)
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="bootstrap-logo" className="text-xs font-medium text-muted">
              Logo-URL
            </label>
            <input
              id="bootstrap-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-accent-soft bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="bootstrap-primary" className="text-xs font-medium text-muted">
              Primærfarge (hex)
            </label>
            <input
              id="bootstrap-primary"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#3d2914"
              className="w-full rounded-lg border border-accent-soft bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="bootstrap-accent" className="text-xs font-medium text-muted">
              Accent (hex)
            </label>
            <input
              id="bootstrap-accent"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#c4956a"
              className="w-full rounded-lg border border-accent-soft bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="bootstrap-surface" className="text-xs font-medium text-muted">
              Overflate (hex)
            </label>
            <input
              id="bootstrap-surface"
              value={surfaceColor}
              onChange={(e) => setSurfaceColor(e.target.value)}
              placeholder="#f5ede4"
              className="w-full rounded-lg border border-accent-soft bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
      </details>

      <div className="space-y-2">
        <label htmlFor="bootstrap-template" className="block text-sm font-medium text-muted">
          Navn på quiz-mal
        </label>
        <input
          id="bootstrap-template"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted">
          Samme navn du senere kan velge under «Ny økt» (quiz-mal).
        </p>
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
        {busy ? "Oppretter …" : "Opprett tenant og quiz"}
      </button>
      {!bearer.trim() ? (
        <p className="text-xs text-muted">Krever lagret admin-token over.</p>
      ) : null}
    </section>
  );
}
