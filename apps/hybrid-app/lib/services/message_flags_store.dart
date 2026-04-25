import 'package:shared_preferences/shared_preferences.dart';

// ─── Local Star + Pin Store ────────────────────────────
// Star/pin are not persisted server-side (web stores them in React state).
// We keep them per-device in shared_preferences so they survive restarts.
//
// Keys:
//   chat:starred:<conversationId>   → JSON list of message IDs
//   chat:pinned:<conversationId>    → JSON list of message IDs
class MessageFlagsStore {
  static const _starredPrefix = 'chat:starred:';
  static const _pinnedPrefix = 'chat:pinned:';

  static Future<Set<String>> getStarred(String conversationId) =>
      _read('$_starredPrefix$conversationId');

  static Future<Set<String>> getPinned(String conversationId) =>
      _read('$_pinnedPrefix$conversationId');

  static Future<bool> toggleStarred(String conversationId, String messageId) {
    return _toggle('$_starredPrefix$conversationId', messageId);
  }

  static Future<bool> togglePinned(String conversationId, String messageId) {
    return _toggle('$_pinnedPrefix$conversationId', messageId);
  }

  static Future<Set<String>> _read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(key) ?? const []).toSet();
  }

  /// Returns the new state of the flag (true = on, false = off).
  static Future<bool> _toggle(String key, String messageId) async {
    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(key) ?? const []).toSet();
    final nowOn = !list.contains(messageId);
    if (nowOn) {
      list.add(messageId);
    } else {
      list.remove(messageId);
    }
    await prefs.setStringList(key, list.toList());
    return nowOn;
  }
}
