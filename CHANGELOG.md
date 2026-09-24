# Changelog

All notable changes to SUBB SURFERS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/).

## [1.0.0] — 2026-09-24

### Added — Web game (flagship)
- Full 3D endless runner: three-lane subway, jump/roll/lane-dodge mechanics,
  walkable train roofs, oncoming trains with headlight telegraph.
- Three original characters (Max, Zoe, Rex) as fully procedural low-poly rigs
  with run/jump/roll/fly/board/caught animation sets — zero skeletal assets.
- Power-ups: Coin Magnet, Jetpack (sky coin trails), 2× Multiplier,
  Super Sneakers, Hoverboard (absorbs one crash).
- Chained mission system that raises the score multiplier (up to ×5, ×10 with
  a 2× pickup).
- Inspector + dog chase framing: intro chase, per-run follow, grab on wipeout.
- Procedural everything: CanvasTexture-based train liveries, building facades,
  graffiti billboards, power-up icons, sky gradient; WebAudio-synthesized SFX
  and a scheduled chiptune music loop — the client ships no binary assets.
- Fair-run guarantee: the first ~60 m of every run is obstacle-free.
- Keyboard (arrows/WASD/Space), touch swipes and tap-to-jump input; pause with
  resume countdown; auto-pause on tab switch.

### Added — Backend
- Leaderboard + player profile API (Next.js route handlers, Prisma/SQLite)
  with anti-cheat validated submissions and run history.
- Go leaderboard v2 service (Gin + Prometheus metrics, thread-safe store,
  graceful shutdown, unit tests).
- Python MLOps difficulty service (FastAPI) with a real trained
  GradientBoosting model (R² 0.91) + heuristic fallback.
- Java Spring Boot tournaments service with lifecycle scheduling.
- C# .NET 8 anti-cheat service mirroring the shared validation heuristic.
- C++17 `runner-core` hot-path library (jump solver, Catmull-Rom coin splines)
  with a 1M-sample benchmark (~12.5 ns/sample).

### Added — Mobile
- Flutter client (Material 3): WebView gameplay, leaderboard, local profile.
- Kotlin/Jetpack Compose Android client: Retrofit + kotlinx.serialization,
  ViewModel/StateFlow, version-catalog Gradle setup.

### Added — Engines
- Unity 2022.3 C# source: CharacterController player, pooled world spawner,
  score/mission/powerup systems, new Input System integration, TMP HUD.
- Unreal Engine 5.4 C++ source: Enhanced Input character, train actors,
  pooled chunk spawner, endless game mode.

### Added — DevOps / MLOps
- GitHub Actions: 9-job CI matrix, tag-driven Docker CD to GHCR, weekly ML
  retraining workflow with auto-committed model artifacts.
- Docker Compose full-stack with nginx gateway, Prometheus + Grafana.
- Kubernetes manifests (deployments, services, ingress, HPA) and a Terraform
  ECS/Fargate module.

[1.0.0]: https://github.com/faisukhan01/subb/releases/tag/v1.0.0
