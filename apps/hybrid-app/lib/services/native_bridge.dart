import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';

// ─── Native Bridge Service ──────────────────────────────
// Dart-side MethodChannel to communicate with native Kotlin code.
// Handles call screening, DND, blocked calls, post-call prompts.

class NativeBridge {
  NativeBridge._();

  static const _channel = MethodChannel('com.trustinbox/native');

  // ─── Call Screening ──────────────────────────────────

  /// Request the system to set TrustInbox as the call screening app
  static Future<void> requestCallScreeningRole() async {
    if (kIsWeb) return;
    await _channel.invokeMethod('requestCallScreeningRole');
  }

  /// Check if TrustInbox is the active call screening app
  static Future<bool> isCallScreeningEnabled() async {
    if (kIsWeb) return false;
    final result = await _channel.invokeMethod<bool>('isCallScreeningEnabled');
    return result ?? false;
  }

  // ─── DND ─────────────────────────────────────────────

  /// Check if DND policy access is granted
  static Future<bool> isDndAccessGranted() async {
    if (kIsWeb) return false;
    final result = await _channel.invokeMethod<bool>('isDndAccessGranted');
    return result ?? false;
  }

  /// Open DND access settings for user to grant
  static Future<void> requestDndAccess() async {
    if (kIsWeb) return;
    await _channel.invokeMethod('requestDndAccess');
  }

  /// Check if DND is currently active on the phone
  static Future<bool> isDndActive() async {
    if (kIsWeb) return false;
    final result = await _channel.invokeMethod<bool>('isDndActive');
    return result ?? false;
  }

  // ─── Blocked Calls ──────────────────────────────────

  /// Get the last blocked call info (number + timestamp)
  static Future<Map<String, dynamic>?> getLastBlockedCall() async {
    if (kIsWeb) return null;
    final result = await _channel.invokeMethod<Map>('getLastBlockedCall');
    if (result == null) return null;
    return Map<String, dynamic>.from(result);
  }

  // ─── Post-Call Prompt ────────────────────────────────

  /// Check if there's a pending post-call prompt (call just ended)
  static Future<Map<String, dynamic>?> getPendingPostCallPrompt() async {
    if (kIsWeb) return null;
    final result = await _channel.invokeMethod<Map>('getPendingPostCallPrompt');
    if (result == null) return null;
    return Map<String, dynamic>.from(result);
  }
}
