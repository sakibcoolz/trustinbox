import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../graphql/notifications.dart';
import '../../models/notification.dart';
import '../../providers/notification_provider.dart';
import '../../widgets/empty_state.dart';

// ─── Inbox Screen ───────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/inbox/page.tsx
// Tabbed: All / Personal / Business / Ads
// + SSE-driven refetch, unread badge tabs, load-more pagination.

const int _kPageSize = 20;

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // Each tab's category filter (null = All)
  static const List<String?> _categoryFilters = [null, 'Personal', 'ServiceProvider', 'Advertisement'];

  VoidCallback? _unsubNotification;
  Timer? _debounce;
  int _refetchTick = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() => setState(() {}));

    final notifProvider = context.read<NotificationProvider>();
    _unsubNotification = notifProvider.onNotification(_onSSENotification);
  }

  void _onSSENotification() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (mounted) setState(() => _refetchTick++);
    });
  }

  @override
  void dispose() {
    _unsubNotification?.call();
    _debounce?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();
    final allUnread = provider.notifications.where((n) => !n.read).length;
    final personalUnread = provider.notifications
        .where((n) => !n.read && n.category == 'Personal').length;
    final spUnread = provider.notifications
        .where((n) => !n.read && n.category == 'ServiceProvider').length;
    final adUnread = provider.notifications
        .where((n) => !n.read && n.category == 'Advertisement').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [
            _BadgeTab(label: 'All', count: allUnread),
            _BadgeTab(label: 'Personal', count: personalUnread),
            _BadgeTab(label: 'Business', count: spUnread),
            _BadgeTab(label: 'Ads', count: adUnread),
          ],
        ),
        actions: [
          Mutation(
            options: MutationOptions(
              document: gql(markAllNotificationsReadMutation),
              onCompleted: (_) => setState(() => _refetchTick++),
            ),
            builder: (runMutation, result) => IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: 'Mark all read',
              onPressed: () => runMutation({}),
            ),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: _categoryFilters
            .map((cat) => _InboxTabBody(category: cat, refetchTick: _refetchTick))
            .toList(),
      ),
    );
  }
}

// ─── Tab label with unread badge ──────────────────────────

class _BadgeTab extends StatelessWidget {
  final String label;
  final int count;
  const _BadgeTab({required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: AppColors.accentBlue,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Per-tab body with load-more pagination ───────────────

class _InboxTabBody extends StatefulWidget {
  final String? category;
  final int refetchTick;
  const _InboxTabBody({required this.category, required this.refetchTick});

  @override
  State<_InboxTabBody> createState() => _InboxTabBodyState();
}

class _InboxTabBodyState extends State<_InboxTabBody>
    with AutomaticKeepAliveClientMixin {
  int _loadedCount = _kPageSize;
  bool _loadingMore = false;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Query(
      options: QueryOptions(
        document: gql(myNotificationsQuery),
        variables: {
          'category': widget.category,
          'limit': _loadedCount,
          'offset': 0,
          '_tick': widget.refetchTick,
        },
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }

        final conn = result.data?['myNotifications'];
        final nodes = conn?['nodes'] as List<dynamic>? ?? [];
        final total = (conn?['totalCount'] as int?) ?? nodes.length;
        final notifications = nodes
            .map((n) => AppNotification.fromJson(n as Map<String, dynamic>))
            .toList();

        if (notifications.isEmpty) {
          return EmptyState(
            icon: Icons.inbox_outlined,
            title: 'No notifications',
            subtitle: widget.category == null
                ? 'Your inbox is empty. Browse providers to get started.'
                : 'No ${widget.category} notifications.',
            action: widget.category == null
                ? FilledButton.icon(
                    onPressed: () => context.push('/service-providers'),
                    icon: const Icon(Icons.business_outlined, size: 16),
                    label: const Text('Browse Providers'),
                  )
                : null,
          );
        }

        final hasMore = notifications.length < total;

        return RefreshIndicator(
          onRefresh: () async {
            setState(() => _loadedCount = _kPageSize);
            refetch?.call();
          },
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: notifications.length + (hasMore ? 1 : 0),
            separatorBuilder: (_, separator) => const Divider(height: 1, indent: 72),
            itemBuilder: (ctx, index) {
              if (index == notifications.length) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: _loadingMore
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : TextButton.icon(
                            onPressed: () async {
                              setState(() {
                                _loadingMore = true;
                                _loadedCount += _kPageSize;
                              });
                              await refetch?.call();
                              if (mounted) setState(() => _loadingMore = false);
                            },
                            icon: const Icon(Icons.expand_more, size: 18),
                            label: const Text('Load more'),
                          ),
                  ),
                );
              }
              return _NotificationTile(notification: notifications[index]);
            },
          ),
        );
      },
    );
  }
}

// ─── Notification tile ────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  const _NotificationTile({required this.notification});

  Color _categoryColor() {
    switch (notification.category) {
      case 'Personal':
        return AppColors.accentBlue;
      case 'ServiceProvider':
        return AppColors.accentGreen;
      case 'Advertisement':
        return AppColors.accentOrange;
      default:
        return AppColors.accentBlue;
    }
  }

  String _formatTime() {
    if (notification.createdAt == null) return '';
    try {
      final dt = DateTime.parse(notification.createdAt!);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m';
      if (diff.inHours < 24) return '${diff.inHours}h';
      if (diff.inDays < 7) return '${diff.inDays}d';
      return DateFormat('MMM d').format(dt);
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: _categoryColor().withValues(alpha: 0.15),
        child: Icon(
          notification.category == 'Advertisement'
              ? Icons.campaign_outlined
              : Icons.notifications_outlined,
          color: _categoryColor(),
          size: 20,
        ),
      ),
      title: Text(
        notification.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontWeight: notification.read ? FontWeight.w400 : FontWeight.w600,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (notification.serviceProvider != null)
            Text(
              notification.serviceProvider!.name,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.accentBlue),
            ),
          Text(
            notification.body,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            _formatTime(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
          ),
          if (!notification.read)
            Container(
              margin: const EdgeInsets.only(top: 4),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.accentBlue,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
      onTap: () => context.push('/inbox/${notification.id}'),
    );
  }
}
