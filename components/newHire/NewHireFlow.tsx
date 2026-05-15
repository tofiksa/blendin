"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveQuestion } from "@/lib/livePayload";
import type { ConfidenceBandAllowed } from "@/lib/newHireAnswers";

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

const BANDS: Array<{ value: ConfidenceBandAllowed; title: string; hint: string }> = [
  { value: "pct_0_25", title: "Liten tro", hint: "gjetting" },
  { value: "pct_26_50", title: "Litt usikker", hint: "åpent sinn" },
  { value: "pct_51_75", title: "Ganske trygg", hint: "kjennes igjen" },
  { value: "pct_76_100", title: "Veldig trygg", hint: "helt klart" },
];

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
        return {
          questionId: q.id,
          optionId: d.optionId,
          confidenceBand: d.confidenceBand,
        };
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
        return {
          questionId: q.id,
          optionId: d.optionId,
          confidenceBand: d.confidenceBand,
        };
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

  if (!token) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground">Mangler lenke</h1>
        <p className="text-muted">
          Du trenger den personlige Blend-In-lenken du fikk på e-post eller i invitasjonen. Den skal
          ende med <code className="rounded bg-accent-soft px-1 font-mono text-sm">?nh=…</code>.
        </p>
      </div>
    );
  }

  if (busyLoad && !bootstrap) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-muted">Henter din økt …</p>
      </div>
    );
  }

  if (loadErr || !bootstrap) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground">Klarte ikke å åpne økta</h1>
        <p className="text-muted">{loadErr ?? "Ukjent feil."}</p>
      </div>
    );
  }

  const locked = bootstrap.locked;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="space-y-2 border-b border-accent-soft pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Blend-In · ny kollega
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {locked ? "Takk — svarene dine er låst" : "Dine valg · uke én"}
        </h1>
        <p className="text-sm text-muted">
          Økt <span className="font-mono text-foreground">{bootstrap.publicId}</span> ·{" "}
          {locked ? "Teamet kan nå gjette." : "Ta deg god tid — ingen poengtavle."}
        </p>
      </header>

      {locked ? (
        <section className="space-y-6 rounded-2xl border border-accent-soft bg-accent-soft/35 p-6">
          <p className="text-sm leading-relaxed text-foreground">
            Du har levert alle svar. Neste steg er at kollegene dine åpner sine magiske lenker og
            gjør sine gjett — dere møtes på reveal.
          </p>
          <ul className="flex flex-col gap-5">
            {[...bootstrap.questions]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((q) => {
                const saved = bootstrap.savedAnswers.find((s) => s.questionId === q.id);
                return (
                  <li key={q.id} className="rounded-xl bg-background/70 px-4 py-3">
                    <p className="font-medium text-foreground">{q.stem}</p>
                    <p className="mt-2 text-sm text-muted">
                      Valg:{" "}
                      <span className="text-foreground">
                        {saved ? optionLabel(q, saved.optionId) : "—"}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      Trygghet:{" "}
                      <span className="text-foreground">
                        {saved ? bandSummary(saved.confidenceBand) : "—"}
                      </span>
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-soft/40 px-4 py-3 text-sm">
            <span className="text-muted">
              Fremdrift:{" "}
              <span className="font-semibold text-foreground">
                {answeredCount} av {bootstrap.questions.length}
              </span>
            </span>
            {draftNote ? <span className="text-muted">{draftNote}</span> : null}
          </div>
          {draftErr ? <p className="text-sm text-accent">{draftErr}</p> : null}

          <div className="flex flex-col gap-10">
            {[...bootstrap.questions]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((q, i) => (
                <article
                  key={q.id}
                  className="rounded-2xl border border-accent-soft bg-background/80 p-5 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Spørsmål {i + 1}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground">
                    {q.stem}
                  </h2>

                  <fieldset className="mt-5 space-y-3">
                    <legend className="text-sm font-medium text-muted">Svar</legend>
                    <div className="flex flex-col gap-2">
                      {[...q.options]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((opt) => {
                          const checked = draft[q.id]?.optionId === opt.id;
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
                                name={`nh-opt-${q.id}`}
                                checked={checked}
                                onChange={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [q.id]: {
                                      optionId: opt.id,
                                      confidenceBand: prev[q.id]?.confidenceBand ?? null,
                                    },
                                  }))
                                }
                              />
                              <span className="leading-snug text-foreground">{opt.label}</span>
                            </label>
                          );
                        })}
                    </div>
                  </fieldset>

                  <fieldset className="mt-6 space-y-3">
                    <legend className="text-sm font-medium text-muted">
                      Hvor trygg er du på dette svaret?
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BANDS.map((b) => {
                        const picked = draft[q.id]?.confidenceBand === b.value;
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
                                name={`nh-band-${q.id}`}
                                checked={picked}
                                onChange={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [q.id]: {
                                      optionId: prev[q.id]?.optionId ?? null,
                                      confidenceBand: b.value,
                                    },
                                  }))
                                }
                              />
                              <span className="font-medium text-foreground">{b.title}</span>
                            </span>
                            <span className="pl-6 text-xs text-muted">{b.hint}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </article>
              ))}
          </div>

          <footer className="sticky bottom-0 space-y-4 border-t border-accent-soft bg-background/95 py-6 backdrop-blur-sm">
            {submitErr ? <p className="text-sm text-accent">{submitErr}</p> : null}
            <p className="text-xs text-muted">
              Når du sender, kan du ikke endre svarene. Kladd lagres automatisk underveis.
            </p>
            <button
              type="button"
              disabled={!allAnswered || busySubmit}
              onClick={() => void submitFinal()}
              className="w-full rounded-xl bg-accent px-5 py-4 text-base font-semibold text-background disabled:opacity-40 sm:w-auto"
            >
              {busySubmit ? "Sender …" : "Lås og send til teamet"}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}

function bandSummary(b: ConfidenceBandAllowed): string {
  const row = BANDS.find((x) => x.value === b);
  return row ? `${row.title} (${row.hint})` : b;
}
