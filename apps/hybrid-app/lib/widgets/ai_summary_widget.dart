import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';
import '../models/settings.dart';

// ─── AI Summary Widget ──────────────────────────────────
// Mirrors: apps/web/src/components/dashboard/AISummaryWidget.tsx
//
// Generates a 2-3 sentence natural-language insight from the user's
// dashboard summary data. A real aiDashboardSummary GraphQL query can
// replace the local generation once the backend endpoint is live.

class AISummaryWidget extends StatefulWidget {
  final DashboardSummary? summary;
  final bool isLoading;
  final VoidCallback? onRefresh;

  const AISummaryWidget({
    super.key,
    required this.summary,
    required this.isLoading,
    this.onRefresh,
  });

  @override
  State<AISummaryWidget> createState() => _AISummaryWidgetState();
}

class _AISummaryWidgetState extends State<AISummaryWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmerController;
  DateTime _generatedAt = DateTime.now();
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void didUpdateWidget(AISummaryWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Track when new data arrives
    if (oldWidget.isLoading && !widget.isLoading && widget.summary != null) {
      setState(() => _generatedAt = DateTime.now());
    }
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  // ─── Natural-language insight generator ──────────────
  String _generateInsight(DashboardSummary s) {
    final parts = <String>[];

    // Unread notifications insight
    if (s.unreadNotifications == 0) {
      parts.add("You're all caught up — no unread notifications.");
    } else if (s.unreadNotifications <= 5) {
      parts.add('You have ${s.unreadNotifications} unread notification${s.unreadNotifications == 1 ? '' : 's'} waiting for your attention.');
    } else {
      parts.add('You have ${s.unreadNotifications} unread notifications — consider reviewing them soon.');
    }

    // Callback insight
    if (s.pendingCallbacks > 0) {
      parts.add('${s.pendingCallbacks} callback request${s.pendingCallbacks == 1 ? ' is' : 's are'} pending your approval.');
    }

    // Conversation / document insight
    if (s.activeConversations > 0 && s.sharedDocuments > 0) {
      parts.add('You have ${s.activeConversations} active conversation${s.activeConversations == 1 ? '' : 's'} and ${s.sharedDocuments} shared document${s.sharedDocuments == 1 ? '' : 's'}.');
    } else if (s.activeConversations > 0) {
      parts.add('${s.activeConversations} conversation${s.activeConversations == 1 ? ' is' : 's are'} active.');
    } else if (s.sharedDocuments > 0) {
      parts.add('${s.sharedDocuments} document${s.sharedDocuments == 1 ? ' has' : 's have'} been shared with you.');
    }

    // DND / blocked insight
    if (s.dndActive) {
      parts.add('Do Not Disturb is currently active.');
    }
    if (s.blockedProviders > 0) {
      parts.add('${s.blockedProviders} service provider${s.blockedProviders == 1 ? ' is' : 's are'} blocked.');
    }

    if (parts.isEmpty) {
      return 'Everything looks good. No pending items to review.';
    }

    return parts.join(' ');
  }

  String _timeAgo() {
    final diff = DateTime.now().difference(_generatedAt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return DateFormat('HH:mm').format(_generatedAt);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Header bar ──────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.accentBlue, AppColors.accentPurple],
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, color: Colors.white, size: 12),
                      SizedBox(width: 4),
                      Text('AI Summary', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const Spacer(),
                if (!widget.isLoading)
                  Text(
                    'Generated ${_timeAgo()}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                  ),
                IconButton(
                  icon: widget.isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh_outlined, size: 18),
                  onPressed: widget.isLoading ? null : () {
                    widget.onRefresh?.call();
                    setState(() => _generatedAt = DateTime.now());
                  },
                  tooltip: 'Refresh summary',
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),

          // ─── Content ──────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: widget.isLoading || widget.summary == null
                ? _buildSkeleton()
                : _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final summary = widget.summary!;
    final insight = _generateInsight(summary);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedCrossFade(
          firstChild: Text(
            insight,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          secondChild: Text(
            insight,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
          ),
          crossFadeState: _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
        if (insight.length > 120) ...[
          const SizedBox(height: 4),
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Text(
              _expanded ? 'Show less' : 'Show more',
              style: const TextStyle(
                color: AppColors.accentBlue,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSkeleton() {
    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (_, child) {
        final shimmerColor = Color.lerp(
          AppColors.borderPrimary,
          AppColors.bgElevated,
          _shimmerController.value,
        )!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 14, width: double.infinity, decoration: BoxDecoration(color: shimmerColor, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 6),
            Container(height: 14, width: double.infinity, decoration: BoxDecoration(color: shimmerColor, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 6),
            Container(height: 14, width: 200, decoration: BoxDecoration(color: shimmerColor, borderRadius: BorderRadius.circular(4))),
          ],
        );
      },
    );
  }
}
