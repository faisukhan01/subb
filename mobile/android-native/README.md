# SUBB SURFERS — native Android client

Kotlin + Jetpack Compose (Material 3) client mirroring the Flutter app:

* **Play** — embedded `WebView` of the hosted web game (URL from `Config.kt`),
  with a `SubbSurfers` JS bridge that records finished runs locally.
* **Leaderboard** — Retrofit + kotlinx-serialization against
  `GET/POST /api/leaderboard`, `StateFlow`-driven UI, medals for the top 3,
  pull-to-refresh.
* **Profile** — `SharedPreferences`-backed player name + stats
  (best score, total runs, last run coins/distance) and one-tap submission of
  the local best.

## Requirements

* Android Studio Ladybug (or newer) with SDK 35
* JDK 17
* AGP 8.7.3 / Kotlin 2.0.21 (pinned in `gradle/libs.versions.toml`)

## Opening in Android Studio

1. `File → Open…` and select `mobile/android-native/`.
2. Android Studio generates the Gradle wrapper locally if missing and syncs.
3. Run the `app` configuration on a device/emulator (API 26+).

## Command line

The wrapper jar is a binary and is **not committed to git**. Generate it once
with a local Gradle (8.9+):

```sh
cd mobile/android-native
gradle wrapper --gradle-version 8.11.1   # Android Studio does this automatically
./gradlew assembleDebug
```

Or skip the wrapper entirely and let Gradle be provisioned for you:

```sh
gradle assembleDebug --no-daemon
```

## API base URL

The base URL is a compile-time constant — `app/src/main/java/com/subb/surfers/Config.kt`:

```kotlin
object Config {
    const val API_BASE_URL = "https://subb-surfers.example.com"
    const val GAME_URL     = "https://subb-surfers.example.com/play"
}
```

For per-environment builds, add a product flavour source set
(e.g. `app/src/staging/java/com/subb/surfers/Config.kt`) that overrides the
constants. The server contract is identical to the Flutter client (see
`mobile/flutter_app/README.md`).

## Game → app bridge

The web game can call `window.SubbSurfers.postRun(json)` inside the WebView:

```json
{"type":"run","score":95200,"coins":1204,"distance":8300}
```

The bridge (`RunStatsStore.Bridge`) updates local stats; malformed payloads are
ignored.

## CI

`.github/workflows/ci.yml` (job `android`) provisions JDK 17 + Gradle via
`gradle/actions/setup-gradle` (no wrapper needed there) and builds
`assembleDebug`, uploading the APK as an artifact.
