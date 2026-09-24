package com.subb.tournament.model.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.subb.tournament.model.Tournament;
import com.subb.tournament.model.TournamentStatus;

import java.time.Instant;
import java.util.UUID;

/** Public summary of a tournament. */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TournamentSummary(
        UUID id,
        String name,
        TournamentStatus status,
        Instant startsAt,
        Instant endsAt,
        int playerCount) {

    public static TournamentSummary from(Tournament tournament) {
        return new TournamentSummary(
                tournament.getId(),
                tournament.getName(),
                tournament.getStatus(),
                tournament.getStartsAt(),
                tournament.getEndsAt(),
                tournament.getEntries().size());
    }
}
