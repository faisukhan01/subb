"use client";

import { useEffect, useState } from "react";
import { Crown, Medal } from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { formatScore } from "@/game/utils";
import type { LeaderEntry } from "@/game/types";

/** Top-20 global leaderboard fetched from /api/leaderboard. */
export default function LeaderboardPanel() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (leaderboard.length === 0) {
      void fetch("/api/leaderboard?limit=20")
        .then(async (res) => {
          if (!res.ok) throw new Error("bad status");
          const data = (await res.json()) as { entries: LeaderEntry[] };
          useGameStore.getState().setLeaderboard(data.entries, data.entries.length);
        })
        .catch(() => setError(true));
    }
  }, [leaderboard.length]);

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-white/60">
        Couldn&apos;t load the leaderboard. Check your connection and try again.
      </p>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-2 py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-1.5" aria-label="Leaderboard standings">
      {leaderboard.map((e) => {
        const isTop = e.rank <= 3;
        return (
          <li
            key={`${e.rank}-${e.name}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              isTop ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "bg-white/5"
            }`}
          >
            <span className="w-8 text-center">
              {e.rank === 1 && <Crown className="mx-auto h-5 w-5 text-amber-400" aria-label="1st" />}
              {e.rank === 2 && <Medal className="mx-auto h-5 w-5 text-zinc-300" aria-label="2nd" />}
              {e.rank === 3 && <Medal className="mx-auto h-5 w-5 text-orange-400" aria-label="3rd" />}
              {e.rank > 3 && <span className="text-sm font-bold text-white/50">{e.rank}</span>}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{e.name}</span>
            <span className="text-right">
              <span className="block text-sm font-black tabular-nums text-amber-300">
                {formatScore(e.score)}
              </span>
              <span className="block text-[10px] tabular-nums text-white/40">
                {formatScore(e.distance)} m · {formatScore(e.coins)} coins
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
