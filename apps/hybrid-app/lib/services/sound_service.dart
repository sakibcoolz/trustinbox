import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ─── Sound Service ──────────────────────────────────────
// Mirrors: apps/web/src/lib/sounds.ts
//
// Plays a notification chime when enabled. The enabled flag is mirrored
// locally (SharedPreferences) AND from server (`privacyPreferences.notificationSoundEnabled`).
// Server is source of truth — local cache avoids a round-trip per ping.

class SoundService {
  static const _prefKey = 'notification_sound_enabled';
  static bool _cachedEnabled = true;
  static bool _hydrated = false;

  // Read from local cache (after hydrate). Defaults to true.
  static bool get isEnabled => _cachedEnabled;

  /// Loads the persisted value into the in-memory cache.
  /// Call once during app startup before consulting `isEnabled`.
  static Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedEnabled = prefs.getBool(_prefKey) ?? true;
    _hydrated = true;
  }

  /// Persist the new value (called after server mutation succeeds, or
  /// when the privacy query returns the server value).
  static Future<void> setEnabled(bool enabled) async {
    _cachedEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKey, enabled);
  }

  /// Best-effort notification chime. Uses platform alert sound — no asset
  /// shipped, no extra plugin needed.
  static Future<void> play() async {
    if (!_hydrated) await hydrate();
    if (!_cachedEnabled) return;
    await SystemSound.play(SystemSoundType.alert);
  }
}
