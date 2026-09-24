import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/score_entry.dart';

/// Base class for every leaderboard API failure, so UI layers can react
/// precisely (show retry vs. show message vs. stay silent).
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.cause});

  final String message;
  final int? statusCode;
  final Object? cause;

  /// True when the request never produced a server response
  /// (offline, DNS failure, timeout...).
  bool get isNetworkError => statusCode == null;

  @override
  String toString() => 'ApiException(status: $statusCode, message: $message)';
}

/// Device is offline, the server is unreachable, or the call timed out.
class NetworkException extends ApiException {
  const NetworkException(super.message, {super.cause});
}

/// Response body could not be decoded into the expected shape.
class BadResponseException extends ApiException {
  const BadResponseException(super.message, {super.statusCode, super.cause});
}

/// 4xx — the request was rejected (invalid payload, validation, etc.).
class ClientException extends ApiException {
  const ClientException(super.message, {required int super.statusCode});
}

/// 5xx — server-side failure.
class ServerException extends ApiException {
  const ServerException(super.message, {required int super.statusCode});
}

/// Thin typed HTTP client for the SUBB SURFERS leaderboard API.
///
/// The base URL is a build-time constant (`kApiBaseUrl`, see `lib/config.dart`)
/// and every call is bounded by a timeout so the UI never hangs forever.
class ApiClient {
  ApiClient({http.Client? client, Uri? baseUrl, Duration? timeout})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? Uri.parse(kApiBaseUrl),
        _timeout = timeout ?? const Duration(seconds: 12);

  final http.Client _client;
  final Uri _baseUrl;
  final Duration _timeout;

  static const Map<String, String> _jsonHeaders = <String, String>{
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Uri _leaderboardUri([Map<String, String>? query]) {
    final String basePath = _baseUrl.path.endsWith('/')
        ? _baseUrl.path.substring(0, _baseUrl.path.length - 1)
        : _baseUrl.path;
    return _baseUrl.replace(path: '$basePath/api/leaderboard', queryParameters: query);
  }

  /// Fetches the global leaderboard (default: top 20 rows).
  Future<LeaderboardResponse> fetchLeaderboard({int limit = 20}) async {
    final http.Response response;
    try {
      response = await _client
          .get(_leaderboardUri(<String, String>{'limit': '$limit'}), headers: _jsonHeaders)
          .timeout(_timeout);
    } on TimeoutException catch (e) {
      throw NetworkException('Leaderboard request timed out.', cause: e);
    } on http.ClientException catch (e) {
      throw NetworkException('Could not reach the leaderboard service.', cause: e);
    }

    return _decode(
      response,
      onSuccess: (String body) {
        try {
          return LeaderboardResponse.fromJson(jsonDecode(body) as Map<String, dynamic>);
        } on FormatException catch (e) {
          throw BadResponseException('Malformed leaderboard payload.', cause: e);
        } on TypeError catch (e) {
          throw BadResponseException('Unexpected leaderboard payload shape.', cause: e);
        }
      },
    );
  }

  /// Submits a finished run. Returns the assigned global rank and the
  /// player's best rank so far.
  Future<ScoreSubmissionResult> submitScore({
    required String name,
    required int score,
    required int coins,
    required int distance,
  }) async {
    final Map<String, dynamic> payload = <String, dynamic>{
      'name': name.isEmpty ? 'Anonymous Surfer' : name,
      'score': score,
      'coins': coins,
      'distance': distance,
    };

    final http.Response response;
    try {
      response = await _client
          .post(_leaderboardUri(), headers: _jsonHeaders, body: jsonEncode(payload))
          .timeout(_timeout);
    } on TimeoutException catch (e) {
      throw NetworkException('Score submission timed out.', cause: e);
    } on http.ClientException catch (e) {
      throw NetworkException('Could not reach the leaderboard service.', cause: e);
    }

    return _decode(
      response,
      onSuccess: (String body) {
        try {
          return ScoreSubmissionResult.fromJson(jsonDecode(body) as Map<String, dynamic>);
        } on FormatException catch (e) {
          throw BadResponseException('Malformed submission payload.', cause: e);
        } on TypeError catch (e) {
          throw BadResponseException('Unexpected submission payload shape.', cause: e);
        }
      },
    );
  }

  T _decode<T>(http.Response response, {required T Function(String body) onSuccess}) {
    final String body = response.body;
    switch (response.statusCode) {
      case 200:
      case 201:
        return onSuccess(body);
      case 400:
        throw ClientException(
          _errorMessage(body, fallback: 'Invalid request.'),
          statusCode: 400,
        );
      case 422:
        throw ClientException(
          _errorMessage(body, fallback: 'Validation failed.'),
          statusCode: 422,
        );
      case >= 500:
        throw ServerException(
          'Leaderboard service error (${response.statusCode}).',
          statusCode: response.statusCode,
        );
      default:
        throw ApiException(
          'Unexpected status ${response.statusCode}.',
          statusCode: response.statusCode,
        );
    }
  }

  String _errorMessage(String body, {required String fallback}) {
    try {
      final dynamic decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic> && decoded['error'] is String) {
        return decoded['error'] as String;
      }
    } on FormatException {
      // Not JSON — fall through to the fallback message.
    }
    return fallback;
  }

  /// Closes the underlying HTTP client. Call only when the client will no
  /// longer be used (e.g. app teardown in tests).
  void dispose() => _client.close();
}
