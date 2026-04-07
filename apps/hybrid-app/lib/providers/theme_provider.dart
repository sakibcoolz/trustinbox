import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

// ─── Theme Provider ─────────────────────────────────────
// Mirrors: apps/web/src/lib/theme-context.tsx

enum AppThemeMode { dark, light, system }

class ThemeProvider extends ChangeNotifier {
  AppThemeMode _theme = AppThemeMode.system;

  AppThemeMode get theme => _theme;

  ThemeMode get themeMode {
    switch (_theme) {
      case AppThemeMode.dark:
        return ThemeMode.dark;
      case AppThemeMode.light:
        return ThemeMode.light;
      case AppThemeMode.system:
        return ThemeMode.system;
    }
  }

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(AppConstants.themeStorageKey);
    if (stored != null) {
      switch (stored) {
        case 'dark':
          _theme = AppThemeMode.dark;
          break;
        case 'light':
          _theme = AppThemeMode.light;
          break;
        default:
          _theme = AppThemeMode.system;
      }
      notifyListeners();
    }
  }

  Future<void> setTheme(AppThemeMode mode) async {
    _theme = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.themeStorageKey, mode.name);
    notifyListeners();
  }
}
