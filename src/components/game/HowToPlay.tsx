"use client";

import {
  MoveHorizontal,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Magnet,
  Rocket,
  Zap,
  Footprints,
  Sparkles,
  Gamepad2,
  TrendingUp,
} from "lucide-react";
import type { PowerUpType } from "@/game/types";

const CONTROLS = [
  { icon: MoveHorizontal, keys: "← →  /  A D  /  Swipe", text: "Switch lanes" },
  { icon: ArrowUp, keys: "↑  /  W  /  Space  /  Swipe up  /  Tap", text: "Jump" },
  { icon: ArrowDown, keys: "↓  /  S  /  Swipe down", text: "Roll under barriers" },
  { icon: RotateCw, keys: "P  /  Esc", text: "Pause" },
];

const POWERUPS: Array<{ icon: typeof Magnet; type: PowerUpType; name: string; text: string }> = [
  { icon: Magnet, type: "magnet", name: "Coin Magnet", text: "Vacuums nearby coins to you" },
  { icon: Rocket, type: "jetpack", name: "Jetpack", text: "Fly above the tracks on a sky coin trail" },
  { icon: Zap, type: "multiplier", name: "2× Multiplier", text: "Doubles your score multiplier" },
  { icon: Footprints, type: "sneakers", name: "Super Sneakers", text: "Higher, floatier jumps" },
  { icon: Sparkles, type: "hoverboard", name: "Hoverboard", text: "Absorbs one crash — ride the wave" },
];

/** Tile colors mirror the in-run HUD chips so help ↔ HUD read as one system. */
const POWERUP_COLOR: Record<PowerUpType, string> = {
  magnet: "bg-red-500",
  jetpack: "bg-orange-500",
  multiplier: "bg-yellow-400",
  sneakers: "bg-green-500",
  hoverboard: "bg-cyan-400",
};

/** Render "A / B / C" key hints as compact keycap chips. */
function KeyHints({ keys }: { keys: string }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {keys.split("/").map((k) => (
        <kbd
          key={k}
          className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/75 ring-1 ring-white/15"
        >
          {k.trim()}
        </kbd>
      ))}
    </span>
  );
}

/** Rules & controls reference shown from the main menu. */
export default function HowToPlay() {
  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-2.5 flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-amber-400">
          <Gamepad2 className="h-4 w-4" aria-hidden /> Controls
        </h4>
        <ul className="space-y-2">
          {CONTROLS.map((c) => (
            <li
              key={c.text}
              className="chip-glass flex items-center gap-3 rounded-2xl px-3 py-2.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/25">
                <c.icon className="h-4 w-4 text-amber-300" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{c.text}</div>
                <KeyHints keys={c.keys} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2.5 flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-amber-400">
          <Zap className="h-4 w-4" aria-hidden /> Power-ups
        </h4>
        <ul className="space-y-2">
          {POWERUPS.map((p) => (
            <li
              key={p.name}
              className="chip-glass flex items-center gap-3 rounded-2xl px-3 py-2.5"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${POWERUP_COLOR[p.type]} shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
              >
                <p.icon className="h-4 w-4 text-white" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="text-[11px] font-semibold text-white/50">{p.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2.5 flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-amber-400">
          <TrendingUp className="h-4 w-4" aria-hidden /> Scoring
        </h4>
        <p className="chip-glass rounded-2xl px-3.5 py-3 text-sm leading-relaxed font-semibold text-white/70">
          Score = distance × multiplier. Complete missions to raise your multiplier (up to
          ×5), and grab 2× power-ups to double it further. You can run on train roofs for
          risky coin lines — but oncoming trains never stop.
        </p>
      </section>
    </div>
  );
}
