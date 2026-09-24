import { create } from "zustand";
import type {
  CharacterId,
  GamePhase,
  LeaderEntry,
  LiveStats,
  MissionState,
  PowerUpTimerView,
  ProfileResponse,
  RunStats,
  SubmitScoreResponse,
} from "@/game/types";

/**
 * Client game state. The Three.js engine stays framework-agnostic and pushes
 * updates here through GameCallbacks; UI components subscribe reactively.
 * Persistent profile bits (name, wallet, unlocks, prefs) live in localStorage.
 */

interface ToastItem {
  id: number;
  text: string;
  sub?: string;
}

interface GameStore {
  phase: GamePhase;
  stats: LiveStats;
  powerups: PowerUpTimerView[];
  missions: MissionState[];
  coinPopKey: number;
  lastRun: RunStats | null;
  toasts: ToastItem[];

  playerName: string;
  selectedCharacter: CharacterId;
  unlocked: CharacterId[];
  wallet: number;
  muted: boolean;
  /** True once localStorage-persisted profile bits have been applied (client only). */
  hydrated: boolean;

  leaderboard: LeaderEntry[];
  profile: ProfileResponse | null;
  loadingBoard: boolean;
  lastSubmit: SubmitScoreResponse | null;

  setPhase: (p: GamePhase) => void;
  setStats: (s: LiveStats) => void;
  setPowerups: (p: PowerUpTimerView[]) => void;
  setMissions: (m: MissionState[]) => void;
  popCoin: () => void;
  setLastRun: (r: RunStats | null) => void;
  pushToast: (text: string, sub?: string) => void;
  dropToast: (id: number) => void;

  hydrateProfile: () => void;
  setPlayerName: (n: string) => void;
  selectCharacter: (c: CharacterId) => void;
  unlockCharacter: (c: CharacterId, cost: number) => boolean;
  addWallet: (n: number) => void;
  setMuted: (m: boolean) => void;
  setLeaderboard: (entries: LeaderEntry[], total: number) => void;
  setProfile: (p: ProfileResponse | null) => void;
  setLoadingBoard: (b: boolean) => void;
}

const STORAGE_KEY = "subb-surfers-profile";

interface PersistedProfile {
  playerName: string;
  selectedCharacter: CharacterId;
  unlocked: CharacterId[];
  wallet: number;
  muted: boolean;
}

function loadPersisted(): Partial<PersistedProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedProfile) : {};
  } catch {
    return {};
  }
}

export function savePersisted(p: PersistedProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — profile simply won't persist */
  }
}

let toastSeq = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "menu",
  stats: { score: 0, coins: 0, distance: 0, multiplier: 1 },
  powerups: [],
  missions: [],
  coinPopKey: 0,
  lastRun: null,
  toasts: [],

  // Defaults match the server render exactly; persisted values are applied
  // post-mount via hydrateProfile() to avoid SSR hydration mismatches.
  playerName: "",
  selectedCharacter: "max",
  unlocked: ["max"],
  wallet: 0,
  muted: false,
  hydrated: false,

  leaderboard: [],
  profile: null,
  loadingBoard: false,
  lastSubmit: null,

  setPhase: (phase) => set({ phase }),
  setStats: (stats) => set({ stats }),
  setPowerups: (powerups) => set({ powerups }),
  setMissions: (missions) => set({ missions }),
  popCoin: () => set((s) => ({ coinPopKey: s.coinPopKey + 1 })),
  setLastRun: (lastRun) => set({ lastRun }),
  pushToast: (text, sub) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, sub }] }));
    window.setTimeout(() => get().dropToast(id), 2600);
  },
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  hydrateProfile: () => {
    if (get().hydrated) return;
    const p = loadPersisted();
    set({
      playerName: p.playerName ?? "",
      selectedCharacter: p.selectedCharacter ?? "max",
      unlocked: p.unlocked ?? ["max"],
      wallet: p.wallet ?? 0,
      muted: p.muted ?? false,
      hydrated: true,
    });
  },

  setPlayerName: (playerName) => {
    set({ playerName });
    persistNow(get());
  },
  selectCharacter: (selectedCharacter) => {
    set({ selectedCharacter });
    persistNow(get());
  },
  unlockCharacter: (c, cost) => {
    const { wallet, unlocked } = get();
    if (unlocked.includes(c) || wallet < cost) return false;
    const nextUnlocked = [...unlocked, c];
    set({ unlocked: nextUnlocked, wallet: wallet - cost, selectedCharacter: c });
    persistNow(get());
    return true;
  },
  addWallet: (n) => {
    set((s) => ({ wallet: s.wallet + n }));
    persistNow(get());
  },
  setMuted: (muted) => {
    set({ muted });
    persistNow(get());
  },
  setLeaderboard: (leaderboard, _total) => set({ leaderboard }),
  setProfile: (profile) => set({ profile }),
  setLoadingBoard: (loadingBoard) => set({ loadingBoard }),
}));

function persistNow(s: GameStore): void {
  savePersisted({
    playerName: s.playerName,
    selectedCharacter: s.selectedCharacter,
    unlocked: s.unlocked,
    wallet: s.wallet,
    muted: s.muted,
  });
}
