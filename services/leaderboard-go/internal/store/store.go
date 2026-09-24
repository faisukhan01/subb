// Package store implements a thread-safe in-memory leaderboard store.
//
// Data layout:
//   - map[string]*Player — best-run bookkeeping per player (O(1) lookup)
//   - []*Player          — the same players kept sorted by best score so the
//     top-N query is a prefix slice. The slice is re-sorted after each write;
//     for the expected player population this is cheap and keeps reads
//     lock-light (RLock only).
package store

import (
	"sort"
	"sync"
	"time"

	"github.com/faisukhan01/subb/services/leaderboard-go/internal/model"
)

// Player aggregates everything the service knows about one player.
type Player struct {
	Name          string
	BestScore     int64
	BestDistance  int64
	BestCoins     int64
	TotalRuns     int64
	TotalDistance int64
	TotalCoins    int64
	UpdatedAt     time.Time
}

// Store is a concurrency-safe in-memory leaderboard.
type Store struct {
	mu      sync.RWMutex
	players map[string]*Player
	sorted  []*Player // mirrors players, sorted by BestScore desc
}

// botSeed is one pre-seeded bot profile. Seeds follow the game economy:
// score ~= distance x effective multiplier (x5 base, up to x10 with powerups)
// and coins ~= 0.6 x distance, so every row passes the anti-cheat heuristic.
type botSeed struct {
	name       string
	score      int64
	distance   int64
	coins      int64
	runs       int64
	minutesAgo int
}

var bots = []botSeed{
	{"DashKing", 94820, 10250, 6140, 812, 3},
	{"TunnelViper", 88140, 9890, 5730, 940, 7},
	{"NeonRiley", 79650, 8720, 5400, 1005, 11},
	{"SkyHarper", 64300, 7410, 4480, 876, 19},
	{"GhostMile", 51270, 6180, 3590, 1102, 26},
	{"VortexJin", 38940, 5020, 3010, 968, 33},
	{"PrismOak", 27480, 3960, 2340, 741, 41},
	{"RapidOnyx", 19650, 3110, 1880, 655, 55},
	{"LunarPix", 11240, 2040, 1270, 512, 73},
	{"Mudskipper", 4380, 890, 620, 388, 96},
}

// New returns a store pre-seeded with a plausible bot population so the
// leaderboard looks alive on a fresh deployment.
func New() *Store {
	s := &Store{players: make(map[string]*Player, len(bots))}
	now := time.Now().UTC()
	for _, b := range bots {
		p := &Player{
			Name:          b.name,
			BestScore:     b.score,
			BestDistance:  b.distance,
			BestCoins:     b.coins,
			TotalRuns:     b.runs,
			TotalDistance: b.distance * b.runs * 3 / 4, // historical runs are shorter than bests
			TotalCoins:    b.coins * b.runs * 4 / 5,
			UpdatedAt:     now.Add(-time.Duration(b.minutesAgo) * time.Minute),
		}
		s.players[p.Name] = p
		s.sorted = append(s.sorted, p)
	}
	sort.SliceStable(s.sorted, func(i, j int) bool { return s.sorted[i].BestScore > s.sorted[j].BestScore })
	return s
}

// SubmitScore records one run. The best run per player is what appears on the
// leaderboard; totals accumulate across every run. It returns the player's
// current best entry with its 1-based rank.
func (s *Store) SubmitScore(sub model.ScoreSubmission) (model.LeaderboardEntry, int) {
	now := time.Now().UTC()

	s.mu.Lock()
	p, ok := s.players[sub.PlayerName]
	if !ok {
		p = &Player{Name: sub.PlayerName}
		s.players[sub.PlayerName] = p
		s.sorted = append(s.sorted, p)
	}
	p.TotalRuns++
	p.TotalDistance += sub.Distance
	p.TotalCoins += sub.Coins
	if p.TotalRuns == 1 || sub.Score > p.BestScore {
		p.BestScore = sub.Score
		p.BestDistance = sub.Distance
		p.BestCoins = sub.Coins
	}
	p.UpdatedAt = now

	sort.SliceStable(s.sorted, func(i, j int) bool { return s.sorted[i].BestScore > s.sorted[j].BestScore })
	rank := 0
	for i, q := range s.sorted {
		if q == p {
			rank = i + 1
			break
		}
	}
	entry := model.LeaderboardEntry{
		Rank:       rank,
		PlayerName: p.Name,
		Score:      p.BestScore,
		Distance:   p.BestDistance,
		Coins:      p.BestCoins,
		UpdatedAt:  p.UpdatedAt,
	}
	s.mu.Unlock()
	return entry, rank
}

// Leaderboard returns the top-limit entries, best first. limit <= 0 returns an
// empty slice; limit larger than the population is clamped.
func (s *Store) Leaderboard(limit int) []model.LeaderboardEntry {
	if limit <= 0 {
		return []model.LeaderboardEntry{}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit > len(s.sorted) {
		limit = len(s.sorted)
	}
	out := make([]model.LeaderboardEntry, 0, limit)
	for i := 0; i < limit; i++ {
		p := s.sorted[i]
		out = append(out, model.LeaderboardEntry{
			Rank:       i + 1,
			PlayerName: p.Name,
			Score:      p.BestScore,
			Distance:   p.BestDistance,
			Coins:      p.BestCoins,
			UpdatedAt:  p.UpdatedAt,
		})
	}
	return out
}

// PlayerStats returns aggregate stats for one player (ok=false when unknown).
func (s *Store) PlayerStats(name string) (model.PlayerStats, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.players[name]
	if !ok {
		return model.PlayerStats{}, false
	}
	rank := 0
	for i, q := range s.sorted {
		if q == p {
			rank = i + 1
			break
		}
	}
	return model.PlayerStats{
		PlayerName:    p.Name,
		BestScore:     p.BestScore,
		BestDistance:  p.BestDistance,
		BestCoins:     p.BestCoins,
		Rank:          rank,
		TotalRuns:     p.TotalRuns,
		TotalDistance: p.TotalDistance,
		TotalCoins:    p.TotalCoins,
		UpdatedAt:     p.UpdatedAt,
	}, true
}

// PlayerCount returns the number of tracked players (handy for metrics/tests).
func (s *Store) PlayerCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.players)
}
