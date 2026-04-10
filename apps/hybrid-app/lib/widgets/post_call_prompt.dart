import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../services/contact_service.dart';
import '../services/native_bridge.dart';

// ─── Post-Call Prompt ───────────────────────────────────
// After a call ends with an approved contact, shows a prompt
// asking: "Keep this contact or delete?"
// Polls native SharedPreferences for pending post-call events.

class PostCallPrompt extends StatefulWidget {
  final Widget child;

  const PostCallPrompt({super.key, required this.child});

  @override
  State<PostCallPrompt> createState() => _PostCallPromptState();
}

class _PostCallPromptState extends State<PostCallPrompt> with WidgetsBindingObserver {
  Timer? _pollTimer;
  Map<String, dynamic>? _pendingPrompt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (!kIsWeb) _startPolling();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Check when app becomes active (user returns from a call)
    if (state == AppLifecycleState.resumed && !kIsWeb) {
      _checkPostCallPrompt();
    }
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkPostCallPrompt());
  }

  Future<void> _checkPostCallPrompt() async {
    final data = await NativeBridge.getPendingPostCallPrompt();
    if (data != null && mounted) {
      setState(() => _pendingPrompt = data);
    }
  }

  void _showPrompt() {
    final number = _pendingPrompt?['number'] as String? ?? '';
    setState(() => _pendingPrompt = null);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PostCallDialog(phoneNumber: number),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_pendingPrompt != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _showPrompt());
    }
    return widget.child;
  }
}

class _PostCallDialog extends StatefulWidget {
  final String phoneNumber;

  const _PostCallDialog({required this.phoneNumber});

  @override
  State<_PostCallDialog> createState() => _PostCallDialogState();
}

class _PostCallDialogState extends State<_PostCallDialog> {
  String? _contactName;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadContactInfo();
  }

  Future<void> _loadContactInfo() async {
    final name = await ContactService.getContactName(widget.phoneNumber);
    if (mounted) {
      setState(() {
        _contactName = name;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(Icons.call_end, size: 48, color: Colors.blue),
      title: const Text('Call Ended'),
      content: _loading
          ? const SizedBox(height: 60, child: Center(child: CircularProgressIndicator()))
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _contactName != null
                      ? 'Your call with "$_contactName" has ended.'
                      : 'Your call with ${widget.phoneNumber} has ended.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Would you like to keep this contact saved or delete it?',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
      actions: _loading
          ? null
          : [
              TextButton.icon(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                label: const Text('Delete Contact', style: TextStyle(color: Colors.red)),
                onPressed: () async {
                  await ContactService.deleteContactByNumber(widget.phoneNumber);
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Contact deleted — future calls will be blocked')),
                    );
                  }
                },
              ),
              FilledButton.icon(
                icon: const Icon(Icons.person_add),
                label: const Text('Keep Contact'),
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Contact kept — they can continue calling you')),
                  );
                },
              ),
            ],
    );
  }
}
