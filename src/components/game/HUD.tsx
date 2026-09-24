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

/** In-run HUD: score, coins, multiplier, powerup timers, missions, toasts. */
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
        <div className="text-3xl font-black italic tabular-nums text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl">
          {formatScore(stats.score)}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-amber-950 shadow">
            ×{stats.multiplier}
          </span>
          <span className="text-xs font-semibold tabular-nums text-white/70 drop-shadow">
            {formatScore(stats.distance)} m
          </span>
        </div>

        {/* Powerup timers */}
        <div className="mt-2 space-y-1.5">
          <AnimatePresence>
            {powerups.map((p) => {
              const Icon = POWERUP_ICON[p.type];
              const pct = Math.max(0, Math.min(1, p.remaining / p.total));
              return (
                <motion.div
                  key={p.type}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="flex w-36 items-center gap-2"
                >
                  <div className={`rounded-lg p-1 ${POWERUP_COLOR[p.type]} shadow`}>
                    <Icon className="h-3.5 w-3.5 text-white" aria-hidden />
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/50">
                    <div
                      className={`h-full ${POWERUP_COLOR[p.type]} transition-[width] duration-150`}
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
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-sm"
        >
          <Coins className="h-4 w-4 text-amber-400" aria-hidden />
          <span className="text-sm font-black tabular-nums text-white">{formatScore(stats.coins)}</span>
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={pauseRun}
          className="pointer-events-auto rounded-2xl bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
          aria-label="Pause game"
        >
          <Pause className="h-5 w-5" />
        </Button>
      </div>

      {/* Missions tracker */}
      <div className="absolute bottom-3 left-3 hidden max-w-52 space-y-1 sm:block sm:left-5 sm:bottom-5">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
          <Target className="h-3 w-3" aria-hidden /> Missions
        </div>
        {missions.slice(0, 3).map((m, i) => (
          <div key={`${m.kind}-${i}`} className="rounded-lg bg-black/45 px-2.5 py-1.5 backdrop-blur-sm">
            <div className="flex justify-between text-[11px] font-semibold text-white/85">
              <span className="truncate">{m.label}</span>
              <span className="ml-2 tabular-nums text-amber-300">
                {Math.floor(m.progress)}/{m.target}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-amber-400 transition-[width]"
                style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Toasts (mission complete etc.) */}
      <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="rounded-2xl border border-amber-400/40 bg-zinc-900/90 px-4 py-2 text-center shadow-xl backdrop-blur"
            >
              <div className="text-sm font-black text-amber-300">{t.text}</div>
              {t.sub && <div className="text-xs text-white/70">{t.sub}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
