"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SessionLiveClient } from "@/components/SessionLiveClient";
import type { LiveQuestion } from "@/lib/livePayload";

type JoinBootstrap = {
  sessionPublicId: string;
  sessionState: string;
  alreadySubmitted: boolean;
  questions: LiveQuestion[];
};

function formatApiError(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const err = (payload as { error: unknown }).error;
    if (typeof err === "string") return err;
    return JSON.stringify(err);
  }
  return "Noe gikk galt.";
}

function sessionPhaseLabel(state: string): string {
  const map: Record<string, string> = {
    draft: "Utkast",
    nh_collecting: "Nyansatt svarer",
    team_collecting: "Team gjetter",
    ready_to_reveal: "Klar for reveal",
    revealing: "Reveal",
    completed: "Fullført",
  };
  return map[state] ?? state;
}

export function TeamLagFlow({ plainToken }: { plainToken: string }) {
  const token = plainToken.trim();
  const apiUrl = `/api/join/${encodeURIComponent(token)}`;

  const [bootstrap, setBootstrap] = useState<JoinBootstrap | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busyLoad, setBusyLoad] = useState(Boolean(token));
  const [busySubmit, setBusySubmit] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [guesses, setGuesses] = useState<Record<string, string | null>>({});

  const reload = useCallback(async () => {
    const r = await fetch(apiUrl);
    const body: unknown = await r.json();
    if (!r.ok) throw new Error(formatApiError(body));
    const data = body as JoinBootstrap;
    setBootstrap(data);
    const init: Record<string, string | null> = {};
    for (const q of data.questions) init[q.id] = null;
    setGuesses(init);
  }, [apiUrl]);

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
        return body as JoinBootstrap;
      })
      .then((data) => {
        if (cancelled) return;
        setBootstrap(data);
        const init: Record<string, string | null> = {};
        for (const q of data.questions) init[q.id] = null;
        setGuesses(init);
        setLoadErr(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Kunne ikke laste lenken.");
      })
      .finally(() => {
        if (!cancelled) setBusyLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  const guessablePhase = useMemo(() => {
    if (!bootstrap) return false;
    return (
      bootstrap.sessionState === "team_collecting" ||
      bootstrap.sessionState === "ready_to_reveal" ||
      bootstrap.sessionState === "revealing"
    );
  }, [bootstrap]);

  const answeredCount = useMemo(() => {
    if (!bootstrap) return 0;
    return bootstrap.questions.filter((q) => guesses[q.id]).length;
  }, [bootstrap, guesses]);

  const allPicked =
    bootstrap && bootstrap.questions.length > 0 && answeredCount === bootstrap.questions.length;

  const submitGuesses = useCallback(async () => {
    if (!bootstrap || !allPicked || bootstrap.alreadySubmitted) return;
    setSubmitErr(null);
    setBusySubmit(true);
    try {
      const guessLines = bootstrap.questions.map((q) => {
        const oid = guesses[q.id];
        if (!oid) throw new Error("Mangler valg.");
        return { questionId: q.id, optionId: oid };
      });
      const dn = displayName.trim();
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: dn.length > 0 ? dn.slice(0, 80) : null,
          guesses: guessLines,
        }),
      });
      const body: unknown = await r.json();
      if (!r.ok) throw new Error(formatApiError(body));
      await reload();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Innsending feilet.");
    } finally {
      setBusySubmit(false);
    }
  }, [allPicked, apiUrl, bootstrap, displayName, guesses, reload]);

  /* ---------- Error / loading states ---------- */

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-container-low px-6">
        <div className="max-w-sm rounded-3xl bg-surface-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Mangler token</h1>
          <p className="mt-3 text-muted">Lenken ser ut til å være ufullstendig.</p>
        </div>
      </div>
    );
  }

  if (busyLoad && !bootstrap) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-container-low">
        <p className="text-muted">Apner lag-lenken ...</p>
      </div>
    );
  }

  if (loadErr || !bootstrap) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-container-low px-6">
        <div className="max-w-sm rounded-3xl bg-surface-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-foreground">Lenken virker ikke</h1>
          <p className="mt-3 text-muted">{loadErr ?? "Ukjent feil."}</p>
        </div>
      </div>
    );
  }

  const submittedBlock = bootstrap.alreadySubmitted;
  const draftPhase = bootstrap.sessionState === "draft";
  const nhPhase = bootstrap.sessionState === "nh_collecting";
  const earlyPhase = draftPhase || nhPhase;

  const showLivePanel =
    bootstrap.alreadySubmitted ||
    bootstrap.sessionState === "ready_to_reveal" ||
    bootstrap.sessionState === "revealing" ||
    bootstrap.sessionState === "completed";

  const progressPercent =
    bootstrap.questions.length > 0
      ? Math.round((answeredCount / bootstrap.questions.length) * 100)
      : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-container-low">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Header */}
        <header className="px-6 pb-4 pt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Blend-In</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {submittedBlock ? "Innsendt — takk!" : "Gjett hva ny kollega svarte"}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span className="font-mono text-foreground">{bootstrap.sessionPublicId}</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span>{sessionPhaseLabel(bootstrap.sessionState)}</span>
          </div>
        </header>

        {/* Waiting states */}
        {draftPhase || nhPhase ? (
          <section className="mx-6 rounded-3xl bg-surface-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/50">
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-secondary"
                aria-hidden
              >
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {nhPhase ? "Nyansatt svarer fortsatt..." : "Økta starter snart"}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted">
              {nhPhase
                ? "Pust ut og ta en kaffe — quizen starter snart!"
                : "Økta er ikke helt i gang ennå. Kom tilbake snart."}
            </p>
          </section>
        ) : null}

        {/* Submitted confirmation */}
        {submittedBlock ? (
          <section className="mx-6 rounded-3xl bg-surface-white p-6 shadow-sm">
            <p className="text-base leading-relaxed text-muted">
              Svaret ditt er registrert. Under sees live-visningen — samme lenke hele veien.
            </p>
          </section>
        ) : null}

        {/* Guessing form */}
        {!submittedBlock && guessablePhase ? (
          <div className="flex flex-1 flex-col px-6 pb-32">
            {/* Name input */}
            <div className="mt-4 rounded-3xl bg-surface-white p-5 shadow-sm">
              <label htmlFor="lag-display" className="block text-sm font-semibold text-muted">
                Navn (valgfritt)
              </label>
              <input
                id="lag-display"
                type="text"
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Hva vil du vises som?"
                className="mt-2 w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-secondary/40"
              />
            </div>

            {/* Progress */}
            <div className="mt-6 px-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-muted">Fremdrift</span>
                <span className="font-bold text-secondary">{progressPercent}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="mt-6 flex flex-col gap-6">
              {[...bootstrap.questions]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((q, i) => (
                  <article key={q.id} className="rounded-3xl bg-surface-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Sporsmal {i + 1}
                    </p>
                    <h2 className="mt-2 text-xl font-bold leading-snug text-foreground">
                      {q.stem}
                    </h2>
                    <div className="mt-5 flex flex-col gap-3">
                      {[...q.options]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((opt) => {
                          const checked = guesses[q.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setGuesses((prev) => ({ ...prev, [q.id]: opt.id }))}
                              className={`flex items-center justify-between rounded-3xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
                                checked
                                  ? "border-secondary bg-secondary text-surface-white shadow-md"
                                  : "border-transparent bg-surface-container-low text-foreground hover:border-secondary/30"
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
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    fill="currentColor"
                                    opacity="0.2"
                                  />
                                  <path
                                    d="M8 12l3 3 5-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </button>
                          );
                        })}
                    </div>
                  </article>
                ))}
            </div>
          </div>
        ) : null}

        {/* Live panel */}
        {showLivePanel && !earlyPhase ? (
          <section className="mx-6 mt-6 space-y-4 rounded-3xl bg-surface-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Følg med</h2>
            <p className="text-sm text-muted">
              {submittedBlock
                ? "Live oppdatert fra økta — du kan bli stående her gjennom reveal."
                : "Her ser du tempo og aggregater etter hvert som fasilitator åpner reveal."}
            </p>
            <SessionLiveClient publicId={bootstrap.sessionPublicId} variant="mobil" />
          </section>
        ) : null}
      </div>
      {/* Sticky submit footer */}
      !submittedBlock && guessablePhase ? (
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-surface-container-low via-surface-container-low to-transparent p-6 pt-12">
        <div className="mx-auto max-w-md">
          {submitErr ? <p className="mb-2 text-center text-sm text-error">{submitErr}</p> : null}
          <p className="mb-3 text-center text-xs text-muted">
            En innsending per lenke — ingen poeng, bare fellesskap.
          </p>
          <button
            type="button"
            disabled={!allPicked || busySubmit}
            onClick={() => void submitGuesses()}
            className="w-full rounded-3xl bg-secondary py-4 text-lg font-bold text-surface-white shadow-lg shadow-secondary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {busySubmit ? "Sender ..." : "Send gjett"}
          </button>
        </div>
      </footer>
      ) : null;
    </div>
  );
}
