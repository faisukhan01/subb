"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Home, RotateCcw, Play, Volume2, VolumeX } from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { backToMenu, resumeRun, startRun } from "@/lib/gameActions";
import ResumeCountdown from "./Countdown";
import Logo from "./Logo";

/** Pause overlay: small logo, resume (with countdown), restart, quit, sound. */
export default function PauseMenu() {
  const phase = useGameStore((s) => s.phase);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const [counting, setCounting] = useState(false);

  if (phase !== "paused") return null;

  if (counting) {
    return <ResumeCountdown onDone={() => resumeRun()} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Game paused"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="panel-glass w-80 overflow-hidden rounded-3xl p-6"
      >
        {/* Hazard-tape strip — subway barrier texture, purely decorative */}
        <div className="stripes-warm -mx-6 -mt-6 mb-4 h-1.5 border-b border-white/10" aria-hidden />
        <Logo className="mx-auto w-32" />
        <h2 className="mt-2 text-center font-display text-3xl uppercase tracking-[0.12em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.6)]">
          Paused
        </h2>
        <p className="mt-0.5 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300/80">
          Catch your breath
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => setCounting(true)}
            className="btn-arcade btn-arcade-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base focus-visible:outline-none"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden />
            Resume
          </button>
          <button
            type="button"
            onClick={() => {
              setCounting(false);
              startRun();
            }}
            className="btn-arcade btn-arcade-dark flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Restart run
          </button>
          <button
            type="button"
            onClick={backToMenu}
            className="btn-arcade btn-arcade-dark flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none"
          >
            <Home className="h-4 w-4" aria-hidden />
            Main menu
          </button>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none"
          >
            {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
