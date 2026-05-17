"use client";

import { useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { ExistingTenantQuizPack } from "@/components/admin/ExistingTenantQuizPack";

export function QuizPage() {
  const { bearer } = useAdminAuth();
  const [tenantSlug, setTenantSlug] = useState("demo");

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-surface-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Legg til quiz-mal</h2>
        <p className="mt-2 text-sm text-muted">
          Opprett en ny quiz-mal med spørsmål for en eksisterende tenant.
        </p>
      </section>

      <ExistingTenantQuizPack
        bearer={bearer}
        tenantSlug={tenantSlug}
        onTenantSlugChange={setTenantSlug}
        onQuizTemplateCreated={() => {
          /* could show success toast */
        }}
      />
    </div>
  );
}
