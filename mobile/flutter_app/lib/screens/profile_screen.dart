import 'package:flutter/material.dart';

import '../models/score_entry.dart';
import '../services/api_client.dart';
import '../services/profile_store.dart';

/// Local player profile: editable display name plus stats persisted with
/// `shared_preferences` (best score, total runs, last run coins/distance).
/// Offers one-tap submission of the local best to the global leaderboard.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.apiClient, required this.profileStore});

  final ApiClient apiClient;
  final ProfileStore profileStore;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _nameController;
  final FocusNode _nameFocus = FocusNode();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profileStore.name);
    widget.profileStore.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    widget.profileStore.removeListener(_onStoreChanged);
    _nameController.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  void _onStoreChanged() {
    if (!mounted) return;
    // Only mirror externally-driven name changes; never fight the keyboard.
    if (!_nameFocus.hasFocus && _nameController.text != widget.profileStore.name) {
      _nameController.text = widget.profileStore.name;
    }
    setState(() {});
  }

  Future<void> _saveName() async {
    await widget.profileStore.setName(_nameController.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            widget.profileStore.name.isEmpty ? 'Name cleared — you will submit as anonymous.' : 'Name saved.',
          ),
        ),
      );
  }

  Future<void> _submitBest() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final ScaffoldMessengerState messenger = ScaffoldMessenger.of(context);
    final ProfileStore store = widget.profileStore;
    try {
      final ScoreSubmissionResult result = await widget.apiClient.submitScore(
        name: store.name,
        score: store.bestScore,
        coins: store.lastCoins,
        distance: store.lastDistance,
      );
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Best score submitted — global rank #${result.rank}, personal best rank #${result.best}.',
          ),
        ),
      );
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ProfileStore store = widget.profileStore;
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          TextField(
            controller: _nameController,
            focusNode: _nameFocus,
            decoration: InputDecoration(
              labelText: 'Player name',
              hintText: 'DashKing',
              prefixIcon: const Icon(Icons.badge_outlined),
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                tooltip: 'Save name',
                icon: const Icon(Icons.check),
                onPressed: _saveName,
              ),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (String _) => _saveName(),
          ),
          const SizedBox(height: 20),
          Text('Local stats', style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: _StatCard(
                  icon: Icons.emoji_events,
                  label: 'Best score',
                  value: '${store.bestScore}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.directions_run,
                  label: 'Total runs',
                  value: '${store.totalRuns}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: _StatCard(
                  icon: Icons.monetization_on,
                  label: 'Last run coins',
                  value: '${store.lastCoins}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.social_distance,
                  label: 'Last run distance',
                  value: '${store.lastDistance} m',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _submitting ? null : _submitBest,
            icon: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.cloud_upload),
            label: const Text('Submit best score to leaderboard'),
          ),
          const SizedBox(height: 8),
          Text(
            'Runs recorded in the game are synced automatically; this button '
            're-submits your current local best.',
            style: theme.textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Text(value, style: theme.textTheme.headlineSmall),
            const SizedBox(height: 2),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
