"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/game/Game";
import { registerEngine } from "@/lib/gameActions";
import { useGameStore } from "@/lib/gameStore";
import type {
  LeaderboardResponse,
  ProfileResponse,
  SubmitScoreResponse,
} from "@/game/types";

/**
 * Mounts the Three.js engine once and wires engine callbacks into the store.
 * All gameplay rendering happens here; overlays are separate components.
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const store = useGameStore.getState;
    const abort = new AbortController();

    // Apply persisted profile bits post-mount (SSR-safe hydration).
    store().hydrateProfile();

    const refreshLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard?limit=20", { signal: abort.signal });
        if (!res.ok) return;
        const data = (await res.json()) as LeaderboardResponse;
        store().setLeaderboard(data.entries, data.total);
      } catch {
        /* offline — leaderboard simply stays stale */
      }
    };

    const refreshProfile = async (name: string) => {
      if (!name) return;
      try {
        const res = await fetch(`/api/profile?name=${encodeURIComponent(name)}`, {
          signal: abort.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as ProfileResponse;
        store().setProfile(data);
      } catch {
        /* ignore */
      }
    };

    const engine = new Game(container, {
      onStats: (s) => store().setStats(s),
      onPowerups: (p) => store().setPowerups(p),
      onMissions: (m) => store().setMissions(m),
      onCoinPop: () => store().popCoin(),
      onMissionComplete: (label, mult) =>
        store().pushToast(`Mission complete: ${label}`, `Score multiplier is now x${mult}`),
      onPauseRequest: () => {
        if (store().phase === "running") store().setPhase("paused");
      },
      onGameOver: (stats) => {
        const s = store();
        s.setLastRun(stats);
        s.addWallet(stats.coins);
        s.setPhase("over");

        const name = s.playerName || "Runner";
        void fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            score: stats.score,
            coins: stats.coins,
            distance: stats.distance,
            missions: stats.missionsCompleted,
            character: stats.character,
          }),
          signal: abort.signal,
        })
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json()) as SubmitScoreResponse;
            useGameStore.setState({ lastSubmit: data });
            void refreshLeaderboard();
            void refreshProfile(name);
          })
          .catch(() => undefined);
      },
    });

    registerEngine(engine);
    engine.setMuted(store().muted);
    engine.previewCharacter(store().selectedCharacter);
    void refreshLeaderboard();
    void refreshProfile(store().playerName);

    return () => {
      abort.abort();
      registerEngine(null);
      engine.dispose();
    };
    // Engine is created exactly once for the lifetime of the page.
     
  }, []);

  // Engine pause/resume follow the React phase machine.
  const prevPhase = useRef(phase);
  useEffect(() => {
    const enginePaused = prevPhase.current === "running" && phase === "paused";
    const engineResumed = prevPhase.current === "paused" && phase === "running";
    if (enginePaused || engineResumed) {
      import("@/lib/gameActions").then((m) => {
        if (enginePaused) m.notifyEnginePause();
        else m.notifyEngineResume();
      });
    }
    prevPhase.current = phase;
  }, [phase]);

  return (
    <div
      ref={containerRef}
      id="game-canvas"
      className="absolute inset-0 select-none"
      aria-label="SUBB SURFERS 3D game viewport"
    />
  );
}
