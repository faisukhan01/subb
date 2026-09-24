"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Home, RotateCcw, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Game paused"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="w-80 rounded-3xl border border-white/10 bg-zinc-950/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md"
      >
        <Logo className="mx-auto w-32" />
        <h2 className="mt-3 text-center font-display text-3xl uppercase tracking-wide text-white">
          Paused
        </h2>

        <div className="mt-5 space-y-2.5">
          <Button
            onClick={() => setCounting(true)}
            className="h-12 w-full rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 font-display text-base uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(234,88,12,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-amber-300/50 transition-[filter] hover:brightness-110 focus-visible:outline-none"
          >
            <Play className="h-5 w-5 fill-white" aria-hidden />
            Resume
          </Button>
          <Button
            onClick={() => {
              setCounting(false);
              startRun();
            }}
            variant="secondary"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white shadow-lg backdrop-blur-md hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Restart run
          </Button>
          <Button
            onClick={backToMenu}
            variant="secondary"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white shadow-lg backdrop-blur-md hover:bg-white/10"
          >
            <Home className="h-4 w-4" aria-hidden />
            Main menu
          </Button>
          <Button
            onClick={() => setMuted(!muted)}
            variant="ghost"
            className="h-10 w-full rounded-2xl text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Sound off" : "Sound on"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
