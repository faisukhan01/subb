# SUBB SURFERS — Flutter companion app

Material 3 (dark, amber-seeded) client that:

* hosts the published **web build** of the game in an embedded WebView (`Play`),
* shows the **global leaderboard** with medals and pull-to-refresh,
* keeps a **local profile** (player name, best score, total runs) with
  `shared_preferences` and submits the local best to the leaderboard API.

The repo intentionally ships **only `lib/` + `pubspec.yaml`** (no `android/`,
`ios/`, … platform folders) to keep the tree clean.

## Requirements

* Flutter >= 3.24 (Dart >= 3.5)

## Setup

Platform folders are generated locally and never committed:

```sh
cd mobile/flutter_app
flutter create . --platforms android,ios --org com.subb   # generates android/, ios/, test/
flutter pub get
flutter run
```

> `flutter create .` also drops a template `test/widget_test.dart` that
> references a template `MyApp` class. Delete that file (or replace it with a
> real test) before running `flutter test` / `flutter analyze`.

## Build-time configuration (`--dart-define`)

Both endpoints are compile-time constants in `lib/config.dart` and can be
overridden without touching code:

| Constant       | dart-define    | Default                                |
| -------------- | -------------- | -------------------------------------- |
| `kApiBaseUrl`  | `API_BASE_URL` | `https://subb-surfers.example.com`     |
| `kGameUrl`     | `GAME_URL`     | `https://subb-surfers.example.com/play`|

Examples:

```sh
# Local backend on your LAN
flutter run \
  --dart-define=API_BASE_URL=http://192.168.1.20:3000 \
  --dart-define=GAME_URL=http://192.168.1.20:3000/play

# Release build against production
flutter build apk --release \
  --dart-define=API_BASE_URL=https://subb-surfers.example.com \
  --dart-define=GAME_URL=https://subb-surfers.example.com/play
```

## Game → app bridge

The web game can report finished runs to the app via the JavaScript channel
`SubbSurfers`; the app then updates local stats automatically:

```js
SubbSurfers.postMessage(
  JSON.stringify({ type: 'run', score: 95200, coins: 1204, distance: 8300 })
);
```

Anything malformed is ignored, so it is safe to call unconditionally.

## CI

GitHub Actions (`.github/workflows/ci.yml`, job `flutter`) generates the
platform scaffolding with `flutter create . --platforms android`, runs
`flutter analyze` and builds a **debug APK** artifact on every push to `main`
and on PRs — no local toolchain required to get a runnable build.

## API contract

* `GET  {API_BASE_URL}/api/leaderboard` →
  `{"entries":[{"rank":1,"name":"DashKing","score":95200,"coins":1204,"distance":8300}],"total":1234}`
* `POST {API_BASE_URL}/api/leaderboard` with body
  `{"name":"...","score":123,"coins":45,"distance":678}` →
  `{"rank":42,"best":7}`
