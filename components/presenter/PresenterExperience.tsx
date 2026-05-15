"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoffeeCup } from "@/components/presenter/CoffeeCup";
import { playPourChime } from "@/components/presenter/playPourChime";
import type { LivePayload, NewHireTruthAnswer } from "@/lib/livePayload";
import { isLiveErrorPayload } from "@/lib/livePayload";

const STORAGE_KEY = "blendin_admin_bearer";

type ApiSessionState =
  | "draft"
  | "nh_collecting"
  | "team_collecting"
  | "ready_to_reveal"
  | "revealing"
  | "completed";

type Props = { publicId: string };

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function formatState(state: string): string {
  const map: Record<string, string> = {
    draft: "Utkast",
    nh_collecting: "Nyansatt svarer",
    team_collecting: "Team gjetter",
    ready_to_reveal: "Klar til reveal",
    revealing: "Reveal",
    completed: "Fullført",
  };
  return map[state] ?? state;
}

function harmonyCopy(matches: number, total: number): string {
  if (total <= 0) return "Vi starter straks.";
  const ratio = matches / total;
  if (ratio >= 0.9) return "Helt perfekt blandet · dere smaker på samme bønne.";
  if (ratio >= 0.72) return "Sterk harmoni · litt mer melk og småprat så er dere i mål.";
  if (ratio >= 0.45) return "God start · kaffen trenger litt mer tid på trakteren.";
  return "Ekte variasjon · perfekt unnskyldning for en ekstra runde.";
}

async function adminPatch(publicId: string, bearer: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/admin/sessions/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json() as Promise<{ currentQuestionIndex?: number; state?: string }>;
}

