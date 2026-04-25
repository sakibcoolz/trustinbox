import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../config/theme.dart';
import '../../graphql/profile.dart';
import '../../graphql/service_providers.dart';
import '../../models/service_provider.dart';
import '../../services/chat_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/trust_score_badge.dart';

// ─── Service Provider Detail Screen ─────────────────────
// Mirrors: apps/web/src/app/(dashboard)/service-providers/page.tsx (detail panel)
// Full-screen page with Profile + History tabs, trust badge, block flow,
// and Chat-With-Bot CTAs.

class ServiceProviderDetailScreen extends StatefulWidget {
  final String serviceProviderId;
  const ServiceProviderDetailScreen({super.key, required this.serviceProviderId});

  @override
  State<ServiceProviderDetailScreen> createState() => _ServiceProviderDetailScreenState();
}

class _ServiceProviderDetailScreenState extends State<ServiceProviderDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String? _openingBotId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _openBotChat(Map<String, dynamic> bot) async {
    final botId = bot['id'] as String?;
    if (botId == null) return;
    setState(() => _openingBotId = botId);
    try {
      final conv = await ChatService.createBotConversation(botId);
      if (!mounted) return;
      if (conv == null || conv['id'] == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to open bot chat')),
        );
        return;
      }
      context.push('/conversations/${conv['id']}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _openingBotId = null);
    }
  }

  Future<bool?> _confirmBlock(BuildContext context, String name, bool isCurrentlyBlocked) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isCurrentlyBlocked ? 'Unblock $name?' : 'Block $name?'),
        content: Text(isCurrentlyBlocked
            ? 'They will be able to send notifications and request callbacks again.'
            : 'They will no longer be able to send you notifications, callbacks, or messages.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(
              foregroundColor: isCurrentlyBlocked ? AppColors.accentBlue : AppColors.statusError,
            ),
            child: Text(isCurrentlyBlocked ? 'Unblock' : 'Block'),
          ),
        ],
      ),
    );
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
              context.go('/service-providers');
            }
          },
        ),
        title: const Text('Provider Details'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Profile'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: _DetailBody(
        spId: widget.serviceProviderId,
        tabController: _tabController,
        onOpenBotChat: _openBotChat,
        onConfirmBlock: _confirmBlock,
        openingBotId: _openingBotId,
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  final String spId;
  final TabController tabController;
  final Future<void> Function(Map<String, dynamic>) onOpenBotChat;
  final Future<bool?> Function(BuildContext, String, bool) onConfirmBlock;
  final String? openingBotId;

  const _DetailBody({
    required this.spId,
    required this.tabController,
    required this.onOpenBotChat,
    required this.onConfirmBlock,
    required this.openingBotId,
  });

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(serviceProviderQuery),
        variables: {'id': spId},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (spResult, {fetchMore, refetch}) {
        if (spResult.isLoading && spResult.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (spResult.hasException && spResult.data == null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Failed to load provider',
                style: TextStyle(color: AppColors.statusError),
              ),
            ),
          );
        }
        final raw = spResult.data?['serviceProvider'] as Map<String, dynamic>?;
        if (raw == null) {
          return Center(
            child: EmptyState(
              icon: Icons.business_outlined,
              title: 'Provider not found',
              subtitle: 'This service provider may no longer exist.',
            ),
          );
        }
        final sp = ServiceProvider.fromJson(raw);
        return Column(
          children: [
            _Header(provider: sp),
            Expanded(
              child: TabBarView(
                controller: tabController,
                children: [
                  _ProfileTab(
                    provider: sp,
                    onOpenBotChat: onOpenBotChat,
                    onConfirmBlock: onConfirmBlock,
                    openingBotId: openingBotId,
                  ),
                  _HistoryTab(spId: sp.id),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─── Header ─────────────────────────────────────────────

class _Header extends StatelessWidget {
  final ServiceProvider provider;
  const _Header({required this.provider});

  @override
  Widget build(BuildContext context) {
    final isVerified = (provider.verificationStatus ?? '').toUpperCase() == 'VERIFIED';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderPrimary)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.accentBlue.withValues(alpha: 0.15),
            child: Text(
              provider.name.isNotEmpty ? provider.name[0].toUpperCase() : '?',
              style: const TextStyle(
                color: AppColors.accentBlue,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        provider.name,
                        style: Theme.of(context).textTheme.titleLarge,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isVerified) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified, size: 18, color: AppColors.accentBlue),
                    ],
                  ],
                ),
                if (provider.industry != null && provider.industry!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      provider.industry!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          TrustScoreBadge(score: provider.trustScore),
        ],
      ),
    );
  }
}

