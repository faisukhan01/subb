package api

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	scoresAccepted = promauto.NewCounter(prometheus.CounterOpts{
		Namespace: "subb",
		Subsystem: "leaderboard",
		Name:      "scores_accepted_total",
		Help:      "Score submissions that passed the anti-cheat heuristic.",
	})
	scoresRejected = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "subb",
		Subsystem: "leaderboard",
		Name:      "scores_rejected_total",
		Help:      "Score submissions rejected by the anti-cheat heuristic, by reason.",
	}, []string{"reason"})
	httpDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "subb",
		Subsystem: "leaderboard",
		Name:      "http_request_duration_seconds",
		Help:      "HTTP request latency by method, route and status code.",
		Buckets:   prometheus.DefBuckets,
	}, []string{"method", "route", "status"})
)

// metricsMiddleware observes per-request latency. The route label uses the Gin
// route template (c.FullPath) to keep label cardinality bounded; unmatched
// paths collapse into a single "unmatched" label.
func metricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		route := c.FullPath()
		if route == "" {
			route = "unmatched"
		}
		httpDuration.
			WithLabelValues(c.Request.Method, route, strconv.Itoa(c.Writer.Status())).
			Observe(time.Since(start).Seconds())
	}
}
