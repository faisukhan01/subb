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
      <p className="chip-glass rounded-2xl px-4 py-6 text-center text-sm font-semibold text-white/60">
        Couldn&apos;t load the leaderboard. Check your connection and try again.
      </p>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-2 py-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="chip-glass h-12 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-2" aria-label="Leaderboard standings">
      {leaderboard.map((e) => {
        const isTop = e.rank <= 3;
        return (
          <li
            key={`${e.rank}-${e.name}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              isTop
                ? "border border-amber-400/30 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "chip-glass"
            }`}
          >
            <span className="flex w-8 shrink-0 justify-center">
              {e.rank === 1 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-amber-400/40">
                  <Crown
                    className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    aria-label="1st"
                  />
                </span>
              )}
              {e.rank === 2 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/20">
                  <Medal className="h-5 w-5 text-zinc-300" aria-label="2nd" />
                </span>
              )}
              {e.rank === 3 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-400/30">
                  <Medal className="h-5 w-5 text-orange-400" aria-label="3rd" />
                </span>
              )}
              {e.rank > 3 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-black tabular-nums text-white/40 ring-1 ring-white/10">
                  {e.rank}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-black text-white">
              {e.name}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-sm tabular-nums text-amber-300">
                {formatScore(e.score)}
              </span>
              <span className="block text-[10px] font-semibold tabular-nums text-white/40">
                {formatScore(e.distance)} m · {formatScore(e.coins)} coins
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
