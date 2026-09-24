/**
 * Client/server shared anti-cheat heuristic.
 *
 * These constants are duplicated verbatim in:
 *   - services/anticheat-csharp/Validation/ScoreValidator.cs (.NET service)
 *   - services/leaderboard-go/internal/api/handlers.go (Go service)
 * Keep all three in sync — see the monorepo README.
 */

export const MAX_SCORE_PER_METER = 12;
export const MAX_COINS_PER_METER = 6;
export const COIN_SCORE_WEIGHT = 20;
export const SCORE_BUFFER = 500;
export const MIN_DISTANCE = 10;

export interface ScoreSubmission {
  name: string;
  score: number;
  distance: number;
  coins: number;
}

export interface ValidationResult {
  valid: boolean;
  reason: string | null;
}

export function validateScore(sub: ScoreSubmission): ValidationResult {
  const { score, distance, coins } = sub;

  if (score > distance * MAX_SCORE_PER_METER + coins * COIN_SCORE_WEIGHT + SCORE_BUFFER) {
    return { valid: false, reason: "score_too_high" };
  }
  if (coins > distance * MAX_COINS_PER_METER + 20) {
    return { valid: false, reason: "coins_too_high" };
  }
  if (score >= 100 && distance < MIN_DISTANCE) {
    return { valid: false, reason: "distance_too_low" };
  }
  return { valid: true, reason: null };
}

/** Server-side normalization for incoming submissions. */
export function sanitizeSubmission(body: unknown): ScoreSubmission | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 16) : "";
  const score = Number(b.score);
  const distance = Number(b.distance);
  const coins = Number(b.coins);
  if (!name || !Number.isFinite(score) || !Number.isFinite(distance) || !Number.isFinite(coins)) {
    return null;
  }
  if (score < 0 || score > 5_000_000 || distance < 0 || distance > 500_000 || coins < 0 || coins > 100_000) {
    return null;
  }
  return { name, score: Math.floor(score), distance: Math.floor(distance), coins: Math.floor(coins) };
}
