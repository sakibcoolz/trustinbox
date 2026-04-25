import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';

import '../../config/theme.dart';
import '../../graphql/notifications.dart';
import '../../models/notification.dart';

// ─── Notification Detail Screen ─────────────────────────
// Mirrors the detail panel in apps/web/src/app/(dashboard)/inbox/page.tsx
// Route: /inbox/:id
//
// Responsibilities:
//   • Fetch the notification by id
//   • Mark it as read on open (best-effort, idempotent)
//   • Render full body, category chip, timestamps, service-provider card, metadata
//   • Offer deep-links to related entities (conversation, callback, document)
//   • Archive action

class NotificationDetailScreen extends StatefulWidget {
  final String notificationId;

  const NotificationDetailScreen({super.key, required this.notificationId});

  @override
  State<NotificationDetailScreen> createState() => _NotificationDetailScreenState();
}

class _NotificationDetailScreenState extends State<NotificationDetailScreen> {
  bool _markedRead = false;

  Color _categoryColor(String category) {
    switch (category) {
      case 'Personal':
      case 'PERSONAL':
        return AppColors.accentBlue;
      case 'ServiceProvider':
      case 'SERVICE_PROVIDER':
        return AppColors.accentGreen;
      case 'Advertisement':
      case 'ADVERTISEMENT':
        return AppColors.accentOrange;
      default:
        return AppColors.accentBlue;
    }
  }

  String _categoryLabel(String category) {
    switch (category) {
      case 'Personal':
      case 'PERSONAL':
        return 'Personal';
      case 'ServiceProvider':
      case 'SERVICE_PROVIDER':
        return 'Business';
      case 'Advertisement':
      case 'ADVERTISEMENT':
        return 'Ads';
      default:
        return category;
    }
  }

