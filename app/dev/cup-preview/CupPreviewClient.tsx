"use client";

import { CoffeeCup } from "@/components/presenter/CoffeeCup";

const levels = [
  { label: "Tom (0 %)", fill: 0 },
  { label: "Halvfull (50 %)", fill: 50 },
  { label: "Full (100 %)", fill: 100 },
] as const;

export function CupPreviewClient() {
  return (
    <div className="presenter-shell min-h-dvh bg-primary-container px-6 py-10">
      <p className="mb-8 text-center text-sm text-primary/60">
        Dev-forhåndsvisning — ikke i produksjon
      </p>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-3">
        {levels.map(({ label, fill }) => (
          <div key={fill} className="flex flex-col items-center">
            <p className="mb-3 text-sm font-semibold text-primary">{label}</p>
            <CoffeeCup fillPercent={fill} reducedMotion={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
