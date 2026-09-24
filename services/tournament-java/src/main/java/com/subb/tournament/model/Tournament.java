package com.subb.tournament.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * A tournament aggregate. Status is {@code volatile} and mutated only by the
 * service's lifecycle job (synchronized on the instance), while the entries
 * map is a {@link ConcurrentHashMap} so joins and score submissions never block
 * each other unnecessarily.
 */
public class Tournament {

    private final UUID id;
    private final String name;
    private final Instant startsAt;
    private final Instant endsAt;
    private final Instant createdAt;
    private final ConcurrentMap<String, TournamentEntry> entries = new ConcurrentHashMap<>();

    private volatile TournamentStatus status;

    public Tournament(UUID id, String name, TournamentStatus status,
                      Instant startsAt, Instant endsAt, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.createdAt = createdAt;
    }

    public void setStatus(TournamentStatus status) {
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public TournamentStatus getStatus() {
        return status;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Map<String, TournamentEntry> getEntries() {
        return entries;
    }
}
