import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/service_providers.dart';
import '../../models/service_provider.dart';
import '../../config/theme.dart';
import '../../widgets/empty_state.dart';

// ─── Service Providers Screen ───────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/service-providers/page.tsx

class ServiceProvidersScreen extends StatefulWidget {
  const ServiceProvidersScreen({super.key});

  @override
  State<ServiceProvidersScreen> createState() => _ServiceProvidersScreenState();
}

class _ServiceProvidersScreenState extends State<ServiceProvidersScreen> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) { context.pop(); } else { context.go('/'); }
          },
        ),
        title: const Text('Service Providers'),
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search providers...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v.trim()),
            ),
          ),

          // List
          Expanded(
            child: Query(
              options: QueryOptions(
                document: gql(spDirectoryQuery),
                variables: {
                  'search': _search.isEmpty ? null : _search,
                  'limit': 20,
                  'offset': 0,
                },
                fetchPolicy: FetchPolicy.cacheAndNetwork,
              ),
              builder: (result, {fetchMore, refetch}) {
                if (result.isLoading && result.data == null) {
                  return const Center(child: CircularProgressIndicator());
                }

                final nodes = result.data?['serviceProviderDirectory']?['nodes'] as List<dynamic>? ?? [];
                final providers = nodes.map((p) => ServiceProvider.fromJson(p as Map<String, dynamic>)).toList();

                if (providers.isEmpty) {
                  return EmptyState(
                    icon: Icons.business_outlined,
                    title: 'No providers found',
                    subtitle: 'Try adjusting your search',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => refetch?.call(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: providers.length,
                    itemBuilder: (context, index) {
                      final sp = providers[index];
                      return _ServiceProviderCard(provider: sp);
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

class _ServiceProviderCard extends StatelessWidget {
  final ServiceProvider provider;

  const _ServiceProviderCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.accentBlue.withValues(alpha: 0.15),
                  child: Text(
                    provider.name.substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        provider.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (provider.industry != null)
                        Text(
                          provider.industry!,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
                _VerificationBadge(status: provider.verificationStatus),
              ],
            ),
            if (provider.description != null) ...[
              const SizedBox(height: 8),
              Text(
                provider.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (provider.address != null || provider.city != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    [provider.address, provider.city, provider.state, provider.country]
                        .where((e) => e != null && e.isNotEmpty)
                        .join(', '),
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Mutation(
                    options: MutationOptions(document: gql(blockSPMutation)),
                    builder: (runMutation, result) => OutlinedButton.icon(
                      icon: const Icon(Icons.block, size: 16),
                      label: const Text('Block'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.statusError,
                        side: const BorderSide(color: AppColors.statusError),
                      ),
                      onPressed: () => runMutation({'serviceProviderId': provider.id}),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Mutation(
                    options: MutationOptions(document: gql(reportSpamMutation)),
                    builder: (runMutation, result) => OutlinedButton.icon(
                      icon: const Icon(Icons.report_outlined, size: 16),
                      label: const Text('Report'),
                      onPressed: () => runMutation({
                        'input': {'serviceProviderId': provider.id, 'reason': 'spam'},
                      }),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _VerificationBadge extends StatelessWidget {
  final String? status;
  const _VerificationBadge({this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'verified') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.statusSuccess.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.verified, size: 12, color: AppColors.statusSuccess),
            SizedBox(width: 4),
            Text('Verified', style: TextStyle(color: AppColors.statusSuccess, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }
}
