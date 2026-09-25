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
 * Title screen: smoked-glass chips over the live 3D stage, arcade logo,
 * golden pulsing PLAY, character roster with real 3D portrait snapshots,
 * leaderboard/help modals. Panels stay translucent so the world shows
 * through; entrance animations are staggered fade/slide springs.
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
      {/* Vignette — darkened edges, warm glow behind the logo, clear stage */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/85"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent"
        aria-hidden
      />
      <div
        className="glow-pulse pointer-events-none absolute left-1/2 top-24 h-64 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center px-4 pb-5 pt-4 sm:max-w-lg sm:px-6">
        {/* Top bar: profile + wallet + sound */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={riseSpring}
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="chip-glass flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3">
            <User className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Runner name"
              maxLength={16}
              className="h-6 w-full min-w-0 border-none bg-transparent p-0 text-sm font-bold text-white shadow-none placeholder:text-white/40 focus-visible:ring-0"
              aria-label="Player name"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="chip-glass flex h-11 items-center gap-2 rounded-2xl px-3.5">
              <span className="coin-dot" aria-hidden />
              <span className="text-base font-black tabular-nums leading-none text-white">
                {formatScore(wallet)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className="chip-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>

        {/* Logo — spring drop-in, then a gentle idle float */}
        <motion.div
          initial={{ y: -36, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 130, damping: 15, delay: 0.08 }}
          className="mt-4 w-full max-w-sm"
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
            className="chip-glass mt-1 flex items-center gap-1.5 rounded-full border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200 shadow-[0_0_22px_rgba(245,158,11,0.25)]"
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Personal best · {formatScore(profile.bestScore)}
          </motion.div>
        )}

        {/* PLAY — golden arcade button over a pulsing ember aura */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 240, damping: 16 }}
          className="relative mt-6"
        >
          <div
            aria-hidden
            className="glow-pulse absolute -inset-2 rounded-[2rem] bg-orange-500/60 blur-2xl"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={startRun}
            className="btn-arcade btn-arcade-primary relative flex h-16 items-center gap-3 rounded-2xl px-12 text-2xl focus-visible:outline-none sm:h-[4.5rem] sm:px-14 sm:text-3xl"
            aria-label="Play game"
          >
            <Play className="h-7 w-7 fill-current" aria-hidden />
            Play
          </motion.button>
        </motion.div>

        {/* Character roster */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...riseSpring, delay: 0.3 }}
          className="mt-6 flex w-full items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-white/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        >
          <span
            className="h-px flex-1 bg-gradient-to-r from-transparent to-white/25"
            aria-hidden
          />
          Choose your runner
          <span
            className="h-px flex-1 bg-gradient-to-l from-transparent to-white/25"
            aria-hidden
          />
        </motion.h2>
        <div className="mt-4 grid w-full grid-cols-3 gap-2.5 sm:gap-4">
          {CHARACTERS.map((c, i) => {
            const isUnlocked = unlocked.includes(c.id);
            const isSelected = selectedCharacter === c.id;
            const src = portraits[c.id];
            return (
              <motion.button
                key={c.id}
                type="button"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, scale: isSelected ? 1.04 : 1 }}
                transition={
                  isSelected
                    ? { ...riseSpring }
                    : { ...riseSpring, delay: 0.34 + i * 0.08 }
                }
                whileHover={{ y: -6, rotate: i % 2 === 0 ? -1.2 : 1.2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => chooseCharacter(c.id, c.unlockCost)}
                className={`chip-glass relative overflow-hidden rounded-2xl text-left transition-shadow focus-visible:outline-none ${
                  isSelected
                    ? "border-amber-300/50 shadow-[0_0_30px_rgba(251,191,36,0.45)] ring-2 ring-amber-300"
                    : "hover:border-white/25 hover:shadow-xl"
                }`}
                aria-pressed={isSelected}
                aria-label={`${c.displayName}: ${isUnlocked ? (isSelected ? "selected" : "select") : `unlock for ${c.unlockCost} coins`}`}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-zinc-600/30 to-zinc-900/60">
                  {src ? (
                    // Plain <img>: source is a cached 3D-portrait data-URL.
                    <img
                      src={src}
                      alt={c.displayName}
                      draggable={false}
                      className={`h-full w-full object-cover ${!isUnlocked ? "opacity-60 grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-4xl text-white/15">
                        {c.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/55 to-black/5">
                      <span className="chip-glass flex h-8 w-8 items-center justify-center rounded-full">
                        <Lock className="h-4 w-4 text-amber-300" aria-hidden />
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/70 px-2 py-0.5 text-[11px] font-black tabular-nums text-amber-300">
                        <span className="coin-dot h-3 w-3" aria-hidden />
                        {formatScore(c.unlockCost)}
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute right-1.5 top-1.5 rounded-md bg-gradient-to-b from-yellow-300 to-orange-500 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_2px_8px_rgba(234,88,12,0.5)]">
                      Selected
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-2.5">
                  <div className="font-display text-sm leading-tight text-white">
                    {c.displayName}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-white/65">
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
          className="mt-6 flex w-full items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => setShowBoard(true)}
            className="btn-arcade btn-arcade-dark flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none sm:flex-none sm:px-6"
          >
            <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="btn-arcade btn-arcade-dark flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm focus-visible:outline-none sm:flex-none sm:px-6"
          >
            <HelpCircle className="h-4 w-4 text-amber-400" aria-hidden />
            How to play
          </button>
        </motion.div>

        {/* Controls hint — pinned to the bottom of the viewport */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.74 }}
          className="mt-auto w-full pt-5 text-center text-[11px] font-semibold text-white/40"
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
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="panel-glass max-h-[82vh] w-full max-w-md overflow-hidden rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hazard-tape strip — subway barrier texture, purely decorative */}
        <div className="stripes-warm h-1.5 w-full border-b border-white/10" aria-hidden />
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-4 w-1 rounded-full bg-gradient-to-b from-yellow-300 to-orange-500"
              aria-hidden
            />
            <h3 className="font-display text-base uppercase tracking-wide text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[calc(82vh-70px)] overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}
