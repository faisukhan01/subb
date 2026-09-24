/** Shared type contracts between the Three.js engine and the React UI layer. */

export type PowerUpType = "magnet" | "jetpack" | "multiplier" | "sneakers" | "hoverboard";

export type CharacterId = "max" | "zoe" | "rex";

export type GamePhase = "menu" | "running" | "paused" | "over";

export interface MissionState {
  kind: "coins" | "jumps" | "rolls" | "powerups";
  target: number;
  progress: number;
  done: boolean;
  label: string;
}

export interface LiveStats {
  score: number;
  coins: number;
  distance: number;
  multiplier: number;
}

export interface PowerUpTimerView {
  type: PowerUpType;
  remaining: number; // seconds left
  total: number; // full duration
}

export interface RunStats {
  score: number;
  coins: number;
  distance: number;
  missionsCompleted: number;
  character: CharacterId;
}

export interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
  coins: number;
  distance: number;
}

export interface LeaderboardResponse {
  entries: LeaderEntry[];
  total: number;
}

export interface ProfileResponse {
  name: string;
  bestScore: number;
  bestCoins: number;
  bestDistance: number;
  totalCoins: number;
  totalRuns: number;
  totalDistance: number;
  recentRuns: Array<{
    score: number;
    coins: number;
    distance: number;
    createdAt: string;
  }>;
}

export interface SubmitScoreResponse {
  rank: number;
  best: number;
  personalBest: boolean;
}

/** Engine → React callback bundle. The Game never imports the store directly. */
export interface GameCallbacks {
  onStats(stats: LiveStats): void;
  onPowerups(timers: PowerUpTimerView[]): void;
  onMissions(missions: MissionState[]): void;
  onMissionComplete(label: string, newMultiplier: number): void;
  onCoinPop(): void;
  onGameOver(stats: RunStats): void;
  onPauseRequest(): void;
}
