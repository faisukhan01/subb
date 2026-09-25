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
 * In-run HUD — GTA V style:
 *  · top-right: cash-green condensed score with popping multiplier,
 *    gold coin counter beneath it (GTA's money corner)
 *  · bottom-left: circular radar with a slow sweep + runner arrow
 *  · top-left: compact mission tracker
 *  · bottom-right: stacked power-up timer bars
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
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent"
        aria-hidden
      />
      {/* Subtle corner vignette for the cinematic frame */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(0,0,0,0.32)_100%)]"
        aria-hidden
      />

      {/* ── Money corner (top-right) ─────────────────────────────── */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5 sm:right-5 sm:top-4">
        <div className="flex items-start gap-2">
          <motion.span
            key={`mult-${stats.multiplier}`}
            initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 14 }}
            className="mt-1 inline-flex items-center rounded-md bg-gradient-to-b from-yellow-300 to-orange-500 px-1.5 py-0.5 font-gta text-xs leading-none text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]"
          >
            ×{stats.multiplier}
          </motion.span>
          <div className="text-right">
            <div className="hud-cash text-4xl leading-none sm:text-5xl">
              {formatScore(stats.score)}
            </div>
            <div className="mt-0.5 font-gta text-[11px] tracking-[0.3em] text-white/60">
              {formatScore(stats.distance)} M
            </div>
          </div>
        </div>
        <motion.div
          key={coinPopKey}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 backdrop-blur-sm"
        >
          <span className="coin-dot" aria-hidden />
          <span className="font-gta text-lg leading-none text-[#f6c453] drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]">
            {formatScore(stats.coins)}
          </span>
        </motion.div>
        {/* Pause — the only interactive HUD element */}
        <button
          type="button"
          onClick={pauseRun}
          className="pointer-events-auto mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
          aria-label="Pause game"
        >
          <Pause className="h-4.5 w-4.5" aria-hidden />
        </button>
      </div>

      {/* ── Radar (bottom-left, GTA minimap) ─────────────────────── */}
      <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5">
        <div
          className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/25 bg-[#101410]/70 shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:h-24 sm:w-24"
          role="img"
          aria-label="Radar"
        >
          {/* grid cross */}
          <div className="absolute inset-0" aria-hidden>
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/12" />
            <div className="absolute top-1/2 left-0 h-px w-full bg-white/12" />
            <div className="absolute inset-[30%] rounded-full border border-white/10" />
          </div>
          {/* sweep */}
          <div
            className="radar-sweep absolute inset-0"
            aria-hidden
            style={{
              background:
                "conic-gradient(from 0deg, rgba(140,220,160,0.35) 0deg, transparent 62deg)",
            }}
          />
          {/* lane ticks ahead */}
          <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-2" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
          </div>
          {/* runner arrow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <div
              className="h-0 w-0 border-x-[6px] border-b-[11px] border-x-transparent border-b-[#eef3ee]"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
            />
          </div>
          {/* N marker */}
          <span className="font-gta absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] tracking-widest text-white/70">
            N
          </span>
        </div>
      </div>

      {/* ── Mission tracker (top-left, compact) ──────────────────── */}
      <div className="absolute left-3 top-3 hidden w-60 sm:left-5 sm:top-4 sm:block">
        <div className="rounded-xl bg-black/40 p-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 font-gta text-[11px] tracking-[0.24em] text-[#f6c453]">
            <Target className="h-3.5 w-3.5" aria-hidden /> Objectives
          </div>
          <div className="mt-1.5 space-y-1">
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
                className={`rounded-lg px-2 py-1 transition-colors ${
                  m.done ? "bg-amber-500/15 ring-1 ring-amber-400/40" : "bg-white/5"
                }`}
              >
                <div className="flex justify-between text-[11px] font-semibold text-white/85">
                  <span className="truncate">{m.label}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-amber-300">
                    {Math.floor(m.progress)}/{m.target}
                  </span>
                </div>
                <div className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-white/15">
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

      {/* ── Power-up stack (bottom-right) ─────────────────────────── */}
      <div className="absolute bottom-4 right-3 flex flex-col items-end gap-1.5 sm:bottom-5 sm:right-5">
        <AnimatePresence>
          {powerups.map((p) => {
            const Icon = POWERUP_ICON[p.type];
            const pct = Math.max(0, Math.min(1, p.remaining / p.total));
            return (
              <motion.div
                key={p.type}
                initial={{ opacity: 0, x: 16, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className="chip-glass flex w-40 items-center gap-2 rounded-xl p-1.5 pr-2"
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

      {/* ── Toasts (mission passed etc.) — GTA banner center ──────── */}
      <div className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -18, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="flex flex-col items-center"
            >
              <div className="hud-gta-white text-center text-2xl leading-tight sm:text-3xl">
                {t.text}
              </div>
              {t.sub && (
                <div className="mt-0.5 rounded-full bg-black/55 px-3 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm">
                  {t.sub}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
