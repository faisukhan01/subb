package com.subb.tournament.model;

import java.time.Instant;

/** One player's standing inside a single tournament. */
public class TournamentEntry {

    private final String playerName;

    /** Best score achieved inside this tournament. */
    private long score;

    /** Coins collected on the best-score run. */
    private long coins;

    /** Number of runs submitted inside this tournament. */
    private int games;

    private Instant updatedAt;

    public TournamentEntry(String playerName) {
        this.playerName = playerName;
        this.score = 0L;
        this.coins = 0L;
        this.games = 0;
        this.updatedAt = Instant.now();
    }

    /**
     * Records one run: {@code games} always increments, while
     * {@code score}/{@code coins} only move forward when the run beats the
     * current best. Thread-safe.
     */
    public synchronized void recordRun(long runScore, long runCoins, Instant at) {
        this.games++;
        if (runScore > this.score) {
            this.score = runScore;
            this.coins = runCoins;
        }
        this.updatedAt = at;
    }

    public String getPlayerName() {
        return playerName;
    }

    public long getScore() {
        return score;
    }

    public long getCoins() {
        return coins;
    }

    public int getGames() {
        return games;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
