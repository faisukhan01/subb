package com.subb.tournament.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/v1/tournaments/{id}/scores. */
public record ScoreSubmissionRequest(
        @NotBlank(message = "player_name is required")
        @Size(max = 24, message = "player_name must be at most 24 characters")
        String playerName,

        @Min(value = 0, message = "score must be >= 0")
        long score,

        @Min(value = 0, message = "coins must be >= 0")
        long coins) {
}
