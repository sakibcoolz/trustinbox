import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../config/constants.dart';
import '../../config/theme.dart';

// ─── Forgot Password Screen ───────────────────────────────────
// Three-step flow: email → OTP verification → new password.

enum _FPStep { email, otp, password }

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();

  _FPStep _step = _FPStep.email;
  String _email = '';
  String _otp = '';
  String _newPassword = '';
  String _confirmPassword = '';

  bool _loading = false;
  String? _error;
  String? _info;

  // ─── Step 1: send OTP ──────────────────────────────────────

  Future<void> _sendOTP() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    _formKey.currentState!.save();
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': _email}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode != 200) {
        setState(() { _error = data['error'] as String? ?? 'Failed to send OTP'; });
        return;
      }
      setState(() {
        _info = data['message'] as String? ?? 'OTP sent. Check your email.';
        _step = _FPStep.otp;
      });
    } catch (_) {
      setState(() { _error = 'Network error. Please try again.'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  // ─── Step 2: proceed to password input ────────────────────

  void _proceedToPassword() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    _formKey.currentState!.save();
    setState(() { _step = _FPStep.password; _error = null; });
  }

  // ─── Step 3: reset password ───────────────────────────────

  Future<void> _resetPassword() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    _formKey.currentState!.save();
    if (_newPassword != _confirmPassword) {
      setState(() { _error = 'Passwords do not match.'; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': _email, 'otp': _otp, 'newPassword': _newPassword}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode != 200) {
        setState(() { _error = data['error'] as String? ?? 'Failed to reset password'; });
        return;
      }
      if (mounted) context.go('/auth/login');
    } catch (_) {
      setState(() { _error = 'Network error. Please try again.'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  // ─── Build ────────────────────────────────────────────────

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
                if (_error != null) _buildErrorBanner(_error!),
                if (_info != null) _buildInfoBanner(_info!),
                ..._buildStepFields(),
                const SizedBox(height: 24),
                _buildPrimaryButton(),
                const SizedBox(height: 12),
                if (_step != _FPStep.email) _buildBackButton(),
                const SizedBox(height: 12),
                _buildSignInLink(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final titles = {
      _FPStep.email: ('Reset Password', 'Enter your email to receive an OTP'),
      _FPStep.otp: ('Enter OTP', 'Check your email for the 6-digit code'),
      _FPStep.password: ('New Password', 'Choose a strong password'),
    };
    final (title, subtitle) = titles[_step]!;
    return Column(
      children: [
        Container(
          width: 56, height: 56,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.accentBlue, AppColors.accentPurple],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.lock_reset_outlined, color: Colors.white, size: 28),
        ),
        const SizedBox(height: 12),
        Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(subtitle, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted)),
      ],
    );
  }

  Widget _buildErrorBanner(String msg) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.accentRed.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppColors.accentRed.withValues(alpha: 0.3)),
    ),
    child: Text(msg, style: TextStyle(color: AppColors.accentRed, fontSize: 13)),
  );

  Widget _buildInfoBanner(String msg) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.accentBlue.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppColors.accentBlue.withValues(alpha: 0.3)),
    ),
    child: Text(msg, style: TextStyle(color: AppColors.accentBlue, fontSize: 13)),
  );

  List<Widget> _buildStepFields() {
    switch (_step) {
      case _FPStep.email:
        return [
          TextFormField(
            decoration: const InputDecoration(labelText: 'Email', hintText: 'you@example.com'),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            onSaved: (v) => _email = v?.trim() ?? '',
            validator: (v) {
              if (v == null || v.isEmpty) return 'Required';
              if (!v.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
        ];

      case _FPStep.otp:
        return [
          TextFormField(
            decoration: const InputDecoration(
              labelText: 'OTP Code',
              hintText: '123456',
              counterText: '',
            ),
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(letterSpacing: 8, fontSize: 20),
            onSaved: (v) => _otp = v?.trim() ?? '',
            validator: (v) {
              if (v == null || v.length != 6) return 'Enter the 6-digit OTP';
              if (!RegExp(r'^\d{6}$').hasMatch(v)) return 'Digits only';
              return null;
            },
          ),
        ];

      case _FPStep.password:
        return [
          TextFormField(
            decoration: const InputDecoration(labelText: 'New Password'),
            obscureText: true,
            onSaved: (v) => _newPassword = v ?? '',
            validator: (v) {
              if (v == null || v.isEmpty) return 'Required';
              if (v.length < 8) return 'Min 8 characters';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            decoration: const InputDecoration(labelText: 'Confirm Password'),
            obscureText: true,
            onSaved: (v) => _confirmPassword = v ?? '',
            validator: (v) {
              if (v == null || v.isEmpty) return 'Required';
              return null;
            },
          ),
        ];
    }
  }

  Widget _buildPrimaryButton() {
    final labels = {
      _FPStep.email: 'Send OTP',
      _FPStep.otp: 'Verify OTP',
      _FPStep.password: 'Reset Password',
    };
    return FilledButton(
      onPressed: _loading ? null : _stepAction(),
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      child: _loading
          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(labels[_step]!, style: const TextStyle(fontSize: 16)),
    );
  }

  VoidCallback? _stepAction() {
    switch (_step) {
      case _FPStep.email: return _sendOTP;
      case _FPStep.otp: return _proceedToPassword;
      case _FPStep.password: return _resetPassword;
    }
  }

  Widget _buildBackButton() => TextButton(
    onPressed: () => setState(() {
      _error = null;
      _step = _step == _FPStep.password ? _FPStep.otp : _FPStep.email;
    }),
    child: Text('← Back', style: TextStyle(color: AppColors.textMuted)),
  );

  Widget _buildSignInLink() => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Text('Remember it? ', style: Theme.of(context).textTheme.bodyMedium),
      GestureDetector(
        onTap: () => context.go('/auth/login'),
        child: Text('Sign In', style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600)),
      ),
    ],
  );
}
