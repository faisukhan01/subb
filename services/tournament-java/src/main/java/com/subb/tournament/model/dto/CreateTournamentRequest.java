package com.subb.tournament.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** Request body for POST /api/v1/tournaments. */
public record CreateTournamentRequest(
        @NotBlank(message = "name is required")
        @Size(max = 48, message = "name must be at most 48 characters")
        String name,

        @NotNull(message = "starts_at is required")
        Instant startsAt,

        @NotNull(message = "ends_at is required")
        Instant endsAt) {
}
