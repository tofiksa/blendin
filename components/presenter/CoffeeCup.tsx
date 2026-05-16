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
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: ren dekorasjon; forklares i brodteksten */}
      <svg
        viewBox="0 0 140 200"
        className={`w-full max-w-[16rem] drop-shadow-lg ${reducedMotion ? "" : "motion-safe:[&_rect.liquid]:transition-[y,height] motion-safe:[&_rect.liquid]:duration-[900ms] motion-safe:[&_rect.liquid]:ease-out"}`}
        aria-hidden
      >
        <defs>
          <clipPath id="blendin-cup-inner">
            <rect x="26" y={innerTop} width="72" height={innerH} rx="12" />
          </clipPath>
          <linearGradient id="blendin-coffee-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary-container)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="blendin-cup-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary-container)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--secondary-container)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Steam wisps — only when fill > 50 */}
        {fill > 50 && !reducedMotion ? (
          <g opacity="0.3">
            <path
              d="M50 32 Q48 20 52 10"
              fill="none"
              stroke="var(--secondary-container)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;2,-4;0,0"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.1;0.3"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M62 30 Q60 16 64 6"
              fill="none"
              stroke="var(--secondary-container)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;-2,-5;0,0"
                dur="3.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.2;0.05;0.2"
                dur="3.5s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M74 32 Q72 18 76 8"
              fill="none"
              stroke="var(--secondary-container)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;1,-3;0,0"
                dur="4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.25;0.08;0.25"
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        ) : null}

        {/* Cup body fill */}
        <path
          d="M18 34 C18 26 24 20 34 20 H106 C116 20 122 26 122 34 V156 C122 166 114 174 104 174 H36 C26 174 18 166 18 156 Z"
          fill="url(#blendin-cup-body)"
        />

        {/* Cup outline */}
        <path
          d="M18 34 C18 26 24 20 34 20 H106 C116 20 122 26 122 34 V156 C122 166 114 174 104 174 H36 C26 174 18 166 18 156 Z"
          fill="none"
          stroke="var(--secondary-container)"
          strokeWidth="3"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* Handle */}
        <path
          d="M122 52 C138 52 146 68 146 92 C146 114 134 132 118 134"
          fill="none"
          stroke="var(--secondary-container)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Liquid */}
        <g clipPath="url(#blendin-cup-inner)">
          <rect
            className="liquid"
            x="26"
            y={liquidTop}
            width="72"
            height={liquidH}
            rx="12"
            fill="url(#blendin-coffee-grad)"
          />
        </g>

        {/* Rim */}
        <ellipse
          cx="62"
          cy="38"
          rx="42"
          ry="10"
          fill="none"
          stroke="var(--secondary-container)"
          strokeWidth="2.5"
          opacity="0.35"
        />

        {/* Saucer */}
        <ellipse cx="62" cy="180" rx="52" ry="8" fill="var(--secondary-container)" opacity="0.12" />
      </svg>
    </>
  );
}
