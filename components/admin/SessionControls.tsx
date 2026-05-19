"use client";

import { useCallback, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";

type SessionState =
  | "draft"
  | "nh_collecting"
  | "team_collecting"
  | "ready_to_reveal"
  | "revealing"
  | "completed";

const STATE_LABELS: Record<SessionState, string> = {
  draft: "Utkast",
  nh_collecting: "Nyansatt svarer",
  team_collecting: "Team gjetter",
  ready_to_reveal: "Klar til reveal",
  revealing: "Reveal pågår",
  completed: "Fullført",
};

const STATE_DESCRIPTIONS: Record<SessionState, string> = {
  draft: "Økten er opprettet men ikke startet.",
  nh_collecting: "Nyansatt fyller inn sine svar.",
  team_collecting: "Teamet gjetter svarene til nyansatt.",
  ready_to_reveal: "Team-runden er lukket. Klar for reveal.",
  revealing: "Reveal pågår — svar vises på storskjerm.",
  completed: "Økten er avsluttet.",
};

/** Valid next states from a given state */
function nextStates(current: SessionState): SessionState[] {
  switch (current) {
    case "draft":
      return ["nh_collecting"];
    case "nh_collecting":
      return ["team_collecting"];
    case "team_collecting":
      return ["ready_to_reveal"];
    case "ready_to_reveal":
      return ["revealing"];
    case "revealing":
      return ["completed"];
    case "completed":
      return [];
  }
}

const ACTION_LABELS: Partial<Record<SessionState, string>> = {
  nh_collecting: "Start nyansatt-innsamling",
  team_collecting: "Åpne for team-gjetting",
  ready_to_reveal: "Lukk team-runden",
  revealing: "Start reveal",
  completed: "Avslutt økt",
};

type Props = {
  publicId: string;
  initialState?: SessionState;
  onStateChange?: (state: SessionState) => void;
};

export function SessionControls({ publicId, initialState = "draft", onStateChange }: Props) {
  const { authHeaders } = useAdminAuth();
  const [currentState, setCurrentState] = useState<SessionState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const transitionTo = useCallback(
    async (newState: SessionState) => {
      setBusy(true);
      setError(null);
      setSuccess(null);
      try {
        const r = await fetch(`/api/admin/sessions/${encodeURIComponent(publicId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ state: newState }),
        });
        const body: unknown = await r.json();
        if (!r.ok) {
          const msg =
            typeof body === "object" && body !== null && "error" in body
              ? String((body as { error: unknown }).error)
              : `Feil ${r.status}`;
          throw new Error(msg);
        }
        setCurrentState(newState);
        onStateChange?.(newState);
        setSuccess(`Økt oppdatert til: ${STATE_LABELS[newState]}`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunne ikke oppdatere økt.");
      } finally {
        setBusy(false);
      }
    },
    [publicId, authHeaders, onStateChange],
  );

  const available = nextStates(currentState);

  return (
    <div className="space-y-4">
      {/* Current state indicator */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted">Status:</span>
        <span className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-bold text-secondary">
          {STATE_LABELS[currentState]}
        </span>
      </div>
      <p className="text-xs text-muted">{STATE_DESCRIPTIONS[currentState]}</p>

      {/* Action buttons */}
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {available.map((next) => (
            <button
              key={next}
              type="button"
              disabled={busy}
              onClick={() => void transitionTo(next)}
              className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all disabled:opacity-40 ${
                next === "ready_to_reveal"
                  ? "bg-secondary text-surface-white shadow-md shadow-secondary/20 hover:brightness-110"
                  : next === "completed"
                    ? "bg-surface-container-highest text-foreground hover:bg-surface-container-high"
                    : "bg-secondary text-surface-white shadow-md shadow-secondary/20 hover:brightness-110"
              }`}
            >
              {busy ? "Oppdaterer ..." : (ACTION_LABELS[next] ?? `→ ${STATE_LABELS[next]}`)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Økten er fullført — ingen flere handlinger.</p>
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {success ? <p className="text-sm text-secondary">{success}</p> : null}
    </div>
  );
}
