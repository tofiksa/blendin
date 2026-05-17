"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { TenantQuizBootstrap } from "@/components/admin/TenantQuizBootstrap";

type TenantRow = { slug: string; name: string };

export function TenantsPage() {
  const { bearer } = useAdminAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showBootstrap, setShowBootstrap] = useState(false);

  const loadTenants = useCallback(async () => {
    const secret = bearer.trim();
    if (!secret) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/tenants", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body: unknown = await r.json();
      if (!r.ok) throw new Error("Kunne ikke hente tenants");
      setTenants((body as { tenants: TenantRow[] }).tenants ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Feil");
    } finally {
      setLoading(false);
    }
  }, [bearer]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tenant list */}
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Tenants</h2>
          <button
            type="button"
            onClick={() => setShowBootstrap(!showBootstrap)}
            className="rounded-2xl bg-secondary px-4 py-2 text-sm font-bold text-surface-white"
          >
            {showBootstrap ? "Lukk" : "+ Ny tenant"}
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Laster...</p>
        ) : err ? (
          <p className="mt-4 text-sm text-error">{err}</p>
        ) : tenants.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Ingen tenants funnet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-outline-variant/20">
            {tenants.map((t) => (
              <li key={t.slug} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-sm font-bold text-muted">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="font-mono text-xs text-muted">/{t.slug}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bootstrap form */}
      {showBootstrap ? (
        <TenantQuizBootstrap
          bearer={bearer}
          onPackCreated={() => {
            setShowBootstrap(false);
            void loadTenants();
          }}
        />
      ) : null}
    </div>
  );
}
