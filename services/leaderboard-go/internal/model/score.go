// Package model defines the leaderboard domain types and the shared anti-cheat
// score heuristic.
//
// ANTI-CHEAT CONTRACT: the constants and formulas below are mirrored verbatim
// in services/anticheat-csharp/Validation/ScoreValidator.cs (C#) and in the web
// client's TypeScript helpers. Changing them requires updating every copy in
// the same commit.
package model

import "time"

const (
	// MaxScorePerMeter caps how many raw points one metre of distance can justify.
	MaxScorePerMeter int64 = 12
	// MaxCoinsPerMeter caps how many coins one metre of distance can justify.
	MaxCoinsPerMeter int64 = 6
	// CoinScoreWeight is how many points each collected coin may justify.
	CoinScoreWeight int64 = 20
	// ScoreBuffer is the flat score allowance on top of the distance/coin bound.
	ScoreBuffer int64 = 500
	// CoinGrace is the flat coin allowance on top of the distance bound
	// (the literal "+20" in the shared spec: coins <= distance*6 + 20).
	CoinGrace int64 = 20
	// MinDistance is the minimum distance a non-trivial (score >= 100) run needs.
	MinDistance int64 = 10

	// MaxPlausibleInput rejects absurd typed-in numbers before the linear math
	// could overflow int64 (~1.1e15 metres is ~7,000 round trips to the sun).
	MaxPlausibleInput int64 = 1 << 50
)

// Rejection reasons returned when a submission fails the anti-cheat heuristic.
const (
	ReasonScoreTooHigh   = "score_too_high"
	ReasonCoinsTooHigh   = "coins_too_high"
	ReasonDistanceTooLow = "distance_too_low"
)

// ScoreSubmission is the payload for POST /api/v1/scores.
type ScoreSubmission struct {
	PlayerName string `json:"player_name" binding:"required,max=24"`
	Score      int64  `json:"score" binding:"gte=0"`
	Distance   int64  `json:"distance" binding:"gte=0"`
	Coins      int64  `json:"coins" binding:"gte=0"`
	Character  string `json:"character,omitempty"`
}

// LeaderboardEntry is one row of GET /api/v1/leaderboard.
type LeaderboardEntry struct {
	Rank       int       `json:"rank"`
	PlayerName string    `json:"player_name"`
	Score      int64     `json:"score"`
	Distance   int64     `json:"distance"`
	Coins      int64     `json:"coins"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// PlayerStats is the response of GET /api/v1/players/:name/stats.
type PlayerStats struct {
	PlayerName    string    `json:"player_name"`
	BestScore     int64     `json:"best_score"`
	BestDistance  int64     `json:"best_distance"`
	BestCoins     int64     `json:"best_coins"`
	Rank          int       `json:"rank"`
	TotalRuns     int64     `json:"total_runs"`
	TotalDistance int64     `json:"total_distance"`
	TotalCoins    int64     `json:"total_coins"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Validate applies the shared anti-cheat heuristic. It returns ("", true) when
// the submission is plausible, otherwise (reason, false) with reason one of:
//
//	"score_too_high" | "coins_too_high" | "distance_too_low"
//
// Checks run in a fixed order (score, coins, distance) so every service agrees
// on which single reason is reported when multiple rules fail at once:
//
//	score    <= distance*MAX_SCORE_PER_METER + coins*COIN_SCORE_WEIGHT + SCORE_BUFFER
//	coins    <= distance*MAX_COINS_PER_METER + 20
//	NOT (score >= 100 AND distance < MIN_DISTANCE)
func (s ScoreSubmission) Validate() (string, bool) {
	if s.Score > MaxPlausibleInput || s.Distance > MaxPlausibleInput || s.Coins > MaxPlausibleInput {
		// Astronomically out-of-range input is always a cheat signal; the score
		// bound is the first rule that would fail, so report that.
		return ReasonScoreTooHigh, false
	}
	if s.Score > s.Distance*MaxScorePerMeter+s.Coins*CoinScoreWeight+ScoreBuffer {
		return ReasonScoreTooHigh, false
	}
	if s.Coins > s.Distance*MaxCoinsPerMeter+CoinGrace {
		return ReasonCoinsTooHigh, false
	}
	if s.Score >= 100 && s.Distance < MinDistance {
		return ReasonDistanceTooLow, false
	}
	return "", true
}
