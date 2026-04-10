import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../services/native_bridge.dart';

// ─── Permission Setup Screen ────────────────────────────
// First-launch wizard that requests all mandatory permissions.
// App cannot proceed without these permissions.

class PermissionSetupScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const PermissionSetupScreen({super.key, required this.onComplete});

  @override
  State<PermissionSetupScreen> createState() => _PermissionSetupScreenState();
}

class _PermissionSetupScreenState extends State<PermissionSetupScreen> {
  int _currentStep = 0;
  bool _contactsGranted = false;
  bool _phoneGranted = false;
  bool _callScreeningGranted = false;
  bool _notificationsGranted = false;
  bool _dndGranted = false;
  bool _checking = true;

  final _steps = const [
    _PermStep(
      icon: Icons.contacts_outlined,
      title: 'Contacts Access',
      description: 'TrustInbox manages your contacts to ensure only approved callers can reach you. '
          'When you approve a callback, the contact is automatically saved.',
      permKey: 'contacts',
    ),
    _PermStep(
      icon: Icons.phone_outlined,
      title: 'Phone & Call Log',
      description: 'Required to screen incoming calls and block unknown callers. '
          'Only contacts you\'ve approved through TrustInbox will ring through.',
      permKey: 'phone',
    ),
    _PermStep(
      icon: Icons.shield_outlined,
      title: 'Call Screening',
      description: 'Set TrustInbox as your call screening app to automatically block unknown callers. '
          'This is the core protection feature.',
      permKey: 'callScreening',
    ),
    _PermStep(
      icon: Icons.notifications_outlined,
      title: 'Notifications',
      description: 'Get notified when someone tries to call and needs to submit a callback request.',
      permKey: 'notifications',
    ),
    _PermStep(
      icon: Icons.do_not_disturb_outlined,
      title: 'Do Not Disturb',
      description: 'Allow TrustInbox to work with your DND settings so only saved contacts ring during quiet hours.',
      permKey: 'dnd',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _checkAllPermissions();
  }

  Future<void> _checkAllPermissions() async {
    if (kIsWeb) {
      widget.onComplete();
      return;
    }

    setState(() => _checking = true);

    _contactsGranted = await Permission.contacts.isGranted;
    _phoneGranted = await Permission.phone.isGranted;
    _callScreeningGranted = await NativeBridge.isCallScreeningEnabled();
    _notificationsGranted = await Permission.notification.isGranted;
    _dndGranted = await NativeBridge.isDndAccessGranted();

    setState(() => _checking = false);

    if (_allGranted) {
      widget.onComplete();
    }
  }

  bool get _allGranted =>
      _contactsGranted && _phoneGranted && _callScreeningGranted && _notificationsGranted && _dndGranted;

  bool _isStepGranted(int index) {
    switch (index) {
      case 0: return _contactsGranted;
      case 1: return _phoneGranted;
      case 2: return _callScreeningGranted;
      case 3: return _notificationsGranted;
      case 4: return _dndGranted;
      default: return false;
    }
  }

  Future<void> _requestPermission(int index) async {
    switch (index) {
      case 0:
        final status = await [Permission.contacts].request();
        _contactsGranted = status[Permission.contacts]?.isGranted ?? false;
        break;
      case 1:
        final status = await [Permission.phone].request();
        _phoneGranted = (status[Permission.phone]?.isGranted ?? false);
        break;
      case 2:
        await NativeBridge.requestCallScreeningRole();
        // Re-check after user returns
        await Future.delayed(const Duration(seconds: 1));
        _callScreeningGranted = await NativeBridge.isCallScreeningEnabled();
        break;
      case 3:
        final status = await Permission.notification.request();
        _notificationsGranted = status.isGranted;
        break;
      case 4:
        await NativeBridge.requestDndAccess();
        await Future.delayed(const Duration(seconds: 1));
        _dndGranted = await NativeBridge.isDndAccessGranted();
        break;
    }

    setState(() {});

    if (_isStepGranted(index)) {
      // Auto-advance to next ungranted step
      if (_allGranted) {
        widget.onComplete();
      } else {
        for (int i = 0; i < _steps.length; i++) {
          if (!_isStepGranted(i)) {
            setState(() => _currentStep = i);
            break;
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final step = _steps[_currentStep];
    final granted = _isStepGranted(_currentStep);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              // Progress dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_steps.length, (i) {
                  final isGranted = _isStepGranted(i);
                  final isCurrent = i == _currentStep;
                  return Container(
                    width: isCurrent ? 32 : 10,
                    height: 10,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: isGranted
                          ? Colors.green
                          : isCurrent
                              ? Theme.of(context).colorScheme.primary
                              : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(5),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 48),
              // Icon
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: granted
                      ? Colors.green.withValues(alpha: 0.1)
                      : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  granted ? Icons.check_circle : step.icon,
                  size: 48,
                  color: granted ? Colors.green : Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                step.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                granted ? 'Permission granted ✓' : step.description,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: granted ? Colors.green : Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              // Grant button
              if (!granted)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _requestPermission(_currentStep),
                    icon: const Icon(Icons.security),
                    label: Text('Grant ${step.title}'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              if (granted && !_allGranted)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      for (int i = 0; i < _steps.length; i++) {
                        if (!_isStepGranted(i)) {
                          setState(() => _currentStep = i);
                          break;
                        }
                      }
                    },
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Continue'),
                  ),
                ),
              const SizedBox(height: 12),
              // Skip (not recommended)
              TextButton(
                onPressed: () => _showSkipWarning(),
                child: const Text('Skip for now (Not recommended)'),
              ),
              const SizedBox(height: 16),
              // Step counter
              Text(
                'Step ${_currentStep + 1} of ${_steps.length}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSkipWarning() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Skip Setup?'),
        content: const Text(
          'Without these permissions, TrustInbox cannot protect you from unknown callers. '
          'Your phone will not be able to screen calls or manage contacts automatically.\n\n'
          'You can set up permissions later in Settings.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Go Back')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              widget.onComplete();
            },
            child: const Text('Skip Anyway'),
          ),
        ],
      ),
    );
  }
}

class _PermStep {
  final IconData icon;
  final String title;
  final String description;
  final String permKey;

  const _PermStep({
    required this.icon,
    required this.title,
    required this.description,
    required this.permKey,
  });
}
