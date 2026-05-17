"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { AdminNav } from "@/components/admin/AdminNav";

function AuthGate({ children }: { children: ReactNode }) {
  const { bearer, setBearer, bearerSaved, saveBearer } = useAdminAuth();

  if (!bearerSaved) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <section className="w-full max-w-md rounded-3xl bg-surface-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Logg inn</h2>
          <p className="mt-2 text-sm text-muted">
            Lim inn{" "}
            <code className="rounded-lg bg-surface-container-highest px-1.5 py-0.5 font-mono text-xs">
              BLEND_ADMIN_SECRET
            </code>{" "}
            for å fortsette.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <input
              type="password"
              autoComplete="off"
              value={bearer}
              onChange={(e) => setBearer(e.target.value)}
              className="w-full rounded-2xl border-0 bg-surface-container-low px-4 py-3 text-sm text-foreground outline-none ring-2 ring-transparent focus:ring-secondary/40"
              placeholder="Lim inn hemmelighet ..."
            />
            <button
              type="button"
              onClick={() => saveBearer()}
              disabled={!bearer.trim()}
              className="rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-surface-white disabled:opacity-40"
            >
              Logg inn
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <div className="min-h-dvh bg-surface-container-low">
        <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
          {/* Header */}
          <header className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Blend-In</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin
            </h1>
          </header>

          <AuthGate>
            {/* Navigation */}
            <div className="mb-8">
              <AdminNav />
            </div>

            {/* Page content */}
            {children}
          </AuthGate>
        </div>
      </div>
    </AdminAuthProvider>
  );
}
