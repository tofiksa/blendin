"use client";

import { useEffect, useMemo, useState } from "react";
import type { LivePayload } from "@/lib/livePayload";
import { isLiveErrorPayload } from "@/lib/livePayload";

function formatState(state: string): string {
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

export function SessionLiveClient({
  publicId,
  variant,
}: {
  publicId: string;
  variant: "presenter" | "mobil";
}) {
  const [snapshot, setSnapshot] = useState<LivePayload | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${encodeURIComponent(publicId)}/live`)
      .then(async (r) => {
        const body: unknown = await r.json();
        if (!r.ok && isLiveErrorPayload(body)) throw new Error(body.error);
        if (!r.ok) throw new Error("Kunne ikke laste økt.");
        if (!cancelled) setSnapshot(body as LivePayload);
      })
      .catch(() => {
        if (!cancelled) setStreamError("Kunne ikke laste økt.");
      });
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  useEffect(() => {
    const url = `/api/sessions/${encodeURIComponent(publicId)}/live/stream`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const parsed: unknown = JSON.parse(ev.data);
        if (isLiveErrorPayload(parsed)) {
          setStreamError(parsed.error);
          es.close();
          return;
        }
        setSnapshot(parsed as LivePayload);
        setStreamError(null);
      } catch {
        setStreamError("Ugyldig data fra strømmen.");
      }
    };

    es.onerror = () => {
      setStreamError("Live-strøm mistet — oppdater siden.");
    };

    return () => es.close();
  }, [publicId]);

  const headingClass =
    variant === "presenter"
      ? "text-3xl font-semibold tracking-tight sm:text-4xl"
      : "text-2xl font-semibold tracking-tight";

  const metaClass =
    variant === "presenter" ? "text-base text-muted sm:text-lg" : "text-sm text-muted";

  const followerFocus = variant === "mobil";

  const displayedResults = useMemo(() => {
    if (!snapshot?.questionResults.length) return [];
    if (!followerFocus) return snapshot.questionResults;
    if (snapshot.state === "completed") return [];
    if (snapshot.state !== "revealing") return snapshot.questionResults;
    const q = snapshot.questions[snapshot.currentQuestionIndex];
    if (!q) return snapshot.questionResults;
    return snapshot.questionResults.filter((r) => r.questionId === q.id);
  }, [snapshot, followerFocus]);

  const emptyAggregateHint = snapshot?.state === "ready_to_reveal";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-accent-soft pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {variant === "presenter" ? "Presentasjon" : "Følger"}
        </p>
        <h1 className={headingClass}>Blend-In · live</h1>
        <p className={metaClass}>
          Økt <span className="font-mono text-foreground">{publicId}</span>
        </p>
        {snapshot ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-foreground">
              {formatState(snapshot.state)}
            </span>
            <span className="text-sm text-muted">
              Spørsmål #{snapshot.currentQuestionIndex + 1} · oppdatert{" "}
              {new Date(snapshot.updatedAt).toLocaleTimeString("nb-NO")}
            </span>
          </div>
        ) : null}
        {streamError ? (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-foreground">
            {streamError}
          </p>
        ) : null}
      </header>

      {!snapshot && !streamError ? <p className="text-muted">Laster …</p> : null}

      {snapshot && followerFocus && snapshot.state === "completed" ? (
        <section className="rounded-2xl border border-accent-soft bg-accent-soft/30 px-5 py-6">
          <p className="text-sm uppercase tracking-wide text-muted">Harmoni</p>
          <p className="mt-3 text-xl font-semibold leading-snug">
            Takk for at dere fulgte med — samtalene videre er det som fyller koppen.
          </p>
          <p className="mt-2 text-sm text-muted">
            Detaljerte valg vises på storskjerm · mobilen holder bare tempo og stemning.
          </p>
        </section>
      ) : null}

      {snapshot ? (
        <section className="flex flex-col gap-8">
          {snapshot.questionResults.length === 0 ? (
            <p className="text-muted">
              {emptyAggregateHint
                ? "Aggregater er klare på serveren, men vises først når reveal starter på presentasjonsskjerm."
                : "Flertallsstemmer og aggregater vises når økta er i reveal-fase (etter admin har lukket team-runden)."}
            </p>
          ) : followerFocus && snapshot.state === "completed" ? (
            <p className="text-sm text-muted">
              Resultater fra reveal er tilgjengelige på `/presenter/`-visningen for fellesskapet.
            </p>
          ) : (
            displayedResults.map((res) => {
              const q = snapshot.questions.find((x) => x.id === res.questionId);
              return (
                <article
                  key={res.questionId}
                  className="rounded-2xl border border-accent-soft bg-background/60 p-5 shadow-sm backdrop-blur-sm"
                >
                  <h2 className="text-lg font-semibold text-foreground">{q?.stem ?? "Spørsmål"}</h2>
                  <ul className="mt-4 flex flex-col gap-2">
                    {(q?.options ?? []).map((opt) => {
                      const n = res.voteCounts[opt.id] ?? 0;
                      const isChosen = res.chosenOptionId === opt.id;
                      const isTied = res.tiedOptionIds.includes(opt.id);
                      return (
                        <li
                          key={opt.id}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                            isChosen ? "bg-accent-soft font-medium" : "bg-accent-soft/40"
                          }`}
                        >
                          <span className="pr-3">{opt.label}</span>
                          <span className="flex shrink-0 items-center gap-2 font-mono text-muted">
                            <span>{n}</span>
                            {isTied && res.tiedOptionIds.length > 1 ? (
                              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                                delt topp
                              </span>
                            ) : null}
                            {isChosen ? (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                                valgt
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </div>
  );
}
