# leaderboard-go

Global leaderboard service for **SUBB SURFERS** — Go 1.23, Gin, Prometheus.

Thread-safe in-memory store (best run per player + a sorted top-N slice),
pre-seeded with 10 plausible bot players so the board looks alive on a fresh
deployment. Scores are validated by the shared anti-cheat heuristic before they
touch the store.

## Endpoints

| Method | Path                          | Description                                        | Codes      |
| ------ | ----------------------------- | -------------------------------------------------- | ---------- |
| GET    | `/healthz`                    | Liveness probe                                     | 200        |
| GET    | `/metrics`                    | Prometheus metrics (RED + anti-cheat counters)     | 200        |
| POST   | `/api/v1/scores`              | Submit a run; anti-cheat validated                 | 201/400/422|
| GET    | `/api/v1/leaderboard?limit=N` | Top players (default 20, max 100, invalid → 20)    | 200        |
| GET    | `/api/v1/players/:name/stats` | Per-player best/total stats and current rank       | 200/404    |

### POST /api/v1/scores

```json
{
  "player_name": "DashKing",   // required, max 24 chars
  "score": 94820,              // >= 0
  "distance": 10250,           // metres, >= 0
  "coins": 6140,               // >= 0
  "character": "subb"          // optional
}
```

Rejections return `422` with the shared reason string:

```json
{ "error": "submission_rejected", "reason": "score_too_high" }
```

Reasons: `score_too_high` | `coins_too_high` | `distance_too_low`.

## Anti-cheat heuristic (shared contract)

Identical constants live in `internal/model/score.go` (this service),
`services/anticheat-csharp/Validation/ScoreValidator.cs` and the web client.
Checks run in fixed order (score → coins → distance) so all services report the
same single reason when several rules fail:

```
MAX_SCORE_PER_METER = 12
MAX_COINS_PER_METER = 6
COIN_SCORE_WEIGHT   = 20
SCORE_BUFFER        = 500
MIN_DISTANCE        = 10

valid iff:
  score <= distance*12 + coins*20 + 500
  coins <= distance*6 + 20
  NOT (score >= 100 AND distance < 10)
```

## Run locally

```bash
# Go 1.23+
PORT=4001 APP_ENV=production go run .

# tests
go mod tidy && go test ./...
```

## curl examples

```bash
# health
curl -s http://localhost:4001/healthz

# submit a score
curl -s -X POST http://localhost:4001/api/v1/scores \
  -H 'Content-Type: application/json' \
  -d '{"player_name":"NightOwl","score":41200,"distance":5300,"coins":3180}'

# top 5
curl -s 'http://localhost:4001/api/v1/leaderboard?limit=5'

# player stats
curl -s http://localhost:4001/api/v1/players/DashKing/stats

# rejected submission (anti-cheat)
curl -s -X POST http://localhost:4001/api/v1/scores \
  -H 'Content-Type: application/json' \
  -d '{"player_name":"Cheater","score":999999,"distance":100,"coins":0}'
```

## Docker

```bash
docker build -t subb/leaderboard-go .
docker run --rm -p 4001:4001 subb/leaderboard-go
```

The image is a multi-stage build (`golang:1.23-alpine` → `alpine:3.20`), runs as
a non-root user, and ships a `HEALTHCHECK` hitting `/healthz`. `go.sum` is
generated inside the build stage via `go mod tidy`, so the pinned versions in
`go.mod` are the single source of truth.

## Configuration

| Env       | Default | Meaning                                  |
| --------- | ------- | ---------------------------------------- |
| `PORT`    | `4001`  | HTTP listen port                         |
| `APP_ENV` | —       | `production` switches Gin to release mode |

Graceful shutdown on `SIGINT`/`SIGTERM` with a 10s drain window.
