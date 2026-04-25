import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../graphql/dashboard.dart';
import '../../models/settings.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../config/theme.dart';
import '../../widgets/ai_summary_widget.dart';

// ─── Dashboard Screen ───────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/page.tsx

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final notifs = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text('Hello, ${auth.user?.fullName.split(' ').first ?? 'User'}'),
        actions: [
          // Notification bell with badge
          Stack(
            children: [
              IconButton(
                tooltip: 'Notifications',
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.go('/inbox'),
              ),
              if (notifs.unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.accentRed,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${notifs.unreadCount > 99 ? "99+" : notifs.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outlined),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(dashboardSummaryQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          DashboardSummary? summary;
          if (result.data != null && result.data!['myDashboardSummary'] != null) {
            summary = DashboardSummary.fromJson(
              result.data!['myDashboardSummary'] as Map<String, dynamic>,
            );
          }

          return RefreshIndicator(
            onRefresh: () async => refetch?.call(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Summary Cards
                _buildSummaryGrid(context, summary),
                const SizedBox(height: 16),

                // AI Summary
                AISummaryWidget(
                  summary: summary,
                  isLoading: result.isLoading && summary == null,
                  onRefresh: () => refetch?.call(),
                ),
                const SizedBox(height: 24),

                // Quick Actions
                Text('Quick Actions', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                _buildQuickActions(context),
                const SizedBox(height: 24),

                // Recent Activity Placeholder
                Text('Recent Activity', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                if (result.isLoading && summary == null)
                  const Center(child: CircularProgressIndicator())
                else
                  _buildRecentActivity(context),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryGrid(BuildContext context, DashboardSummary? summary) {
    final items = [
      _SummaryItem(
        title: 'Unread',
        value: '${summary?.unreadNotifications ?? 0}',
        icon: Icons.inbox_outlined,
        color: AppColors.accentBlue,
      ),
      _SummaryItem(
        title: 'Pending Calls',
        value: '${summary?.pendingCallbacks ?? 0}',
        icon: Icons.phone_callback_outlined,
        color: AppColors.accentOrange,
      ),
      _SummaryItem(
        title: 'Conversations',
        value: '${summary?.activeConversations ?? 0}',
        icon: Icons.chat_bubble_outline,
        color: AppColors.accentGreen,
      ),
      _SummaryItem(
        title: 'Documents',
        value: '${summary?.sharedDocuments ?? 0}',
        icon: Icons.description_outlined,
        color: AppColors.accentPurple,
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.6,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(item.icon, color: item.color, size: 28),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.value,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(item.title, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      _QuickAction(label: 'Service Providers', icon: Icons.business_outlined, path: '/service-providers'),
      _QuickAction(label: 'Friends', icon: Icons.people_outlined, path: '/friends'),
      _QuickAction(label: 'Documents', icon: Icons.description_outlined, path: '/documents'),
      _QuickAction(label: 'Activity', icon: Icons.timeline_outlined, path: '/activity'),
    ];

    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: actions.length,
        separatorBuilder: (_, separator) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final action = actions[index];
          return GestureDetector(
            onTap: () => context.go(action.path),
            child: Container(
              width: 90,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).dividerTheme.color ?? Colors.transparent,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(action.icon, color: AppColors.accentBlue),
                  const SizedBox(height: 8),
                  Text(
                    action.label,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRecentActivity(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(Icons.timeline_outlined, size: 48, color: Theme.of(context).textTheme.bodySmall?.color),
            const SizedBox(height: 8),
            Text('No recent activity', style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 4),
            Text(
              'Your notifications and callbacks will appear here',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  const _SummaryItem({required this.title, required this.value, required this.icon, required this.color});
}

class _QuickAction {
  final String label;
  final IconData icon;
  final String path;
  const _QuickAction({required this.label, required this.icon, required this.path});
}
