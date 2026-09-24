"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coins,
  HelpCircle,
  Lock,
  Play,
  Trophy,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHARACTERS } from "@/game/Config";
import { getCharacterSnapshot } from "@/game/CharacterSnapshot";
import type { CharacterId } from "@/game/types";
import { backToMenu, previewCharacter, startRun } from "@/lib/gameActions";
import { useGameStore } from "@/lib/gameStore";
import { formatScore } from "@/game/utils";
import LeaderboardPanel from "./LeaderboardPanel";
import HowToPlay from "./HowToPlay";
import Logo from "./Logo";

/** Shared spring for staggered section entrances. */
const riseSpring = { type: "spring", stiffness: 210, damping: 22 } as const;

/**
 * Title screen: glass chips, game logo, PLAY, character roster rendered with
 * real 3D portrait snapshots, leaderboard/help modals. The live 3D scene
 * (selected runner idling on the tracks) stays visible behind a light
 * vignette so the UI pops without hiding the game.
 */
export default function MainMenu() {
  const phase = useGameStore((s) => s.phase);
  const playerName = useGameStore((s) => s.playerName);
  const selectedCharacter = useGameStore((s) => s.selectedCharacter);
  const unlocked = useGameStore((s) => s.unlocked);
  const wallet = useGameStore((s) => s.wallet);
  const muted = useGameStore((s) => s.muted);
  const profile = useGameStore((s) => s.profile);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const selectCharacter = useGameStore((s) => s.selectCharacter);
  const unlockCharacter = useGameStore((s) => s.unlockCharacter);
  const setMuted = useGameStore((s) => s.setMuted);
  const pushToast = useGameStore((s) => s.pushToast);

  const [nameDraft, setNameDraft] = useState(playerName);
  const [showBoard, setShowBoard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [portraits, setPortraits] = useState<Partial<Record<CharacterId, string>>>({});

  // Preview the selected runner + bake the real 3D portraits (WebGL —
  // client-side only, results cached by the snapshot studio). Portraits are
  // rendered in a rAF callback so the WebGL work never blocks first paint.
  // Re-runs when hydration applies the persisted character selection.
  useEffect(() => {
    previewCharacter(selectedCharacter);
    const raf = requestAnimationFrame(() => {
      const next: Partial<Record<CharacterId, string>> = {};
      for (const c of CHARACTERS) {
        next[c.id] = getCharacterSnapshot(c.id);
      }
      setPortraits(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedCharacter]);

  if (phase !== "menu") return null;

  const chooseCharacter = (id: CharacterId, cost: number) => {
    const entry = CHARACTERS.find((c) => c.id === id);
    if (!entry) return;
    if (unlocked.includes(id)) {
      selectCharacter(id);
      previewCharacter(id);
    } else if (unlockCharacter(id, cost)) {
      previewCharacter(id);
      pushToast(`${entry.displayName} unlocked!`, entry.perk);
    } else {
      pushToast(`Need ${formatScore(cost - wallet)} more coins`, "Collect coins in runs to unlock");
    }
  };

  const saveName = () => {
    const clean = nameDraft.trim().slice(0, 16);
    setPlayerName(clean);
    setNameDraft(clean);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 overflow-y-auto"
    >
      {/* Vignette — darkened edges, clear stage for the runner */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center px-4 pb-6 pt-4">
        {/* Top bar: profile + wallet + sound */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={riseSpring}
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 shadow-lg backdrop-blur-md">
            <User className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Runner name"
              maxLength={16}
              className="h-6 w-28 border-none bg-transparent p-0 text-sm font-semibold text-white shadow-none placeholder:text-white/40 focus-visible:ring-0"
              aria-label="Player name"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 shadow-lg backdrop-blur-md">
              <Coins className="h-4 w-4 text-amber-400" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-white">
                {formatScore(wallet)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMuted(!muted)}
              className="h-11 w-11 rounded-2xl border border-white/10 bg-zinc-950/70 text-white shadow-lg backdrop-blur-md hover:bg-zinc-900/80"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </motion.div>

        {/* Logo — spring drop-in, then a gentle idle float */}
        <motion.div
          initial={{ y: -36, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 130, damping: 15, delay: 0.08 }}
          className="mt-5 w-full max-w-sm"
        >
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Logo className="w-full" />
          </motion.div>
        </motion.div>

        {/* Personal best pill */}
        {profile && profile.bestScore > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...riseSpring, delay: 0.18 }}
            className="mt-1 flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.25)] backdrop-blur-md"
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Personal best · {formatScore(profile.bestScore)}
          </motion.div>
        )}

        {/* PLAY */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 240, damping: 16 }}
          className="mt-6"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRun}
            className="flex h-16 items-center gap-3 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 px-12 font-display text-2xl uppercase tracking-wide text-white shadow-[0_14px_40px_rgba(234,88,12,0.55),0_4px_12px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(120,53,15,0.35)] ring-1 ring-amber-300/50 transition-[filter] hover:brightness-110 focus-visible:outline-none"
            aria-label="Play game"
          >
            <Play className="h-6 w-6 fill-white" aria-hidden />
            Play
          </motion.button>
        </motion.div>

        {/* Character roster */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...riseSpring, delay: 0.3 }}
          className="mt-7 text-[11px] font-bold uppercase tracking-[0.35em] text-white/60"
        >
          Choose your runner
        </motion.h2>
        <div className="mt-3 grid w-full grid-cols-3 gap-2.5 sm:gap-3">
          {CHARACTERS.map((c, i) => {
            const isUnlocked = unlocked.includes(c.id);
            const isSelected = selectedCharacter === c.id;
            const src = portraits[c.id];
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...riseSpring, delay: 0.34 + i * 0.08 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => chooseCharacter(c.id, c.unlockCost)}
                className={`relative overflow-hidden rounded-2xl border bg-zinc-950/70 text-left shadow-lg backdrop-blur-md transition-shadow focus-visible:outline-none ${
                  isSelected
                    ? "border-white/10 ring-2 ring-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.45)]"
                    : "border-white/10 hover:border-white/25 hover:shadow-xl"
                }`}
                aria-pressed={isSelected}
                aria-label={`${c.displayName}: ${isUnlocked ? (isSelected ? "selected" : "select") : `unlock for ${c.unlockCost} coins`}`}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-zinc-700/40 to-zinc-900/70">
                  {src ? (
                    // Plain <img>: source is a cached 3D-portrait data-URL.
                    <img
                      src={src}
                      alt={c.displayName}
                      draggable={false}
                      className={`h-full w-full object-cover ${!isUnlocked ? "opacity-40 grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-4xl text-white/15">
                        {c.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-t from-black/50 to-black/5">
                      <Lock className="h-5 w-5 text-amber-300 drop-shadow" aria-hidden />
                      <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/70 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-300">
                        <Coins className="h-3 w-3" aria-hidden />
                        {formatScore(c.unlockCost)}
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950 shadow">
                      Selected
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-2.5">
                  <div className="font-display text-sm text-white">{c.displayName}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-white/60">
                    {isUnlocked ? c.tagline : c.perk}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Secondary actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...riseSpring, delay: 0.62 }}
          className="mt-6 flex w-full items-center justify-center gap-2.5"
        >
          <Button
            onClick={() => setShowBoard(true)}
            className="h-11 flex-1 rounded-2xl border border-white/10 bg-zinc-950/70 text-sm font-semibold text-white/90 shadow-lg backdrop-blur-md hover:bg-zinc-900/80 hover:text-white sm:flex-none sm:px-6"
          >
            <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
            Leaderboard
          </Button>
          <Button
            onClick={() => setShowHelp(true)}
            className="h-11 flex-1 rounded-2xl border border-white/10 bg-zinc-950/70 text-sm font-semibold text-white/90 shadow-lg backdrop-blur-md hover:bg-zinc-900/80 hover:text-white sm:flex-none sm:px-6"
          >
            <HelpCircle className="h-4 w-4 text-amber-400" aria-hidden />
            How to play
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.74 }}
          className="mt-4 text-center text-[11px] font-medium text-white/40"
        >
          Arrows / WASD / Swipe to move · Space to jump · P or Esc to pause
        </motion.p>
      </div>

      <AnimatePresence>
        {showBoard && (
          <ModalShell onClose={() => setShowBoard(false)} title="Global Leaderboard">
            <LeaderboardPanel />
          </ModalShell>
        )}
        {showHelp && (
          <ModalShell onClose={() => setShowHelp(false)} title="How to play">
            <HowToPlay />
          </ModalShell>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Shared glass modal shell (leaderboard / how-to-play). */
export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="max-h-[82vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3">
          <h3 className="font-display text-base uppercase tracking-wide text-white">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-11 w-11 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(82vh-70px)] overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}
