import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/constants.dart';
import '../models/conversation.dart';
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
  // The web app sends `attachmentIds` (array of upload IDs returned by
  // /api/upload) and an optional `forwardedFrom` envelope alongside the
  // standard fields. We mirror that contract here.
  static Future<Map<String, dynamic>?> sendMessage(
    String conversationId,
    String content, {
    String messageType = 'TEXT',
    String? replyToId,
    List<String>? attachmentIds,
    Map<String, dynamic>? forwardedFrom,
  }) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/conversations/$conversationId/messages'),
      headers: headers,
      body: json.encode({
        'content': content,
        'messageType': messageType,
        if (replyToId != null) 'replyToId': replyToId,
        if (attachmentIds != null && attachmentIds.isNotEmpty)
          'attachmentIds': attachmentIds,
        if (forwardedFrom != null) 'forwardedFrom': forwardedFrom,
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

  // ─── Create / Get Bot Conversation ───────────────────
  // Bots are first-class chat participants (see migration 026).  This calls
  // the dedicated gateway endpoint, which auto-provisions the bot's shadow
  // user / XMPP JID and bypasses the friendship requirement.
  static Future<Map<String, dynamic>?> createBotConversation(String botId) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/bots/conversations'),
      headers: headers,
      body: json.encode({'botId': botId}),
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

  // ─── Upload File / Attachment ────────────────────────
  // POST /api/upload — multipart field name `file`. Returns
  // {id, fileName, fileType, fileSize, url}. Throws on transport failure;
  // returns null on a non-2xx response so callers can show a toast.
  static Future<Attachment?> uploadFile(File file, {String? contentType}) async {
    final token = await _storage.read('accessToken');
    if (token == null) return null;

    final uri = Uri.parse('${AppConstants.apiBaseUrl}/api/upload');
    final req = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath(
        'file',
        file.path,
        contentType: contentType != null ? MediaType.parse(contentType) : null,
      ));

    final streamed = await req.send();
    final body = await streamed.stream.bytesToString();
    if (streamed.statusCode != 200 && streamed.statusCode != 201) {
      return null;
    }
    final data = json.decode(body) as Map<String, dynamic>;
    return Attachment.fromJson(data);
  }

  // ─── Reactions ───────────────────────────────────────
  // POST   /api/messages/:id/reactions      body: {"emoji": "👍"}
  // DELETE /api/messages/:id/reactions?emoji=👍
  static Future<bool> addReaction(String messageId, String emoji) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/api/messages/$messageId/reactions'),
      headers: headers,
      body: json.encode({'emoji': emoji}),
    );
    return res.statusCode == 200 || res.statusCode == 201;
  }

  static Future<bool> removeReaction(String messageId, String emoji) async {
    final token = await _storage.read('accessToken');
    if (token == null) return false;
    final res = await http.delete(
      Uri.parse(
        '${AppConstants.apiBaseUrl}/api/messages/$messageId/reactions'
        '?emoji=${Uri.encodeQueryComponent(emoji)}',
      ),
      headers: {'Authorization': 'Bearer $token'},
    );
    return res.statusCode == 200 || res.statusCode == 204;
  }

  // ─── Forward Message ─────────────────────────────────
  // No dedicated /forward endpoint — web posts a regular message with the
  // original `content` and a `forwardedFrom: {senderName}` envelope.
  static Future<Map<String, dynamic>?> forwardMessage(
    String targetConversationId,
    String content, {
    required String fromSenderName,
    List<String>? attachmentIds,
  }) {
    return sendMessage(
      targetConversationId,
      content,
      attachmentIds: attachmentIds,
      forwardedFrom: {'senderName': fromSenderName},
    );
  }
}
