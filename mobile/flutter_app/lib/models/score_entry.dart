/// Data models mirroring the SUBB SURFERS leaderboard HTTP contract.
///
/// Wire format (see `lib/config.dart`):
/// * `GET /api/leaderboard`      -> `LeaderboardResponse`
/// * `POST /api/leaderboard`     -> `ScoreSubmissionResult`
library;

/// A single row of the global leaderboard.
class ScoreEntry {
  const ScoreEntry({
    required this.rank,
    required this.name,
    required this.score,
    required this.coins,
    required this.distance,
  });

  /// 1-based position on the board.
  final int rank;

  /// Display name chosen by the player.
  final String name;

  /// Final score for the run.
  final int score;

  /// Coins collected during the run.
  final int coins;

  /// Distance travelled in metres.
  final int distance;

  factory ScoreEntry.fromJson(Map<String, dynamic> json) => ScoreEntry(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        name: json['name'] as String? ?? 'Unknown',
        score: (json['score'] as num?)?.toInt() ?? 0,
        coins: (json['coins'] as num?)?.toInt() ?? 0,
        distance: (json['distance'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'rank': rank,
        'name': name,
        'score': score,
        'coins': coins,
        'distance': distance,
      };

  @override
  String toString() => 'ScoreEntry(#$rank $name score:$score coins:$coins distance:$distance)';
}

/// Envelope for `GET /api/leaderboard`:
/// `{"entries":[...], "total": 1234}`
class LeaderboardResponse {
  const LeaderboardResponse({required this.entries, required this.total});

  /// Top rows, already sorted by score descending.
  final List<ScoreEntry> entries;

  /// Total number of submitted scores on the server.
  final int total;

  factory LeaderboardResponse.fromJson(Map<String, dynamic> json) => LeaderboardResponse(
        entries: (json['entries'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(ScoreEntry.fromJson)
            .toList(growable: false),
        total: (json['total'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'entries': entries.map((ScoreEntry e) => e.toJson()).toList(growable: false),
        'total': total,
      };
}

/// Response for `POST /api/leaderboard`: `{"rank": n, "best": n}`.
class ScoreSubmissionResult {
  const ScoreSubmissionResult({required this.rank, required this.best});

  /// Global rank assigned to the submitted score.
  final int rank;

  /// The player's best rank across all submissions.
  final int best;

  factory ScoreSubmissionResult.fromJson(Map<String, dynamic> json) => ScoreSubmissionResult(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        best: (json['best'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{'rank': rank, 'best': best};
}
