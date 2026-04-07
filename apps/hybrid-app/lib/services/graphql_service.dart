import 'dart:convert';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter/material.dart';
import '../config/constants.dart';
import 'token_storage.dart';

// ─── GraphQL Client Setup ───────────────────────────────
// Mirrors: apps/web/src/lib/apollo-client.ts

class GraphQLService {
  GraphQLService._();

  static final _storage = TokenStorage();

  static ValueNotifier<GraphQLClient>? _clientNotifier;

  static ValueNotifier<GraphQLClient> get client {
    _clientNotifier ??= ValueNotifier(_buildClient());
    return _clientNotifier!;
  }

  static GraphQLClient _buildClient() {
    final httpLink = HttpLink(AppConstants.graphqlUrl);

    final authLink = AuthLink(getToken: () async {
      final token = await _storage.read('accessToken');
      return token != null ? 'Bearer $token' : null;
    });

    final link = authLink.concat(httpLink);

    return GraphQLClient(
      link: link,
      cache: GraphQLCache(store: InMemoryStore()),
    );
  }

  /// Rebuild the client (call after login/logout to pick up new tokens)
  static void resetClient() {
    _clientNotifier?.value = _buildClient();
  }

  /// Helper to decode JWT payload
  static Map<String, dynamic>? decodeJwtPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return json.decode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Check if token is expired
  static bool isTokenExpired(String token) {
    final payload = decodeJwtPayload(token);
    if (payload == null || payload['exp'] == null) return true;
    final expMs = (payload['exp'] as int) * 1000;
    return expMs < DateTime.now().millisecondsSinceEpoch;
  }

  /// Check if token expires within bufferMs
  static bool isTokenExpiringSoon(String token, {int bufferMs = 120000}) {
    final payload = decodeJwtPayload(token);
    if (payload == null || payload['exp'] == null) return true;
    final expMs = (payload['exp'] as int) * 1000;
    return expMs - DateTime.now().millisecondsSinceEpoch < bufferMs;
  }
}
