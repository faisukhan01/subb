/**
 * SUBB SURFERS — global gameplay tuning constants.
 *
 * Every tunable lives here so the physics/mirroring between the web game,
 * the C++ runner-core library and the Unity/Unreal ports stays consistent:
 *   gravity 38 m/s², jump velocity 13.5 m/s, lanes 2.2 m apart.
 * Distances in meters, times in seconds, angles in radians.
 */

export const LANE_X = [-2.2, 0, 2.2] as const;
export const LANE_WIDTH = 2.2;

/** Forward run speed (m/s) and how fast it ramps up. */
export const SPEED_START = 11.5;
export const SPEED_MAX = 30;
export const SPEED_RAMP = 0.11;

/** Jump arc physics — mirrors native/runner-core/jump_solver.h. */
export const GRAVITY = 38;
export const JUMP_VELOCITY = 13.5;
export const SNEAKER_JUMP_MULT = 1.22;

/** Player capsule (axis-aligned box) used by the collision solver. */
export const PLAYER_HEIGHT = 1.7;
export const ROLL_HEIGHT = 0.62;
export const PLAYER_HALF_WIDTH = 0.36;
export const PLAYER_HALF_DEPTH = 0.32;
export const ROLL_DURATION = 0.55;

/** Exponential smoothing rate for lane switching (higher = snappier). */
export const LANE_SWITCH_SMOOTH = 13;

/** World streaming. */
export const CHUNK_LENGTH = 26;
export const CHUNKS_AHEAD = 7;
export const DESPAWN_BEHIND = 34;

/** Trains. */
export const TRAIN_HEIGHT = 3.05;
export const TRAIN_WIDTH = 2.15;
export const TRAIN_MIN_LENGTH = 14;
export const TRAIN_MAX_LENGTH = 22;
export const ONCOMING_TRAIN_SPEED = 15;
export const TRAIN_ROOF_MARGIN = 0.35; // how deep below roof a side-hit counts

/** Coins & pickups. */
export const MAGNET_RADIUS = 6.2;
export const MAGNET_PULL = 30;
export const COIN_COLLECT_RADIUS = 0.85;
export const POWERUP_COLLECT_RADIUS = 1.0;

/** Jetpack flight. */
export const JETPACK_HEIGHT = 7.2;
export const JETPACK_RISE = 4.2;

/** Score & missions. */
export const MULTIPLIER_MAX = 5;
export const MISSIONS_PER_SET = 3;

/** Power-up durations (seconds). */
export type PowerUpDurationMap = Record<
  "magnet" | "jetpack" | "multiplier" | "sneakers" | "hoverboard",
  number
>;
export const POWERUP_DURATIONS: PowerUpDurationMap = {
  magnet: 10,
  jetpack: 6,
  multiplier: 12,
  sneakers: 12,
  hoverboard: 15,
};

/** Inspector chase behaviour. */
export const GUARD_FOLLOW_DIST = 8.5;
export const GUARD_INTRO_DIST = 4.2;
export const GUARD_INTRO_TIME = 4;

/** Camera. */
export const CAMERA_OFFSET = { x: 0, y: 4.7, z: 8.4 };
export const CAMERA_LOOK = { x: 0, y: 1.5, z: -7 };
export const FOV_BASE = 62;
export const FOV_SPEED_BOOST = 9;

/** Scene palette — warm golden-hour subway. */
export const COLORS = {
  skyTop: 0x86c1e8,
  skyHorizon: 0xffe0bd,
  fogNear: 45,
  fogFar: 150,
  gravel: 0xc4ad8d,
  gravelDark: 0xb09a7c,
  rail: 0x8b8f96,
  sleeper: 0x8a6849,
  wall: 0xd9cbb8,
  wallTop: 0xc7b49e,
  lampPost: 0x54595f,
  buildings: [0xf2b880, 0xe8a09a, 0xa8c698, 0xd9b38c, 0xc9a7b8, 0xead9a8],
  trains: [0xd9480f, 0xe8b30e, 0x2f9e44, 0x8d99ae, 0xb4654a, 0xd6c05a],
  coin: 0xffc93c,
  coinEmissive: 0xd98a06,
  barrier: 0xe8590c,
  barrierStripe: 0xfff4e6,
  blockade: 0xc2410c,
  hoverboard: 0xff922b,
  jetpackFlame: 0xffa94d,
} as const;

/** Character palette (procedural low-poly rigs). */
export interface CharacterPalette {
  id: "max" | "zoe" | "rex";
  displayName: string;
  tagline: string;
  unlockCost: number; // 0 = starter
  perk: string;
  skin: number;
  hair: number;
  cap?: number; // omit = no cap
  capBrimBack?: boolean;
  torso: number;
  sleeves?: number;
  pants: number;
  shoes: number;
  backpack?: number;
  accent?: number; // headphone band / chain / streak
}

export const CHARACTERS: CharacterPalette[] = [
  {
    id: "max",
    displayName: "Max",
    tagline: "The original tag artist",
    unlockCost: 0,
    perk: "+5% coin value",
    skin: 0xf1c19d,
    hair: 0x3b2a1e,
    cap: 0xe03131,
    capBrimBack: true,
    torso: 0xf8f5f0,
    sleeves: 0xe03131,
    pants: 0x4a4e69,
    shoes: 0xf1f3f5,
    backpack: 0xf76707,
  },
  {
    id: "zoe",
    displayName: "Zoe",
    tagline: "Beats. Speed. Paint.",
    unlockCost: 500,
    perk: "+10% magnet duration",
    skin: 0xf7d3b3,
    hair: 0x1c1917,
    torso: 0x12b886,
    sleeves: 0x0ca678,
    pants: 0x343a40,
    shoes: 0xf1f3f5,
    accent: 0xffd43b,
  },
  {
    id: "rex",
    displayName: "Rex",
    tagline: "Wall of muscle, heart of gold",
    unlockCost: 1500,
    perk: "+8% jump power",
    skin: 0xb98663,
    hair: 0x111111,
    cap: 0x212529,
    capBrimBack: true,
    torso: 0xe8590c,
    sleeves: 0xf8f5f0,
    pants: 0x495057,
    shoes: 0xf8f5f0,
    accent: 0xffd43b,
  },
];

export const ZOE_MAGNET_BONUS = 1.1;
export const REX_JUMP_BONUS = 1.08;
export const MAX_COIN_BONUS = 1.05;
