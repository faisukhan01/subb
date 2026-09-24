import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../config.dart';
import '../services/profile_store.dart';

/// Hosts the published web build of SUBB SURFERS inside an embedded WebView.
///
/// The web game can report finished runs back to this app by posting to the
/// `SubbSurfers` JavaScript channel:
///
/// ```js
/// SubbSurfers.postMessage(JSON.stringify({type:'run', score:1200, coins:45, distance:678}));
/// ```
class PlayScreen extends StatefulWidget {
  const PlayScreen({super.key, required this.profileStore});

  final ProfileStore profileStore;

  @override
  State<PlayScreen> createState() => _PlayScreenState();
}

class _PlayScreenState extends State<PlayScreen> {
  late final WebViewController _controller;
  double _progress = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF101418))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) => setState(() {
            _loading = true;
          }),
          onProgress: (int value) => setState(() => _progress = value / 100.0),
          onPageFinished: (String url) => setState(() {
            _loading = false;
            _progress = 1;
          }),
          onWebResourceError: (WebResourceError error) => setState(() => _loading = false),
        ),
      )
      ..addJavaScriptChannel(
        ProfileStore.jsChannelName,
        onMessageReceived: (JavaScriptMessage message) =>
            widget.profileStore.handleJsMessage(message.message),
      )
      ..loadRequest(Uri.parse(kGameUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SUBB SURFERS'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Reload game',
            icon: const Icon(Icons.refresh),
            onPressed: _controller.reload,
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          WebViewWidget(controller: _controller),
          if (_loading)
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: LinearProgressIndicator(
                value: _progress <= 0 ? null : _progress,
                minHeight: 3,
              ),
            ),
          if (_loading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
