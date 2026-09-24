package com.subb.tournament.model.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/** One ranked row of a tournament leaderboard. */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LeaderboardRow(
        int rank,
        String playerName,
        long score,
        long coins,
        int games) {
}
