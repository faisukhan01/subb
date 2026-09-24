"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins, Home, RotateCcw, Ruler, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/lib/gameStore";
import { backToMenu, startRun } from "@/lib/gameActions";
import { formatScore } from "@/game/utils";
import LeaderboardPanel from "./LeaderboardPanel";
import { useState } from "react";

/** Post-run screen: stats, rank, name entry, leaderboard, replay. */
export default function GameOverModal() {
  const phase = useGameStore((s) => s.phase);
  const lastRun = useGameStore((s) => s.lastRun);
  const lastSubmit = useGameStore((s) => s.lastSubmit);
  const playerName = useGameStore((s) => s.playerName);
  const profile = useGameStore((s) => s.profile);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const [showBoard, setShowBoard] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);

  if (phase !== "over" || !lastRun) return null;

  const isPersonalBest = !profile || lastRun.score >= profile.bestScore;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-black/40 via-black/60 to-black/80 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-label="Run results"
      >
        <motion.div
          initial={{ scale: 0.9, y: 26 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 14 }}
          >
            <h2 className="text-center text-3xl font-black uppercase italic tracking-wide text-white">
              Busted!
            </h2>
          </motion.div>

          {/* Final score */}
          <div className="mt-4 text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">
              {isPersonalBest ? "New personal best!" : "Final score"}
            </div>
            <div
              className={`text-5xl font-black italic tabular-nums drop-shadow ${
                isPersonalBest ? "text-amber-400" : "text-white"
              }`}
            >
              {formatScore(lastRun.score)}
            </div>
            {isPersonalBest && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 12 }}
                className="mt-1 inline-block rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-amber-950"
              >
                <Trophy className="mr-1 inline h-3 w-3" aria-hidden />
                PB
              </motion.div>
            )}
          </div>

          {/* Stat row */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <StatCard icon={Coins} label="Coins" value={formatScore(lastRun.coins)} />
            <StatCard icon={Ruler} label="Distance" value={`${formatScore(lastRun.distance)} m`} />
          </div>

          {/* Rank + name */}
          <div className="mt-4 rounded-2xl bg-white/5 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                  Global rank
                </div>
                <div className="text-xl font-black italic tabular-nums text-amber-300">
                  {lastSubmit ? `#${lastSubmit.rank}` : "…"}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => setPlayerName(nameDraft.trim().slice(0, 16))}
                  onKeyDown={(e) => e.key === "Enter" && setPlayerName(nameDraft.trim().slice(0, 16))}
                  placeholder="Your name"
                  maxLength={16}
                  className="h-9 w-32 rounded-xl border-white/15 bg-black/40 text-right text-sm font-bold text-white"
                  aria-label="Leaderboard name"
                />
              </div>
            </div>
            {lastSubmit?.personalBest && (
              <p className="mt-2 text-[11px] font-semibold text-amber-300/90">
                Beat your previous best of {formatScore(lastSubmit.best)} — nice run!
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-2.5">
            <Button
              onClick={startRun}
              className="h-13 w-full rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 py-3.5 text-lg font-black uppercase italic text-white shadow-[0_8px_25px_rgba(234,88,12,0.45)] hover:from-amber-300 hover:to-orange-500"
            >
              <RotateCcw className="mr-2 h-5 w-5" aria-hidden />
              Run again
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowBoard((v) => !v)}
                className="h-11 rounded-2xl bg-white/10 text-white hover:bg-white/20"
              >
                <Trophy className="mr-2 h-4 w-4 text-amber-400" aria-hidden />
                {showBoard ? "Hide" : "Ranks"}
              </Button>
              <Button
                variant="secondary"
                onClick={backToMenu}
                className="h-11 rounded-2xl bg-white/10 text-white hover:bg-white/20"
              >
                <Home className="mr-2 h-4 w-4" aria-hidden />
                Menu
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showBoard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl bg-black/30 p-2">
                  <LeaderboardPanel />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-3.5 py-3">
      <div className="rounded-xl bg-amber-500/15 p-2">
        <Icon className="h-4 w-4 text-amber-400" aria-hidden />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-lg font-black tabular-nums text-white">{value}</div>
      </div>
    </div>
  );
}
