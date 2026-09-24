"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
import type { CharacterId, LeaderEntry } from "@/game/types";
import { backToMenu, previewCharacter, startRun } from "@/lib/gameActions";
import { useGameStore } from "@/lib/gameStore";
import { formatScore } from "@/game/utils";
import LeaderboardPanel from "./LeaderboardPanel";
import HowToPlay from "./HowToPlay";

/**
 * Title screen: logo, play, character roster, leaderboard, profile name.
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

  // Keep menu hot-reloads in sync with persisted selections.
  useEffect(() => {
    previewCharacter(selectedCharacter);
     
  }, []);

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
      className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-black/55 via-black/25 to-black/70 px-4 py-6"
    >
      {/* Top bar: profile + wallet + sound */}
      <div className="flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-sm">
          <User className="h-4 w-4 text-amber-400" aria-hidden />
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            placeholder="Runner name"
            maxLength={16}
            className="h-7 w-32 border-none bg-transparent p-0 text-sm font-semibold text-white placeholder:text-white/40 focus-visible:ring-0"
            aria-label="Player name"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-sm">
            <Coins className="h-4 w-4 text-amber-400" aria-hidden />
            <span className="text-sm font-bold tabular-nums text-white">{formatScore(wallet)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted(!muted)}
            className="rounded-2xl bg-black/45 text-white hover:bg-black/60"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Logo */}
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative mt-6 w-full max-w-xl"
      >
        <Image
          src="/brand/logo-banner.png"
          alt="SUBB SURFERS"
          width={720}
          height={360}
          priority
          className="w-full drop-shadow-[0_10px_35px_rgba(255,153,0,0.35)]"
        />
      </motion.div>

      {/* Best score ribbon */}
      {profile && profile.bestScore > 0 && (
        <div className="mt-1 rounded-full bg-amber-500/90 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-950 shadow-lg">
          Personal best · {formatScore(profile.bestScore)}
        </div>
      )}

      {/* Play */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
        className="mt-6"
      >
        <Button
          onClick={startRun}
          className="group relative h-16 w-56 overflow-hidden rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 text-xl font-black uppercase italic tracking-wider text-white shadow-[0_10px_30px_rgba(234,88,12,0.5)] transition-transform hover:scale-[1.04] active:scale-95"
        >
          <Play className="mr-2 h-6 w-6 fill-white" aria-hidden />
          Play
        </Button>
      </motion.div>

      {/* Character roster */}
      <div className="mt-8 w-full max-w-2xl">
        <h2 className="mb-3 text-center text-xs font-black uppercase tracking-[0.3em] text-white/70">
          Choose your runner
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {CHARACTERS.map((c) => {
            const isUnlocked = unlocked.includes(c.id);
            const isSelected = selectedCharacter === c.id;
            return (
              <motion.button
                key={c.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => chooseCharacter(c.id, c.unlockCost)}
                className={`relative overflow-hidden rounded-2xl border-2 bg-black/45 p-0 text-left backdrop-blur-sm transition-colors ${
                  isSelected
                    ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.4)]"
                    : "border-white/10 hover:border-white/30"
                }`}
                aria-pressed={isSelected}
                aria-label={`${c.displayName}: ${isUnlocked ? (isSelected ? "selected" : "select") : `unlock for ${c.unlockCost} coins`}`}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-zinc-700/50 to-zinc-900/60">
                  <Image
                    src={`/brand/char-${c.id}.png`}
                    alt={c.displayName}
                    width={300}
                    height={300}
                    className={`h-full w-full object-cover ${!isUnlocked ? "opacity-35 grayscale" : ""}`}
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <Lock className="h-6 w-6 text-amber-300" aria-hidden />
                      <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-amber-300">
                        <Coins className="h-3 w-3" aria-hidden />
                        {formatScore(c.unlockCost)}
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950">
                      Selected
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-sm font-black uppercase italic text-white">{c.displayName}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-white/60">{isUnlocked ? c.tagline : c.perk}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Secondary actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-6">
        <Button
          variant="secondary"
          onClick={() => setShowBoard(true)}
          className="rounded-2xl bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <Trophy className="mr-2 h-4 w-4 text-amber-400" aria-hidden />
          Leaderboard
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowHelp(true)}
          className="rounded-2xl bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <HelpCircle className="mr-2 h-4 w-4 text-amber-400" aria-hidden />
          How to play
        </Button>
      </div>

      <p className="pb-4 text-center text-[11px] text-white/40">
        Arrows / WASD / Swipe to move · Space to jump · P or Esc to pause
      </p>

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
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-lg font-black uppercase italic tracking-wide text-white">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(80vh-56px)] overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export type { LeaderEntry };
