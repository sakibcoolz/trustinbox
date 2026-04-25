import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/theme_provider.dart';

// ─── Theme Settings Screen ──────────────────────────────
// Route: /settings/theme
// Lets the user choose System / Light / Dark theme and persists
// the choice via ThemeProvider → shared_preferences.

class ThemeScreen extends StatelessWidget {
  const ThemeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Appearance')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ─── Description ─────────────────────────────
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              'Choose how TrustInbox looks on this device.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
            ),
          ),

          // ─── Radio tiles ─────────────────────────────
          Card(
            child: Column(
              children: [
                _ThemeTile(
                  mode: AppThemeMode.system,
                  icon: Icons.brightness_auto_outlined,
                  label: 'System default',
                  subtitle: 'Matches your device theme setting.',
                  selected: themeProvider.theme,
                  onTap: () => themeProvider.setTheme(AppThemeMode.system),
                ),
                const Divider(height: 1, indent: 72),
                _ThemeTile(
                  mode: AppThemeMode.dark,
                  icon: Icons.dark_mode_outlined,
                  label: 'Dark',
                  subtitle: 'Easier on the eyes at night.',
                  selected: themeProvider.theme,
                  onTap: () => themeProvider.setTheme(AppThemeMode.dark),
                ),
                const Divider(height: 1, indent: 72),
                _ThemeTile(
                  mode: AppThemeMode.light,
                  icon: Icons.light_mode_outlined,
                  label: 'Light',
                  subtitle: 'Better in bright environments.',
                  selected: themeProvider.theme,
                  onTap: () => themeProvider.setTheme(AppThemeMode.light),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ─── Live preview ─────────────────────────────
          Text('Preview', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          _ThemePreviewCard(mode: themeProvider.theme),
        ],
      ),
    );
  }
}

// ─── Radio tile ─────────────────────────────────────────

class _ThemeTile extends StatelessWidget {
  final AppThemeMode mode;
  final IconData icon;
  final String label;
  final String subtitle;
  final AppThemeMode selected;
  final VoidCallback onTap;

  const _ThemeTile({
    required this.mode,
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == mode;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: isSelected
            ? AppColors.accentBlue.withValues(alpha: 0.15)
            : AppColors.borderPrimary.withValues(alpha: 0.5),
        child: Icon(
          icon,
          color: isSelected ? AppColors.accentBlue : AppColors.textMuted,
          size: 20,
        ),
      ),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
        ),
      ),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: AppColors.accentBlue, size: 20)
          : const Icon(Icons.radio_button_unchecked, color: AppColors.textMuted, size: 20),
      onTap: onTap,
    );
  }
}

// ─── Live-preview card ───────────────────────────────────

class _ThemePreviewCard extends StatelessWidget {
  final AppThemeMode mode;
  const _ThemePreviewCard({required this.mode});

  String _label() {
    switch (mode) {
      case AppThemeMode.dark: return 'Dark mode';
      case AppThemeMode.light: return 'Light mode';
      case AppThemeMode.system: return 'System default';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = switch (mode) {
      AppThemeMode.dark => true,
      AppThemeMode.light => false,
      AppThemeMode.system =>
        MediaQuery.platformBrightnessOf(context) == Brightness.dark,
    };

    final bg = isDark ? const Color(0xFF151820) : const Color(0xFFF8F9FA);
    final surface = isDark ? const Color(0xFF1C2028) : Colors.white;
    final text = isDark ? const Color(0xFFE4E7EB) : const Color(0xFF1A1D23);
    final sub = isDark ? const Color(0xFF8B929A) : const Color(0xFF6B7280);
    final border = isDark ? const Color(0xFF1E2228) : const Color(0xFFE5E7EB);

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mini app bar
          Row(
            children: [
              Container(width: 24, height: 8, decoration: BoxDecoration(color: AppColors.accentBlue, borderRadius: BorderRadius.circular(4))),
              const SizedBox(width: 8),
              Text('TrustInbox', style: TextStyle(color: text, fontSize: 12, fontWeight: FontWeight.w600)),
              const Spacer(),
              Icon(Icons.notifications_outlined, color: sub, size: 16),
              const SizedBox(width: 8),
              Icon(Icons.person_outlined, color: sub, size: 16),
            ],
          ),
          const SizedBox(height: 10),
          // Mini cards
          Row(
            children: [
              _MiniCard(bg: surface, border: border, icon: Icons.inbox_outlined, label: 'Inbox', color: AppColors.accentBlue),
              const SizedBox(width: 6),
              _MiniCard(bg: surface, border: border, icon: Icons.phone_callback_outlined, label: 'Calls', color: AppColors.accentOrange),
            ],
          ),
          const SizedBox(height: 6),
          // Mode label
          Text(_label(), style: TextStyle(color: sub, fontSize: 11)),
        ],
      ),
    );
  }
}

class _MiniCard extends StatelessWidget {
  final Color bg, border, color;
  final IconData icon;
  final String label;
  const _MiniCard({required this.bg, required this.border, required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
