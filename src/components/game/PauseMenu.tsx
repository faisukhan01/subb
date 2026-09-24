"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, RotateCcw, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/gameStore";
import { backToMenu, resumeRun, startRun } from "@/lib/gameActions";
import ResumeCountdown from "./Countdown";

/** Pause overlay: resume (with countdown), restart, quit, sound toggle. */
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
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[3px]"
      role="dialog"
      aria-label="Game paused"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="w-72 rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl"
      >
        <h2 className="text-center text-2xl font-black uppercase italic tracking-wide text-white">
          Paused
        </h2>
        <div className="mt-5 space-y-2.5">
          <Button
            onClick={() => setCounting(true)}
            className="h-12 w-full rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 text-base font-black uppercase italic text-white hover:from-amber-300 hover:to-orange-500"
          >
            <Play className="mr-2 h-5 w-5 fill-white" aria-hidden />
            Resume
          </Button>
          <Button
            onClick={() => {
              setCounting(false);
              startRun();
            }}
            variant="secondary"
            className="h-11 w-full rounded-2xl bg-white/10 text-white hover:bg-white/20"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Restart run
          </Button>
          <Button
            onClick={backToMenu}
            variant="secondary"
            className="h-11 w-full rounded-2xl bg-white/10 text-white hover:bg-white/20"
          >
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Main menu
          </Button>
          <Button
            onClick={() => setMuted(!muted)}
            variant="ghost"
            className="h-9 w-full rounded-2xl text-white/70 hover:bg-white/10 hover:text-white"
          >
            {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
            {muted ? "Sound off" : "Sound on"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
