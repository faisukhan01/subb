"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * 3-2-1-GO countdown shown when resuming from pause, so you don't die blind.
 * Numeral slams in (scale 2→1, blur→sharp) with amber glow and pulsing rings;
 * the final GO! renders in the brand gradient.
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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35">
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

        <motion.span
          key={n}
          initial={{ scale: 2, opacity: 0, filter: "blur(8px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className={`relative font-display text-8xl tabular-nums sm:text-9xl ${
            isGo
              ? "bg-gradient-to-b from-amber-200 via-orange-400 to-red-500 bg-clip-text text-transparent drop-shadow-[0_6px_30px_rgba(249,115,22,0.6)]"
              : "text-amber-400 drop-shadow-[0_6px_30px_rgba(251,191,36,0.55)]"
          }`}
        >
          {isGo ? "GO!" : n}
        </motion.span>
      </div>
    </div>
  );
}
