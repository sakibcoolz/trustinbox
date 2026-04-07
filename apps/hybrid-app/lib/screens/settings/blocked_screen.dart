import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/settings.dart';
import '../../config/theme.dart';
import '../../widgets/empty_state.dart';

// ─── Blocked Providers Screen ───────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/blocked/page.tsx

class BlockedScreen extends StatelessWidget {
  const BlockedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Blocked Organizations')),
      body: Query(
        options: QueryOptions(
          document: gql(blockedProvidersQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final blockedData = result.data?['myBlockedProviders'] as Map<String, dynamic>?;
          final blocked = (blockedData?['nodes'] as List<dynamic>?) ?? [];

          if (blocked.isEmpty) {
            return EmptyState(
              icon: Icons.check_circle_outlined,
              title: 'No blocked organizations',
              subtitle: "You haven't blocked any service providers.",
            );
          }

          return Mutation(
            options: MutationOptions(
              document: gql(unblockProviderMutation),
              onCompleted: (_) => refetch?.call(),
            ),
            builder: (runUnblock, mutResult) {
              return RefreshIndicator(
                onRefresh: () async => refetch?.call(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: blocked.length + 1, // +1 for count header
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          '${blocked.length} blocked organization${blocked.length != 1 ? 's' : ''}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      );
                    }

                    final entry = blocked[index - 1] as Map<String, dynamic>;
                    final sp = entry['serviceProvider'] as Map<String, dynamic>? ?? {};
                    final id = sp['id'] as String? ?? '';
                    final name = sp['name'] as String? ?? 'Unknown Provider';
                    final industry = sp['industry'] as String?;
                    final blockedAt = entry['blockedAt'] as String?;
                    final reason = entry['reason'] as String?;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.accentRed.withValues(alpha: 0.15),
                          child: const Icon(Icons.block, color: AppColors.accentRed, size: 20),
                        ),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        subtitle: Text(
                          [
                            industry ?? '—',
                            if (blockedAt != null) 'Blocked ${DateTime.tryParse(blockedAt)?.toLocal().toString().split(' ')[0] ?? ''}',
                            if (reason != null) reason,
                          ].join(' · '),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
                        ),
                        trailing: OutlinedButton(
                          onPressed: () => runUnblock({'serviceProviderId': id}),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.textSecondary,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            textStyle: const TextStyle(fontSize: 12),
                          ),
                          child: const Text('Unblock'),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