export function PresenterExperience({ publicId }: Props) {
  const reducedMotion = useReducedMotion();
  const [snapshot, setSnapshot] = useState<LivePayload | null>(null);
  const [truth, setTruth] = useState<NewHireTruthAnswer[] | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [bearer, setBearer] = useState("");
  const [bearerReady, setBearerReady] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [facilitatorError, setFacilitatorError] = useState<string | null>(null);
  const prevIdxRef = useRef(-1);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        setBearer(s);
        setBearerReady(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

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
    es.onerror = () => setStreamError("Live-strøm mistet — oppdater siden.");
    return () => es.close();
  }, [publicId]);

  useEffect(() => {
    if (!bearerReady || !bearer.trim()) {
      setTruth(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const r = await fetch(
        `/api/admin/sessions/${encodeURIComponent(publicId)}/new-hire-answers`,
        {
          headers: { Authorization: `Bearer ${bearer.trim()}` },
        },
      );
      if (!r.ok) return;
      const j = (await r.json()) as { answers?: NewHireTruthAnswer[] };
      if (!cancelled) setTruth(j.answers ?? []);
    };
    void load();
    const id = window.setInterval(load, 4500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [bearer, bearerReady, publicId]);

  const questions = snapshot?.questions ?? [];
  const idx = snapshot?.currentQuestionIndex ?? 0;
  const state = snapshot?.state ?? "draft";
  const maxIdx = Math.max(0, questions.length - 1);

  const resultByQuestionId = useMemo(() => {
    const m = new Map(snapshot?.questionResults.map((r) => [r.questionId, r]) ?? []);
    return m;
  }, [snapshot]);

  const truthByQuestionId = useMemo(() => {
    const m = new Map((truth ?? []).map((t) => [t.questionId, t.optionId]));
    return m;
  }, [truth]);

  const cupFill = useMemo(() => {
    if (!snapshot || questions.length === 0) return 0;
    if (state !== "revealing" && state !== "completed") return 8;
    let acc = 0;
    const upto = state === "completed" ? maxIdx : Math.min(idx, maxIdx);
    for (let j = 0; j <= upto; j++) {
      const q = questions[j];
      if (!q) continue;
      const res = resultByQuestionId.get(q.id);
      const nh = truthByQuestionId.get(q.id);
      if (!res?.chosenOptionId || !nh) acc += 5;
      else acc += res.chosenOptionId === nh ? 17 : 7;
    }
    return Math.min(100, acc);
  }, [snapshot, questions, idx, maxIdx, state, resultByQuestionId, truthByQuestionId]);

  const harmonyStats = useMemo(() => {
    if (!snapshot || questions.length === 0) return { matches: 0, total: 0 };
    let matches = 0;
    for (const q of questions) {
      const res = resultByQuestionId.get(q.id);
      const nh = truthByQuestionId.get(q.id);
      if (res?.chosenOptionId && nh && res.chosenOptionId === nh) matches += 1;
    }
    return { matches, total: questions.length };
  }, [snapshot, questions, resultByQuestionId, truthByQuestionId]);

  useEffect(() => {
    if (!snapshot || snapshot.state !== "revealing") {
      prevIdxRef.current = -1;
      return;
    }
    const prev = prevIdxRef.current;
    const cur = snapshot.currentQuestionIndex;
    if (cur > prev && prev >= 0 && !muted && !reducedMotion) {
      const q = snapshot.questions[prev];
      if (q) {
        const res = resultByQuestionId.get(q.id);
        const nh = truthByQuestionId.get(q.id);
        if (res?.chosenOptionId && nh && res.chosenOptionId === nh) playPourChime();
      }
    }
    prevIdxRef.current = cur;
  }, [snapshot, muted, reducedMotion, resultByQuestionId, truthByQuestionId]);

  const saveBearer = useCallback(() => {
    const t = bearer.trim();
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, t);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setBearerReady(Boolean(t));
    setFacilitatorError(null);
  }, [bearer]);

  const handleNext = useCallback(async () => {
    if (!bearerReady || !bearer.trim() || !snapshot) return;
    setFacilitatorError(null);
    try {
      if (snapshot.state !== "revealing") return;
      if (idx < maxIdx)
        await adminPatch(publicId, bearer.trim(), { currentQuestionIndex: idx + 1 });
      else await adminPatch(publicId, bearer.trim(), { state: "completed" });
    } catch (err) {
      setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere økt.");
    }
  }, [bearer, bearerReady, idx, maxIdx, publicId, snapshot]);

  const handlePrev = useCallback(async () => {
    if (!bearerReady || !bearer.trim() || !snapshot) return;
    if (snapshot.state !== "revealing" || idx <= 0) return;
    setFacilitatorError(null);
    try {
      await adminPatch(publicId, bearer.trim(), { currentQuestionIndex: idx - 1 });
    } catch (err) {
      setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere økt.");
    }
  }, [bearer, bearerReady, idx, publicId, snapshot]);

  const patchState = useCallback(
    async (next: ApiSessionState) => {
      if (!bearerReady || !bearer.trim()) return;
      setFacilitatorError(null);
      try {
        await adminPatch(publicId, bearer.trim(), { state: next });
      } catch (err) {
        setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere økt.");
      }
    },
    [bearer, bearerReady, publicId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        e.preventDefault();
        setDockOpen((v) => !v);
      }
      if (!bearerReady || !bearer.trim()) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        void handleNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handlePrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bearer, bearerReady, handleNext, handlePrev]);

  const currentQuestion = questions[idx];
  const currentResult = currentQuestion ? resultByQuestionId.get(currentQuestion.id) : undefined;
  const nhOptionForCurrent = currentQuestion
    ? truthByQuestionId.get(currentQuestion.id)
    : undefined;

  const lobbyPhase = state === "draft" || state === "nh_collecting" || state === "team_collecting";

  const maxVotes = useMemo(() => {
    if (!currentResult) return 1;
    let m = 1;
    for (const v of Object.values(currentResult.voteCounts)) m = Math.max(m, v);
    return m;
  }, [currentResult]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-accent-soft px-6 py-4 sm:px-10">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Blend-In · presenter
          </p>
          <p className="mt-1 font-mono text-sm text-muted">{publicId}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />
            Lyd
          </label>
          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-foreground hover:opacity-90"
          >
            Facilitator {dockOpen ? "▼" : "▸"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-8 px-6 py-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-12 lg:px-12 lg:py-10">
        <main className="flex flex-1 flex-col justify-center lg:max-w-[62%]">
          {!snapshot && !streamError ? <p className="text-xl text-muted">Laster koppen …</p> : null}
          {streamError ? (
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-foreground">{streamError}</p>
          ) : null}

          {snapshot && lobbyPhase ? (
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-wide text-muted">{formatState(state)}</p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Ro før reveal
              </h1>
              <p className="max-w-prose text-pretty text-lg leading-relaxed text-muted">
                {state === "team_collecting"
                  ? "Teamet sender sine gjett · vent til alle er klare før dere åpner reveal."
                  : state === "nh_collecting"
                    ? "Nyansatt jobber med sine valg · ingen hast på koppen."
                    : "Økta er i oppstart · alt synkes automatisk fra databasen."}
              </p>
            </div>
          ) : null}

          {snapshot && state === "ready_to_reveal" ? (
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-wide text-muted">{formatState(state)}</p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Klar til å helle ut flertallet
              </h1>
              <p className="max-w-prose text-pretty text-lg leading-relaxed text-muted">
                Alt er telt og klargjort. Start reveal når rommet er samlet — én spørsmål om gangen.
              </p>
            </div>
          ) : null}

          {snapshot && state === "revealing" && questions.length > 0 && !currentQuestion ? (
            <p className="text-muted">
              Vent på synk fra server — spørsmålslisten matcher ikke indeksen ennå.
            </p>
          ) : null}

          {snapshot && state === "revealing" && currentQuestion ? (
            <div className="space-y-8">
              <div>
                <p className="text-sm text-muted">
                  Spørsmål {idx + 1} av {questions.length}
                </p>
                <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  {currentQuestion.stem}
                </h1>
              </div>

              {!currentResult ? (
                <p className="text-muted">
                  Aggregater mangler — sjekk at reveal-fase er åpnet fra admin.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {[...currentQuestion.options]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((opt) => {
                      const n = currentResult.voteCounts[opt.id] ?? 0;
                      const share = maxVotes > 0 ? Math.round((n / maxVotes) * 100) : 0;
                      const isChosen = currentResult.chosenOptionId === opt.id;
                      const isTied =
                        currentResult.tiedOptionIds.length > 1 &&
                        currentResult.tiedOptionIds.includes(opt.id);
                      const isTruth = nhOptionForCurrent === opt.id;
                      return (
                        <li
                          key={opt.id}
                          className={`relative overflow-hidden rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
                            isChosen
                              ? "border-accent bg-accent-soft/80"
                              : "border-accent-soft bg-accent-soft/25"
                          }`}
                        >
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 bg-accent/15 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                            style={{ width: `${share}%` }}
                            aria-hidden
                          />
                          <div className="relative flex flex-wrap items-center justify-between gap-3">
                            <span className="text-lg font-medium">{opt.label}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-muted">{n}</span>
                              {isTied ? (
                                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                  delt topp
                                </span>
                              ) : null}
                              {isChosen ? (
                                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                                  teamets stemme
                                </span>
                              ) : null}
                              {bearerReady && isTruth ? (
                                <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                                  nyansatt
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}

              {bearerReady && nhOptionForCurrent && currentResult?.chosenOptionId ? (
                <p className="text-sm leading-relaxed text-muted">
                  {currentResult.chosenOptionId === nhOptionForCurrent
                    ? "Treff · koppen får et ordentlig grep denne runden."
                    : "Utforskende svar — gi nyansatt rom å fortelle litt bak svaret."}
                </p>
              ) : null}

              {!bearerReady ? (
                <p className="text-sm text-muted">
                  Åpne facilitator-panelet (Ctrl+. ) og lagre admin-token for å se nyansatts valg på
                  lerretet.
                </p>
              ) : null}
            </div>
          ) : null}

          {snapshot && state === "completed" ? (
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-wide text-muted">Harmoni</p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {harmonyCopy(harmonyStats.matches, harmonyStats.total)}
              </h1>
              <p className="text-lg text-muted">
                Dere traff på {harmonyStats.matches} av {harmonyStats.total} flertallsvalg
                sammenlignet med nyansatt.
              </p>
              <p className="max-w-prose text-pretty text-muted">
                Takk for at dere tok uken på alvor — samtalene er det som fyller koppen mellom
                svarene.
              </p>
            </div>
          ) : null}
        </main>

        <aside className="flex shrink-0 flex-col items-center justify-center lg:w-[30%]">
          <CoffeeCup fillPercent={cupFill} reducedMotion={reducedMotion} />
          <p className="mt-4 max-w-[12rem] text-center text-sm text-muted">
            Koppen speiler hvor ofte teamets flertall traff nyansatt · ikke poeng eller rangering.
          </p>
        </aside>
      </div>

      {dockOpen ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-accent-soft bg-background/95 px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-col gap-2">
              <label
                htmlFor="blend-bearer"
                className="text-xs font-medium uppercase tracking-wide text-muted"
              >
                Admin Bearer (kun denne maskinen · Ctrl+. for å skjule)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="blend-bearer"
                  type="password"
                  autoComplete="off"
                  value={bearer}
                  onChange={(e) => setBearer(e.target.value)}
                  className="min-w-[16rem] flex-1 rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
                  placeholder="BLEND_ADMIN_SECRET som Bearer …"
                />
                <button
                  type="button"
                  onClick={() => saveBearer()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background"
                >
                  Lagre token
                </button>
              </div>
              {facilitatorError ? (
                <p className="text-sm text-accent">{facilitatorError}</p>
              ) : (
                <p className="text-xs text-muted">
                  Tastatur: ← forrige · mellomrom / → neste (kun i reveal). Neste på siste spørsmål
                  fullfører økta.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                disabled={!bearerReady}
                onClick={() => void patchState("ready_to_reveal")}
                className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                Sett klar
              </button>
              <button
                type="button"
                disabled={!bearerReady}
                onClick={() => void patchState("revealing")}
                className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                Start reveal
              </button>
              <button
                type="button"
                disabled={!bearerReady}
                onClick={() => void patchState("completed")}
                className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                Fullfør
              </button>
              <button
                type="button"
                disabled={!bearerReady || state !== "revealing"}
                onClick={() => void handlePrev()}
                className="rounded-xl border border-accent-soft px-3 py-2 text-sm disabled:opacity-40"
              >
                Forrige
              </button>
              <button
                type="button"
                disabled={!bearerReady || state !== "revealing"}
                onClick={() => void handleNext()}
                className="rounded-xl border border-accent px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Neste
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!dockOpen ? (
        <p className="pointer-events-none fixed bottom-3 left-4 text-[11px] text-muted opacity-70">
          Ctrl+. facilitator
        </p>
      ) : null}
    </div>
  );
}
