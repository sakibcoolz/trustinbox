import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/notification.dart';

// ─── Notification Provider (SSE) ────────────────────────
// Mirrors: apps/web/src/lib/notification-context.tsx

class NotificationProvider extends ChangeNotifier {
  final String? Function() _getToken;

  List<AppNotification> _notifications = [];
  http.Client? _sseClient;
  bool _connected = false;
  int _retryDelay = AppConstants.sseInitialRetryMs;

  // Listeners for SSE events
  final List<void Function(Map<String, dynamic>)> _chatMessageListeners = [];
  final List<void Function(Map<String, dynamic>)> _presenceListeners = [];
  final List<VoidCallback> _friendListeners = [];

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _notifications.where((n) => !n.read).length;
  bool get connected => _connected;

  NotificationProvider({required String? Function() getToken}) : _getToken = getToken;

  // ─── Fetch Notifications (REST) ──────────────────────
  Future<void> fetchNotifications() async {
    final token = _getToken();
    if (token == null) return;

    try {
      final res = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/api/notifications'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as List<dynamic>;
        _notifications = data.map((n) => AppNotification.fromJson(n as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (_) {
      // silently fail — matches web behavior
    }
  }

  // ─── Mark All Read ───────────────────────────────────
  Future<void> markAllRead() async {
    final token = _getToken();
    if (token == null) return;

    try {
      await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/notifications/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'all': true}),
      );
      _notifications = _notifications.map((n) => n.copyWith(read: true)).toList();
      notifyListeners();
    } catch (_) {}
  }

  // ─── Mark Specific Read ──────────────────────────────
  Future<void> markRead(List<String> ids) async {
    final token = _getToken();
    if (token == null) return;

    try {
      await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/notifications/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'ids': ids}),
      );
      _notifications = _notifications
          .map((n) => ids.contains(n.id) ? n.copyWith(read: true) : n)
          .toList();
      notifyListeners();
    } catch (_) {}
  }

  // ─── SSE Connection ──────────────────────────────────
  void connectSSE() {
    final token = _getToken();
    if (token == null) return;

    _disconnectSSE();
    _startSSE(token);
  }

  void _startSSE(String token) async {
    try {
      final request = http.Request(
        'GET',
        Uri.parse('${AppConstants.sseUrl}?token=$token'),
      );
      _sseClient = http.Client();
      final response = await _sseClient!.send(request);

      _connected = true;
      _retryDelay = AppConstants.sseInitialRetryMs;
      notifyListeners();

      String buffer = '';

      response.stream.transform(utf8.decoder).listen(
        (chunk) {
          buffer += chunk;
          // Parse SSE events from buffer
          while (buffer.contains('\n\n')) {
            final idx = buffer.indexOf('\n\n');
            final rawEvent = buffer.substring(0, idx);
            buffer = buffer.substring(idx + 2);
            _handleSSEEvent(rawEvent);
          }
        },
        onError: (_) {
          _reconnectSSE();
        },
        onDone: () {
          _reconnectSSE();
        },
      );
    } catch (_) {
      _reconnectSSE();
    }
  }

  void _handleSSEEvent(String rawEvent) {
    String? eventType;
    String? data;

    for (final line in rawEvent.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim();
      }
    }

    if (data == null) return;

    try {
      final parsed = json.decode(data) as Map<String, dynamic>;

      switch (eventType) {
        case 'notification':
          final notif = AppNotification.fromJson(parsed);
          _notifications = [notif, ..._notifications];

          if (notif.category == 'FRIEND_ACCEPTED' || notif.category == 'FRIEND_REQUEST') {
            for (final cb in _friendListeners) {
              cb();
            }
          }
          notifyListeners();
          break;

        case 'chat_message':
          for (final cb in _chatMessageListeners) {
            cb(parsed);
          }
          break;

        case 'presence_update':
          for (final cb in _presenceListeners) {
            cb(parsed);
          }
          break;
      }
    } catch (_) {}
  }

  void _reconnectSSE() {
    _connected = false;
    notifyListeners();
    _sseClient?.close();
    _sseClient = null;

    Future.delayed(Duration(milliseconds: _retryDelay), () {
      _retryDelay = (_retryDelay * 2).clamp(0, AppConstants.sseMaxRetryMs);
      final token = _getToken();
      if (token != null) {
        _startSSE(token);
      }
    });
  }

  void _disconnectSSE() {
    _sseClient?.close();
    _sseClient = null;
    _connected = false;
  }

  // ─── Event Listeners ─────────────────────────────────

  VoidCallback onChatMessage(void Function(Map<String, dynamic>) cb) {
    _chatMessageListeners.add(cb);
    return () => _chatMessageListeners.remove(cb);
  }

  VoidCallback onPresenceUpdate(void Function(Map<String, dynamic>) cb) {
    _presenceListeners.add(cb);
    return () => _presenceListeners.remove(cb);
  }

  VoidCallback onFriendEvent(VoidCallback cb) {
    _friendListeners.add(cb);
    return () => _friendListeners.remove(cb);
  }

  @override
  void dispose() {
    _disconnectSSE();
    super.dispose();
  }
}
