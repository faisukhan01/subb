/// Build-time configuration for the SUBB SURFERS companion app.
///
/// Every constant below can be overridden at compile time with `--dart-define`,
/// so the same binary can target local, staging and production backends:
///
/// ```sh
/// # Local development against a machine on your LAN
/// flutter run \
///   --dart-define=API_BASE_URL=http://192.168.1.20:3000 \
///   --dart-define=GAME_URL=http://192.168.1.20:3000/play
///
/// # Release build pointing at production
/// flutter build apk --release \
///   --dart-define=API_BASE_URL=https://subb-surfers.example.com \
///   --dart-define=GAME_URL=https://subb-surfers.example.com/play
/// ```
///
/// Defaults exist so a plain `flutter run` always produces a working app.
library;

/// Base URL of the leaderboard HTTP API (no trailing slash).
///
/// API contract:
/// * `GET  {base}/api/leaderboard` -> `{"entries":[{"rank":1,"name":"...","score":1,"coins":1,"distance":1}],"total":n}`
/// * `POST {base}/api/leaderboard` -> `{"rank":n,"best":n}`
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://subb-surfers.example.com',
);

/// Fully-qualified URL of the hosted web game loaded inside the WebView.
const String kGameUrl = String.fromEnvironment(
  'GAME_URL',
  defaultValue: 'https://subb-surfers.example.com/play',
);
