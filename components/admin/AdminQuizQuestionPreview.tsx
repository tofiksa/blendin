"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConfidenceBandAllowed } from "@/lib/newHireAnswers";
import { NEW_HIRE_CONFIDENCE_BANDS } from "@/lib/newHireConfidenceBands";
import type { QuestionPublic } from "@/lib/quizQuestions";

type Props = {
  bearer: string;
  tenantSlug: string;
  /** Tom = samme som ved økt-opprettelse (standard demo-mal). */
  quizTemplateName: string;
};

export function AdminQuizQuestionPreview({ bearer, tenantSlug, quizTemplateName }: Props) {
  const [index, setIndex] = useState(0);
  const [showBands, setShowBands] = useState(true);
  const [question, setQuestion] = useState<QuestionPublic | null>(null);
  const [total, setTotal] = useState(0);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [pickedBand, setPickedBand] = useState<ConfidenceBandAllowed | null>(null);

  useEffect(() => {
    const secret = bearer.trim();
    const slug = tenantSlug.trim();
    if (!secret || !slug) {
      setQuestion(null);
      setTotal(0);
      setResolvedName(null);
      setPickedOption(null);
      setPickedBand(null);
      setLoadErr(null);
      return;
    }
    const ac = new AbortController();
    const params = new URLSearchParams();
    const qt = quizTemplateName.trim();
    if (qt) params.set("quizTemplateName", qt);
    params.set("index", String(index));

    void fetch(
      `/api/admin/tenants/by-slug/${encodeURIComponent(slug)}/quiz-question?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        signal: ac.signal,
      },
    )
      .then(async (r) => {
        const body: unknown = await r.json();
        if (!r.ok) {
          const msg =
            typeof body === "object" && body !== null && "error" in body
              ? String((body as { error: unknown }).error)
              : `Feil ${r.status}`;
          throw new Error(msg);
        }
        const q = body as {
          question: QuestionPublic;
          totalQuestions: number;
          templateName: string;
        };
        setQuestion(q.question);
        setTotal(q.totalQuestions);
        setResolvedName(q.templateName);
        setPickedOption(null);
        setPickedBand(null);
        setLoadErr(null);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setQuestion(null);
        setTotal(0);
        setResolvedName(null);
        setPickedOption(null);
        setPickedBand(null);
        setLoadErr(e instanceof Error ? e.message : "Kunne ikke hente forhåndsvisning.");
      });

    return () => ac.abort();
  }, [bearer, index, quizTemplateName, tenantSlug]);

  const goPrev = useCallback(() => {
    setPickedOption(null);
    setPickedBand(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setPickedOption(null);
    setPickedBand(null);
    setIndex((i) => (total > 0 ? Math.min(total - 1, i + 1) : i));
  }, [total]);

  if (!bearer.trim() || !tenantSlug.trim()) {
    return (
      <p className="text-xs text-muted">
        Lagre admin-token og fyll tenant-slug over for å se forhåndsvisning.
      </p>
    );
  }

  return (
    <details className="rounded-xl border border-accent-soft bg-accent-soft/15 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Forhåndsvis som nyansatt (ett spørsmål)
      </summary>
      <div className="mt-4 space-y-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showBands}
            onChange={(e) => setShowBands(e.target.checked)}
          />
          Vis trygghet-bånd (samme som nyansatt-skjema)
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={index <= 0 || !question}
            onClick={() => goPrev()}
            className="rounded-lg border border-accent-soft bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Forrige
          </button>
          <p className="text-xs text-muted">
            Spørsmål{" "}
            <span className="font-semibold text-foreground">
              {total > 0 ? index + 1 : "—"} av {total || "—"}
            </span>
            {resolvedName ? (
              <>
                {" "}
                · mal <span className="font-mono text-foreground">{resolvedName}</span>
              </>
            ) : null}
          </p>
          <button
            type="button"
            disabled={total === 0 || index >= total - 1 || !question}
            onClick={() => goNext()}
            className="rounded-lg border border-accent-soft bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Neste
          </button>
        </div>

        {loadErr ? <p className="text-sm text-accent">{loadErr}</p> : null}

        {question ? (
          <article className="rounded-2xl border border-accent-soft bg-background/80 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Forhåndsvisning
            </p>
            <h3 className="mt-2 text-xl font-semibold leading-snug text-foreground">
              {question.stem}
            </h3>

            <fieldset className="mt-5 space-y-3">
              <legend className="text-sm font-medium text-muted">Svar</legend>
              <div className="flex flex-col gap-2">
                {[...question.options]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((opt) => {
                    const checked = pickedOption === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                          checked
                            ? "border-accent bg-accent-soft/80"
                            : "border-accent-soft bg-accent-soft/25 hover:bg-accent-soft/40"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          name="admin-preview-opt"
                          checked={checked}
                          onChange={() => setPickedOption(opt.id)}
                        />
                        <span className="leading-snug text-foreground">{opt.label}</span>
                      </label>
                    );
                  })}
              </div>
            </fieldset>

            {showBands ? (
              <fieldset className="mt-6 space-y-3">
                <legend className="text-sm font-medium text-muted">
                  Hvor trygg er du på dette svaret?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NEW_HIRE_CONFIDENCE_BANDS.map((b) => {
                    const picked = pickedBand === b.value;
                    return (
                      <label
                        key={b.value}
                        className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2 text-sm ${
                          picked
                            ? "border-accent bg-accent-soft/90"
                            : "border-accent-soft bg-accent-soft/30 hover:bg-accent-soft/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="admin-preview-band"
                            checked={picked}
                            onChange={() => setPickedBand(b.value)}
                          />
                          <span className="font-medium text-foreground">{b.title}</span>
                        </span>
                        <span className="pl-6 text-xs text-muted">{b.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <p className="mt-4 text-xs text-muted">
              Dette lagrer ikke noe — kun layout som nyansatt ser etter valgt mal (samme felt som
              «Quiz-mal» over).
            </p>
          </article>
        ) : !loadErr ? (
          <p className="text-sm text-muted">Laster …</p>
        ) : null}
      </div>
    </details>
  );
}
