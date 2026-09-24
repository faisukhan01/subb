// Command leaderboard-go serves the SUBB SURFERS global leaderboard API.
//
// Endpoints:
//
//      GET  /healthz                     liveness probe
//      GET  /metrics                     Prometheus metrics
//      POST /api/v1/scores               submit a run (anti-cheat validated)
//      GET  /api/v1/leaderboard          top players (?limit=, default 20, max 100)
//      GET  /api/v1/players/:name/stats  per-player aggregate stats
//
// Configuration:
//
//      PORT      listen port (default 4001)
//      APP_ENV   set to "production" to run Gin in release mode
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/faisukhan01/subb/services/leaderboard-go/internal/api"
	"github.com/faisukhan01/subb/services/leaderboard-go/internal/store"
)

const (
	defaultPort      = "4001"
	shutdownGrace    = 10 * time.Second
	readTimeout      = 10 * time.Second
	writeTimeout     = 15 * time.Second
	idleTimeout      = 60 * time.Second
	headerReadTimeout = 5 * time.Second
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	if os.Getenv("APP_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	st := store.New()
	router := api.NewRouter(st)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: headerReadTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("leaderboard-go listening on :%s (mode=%s)", port, gin.Mode())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http server failed: %v", err)
		}
	}()

	<-quit
	log.Printf("shutdown signal received; draining connections (grace %s)", shutdownGrace)

	ctx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("forced shutdown: %v", err)
	}
	log.Println("leaderboard-go stopped")
}
