import 'package:flutter/material.dart';

import '../models/score_entry.dart';
import '../services/api_client.dart';

/// Global leaderboard view: FutureBuilder over `GET /api/leaderboard`,
/// pull-to-refresh, gold/silver/bronze medals for the top three.
class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  late Future<LeaderboardResponse> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.apiClient.fetchLeaderboard();
  }

  void _refresh() {
    setState(() => _future = widget.apiClient.fetchLeaderboard());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<LeaderboardResponse>(
          future: _future,
          builder: (BuildContext context, AsyncSnapshot<LeaderboardResponse> snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ErrorPane(error: snapshot.error ?? 'Unknown error', onRetry: _refresh);
            }

            final LeaderboardResponse data =
                snapshot.data ?? const LeaderboardResponse(entries: <ScoreEntry>[], total: 0);
            if (data.entries.isEmpty) {
              return _EmptyPane(onRetry: _refresh);
            }

            return ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: data.entries.length,
              itemBuilder: (BuildContext context, int index) {
                final ScoreEntry entry = data.entries[index];
                return ListTile(
                  leading: _rankBadge(context, entry.rank),
                  title: Text(
                    entry.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text('${entry.coins} coins · ${entry.distance} m'),
                  trailing: Text(
                    '${entry.score}',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _rankBadge(BuildContext context, int rank) {
    switch (rank) {
      case 1:
        return const Icon(Icons.emoji_events, size: 32, color: Color(0xFFFFD24A)); // gold
      case 2:
        return const Icon(Icons.emoji_events, size: 32, color: Color(0xFFC7CDD6)); // silver
      case 3:
        return const Icon(Icons.emoji_events, size: 32, color: Color(0xFFCD8C5C)); // bronze
      default:
        return CircleAvatar(radius: 14, child: Text('$rank'));
    }
  }
}

class _ErrorPane extends StatelessWidget {
  const _ErrorPane({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: <Widget>[
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 12),
              Text(
                'Could not load the leaderboard',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '$error',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: <Widget>[
              const Icon(Icons.emoji_events_outlined, size: 48),
              const SizedBox(height: 12),
              Text(
                'No scores yet — be the first!',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
