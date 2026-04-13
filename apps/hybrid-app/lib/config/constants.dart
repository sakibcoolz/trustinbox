import 'package:flutter/foundation.dart' show kIsWeb;

// ─── App Constants ──────────────────────────────────────

class AppConstants {
  AppConstants._();

  static const String appName = 'TrustInbox';

  // API endpoints — override via environment or build config
  // On web, derive the API host from the browser URL so it works
  // across localhost, Tailscale, tunnels, etc.
  static String get apiBaseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) {
      final base = Uri.base;
      return '${base.scheme}://${base.host}:4000';
    }
    return 'http://localhost-0.taildb081d.ts.net:4000';
  }

  static String get graphqlUrl => '$apiBaseUrl/graphql';
  static String get sseUrl => '$apiBaseUrl/api/notifications/stream';

  // Auth endpoints
  static String get loginUrl => '$apiBaseUrl/api/auth/login';
  static String get registerUrl => '$apiBaseUrl/api/auth/register';
  static String get refreshUrl => '$apiBaseUrl/api/auth/refresh';

  // Token refresh buffer (2 minutes before expiry)
  static const int tokenRefreshBufferMs = 120000;

  // Pagination
  static const int defaultPageSize = 20;

  // SSE reconnect
  static const int sseInitialRetryMs = 3000;
  static const int sseMaxRetryMs = 30000;

  // Theme storage key
  static const String themeStorageKey = 'trustinbox:theme';
}
