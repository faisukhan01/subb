"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins, Pause, Rocket, Zap, Magnet, Footprints, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/gameStore";
import { pauseRun } from "@/lib/gameActions";
import { formatScore } from "@/game/utils";
import type { PowerUpType } from "@/game/types";

const POWERUP_ICON: Record<PowerUpType, typeof Magnet> = {
  magnet: Magnet,
  jetpack: Rocket,
  multiplier: Zap,
  sneakers: Footprints,
  hoverboard: Sparkles,
};

const POWERUP_COLOR: Record<PowerUpType, string> = {
  magnet: "bg-red-500",
  jetpack: "bg-sky-500",
  multiplier: "bg-green-500",
  sneakers: "bg-amber-500",
  hoverboard: "bg-violet-500",
};

/**
 * In-run HUD: display-font score, multiplier, powerup timer pills, coin
 * counter with pop, missions tracker and toasts. Pointer-events pass
 * through everywhere except the pause button.
 */
export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const stats = useGameStore((s) => s.stats);
  const powerups = useGameStore((s) => s.powerups);
  const missions = useGameStore((s) => s.missions);
  const coinPopKey = useGameStore((s) => s.coinPopKey);
  const toasts = useGameStore((s) => s.toasts);

  if (phase === "menu") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Score block */}
      <div className="absolute left-3 top-3 sm:left-5 sm:top-5">
        <div className="font-display text-3xl tabular-nums text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)] sm:text-4xl">
          {formatScore(stats.score)}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-b from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-black text-amber-950 shadow ring-1 ring-amber-300/50">
            ×{stats.multiplier}
          </span>
          <span className="text-xs font-semibold tabular-nums text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {formatScore(stats.distance)} m
          </span>
        </div>

        {/* Powerup timers — slim glass pills */}
        <div className="mt-2.5 space-y-1.5">
          <AnimatePresence>
            {powerups.map((p) => {
              const Icon = POWERUP_ICON[p.type];
              const pct = Math.max(0, Math.min(1, p.remaining / p.total));
              return (
                <motion.div
                  key={p.type}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="flex w-40 items-center gap-2 rounded-full border border-white/10 bg-zinc-950/60 p-1 pr-2.5 shadow-lg backdrop-blur-md"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${POWERUP_COLOR[p.type]} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" aria-hidden />
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/50">
                    <div
                      className={`h-full rounded-full ${POWERUP_COLOR[p.type]} transition-[width] duration-150`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Coins + pause */}
      <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
        <motion.div
          key={coinPopKey}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/60 px-3 py-2 shadow-lg backdrop-blur-md"
        >
          <Coins
            className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
            aria-hidden
          />
          <span className="text-sm font-black tabular-nums text-white">
            {formatScore(stats.coins)}
          </span>
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={pauseRun}
          className="pointer-events-auto h-11 w-11 rounded-2xl border border-white/10 bg-zinc-950/60 text-white shadow-lg backdrop-blur-md hover:bg-zinc-900/80"
          aria-label="Pause game"
        >
          <Pause className="h-5 w-5" />
        </Button>
      </div>

      {/* Missions tracker */}
      <div className="absolute bottom-3 left-3 hidden w-56 sm:bottom-5 sm:left-5 sm:block">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300/90">
            <Target className="h-3 w-3" aria-hidden /> Missions
          </div>
          <div className="mt-2 space-y-1.5">
            {missions.slice(0, 3).map((m, i) => (
              <motion.div
                key={`${m.kind}-${i}`}
                animate={
                  m.done
                    ? { boxShadow: ["0 0 0 0 rgba(251,191,36,0)", "0 0 14px 0 rgba(251,191,36,0.45)", "0 0 0 0 rgba(251,191,36,0)"] }
                    : {}
                }
                transition={{ duration: 1, repeat: m.done ? 2 : 0 }}
                className={`rounded-xl px-2.5 py-1.5 ring-1 transition-colors ${
                  m.done ? "bg-amber-500/10 ring-amber-400/40" : "bg-white/5 ring-white/10"
                }`}
              >
                <div className="flex justify-between text-[11px] font-semibold text-white/85">
                  <span className="truncate">{m.label}</span>
                  <span className="ml-2 tabular-nums text-amber-300">
                    {Math.floor(m.progress)}/{m.target}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width]"
                    style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Toasts (mission complete etc.) */}
      <div className="absolute left-1/2 top-16 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="rounded-2xl border border-amber-400/30 bg-zinc-950/85 px-4 py-2 text-center shadow-[0_12px_35px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/20 backdrop-blur-md"
            >
              <div className="font-display text-sm text-amber-300">{t.text}</div>
              {t.sub && <div className="text-xs font-medium text-white/70">{t.sub}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
