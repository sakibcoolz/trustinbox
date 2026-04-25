import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import 'token_storage.dart';

// ─── Bot REST Service ────────────────────────────────────
// Customer-facing bot chat via POST /api/bots/{botId}/chat

class BotService {
  BotService._();
  static final _storage = TokenStorage();

  static Future<Map<String, String>> _authHeaders() async {
    final token = await _storage.read('accessToken');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Send a message to an active bot and return the response payload.
  /// Returns null on error (caller should show an error message).
  static Future<Map<String, dynamic>?> chat({
    required String botId,
    required String serviceProviderId,
    required String message,
  }) async {
    final headers = await _authHeaders();
    final url = '${AppConstants.apiBaseUrl}/api/bots/$botId/chat';

    final res = await http.post(
      Uri.parse(url),
      headers: headers,
      body: json.encode({
        'message': message,
        'serviceProviderId': serviceProviderId,
      }),
    );

    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      if (data is Map<String, dynamic>) return data;
    }

    return null;
  }
}
