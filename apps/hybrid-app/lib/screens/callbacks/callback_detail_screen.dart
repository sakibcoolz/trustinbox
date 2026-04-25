import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';

import '../../config/theme.dart';
import '../../graphql/callbacks.dart';
import '../../models/callback_request.dart';
import '../../services/contact_service.dart';

// ─── Callback Detail Screen ─────────────────────────────
// Route: /callbacks/:id
// Shows the full callback request, the requesting service provider, the
// approved time slot (if any), and exposes approve / reject actions when
// the callback is pending.

class CallbackDetailScreen extends StatelessWidget {
  final String callbackId;

  const CallbackDetailScreen({super.key, required this.callbackId});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return AppColors.statusSuccess;
      case 'rejected':
        return AppColors.statusError;
      case 'expired':
        return AppColors.textMuted;
      default:
        return AppColors.statusWarning;
    }
  }

  String _formatFull(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('MMM d, y · h:mm a').format(dt);
    } catch (_) {
      return iso;
    }
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
              context.go('/callbacks');
            }
          },
        ),
        title: const Text('Callback Request'),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myCallbackQuery),
          variables: {'id': callbackId},
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (result.hasException) {
            return _ErrorView(
              message: result.exception?.graphqlErrors.firstOrNull?.message ??
                  'Failed to load callback',
              onRetry: () => refetch?.call(),
            );
          }

          final raw = result.data?['callbackRequest'] as Map<String, dynamic>?;
          if (raw == null) {
            return const Center(child: Text('Callback not found'));
          }
          final cb = CallbackRequest.fromJson(raw);

          return _buildBody(context, cb, refetch);
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context, CallbackRequest cb, Refetch? refetch) {
    final statusColor = _statusColor(cb.status);
    final isPending = cb.status.toLowerCase() == 'pending';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── Status banner ──────────────────────────────────
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: statusColor.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.phone_callback_outlined, color: statusColor),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cb.status.toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Requested ${_formatFull(cb.requestedAt)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Service Provider ───────────────────────────────
        if (cb.serviceProvider != null) ...[
          Text('From', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          _ProviderRow(
            name: cb.serviceProvider!.name,
            industry: cb.serviceProvider!.industry,
            verified: cb.serviceProvider!.verificationStatus?.toUpperCase() == 'VERIFIED',
          ),
          const SizedBox(height: 20),
        ],

        // ── Reason / details ──────────────────────────────
        if (cb.reason != null && cb.reason!.isNotEmpty) ...[
          Text('Reason', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          SelectableText(cb.reason!, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
        ],
        if (cb.details != null && cb.details!.isNotEmpty) ...[
          Text('Details', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          SelectableText(cb.details!, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
        ],

        // ── Approved slot ─────────────────────────────────
        if (cb.approvedSlotStart != null) ...[
          const Divider(height: 1),
          const SizedBox(height: 16),
          Text('Approved Slot', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          _KeyValueRow(label: 'Starts', value: _formatFull(cb.approvedSlotStart)),
          _KeyValueRow(label: 'Ends', value: _formatFull(cb.approvedSlotEnd)),
          const SizedBox(height: 16),
        ],

        // ── Timeline ──────────────────────────────────────
        const Divider(height: 1),
        const SizedBox(height: 16),
        Text('Timeline', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 6),
        _KeyValueRow(label: 'Requested', value: _formatFull(cb.requestedAt)),
        if (cb.respondedAt != null)
          _KeyValueRow(label: 'Responded', value: _formatFull(cb.respondedAt)),

        // ── Actions ───────────────────────────────────────
        if (isPending) ...[
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showRejectDialog(context, cb.id, refetch),
                  icon: const Icon(Icons.cancel_outlined, color: AppColors.statusError),
                  label: const Text('Reject', style: TextStyle(color: AppColors.statusError)),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    side: const BorderSide(color: AppColors.statusError),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _showApproveDialog(context, cb, refetch),
                  icon: const Icon(Icons.check),
                  label: const Text('Approve'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: AppColors.statusSuccess,
                  ),
                ),
              ),
            ],
          ),
        ],

        const SizedBox(height: 24),
        Row(
          children: [
            const Icon(Icons.info_outline, size: 14, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Callback ID: ${cb.id}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showApproveDialog(BuildContext context, CallbackRequest cb, Refetch? refetch) {
    final nameCtrl = TextEditingController(text: cb.serviceProvider?.name ?? '');
    final phoneCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Approve Callback'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Approve callback from ${cb.serviceProvider?.name ?? "Unknown"}?'),
              const SizedBox(height: 16),
              const Text(
                'Save as contact (for calls):',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Contact Name',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: 'Enter SP phone to save',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          Mutation(
            options: MutationOptions(
              document: gql(approveCallbackMutation),
              onCompleted: (_) async {
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                final phone = phoneCtrl.text.trim();
                final name = nameCtrl.text.trim();
                if (phone.isNotEmpty && name.isNotEmpty) {
                  final saved = await ContactService.saveContact(
                    phoneNumber: phone,
                    displayName: name,
                    organization: cb.serviceProvider?.name,
                    note: 'Approved via TrustInbox callback',
                  );
                  if (saved && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Contact "$name" saved')),
                    );
                  }
                }
                refetch?.call();
              },
            ),
            builder: (runMutation, _) {
              return FilledButton(
                onPressed: () => runMutation({
                  'input': {
                    'callbackRequestId': cb.id,
                    'approvedSlotStart':
                        DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
                    'approvedSlotEnd':
                        DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
                  },
                }),
                child: const Text('Approve'),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context, String id, Refetch? refetch) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Callback'),
        content: const Text('Reject this callback request?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          Mutation(
            options: MutationOptions(
              document: gql(rejectCallbackMutation),
              onCompleted: (_) {
                if (ctx.mounted) Navigator.pop(ctx);
                refetch?.call();
              },
            ),
            builder: (runMutation, _) {
              return FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.statusError),
                onPressed: () => runMutation({
                  'input': {'callbackRequestId': id},
                }),
                child: const Text('Reject'),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ProviderRow extends StatelessWidget {
  final String name;
  final String? industry;
  final bool verified;

  const _ProviderRow({required this.name, this.industry, required this.verified});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.borderPrimary),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.accentBlue.withValues(alpha: 0.15),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis),
                    ),
                    if (verified) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified, size: 16, color: AppColors.accentBlue),
                    ],
                  ],
                ),
                if (industry != null && industry!.isNotEmpty)
                  Text(industry!, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyValueRow extends StatelessWidget {
  final String label;
  final String value;

  const _KeyValueRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: SelectableText(value, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.statusError),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
