"use client";

import type { Game } from "@/game/Game";
import type { CharacterId } from "@/game/types";
import { useGameStore } from "./gameStore";

/**
 * Bridge between React UI and the imperative Three.js engine.
 * The engine instance is registered once by GameCanvas; UI actions call it
 * through these helpers so components never touch the engine directly.
 */

let engine: Game | null = null;

export function registerEngine(instance: Game | null): void {
  engine = instance;
}

export function startRun(): void {
  const s = useGameStore.getState();
  s.setStats({ score: 0, coins: 0, distance: 0, multiplier: 1 });
  s.setPowerups([]);
  s.setLastRun(null);
  s.setPhase("running");
  engine?.start(s.selectedCharacter);
}

export function pauseRun(): void {
  const s = useGameStore.getState();
  if (s.phase === "running") s.setPhase("paused");
}

export function notifyEnginePause(): void {
  engine?.pause();
}

export function notifyEngineResume(): void {
  engine?.resume();
}

export function resumeRun(): void {
  const s = useGameStore.getState();
  if (s.phase === "paused") s.setPhase("running");
}

export function backToMenu(): void {
  const s = useGameStore.getState();
  s.setPhase("menu");
  engine?.toMenu();
}

export function previewCharacter(id: CharacterId): void {
  engine?.previewCharacter(id);
}

export function applyMuted(muted: boolean): void {
  engine?.setMuted(muted);
}
