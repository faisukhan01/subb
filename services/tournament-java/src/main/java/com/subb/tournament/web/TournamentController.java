package com.subb.tournament.web;

import com.subb.tournament.model.dto.CreateTournamentRequest;
import com.subb.tournament.model.dto.JoinRequest;
import com.subb.tournament.model.dto.LeaderboardRow;
import com.subb.tournament.model.dto.ScoreSubmissionRequest;
import com.subb.tournament.model.dto.TournamentSummary;
import com.subb.tournament.model.TournamentEntry;
import com.subb.tournament.service.TournamentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** REST surface of the tournament service. */
@RestController
@RequestMapping("/api/v1")
public class TournamentController {

    private final TournamentService service;

    public TournamentController(TournamentService service) {
        this.service = service;
    }

    @PostMapping("/tournaments")
    public ResponseEntity<TournamentSummary> create(@Valid @RequestBody CreateTournamentRequest request) {
        TournamentSummary summary = service.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/tournaments/" + summary.id()))
                .body(summary);
    }

    @GetMapping("/tournaments")
    public List<TournamentSummary> list() {
        return service.list();
    }

    @PostMapping("/tournaments/{id}/join")
    public TournamentEntry join(@PathVariable UUID id, @Valid @RequestBody JoinRequest request) {
        return service.join(id, request);
    }

    @PostMapping("/tournaments/{id}/scores")
    public TournamentEntry submitScore(@PathVariable UUID id,
                                       @Valid @RequestBody ScoreSubmissionRequest request) {
        return service.submitScore(id, request);
    }

    @GetMapping("/tournaments/{id}/leaderboard")
    public List<LeaderboardRow> leaderboard(@PathVariable UUID id) {
        return service.leaderboard(id);
    }

    @GetMapping("/healthz")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "tournament-java");
    }
}
