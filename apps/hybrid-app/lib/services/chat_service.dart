import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import 'token_storage.dart';

// ─── Chat REST Service ──────────────────────────────────
// Mirrors: apps/web/src/lib/chat-context.tsx REST calls
// Uses the same /api/conversations endpoints as the web app.

class ChatService {
  ChatService._();
  static final _storage = TokenStorage();

  static Future<Map<String, String>> _authHeaders() async {
    final token = await _storage.read('accessToken');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ─── List Conversations ──────────────────────────────
  static Future<List<Map<String, dynamic>>> listConversations() async {
    final headers = await _authHeaders();
    final res = await http.get(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations'),
      headers: headers,
    );
    if (res.statusCode != 200) return [];
    final data = json.decode(res.body);
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  // ─── Get Conversation By ID ──────────────────────────
  static Future<Map<String, dynamic>?> getConversation(String id) async {
    final headers = await _authHeaders();
    final res = await http.get(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations/$id'),
      headers: headers,
    );
    if (res.statusCode != 200) return null;
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // ─── List Messages ───────────────────────────────────
  static Future<List<Map<String, dynamic>>> listMessages(
    String conversationId, {
    int limit = 50,
    String? before,
  }) async {
    final headers = await _authHeaders();
    var url = '${AppConstants.apiBaseUrl}/api/conversations/$conversationId/messages?limit=$limit';
    if (before != null) url += '&before=${Uri.encodeComponent(before)}';
    final res = await http.get(Uri.parse(url), headers: headers);
    if (res.statusCode != 200) return [];
    final data = json.decode(res.body);
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  // ─── Send Message ────────────────────────────────────
  static Future<Map<String, dynamic>?> sendMessage(
    String conversationId,
    String content, {
    String messageType = 'TEXT',
    String? replyToId,
  }) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations/$conversationId/messages'),
      headers: headers,
      body: json.encode({
        'content': content,
        'messageType': messageType,
        if (replyToId != null) 'replyToId': replyToId,
      }),
    );
    if (res.statusCode != 201 && res.statusCode != 200) return null;
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // ─── Create Conversation ─────────────────────────────
  static Future<Map<String, dynamic>?> createConversation(
    String participantId, {
    String? message,
  }) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations'),
      headers: headers,
      body: json.encode({
        'type': 'DIRECT',
        'participantId': participantId,
        if (message != null) 'message': message,
      }),
    );
    if (res.statusCode != 201 && res.statusCode != 200) return null;
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // ─── Edit Message ────────────────────────────────────
  static Future<bool> editMessage(String messageId, String content) async {
    final headers = await _authHeaders();
    final res = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/api/messages/$messageId'),
      headers: headers,
      body: json.encode({'content': content}),
    );
    return res.statusCode == 200;
  }

  // ─── Delete Message ──────────────────────────────────
  static Future<bool> deleteMessage(String messageId) async {
    final headers = await _authHeaders();
    final res = await http.delete(
      Uri.parse('${AppConstants.apiBaseUrl}/api/messages/$messageId'),
      headers: headers,
    );
    return res.statusCode == 200 || res.statusCode == 204;
  }

  // ─── Mark Conversation as Read ───────────────────────
  static Future<void> markAsRead(String conversationId) async {
    final headers = await _authHeaders();
    await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations/$conversationId/read'),
      headers: headers,
    );
  }
}
