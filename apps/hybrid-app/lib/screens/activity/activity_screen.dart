import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/notifications.dart';
import '../../models/notification.dart';
import '../../config/theme.dart';
import '../../widgets/empty_state.dart';

// ─── Activity Screen ────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/activity/page.tsx
// Combines notifications + callbacks into a unified timeline.

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  String _filter = 'all'; // all, notification, callback, message

  final _filters = const [
    {'key': 'all', 'label': 'All'},
    {'key': 'notification', 'label': 'Notifications'},
    {'key': 'callback', 'label': 'Callbacks'},
    {'key': 'message', 'label': 'Messages'},
  ];

  IconData _typeIcon(String type) {
    switch (type) {
      case 'notification':
        return Icons.notifications_outlined;
      case 'callback':
        return Icons.phone_outlined;
      case 'message':
        return Icons.chat_bubble_outline;
      default:
        return Icons.circle_notifications_outlined;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'notification':
        return AppColors.accentBlue;
      case 'callback':
        return AppColors.accentGreen;
      case 'message':
        return AppColors.accentPurple;
      default:
        return AppColors.accentBlue;
    }
  }

  String _formatTime(String? ts) {
    if (ts == null) return '';
    final date = DateTime.tryParse(ts);
    if (date == null) return '';
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.month}/${date.day}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Activity')),
      body: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: _filters.map((f) {
                final selected = _filter == f['key'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(f['label']!),
                    selected: selected,
                    onSelected: (_) => setState(() => _filter = f['key']!),
                    selectedColor: AppColors.accentBlue.withValues(alpha: 0.2),
                    checkmarkColor: AppColors.accentBlue,
                  ),
                );
              }).toList(),
            ),
          ),
          // Activity list
          Expanded(
            child: Query(
              options: QueryOptions(
                document: gql(myNotificationsQuery),
                variables: const {'limit': 30, 'offset': 0},
                fetchPolicy: FetchPolicy.cacheAndNetwork,
              ),
              builder: (result, {fetchMore, refetch}) {
                if (result.isLoading && result.data == null) {
                  return const Center(child: CircularProgressIndicator());
                }

                final notifNodes = result.data?['myNotifications']?['nodes'] as List<dynamic>? ?? [];
                final items = <_ActivityItem>[];

                for (final n in notifNodes) {
                  final notif = AppNotification.fromJson(n as Map<String, dynamic>);
                  items.add(_ActivityItem(
                    id: notif.id,
                    type: 'notification',
                    title: notif.title,
                    description: notif.body,
                    timestamp: notif.createdAt ?? '',
                    spName: notif.serviceProvider?.name,
                    status: notif.status,
                  ));
                }

                // Filter
                final filtered = _filter == 'all'
                    ? items
                    : items.where((i) => i.type == _filter).toList();

                if (filtered.isEmpty) {
                  return EmptyState(
                    icon: Icons.history,
                    title: 'No activity yet',
                    subtitle: 'Your interactions will appear here as a unified timeline.',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => refetch?.call(),
                  child: ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _typeColor(item.type).withValues(alpha: 0.15),
                          child: Icon(_typeIcon(item.type), color: _typeColor(item.type), size: 20),
                        ),
                        title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (item.description.isNotEmpty)
                              Text(item.description, maxLines: 1, overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _typeColor(item.type).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    item.type[0].toUpperCase() + item.type.substring(1),
                                    style: TextStyle(fontSize: 10, color: _typeColor(item.type)),
                                  ),
                                ),
                                if (item.spName != null) ...[
                                  const SizedBox(width: 8),
                                  Text(item.spName!, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10)),
                                ],
                              ],
                            ),
                          ],
                        ),
                        trailing: Text(
                          _formatTime(item.timestamp),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityItem {
  final String id;
  final String type;
  final String title;
  final String description;
  final String timestamp;
  final String? spName;
  final String? status;

  _ActivityItem({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.timestamp,
    this.spName,
    this.status,
  });
}
