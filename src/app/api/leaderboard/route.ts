import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeSubmission, validateScore } from "@/lib/anticheat";
import type { LeaderEntry } from "@/game/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard?limit=20
 * Top players by best score (anti-cheat validated at write time).
 */
export async function GET(req: NextRequest) {
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 20));

  try {
    const players = await db.player.findMany({
      orderBy: { bestScore: "desc" },
      take: limit,
      where: { bestScore: { gt: 0 } },
    });

    const entries: LeaderEntry[] = players.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.bestScore,
      coins: p.bestCoins,
      distance: p.bestDistance,
    }));

    const total = await db.player.count({ where: { bestScore: { gt: 0 } } });
    return NextResponse.json({ entries, total });
  } catch (err) {
    console.error("[leaderboard GET]", err);
    return NextResponse.json({ error: "leaderboard_unavailable" }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard
 * Body: { name, score, coins, distance, missions?, character? }
 * Validates the submission against the anti-cheat heuristic, then upserts
 * the player's best run and appends to their run history.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sub = sanitizeSubmission(body);
  if (!sub) {
    return NextResponse.json({ error: "invalid_submission" }, { status: 400 });
  }

  const verdict = validateScore(sub);
  if (!verdict.valid) {
    return NextResponse.json({ error: "rejected", reason: verdict.reason }, { status: 422 });
  }

  const raw = body as Record<string, unknown>;
  const missions = Math.max(0, Math.min(50, Number(raw.missions) || 0));
  const character = typeof raw.character === "string" ? raw.character.slice(0, 16) : "max";
  const nameKey = sub.name.toLowerCase();

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.player.findUnique({ where: { name: nameKey } });

      const player = existing
        ? await tx.player.update({
            where: { id: existing.id },
            data: {
              totalCoins: { increment: sub.coins },
              totalRuns: { increment: 1 },
              totalDistance: { increment: sub.distance },
              bestScore: Math.max(existing.bestScore, sub.score),
              bestCoins: Math.max(existing.bestCoins, sub.coins),
              bestDistance: Math.max(existing.bestDistance, sub.distance),
            },
          })
        : await tx.player.create({
            data: {
              name: nameKey,
              bestScore: sub.score,
              bestCoins: sub.coins,
              bestDistance: sub.distance,
              totalCoins: sub.coins,
              totalRuns: 1,
              totalDistance: sub.distance,
            },
          });

      await tx.scoreRun.create({
        data: {
          playerId: player.id,
          score: sub.score,
          coins: sub.coins,
          distance: sub.distance,
          missions,
          character,
        },
      });

      const rank = await tx.player.count({
        where: { bestScore: { gt: player.bestScore } },
      });

      const personalBest = existing ? sub.score >= existing.bestScore && sub.score > 0 : sub.score > 0;

      return { rank: rank + 1, best: player.bestScore, personalBest };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[leaderboard POST]", err);
    return NextResponse.json({ error: "submission_failed" }, { status: 500 });
  }
}
