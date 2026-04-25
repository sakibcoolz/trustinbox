import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/user.dart';
import '../services/graphql_service.dart';
import '../services/push_service.dart';
import '../services/token_storage.dart';

// ─── Auth Provider ──────────────────────────────────────
// Mirrors: apps/web/src/lib/auth-context.tsx

class AuthProvider extends ChangeNotifier {
  static final _storage = TokenStorage();

  User? _user;
  String? _token;
  bool _isLoading = true;
  Timer? _refreshTimer;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null && !GraphQLService.isTokenExpired(_token!);

  // Cached onboarding flag (hydrated during _restoreSession).
  bool _onboardingComplete = false;
  bool get onboardingComplete => _onboardingComplete;

  AuthProvider() {
    _restoreSession();
  }

  // ─── Session Restore ─────────────────────────────────
  Future<void> _restoreSession() async {
    final savedToken = await _storage.read('accessToken');
    final savedUser = await _storage.read('user');

    final prefs = await SharedPreferences.getInstance();
    _onboardingComplete = prefs.getBool('onboarding_complete') ?? false;

    if (savedToken != null && savedUser != null) {
      _token = savedToken;
      _user = User.fromJson(json.decode(savedUser) as Map<String, dynamic>);

      // If token is expired or expiring soon, try refresh
      if (GraphQLService.isTokenExpiringSoon(savedToken)) {
        final ok = await refreshAccessToken();
        if (!ok) {
          await _clearSession();
        }
      } else {
        _scheduleRefresh(savedToken);
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  // ─── Login ───────────────────────────────────────────
  Future<void> login(String email, String password) async {
    final res = await http.post(
      Uri.parse(AppConstants.loginUrl),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password}),
    );

    if (res.statusCode != 200) {
      final data = json.decode(res.body) as Map<String, dynamic>;
      throw Exception(data['error'] ?? 'Login failed');
    }

    final data = json.decode(res.body) as Map<String, dynamic>;
    await _saveSession(data);
    // Register FCM/APNS push token after successful login (best-effort).
    final accessToken = data['accessToken'] as String?;
    if (accessToken != null) {
      PushService.registerToken(accessToken).ignore();
    }
    notifyListeners();
  }

  // ─── Register ────────────────────────────────────────
  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String mobile,
    required String username,
  }) async {
    final res = await http.post(
      Uri.parse(AppConstants.registerUrl),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'password': password,
        'fullName': fullName,
        'mobile': mobile,
        'username': username,
      }),
    );

    if (res.statusCode != 200) {
      final data = json.decode(res.body) as Map<String, dynamic>;
      throw Exception(data['error'] ?? 'Registration failed');
    }

    final data = json.decode(res.body) as Map<String, dynamic>;
    await _saveSession(data);
    notifyListeners();
  }

  // ─── Logout ──────────────────────────────────────────
  Future<void> logout() async {
    await _clearSession();
    GraphQLService.resetClient();
    notifyListeners();
  }

  // ─── Update Avatar ───────────────────────────────────
  void updateAvatar(String? url) {
    if (_user != null) {
      _user = _user!.copyWith(avatarUrl: url);
      _storage.write('user', json.encode(_user!.toJson()));
      notifyListeners();
    }
  }

  // ─── Onboarding state ────────────────────────────────
  // Triggers a router refresh after the user completes (or skips) the
  // first-launch onboarding wizard so that the redirect re-evaluates.
  void markOnboardingComplete() {
    _onboardingComplete = true;
    notifyListeners();
  }

  // ─── Token Refresh ───────────────────────────────────
  Future<bool> refreshAccessToken() async {
    final refreshToken = await _storage.read('refreshToken');
    if (refreshToken == null) return false;

    try {
      final res = await http.post(
        Uri.parse(AppConstants.refreshUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refreshToken': refreshToken}),
      );

      if (res.statusCode != 200) return false;

      final data = json.decode(res.body) as Map<String, dynamic>;
      _token = data['accessToken'] as String;
      await _storage.write('accessToken', _token!);
      await _storage.write('refreshToken', data['refreshToken'] as String);

      GraphQLService.resetClient();
      _scheduleRefresh(_token!);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── Private Helpers ─────────────────────────────────

  Future<void> _saveSession(Map<String, dynamic> data) async {
    _token = data['accessToken'] as String;
    _user = User.fromJson(data['user'] as Map<String, dynamic>);

    await _storage.write('accessToken', _token!);
    await _storage.write('refreshToken', data['refreshToken'] as String);
    await _storage.write('user', json.encode(_user!.toJson()));

    GraphQLService.resetClient();
    _scheduleRefresh(_token!);
  }

  Future<void> _clearSession() async {
    _refreshTimer?.cancel();
    _token = null;
    _user = null;
    await _storage.deleteAll();
  }

  void _scheduleRefresh(String token) {
    _refreshTimer?.cancel();
    final payload = GraphQLService.decodeJwtPayload(token);
    if (payload == null || payload['exp'] == null) return;
    final expMs = (payload['exp'] as int) * 1000;
    final remaining = expMs - DateTime.now().millisecondsSinceEpoch;
    if (remaining <= 0) return;

    // Refresh 2 minutes before expiry
    final delay = Duration(milliseconds: (remaining - AppConstants.tokenRefreshBufferMs).clamp(0, remaining));
    _refreshTimer = Timer(delay, () async {
      final ok = await refreshAccessToken();
      if (!ok) {
        await _clearSession();
        notifyListeners();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
