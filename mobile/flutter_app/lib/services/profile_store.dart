import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local, persisted player profile plus aggregate run statistics.
///
/// The embedded web game reports finished runs through the `SubbSurfers`
/// JavaScript channel (see [jsChannelName] and `PlayScreen`). Expected message
/// shape posted by the web build:
///
/// ```json
/// {"type": "run", "score": 1200, "coins": 45, "distance": 678}
/// ```
///
/// Malformed or unrelated messages are ignored, so the game can post freely.
class ProfileStore extends ChangeNotifier {
  ProfileStore();

  static const String jsChannelName = 'SubbSurfers';

  static const String _keyName = 'player_name';
  static const String _keyBestScore = 'best_score';
  static const String _keyTotalRuns = 'total_runs';
  static const String _keyLastCoins = 'last_coins';
  static const String _keyLastDistance = 'last_distance';

  String _name = '';
  int _bestScore = 0;
  int _totalRuns = 0;
  int _lastCoins = 0;
  int _lastDistance = 0;

  String get name => _name;
  int get bestScore => _bestScore;
  int get totalRuns => _totalRuns;
  int get lastCoins => _lastCoins;
  int get lastDistance => _lastDistance;

  /// Hydrates the store from `shared_preferences`. Call once at startup.
  Future<void> load() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    _name = prefs.getString(_keyName) ?? '';
    _bestScore = prefs.getInt(_keyBestScore) ?? 0;
    _totalRuns = prefs.getInt(_keyTotalRuns) ?? 0;
    _lastCoins = prefs.getInt(_keyLastCoins) ?? 0;
    _lastDistance = prefs.getInt(_keyLastDistance) ?? 0;
    notifyListeners();
  }

  /// Persists the display name (trimmed, non-empty allowed for anonymous).
  Future<void> setName(String value) async {
    final String normalized = value.trim();
    if (normalized == _name) return;
    _name = normalized;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyName, _name);
  }

  /// Records a finished run and updates aggregate stats.
  /// Returns `true` when the run set a new personal best.
  Future<bool> recordRun({
    required int score,
    required int coins,
    required int distance,
  }) async {
    _totalRuns += 1;
    _lastCoins = coins;
    _lastDistance = distance;
    final bool isPersonalBest = score > _bestScore;
    if (isPersonalBest) _bestScore = score;
    notifyListeners();

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyTotalRuns, _totalRuns);
    await prefs.setInt(_keyLastCoins, _lastCoins);
    await prefs.setInt(_keyLastDistance, _lastDistance);
    if (isPersonalBest) await prefs.setInt(_keyBestScore, _bestScore);
    return isPersonalBest;
  }

  /// Best-effort parse of a message posted by the embedded web game.
  /// Silently ignores anything that is not a valid run payload.
  void handleJsMessage(String message) {
    try {
      final dynamic decoded = jsonDecode(message);
      if (decoded is! Map<String, dynamic>) return;
      if (decoded['type'] != 'run') return;
      final int score = (decoded['score'] as num?)?.toInt() ?? 0;
      final int coins = (decoded['coins'] as num?)?.toInt() ?? 0;
      final int distance = (decoded['distance'] as num?)?.toInt() ?? 0;
      unawaited(recordRun(score: score, coins: coins, distance: distance));
    } on FormatException {
      // Ignore malformed bridge traffic.
    }
  }
}
