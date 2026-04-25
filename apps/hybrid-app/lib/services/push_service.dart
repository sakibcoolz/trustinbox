import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;

import '../config/constants.dart';

// ─── Push Service ─────────────────────────────────────────────
// Handles FCM (Android) and APNS (iOS) push notification registration
// and routing.
//
// Usage:
//   await PushService.initialize();            // once, after Firebase.initializeApp()
//   await PushService.registerToken(token);   // after login — pass the JWT accessToken
//
// Prerequisites (NOT checked into git):
//   Android: android/app/google-services.json
//   iOS:     ios/Runner/GoogleService-Info.plist  + APNS certificates
//
// Payload shape expected from backend worker:
//   { "type": "notification", "id": "<notif-id>" }
//   { "type": "message",      "id": "<conversation-id>" }

// Background message handler — must be a top-level function.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // No UI interaction possible here; FlutterLocalNotifications handles display.
}

class PushService {
  PushService._();

  static final _messaging = FirebaseMessaging.instance;
  static final _localNotifications = FlutterLocalNotificationsPlugin();

  // Navigates to a deep link on notification tap — set by the app on startup.
  static void Function(String path)? _navigateTo;

  static void setNavigator(void Function(String path) navigator) {
    _navigateTo = navigator;
  }

  // ─── Initialise ─────────────────────────────────────────────

  static Future<void> initialize() async {
    // Register background handler first.
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // Request permission (iOS always prompts; Android 13+ requires it).
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Android notification channel for high-importance notifications.
    if (!kIsWeb && Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'trustinbox_default',
        'TrustInbox Notifications',
        description: 'Real-time notifications from TrustInbox',
        importance: Importance.high,
      );
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }

    // Initialise flutter_local_notifications.
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (details) {
        final payload = details.payload;
        if (payload != null) _handlePayload(payload);
      },
    );

    // Foreground message → show local notification banner.
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(message);
    });

    // App opened from background via notification tap.
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _handlePayload(jsonEncode(message.data));
    });

    // App launched by notification tap (terminated state).
    final initial = await _messaging.getInitialMessage();
    if (initial != null) {
      _handlePayload(jsonEncode(initial.data));
    }
  }

  // ─── Register token with backend ────────────────────────────

  static Future<void> registerToken(String accessToken) async {
    try {
      final token = await _messaging.getToken();
      if (token == null) return;

      final platform = Platform.isIOS ? 'apns' : 'fcm';
      await _postToken(accessToken, token, platform);

      // Re-register on token refresh.
      _messaging.onTokenRefresh.listen((newToken) {
        _postToken(accessToken, newToken, platform);
      });
    } catch (e) {
      // Non-fatal — app functions without push.
      debugPrint('[push_service] token registration failed: $e');
    }
  }

  static Future<void> _postToken(String jwt, String fcmToken, String platform) async {
    try {
      await http.put(
        Uri.parse('${AppConstants.apiBaseUrl}/api/users/me/push-tokens'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $jwt',
        },
        body: jsonEncode({'token': fcmToken, 'platform': platform}),
      );
    } catch (_) {
      // Best-effort.
    }
  }

  // ─── Deep-link routing ──────────────────────────────────────

  static void _handlePayload(String payload) {
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final type = data['type'] as String?;
      final id = data['id'] as String?;
      if (type == null || id == null) return;
      switch (type) {
        case 'notification':
          _navigateTo?.call('/inbox/$id');
        case 'message':
          _navigateTo?.call('/conversations/$id');
        default:
          _navigateTo?.call('/inbox');
      }
    } catch (_) {
      // Malformed payload — ignore.
    }
  }

  // ─── Foreground banner ──────────────────────────────────────

  static Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final title = notification?.title ?? message.data['title'] as String? ?? 'TrustInbox';
    final body = notification?.body ?? message.data['body'] as String? ?? '';

    const androidDetails = AndroidNotificationDetails(
      'trustinbox_default',
      'TrustInbox Notifications',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _localNotifications.show(
      message.hashCode,
      title,
      body,
      details,
      payload: jsonEncode(message.data),
    );
  }
}
