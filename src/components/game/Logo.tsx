import { useId } from "react";

/**
 * SUBB SURFERS brand lockup — cinematic GTA-style poster type.
 *
 * "SUBB" is near-white with a heavy black outline and top gloss; "SURFERS"
 * burns in a saturated orange gradient beneath it. Layered per word: dark
 * outer outline → warm rim → gradient fill → top-half gloss pass.
 * `textLength` pins the wordmark width so centering and the italic skew
 * stay exact regardless of font-load timing.
 */
export default function Logo({ className = "" }: { className?: string }) {
  const rawId = useId();
  const safe = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const whiteId = `subb-logo-white-${safe}`;
  const orangeId = `subb-logo-orange-${safe}`;
  const glossId = `subb-logo-gloss-${safe}`;

  return (
    <svg
      viewBox="0 0 640 240"
      role="img"
      aria-label="SUBB SURFERS"
      className={`h-auto w-full ${className}`}
      style={{
        filter:
          "drop-shadow(0 6px 0 rgba(5, 5, 8, 0.6)) drop-shadow(0 24px 48px rgba(0, 0, 0, 0.55))",
      }}
    >
      <defs>
        {/* GTA-white for the top word */}
        <linearGradient id={whiteId} x1="320" y1="14" x2="320" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#eceff2" />
          <stop offset="1" stopColor="#aab2ba" />
        </linearGradient>
        {/* Burning orange for the sub word */}
        <linearGradient id={orangeId} x1="320" y1="150" x2="320" y2="212" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd9a8" />
          <stop offset="0.4" stopColor="#ff9f43" />
          <stop offset="1" stopColor="#e8590c" />
        </linearGradient>
        {/* Top-half gloss — fades out below 45% height for a molded look. */}
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="0.52">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Italic lean + slight arc tilt; skew compensated so words stay centered. */}
      <g
        transform="translate(11 4) skewX(-6) rotate(-1.6 320 120)"
        style={{
          fontFamily: "var(--font-display), Impact, system-ui, sans-serif",
          fontWeight: 800,
        }}
        textAnchor="middle"
      >
        {/* SUBB — white */}
        <g fill="none" stroke="#0c0c10" strokeWidth="19" strokeLinejoin="round">
          <text x="316" y="118" fontSize="138" textLength="356" lengthAdjust="spacing">
            SUBB
          </text>
        </g>
        <g fill="none" stroke="#f8f9fa" strokeWidth="7" strokeLinejoin="round">
          <text x="316" y="118" fontSize="138" textLength="356" lengthAdjust="spacing">
            SUBB
          </text>
        </g>
        <text
          x="316"
          y="118"
          fontSize="138"
          textLength="356"
          lengthAdjust="spacing"
          fill={`url(#${whiteId})`}
        >
          SUBB
        </text>
        <text
          x="316"
          y="118"
          fontSize="138"
          textLength="356"
          lengthAdjust="spacing"
          fill={`url(#${glossId})`}
        >
          SUBB
        </text>

        {/* SURFERS — orange */}
        <g fill="none" stroke="#0c0c10" strokeWidth="14" strokeLinejoin="round">
          <text x="327" y="190" fontSize="60" textLength="384" lengthAdjust="spacing">
            SURFERS
          </text>
        </g>
        <g fill="none" stroke="#ffe3c2" strokeWidth="5" strokeLinejoin="round">
          <text x="327" y="190" fontSize="60" textLength="384" lengthAdjust="spacing">
            SURFERS
          </text>
        </g>
        <text
          x="327"
          y="190"
          fontSize="60"
          textLength="384"
          lengthAdjust="spacing"
          fill={`url(#${orangeId})`}
        >
          SURFERS
        </text>
        <text
          x="327"
          y="190"
          fontSize="60"
          textLength="384"
          lengthAdjust="spacing"
          fill={`url(#${glossId})`}
        >
          SURFERS
        </text>
      </g>

      {/* White-hot sparkles right of the wordmark */}
      <g fill="#f8f9fa" stroke="#0c0c10" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M568 40 L574.5 55.5 L590 62 L574.5 68.5 L568 84 L561.5 68.5 L546 62 L561.5 55.5 Z" />
      </g>
      <g fill="#ff9f43" stroke="#0c0c10" strokeWidth="2" strokeLinejoin="round">
        <path d="M596 14 L600 23.5 L609.5 27.5 L600 31.5 L596 41 L592 31.5 L582.5 27.5 L592 23.5 Z" />
      </g>
      <g fill="#eceff2" opacity="0.9">
        <circle cx="540" cy="26" r="4.5" />
      </g>

      {/* Orange speed swoosh — symmetric under the wordmark, with highlight */}
      <path
        d="M 168 218 Q 320 244 472 212"
        fill="none"
        stroke={`url(#${orangeId})`}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M 174 213.5 Q 320 237.5 466 208.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
