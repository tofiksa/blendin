"use client";

export function CoffeeCup({
  fillPercent,
  reducedMotion,
}: {
  fillPercent: number;
  reducedMotion: boolean;
}) {
  const fill = Math.max(0, Math.min(100, fillPercent));
  const innerTop = 44;
  const innerH = 118;
  const liquidH = Math.max(4, (fill / 100) * innerH);
  const liquidTop = innerTop + innerH - liquidH;

  return (
    <>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: ren dekorasjon; forklares i brødteksten */}
      <svg
        viewBox="0 0 140 190"
        className={`w-full max-w-[15rem] text-foreground drop-shadow-sm ${reducedMotion ? "" : "motion-safe:[&_rect.liquid]:transition-[y,height] motion-safe:[&_rect.liquid]:duration-[900ms] motion-safe:[&_rect.liquid]:ease-out"}`}
        aria-hidden
      >
        <defs>
          <clipPath id="blendin-cup-inner">
            <rect x="26" y={innerTop} width="72" height={innerH} rx="12" />
          </clipPath>
        </defs>
        <path
          d="M18 34 C18 26 24 20 34 20 H106 C116 20 122 26 122 34 V156 C122 166 114 174 104 174 H36 C26 174 18 166 18 156 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M122 52 C138 52 146 68 146 92 C146 114 134 132 118 134"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g clipPath="url(#blendin-cup-inner)">
          <rect
            className="liquid"
            x="26"
            y={liquidTop}
            width="72"
            height={liquidH}
            rx="12"
            fill="var(--accent)"
            opacity="0.72"
          />
        </g>
        <ellipse
          cx="62"
          cy="38"
          rx="42"
          ry="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.55"
        />
      </svg>
    </>
  );
}
