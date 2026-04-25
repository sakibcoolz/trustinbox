import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/theme.dart';
import '../../graphql/settings.dart';
import '../../providers/auth_provider.dart';

// ─── Onboarding Wizard ──────────────────────────────────
// Mirrors: apps/web/src/components/onboarding/OnboardingWizard.tsx
// 5 steps: Welcome → Privacy → DND → Availability → Complete.

const String onboardingCompleteFlag = 'onboarding_complete';

class OnboardingWizardScreen extends StatefulWidget {
  const OnboardingWizardScreen({super.key});

  @override
  State<OnboardingWizardScreen> createState() => _OnboardingWizardScreenState();
}

class _OnboardingWizardScreenState extends State<OnboardingWizardScreen> {
  final _pageController = PageController();
  int _step = 0;

  // Privacy step state
  final Map<String, bool> _privacy = {
    'allowPersonalNotifications': true,
    'allowSPNotifications': true,
    'allowAdvertisements': false,
    'allowChat': true,
  };

  // DND step state
  TimeOfDay _dndStart = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _dndEnd = const TimeOfDay(hour: 7, minute: 0);
  bool _addDnd = true;

  // Availability step state
  TimeOfDay _availStart = const TimeOfDay(hour: 10, minute: 0);
  TimeOfDay _availEnd = const TimeOfDay(hour: 17, minute: 0);
  bool _addAvailability = true;

  bool _busy = false;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  void _next() {
    if (_step < 4) {
      setState(() => _step++);
      _pageController.animateToPage(
        _step,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(onboardingCompleteFlag, true);
    if (!mounted) return;
    // notify AuthProvider so router redirect re-evaluates
    context.read<AuthProvider>().markOnboardingComplete();
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Get Started'),
        actions: [
          if (_step > 0 && _step < 4)
            TextButton(
              onPressed: _busy ? null : _next,
              child: const Text('Skip'),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_step + 1) / 5,
            minHeight: 4,
            backgroundColor: AppColors.borderPrimary,
          ),
        ),
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _StepWelcome(onNext: _next),
          _StepPrivacy(
            values: _privacy,
            onChange: (k, v) => setState(() => _privacy[k] = v),
            onNext: _savePrivacyAndNext,
            busy: _busy,
          ),
          _StepDnd(
            enabled: _addDnd,
            startTime: _dndStart,
            endTime: _dndEnd,
            onToggle: (v) => setState(() => _addDnd = v),
            onPickStart: () => _pickDndTime(true),
            onPickEnd: () => _pickDndTime(false),
            onNext: _saveDndAndNext,
            busy: _busy,
          ),
          _StepAvailability(
            enabled: _addAvailability,
            startTime: _availStart,
            endTime: _availEnd,
            onToggle: (v) => setState(() => _addAvailability = v),
            onPickStart: () => _pickAvailTime(true),
            onPickEnd: () => _pickAvailTime(false),
            onNext: _saveAvailAndNext,
            busy: _busy,
          ),
          _StepComplete(onFinish: _finish),
        ],
      ),
    );
  }

  Future<void> _pickDndTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _dndStart : _dndEnd,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _dndStart = picked;
        } else {
          _dndEnd = picked;
        }
      });
    }
  }

  Future<void> _pickAvailTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _availStart : _availEnd,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _availStart = picked;
        } else {
          _availEnd = picked;
        }
      });
    }
  }

  Future<void> _savePrivacyAndNext() async {
    setState(() => _busy = true);
    final client = GraphQLProvider.of(context).value;
    try {
      await client.mutate(MutationOptions(
        document: gql(updatePrivacyMutation),
        variables: {'input': _privacy},
      ));
    } catch (_) {/* best-effort */}
    if (!mounted) return;
    setState(() => _busy = false);
    _next();
  }

  Future<void> _saveDndAndNext() async {
    if (!_addDnd) {
      _next();
      return;
    }
    setState(() => _busy = true);
    final client = GraphQLProvider.of(context).value;
    try {
      await client.mutate(MutationOptions(
        document: gql(createDNDRuleMutation),
        variables: {
          'input': {
            'scopeType': 'GLOBAL',
            'startTime': _fmt(_dndStart),
            'endTime': _fmt(_dndEnd),
            'daysOfWeek': [0, 1, 2, 3, 4, 5, 6],
            'isActive': true,
          },
        },
      ));
    } catch (_) {/* best-effort */}
    if (!mounted) return;
    setState(() => _busy = false);
    _next();
  }

  Future<void> _saveAvailAndNext() async {
    if (!_addAvailability) {
      _next();
      return;
    }
    setState(() => _busy = true);
    final client = GraphQLProvider.of(context).value;
    try {
      // Mon–Fri default
      for (final day in [1, 2, 3, 4, 5]) {
        await client.mutate(MutationOptions(
          document: gql(createAvailabilitySlotMutation),
          variables: {
            'input': {
              'dayOfWeek': day,
              'startTime': _fmt(_availStart),
              'endTime': _fmt(_availEnd),
              'slotType': 'CALLBACK',
            },
          },
        ));
      }
    } catch (_) {/* best-effort */}
    if (!mounted) return;
    setState(() => _busy = false);
    _next();
  }
}

// ─── Step 1: Welcome ────────────────────────────────────

