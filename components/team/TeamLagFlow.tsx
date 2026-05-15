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

  if (!token) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground">Mangler token</h1>
        <p className="text-muted">Lenken ser ut til å være ufullstendig.</p>
      </div>
    );
  }

  if (busyLoad && !bootstrap) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-muted">Åpner lag-lenken …</p>
      </div>
    );
  }

  if (loadErr || !bootstrap) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground">Lenken virker ikke</h1>
        <p className="text-muted">{loadErr ?? "Ukjent feil."}</p>
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-5 py-10 sm:px-8">
      <header className="space-y-2 border-b border-accent-soft pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Blend-In · lag</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {submittedBlock ? "Innsendt — takk!" : "Gjett hva ny kollega svarte"}
        </h1>
        <p className="text-sm text-muted">
          Økt <span className="font-mono text-foreground">{bootstrap.sessionPublicId}</span> ·{" "}
          <span className="text-foreground">{sessionPhaseLabel(bootstrap.sessionState)}</span>
        </p>
      </header>

      {draftPhase ? (
        <section className="rounded-2xl border border-accent-soft bg-accent-soft/35 px-5 py-6">
          <p className="text-foreground leading-relaxed">
            Økta er ikke helt i gang ennå. Kom tilbake snart, eller kontakt fasilitator om du mener
            dette er en feil.
          </p>
        </section>
      ) : null}

      {nhPhase ? (
        <section className="rounded-2xl border border-accent-soft bg-accent-soft/35 px-5 py-6">
          <p className="text-foreground leading-relaxed">
            Ny kollega jobber fortsatt med sine svar. Når de har låst inn svarene, kan du gjette
            herfra — bare oppdater siden litt senere.
          </p>
        </section>
      ) : null}

      {submittedBlock ? (
        <section className="rounded-2xl border border-accent-soft bg-accent-soft/40 px-5 py-6">
          <p className="text-sm leading-relaxed text-foreground">
            Svaret ditt er registrert fra denne telefonen. Under sees samme live-visning som
            mobil-følger — samme lenke hele veien.
          </p>
        </section>
      ) : null}

      {!submittedBlock && guessablePhase ? (
        <>
          <div className="space-y-2 rounded-xl bg-accent-soft/40 px-4 py-3 text-sm">
            <label htmlFor="lag-display" className="block font-medium text-muted">
              Navn (valgfritt)
            </label>
            <input
              id="lag-display"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Hva vil du vises som?"
              className="w-full rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">
              Valgt:{" "}
              <span className="font-semibold text-foreground">
                {answeredCount} av {bootstrap.questions.length}
              </span>
            </span>
          </div>

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
                    <legend className="text-sm font-medium text-muted">Ditt gjett</legend>
                    <div className="flex flex-col gap-2">
                      {[...q.options]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((opt) => {
                          const checked = guesses[q.id] === opt.id;
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
                                name={`lag-opt-${q.id}`}
                                checked={checked}
                                onChange={() =>
                                  setGuesses((prev) => ({
                                    ...prev,
                                    [q.id]: opt.id,
                                  }))
                                }
                              />
                              <span className="leading-snug text-foreground">{opt.label}</span>
                            </label>
                          );
                        })}
                    </div>
                  </fieldset>
                </article>
              ))}
          </div>

          <footer className="sticky bottom-0 space-y-3 border-t border-accent-soft bg-background/95 py-6 backdrop-blur-sm">
            {submitErr ? <p className="text-sm text-accent">{submitErr}</p> : null}
            <p className="text-xs text-muted">
              Én innsending per lenke — dobbeltsjekk før du sender. Ingen poeng, bare fellesskap.
            </p>
            <button
              type="button"
              disabled={!allPicked || busySubmit}
              onClick={() => void submitGuesses()}
              className="w-full rounded-xl bg-accent px-5 py-4 text-base font-semibold text-background disabled:opacity-40 sm:w-auto"
            >
              {busySubmit ? "Sender …" : "Send gjett"}
            </button>
          </footer>
        </>
      ) : null}

      {showLivePanel && !earlyPhase ? (
        <section className="space-y-4 border-t border-accent-soft pt-10">
          <h2 className="text-lg font-semibold text-foreground">Følg med · samme lenke</h2>
          <p className="text-sm text-muted">
            {submittedBlock
              ? "Live oppdatert fra økta — du kan bli stående her gjennom reveal."
              : "Her ser du tempo og aggregater etter hvert som fasilitator åpner reveal."}{" "}
            Ekstra visning:{" "}
            <code className="rounded bg-accent-soft/60 px-1 py-0.5 font-mono text-xs">
              /mobil/{bootstrap.sessionPublicId}
            </code>
          </p>
          <SessionLiveClient publicId={bootstrap.sessionPublicId} variant="mobil" />
        </section>
      ) : null}
    </div>
  );
}
