import { useId } from "react";

/**
 * SUBB SURFERS brand lockup.
 *
 * Built as SVG text with three stacked copies per word — dark outer
 * outline, warm-white inner rim, then the amber→red gradient fill — the
 * classic arcade "sticker" treatment (crisp at any size, no clipart).
 * `textLength` pins the wordmark width so centering and the italic skew
 * stay exact regardless of font-load timing. Sized via className.
 */
export default function Logo({ className = "" }: { className?: string }) {
  const rawId = useId();
  const gradId = `subb-logo-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 640 240"
      role="img"
      aria-label="SUBB SURFERS"
      className={`h-auto w-full ${className}`}
      style={{
        filter:
          "drop-shadow(0 5px 0 rgba(12, 8, 4, 0.5)) drop-shadow(0 18px 42px rgba(234, 88, 12, 0.42))",
      }}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="320"
          y1="16"
          x2="320"
          y2="208"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.38" stopColor="#fbbf24" />
          <stop offset="0.72" stopColor="#f97316" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* Italic lean — skew compensated per word so both stay centered. */}
      <g
        transform="translate(11 0) skewX(-6)"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
        textAnchor="middle"
      >
        {/* SUBB */}
        <g fill="none" stroke="#140d08" strokeWidth="18" strokeLinejoin="round">
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

        {/* SURFERS */}
        <g fill="none" stroke="#140d08" strokeWidth="13" strokeLinejoin="round">
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
      </g>

      {/* Amber speed swoosh — symmetric under the wordmark, with highlight */}
      <path
        d="M 168 218 Q 320 242 472 212"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M 174 213.5 Q 320 235.5 466 208.5"
        fill="none"
        stroke="#fff7e6"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
