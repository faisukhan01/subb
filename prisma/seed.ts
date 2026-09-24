/**
 * Seed the leaderboard with believable rival scores so the board feels alive
 * on first load. Run with: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BOTS: Array<{ name: string; score: number; coins: number; distance: number; runs: number }> = [
  { name: "DashKing", score: 95200, coins: 1204, distance: 8310, runs: 214 },
  { name: "NeonRiley", score: 87450, coins: 1096, distance: 7680, runs: 198 },
  { name: "TunnelViper", score: 79110, coins: 988, distance: 6902, runs: 176 },
  { name: "SkyeRunner", score: 71540, coins: 917, distance: 6245, runs: 165 },
  { name: "MagnetMia", score: 64320, coins: 1123, distance: 5610, runs: 154 },
  { name: "RoofWalker", score: 57880, coins: 731, distance: 5055, runs: 143 },
  { name: "JetJake", score: 51090, coins: 842, distance: 4468, runs: 131 },
  { name: "CoinCatcher", score: 44260, coins: 1287, distance: 3870, runs: 120 },
  { name: "ZigZagZed", score: 37940, coins: 645, distance: 3314, runs: 109 },
  { name: "HoverHana", score: 31220, coins: 590, distance: 2729, runs: 96 },
  { name: "RollinRon", score: 24870, coins: 522, distance: 2174, runs: 84 },
  { name: "NewNina", score: 15650, coins: 401, distance: 1368, runs: 61 },
  { name: "LilLane", score: 8930, coins: 286, distance: 780, runs: 37 },
  { name: "FirstTimmy", score: 4120, coins: 154, distance: 360, runs: 12 },
];

async function main() {
  for (const bot of BOTS) {
    await db.player.upsert({
      where: { name: bot.name.toLowerCase() },
      create: {
        name: bot.name.toLowerCase(),
        bestScore: bot.score,
        bestCoins: bot.coins,
        bestDistance: bot.distance,
        totalCoins: bot.coins * bot.runs,
        totalRuns: bot.runs,
        totalDistance: bot.distance * bot.runs,
      },
      update: {
        bestScore: bot.score,
        bestCoins: bot.coins,
        bestDistance: bot.distance,
      },
    });

    const player = await db.player.findUnique({ where: { name: bot.name.toLowerCase() } });
    if (player && (await db.scoreRun.count({ where: { playerId: player.id } })) === 0) {
      await db.scoreRun.create({
        data: {
          playerId: player.id,
          score: bot.score,
          coins: bot.coins,
          distance: bot.distance,
          missions: 3,
          character: "max",
        },
      });
    }
  }
  console.log(`Seeded ${BOTS.length} rival players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
