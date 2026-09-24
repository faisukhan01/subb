# anticheat-csharp

.NET 8 minimal API that validates SUBB SURFERS score submissions against the
shared anti-cheat heuristic. Deployed beside the Go leaderboard service; both
use identical constants, and this service also publishes them for transparency.

## Endpoints

| Method | Path                | Description                                        | Codes |
| ------ | ------------------- | -------------------------------------------------- | ----- |
| GET    | `/healthz`          | Liveness probe                                     | 200   |
| GET    | `/api/v1/constants` | The anti-cheat thresholds (transparency)           | 200   |
| POST   | `/api/v1/validate`  | Validate one run; 422 + reason when it fails       | 200/422/400 |

JSON is snake_case on the wire (`player_name`, `score`, `distance`, `coins` →
`valid`, `reason`, `confidence`), matching the Go service contract.

### Example

```bash
curl -s -X POST http://localhost:4004/api/v1/validate \
  -H 'Content-Type: application/json' \
  -d '{"player_name":"NightOwl","score":41200,"distance":5300,"coins":3180}'
```

```json
{ "valid": true, "reason": null, "confidence": 0.8304 }
```

A rejected submission:

```json
{ "valid": false, "reason": "score_too_high", "confidence": 1.0 }
```

`confidence` is a 0..1 measure of how comfortably the run passes (share of the
tightest budget still unused) — or, when invalid, how far beyond the limit it
went (capped at 1.0).

## Anti-cheat heuristic (shared contract)

Identical constants live in `Validation/ScoreValidator.cs` (this service),
`services/leaderboard-go/internal/model/score.go` and the web client. Checks
run in fixed order (score → coins → distance):

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

Reasons: `score_too_high` | `coins_too_high` | `distance_too_low`.

## Tests

xunit tests live in `Validation/ScoreValidatorTests.cs` and pin normal runs,
each rejection reason, and every exact boundary (values *at* the limits pass,
one over fails):

```bash
dotnet test
```

## Run locally

```bash
dotnet run                                    # listens on :4004
PORT=5005 dotnet run                          # custom port
```

## Docker

```bash
docker build -t subb/anticheat-csharp .
docker run --rm -p 4004:4004 subb/anticheat-csharp
```

Multi-stage `sdk:8.0` (tests run during the build) → `aspnet:8.0`, non-root
`app` user, `HEALTHCHECK` on `/healthz`.