class _StepWelcome extends StatelessWidget {
  final VoidCallback onNext;
  const _StepWelcome({required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 32),
          CircleAvatar(
            radius: 48,
            backgroundColor: AppColors.accentBlue.withValues(alpha: 0.15),
            child: const Icon(Icons.shield_outlined, size: 48, color: AppColors.accentBlue),
          ),
          const SizedBox(height: 24),
          Text(
            'Welcome to TrustInbox',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            "You're in control of every conversation.",
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          _bullet(context, Icons.lock_outline, 'Privacy by default — nothing reaches you without your approval.'),
          _bullet(context, Icons.nights_stay_outlined, 'Quiet hours that just work — DND is enforced for every channel.'),
          _bullet(context, Icons.access_time, 'Set when you take callbacks — providers respect your slots.'),
          const Spacer(),
          FilledButton(
            onPressed: onNext,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: const Text("Let's go"),
          ),
        ],
      ),
    );
  }

  Widget _bullet(BuildContext context, IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.accentBlue),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }
}

// ─── Step 2: Privacy ────────────────────────────────────

class _StepPrivacy extends StatelessWidget {
  final Map<String, bool> values;
  final void Function(String, bool) onChange;
  final VoidCallback onNext;
  final bool busy;

  const _StepPrivacy({
    required this.values,
    required this.onChange,
    required this.onNext,
    required this.busy,
  });

  static const _items = [
    ('allowPersonalNotifications', 'Personal notifications', 'Direct messages and personal alerts.'),
    ('allowSPNotifications', 'Service provider notifications', 'Transactional and business updates.'),
    ('allowAdvertisements', 'Advertisements', 'Promotional content from verified providers.'),
    ('allowChat', 'Chat messages', 'Let providers initiate chat with you.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Set your privacy', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'You can change these any time in Settings → Preferences.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.separated(
              itemCount: _items.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final (key, label, desc) = _items[i];
                return SwitchListTile(
                  title: Text(label),
                  subtitle: Text(desc, style: Theme.of(context).textTheme.bodySmall),
                  value: values[key] ?? true,
                  activeThumbColor: AppColors.accentBlue,
                  onChanged: (v) => onChange(key, v),
                );
              },
            ),
          ),
          FilledButton(
            onPressed: busy ? null : onNext,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(busy ? 'Saving…' : 'Continue'),
          ),
        ],
      ),
    );
  }
}

// ─── Step 3: DND ────────────────────────────────────────

class _StepDnd extends StatelessWidget {
  final bool enabled;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPickStart;
  final VoidCallback onPickEnd;
  final VoidCallback onNext;
  final bool busy;

  const _StepDnd({
    required this.enabled,
    required this.startTime,
    required this.endTime,
    required this.onToggle,
    required this.onPickStart,
    required this.onPickEnd,
    required this.onNext,
    required this.busy,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Quiet hours', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Block service-provider notifications during a daily window. Personal contacts always reach you.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Add a default quiet window'),
            value: enabled,
            activeThumbColor: AppColors.accentBlue,
            onChanged: onToggle,
          ),
          if (enabled)
            Row(
              children: [
                Expanded(child: _timeTile(context, 'Start', startTime, onPickStart)),
                const SizedBox(width: 12),
                Expanded(child: _timeTile(context, 'End', endTime, onPickEnd)),
              ],
            ),
          const Spacer(),
          FilledButton(
            onPressed: busy ? null : onNext,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(busy ? 'Saving…' : 'Continue'),
          ),
        ],
      ),
    );
  }

  Widget _timeTile(BuildContext ctx, String label, TimeOfDay t, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bgSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderPrimary),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
            const SizedBox(height: 4),
            Text(
              '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}',
              style: Theme.of(ctx).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Step 4: Availability ───────────────────────────────

class _StepAvailability extends StatelessWidget {
  final bool enabled;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPickStart;
  final VoidCallback onPickEnd;
  final VoidCallback onNext;
  final bool busy;

  const _StepAvailability({
    required this.enabled,
    required this.startTime,
    required this.endTime,
    required this.onToggle,
    required this.onPickStart,
    required this.onPickEnd,
    required this.onNext,
    required this.busy,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Callback availability', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Choose when service providers can request a phone callback. We\'ll add a Mon–Fri default — change it any time.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Add Mon–Fri default slot'),
            value: enabled,
            activeThumbColor: AppColors.accentBlue,
            onChanged: onToggle,
          ),
          if (enabled)
            Row(
              children: [
                Expanded(child: _timeTile(context, 'Start', startTime, onPickStart)),
                const SizedBox(width: 12),
                Expanded(child: _timeTile(context, 'End', endTime, onPickEnd)),
              ],
            ),
          const Spacer(),
          FilledButton(
            onPressed: busy ? null : onNext,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(busy ? 'Saving…' : 'Continue'),
          ),
        ],
      ),
    );
  }

  Widget _timeTile(BuildContext ctx, String label, TimeOfDay t, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bgSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderPrimary),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
            const SizedBox(height: 4),
            Text(
              '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}',
              style: Theme.of(ctx).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Step 5: Complete ───────────────────────────────────

class _StepComplete extends StatelessWidget {
  final VoidCallback onFinish;
  const _StepComplete({required this.onFinish});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 32),
          CircleAvatar(
            radius: 48,
            backgroundColor: AppColors.statusSuccess.withValues(alpha: 0.15),
            child: const Icon(Icons.check_circle_outline, size: 48, color: AppColors.statusSuccess),
          ),
          const SizedBox(height: 24),
          Text("You're all set", style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            'Your privacy, quiet hours, and availability are configured. You can revisit any of these from Settings.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
          const Spacer(),
          FilledButton(
            onPressed: onFinish,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: const Text('Go to dashboard'),
          ),
        ],
      ),
    );
  }
}
