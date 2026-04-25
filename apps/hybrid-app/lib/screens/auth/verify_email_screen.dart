import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../config/constants.dart';
import '../../config/theme.dart';

// ─── Verify Email Screen ──────────────────────────────────────
// Shown after registration. User enters the 6-digit OTP sent to their email.

class VerifyEmailScreen extends StatefulWidget {
  final String email;
  const VerifyEmailScreen({super.key, required this.email});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();

  bool _loading = false;
  String? _error;
  String? _info;
  int _cooldown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _requestOTP();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _cooldown = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() {
        _cooldown--;
        if (_cooldown <= 0) t.cancel();
      });
    });
  }

  Future<void> _requestOTP() async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/auth/request-email-verification'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': widget.email}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) {
        setState(() { _info = data['message'] as String? ?? 'OTP sent to your email.'; });
        _startCooldown();
      } else {
        setState(() { _error = data['error'] as String? ?? 'Failed to send OTP'; });
      }
    } catch (_) {
      setState(() { _error = 'Network error. Please try again.'; });
    }
  }

  Future<void> _verify() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/auth/verify-email'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': widget.email, 'otp': _otpController.text.trim()}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) {
        if (mounted) context.go('/');
      } else {
        setState(() { _error = data['error'] as String? ?? 'Verification failed'; });
      }
    } catch (_) {
      setState(() { _error = 'Network error. Please try again.'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),
                _buildHeader(),
                const SizedBox(height: 32),
                if (_error != null) _buildBanner(_error!, isError: true),
                if (_info != null) _buildBanner(_info!, isError: false),
                TextFormField(
                  controller: _otpController,
                  decoration: const InputDecoration(
                    labelText: 'OTP Code',
                    hintText: '123456',
                    counterText: '',
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(letterSpacing: 8, fontSize: 20),
                  validator: (v) {
                    if (v == null || v.length != 6) return 'Enter the 6-digit OTP';
                    if (!RegExp(r'^\d{6}$').hasMatch(v)) return 'Digits only';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _loading ? null : _verify,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Verify Email', style: TextStyle(fontSize: 16)),
                ),
                const SizedBox(height: 16),
                Center(
                  child: _cooldown > 0
                      ? Text(
                          'Resend in $_cooldown s',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                        )
                      : GestureDetector(
                          onTap: _requestOTP,
                          child: Text(
                            'Resend OTP',
                            style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600),
                          ),
                        ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Already verified? ', style: Theme.of(context).textTheme.bodyMedium),
                    GestureDetector(
                      onTap: () => context.go('/auth/login'),
                      child: Text('Sign In', style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() => Column(
    children: [
      Container(
        width: 56, height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.accentGreen, AppColors.accentBlue],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.mark_email_read_outlined, color: Colors.white, size: 28),
      ),
      const SizedBox(height: 12),
      Text('Verify Email', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 4),
      RichText(
        textAlign: TextAlign.center,
        text: TextSpan(
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
          children: [
            const TextSpan(text: 'Enter the 6-digit code sent to '),
            TextSpan(text: widget.email, style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    ],
  );

  Widget _buildBanner(String msg, {required bool isError}) {
    final color = isError ? AppColors.accentRed : AppColors.accentBlue;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(msg, style: TextStyle(color: color, fontSize: 13)),
    );
  }
}
