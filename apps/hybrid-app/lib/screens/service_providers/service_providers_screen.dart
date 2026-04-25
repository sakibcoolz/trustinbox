import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../graphql/addresses.dart';
import '../../graphql/service_providers.dart';
import '../../models/service_provider.dart';
import '../../config/theme.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/trust_score_badge.dart';

// ─── Service Providers Screen ───────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/service-providers/page.tsx
// 3 tabs: All · Nearby · Following.

class ServiceProvidersScreen extends StatefulWidget {
  const ServiceProvidersScreen({super.key});

  @override
  State<ServiceProvidersScreen> createState() => _ServiceProvidersScreenState();
}

class _ServiceProvidersScreenState extends State<ServiceProvidersScreen>
    with SingleTickerProviderStateMixin {
  static const _radiusPrefKey = 'sp_directory_radius_km';

  late final TabController _tabController;
  final _searchController = TextEditingController();
  String _search = '';
  double _radiusKm = 50;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadRadius();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadRadius() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getDouble(_radiusPrefKey);
    if (stored != null && mounted) setState(() => _radiusKm = stored);
  }

  Future<void> _saveRadius(double v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_radiusPrefKey, v);
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
              context.go('/');
            }
          },
        ),
        title: const Text('Service Providers'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.public, size: 16), text: 'All'),
            Tab(icon: Icon(Icons.location_on_outlined, size: 16), text: 'Nearby'),
            Tab(icon: Icon(Icons.favorite_outline, size: 16), text: 'Following'),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search providers…',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v.trim()),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _AllTab(search: _search),
                _NearbyTab(
                  search: _search,
                  radiusKm: _radiusKm,
                  onChangeRadius: (v) {
                    setState(() => _radiusKm = v);
                    _saveRadius(v);
                  },
                ),
                _FollowingTab(search: _search),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared list ────────────────────────────────────────

class _ProviderList extends StatelessWidget {
  final List<ServiceProvider> providers;
  final Future<void> Function() onRefresh;
  final Widget? emptyState;

  const _ProviderList({
    required this.providers,
    required this.onRefresh,
    this.emptyState,
  });

  @override
  Widget build(BuildContext context) {
    if (providers.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.5,
              child: emptyState ??
                  EmptyState(
                    icon: Icons.business_outlined,
                    title: 'No providers found',
                    subtitle: 'Try adjusting your search.',
                  ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: providers.length,
        itemBuilder: (_, i) => _ProviderCard(provider: providers[i]),
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  final ServiceProvider provider;
  const _ProviderCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final isVerified = (provider.verificationStatus ?? '').toUpperCase() == 'VERIFIED';
    final location = [provider.city, provider.country]
        .where((e) => e != null && e.isNotEmpty)
        .join(', ');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/service-providers/${provider.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.accentBlue.withValues(alpha: 0.15),
                child: Text(
                  provider.name.isNotEmpty ? provider.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: AppColors.accentBlue,
                    fontWeight: FontWeight.w700,
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
                            provider.name,
                            style: Theme.of(context).textTheme.titleMedium,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 14, color: AppColors.accentBlue),
                        ],
                      ],
                    ),
                    if ((provider.industry?.isNotEmpty ?? false) || location.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          [
                            if (provider.industry?.isNotEmpty ?? false) provider.industry!,
                            if (location.isNotEmpty) location,
                          ].join(' · '),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              if (provider.trustScore != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: TrustScoreBadge(score: provider.trustScore),
                ),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── All tab ────────────────────────────────────────────

class _AllTab extends StatelessWidget {
  final String search;
  const _AllTab({required this.search});

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(spDirectoryQuery),
        variables: {
          'search': search.isEmpty ? null : search,
          'limit': 50,
          'offset': 0,
        },
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (result.hasException && result.data == null) {
          return _errorState(refetch);
        }
        final nodes =
            result.data?['serviceProviderDirectory']?['nodes'] as List<dynamic>? ?? [];
        return _ProviderList(
          providers: nodes
              .map((n) => ServiceProvider.fromJson(n as Map<String, dynamic>))
              .toList(),
          onRefresh: () async => refetch?.call(),
          emptyState: EmptyState(
            icon: Icons.business_outlined,
            title: 'No service providers found',
            subtitle: search.isEmpty
                ? 'Browse the directory to discover verified service providers.'
                : 'Try adjusting your search.',
          ),
        );
      },
    );
  }
}

