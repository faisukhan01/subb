import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/profile_store.dart';
import 'leaderboard_screen.dart';
import 'play_screen.dart';
import 'profile_screen.dart';

/// Root navigation shell.
///
/// Material 3 bottom navigation with three destinations:
/// Play (WebView game) / Leaderboard / Profile.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.apiClient, required this.profileStore});

  final ApiClient apiClient;
  final ProfileStore profileStore;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const List<String> _labels = <String>['Play', 'Leaderboard', 'Profile'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: <Widget>[
          PlayScreen(profileStore: widget.profileStore),
          LeaderboardScreen(apiClient: widget.apiClient),
          ProfileScreen(apiClient: widget.apiClient, profileStore: widget.profileStore),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (int i) => setState(() => _index = i),
        destinations: <Widget>[
          NavigationDestination(
            icon: const Icon(Icons.sports_esports_outlined),
            selectedIcon: const Icon(Icons.sports_esports),
            label: _labels[0],
          ),
          NavigationDestination(
            icon: const Icon(Icons.emoji_events_outlined),
            selectedIcon: const Icon(Icons.emoji_events),
            label: _labels[1],
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: _labels[2],
          ),
        ],
      ),
    );
  }
}
