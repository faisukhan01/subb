package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/faisukhan01/subb/services/leaderboard-go/internal/api"
	"github.com/faisukhan01/subb/services/leaderboard-go/internal/model"
	"github.com/faisukhan01/subb/services/leaderboard-go/internal/store"
)

func newTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return api.NewRouter(store.New())
}

// doRequest issues a JSON request against the router and decodes the JSON
// response body (if any) into a generic map.
func doRequest(t *testing.T, r *gin.Engine, method, path, body string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	out := map[string]any{}
	if rec.Body.Len() > 0 {
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("response is not JSON: %v (body=%q)", err, rec.Body.String())
		}
	}
	return rec, out
}

// TestSubmitScoreHandler is a table-driven check of POST /api/v1/scores plus a
// follow-up leaderboard read for the accepted case.
func TestSubmitScoreHandler(t *testing.T) {
	r := newTestRouter()

	cases := []struct {
		name       string
		body       string
		wantStatus int
		wantReason string // expected "reason" field on 422 responses
		checkBest  bool   // after acceptance, verify the player tops the board
	}{
		{
			name:       "valid submission lands on leaderboard",
			body:       `{"player_name":"TestRunner","score":200000,"distance":20000,"coins":8000,"character":"subb"}`,
			wantStatus: http.StatusCreated,
			checkBest:  true,
		},
		{
			name:       "impossible score is rejected",
			body:       `{"player_name":"Cheater","score":999999,"distance":100,"coins":0}`,
			wantStatus: http.StatusUnprocessableEntity,
			wantReason: "score_too_high",
		},
		{
			name:       "impossible coin count is rejected",
			body:       `{"player_name":"CoinBot","score":10,"distance":100,"coins":99999}`,
			wantStatus: http.StatusUnprocessableEntity,
			wantReason: "coins_too_high",
		},
		{
			name:       "high score with no distance is rejected",
			body:       `{"player_name":"Porter","score":150,"distance":5,"coins":0}`,
			wantStatus: http.StatusUnprocessableEntity,
			wantReason: "distance_too_low",
		},
		{
			name:       "negative score fails binding",
			body:       `{"player_name":"Glitch","score":-1,"distance":100,"coins":0}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing player name fails binding",
			body:       `{"score":10,"distance":100,"coins":0}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "player name over 24 chars fails binding",
			body:       `{"player_name":"aaaaaaaaaaaaaaaaaaaaaaaaa","score":10,"distance":100,"coins":0}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "malformed json fails binding",
			body:       `{"player_name":`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec, resp := doRequest(t, r, http.MethodPost, "/api/v1/scores", tc.body)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", rec.Code, tc.wantStatus, rec.Body.String())
			}
			if tc.wantReason != "" && resp["reason"] != tc.wantReason {
				t.Fatalf("reason = %v, want %q", resp["reason"], tc.wantReason)
			}
			if tc.checkBest {
				rec, resp := doRequest(t, r, http.MethodGet, "/api/v1/leaderboard?limit=1", "")
				if rec.Code != http.StatusOK {
					t.Fatalf("leaderboard status = %d, want %d", rec.Code, http.StatusOK)
				}
				entries, ok := resp["entries"].([]any)
				if !ok || len(entries) != 1 {
					t.Fatalf("expected exactly 1 leaderboard entry, got %v", resp["entries"])
				}
				top, _ := entries[0].(map[string]any)
				if top["player_name"] != "TestRunner" {
					t.Fatalf("top player = %v, want TestRunner", top["player_name"])
				}
				if top["rank"] != float64(1) {
					t.Fatalf("top rank = %v, want 1", top["rank"])
				}
			}
		})
	}
}

// TestLeaderboardLimit checks the ?limit= parsing rules: default 20, max 100,
// invalid values falling back to the default, entries sorted by score.
func TestLeaderboardLimit(t *testing.T) {
	r := newTestRouter()

	cases := []struct {
		name      string
		query     string
		wantLimit int
		wantCount int // seeded store contains exactly 10 bot players
	}{
		{"explicit limit", "?limit=3", 3, 3},
		{"default limit when absent", "", 20, 10},
		{"invalid limit falls back to default", "?limit=banana", 20, 10},
		{"negative limit falls back to default", "?limit=-5", 20, 10},
		{"limit above max is clamped", "?limit=500", 100, 10},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec, resp := doRequest(t, r, http.MethodGet, "/api/v1/leaderboard"+tc.query, "")
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
			}
			if got := int(resp["limit"].(float64)); got != tc.wantLimit {
				t.Fatalf("limit = %d, want %d", got, tc.wantLimit)
			}
			if got := int(resp["count"].(float64)); got != tc.wantCount {
				t.Fatalf("count = %d, want %d", got, tc.wantCount)
			}
			entries := resp["entries"].([]any)
			if len(entries) != tc.wantCount {
				t.Fatalf("len(entries) = %d, want %d", len(entries), tc.wantCount)
			}
			prev := float64(1 << 62)
			for i, e := range entries {
				entry := e.(map[string]any)
				score := entry["score"].(float64)
				if score > prev {
					t.Fatalf("entries not sorted by score desc at index %d", i)
				}
				prev = score
				if entry["rank"] != float64(i+1) {
					t.Fatalf("rank = %v at index %d, want %d", entry["rank"], i, i+1)
				}
			}
		})
	}
}

// TestPlayerStatsEndpoint covers GET /api/v1/players/:name/stats for both a
// seeded player and an unknown name.
func TestPlayerStatsEndpoint(t *testing.T) {
	r := newTestRouter()

	rec, resp := doRequest(t, r, http.MethodGet, "/api/v1/players/DashKing/stats", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if resp["player_name"] != "DashKing" || resp["best_score"] != float64(94820) {
		t.Fatalf("unexpected stats: %v", resp)
	}

	rec, _ = doRequest(t, r, http.MethodGet, "/api/v1/players/DoesNotExist/stats", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unknown player status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

// TestAntiCheatBoundaries pins the exact heuristic edges that are shared,
// constant-for-constant, with the C# anti-cheat service and the web client.
func TestAntiCheatBoundaries(t *testing.T) {
	cases := []struct {
		name    string
		sub     model.ScoreSubmission
		wantOK  bool
		wantStr string
	}{
		{"zero run is valid", model.ScoreSubmission{Score: 0, Distance: 0, Coins: 0}, true, ""},
		{"score exactly at bound", model.ScoreSubmission{Score: 100*model.MaxScorePerMeter + model.ScoreBuffer, Distance: 100, Coins: 0}, true, ""},
		{"score one over bound", model.ScoreSubmission{Score: 100*model.MaxScorePerMeter + model.ScoreBuffer + 1, Distance: 100, Coins: 0}, false, model.ReasonScoreTooHigh},
		{"coins exactly at bound", model.ScoreSubmission{Score: 0, Distance: 100, Coins: 100*model.MaxCoinsPerMeter + model.CoinGrace}, true, ""},
		{"coins one over bound", model.ScoreSubmission{Score: 0, Distance: 100, Coins: 100*model.MaxCoinsPerMeter + model.CoinGrace + 1}, false, model.ReasonCoinsTooHigh},
		{"distance exactly at minimum", model.ScoreSubmission{Score: 100, Distance: model.MinDistance, Coins: 0}, true, ""},
		{"distance one under minimum", model.ScoreSubmission{Score: 100, Distance: model.MinDistance - 1, Coins: 0}, false, model.ReasonDistanceTooLow},
		{"low score short run is fine", model.ScoreSubmission{Score: 99, Distance: 0, Coins: 0}, true, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			reason, ok := tc.sub.Validate()
			if ok != tc.wantOK || reason != tc.wantStr {
				t.Fatalf("Validate() = (%q, %v), want (%q, %v)", reason, ok, tc.wantStr, tc.wantOK)
			}
		})
	}
}
