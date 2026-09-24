"use client";

import { MoveHorizontal, RotateCw, ArrowUp, ArrowDown, Magnet, Rocket, Zap, Footprints, Sparkles } from "lucide-react";

const CONTROLS = [
  { icon: MoveHorizontal, keys: "← →  /  A D  /  Swipe", text: "Switch lanes" },
  { icon: ArrowUp, keys: "↑  /  W  /  Space  /  Swipe up  /  Tap", text: "Jump" },
  { icon: ArrowDown, keys: "↓  /  S  /  Swipe down", text: "Roll under barriers" },
  { icon: RotateCw, keys: "P  /  Esc", text: "Pause" },
];

const POWERUPS = [
  { icon: Magnet, name: "Coin Magnet", text: "Vacuums nearby coins to you" },
  { icon: Rocket, name: "Jetpack", text: "Fly above the tracks on a sky coin trail" },
  { icon: Zap, name: "2× Multiplier", text: "Doubles your score multiplier" },
  { icon: Footprints, name: "Super Sneakers", text: "Higher, floatier jumps" },
  { icon: Sparkles, name: "Hoverboard", text: "Absorbs one crash — ride the wave" },
];

/** Rules & controls reference shown from the main menu. */
export default function HowToPlay() {
  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">Controls</h4>
        <ul className="space-y-2">
          {CONTROLS.map((c) => (
            <li key={c.text} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <c.icon className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{c.text}</div>
                <div className="truncate text-[11px] text-white/50">{c.keys}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">Power-ups</h4>
        <ul className="space-y-2">
          {POWERUPS.map((p) => (
            <li key={p.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <p.icon className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="text-[11px] text-white/50">{p.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">Scoring</h4>
        <p className="text-sm leading-relaxed text-white/70">
          Score = distance × multiplier. Complete missions to raise your multiplier (up to
          ×5), and grab 2× power-ups to double it further. You can run on train roofs for
          risky coin lines — but oncoming trains never stop.
        </p>
      </section>
    </div>
  );
}
