"use client";

import { AnimatePresence } from "framer-motion";
import GameCanvas from "@/components/game/GameCanvas";
import MainMenu from "@/components/game/MainMenu";
import HUD from "@/components/game/HUD";
import PauseMenu from "@/components/game/PauseMenu";
import GameOverModal from "@/components/game/GameOverModal";

/**
 * SUBB SURFERS — 3D endless runner (single-page game shell).
 * The Three.js engine owns the canvas; React owns the meta-game UI.
 */
export default function Page() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      <GameCanvas />
      <AnimatePresence>{<MainMenu key="menu" />}</AnimatePresence>
      <HUD />
      <PauseMenu />
      <AnimatePresence>{<GameOverModal key="over" />}</AnimatePresence>
    </main>
  );
}
