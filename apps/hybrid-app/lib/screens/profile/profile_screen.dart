import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:provider/provider.dart';
import '../../graphql/profile.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';
import 'package:intl/intl.dart';

// ─── Profile Screen ─────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/profile/page.tsx
// Simplified for mobile — shows user info, stats, and quick actions.

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Query(
        options: QueryOptions(
          document: gql(myProfileQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          final profile = result.data?['myProfile'];
          final privacyScore = profile?['privacyScore'] as int? ?? 0;
          final joinedAt = profile?['createdAt'] as String?;
          final bio = profile?['bio'] as String?;
          final connectedProviders = profile?['connectedProviders'] as int? ?? 0;

          return RefreshIndicator(
            onRefresh: () async => refetch?.call(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                  // Cover gradient + avatar
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFF8B5CF6)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 32, bottom: 48),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 44,
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              backgroundImage: user?.avatarUrl != null
                                  ? NetworkImage(user!.avatarUrl!)
                                  : null,
                              child: user?.avatarUrl == null
                                  ? Text(
                                      (user?.fullName ?? 'U')[0].toUpperCase(),
                                      style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold),
                                    )
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              user?.fullName ?? 'User',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            if (user?.username != null)
                              Text(
                                '@${user!.username}',
                                style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.7)),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Stats row
                  Transform.translate(
                    offset: const Offset(0, -24),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _StatItem(
                                label: 'Privacy Score',
                                value: '$privacyScore%',
                                color: privacyScore >= 70
                                    ? AppColors.statusSuccess
                                    : privacyScore >= 40
                                        ? AppColors.statusWarning
                                        : AppColors.statusError,
                              ),
                              _StatItem(
                                label: 'Providers',
                                value: '$connectedProviders',
                                color: AppColors.accentBlue,
                              ),
                              _StatItem(
                                label: 'Joined',
                                value: joinedAt != null
                                    ? DateFormat('MMM yyyy').format(DateTime.parse(joinedAt))
                                    : '—',
                                color: AppColors.accentPurple,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Bio
                  if (bio != null && bio.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('About', style: Theme.of(context).textTheme.titleSmall),
                              const SizedBox(height: 8),
                              Text(bio, style: Theme.of(context).textTheme.bodyMedium),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Contact info
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Card(
                      child: Column(
                        children: [
                          _InfoTile(icon: Icons.email_outlined, label: 'Email', value: user?.email ?? '—'),
                          const Divider(height: 1),
                          _InfoTile(icon: Icons.phone_outlined, label: 'Mobile', value: user?.mobileNumber ?? 'Hidden'),
                          const Divider(height: 1),
                          _InfoTile(icon: Icons.person_outlined, label: 'Username', value: user?.username ?? '—'),
                        ],
                      ),
                    ),
                  ),

                  // Actions
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        _ActionTile(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          onTap: () => Navigator.of(context).pushNamed('/settings'),
                        ),
                        const SizedBox(height: 8),
                        _ActionTile(
                          icon: Icons.logout,
                          label: 'Sign Out',
                          color: AppColors.statusError,
                          onTap: () async {
                            final confirmed = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Sign Out'),
                                content: const Text('Are you sure you want to sign out?'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                  TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign Out')),
                                ],
                              ),
                            );
                            if (confirmed == true && context.mounted) {
                              await auth.logout();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 20, color: AppColors.textSecondary),
      title: Text(label, style: Theme.of(context).textTheme.bodySmall),
      trailing: Text(value, style: Theme.of(context).textTheme.bodyMedium),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback onTap;

  const _ActionTile({required this.icon, required this.label, this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.textPrimary;
    return Card(
      child: ListTile(
        leading: Icon(icon, color: c),
        title: Text(label, style: TextStyle(color: c, fontWeight: FontWeight.w500)),
        trailing: Icon(Icons.chevron_right, color: c.withValues(alpha: 0.5)),
        onTap: onTap,
      ),
    );
  }
}
