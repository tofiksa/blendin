"use client";

import { useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { SessionControls } from "@/components/admin/SessionControls";

export function SettingsPage() {
  const { bearer, login, logout } = useAdminAuth();
  const [newSecret, setNewSecret] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sessionPublicId, setSessionPublicId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  function handleSave() {
    const value = newSecret.trim();
    if (!value) return;
    login(value);
    setNewSecret("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Session management */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-foreground">Øktstyring</h2>
        <p className="mt-2 text-sm text-muted">
          Styr tilstanden til en aktiv økt. Lim inn økt-ID (publicId) for å administrere den.
        </p>

        <div className="mt-5 space-y-3">
          <label htmlFor="session-id-input" className="block text-sm font-medium text-foreground">
            Økt-ID (publicId)
          </label>
          <div className="flex gap-3">
            <input
              id="session-id-input"
              type="text"
              autoComplete="off"
              value={sessionPublicId}
              onChange={(e) => setSessionPublicId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sessionPublicId.trim()) {
                  setActiveSessionId(sessionPublicId.trim());
                }
              }}
              className="flex-1 rounded-2xl border-0 bg-surface-container-low px-4 py-3 font-mono text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-secondary/40"
              placeholder="f.eks. abc123..."
            />
            <button
              type="button"
              onClick={() => setActiveSessionId(sessionPublicId.trim())}
              disabled={!sessionPublicId.trim()}
              className="rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-surface-white disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>

        {activeSessionId ? (
          <div className="mt-6 rounded-2xl bg-surface-container-low p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs text-muted">{activeSessionId}</span>
              <button
                type="button"
                onClick={() => {
                  setActiveSessionId(null);
                  setSessionPublicId("");
                }}
                className="text-xs font-semibold text-secondary hover:underline"
              >
                Fjern
              </button>
            </div>
            <SessionControls publicId={activeSessionId} />
          </div>
        ) : null}
      </section>

      {/* Secret management */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-foreground">Hemmelighet (Admin-nøkkel)</h2>
        <p className="mt-2 text-sm text-muted">
          Denne nøkkelen brukes for å autentisere mot admin-APIet. Den lagres lokalt i nettleseren
          din og sendes som{" "}
          <code className="rounded-lg bg-surface-container-highest px-1.5 py-0.5 font-mono text-xs">
            Authorization: Bearer ...
          </code>
        </p>

        {/* Current status */}
        <div className="mt-6 rounded-2xl bg-surface-container-low p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Nåværende nøkkel</span>
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="text-xs font-semibold text-secondary hover:underline"
            >
              {showCurrent ? "Skjul" : "Vis"}
            </button>
          </div>
          <p className="mt-1 font-mono text-sm text-foreground">
            {bearer
              ? showCurrent
                ? bearer
                : `${"•".repeat(Math.min(bearer.length, 32))}`
              : "Ingen nøkkel satt"}
          </p>
        </div>

        {/* Update secret */}
        <div className="mt-6 space-y-3">
          <label htmlFor="new-secret" className="block text-sm font-medium text-foreground">
            Oppdater hemmelighet
          </label>
          <input
            id="new-secret"
            type="password"
            autoComplete="off"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-secondary/40"
            placeholder="Lim inn ny hemmelighet ..."
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!newSecret.trim()}
              className="rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-surface-white disabled:opacity-40"
            >
              Lagre
            </button>
            {saved && <span className="self-center text-sm text-muted">Lagret!</span>}
          </div>
        </div>
      </section>

      {/* Logout */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-foreground">Logg ut</h2>
        <p className="mt-2 text-sm text-muted">
          Fjerner den lagrede hemmeligheten fra nettleseren. Du må lime den inn på nytt neste gang.
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-4 rounded-2xl bg-error/10 px-5 py-3 text-sm font-bold text-error"
        >
          Logg ut
        </button>
      </section>
    </div>
  );
}
