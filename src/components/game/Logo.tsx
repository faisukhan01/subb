import { useId } from "react";

/**
 * SUBB SURFERS brand lockup.
 *
 * SVG text with layered "arcade sticker" treatment per word: dark outer
 * outline, warm-cream rim, amber→red gradient fill, then a top-half gloss
 * pass for a molded-plastic highlight. `textLength` pins the wordmark width
 * so centering and the italic skew stay exact regardless of font-load
 * timing. Sized via className; render font weight follows --font-display.
 */
export default function Logo({ className = "" }: { className?: string }) {
  const rawId = useId();
  const safe = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `subb-logo-grad-${safe}`;
  const glossId = `subb-logo-gloss-${safe}`;

  return (
    <svg
      viewBox="0 0 640 240"
      role="img"
      aria-label="SUBB SURFERS"
      className={`h-auto w-full ${className}`}
      style={{
        filter:
          "drop-shadow(0 5px 0 rgba(10, 6, 3, 0.55)) drop-shadow(0 20px 44px rgba(234, 88, 12, 0.5))",
      }}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="320"
          y1="14"
          x2="320"
          y2="210"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.34" stopColor="#fde047" />
          <stop offset="0.62" stopColor="#fbbf24" />
          <stop offset="0.84" stopColor="#f97316" />
          <stop offset="1" stopColor="#ea440c" />
        </linearGradient>
        {/* Top-half gloss — fades out below 45% height for a molded look. */}
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="0.52">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Italic lean + slight arc tilt; skew compensated so words stay centered. */}
      <g
        transform="translate(11 4) skewX(-6) rotate(-1.6 320 120)"
        style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
        }}
        textAnchor="middle"
      >
        {/* SUBB */}
        <g fill="none" stroke="#170d06" strokeWidth="19" strokeLinejoin="round">
          <text x="316" y="118" fontSize="138" textLength="356" lengthAdjust="spacing">
            SUBB
          </text>
        </g>
        <g fill="none" stroke="#fff7e6" strokeWidth="8.5" strokeLinejoin="round">
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
          fill={`url(#${gradId})`}
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

        {/* SURFERS */}
        <g fill="none" stroke="#170d06" strokeWidth="14" strokeLinejoin="round">
          <text x="327" y="190" fontSize="60" textLength="384" lengthAdjust="spacing">
            SURFERS
          </text>
        </g>
        <g fill="none" stroke="#fff7e6" strokeWidth="6.5" strokeLinejoin="round">
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
          fill={`url(#${gradId})`}
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

      {/* Four-point sparkles — arcade sticker glitter, right of the wordmark */}
      <g fill="#fde047" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M568 40 L574.5 55.5 L590 62 L574.5 68.5 L568 84 L561.5 68.5 L546 62 L561.5 55.5 Z" />
      </g>
      <g fill="#fff7e6" stroke="#b45309" strokeWidth="2" strokeLinejoin="round">
        <path d="M596 14 L600 23.5 L609.5 27.5 L600 31.5 L596 41 L592 31.5 L582.5 27.5 L592 23.5 Z" />
      </g>
      <g fill="#fbbf24" opacity="0.9">
        <circle cx="540" cy="26" r="4.5" />
      </g>

      {/* Amber speed swoosh — symmetric under the wordmark, with highlight */}
      <path
        d="M 168 218 Q 320 244 472 212"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M 174 213.5 Q 320 237.5 466 208.5"
        fill="none"
        stroke="#fff7e6"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
