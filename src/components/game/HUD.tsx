"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Rocket, Zap, Magnet, Footprints, Sparkles, Target } from "lucide-react";
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

/** Warm arcade palette shared with HowToPlay — no indigo/purple. */
const POWERUP_COLOR: Record<PowerUpType, string> = {
  magnet: "bg-red-500",
  jetpack: "bg-orange-500",
  multiplier: "bg-yellow-400",
  sneakers: "bg-green-500",
  hoverboard: "bg-cyan-400",
};

/**
 * In-run HUD: glass score pill with popping multiplier, coin pill with gold
 * coin dot, stacked powerup timer chips, missions ticker and toasts.
 * Pointer events pass through everywhere except the pause button.
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
      {/* Legibility scrim along the top edge only */}
      <div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent"
        aria-hidden
      />

      {/* Score block */}
      <div className="absolute left-3 top-3 sm:left-5 sm:top-5">
        <div className="chip-glass rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5">
          <div className="text-[9px] font-black uppercase tracking-[0.32em] text-amber-300/90">
            Score
          </div>
          <div className="flex items-end gap-2">
            <div className="font-display text-3xl leading-none tabular-nums text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl">
              {formatScore(stats.score)}
            </div>
            {/* Multiplier badge — spring-pops whenever its value changes */}
            <motion.span
              key={`mult-${stats.multiplier}`}
              initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 14 }}
              className="mb-0.5 inline-flex items-center rounded-md bg-gradient-to-b from-yellow-300 to-orange-500 px-1.5 py-0.5 font-display text-xs leading-none text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]"
            >
              ×{stats.multiplier}
            </motion.span>
          </div>
          <div className="mt-1 text-xs font-black tabular-nums text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {formatScore(stats.distance)} m
          </div>
        </div>

        {/* Powerup timers — vertical stack of glass chips */}
        <div className="mt-2 space-y-1.5">
          <AnimatePresence>
            {powerups.map((p) => {
              const Icon = POWERUP_ICON[p.type];
              const pct = Math.max(0, Math.min(1, p.remaining / p.total));
              return (
                <motion.div
                  key={p.type}
                  initial={{ opacity: 0, x: -16, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -16, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  className="chip-glass flex w-44 items-center gap-2 rounded-xl p-1.5 pr-2"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${POWERUP_COLOR[p.type]} shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
                  >
                    <Icon className="h-4 w-4 text-white" aria-hidden />
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/55">
                    <div
                      className={`h-full rounded-full ${POWERUP_COLOR[p.type]} transition-[width] duration-150`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10px] font-black tabular-nums text-white/85">
                    {Math.ceil(p.remaining)}
                  </span>
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
          initial={{ scale: 1.28 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="chip-glass flex h-11 items-center gap-2 rounded-2xl px-3.5"
        >
          <span className="coin-dot" aria-hidden />
          <span className="text-base font-black tabular-nums leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {formatScore(stats.coins)}
          </span>
        </motion.div>
        <button
          type="button"
          onClick={pauseRun}
          className="chip-glass pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
          aria-label="Pause game"
        >
          <Pause className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Missions ticker */}
      <div className="absolute bottom-4 left-3 hidden w-64 sm:left-5 sm:block">
        <div className="chip-glass rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
            <Target className="h-3.5 w-3.5" aria-hidden /> Missions
          </div>
          <div className="mt-2 space-y-1.5">
            {missions.slice(0, 3).map((m, i) => (
              <motion.div
                key={`${m.kind}-${i}`}
                animate={
                  m.done
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(251,191,36,0)",
                          "0 0 14px 0 rgba(251,191,36,0.45)",
                          "0 0 0 0 rgba(251,191,36,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 1, repeat: m.done ? 2 : 0 }}
                className={`rounded-xl px-2.5 py-1.5 ring-1 transition-colors ${
                  m.done ? "bg-amber-500/10 ring-amber-400/40" : "bg-white/5 ring-white/10"
                }`}
              >
                <div className="flex justify-between text-[11px] font-bold text-white/85">
                  <span className="truncate">{m.label}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-amber-300">
                    {Math.floor(m.progress)}/{m.target}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-500 transition-[width]"
                    style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Toasts (mission complete etc.) */}
      <div className="absolute left-1/2 top-16 z-20 flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -18, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="chip-glass flex items-center gap-2.5 rounded-2xl px-4 py-2"
            >
              <span className="coin-dot h-2 w-2" aria-hidden />
              <div className="text-center">
                <div className="font-display text-sm leading-tight text-amber-200">{t.text}</div>
                {t.sub && (
                  <div className="text-[11px] font-semibold text-white/70">{t.sub}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
