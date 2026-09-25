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

/** Scene palette — golden-hour downtown rail corridor. */
export const COLORS = {
  skyTop: 0x7d9cc8,
  skyMid: 0xe8b078,
  skyHorizon: 0xffdca6,
  fogNear: 48,
  fogFar: 175,
  ballast: 0x8a7f74,
  concrete: 0xa8a29a,
  platformEdge: 0xe6b23c,
  rail: 0xc9cdd4,
  railWeb: 0x4c4a47,
  sleeper: 0x5a4634,
  catenary: 0x3a3d42,
  canopySteel: 0x2f5d50,
  canopyRoof: 0xd8d0bc,
  brick: 0x9c5a4a,
  brickGrey: 0x8a8d92,
  asphalt: 0x3a3833,
  lampPost: 0x3d4249,
  buildings: [0xb0705a, 0xc9a78a, 0x7d99a8, 0xa88f78, 0x8f8d96, 0xc4b49a],
  trains: [
    { body: 0xd9480f, stripe: 0xfff1e0 }, // signal orange
    { body: 0x0c8599, stripe: 0xfff4d6 }, // teal express
    { body: 0xf2b705, stripe: 0x2b2722 }, // yellow line
    { body: 0xb9bdc2, stripe: 0xe8590c }, // silver with orange
  ],
  coin: 0xffc93c,
  coinEmissive: 0xd98a06,
  barrier: 0xf76707,
  barrierStripe: 0xfff4e6,
  blockade: 0xc2410c,
  hoverboard: 0xff922b,
  jetpackFlame: 0xffa94d,
} as const;

/** Character palette (realistic streetwear rigs). */
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
  soleColor?: number; // sneaker midsole accent
  backpack?: number;
  accent?: number; // chain / headphone cups
  style?: "tee" | "bomber" | "tank" | "uniform";
  sunglasses?: boolean;
  beard?: boolean;
  wristbands?: boolean;
}

export const CHARACTERS: CharacterPalette[] = [
  {
    id: "max",
    displayName: "Marcus",
    tagline: "Reyes Park's finest tag artist",
    unlockCost: 0,
    perk: "+5% coin value",
    skin: 0x8a5a3b,
    hair: 0x17130f,
    cap: 0x2f5233,
    capBrimBack: true,
    torso: 0xe8e6e0, // washed white tee
    sleeves: 0xe8e6e0,
    pants: 0x3d4553, // baggy washed denim
    shoes: 0xe9e6df,
    soleColor: 0x2a2622,
    backpack: 0xb3541e,
    style: "tee",
  },
  {
    id: "zoe",
    displayName: "Nina",
    tagline: "Paints the whole line overnight",
    unlockCost: 500,
    perk: "+10% magnet duration",
    skin: 0xeab994,
    hair: 0x241b14,
    torso: 0x565b48, // olive MA-1 bomber
    sleeves: 0x4c5140,
    pants: 0x23262b, // black leggings
    shoes: 0xe9e6df,
    soleColor: 0x8c2f26,
    accent: 0xd4a53a,
    style: "bomber",
  },
  {
    id: "rex",
    displayName: "Bruno",
    tagline: "Ex-boxer, current legend",
    unlockCost: 1500,
    perk: "+8% jump power",
    skin: 0xc08a58,
    hair: 0x141210,
    torso: 0x878c93, // heather grey tank
    pants: 0x33383f, // charcoal joggers
    shoes: 0xe9e6df,
    soleColor: 0x8c2f26,
    accent: 0xd4a53a, // gold chain
    style: "tank",
    beard: true,
    wristbands: true,
  },
];

export const ZOE_MAGNET_BONUS = 1.1;
export const REX_JUMP_BONUS = 1.08;
export const MAX_COIN_BONUS = 1.05;