// ─── Nearby tab ─────────────────────────────────────────

class _NearbyTab extends StatelessWidget {
  final String search;
  final double radiusKm;
  final ValueChanged<double> onChangeRadius;
  const _NearbyTab({
    required this.search,
    required this.radiusKm,
    required this.onChangeRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myCurrentAddressQuery),
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (addrResult, {fetchMore, refetch}) {
        final addr = addrResult.data?['myCurrentAddress'] as Map<String, dynamic>?;
        final lat = (addr?['latitude'] as num?)?.toDouble();
        final lng = (addr?['longitude'] as num?)?.toDouble();

        if (lat == null || lng == null) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: EmptyState(
                icon: Icons.location_off_outlined,
                title: 'Set your current address',
                subtitle:
                    'Add and mark a current address in Settings to discover nearby providers.',
                action: FilledButton.icon(
                  onPressed: () => context.push('/settings/addresses'),
                  icon: const Icon(Icons.add_location_alt_outlined),
                  label: const Text('Open Addresses'),
                ),
              ),
            ),
          );
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(Icons.tune, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Text('Radius: ${radiusKm.toStringAsFixed(0)} km',
                      style: Theme.of(context).textTheme.bodySmall),
                  Expanded(
                    child: Slider(
                      value: radiusKm.clamp(5, 200),
                      min: 5,
                      max: 200,
                      divisions: 39,
                      label: '${radiusKm.toStringAsFixed(0)} km',
                      onChanged: onChangeRadius,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Query(
                options: QueryOptions(
                  document: gql(nearbyProvidersQuery),
                  variables: {
                    'latitude': lat,
                    'longitude': lng,
                    'radiusKm': radiusKm,
                    'limit': 50,
                    'offset': 0,
                  },
                  fetchPolicy: FetchPolicy.cacheAndNetwork,
                ),
                builder: (result, {fetchMore, refetch}) {
                  if (result.isLoading && result.data == null) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (result.hasException && result.data == null) {
                    return _errorState(refetch);
                  }
                  final nodes = result.data?['nearbyServiceProviders']?['nodes']
                          as List<dynamic>? ??
                      [];
                  final all = nodes
                      .map((n) => ServiceProvider.fromJson(n as Map<String, dynamic>))
                      .where((p) => search.isEmpty ||
                          p.name.toLowerCase().contains(search.toLowerCase()))
                      .toList();
                  return _ProviderList(
                    providers: all,
                    onRefresh: () async => refetch?.call(),
                    emptyState: EmptyState(
                      icon: Icons.explore_off,
                      title: 'No nearby providers',
                      subtitle:
                          'No service providers found within ${radiusKm.toStringAsFixed(0)} km of your current address.',
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─── Following tab ──────────────────────────────────────

class _FollowingTab extends StatelessWidget {
  final String search;
  const _FollowingTab({required this.search});

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(followedProvidersQuery),
        variables: {
          'search': search.isEmpty ? null : search,
          'limit': 50,
          'offset': 0,
        },
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (result.hasException && result.data == null) {
          return _errorState(refetch);
        }
        final nodes =
            result.data?['followedServiceProviders']?['nodes'] as List<dynamic>? ?? [];
        return _ProviderList(
          providers: nodes
              .map((n) => ServiceProvider.fromJson(n as Map<String, dynamic>))
              .toList(),
          onRefresh: () async => refetch?.call(),
          emptyState: EmptyState(
            icon: Icons.favorite_border,
            title: 'No followed providers yet',
            subtitle:
                'Service providers you interact with will appear here automatically.',
          ),
        );
      },
    );
  }
}

Widget _errorState(Refetch? refetch) {
  return Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, color: AppColors.statusError, size: 32),
        const SizedBox(height: 8),
        const Text('Failed to load providers'),
        const SizedBox(height: 12),
        FilledButton(onPressed: () => refetch?.call(), child: const Text('Retry')),
      ],
    ),
  );
}
