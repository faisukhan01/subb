"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * 3-2-1-GO countdown shown when resuming from pause, so you don't die blind.
 * Numerals spring-pop (scale ~0.2→1 with overshoot) inside expanding pulse
 * rings; the final GO! bursts in yellow with an extra flash ring.
 */
export default function ResumeCountdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n <= 0) {
      // Hold GO! on screen just long enough to read before the run resumes.
      const t = window.setTimeout(onDone, 650);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setN(n - 1), 700);
    return () => window.clearTimeout(t);
  }, [n, onDone]);

  const isGo = n <= 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      {/* Radial hotspot so the numeral reads over any scene */}
      <div
        className="pointer-events-none absolute h-96 w-96 rounded-full bg-black/55 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center justify-center">
        {/* Expanding pulse rings */}
        <motion.div
          key={`ring-${n}`}
          className="absolute h-40 w-40 rounded-full border-2 border-amber-400/70 sm:h-52 sm:w-52"
          initial={{ scale: 0.55, opacity: 0.7 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          aria-hidden
        />
        <motion.div
          key={`ring-soft-${n}`}
          className="absolute h-40 w-40 rounded-full border border-amber-300/30 sm:h-52 sm:w-52"
          initial={{ scale: 0.4, opacity: 0.5 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
          aria-hidden
        />
        {/* Extra flash ring on the GO! burst */}
        {isGo && (
          <motion.div
            key="ring-go"
            className="absolute h-44 w-44 rounded-full border-4 border-yellow-300/80 sm:h-56 sm:w-56"
            initial={{ scale: 0.5, opacity: 0.9 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            aria-hidden
          />
        )}

        <motion.span
          key={n}
          initial={{ scale: 0.2, opacity: 0, rotate: isGo ? -8 : -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: isGo ? 12 : 16 }}
          className={`relative font-display text-8xl tabular-nums drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] sm:text-9xl ${
            isGo
              ? "bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent"
              : "text-amber-400"
          }`}
        >
          {isGo ? "GO!" : n}
        </motion.span>
      </div>
    </div>
  );
}