  String _formatFull(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('MMM d, y · h:mm a').format(dt);
    } catch (_) {
      return iso;
    }
  }

  /// Pull a likely related entity id from the notification metadata so we can
  /// deep-link.  Different domains stamp different keys; we accept any of:
  ///   conversationId, callbackId / callbackRequestId, documentId, campaignId
  ({String type, String id})? _relatedEntity(AppNotification n) {
    final meta = n.metadata;
    if (meta == null) {
      if (n.entityId != null && n.entityId!.isNotEmpty) {
        // Fallback: infer type from category — service provider notifications
        // most commonly point at a callback request.
        return (type: 'callback', id: n.entityId!);
      }
      return null;
    }
    String? readStr(String key) {
      final v = meta[key];
      return v is String && v.isNotEmpty ? v : null;
    }

    final convId = readStr('conversationId');
    if (convId != null) return (type: 'conversation', id: convId);

    final cbId = readStr('callbackRequestId') ?? readStr('callbackId');
    if (cbId != null) return (type: 'callback', id: cbId);

    final docId = readStr('documentId');
    if (docId != null) return (type: 'document', id: docId);

    final campId = readStr('campaignId');
    if (campId != null) return (type: 'campaign', id: campId);

    if (n.entityId != null && n.entityId!.isNotEmpty) {
      return (type: 'callback', id: n.entityId!);
    }
    return null;
  }

  void _openRelated(BuildContext context, ({String type, String id}) e) {
    switch (e.type) {
      case 'conversation':
        context.push('/conversations/${e.id}');
        break;
      case 'callback':
        context.push('/callbacks/${e.id}');
        break;
      case 'document':
        context.push('/documents');
        break;
      case 'campaign':
        // No dedicated screen — fall back to inbox
        context.push('/inbox');
        break;
    }
  }

  String _relatedLabel(String type) {
    switch (type) {
      case 'conversation':
        return 'Open conversation';
      case 'callback':
        return 'View callback request';
      case 'document':
        return 'View document';
      default:
        return 'View details';
    }
  }

  IconData _relatedIcon(String type) {
    switch (type) {
      case 'conversation':
        return Icons.chat_bubble_outline;
      case 'callback':
        return Icons.phone_callback_outlined;
      case 'document':
        return Icons.description_outlined;
      default:
        return Icons.open_in_new;
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
              context.go('/inbox');
            }
          },
        ),
        title: const Text('Notification'),
        actions: [
          Mutation(
            options: MutationOptions(
              document: gql(archiveNotificationMutation),
              onCompleted: (_) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Notification archived')),
                );
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/inbox');
                }
              },
              onError: (err) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to archive: ${err?.graphqlErrors.firstOrNull?.message ?? "unknown"}')),
                );
              },
            ),
            builder: (runMutation, result) {
              return IconButton(
                icon: const Icon(Icons.archive_outlined),
                tooltip: 'Archive',
                onPressed: result?.isLoading == true
                    ? null
                    : () => runMutation({'id': widget.notificationId}),
              );
            },
          ),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myNotificationQuery),
          variables: {'id': widget.notificationId},
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (result.hasException) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.statusError),
                    const SizedBox(height: 12),
                    Text(
                      'Could not load notification',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      result.exception?.graphqlErrors.firstOrNull?.message ??
                          'Please check your connection and try again.',
                      style: Theme.of(context).textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => refetch?.call(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final raw = result.data?['notification'] as Map<String, dynamic>?;
          if (raw == null) {
            return const Center(child: Text('Notification not found'));
          }

          final n = AppNotification.fromJson(raw);

          // Mark-as-read on open (fire-and-forget, idempotent on the server).
          if (!_markedRead && n.status != 'READ' && !n.read) {
            _markedRead = true;
            final client = GraphQLProvider.of(context).value;
            client.mutate(MutationOptions(
              document: gql(markNotificationReadMutation),
              variables: {'id': n.id},
            ));
          }

          return _buildBody(context, n);
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context, AppNotification n) {
    final color = _categoryColor(n.category);
    final related = _relatedEntity(n);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── Header ─────────────────────────────────────────
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                n.category.toUpperCase().contains('AD')
                    ? Icons.campaign_outlined
                    : Icons.notifications_outlined,
                color: color,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _categoryLabel(n.category),
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatFull(n.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            if (n.priority != null && n.priority!.toUpperCase() == 'HIGH')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.statusError.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'HIGH',
                  style: TextStyle(
                    color: AppColors.statusError,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),

        // ── Title ──────────────────────────────────────────
        Text(
          n.title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),
        const Divider(height: 1),
        const SizedBox(height: 16),

        // ── Body ───────────────────────────────────────────
        SelectableText(
          n.body,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
        ),

        // ── Service Provider ───────────────────────────────
        if (n.serviceProvider != null) ...[
          const SizedBox(height: 24),
          _ServiceProviderCard(
            sp: n.serviceProvider!,
            onTap: () => context.push('/service-providers'),
          ),
        ],

        // ── Related entity deep link ───────────────────────
        if (related != null) ...[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => _openRelated(context, related),
            icon: Icon(_relatedIcon(related.type)),
            label: Text(_relatedLabel(related.type)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
        ],

        // ── Metadata ───────────────────────────────────────
        if (n.metadata != null && n.metadata!.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text('Details', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          _MetadataTable(data: n.metadata!),
        ],

        // ── Footer info ────────────────────────────────────
        const SizedBox(height: 24),
        Row(
          children: [
            Icon(Icons.info_outline, size: 14, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Notification ID: ${n.id}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ServiceProviderCard extends StatelessWidget {
  final dynamic sp; // ServiceProvider — kept dynamic to avoid extra import noise
  final VoidCallback onTap;

  const _ServiceProviderCard({required this.sp, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = (sp.name as String?) ?? 'Unknown';
    final industry = (sp.industry as String?) ?? '';
    final verified = (sp.verificationStatus as String?)?.toUpperCase() == 'VERIFIED';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
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
                style: const TextStyle(
                  color: AppColors.accentBlue,
                  fontWeight: FontWeight.w600,
                ),
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
                        child: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (verified) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.verified, size: 16, color: AppColors.accentBlue),
                      ],
                    ],
                  ),
                  if (industry.isNotEmpty)
                    Text(
                      industry,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _MetadataTable extends StatelessWidget {
  final Map<String, dynamic> data;

  const _MetadataTable({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        children: data.entries.map((entry) {
          final isLast = entry.key == data.entries.last.key;
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              border: isLast
                  ? null
                  : const Border(bottom: BorderSide(color: AppColors.borderPrimary, width: 0.5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    entry.key,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: SelectableText(
                    entry.value?.toString() ?? '—',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
