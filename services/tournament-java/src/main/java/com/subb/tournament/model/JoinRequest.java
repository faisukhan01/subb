package com.subb.tournament.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/v1/tournaments/{id}/join. */
public record JoinRequest(
        @NotBlank(message = "player_name is required")
        @Size(max = 24, message = "player_name must be at most 24 characters")
        String playerName) {
}
