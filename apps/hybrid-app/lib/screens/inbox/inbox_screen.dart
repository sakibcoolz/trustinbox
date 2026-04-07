import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/notifications.dart';
import '../../models/notification.dart';
import '../../config/theme.dart';
import '../../widgets/empty_state.dart';
import 'package:intl/intl.dart';

// ─── Inbox Screen ───────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/inbox/page.tsx
// Tabbed: All / Personal / Service Provider / Advertisement

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedCategory;

  static const _tabs = ['All', 'Personal', 'ServiceProvider', 'Advertisement'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _selectedCategory = _tabController.index == 0 ? null : _tabs[_tabController.index];
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Personal'),
            Tab(text: 'Business'),
            Tab(text: 'Ads'),
          ],
        ),
        actions: [
          Mutation(
            options: MutationOptions(document: gql(markAllNotificationsReadMutation)),
            builder: (runMutation, result) {
              return IconButton(
                icon: const Icon(Icons.done_all),
                tooltip: 'Mark all read',
                onPressed: () => runMutation({}),
              );
            },
          ),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myNotificationsQuery),
          variables: {
            'category': _selectedCategory,
            'limit': 20,
            'offset': 0,
          },
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final nodes = result.data?['myNotifications']?['nodes'] as List<dynamic>? ?? [];
          final notifications = nodes.map((n) => AppNotification.fromJson(n as Map<String, dynamic>)).toList();

          if (notifications.isEmpty) {
            return EmptyState(
              icon: Icons.inbox_outlined,
              title: 'No notifications',
              subtitle: 'Your notifications will appear here',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => refetch?.call(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                return _NotificationTile(notification: notif);
              },
            ),
          );
        },
      ),
    );
  }
}

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
      final now = DateTime.now();
      final diff = now.difference(dt);
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
          notification.category == 'Advertisement' ? Icons.campaign_outlined : Icons.notifications_outlined,
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
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.accentBlue,
                  ),
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
          Text(_formatTime(), style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11)),
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
      onTap: () {
        // TODO: Open notification detail
      },
    );
  }
}
