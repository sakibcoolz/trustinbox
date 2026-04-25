import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';

// ─── Settings Screen (Hub) ──────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/page.tsx

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static final _sections = [
    _SettingsSection(
      route: '/settings/preferences',
      label: 'Notification Preferences',
      desc: 'Categories, sound, and what reaches you.',
      icon: Icons.notifications_outlined,
      color: AppColors.accentOrange,
    ),
    _SettingsSection(
      route: '/settings/privacy',
      label: 'Privacy',
      desc: 'Control what service providers can see and do.',
      icon: Icons.lock_outlined,
      color: AppColors.accentBlue,
    ),
    _SettingsSection(
      route: '/settings/dnd',
      label: 'Do Not Disturb',
      desc: 'Set quiet hours and DND schedules.',
      icon: Icons.nights_stay_outlined,
      color: AppColors.accentPurple,
    ),
    _SettingsSection(
      route: '/settings/availability',
      label: 'Availability',
      desc: 'Define when service providers can reach you.',
      icon: Icons.access_time_outlined,
      color: AppColors.accentGreen,
    ),
    _SettingsSection(
      route: '/settings/addresses',
      label: 'My Addresses',
      desc: 'Manage your addresses and set your current location.',
      icon: Icons.location_on_outlined,
      color: AppColors.accentCyan,
    ),
    _SettingsSection(
      route: '/settings/blocked',
      label: 'Blocked Organizations',
      desc: "Manage organizations you've blocked from contacting you.",
      icon: Icons.block_outlined,
      color: AppColors.accentRed,
    ),
    _SettingsSection(
      route: '/settings/theme',
      label: 'Appearance',
      desc: 'Choose between System, Light, and Dark theme.',
      icon: Icons.palette_outlined,
      color: AppColors.accentPurple,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _sections.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final s = _sections[index];
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: s.color.withValues(alpha: 0.15),
                child: Icon(s.icon, color: s.color, size: 22),
              ),
              title: Text(s.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text(s.desc, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right, size: 18),
              onTap: () => context.push(s.route),
            ),
          );
        },
      ),
    );
  }
}

class _SettingsSection {
  final String route;
  final String label;
  final String desc;
  final IconData icon;
  final Color color;

  const _SettingsSection({
    required this.route,
    required this.label,
    required this.desc,
    required this.icon,
    required this.color,
  });
}
