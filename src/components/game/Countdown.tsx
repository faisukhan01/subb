"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/** 3-2-1-GO countdown shown when resuming from pause, so you don't die blind. */
export default function ResumeCountdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n <= 0) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setN(n - 1), 700);
    return () => window.clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
      <motion.span
        key={n}
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-8xl font-black italic text-amber-400 drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
      >
        {n > 0 ? n : "GO!"}
      </motion.span>
    </div>
  );
}
