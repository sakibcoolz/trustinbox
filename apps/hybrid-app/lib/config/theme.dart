import 'package:flutter/material.dart';

// ─── TrustInbox Theme ──────────────────────────────────
// Mirrors the web app's semantic color system from tailwind.config.js

class AppColors {
  AppColors._();

  // ─── Dark Theme Colors ─────────────────────────────────
  static const Color bgPrimary = Color(0xFF0B0D0F);
  static const Color bgSecondary = Color(0xFF111418);
  static const Color bgCard = Color(0xFF151820);
  static const Color bgElevated = Color(0xFF1C2028);
  static const Color bgHover = Color(0xFF1E2228);
  static const Color bgInput = Color(0xFF0D1017);

  static const Color textPrimary = Color(0xFFE4E7EB);
  static const Color textSecondary = Color(0xFF8B929A);
  static const Color textMuted = Color(0xFF545B65);

  static const Color borderPrimary = Color(0xFF1E2228);
  static const Color borderSecondary = Color(0xFF2A2F38);

  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color accentGreen = Color(0xFF22C55E);
  static const Color accentRed = Color(0xFFEF4444);
  static const Color accentOrange = Color(0xFFF59E0B);
  static const Color accentPurple = Color(0xFFA855F7);
  static const Color accentCyan = Color(0xFF06B6D4);

  static const Color statusSuccess = Color(0xFF22C55E);
  static const Color statusWarning = Color(0xFFF59E0B);
  static const Color statusError = Color(0xFFEF4444);
  static const Color statusInfo = Color(0xFF3B82F6);

  // ─── Light Theme Colors ────────────────────────────────
  static const Color lightBgPrimary = Color(0xFFF8F9FA);
  static const Color lightBgSecondary = Color(0xFFFFFFFF);
  static const Color lightBgCard = Color(0xFFFFFFFF);
  static const Color lightBgElevated = Color(0xFFF1F3F5);
  static const Color lightBgInput = Color(0xFFF8F9FA);

  static const Color lightTextPrimary = Color(0xFF1A1D21);
  static const Color lightTextSecondary = Color(0xFF6B7280);
  static const Color lightTextMuted = Color(0xFF9CA3AF);

  static const Color lightBorderPrimary = Color(0xFFE5E7EB);
  static const Color lightBorderSecondary = Color(0xFFD1D5DB);
}

ThemeData buildDarkTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: AppColors.bgPrimary,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.accentBlue,
      secondary: AppColors.accentCyan,
      surface: AppColors.bgCard,
      error: AppColors.accentRed,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: AppColors.textPrimary,
      onError: Colors.white,
    ),
    cardTheme: const CardThemeData(
      color: AppColors.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        side: BorderSide(color: AppColors.borderPrimary),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgSecondary,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.bgSecondary,
      selectedItemColor: AppColors.accentBlue,
      unselectedItemColor: AppColors.textMuted,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgInput,
      hintStyle: const TextStyle(color: AppColors.textMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.accentBlue),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.borderPrimary,
      thickness: 1,
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
      headlineMedium: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
      titleLarge: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(color: AppColors.textPrimary),
      bodyMedium: TextStyle(color: AppColors.textSecondary),
      bodySmall: TextStyle(color: AppColors.textMuted),
      labelLarge: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500),
    ),
  );
}

ThemeData buildLightTheme() {
  return ThemeData(
    brightness: Brightness.light,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: AppColors.lightBgPrimary,
    colorScheme: const ColorScheme.light(
      primary: AppColors.accentBlue,
      secondary: AppColors.accentCyan,
      surface: AppColors.lightBgCard,
      error: AppColors.accentRed,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: AppColors.lightTextPrimary,
      onError: Colors.white,
    ),
    cardTheme: const CardThemeData(
      color: AppColors.lightBgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        side: BorderSide(color: AppColors.lightBorderPrimary),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.lightBgSecondary,
      foregroundColor: AppColors.lightTextPrimary,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.lightBgSecondary,
      selectedItemColor: AppColors.accentBlue,
      unselectedItemColor: AppColors.lightTextMuted,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightBgInput,
      hintStyle: const TextStyle(color: AppColors.lightTextMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.lightBorderPrimary),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.lightBorderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.accentBlue),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.lightBorderPrimary,
      thickness: 1,
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(color: AppColors.lightTextPrimary, fontWeight: FontWeight.w700),
      headlineMedium: TextStyle(color: AppColors.lightTextPrimary, fontWeight: FontWeight.w600),
      titleLarge: TextStyle(color: AppColors.lightTextPrimary, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: AppColors.lightTextPrimary, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(color: AppColors.lightTextPrimary),
      bodyMedium: TextStyle(color: AppColors.lightTextSecondary),
      bodySmall: TextStyle(color: AppColors.lightTextMuted),
      labelLarge: TextStyle(color: AppColors.lightTextPrimary, fontWeight: FontWeight.w500),
    ),
  );
}
