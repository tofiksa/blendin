"use client";

import { useId } from "react";

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

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `blendin-cup-inner-${uid}`;
  const gradCoffee = `blendin-coffee-grad-${uid}`;
  const gradCup = `blendin-cup-body-${uid}`;
  const steamBlur = `blendin-steam-blur-${uid}`;
  const steamGrad = `blendin-steam-grad-${uid}`;

  /** Damp synlig når det er «noe i koppen» (lobby 8 % og oppover); styrkes med harmoni-fyll. */
  const steamGroupOpacity = fill <= 0 ? 0 : Math.min(0.92, 0.28 + (fill / 100) * 0.62);

  return (
    <>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: ren dekorasjon; forklares i brodteksten */}
      <svg
        viewBox="0 0 140 200"
        className={`w-full max-w-[16rem] drop-shadow-lg ${reducedMotion ? "" : "motion-safe:[&_rect.liquid]:transition-[y,height] motion-safe:[&_rect.liquid]:duration-900 motion-safe:[&_rect.liquid]:ease-out motion-safe:[&_ellipse.liquid-surface]:transition-[cy] motion-safe:[&_ellipse.liquid-surface]:duration-900 motion-safe:[&_ellipse.liquid-surface]:ease-out"}`}
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="26" y={innerTop} width="72" height={innerH} rx="12" />
          </clipPath>
          <linearGradient id={gradCoffee} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary-container)" stopOpacity="0.98" />
            <stop offset="55%" stopColor="var(--secondary)" stopOpacity="0.88" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id={gradCup} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary-container)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--secondary-container)" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id={steamGrad} cx="50%" cy="80%" r="65%">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.45" />
            <stop offset="55%" stopColor="var(--foreground)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
          </radialGradient>
          <filter id={steamBlur} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" />
          </filter>
        </defs>

        {/* Saucer (bak) */}
        <ellipse cx="62" cy="180" rx="52" ry="8" fill="var(--secondary-container)" opacity="0.12" />

        {/* Cup body */}
        <path
          d="M18 34 C18 26 24 20 34 20 H106 C116 20 122 26 122 34 V156 C122 166 114 174 104 174 H36 C26 174 18 166 18 156 Z"
          fill={`url(#${gradCup})`}
        />

        <path
          d="M18 34 C18 26 24 20 34 20 H106 C116 20 122 26 122 34 V156 C122 166 114 174 104 174 H36 C26 174 18 166 18 156 Z"
          fill="none"
          stroke="var(--secondary-container)"
          strokeWidth="3"
          strokeLinejoin="round"
          opacity="0.6"
        />

        <path
          d="M122 52 C138 52 146 68 146 92 C146 114 134 132 118 134"
          fill="none"
          stroke="var(--secondary-container)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Flytende kaffe + lys overflate som følger nivået */}
        <g clipPath={`url(#${clipId})`}>
          <rect
            className="liquid"
            x="26"
            y={liquidTop}
            width="72"
            height={liquidH}
            rx="12"
            fill={`url(#${gradCoffee})`}
          />
          {fill > 1 ? (
            <ellipse
              className="liquid-surface"
              cx="62"
              cy={liquidTop + Math.min(7, liquidH * 0.12)}
              rx={Math.min(33, 26 + (liquidH / innerH) * 8)}
              ry={Math.max(2.5, Math.min(5.5, liquidH * 0.045))}
              fill="var(--surface-white)"
              opacity="0.22"
            />
          ) : null}
        </g>

        {/* Kant */}
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

        {/* Damp: over koppen, stiger opp og sveiver litt */}
        {fill >= 8 && !reducedMotion ? (
          <g
            filter={`url(#${steamBlur})`}
            opacity={steamGroupOpacity}
            style={{ pointerEvents: "none" }}
          >
            <SteamWisp fillGradientId={steamGrad} cx={50} begin="0s" dur="2.9s" />
            <SteamWisp fillGradientId={steamGrad} cx={58} begin="0.55s" dur="3.35s" />
            <SteamWisp fillGradientId={steamGrad} cx={66} begin="1.05s" dur="3.1s" />
            <SteamWisp fillGradientId={steamGrad} cx={74} begin="1.65s" dur="3.55s" />
            <SteamWisp fillGradientId={steamGrad} cx={62} begin="2.2s" dur="3.25s" />
          </g>
        ) : null}

        {reducedMotion && fill >= 8 ? (
          <g opacity={steamGroupOpacity * 0.35} style={{ pointerEvents: "none" }}>
            <ellipse cx="56" cy="30" rx="6" ry="10" fill={`url(#${steamGrad})`} />
            <ellipse cx="68" cy="28" rx="5" ry="9" fill={`url(#${steamGrad})`} opacity="0.85" />
          </g>
        ) : null}
      </svg>
    </>
  );
}

function SteamWisp({
  cx,
  begin,
  dur,
  fillGradientId,
}: {
  cx: number;
  begin: string;
  dur: string;
  fillGradientId: string;
}) {
  const y0 = 40;
  return (
    <ellipse cx={cx} cy={y0} rx="5.5" ry="10" fill={`url(#${fillGradientId})`} opacity="0">
      <animate
        attributeName="opacity"
        values="0;0.5;0.65;0.45;0;0"
        keyTimes="0;0.15;0.4;0.65;0.9;1"
        dur={dur}
        repeatCount="indefinite"
        begin={begin}
      />
      <animate
        attributeName="cy"
        values={`${y0};${y0 - 18};${y0 - 42};${y0 - 72};${y0 - 92}`}
        keyTimes="0;0.22;0.48;0.78;1"
        dur={dur}
        repeatCount="indefinite"
        begin={begin}
        calcMode="spline"
        keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
      />
      <animate
        attributeName="cx"
        values={`${cx};${cx - 4};${cx + 3};${cx - 2};${cx + 1}`}
        keyTimes="0;0.25;0.5;0.75;1"
        dur={dur}
        repeatCount="indefinite"
        begin={begin}
      />
      <animate
        attributeName="rx"
        values="5.5;7;6;5;4.5"
        dur={dur}
        repeatCount="indefinite"
        begin={begin}
      />
      <animate
        attributeName="ry"
        values="10;14;16;12;8"
        dur={dur}
        repeatCount="indefinite"
        begin={begin}
      />
    </ellipse>
  );
}
