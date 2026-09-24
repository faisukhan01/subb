// Package api wires the HTTP transport (Gin) to the in-memory store.
package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/faisukhan01/subb/services/leaderboard-go/internal/model"
	"github.com/faisukhan01/subb/services/leaderboard-go/internal/store"
)

const (
	defaultLeaderboardLimit = 20
	maxLeaderboardLimit     = 100
)

// Handler holds the dependencies shared by all route handlers.
type Handler struct {
	store *store.Store
}

// NewRouter builds the fully configured Gin engine:
// routes, recovery, request logging, CORS and Prometheus instrumentation.
func NewRouter(st *store.Store) *gin.Engine {
	h := &Handler{store: st}

	r := gin.New()
	r.Use(gin.Recovery(), requestLogger(), corsMiddleware(), metricsMiddleware())

	r.GET("/healthz", h.health)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	v1 := r.Group("/api/v1")
	v1.POST("/scores", h.submitScore)
	v1.GET("/leaderboard", h.leaderboard)
	v1.GET("/players/:name/stats", h.playerStats)

	return r
}

func (h *Handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "leaderboard-go",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// submitScore handles POST /api/v1/scores.
// 400 = malformed payload, 422 = anti-cheat rejection, 201 = accepted.
func (h *Handler) submitScore(c *gin.Context) {
	var sub model.ScoreSubmission
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "details": err.Error()})
		return
	}
	if reason, ok := sub.Validate(); !ok {
		scoresRejected.WithLabelValues(reason).Inc()
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":  "submission_rejected",
			"reason": reason,
		})
		return
	}
	entry, rank := h.store.SubmitScore(sub)
	scoresAccepted.Inc()
	c.JSON(http.StatusCreated, gin.H{
		"status": "accepted",
		"rank":   rank,
		"entry":  entry,
	})
}

// leaderboard handles GET /api/v1/leaderboard?limit=N (default 20, max 100).
// Invalid limits fall back to the default; oversized limits are clamped.
func (h *Handler) leaderboard(c *gin.Context) {
	limit := defaultLeaderboardLimit
	if raw := c.Query("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil {
			limit = n
		}
	}
	if limit < 1 {
		limit = defaultLeaderboardLimit
	}
	if limit > maxLeaderboardLimit {
		limit = maxLeaderboardLimit
	}
	entries := h.store.Leaderboard(limit)
	c.JSON(http.StatusOK, gin.H{
		"limit":   limit,
		"count":   len(entries),
		"entries": entries,
	})
}

// playerStats handles GET /api/v1/players/:name/stats.
func (h *Handler) playerStats(c *gin.Context) {
	stats, ok := h.store.PlayerStats(c.Param("name"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "player_not_found"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
