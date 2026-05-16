"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveQuestion } from "@/lib/livePayload";
import type { ConfidenceBandAllowed } from "@/lib/newHireAnswers";
import { NEW_HIRE_CONFIDENCE_BANDS } from "@/lib/newHireConfidenceBands";

type SavedAnswerRow = {
  questionId: string;
  optionId: string;
  confidenceBand: ConfidenceBandAllowed;
};

type BootstrapPayload = {
  publicId: string;
  locked: boolean;
  questions: LiveQuestion[];
  savedAnswers: SavedAnswerRow[];
};

type DraftAnswer = {
  optionId: string | null;
  confidenceBand: ConfidenceBandAllowed | null;
};

const PATCH_DEBOUNCE_MS = 900;

function formatApiError(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const err = (payload as { error: unknown }).error;
    if (typeof err === "string") return err;
    return JSON.stringify(err);
  }
  return "Noe gikk galt.";
}

export function NewHireFlow({ publicId, nhToken }: { publicId: string; nhToken: string }) {
  const token = nhToken.trim();
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftAnswer>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busyLoad, setBusyLoad] = useState(Boolean(token));
  const [busySubmit, setBusySubmit] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const hydratedRef = useRef(false);
  const patchTimerRef = useRef<number | null>(null);

  const nhQuery = useMemo(() => encodeURIComponent(token), [token]);
  const apiUrl = `/api/sessions/${encodeURIComponent(publicId)}/new-hire?nh=${nhQuery}`;

  useEffect(() => {
    if (!token) {
      setBusyLoad(false);
      setBootstrap(null);
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    setBusyLoad(true);
    void fetch(apiUrl)
      .then(async (r) => {
        const body: unknown = await r.json();
        if (!r.ok) throw new Error(formatApiError(body));
        return body as BootstrapPayload;
      })
      .then((data) => {
        if (cancelled) return;
        setBootstrap(data);
        const next: Record<string, DraftAnswer> = {};
        for (const q of data.questions) {
          const saved = data.savedAnswers.find((s) => s.questionId === q.id);
          next[q.id] = {
            optionId: saved?.optionId ?? null,
            confidenceBand: saved?.confidenceBand ?? null,
          };
        }
        setDraft(next);
        hydratedRef.current = true;
        setLoadErr(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Kunne ikke laste økta.");
      })
      .finally(() => {
        if (!cancelled) setBusyLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  const flushDraft = useCallback(async () => {
    if (!token || !bootstrap?.questions.length || bootstrap.locked) return;
    const answers = bootstrap.questions
      .map((q) => {
        const d = draft[q.id];
        if (!d?.optionId || !d.confidenceBand) return null;
        return { questionId: q.id, optionId: d.optionId, confidenceBand: d.confidenceBand };
      })
      .filter(Boolean) as Array<{
      questionId: string;
      optionId: string;
      confidenceBand: ConfidenceBandAllowed;
    }>;
    if (answers.length === 0) return;
    setDraftErr(null);
    try {
      const r = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body: unknown = await r.json();
      if (!r.ok) throw new Error(formatApiError(body));
      setDraftNote("Kladd lagret.");
      window.setTimeout(() => setDraftNote(null), 2000);
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : "Kladd kunne ikke lagres.");
    }
  }, [apiUrl, bootstrap, draft, token]);

  useEffect(() => {
    if (!hydratedRef.current || !bootstrap || bootstrap.locked || !token) return;
    const answersCount = bootstrap.questions.filter((q) => {
      const d = draft[q.id];
      return d?.optionId && d.confidenceBand;
    }).length;
    if (answersCount === 0) return;
    if (patchTimerRef.current) window.clearTimeout(patchTimerRef.current);
    patchTimerRef.current = window.setTimeout(() => {
      void flushDraft();
    }, PATCH_DEBOUNCE_MS);
    return () => {
      if (patchTimerRef.current) window.clearTimeout(patchTimerRef.current);
    };
  }, [bootstrap, draft, flushDraft, token]);

  const answeredCount = useMemo(() => {
    if (!bootstrap) return 0;
    return bootstrap.questions.filter((q) => {
      const d = draft[q.id];
      return Boolean(d?.optionId && d.confidenceBand);
    }).length;
  }, [bootstrap, draft]);

  const allAnswered =
    bootstrap && bootstrap.questions.length > 0 && answeredCount === bootstrap.questions.length;

  const submitFinal = useCallback(async () => {
    if (!token || !bootstrap || bootstrap.locked || !allAnswered) return;
    setSubmitErr(null);
    setBusySubmit(true);
    try {
      const answers = bootstrap.questions.map((q) => {
        const d = draft[q.id];
        if (!d?.optionId || !d.confidenceBand) throw new Error("Mangler svar.");
        return { questionId: q.id, optionId: d.optionId, confidenceBand: d.confidenceBand };
      });
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body: unknown = await r.json();
      if (!r.ok) throw new Error(formatApiError(body));
      setBootstrap((prev) => (prev ? { ...prev, locked: true, savedAnswers: answers } : prev));
      setDraftNote(null);
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Innsending feilet.");
    } finally {
      setBusySubmit(false);
    }
  }, [allAnswered, apiUrl, bootstrap, draft, token]);

  const optionLabel = useCallback((q: LiveQuestion, optionId: string) => {
    return q.options.find((o) => o.id === optionId)?.label ?? optionId;
  }, []);

  const sortedQuestions = useMemo(
    () => (bootstrap ? [...bootstrap.questions].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [bootstrap],
  );

  const currentQuestion = sortedQuestions[currentIdx];
  const progressPercent = bootstrap
    ? Math.round(((currentIdx + 1) / bootstrap.questions.length) * 100)
    : 0;

  const currentDraftComplete =
    currentQuestion &&
    draft[currentQuestion.id]?.optionId &&
    draft[currentQuestion.id]?.confidenceBand;

  /* ---------- Error / loading states ---------- */

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-container-low px-6 py-16">
        <div className="max-w-sm rounded-3xl bg-surface-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Mangler lenke</h1>
          <p className="mt-3 text-muted">
            Du trenger den personlige Blend-In-lenken du fikk. Den skal ende med{" "}
            <code className="rounded-lg bg-surface-container px-2 py-0.5 font-mono text-sm">
              ?nh=...
            </code>
          </p>
        </div>
      </div>
    );
  }

  if (busyLoad && !bootstrap) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-airy-blue">
        <p className="text-muted">Henter din økt ...</p>
      </div>
    );
  }

  if (loadErr || !bootstrap) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-container-low px-6">
        <div className="max-w-sm rounded-3xl bg-surface-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Klarte ikke å åpne økta</h1>
          <p className="mt-3 text-muted">{loadErr ?? "Ukjent feil."}</p>
        </div>
      </div>
    );
  }

  const locked = bootstrap.locked;

  /* ---------- Locked (submitted) state ---------- */

  if (locked) {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-container-low">
        <div className="mx-auto flex max-w-md flex-1 flex-col px-6 py-10">
          {/* Summary card */}
          <div className="rounded-3xl bg-surface-white p-8 shadow-lg">
            <div className="mb-4 h-1 w-full rounded-full bg-secondary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Takk — svarene dine er låst
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Du har levert alle svar. Neste steg er at kollegene dine åpner sine magiske lenker og
              gjør sine gjett — dere møtes på reveal.
            </p>
          </div>

          {/* Answers recap */}
          <div className="mt-8 flex flex-col gap-4">
            {sortedQuestions.map((q) => {
              const saved = bootstrap.savedAnswers.find((s) => s.questionId === q.id);
              return (
                <div key={q.id} className="rounded-3xl bg-surface-white p-5 shadow-sm">
                  <p className="font-semibold text-foreground">{q.stem}</p>
                  <p className="mt-2 text-sm text-muted">
                    Valg:{" "}
                    <span className="font-medium text-foreground">
                      {saved ? optionLabel(q, saved.optionId) : "—"}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    Trygghet:{" "}
                    <span className="font-medium text-foreground">
                      {saved ? bandSummary(saved.confidenceBand) : "—"}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Active quiz flow ---------- */

  return (
    <div className="flex min-h-dvh flex-col bg-airy-blue">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 z-20 h-1 w-full bg-surface-container-highest">
        <div
          className="h-full rounded-r-full bg-secondary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-6">
        <button
          type="button"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-white/50 text-foreground transition-colors hover:bg-surface-white/80 disabled:opacity-30"
          aria-label="Forrige"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M13 4l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="text-sm font-semibold uppercase tracking-wider text-muted">
          Trinn {currentIdx + 1} av {sortedQuestions.length}
        </span>
        <div className="w-12" />
      </header>

      {/* Draft status */}
      {draftNote ? <div className="px-6 text-center text-xs text-muted">{draftNote}</div> : null}
      {draftErr ? <div className="px-6 text-center text-xs text-error">{draftErr}</div> : null}

      {/* Question card */}
      {currentQuestion ? (
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-32">
          <div className="w-full max-w-md rounded-[24px] bg-surface-container-high/60 p-6 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12)] sm:p-8">
            {/* Question stem */}
            <h2 className="text-center text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {currentQuestion.stem}
            </h2>

            {/* Options as large tappable cards */}
            <div className="mt-8 grid grid-cols-1 gap-3">
              {[...currentQuestion.options]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((opt) => {
                  const checked = draft[currentQuestion.id]?.optionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          [currentQuestion.id]: {
                            optionId: opt.id,
                            confidenceBand: prev[currentQuestion.id]?.confidenceBand ?? null,
                          },
                        }))
                      }
                      className={`flex items-center justify-between rounded-3xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
                        checked
                          ? "border-secondary bg-secondary text-surface-white shadow-md"
                          : "border-transparent bg-surface-white text-foreground shadow-sm hover:border-secondary/40"
                      }`}
                    >
                      <span className="text-lg font-bold">{opt.label}</span>
                      {checked ? (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                          <path
                            d="M8 12l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-outline-variant"
                          aria-hidden="true"
                        >
                          <path
                            d="M9 18l6-6-6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Confidence band */}
            <div className="mt-8 border-t border-outline-variant/30 pt-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Hvor trygg er du?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {NEW_HIRE_CONFIDENCE_BANDS.map((b) => {
                  const picked = draft[currentQuestion.id]?.confidenceBand === b.value;
                  return (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          [currentQuestion.id]: {
                            optionId: prev[currentQuestion.id]?.optionId ?? null,
                            confidenceBand: b.value,
                          },
                        }))
                      }
                      className={`flex flex-col rounded-2xl border-2 px-3 py-3 text-left transition-all ${
                        picked
                          ? "border-secondary bg-secondary-container/50"
                          : "border-transparent bg-surface-white hover:border-secondary/30"
                      }`}
                    >
                      <span className="text-sm font-semibold text-foreground">{b.title}</span>
                      <span className="text-xs text-muted">{b.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      ) : null}

      {/* Sticky footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-airy-blue via-airy-blue to-transparent p-6 pt-12">
        <div className="mx-auto max-w-md">
          {submitErr ? <p className="mb-2 text-center text-sm text-error">{submitErr}</p> : null}

          {currentIdx < sortedQuestions.length - 1 ? (
            <button
              type="button"
              disabled={!currentDraftComplete}
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="w-full rounded-3xl bg-secondary py-4 text-lg font-bold text-surface-white shadow-lg shadow-secondary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              Neste trinn
            </button>
          ) : (
            <button
              type="button"
              disabled={!allAnswered || busySubmit}
              onClick={() => void submitFinal()}
              className="w-full rounded-3xl bg-secondary py-4 text-lg font-bold text-surface-white shadow-lg shadow-secondary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {busySubmit ? "Sender ..." : "Las og send til teamet"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function bandSummary(b: ConfidenceBandAllowed): string {
  const row = NEW_HIRE_CONFIDENCE_BANDS.find((x) => x.value === b);
  return row ? `${row.title} (${row.hint})` : b;
}
