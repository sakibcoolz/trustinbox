import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../config/theme.dart';
import '../../graphql/settings.dart';
import '../../services/sound_service.dart';

// ─── Category Preferences Screen ────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/preferences/page.tsx
//
// Surfaces three category cards (Personal / Service Provider / Advertisement)
// plus the notification-sound toggle. Toggles map to the corresponding
// privacy-preference flags on the gateway.

class CategoryPreferencesScreen extends StatefulWidget {
  const CategoryPreferencesScreen({super.key});

  @override
  State<CategoryPreferencesScreen> createState() => _CategoryPreferencesScreenState();
}

class _CategoryPreferencesScreenState extends State<CategoryPreferencesScreen> {
  bool _hydrated = false;
  late Map<String, bool> _values;
  bool _saving = false;

  static const _defaults = <String, bool>{
    'allowPersonalNotifications': true,
    'allowSPNotifications': true,
    'allowAdvertisements': false,
    'notificationSoundEnabled': true,
  };

  @override
  void initState() {
    super.initState();
    _values = Map.of(_defaults);
  }

  void _hydrate(Map<String, dynamic>? data) {
    if (data == null || _hydrated) return;
    for (final k in _defaults.keys) {
      final v = data[k];
      if (v is bool) _values[k] = v;
    }
    final sound = data['notificationSoundEnabled'];
    if (sound is bool) SoundService.setEnabled(sound);
    _hydrated = true;
  }

  Future<void> _save(String key, bool value) async {
    final prev = _values[key] ?? _defaults[key]!;
    final client = GraphQLProvider.of(context).value;
    setState(() {
      _values[key] = value;
      _saving = true;
    });
    if (key == 'notificationSoundEnabled') {
      await SoundService.setEnabled(value);
      if (value) await SoundService.play();
    }
    try {
      await client.mutate(MutationOptions(
        document: gql(updatePrivacyMutation),
        variables: {'input': {key: value}},
      ));
    } catch (e) {
      // rollback on failure
      setState(() => _values[key] = prev);
      if (key == 'notificationSoundEnabled') await SoundService.setEnabled(prev);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update preference')),
        );
      }
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/settings');
            }
          },
        ),
        title: const Text('Notification Preferences'),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myPrivacyPreferencesQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }
          _hydrate(result.data?['myPrivacyPreferences'] as Map<String, dynamic>?);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _SectionHeader(label: 'Categories'),
              const SizedBox(height: 8),
              _CategoryCard(
                icon: Icons.chat_bubble_outline,
                color: AppColors.accentBlue,
                title: 'Personal',
                description: 'Direct messages and personal notifications.',
                value: _values['allowPersonalNotifications']!,
                disabled: _saving,
                onChanged: (v) => _save('allowPersonalNotifications', v),
              ),
              _CategoryCard(
                icon: Icons.business_outlined,
                color: AppColors.accentPurple,
                title: 'Service Provider',
                description: 'Transactional and business communications.',
                value: _values['allowSPNotifications']!,
                disabled: _saving,
                onChanged: (v) => _save('allowSPNotifications', v),
              ),
              _CategoryCard(
                icon: Icons.campaign_outlined,
                color: AppColors.accentOrange,
                title: 'Advertisement',
                description: 'Promotional content from verified providers.',
                value: _values['allowAdvertisements']!,
                disabled: _saving,
                onChanged: (v) => _save('allowAdvertisements', v),
              ),
              const SizedBox(height: 24),
              _SectionHeader(label: 'Sound & alerts'),
              const SizedBox(height: 8),
              Card(
                child: SwitchListTile(
                  title: const Text('Notification sounds'),
                  subtitle: const Text(
                    'Play a chime when new notifications arrive.',
                  ),
                  value: _values['notificationSoundEnabled']!,
                  activeThumbColor: AppColors.accentBlue,
                  onChanged: _saving
                      ? null
                      : (v) => _save('notificationSoundEnabled', v),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              letterSpacing: 1.1,
              color: AppColors.textMuted,
            ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final bool value;
  final bool disabled;
  final ValueChanged<bool> onChanged;

  const _CategoryCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.value,
    required this.disabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                  ),
                ],
              ),
            ),
            Switch(
              value: value,
              activeThumbColor: AppColors.accentBlue,
              onChanged: disabled ? null : onChanged,
            ),
          ],
        ),
      ),
    );
  }
}
