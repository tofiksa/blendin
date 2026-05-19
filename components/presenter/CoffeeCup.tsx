"use client";

import { useId } from "react";

/** Flat blend-kopp — matcher referansekort (tykk kontur, U-form, elliptisk skum). */
export function CoffeeCup({
  fillPercent,
  reducedMotion: _reducedMotion,
}: {
  fillPercent: number;
  reducedMotion: boolean;
}) {
  const fill = Math.max(0, Math.min(100, fillPercent));
  const displayPercent = Math.round(fill);

  const cx = 100;
  const rimY = 108;
  const left = 46;
  const right = 154;
  const bottom = 228;
  const innerPad = 9;
  const innerTop = rimY + innerPad;
  const innerBottom = bottom - innerPad;
  const innerH = innerBottom - innerTop;
  const liquidH = Math.max(0, (fill / 100) * innerH);
  const liquidTop = innerBottom - liquidH;

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `blendin-cup-inner-${uid}`;

  const ink = "var(--foreground)";
  const coffee = "#a67c52";
  const coffeeDeep = "#6f4f3a";
  const label = "var(--primary)";
  const strokeW = 8;

  const cupOutline = `M ${left} ${rimY}
    L ${left} ${bottom - 16}
    Q ${left} ${bottom} ${cx} ${bottom}
    Q ${right} ${bottom} ${right} ${bottom - 16}
    L ${right} ${rimY}`;

  /** C-formet håndtak — ca. 1/3 av koppbredden ut til høyre, litt høyere spenn. */
  const cupH = bottom - rimY;
  const handleTop = rimY + cupH * 0.22;
  const handleBottom = rimY + cupH * 0.78;
  const handleR = (handleBottom - handleTop) / 2;
  const handleRx = handleR * 1.15;
  const handlePath = `M ${right} ${handleTop} A ${handleRx} ${handleR} 0 0 1 ${right} ${handleBottom}`;

  const innerClip = `M ${left + innerPad} ${innerTop}
    L ${left + innerPad} ${innerBottom - 12}
    Q ${left + innerPad} ${innerBottom} ${cx} ${innerBottom}
    Q ${right - innerPad} ${innerBottom} ${right - innerPad} ${innerBottom - 12}
    L ${right - innerPad} ${innerTop}
    Z`;

  const liquidRx = (right - left) / 2 - innerPad - 2;

  return (
    <>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: dekorativ */}
      <svg
        viewBox="0 0 200 280"
        preserveAspectRatio="xMidYMid meet"
        className={`mx-auto block h-auto w-[min(50vw,100%)] min-w-[11rem] max-h-[min(72vh,36rem)] max-w-full sm:min-w-[14rem] lg:w-full lg:min-w-0 ${fill > 0 ? "motion-safe:[&_rect.liquid]:transition-[y,height] motion-safe:[&_rect.liquid]:duration-900 motion-safe:[&_rect.liquid]:ease-out motion-safe:[&_ellipse.liquid-surface]:transition-[cy] motion-safe:[&_ellipse.liquid-surface]:duration-900 motion-safe:[&_ellipse.liquid-surface]:ease-out" : ""}`}
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d={innerClip} />
          </clipPath>
        </defs>

        {/* Håndtak */}
        <path
          d={handlePath}
          fill="none"
          stroke={ink}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Kaffefyll */}
        {fill > 0 ? (
          <g clipPath={`url(#${clipId})`}>
            <rect
              className="liquid"
              x={left + innerPad}
              y={liquidTop}
              width={right - left - innerPad * 2}
              height={liquidH}
              fill={coffee}
            />
            <path
              d={`M ${left + innerPad} ${bottom - 28}
                L ${left + innerPad} ${innerBottom}
                Q ${cx} ${innerBottom + 2} ${right - innerPad} ${innerBottom}
                L ${right - innerPad} ${bottom - 28}
                Z`}
              fill={coffeeDeep}
              opacity="0.5"
            />
            {liquidH > 8 ? (
              <ellipse
                className="liquid-surface"
                cx={cx}
                cy={liquidTop}
                rx={liquidRx}
                ry={5.5}
                fill={coffeeDeep}
              />
            ) : null}
          </g>
        ) : null}

        {/* Glass-effekt: litt kaffe synlig forbi bunnhjørner */}
        {fill > 12 ? (
          <path
            d={`M ${left + 2} ${bottom - 20}
              Q ${left - 4} ${bottom + 3} ${cx} ${bottom + 3}
              Q ${right + 4} ${bottom + 3} ${right - 2} ${bottom - 20}
              L ${right - innerPad} ${innerBottom - 2}
              Q ${cx} ${innerBottom - 2} ${left + innerPad} ${innerBottom - 2}
              Z`}
            fill={coffee}
            opacity="0.9"
          />
        ) : null}

        {/* Kopp-kontur + flat topp */}
        <path
          d={cupOutline}
          fill="none"
          stroke={ink}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={left - 2}
          y1={rimY}
          x2={right + 2}
          y2={rimY}
          stroke={ink}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Tekst over alt */}
        <text
          x={cx}
          y={58}
          textAnchor="middle"
          fill={ink}
          fontSize="40"
          fontWeight="700"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {displayPercent}%
        </text>
        <text
          x={cx}
          y={84}
          textAnchor="middle"
          fill={label}
          fontSize="11"
          fontWeight="600"
          letterSpacing="0.38em"
        >
          BLEND
        </text>
      </svg>
    </>
  );
}
