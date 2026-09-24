package com.subb.tournament;

import com.subb.tournament.model.TournamentStatus;
import com.subb.tournament.model.dto.CreateTournamentRequest;
import com.subb.tournament.model.dto.JoinRequest;
import com.subb.tournament.model.dto.LeaderboardRow;
import com.subb.tournament.model.dto.ScoreSubmissionRequest;
import com.subb.tournament.model.dto.TournamentSummary;
import com.subb.tournament.service.BadRequestException;
import com.subb.tournament.service.ConflictException;
import com.subb.tournament.service.NotFoundException;
import com.subb.tournament.service.TournamentService;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Service-level behaviour tests (no Spring context needed). */
class TournamentServiceTest {

    private final TournamentService service = new TournamentService();

    private CreateTournamentRequest activeRequest(String name) {
        Instant now = Instant.now();
        return new CreateTournamentRequest(name, now.minusSeconds(60), now.plusSeconds(3600));
    }

    @Test
    void joinSubmitAndLeaderboardOrdering() {
        TournamentSummary created = service.create(activeRequest("Weekly Clash"));
        assertEquals(TournamentStatus.ACTIVE, created.status());
        assertEquals(0, created.playerCount());

        service.join(created.id(), new JoinRequest("DashKing"));
        service.join(created.id(), new JoinRequest("NeonRiley"));
        service.join(created.id(), new JoinRequest("TunnelViper"));

        service.submitScore(created.id(), new ScoreSubmissionRequest("DashKing", 5000, 400));
        service.submitScore(created.id(), new ScoreSubmissionRequest("NeonRiley", 9000, 700));
        // Tie on score with NeonRiley, higher coins -> ranks above.
        service.submitScore(created.id(), new ScoreSubmissionRequest("TunnelViper", 9000, 900));
        // DashKing improves his best; games must now count two runs.
        service.submitScore(created.id(), new ScoreSubmissionRequest("DashKing", 7000, 410));

        List<LeaderboardRow> rows = service.leaderboard(created.id());
        assertEquals(3, rows.size());
        assertEquals(1, rows.get(0).rank());
        assertEquals("TunnelViper", rows.get(0).playerName());
        assertEquals(9000, rows.get(0).score());
        assertEquals("NeonRiley", rows.get(1).playerName());
        assertEquals("DashKing", rows.get(2).playerName());
        assertEquals(7000, rows.get(2).score());
        assertEquals(410, rows.get(2).coins());
        assertEquals(2, rows.get(2).games());
    }

    @Test
    void lifecycleTransitionsUpcomingToActiveToFinished() {
        Instant base = Instant.now();
        service.setClock(Clock.fixed(base, ZoneOffset.UTC));

        TournamentSummary created = service.create(new CreateTournamentRequest(
                "Lifecycle Cup",
                base.plusSeconds(3600),
                base.plusSeconds(7200)));
        assertEquals(TournamentStatus.UPCOMING, created.status());

        // Past starts_at, before ends_at -> ACTIVE.
        service.setClock(Clock.fixed(base.plusSeconds(5400), ZoneOffset.UTC));
        service.transitionLifecycle();
        assertEquals(TournamentStatus.ACTIVE, statusOf(created.id()));

        // Past ends_at -> FINISHED.
        service.setClock(Clock.fixed(base.plusSeconds(9000), ZoneOffset.UTC));
        service.transitionLifecycle();
        assertEquals(TournamentStatus.FINISHED, statusOf(created.id()));

        // Terminal state is stable.
        service.transitionLifecycle();
        assertEquals(TournamentStatus.FINISHED, statusOf(created.id()));
    }

    @Test
    void duplicateJoinConflicts() {
        TournamentSummary created = service.create(activeRequest("Duplicate Guard"));
        service.join(created.id(), new JoinRequest("DashKing"));
        assertThrows(ConflictException.class,
                () -> service.join(created.id(), new JoinRequest("DashKing")));
    }

    @Test
    void joinAfterFinishConflicts() {
        Instant now = Instant.now();
        TournamentSummary created = service.create(new CreateTournamentRequest(
                "Closed Cup", now.minusSeconds(7200), now.minusSeconds(3600)));
        assertEquals(TournamentStatus.FINISHED, created.status());
        assertThrows(ConflictException.class,
                () -> service.join(created.id(), new JoinRequest("LateBird")));
    }

    @Test
    void unknownTournamentAndPlayerNotFound() {
        UUID missing = UUID.randomUUID();
        assertThrows(NotFoundException.class,
                () -> service.join(missing, new JoinRequest("DashKing")));
        assertThrows(NotFoundException.class,
                () -> service.submitScore(missing, new ScoreSubmissionRequest("DashKing", 10, 0)));
        assertThrows(NotFoundException.class, () -> service.leaderboard(missing));

        TournamentSummary created = service.create(activeRequest("Strangers Only"));
        assertThrows(NotFoundException.class,
                () -> service.submitScore(created.id(), new ScoreSubmissionRequest("Ghost", 10, 0)));
    }

    @Test
    void createRejectsInvertedWindow() {
        Instant now = Instant.now();
        // ends_at must be strictly after starts_at -> BadRequestException.
        assertThrows(BadRequestException.class, () -> service.create(new CreateTournamentRequest(
                "Broken Window", now.plusSeconds(3600), now)));
    }

    private TournamentStatus statusOf(UUID id) {
        return service.list().stream()
                .filter(t -> t.id().equals(id))
                .findFirst()
                .orElseThrow()
                .status();
    }
}
