import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ─── Token Storage ──────────────────────────────────────
// Uses SharedPreferences on web (crypto.subtle unavailable over HTTP)
// and FlutterSecureStorage on mobile for encrypted storage.
//
// resetOnError: true is critical on Android — without it, a locked or
// corrupted Keystore causes read() to hang indefinitely (Samsung Knox,
// Huawei, etc.), which blocks _restoreSession() and keeps isLoading=true.

class TokenStorage {
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
  );

  Future<String?> read(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(key);
    }
    return _secureStorage.read(key: key);
  }

  Future<void> write(String key, String value) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
      return;
    }
    await _secureStorage.write(key: key, value: value);
  }

  Future<void> delete(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
      return;
    }
    await _secureStorage.delete(key: key);
  }

  Future<void> deleteAll() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('accessToken');
      await prefs.remove('refreshToken');
      await prefs.remove('user');
      return;
    }
    await _secureStorage.deleteAll();
  }
}
