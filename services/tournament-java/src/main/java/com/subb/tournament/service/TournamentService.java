package com.subb.tournament.service;

import com.subb.tournament.model.Tournament;
import com.subb.tournament.model.TournamentEntry;
import com.subb.tournament.model.TournamentStatus;
import com.subb.tournament.model.dto.CreateTournamentRequest;
import com.subb.tournament.model.dto.JoinRequest;
import com.subb.tournament.model.dto.LeaderboardRow;
import com.subb.tournament.model.dto.ScoreSubmissionRequest;
import com.subb.tournament.model.dto.TournamentSummary;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory tournament store with time-driven lifecycle transitions.
 *
 * <p>Concurrency: the {@link ConcurrentHashMap} of tournaments plus a
 * {@code ConcurrentHashMap} of entries per tournament make joins/score posts
 * lock-free; status transitions synchronize on the tournament instance so a
 * join never slips past a FINISHED transition. Entry best-score updates are
 * synchronized inside {@link TournamentEntry#recordRun(long, long, Instant)}.
 */
@Service
public class TournamentService {

    private static final Logger log = LoggerFactory.getLogger(TournamentService.class);

    private final ConcurrentMap<UUID, Tournament> tournaments = new ConcurrentHashMap<>();

    /** Injectable clock so tests can advance time deterministically. */
    private Clock clock = Clock.systemUTC();

    @PostConstruct
    void seedDemoTournament() {
        Instant now = Instant.now(clock);
        Tournament demo = new Tournament(
                UUID.randomUUID(),
                "Subb Daily Dash #1",
                TournamentStatus.ACTIVE,
                now.minus(Duration.ofHours(1)),
                now.plus(Duration.ofHours(23)),
                now.minus(Duration.ofHours(2)));

        demo.getEntries().put("DashKing", seededEntry("DashKing", 94820, 6140, 3, now));
        demo.getEntries().put("TunnelViper", seededEntry("TunnelViper", 88140, 5730, 3, now));
        demo.getEntries().put("NeonRiley", seededEntry("NeonRiley", 79650, 5400, 2, now));

        tournaments.put(demo.getId(), demo);
        log.info("seeded demo tournament {} ({})", demo.getName(), demo.getId());
    }

    private static TournamentEntry seededEntry(String name, long score, long coins, int games, Instant at) {
        TournamentEntry entry = new TournamentEntry(name);
        entry.recordRun(score, coins, at);
        for (int i = 1; i < games; i++) {
            entry.recordRun(Math.max(0, score / (i + 1)), Math.max(0, coins / (i + 1)), at);
        }
        return entry;
    }

    // ------------------------------------------------------------------
    // Commands & queries
    // ------------------------------------------------------------------

    public TournamentSummary create(CreateTournamentRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new BadRequestException("ends_at_must_be_after_starts_at");
        }
        Instant now = Instant.now(clock);
        Instant startsAt = request.startsAt();
        Instant endsAt = request.endsAt();

        TournamentStatus status;
        if (now.isBefore(startsAt)) {
            status = TournamentStatus.UPCOMING;
        } else if (now.isBefore(endsAt)) {
            status = TournamentStatus.ACTIVE;
        } else {
            status = TournamentStatus.FINISHED;
        }

        Tournament tournament = new Tournament(
                UUID.randomUUID(), request.name().trim(), status, startsAt, endsAt, now);
        tournaments.put(tournament.getId(), tournament);
        return TournamentSummary.from(tournament);
    }

    public List<TournamentSummary> list() {
        List<TournamentSummary> summaries = new ArrayList<>();
        tournaments.values().stream()
                .sorted(Comparator.comparing(Tournament::getStartsAt).reversed())
                .forEach(t -> summaries.add(TournamentSummary.from(t)));
        return summaries;
    }

    public TournamentEntry join(UUID tournamentId, JoinRequest request) {
        Tournament tournament = require(tournamentId);
        synchronized (tournament) {
            if (tournament.getStatus() == TournamentStatus.FINISHED) {
                throw new ConflictException("tournament_finished");
            }
        }
        String playerName = request.playerName().trim();
        TournamentEntry fresh = new TournamentEntry(playerName);
        TournamentEntry existing = tournament.getEntries().putIfAbsent(playerName, fresh);
        if (existing != null) {
            throw new ConflictException("already_joined");
        }
        return fresh;
    }

    public TournamentEntry submitScore(UUID tournamentId, ScoreSubmissionRequest request) {
        Tournament tournament = require(tournamentId);
        TournamentEntry entry = tournament.getEntries().get(request.playerName().trim());
        if (entry == null) {
            throw new NotFoundException("player_not_joined");
        }
        entry.recordRun(request.score(), request.coins(), Instant.now(clock));
        return entry;
    }

    public List<LeaderboardRow> leaderboard(UUID tournamentId) {
        Tournament tournament = require(tournamentId);
        List<Map.Entry<String, TournamentEntry>> ranked = new ArrayList<>(tournament.getEntries().entrySet());
        ranked.sort(Comparator
                .comparingLong((Map.Entry<String, TournamentEntry> e) -> e.getValue().getScore()).reversed()
                .thenComparing(Comparator.comparingLong((Map.Entry<String, TournamentEntry> e) -> e.getValue().getCoins()).reversed())
                .thenComparing(Map.Entry::getKey));

        List<LeaderboardRow> rows = new ArrayList<>(ranked.size());
        for (int i = 0; i < ranked.size(); i++) {
            TournamentEntry entry = ranked.get(i).getValue();
            rows.add(new LeaderboardRow(
                    i + 1,
                    entry.getPlayerName(),
                    entry.getScore(),
                    entry.getCoins(),
                    entry.getGames()));
        }
        return rows;
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    /**
     * Transitions UPCOMING -> ACTIVE (at starts_at) and ACTIVE -> FINISHED
     * (at ends_at). Runs every 60 seconds; synchronized per tournament so it
     * cannot race with join-time status checks.
     */
    @Scheduled(fixedRate = 60_000L)
    public void transitionLifecycle() {
        Instant now = Instant.now(clock);
        for (Tournament tournament : tournaments.values()) {
            synchronized (tournament) {
                switch (tournament.getStatus()) {
                    case UPCOMING -> {
                        if (!now.isBefore(tournament.getStartsAt())) {
                            tournament.setStatus(TournamentStatus.ACTIVE);
                            log.info("tournament {} -> ACTIVE", tournament.getId());
                        }
                    }
                    case ACTIVE -> {
                        if (!now.isBefore(tournament.getEndsAt())) {
                            tournament.setStatus(TournamentStatus.FINISHED);
                            log.info("tournament {} -> FINISHED", tournament.getId());
                        }
                    }
                    case FINISHED -> { /* terminal */ }
                }
            }
        }
    }

    /** Test hook: replace the clock to simulate time passing. */
    public void setClock(Clock clock) {
        this.clock = clock;
    }

    private Tournament require(UUID tournamentId) {
        Tournament tournament = tournaments.get(tournamentId);
        if (tournament == null) {
            throw new NotFoundException("tournament_not_found");
        }
        return tournament;
    }
}
