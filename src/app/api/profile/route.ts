import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProfileResponse } from "@/game/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile?name=racer
 * Player summary (bests + lifetime totals) and their last 5 runs.
 */
export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase().slice(0, 16);
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  try {
    const player = await db.player.findUnique({
      where: { name },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { score: true, coins: true, distance: true, createdAt: true },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body: ProfileResponse = {
      name: player.name,
      bestScore: player.bestScore,
      bestCoins: player.bestCoins,
      bestDistance: player.bestDistance,
      totalCoins: player.totalCoins,
      totalRuns: player.totalRuns,
      totalDistance: player.totalDistance,
      recentRuns: player.runs.map((r) => ({
        score: r.score,
        coins: r.coins,
        distance: r.distance,
        createdAt: r.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json({ error: "profile_unavailable" }, { status: 500 });
  }
}
