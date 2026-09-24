# tournament-java

Spring Boot 3.3 / Java 21 tournaments service for **SUBB SURFERS** (port 4003).

In-memory store built on `ConcurrentHashMap`s. Tournaments follow a purely
time-driven lifecycle — `UPCOMING -> ACTIVE -> FINISHED` — applied by a
scheduled job every 60 seconds, and one ACTIVE demo tournament
("Subb Daily Dash #1") is seeded at startup so the API is immediately usable.

## Endpoints

| Method | Path                                  | Description                                   | Codes       |
| ------ | ------------------------------------- | --------------------------------------------- | ----------- |
| GET    | `/healthz`                            | Liveness probe                                | 200         |
| POST   | `/api/v1/tournaments`                 | Create a tournament                           | 201/400     |
| GET    | `/api/v1/tournaments`                 | List tournaments (newest first)               | 200         |
| POST   | `/api/v1/tournaments/{id}/join`       | Join a tournament                             | 201*/404/409|
| POST   | `/api/v1/tournaments/{id}/scores`     | Submit a run (best score kept per player)     | 200/400/404 |
| GET    | `/api/v1/tournaments/{id}/leaderboard`| Ranked rows (score desc, coins desc, name asc)| 200/404     |

\* join returns `200` with the created entry; create returns `201` with a
`Location` header.

Error bodies are `{"error": "<code>"}` with codes: `tournament_not_found`,
`player_not_joined`, `already_joined`, `tournament_finished`,
`ends_at_must_be_after_starts_at`, `invalid_request`.

## curl examples

```bash
# create
curl -s -X POST http://localhost:4003/api/v1/tournaments \
  -H 'Content-Type: application/json' \
  -d '{"name":"Weekend Rush","starts_at":"2025-06-01T00:00:00Z","ends_at":"2025-06-02T00:00:00Z"}'

# list (also grabs the seeded demo tournament id)
curl -s http://localhost:4003/api/v1/tournaments

# join
curl -s -X POST http://localhost:4003/api/v1/tournaments/$ID/join \
  -H 'Content-Type: application/json' -d '{"player_name":"NightOwl"}'

# submit scores (best per player is kept; every call counts one game)
curl -s -X POST http://localhost:4003/api/v1/tournaments/$ID/scores \
  -H 'Content-Type: application/json' -d '{"player_name":"NightOwl","score":15400,"coins":980}'

# leaderboard
curl -s http://localhost:4003/api/v1/tournaments/$ID/leaderboard
```

## Run locally

```bash
# Maven + JDK 21
mvn spring-boot:run

# tests
mvn test
```

## Docker

```bash
docker build -t subb/tournament-java .
docker run --rm -p 4003:4003 subb/tournament-java
```

Multi-stage `maven:3.9-eclipse-temurin-21` (tests run in the build) →
`eclipse-temurin:21-jre-alpine`, non-root user, `HEALTHCHECK` on `/healthz`.