// ─── Profile Tab ────────────────────────────────────────

class _ProfileTab extends StatelessWidget {
  final ServiceProvider provider;
  final Future<void> Function(Map<String, dynamic>) onOpenBotChat;
  final Future<bool?> Function(BuildContext, String, bool) onConfirmBlock;
  final String? openingBotId;

  const _ProfileTab({
    required this.provider,
    required this.onOpenBotChat,
    required this.onConfirmBlock,
    required this.openingBotId,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _aboutCard(context),
        const SizedBox(height: 12),
        _detailsCard(context),
        const SizedBox(height: 12),
        _policyCard(context),
        const SizedBox(height: 12),
        _bots(context),
        const SizedBox(height: 16),
        _blockButton(context),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _aboutCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'About',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              (provider.description?.isNotEmpty ?? false)
                  ? provider.description!
                  : 'No description provided.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailsCard(BuildContext context) {
    final rows = <(String, String?)>[
      ('Industry', provider.industry),
      ('Verification', provider.verificationStatus),
      ('Website', provider.website),
      (
        'Location',
        [provider.address, provider.city, provider.state, provider.country]
            .where((e) => e != null && e.isNotEmpty)
            .join(', '),
      ),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final r in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 110,
                      child: Text(
                        r.$1.toUpperCase(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppColors.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        (r.$2?.isNotEmpty ?? false) ? r.$2! : '—',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _policyCard(BuildContext context) {
    Widget tile(IconData icon, String label) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.bgSecondary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Icon(icon, color: AppColors.accentBlue, size: 22),
                const SizedBox(height: 4),
                Text(label, style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ),
        );
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Communication Policy',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.textMuted,
                  letterSpacing: 0.5,
                )),
            const SizedBox(height: 10),
            Row(
              children: [
                tile(Icons.notifications_outlined, 'Notifications'),
                const SizedBox(width: 8),
                tile(Icons.phone_callback_outlined, 'Callbacks'),
                const SizedBox(width: 8),
                tile(Icons.description_outlined, 'Documents'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bots(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(serviceProviderActiveBotsQuery),
        variables: {
          'serviceProviderId': provider.id,
          'limit': 20,
          'offset': 0,
        },
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Published Bots',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                      letterSpacing: 0.5,
                    )),
                const SizedBox(height: 10),
                if (result.isLoading && result.data == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                else
                  _botList(context, result),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _botList(BuildContext context, QueryResult result) {
    final nodes = result.data?['bots']?['nodes'] as List<dynamic>? ?? [];
    if (nodes.isEmpty) {
      return Text(
        'No active bots published for this provider yet.',
        style: TextStyle(color: AppColors.textMuted, fontSize: 13),
      );
    }
    return Column(
      children: [
        for (final raw in nodes)
          _BotTile(
            bot: raw as Map<String, dynamic>,
            opening: openingBotId == (raw['id'] as String?),
            onChat: () => onOpenBotChat(raw),
          ),
      ],
    );
  }

  Widget _blockButton(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myBlockedProvidersQuery),
        variables: const {'limit': 100, 'offset': 0},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (blockedResult, {fetchMore, refetch}) {
        final list = (blockedResult.data?['myBlockedProviders']?['nodes']
                as List<dynamic>?) ??
            const [];
        final isBlocked = list.any((b) {
          final m = b as Map<String, dynamic>;
          final sp = m['serviceProvider'] as Map<String, dynamic>?;
          return sp?['id'] == provider.id;
        });

        return Mutation(
          options: MutationOptions(
            document: gql(isBlocked ? unblockSPMutation : blockSPMutation),
            onCompleted: (_) {
              refetch?.call();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(isBlocked
                      ? '${provider.name} unblocked'
                      : '${provider.name} blocked'),
                ),
              );
            },
            onError: (e) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Failed: ${e?.graphqlErrors.firstOrNull?.message ?? "unknown"}')),
              );
            },
          ),
          builder: (runMutation, mutationResult) {
            final loading = mutationResult?.isLoading ?? false;
            return SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: loading
                    ? null
                    : () async {
                        final ok = await onConfirmBlock(context, provider.name, isBlocked);
                        if (ok == true) {
                          runMutation({'serviceProviderId': provider.id});
                        }
                      },
                icon: Icon(
                  isBlocked ? Icons.check_circle_outline : Icons.block,
                  size: 18,
                  color: isBlocked ? AppColors.accentBlue : AppColors.statusError,
                ),
                label: Text(
                  loading
                      ? 'Processing…'
                      : isBlocked
                          ? 'Unblock Provider'
                          : 'Block Provider',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor:
                      isBlocked ? AppColors.accentBlue : AppColors.statusError,
                  side: BorderSide(
                    color: isBlocked ? AppColors.accentBlue : AppColors.statusError,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _BotTile extends StatelessWidget {
  final Map<String, dynamic> bot;
  final bool opening;
  final VoidCallback onChat;
  const _BotTile({required this.bot, required this.opening, required this.onChat});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderSecondary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.smart_toy_outlined, size: 16, color: AppColors.accentBlue),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  (bot['name'] as String?) ?? 'Unnamed bot',
                  style: Theme.of(context).textTheme.titleSmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.statusSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  ((bot['status'] as String?) ?? 'ACTIVE').toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.statusSuccess,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            ((bot['purpose'] as String?)?.isNotEmpty ?? false)
                ? bot['purpose'] as String
                : 'No purpose provided',
            style: Theme.of(context).textTheme.bodySmall,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: opening ? null : onChat,
              icon: opening
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chat_bubble_outline, size: 16),
              label: Text(opening ? 'Opening…' : 'Chat With Bot'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── History Tab ────────────────────────────────────────

class _HistoryTab extends StatelessWidget {
  final String spId;
  const _HistoryTab({required this.spId});

  @override
  Widget build(BuildContext context) {
    // Backend doesn't expose myNotifications(serviceProvider:) yet — fetch
    // recent notifications and filter client-side (web shows a placeholder).
    return Query(
      options: QueryOptions(
        document: gql(_recentNotificationsQuery),
        variables: const {'limit': 50, 'offset': 0},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final nodes = result.data?['myNotifications']?['nodes'] as List<dynamic>? ?? [];
        final filtered = nodes
            .where((n) {
              final sp = (n as Map<String, dynamic>)['serviceProvider'] as Map<String, dynamic>?;
              return sp?['id'] == spId;
            })
            .toList();
        if (filtered.isEmpty) {
          return Center(
            child: EmptyState(
              icon: Icons.history,
              title: 'No history yet',
              subtitle: 'Notifications and callbacks from this provider will appear here.',
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => refetch?.call(),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final n = filtered[i] as Map<String, dynamic>;
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(vertical: 4),
                leading: Icon(
                  Icons.notifications_outlined,
                  color: AppColors.accentBlue,
                ),
                title: Text(
                  (n['title'] as String?) ?? '(no title)',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  (n['body'] as String?) ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                onTap: () {
                  final id = n['id'] as String?;
                  if (id != null) context.push('/inbox/$id');
                },
              );
            },
          ),
        );
      },
    );
  }
}

const String _recentNotificationsQuery = r'''
  query RecentNotificationsForSP($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      nodes {
        id
        title
        body
        category
        status
        createdAt
        serviceProvider { id name }
      }
      totalCount
    }
  }
''';
