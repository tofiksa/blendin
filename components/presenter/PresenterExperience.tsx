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
    completed: "Fullfort",
  };
  return map[state] ?? state;
}

function harmonyCopy(matches: number, total: number): string {
  if (total <= 0) return "Vi starter straks.";
  const ratio = matches / total;
  if (ratio >= 0.9) return "Helt perfekt blandet — dere smaker pa samme bonne.";
  if (ratio >= 0.72) return "Sterk harmoni — litt mer melk og smaprat sa er dere i mal.";
  if (ratio >= 0.45) return "God start — kaffen trenger litt mer tid pa trakteren.";
  return "Ekte variasjon — perfekt unnskyldning for en ekstra runde.";
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
        if (!r.ok) throw new Error("Kunne ikke laste okt.");
        if (!cancelled) setSnapshot(body as LivePayload);
      })
      .catch(() => {
        if (!cancelled) setStreamError("Kunne ikke laste okt.");
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
        setStreamError("Ugyldig data fra strommen.");
      }
    };
    es.onerror = () => setStreamError("Live-strom mistet — oppdater siden.");
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
      setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere okt.");
    }
  }, [bearer, bearerReady, idx, maxIdx, publicId, snapshot]);

  const handlePrev = useCallback(async () => {
    if (!bearerReady || !bearer.trim() || !snapshot) return;
    if (snapshot.state !== "revealing" || idx <= 0) return;
    setFacilitatorError(null);
    try {
      await adminPatch(publicId, bearer.trim(), { currentQuestionIndex: idx - 1 });
    } catch (err) {
      setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere okt.");
    }
  }, [bearer, bearerReady, idx, publicId, snapshot]);

  const patchState = useCallback(
    async (next: ApiSessionState) => {
      if (!bearerReady || !bearer.trim()) return;
      setFacilitatorError(null);
      try {
        await adminPatch(publicId, bearer.trim(), { state: next });
      } catch (err) {
        setFacilitatorError(err instanceof Error ? err.message : "Kunne ikke oppdatere okt.");
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
    <div className="relative flex min-h-dvh flex-col bg-primary-container text-primary">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-4 px-8 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container/30">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-secondary-container"
              aria-hidden="true"
            >
              <path
                d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 1v3M10 1v3M14 1v3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-secondary-container/80">Blend-In</p>
            <p className="font-mono text-xs text-secondary-container/50">{publicId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary-container/20 px-3 py-1 text-xs font-semibold text-secondary-container">
            {formatState(state)}
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary-container/60">
            <input
              type="checkbox"
              checked={!muted}
              onChange={(e) => setMuted(!e.target.checked)}
              className="accent-secondary"
            />
            Lyd
          </label>
          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            className="rounded-2xl bg-secondary-container/20 px-4 py-2 text-sm font-semibold text-secondary-container transition-colors hover:bg-secondary-container/30"
          >
            Fasilitator
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 flex-col gap-8 px-8 pb-8 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        {/* Left: content */}
        <main className="flex flex-1 flex-col justify-center lg:max-w-[60%]">
          {!snapshot && !streamError ? (
            <p className="text-xl text-secondary-container/60">Laster koppen ...</p>
          ) : null}
          {streamError ? (
            <div className="rounded-3xl bg-error/20 px-6 py-4">
              <p className="text-secondary-container">{streamError}</p>
            </div>
          ) : null}

          {/* Lobby phase */}
          {snapshot && lobbyPhase ? (
            <div className="space-y-6">
              <h1 className="text-balance text-5xl font-bold tracking-tight text-secondary-container lg:text-6xl xl:text-7xl">
                Ro for reveal
              </h1>
              <p className="max-w-prose text-pretty text-xl leading-relaxed text-secondary-container/70">
                {state === "team_collecting"
                  ? "Teamet sender sine gjett — vent til alle er klare for dere apner reveal."
                  : state === "nh_collecting"
                    ? "Nyansatt jobber med sine valg — ingen hast pa koppen."
                    : "Okta er i oppstart — alt synkes automatisk."}
              </p>
            </div>
          ) : null}

          {/* Ready to reveal */}
          {snapshot && state === "ready_to_reveal" ? (
            <div className="space-y-6">
              <h1 className="text-balance text-5xl font-bold tracking-tight text-secondary-container lg:text-6xl xl:text-7xl">
                Klar til a helle ut flertallet
              </h1>
              <p className="max-w-prose text-pretty text-xl leading-relaxed text-secondary-container/70">
                Alt er telt og klargjort. Start reveal nar rommet er samlet.
              </p>
            </div>
          ) : null}

          {/* Revealing — question sync issue */}
          {snapshot && state === "revealing" && questions.length > 0 && !currentQuestion ? (
            <p className="text-secondary-container/60">Vent pa synk fra server ...</p>
          ) : null}

          {/* Revealing — current question */}
          {snapshot && state === "revealing" && currentQuestion ? (
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-full bg-secondary-container/20 px-3 py-1 text-sm font-bold text-secondary-container">
                    {idx + 1} / {questions.length}
                  </span>
                  {/* progress dots */}
                  <div className="flex gap-1.5">
                    {questions.map((q, i) => (
                      <div
                        key={q.id}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          i === idx
                            ? "bg-secondary-container"
                            : i < idx
                              ? "bg-secondary-container/40"
                              : "bg-secondary-container/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <h1 className="text-balance text-4xl font-bold tracking-tight text-secondary-container lg:text-5xl xl:text-6xl">
                  {currentQuestion.stem}
                </h1>
              </div>

              {!currentResult ? (
                <p className="text-secondary-container/60">
                  Aggregater mangler — sjekk at reveal-fase er apnet fra admin.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
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
                          className={`relative overflow-hidden rounded-3xl px-6 py-5 ${
                            isChosen ? "bg-secondary/80" : "bg-secondary-container/15"
                          }`}
                        >
                          {/* Vote bar */}
                          <div
                            className={`pointer-events-none absolute inset-y-0 left-0 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out ${
                              isChosen ? "bg-secondary-container/20" : "bg-secondary-container/10"
                            }`}
                            style={{ width: `${share}%` }}
                            aria-hidden
                          />
                          <div className="relative flex flex-wrap items-center justify-between gap-4">
                            <span
                              className={`text-xl font-bold ${isChosen ? "text-primary-container" : "text-secondary-container"}`}
                            >
                              {opt.label}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-mono text-lg ${isChosen ? "text-primary-container/80" : "text-secondary-container/60"}`}
                              >
                                {n}
                              </span>
                              {isTied ? (
                                <span className="rounded-full bg-secondary-container/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-secondary-container">
                                  delt topp
                                </span>
                              ) : null}
                              {isChosen ? (
                                <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-container">
                                  teamets stemme
                                </span>
                              ) : null}
                              {bearerReady && isTruth ? (
                                <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-container">
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
                <p className="text-lg leading-relaxed text-secondary-container/70">
                  {currentResult.chosenOptionId === nhOptionForCurrent
                    ? "Treff — koppen far et ordentlig grep denne runden."
                    : "Utforskende svar — gi nyansatt rom a fortelle litt bak svaret."}
                </p>
              ) : null}

              {!bearerReady ? (
                <p className="text-sm text-secondary-container/50">
                  Apne fasilitator-panelet (Ctrl+.) og lagre admin-token for a se nyansatts valg.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Completed */}
          {snapshot && state === "completed" ? (
            <div className="space-y-8">
              <h1 className="text-balance text-5xl font-bold tracking-tight text-secondary-container lg:text-6xl xl:text-7xl">
                {harmonyCopy(harmonyStats.matches, harmonyStats.total)}
              </h1>
              <p className="text-2xl text-secondary-container/70">
                Dere traff pa {harmonyStats.matches} av {harmonyStats.total} flertallsvalg.
              </p>
              <p className="max-w-prose text-pretty text-lg text-secondary-container/50">
                Takk for at dere tok uken pa alvor — samtalene er det som fyller koppen mellom
                svarene.
              </p>
            </div>
          ) : null}
        </main>

        {/* Right: coffee cup */}
        <aside className="flex shrink-0 flex-col items-center justify-center lg:w-[30%]">
          <CoffeeCup fillPercent={cupFill} reducedMotion={reducedMotion} />
          <p className="mt-6 max-w-[14rem] text-center text-sm text-secondary-container/50">
            Koppen speiler hvor ofte teamets flertall traff nyansatt — ikke poeng eller rangering.
          </p>
        </aside>
      </div>

      {/* Facilitator dock */}
      {dockOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary-container/20 bg-primary-container/95 px-6 py-5 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:px-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-col gap-2">
              <label
                htmlFor="blend-bearer"
                className="text-xs font-bold uppercase tracking-wider text-secondary-container/60"
              >
                Admin Bearer (Ctrl+. for a skjule)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="blend-bearer"
                  type="password"
                  autoComplete="off"
                  value={bearer}
                  onChange={(e) => setBearer(e.target.value)}
                  className="min-w-[16rem] flex-1 rounded-2xl border-0 bg-secondary-container/10 px-4 py-2.5 text-sm text-secondary-container outline-none ring-2 ring-transparent focus:ring-secondary/40"
                  placeholder="BLEND_ADMIN_SECRET som Bearer ..."
                />
                <button
                  type="button"
                  onClick={() => saveBearer()}
                  className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold text-primary-container"
                >
                  Lagre
                </button>
              </div>
              {facilitatorError ? (
                <p className="text-sm text-error">{facilitatorError}</p>
              ) : (
                <p className="text-xs text-secondary-container/50">
                  Tastatur: &larr; forrige &middot; mellomrom / &rarr; neste (kun i reveal)
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {(
                [
                  ["Sett klar", "ready_to_reveal"],
                  ["Start reveal", "revealing"],
                  ["Fulfor", "completed"],
                ] as const
              ).map(([label, target]) => (
                <button
                  key={target}
                  type="button"
                  disabled={!bearerReady}
                  onClick={() => void patchState(target)}
                  className="rounded-2xl bg-secondary-container/20 px-4 py-2.5 text-sm font-semibold text-secondary-container transition-colors hover:bg-secondary-container/30 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!bearerReady || state !== "revealing"}
                  onClick={() => void handlePrev()}
                  className="rounded-2xl border border-secondary-container/20 px-4 py-2.5 text-sm text-secondary-container disabled:opacity-40"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  disabled={!bearerReady || state !== "revealing"}
                  onClick={() => void handleNext()}
                  className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold text-primary-container disabled:opacity-40"
                >
                  Neste &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!dockOpen ? (
        <p className="pointer-events-none fixed bottom-4 left-6 text-xs text-secondary-container/30">
          Ctrl+. fasilitator
        </p>
      ) : null}
    </div>
  );
}
