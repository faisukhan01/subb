"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { Coins, Home, RotateCcw, Ruler, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/lib/gameStore";
import { backToMenu, startRun } from "@/lib/gameActions";
import { formatScore } from "@/game/utils";
import LeaderboardPanel from "./LeaderboardPanel";

/** Spring-eased count-up so the final numbers feel earned. */
function useCountUp(target: number, duration = 0.9): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [target, duration]);
  return value;
}

/** Post-run screen: wobbling BUSTED! stamp, count-up score, PB ribbon
 *  with shine sweep, stats, global rank, replay. */
export default function GameOverModal() {
  const phase = useGameStore((s) => s.phase);
  const lastRun = useGameStore((s) => s.lastRun);
  const lastSubmit = useGameStore((s) => s.lastSubmit);
  const playerName = useGameStore((s) => s.playerName);
  const profile = useGameStore((s) => s.profile);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const [showBoard, setShowBoard] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);

  const score = useCountUp(lastRun?.score ?? 0, 1.1);
  const coins = useCountUp(lastRun?.coins ?? 0, 0.9);
  const distance = useCountUp(lastRun?.distance ?? 0, 0.9);

  if (phase !== "over" || !lastRun) return null;

  const isPersonalBest = !profile || lastRun.score >= profile.bestScore;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgba(60,8,8,0.35)_0%,rgba(8,2,2,0.82)_78%)] p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-label="Run results"
      >
        <motion.div
          initial={{ scale: 0.9, y: 26 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="panel-glass relative w-full max-w-md rounded-3xl p-6"
        >
          {/* Stamp — slams in and wobbles to rest (GTA wasted type) */}
          <motion.div
            initial={{ scale: 2.4, opacity: 0, rotate: 10 }}
            animate={{ scale: 1, opacity: 1, rotate: -2 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 11 }}
          >
            <h2 className="hud-gta-white text-center text-6xl leading-none sm:text-7xl">
              Busted
            </h2>
            <div
              aria-hidden
              className="mx-auto mt-2 h-px w-3/4 bg-gradient-to-r from-transparent via-red-500/70 to-transparent"
            />
          </motion.div>

          {/* Final score */}
          <div className="mt-4 text-center">
            <div className="font-gta text-[11px] uppercase tracking-[0.32em] text-white/50">
              {isPersonalBest ? "New personal best!" : "Final score"}
            </div>
            <div className="hud-cash mt-0.5 text-5xl tabular-nums sm:text-6xl">
              {formatScore(score)}
            </div>
            {isPersonalBest && (
              <motion.div
                initial={{ scale: 0, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 320, damping: 13 }}
                className="shine-sweep mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-300 to-orange-500 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-amber-950 shadow-[0_6px_20px_rgba(245,158,11,0.5)]"
              >
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                New personal best
              </motion.div>
            )}
          </div>

          {/* Stat chips */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <StatCard
              icon={Coins}
              label="Coins"
              value={formatScore(coins)}
            />
            <StatCard
              icon={Ruler}
              label="Distance"
              value={`${formatScore(distance)} m`}
            />
          </div>

          {/* Rank + name */}
          <div className="chip-glass mt-4 rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                  Global rank
                </div>
                <div className="font-display text-2xl tabular-nums text-amber-300">
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
                  className="h-10 w-32 rounded-xl border-white/15 bg-black/40 text-right text-sm font-bold text-white"
                  aria-label="Leaderboard name"
                />
              </div>
            </div>
            {lastSubmit?.personalBest && (
              <p className="mt-2 text-[11px] font-bold text-amber-300/90">
                Beat your previous best of {formatScore(lastSubmit.best)} — nice run!
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={startRun}
              className="btn-arcade btn-arcade-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-lg focus-visible:outline-none"
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
              Run again
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowBoard((v) => !v)}
                aria-expanded={showBoard}
                className="btn-arcade btn-arcade-dark flex h-11 items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none"
              >
                <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
                {showBoard ? "Hide" : "Ranks"}
              </button>
              <button
                type="button"
                onClick={backToMenu}
                className="btn-arcade btn-arcade-dark flex h-11 items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none"
              >
                <Home className="h-4 w-4" aria-hidden />
                Menu
              </button>
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
                <div className="chip-glass mt-4 max-h-64 overflow-y-auto rounded-2xl p-2">
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
    <div className="chip-glass flex items-center gap-2.5 rounded-2xl px-3.5 py-3">
      <div className="rounded-xl bg-amber-500/15 p-2 ring-1 ring-amber-400/25">
        <Icon className="h-4 w-4 text-amber-400" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
          {label}
        </div>
        <div className="text-lg font-black tabular-nums text-white">{value}</div>
      </div>
    </div>
  );
}
