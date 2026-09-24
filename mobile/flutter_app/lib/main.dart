import 'dart:async';

import 'package:flutter/material.dart';

import 'screens/home_shell.dart';
import 'screens/leaderboard_screen.dart';
import 'screens/play_screen.dart';
import 'screens/profile_screen.dart';
import 'services/api_client.dart';
import 'services/profile_store.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final ApiClient apiClient = ApiClient();
  final ProfileStore profileStore = ProfileStore();
  // Hydrate persisted profile/stats; screens observe the store for updates.
  unawaited(profileStore.load());

  runApp(SubbSurfersApp(apiClient: apiClient, profileStore: profileStore));
}

class SubbSurfersApp extends StatelessWidget {
  const SubbSurfersApp({super.key, required this.apiClient, required this.profileStore});

  final ApiClient apiClient;
  final ProfileStore profileStore;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = ColorScheme.fromSeed(
      seedColor: Colors.amber,
      brightness: Brightness.dark,
    );

    return MaterialApp(
      title: 'SUBB SURFERS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        brightness: Brightness.dark,
      ),
      initialRoute: '/',
      routes: <String, WidgetBuilder>{
        '/': (BuildContext ctx) =>
            HomeShell(apiClient: apiClient, profileStore: profileStore),
        '/play': (BuildContext ctx) => PlayScreen(profileStore: profileStore),
        '/leaderboard': (BuildContext ctx) => LeaderboardScreen(apiClient: apiClient),
        '/profile': (BuildContext ctx) =>
            ProfileScreen(apiClient: apiClient, profileStore: profileStore),
      },
    );
  }
}
