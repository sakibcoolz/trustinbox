import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../graphql/notifications.dart';
import '../../graphql/profile.dart';
import '../../models/notification.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/empty_state.dart';

// ─── Profile Screen ─────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/profile/page.tsx
// 5 tabs: Overview · Activity · Privacy · Security · Career.

const _kCoverPrefKey = 'profile_cover_idx';

const List<List<Color>> _kGradients = [
  [Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFF7C3AED)],
  [Color(0xFF06B6D4), Color(0xFF3B82F6), Color(0xFF4F46E5)],
  [Color(0xFF7C3AED), Color(0xFFA855F7), Color(0xFFEC4899)],
  [Color(0xFF10B981), Color(0xFF0D9488), Color(0xFF06B6D4)],
  [Color(0xFFF97316), Color(0xFFEF4444), Color(0xFFF43F5E)],
];

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  int _coverIdx = 0;
  bool _avatarUploading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadCover();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadCover() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getInt(_kCoverPrefKey) ?? 0;
    if (mounted) setState(() => _coverIdx = v.clamp(0, 4));
  }

  Future<void> _setCover(int idx) async {
    setState(() => _coverIdx = idx);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kCoverPrefKey, idx);
  }

  // ─── Avatar upload ────────────────────────────────────

  Future<void> _pickAvatar() async {
    final source = await _showAvatarSheet();
    if (source == null || !mounted) return;
    if (source == 'remove') {
      await _uploadAvatar(null);
      return;
    }
    final picker = ImagePicker();
    final XFile? file = await picker.pickImage(
      source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;
    await _uploadAvatar(File(file.path));
  }

  Future<String?> _showAvatarSheet() {
    return showModalBottomSheet<String>(
      context: context,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(sheetCtx, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(sheetCtx, 'gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.accentRed),
              title: const Text('Remove photo', style: TextStyle(color: AppColors.accentRed)),
              onTap: () => Navigator.pop(sheetCtx, 'remove'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _uploadAvatar(File? file) async {
    // Capture context-dependent values before any await
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final token = auth.token;
    if (token == null) return;

    setState(() => _avatarUploading = true);
    try {
      String? avatarUrl;
      if (file != null) {
        final request = http.MultipartRequest(
          'POST',
          Uri.parse('${AppConstants.apiBaseUrl}/api/users/me/avatar'),
        )
          ..headers['Authorization'] = 'Bearer $token'
          ..files.add(await http.MultipartFile.fromPath('avatar', file.path));
        final resp = await request.send();
        if (resp.statusCode == 200) {
          final body = json.decode(await resp.stream.bytesToString()) as Map<String, dynamic>;
          avatarUrl = body['avatarUrl'] as String?;
        }
      } else {
        // remove
        await http.delete(
          Uri.parse('${AppConstants.apiBaseUrl}/api/users/me/avatar'),
          headers: {'Authorization': 'Bearer $token'},
        );
      }
      if (!mounted) return;
      auth.updateAvatar(avatarUrl);
    } catch (e) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Avatar update failed')),
      );
    } finally {
      if (mounted) setState(() => _avatarUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final gradient = _kGradients[_coverIdx];

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            floating: false,
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
            title: const Text('Profile'),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Cover gradient
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: gradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                  // Gradient picker
                  Positioned(
                    top: 12,
                    right: 12,
                    child: SafeArea(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(
                            _kGradients.length,
                            (i) => GestureDetector(
                              onTap: () => _setCover(i),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                width: _coverIdx == i ? 20 : 14,
                                height: _coverIdx == i ? 20 : 14,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: _kGradients[i],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  border: _coverIdx == i
                                      ? Border.all(color: Colors.white, width: 2)
                                      : null,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Avatar at bottom
                  Positioned(
                    bottom: 16,
                    left: 20,
                    child: GestureDetector(
                      onTap: () => _pickAvatar(),
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 36,
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            backgroundImage: user?.avatarUrl != null
                                ? CachedNetworkImageProvider(user!.avatarUrl!)
                                : null,
                            child: user?.avatarUrl == null
                                ? Text(
                                    (user?.fullName ?? 'U')[0].toUpperCase(),
                                    style: const TextStyle(
                                      fontSize: 28,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                                : null,
                          ),
                          if (_avatarUploading)
                            Positioned.fill(
                              child: CircleAvatar(
                                backgroundColor: Colors.black.withValues(alpha: 0.5),
                                child: const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: AppColors.accentBlue,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 1.5),
                              ),
                              child: const Icon(Icons.camera_alt, size: 12, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Name overlay at bottom-right of cover
                  Positioned(
                    bottom: 20,
                    left: 96,
                    right: 16,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          user?.fullName ?? 'User',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            shadows: [Shadow(blurRadius: 6)],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (user?.username != null)
                          Text(
                            '@${user!.username}',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 12,
                              shadows: const [Shadow(blurRadius: 4)],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Activity'),
                Tab(text: 'Privacy'),
                Tab(text: 'Security'),
                Tab(text: 'Career'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _OverviewTab(user: user),
            _ActivityTab(),
            _PrivacyTab(),
            _SecurityTab(user: user),
            _CareerTab(),
          ],
        ),
      ),
    );
  }
}

// ─── Overview Tab ────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  final dynamic user;
  const _OverviewTab({required this.user});

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myProfileQuery),
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        final profile = result.data?['myProfile'] as Map<String, dynamic>?;
        final language = profile?['language'] as String? ?? '—';
        final timezone = profile?['timezone'] as String? ?? '—';
        return RefreshIndicator(
          onRefresh: () async => refetch?.call(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Contact card
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Text('Contact', style: Theme.of(context).textTheme.titleSmall),
                    ),
                    _InfoRow(icon: Icons.email_outlined, label: 'Email', value: user?.email ?? '—'),
                    const Divider(height: 1),
                    _InfoRow(icon: Icons.person_outlined, label: 'Username', value: user?.username != null ? '@${user.username}' : '—'),
                    const Divider(height: 1),
                    _InfoRow(icon: Icons.phone_outlined, label: 'Mobile', value: 'Hidden for privacy'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Locale card
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Text('Locale', style: Theme.of(context).textTheme.titleSmall),
                    ),
                    _InfoRow(icon: Icons.language, label: 'Language', value: language),
                    const Divider(height: 1),
                    _InfoRow(icon: Icons.access_time_outlined, label: 'Timezone', value: timezone),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Quick actions
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.business_outlined, color: AppColors.accentBlue),
                      title: const Text('Service Providers'),
                      subtitle: const Text('View providers you interact with'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/service-providers'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.settings_outlined, color: AppColors.accentPurple),
                      title: const Text('Settings'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/settings'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.logout, color: AppColors.accentRed),
                      title: const Text('Sign Out', style: TextStyle(color: AppColors.accentRed)),
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
                          await context.read<AuthProvider>().logout();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 18, color: AppColors.textMuted),
      title: Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
      trailing: Text(value, style: Theme.of(context).textTheme.bodyMedium),
    );
  }
}

// ─── Activity Tab ─────────────────────────────────────────

class _ActivityTab extends StatelessWidget {
  const _ActivityTab();

  Color _typeColor(String type) {
    switch (type) {
      case 'callback': return AppColors.accentOrange;
      case 'message': return AppColors.accentPurple;
      default: return AppColors.accentBlue;
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'callback': return Icons.phone_outlined;
      case 'message': return Icons.chat_bubble_outline;
      default: return Icons.notifications_outlined;
    }
  }

  String _formatTime(String? ts) {
    if (ts == null) return '';
    final date = DateTime.tryParse(ts);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myNotificationsQuery),
        variables: const {'limit': 30, 'offset': 0},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final nodes = result.data?['myNotifications']?['nodes'] as List<dynamic>? ?? [];
        if (nodes.isEmpty) {
          return EmptyState(
            icon: Icons.history,
            title: 'No activity yet',
            subtitle: 'Your notifications will appear here.',
          );
        }
        return RefreshIndicator(
          onRefresh: () async => refetch?.call(),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: nodes.length,
            itemBuilder: (_, i) {
              final n = AppNotification.fromJson(nodes[i] as Map<String, dynamic>);
              final type = 'notification';
              return ListTile(
                leading: CircleAvatar(
                  radius: 18,
                  backgroundColor: _typeColor(type).withValues(alpha: 0.15),
                  child: Icon(_typeIcon(type), color: _typeColor(type), size: 16),
                ),
                title: Text(n.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: n.body.isNotEmpty
                    ? Text(n.body, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall)
                    : null,
                trailing: Text(
                  _formatTime(n.createdAt),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                ),
                onTap: () => context.push('/inbox/${n.id}'),
              );
            },
          ),
        );
      },
    );
  }
}

// ─── Privacy Tab ──────────────────────────────────────────

class _PrivacyTab extends StatelessWidget {
  const _PrivacyTab();

  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myPrivacyPrefsForProfileQuery),
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        final p = result.data?['myPrivacyPreferences'] as Map<String, dynamic>?;
        final policies = p == null
            ? <_PolicyRow>[]
            : [
                _PolicyRow('Personal notifications', p['allowPersonalNotifications'] == true ? 'Allowed' : 'Blocked', p['allowPersonalNotifications'] == true ? AppColors.statusSuccess : AppColors.accentRed),
                _PolicyRow('SP notifications', p['allowSPNotifications'] == true ? 'Allowed' : 'Blocked', p['allowSPNotifications'] == true ? AppColors.accentBlue : AppColors.accentRed),
                _PolicyRow('Advertisements', p['allowAdvertisements'] == true ? 'Allowed' : 'Opt-In only', p['allowAdvertisements'] == true ? AppColors.accentOrange : AppColors.statusSuccess),
                _PolicyRow('Phone callbacks', p['requireCallApproval'] == true ? 'Requires approval' : 'Allow all', p['requireCallApproval'] == true ? AppColors.accentPurple : AppColors.accentOrange),
                _PolicyRow('Chat messages', p['allowChat'] == true ? 'Allowed' : 'Blocked', p['allowChat'] == true ? AppColors.accentBlue : AppColors.accentRed),
              ];

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text('Current Privacy Settings', style: Theme.of(context).textTheme.titleSmall),
                  ),
                  if (p == null && result.isLoading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else
                    ...policies.map((row) => ListTile(
                          title: Text(row.label, style: const TextStyle(fontSize: 13)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: row.color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              row.status,
                              style: TextStyle(fontSize: 11, color: row.color, fontWeight: FontWeight.w600),
                            ),
                          ),
                        )),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => context.push('/settings/privacy'),
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Edit Privacy Settings'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => context.push('/settings/preferences'),
              icon: const Icon(Icons.notifications_outlined, size: 16),
              label: const Text('Notification Preferences'),
            ),
          ],
        );
      },
    );
  }
}

class _PolicyRow {
  final String label;
  final String status;
  final Color color;
  const _PolicyRow(this.label, this.status, this.color);
}

// ─── Security Tab ─────────────────────────────────────────

class _SecurityTab extends StatelessWidget {
  final dynamic user;
  const _SecurityTab({required this.user});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text('Account Security', style: Theme.of(context).textTheme.titleSmall),
              ),
              ListTile(
                leading: const Icon(Icons.account_circle_outlined, color: AppColors.accentBlue),
                title: const Text('Email', style: TextStyle(fontSize: 13)),
                trailing: Text(user?.email ?? '—', style: Theme.of(context).textTheme.bodySmall),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.lock_outlined, color: AppColors.accentPurple),
                title: const Text('Change password'),
                trailing: const Icon(Icons.chevron_right),
                // Phase 07 ships forgot-password / change-password flow
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Change password — coming in next update')),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.security_outlined, color: AppColors.accentGreen),
                title: const Text('Two-factor authentication'),
                subtitle: const Text('Coming soon', style: TextStyle(fontSize: 11)),
                trailing: Switch(
                  value: false,
                  onChanged: null, // placeholder
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text('Active Sessions', style: Theme.of(context).textTheme.titleSmall),
              ),
              const ListTile(
                leading: Icon(Icons.devices_outlined, color: AppColors.accentOrange),
                title: Text('Session management', style: TextStyle(fontSize: 13)),
                subtitle: Text('Coming soon', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Career Tab ───────────────────────────────────────────

class _CareerTab extends StatefulWidget {
  const _CareerTab();

  @override
  State<_CareerTab> createState() => _CareerTabState();
}

class _CareerTabState extends State<_CareerTab> {
  List<Map<String, dynamic>> _work = [];
  List<Map<String, dynamic>> _education = [];
  List<Map<String, dynamic>> _skills = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<String?> _token() async {
    return context.read<AuthProvider>().token;
  }

  String _base() => AppConstants.apiBaseUrl;

  Future<void> _load() async {
    setState(() => _loading = true);
    final token = await _token();
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final resp = await http.get(
        Uri.parse('${_base()}/api/career'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (resp.statusCode == 200) {
        final data = json.decode(resp.body) as Map<String, dynamic>;
        setState(() {
          _work = List<Map<String, dynamic>>.from(data['workExperience'] as List? ?? []);
          _education = List<Map<String, dynamic>>.from(data['education'] as List? ?? []);
          _skills = List<Map<String, dynamic>>.from(data['skills'] as List? ?? []);
        });
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  // ─── Work ────────────────────────────────────────────

  Future<void> _saveWork(Map<String, dynamic> payload) async {
    final token = await _token();
    if (token == null) return;
    final method = payload['id'] != null ? 'PUT' : 'POST';
    final req = http.Request(method, Uri.parse('${_base()}/api/career/work'))
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Content-Type'] = 'application/json'
      ..body = json.encode(payload);
    await req.send();
    _load();
  }

  Future<void> _deleteWork(String id) async {
    final token = await _token();
    if (token == null) return;
    await http.delete(
      Uri.parse('${_base()}/api/career/work?id=$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    _load();
  }

  // ─── Education ────────────────────────────────────────

  Future<void> _saveEdu(Map<String, dynamic> payload) async {
    final token = await _token();
    if (token == null) return;
    final method = payload['id'] != null ? 'PUT' : 'POST';
    final req = http.Request(method, Uri.parse('${_base()}/api/career/education'))
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Content-Type'] = 'application/json'
      ..body = json.encode(payload);
    await req.send();
    _load();
  }

  Future<void> _deleteEdu(String id) async {
    final token = await _token();
    if (token == null) return;
    await http.delete(
      Uri.parse('${_base()}/api/career/education?id=$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    _load();
  }

  // ─── Skills ───────────────────────────────────────────

  Future<void> _addSkill(Map<String, dynamic> payload) async {
    final token = await _token();
    if (token == null) return;
    await http.post(
      Uri.parse('${_base()}/api/career/skills'),
      headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      body: json.encode(payload),
    );
    _load();
  }

  Future<void> _deleteSkill(String id) async {
    final token = await _token();
    if (token == null) return;
    await http.delete(
      Uri.parse('${_base()}/api/career/skills?id=$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    _load();
  }

  // ─── UI ──────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionCard(
            title: 'Work Experience',
            icon: Icons.work_outline,
            color: AppColors.accentBlue,
            onAdd: () => _showWorkSheet(context),
            children: _work.isEmpty
                ? [_emptyHint(context, 'No work experience added yet')]
                : _work.map((w) => _WorkTile(
                      data: w,
                      onEdit: () => _showWorkSheet(context, existing: w),
                      onDelete: () => _deleteWork(w['id'] as String),
                    )).toList(),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Education',
            icon: Icons.school_outlined,
            color: AppColors.accentPurple,
            onAdd: () => _showEduSheet(context),
            children: _education.isEmpty
                ? [_emptyHint(context, 'No education entries added yet')]
                : _education.map((e) => _EduTile(
                      data: e,
                      onEdit: () => _showEduSheet(context, existing: e),
                      onDelete: () => _deleteEdu(e['id'] as String),
                    )).toList(),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Skills',
            icon: Icons.star_outline,
            color: AppColors.accentGreen,
            onAdd: () => _showSkillSheet(context),
            children: _skills.isEmpty
                ? [_emptyHint(context, 'No skills added yet')]
                : [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: _skills.map((s) {
                          final level = (s['level'] as String? ?? '').toUpperCase();
                          final levelColor = level == 'EXPERT'
                              ? AppColors.accentPurple
                              : level == 'ADVANCED'
                                  ? AppColors.accentBlue
                                  : level == 'INTERMEDIATE'
                                      ? AppColors.accentGreen
                                      : AppColors.textMuted;
                          return Chip(
                            label: Text(s['name'] as String? ?? ''),
                            deleteIcon: const Icon(Icons.close, size: 14),
                            onDeleted: () => _deleteSkill(s['id'] as String),
                            avatar: level.isNotEmpty
                                ? CircleAvatar(
                                    backgroundColor: levelColor.withValues(alpha: 0.2),
                                    child: Text(
                                      level[0],
                                      style: TextStyle(fontSize: 9, color: levelColor, fontWeight: FontWeight.bold),
                                    ),
                                  )
                                : null,
                          );
                        }).toList(),
                      ),
                    ),
                  ],
          ),
        ],
      ),
    );
  }

  Widget _emptyHint(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Text(text, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
    );
  }

  // ─── Work bottom sheet ───────────────────────────────

  void _showWorkSheet(BuildContext context, {Map<String, dynamic>? existing}) {
    final form = <String, dynamic>{
      'id': existing?['id'],
      'jobTitle': existing?['jobTitle'] ?? '',
      'company': existing?['company'] ?? '',
      'location': existing?['location'] ?? '',
      'startDate': existing?['startDate'] ?? '',
      'endDate': existing?['endDate'] ?? '',
      'isCurrent': existing?['isCurrent'] ?? false,
      'description': existing?['description'] ?? '',
    };
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _WorkForm(initial: form, onSave: _saveWork),
    );
  }

  // ─── Education bottom sheet ──────────────────────────

  void _showEduSheet(BuildContext context, {Map<String, dynamic>? existing}) {
    final form = <String, dynamic>{
      'id': existing?['id'],
      'school': existing?['school'] ?? '',
      'degree': existing?['degree'] ?? '',
      'field': existing?['field'] ?? '',
      'startYear': existing?['startYear'] ?? DateTime.now().year - 4,
      'endYear': existing?['endYear'] ?? DateTime.now().year,
      'isCurrent': existing?['isCurrent'] ?? false,
      'description': existing?['description'] ?? '',
    };
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EduForm(initial: form, onSave: _saveEdu),
    );
  }

  // ─── Skill bottom sheet ──────────────────────────────

  void _showSkillSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SkillForm(onSave: _addSkill),
    );
  }
}

// ─── Career section card ──────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onAdd;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.onAdd,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 8, 4),
            child: Row(
              children: [
                Icon(icon, color: color, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleSmall),
                ),
                TextButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add'),
                  style: TextButton.styleFrom(foregroundColor: color),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }
}

class _WorkTile extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _WorkTile({required this.data, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final isCurrent = data['isCurrent'] == true;
    final period = isCurrent
        ? '${data['startDate'] ?? ''} — Present'
        : '${data['startDate'] ?? ''} – ${data['endDate'] ?? ''}';
    return ListTile(
      title: Text(data['jobTitle'] as String? ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(data['company'] as String? ?? '', style: const TextStyle(fontSize: 12)),
          if (period.trim().isNotEmpty)
            Text(period, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11, color: AppColors.textMuted)),
          if ((data['location'] as String?)?.isNotEmpty == true)
            Text(data['location'] as String, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(icon: const Icon(Icons.edit_outlined, size: 18), onPressed: onEdit),
          IconButton(icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.accentRed), onPressed: onDelete),
        ],
      ),
    );
  }
}

class _EduTile extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _EduTile({required this.data, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final isCurrent = data['isCurrent'] == true;
    final endYear = isCurrent ? 'Present' : '${data['endYear'] ?? ''}';
    return ListTile(
      title: Text(data['school'] as String? ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((data['degree'] as String?)?.isNotEmpty == true)
            Text('${data['degree']} – ${data['field'] ?? ''}', style: const TextStyle(fontSize: 12)),
          Text('${data['startYear'] ?? ''} – $endYear',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(icon: const Icon(Icons.edit_outlined, size: 18), onPressed: onEdit),
          IconButton(icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.accentRed), onPressed: onDelete),
        ],
      ),
    );
  }
}

// ─── Work form ────────────────────────────────────────────

class _WorkForm extends StatefulWidget {
  final Map<String, dynamic> initial;
  final Future<void> Function(Map<String, dynamic>) onSave;
  const _WorkForm({required this.initial, required this.onSave});

  @override
  State<_WorkForm> createState() => _WorkFormState();
}

class _WorkFormState extends State<_WorkForm> {
  late final TextEditingController _title;
  late final TextEditingController _company;
  late final TextEditingController _location;
  late final TextEditingController _startDate;
  late final TextEditingController _endDate;
  late final TextEditingController _description;
  bool _isCurrent = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final d = widget.initial;
    _title = TextEditingController(text: d['jobTitle'] as String? ?? '');
    _company = TextEditingController(text: d['company'] as String? ?? '');
    _location = TextEditingController(text: d['location'] as String? ?? '');
    _startDate = TextEditingController(text: d['startDate'] as String? ?? '');
    _endDate = TextEditingController(text: d['endDate'] as String? ?? '');
    _description = TextEditingController(text: d['description'] as String? ?? '');
    _isCurrent = d['isCurrent'] == true;
  }

  @override
  void dispose() {
    for (final c in [_title, _company, _location, _startDate, _endDate, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty || _company.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await widget.onSave({
      'id': widget.initial['id'],
      'jobTitle': _title.text.trim(),
      'company': _company.text.trim(),
      'location': _location.text.trim(),
      'startDate': _startDate.text.trim(),
      'endDate': _isCurrent ? '' : _endDate.text.trim(),
      'isCurrent': _isCurrent,
      'description': _description.text.trim(),
    });
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.initial['id'] != null ? 'Edit Work Experience' : 'Add Work Experience',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            _field(_title, 'Job title*'),
            _field(_company, 'Company*'),
            _field(_location, 'Location'),
            _field(_startDate, 'Start date (YYYY-MM)'),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Currently working here'),
              value: _isCurrent,
              onChanged: (v) => setState(() => _isCurrent = v),
            ),
            if (!_isCurrent) _field(_endDate, 'End date (YYYY-MM)'),
            _field(_description, 'Description', maxLines: 3),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'Saving…' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        maxLines: maxLines,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}

// ─── Education form ──────────────────────────────────────

class _EduForm extends StatefulWidget {
  final Map<String, dynamic> initial;
  final Future<void> Function(Map<String, dynamic>) onSave;
  const _EduForm({required this.initial, required this.onSave});

  @override
  State<_EduForm> createState() => _EduFormState();
}

class _EduFormState extends State<_EduForm> {
  late final TextEditingController _school;
  late final TextEditingController _degree;
  late final TextEditingController _field;
  late final TextEditingController _startYear;
  late final TextEditingController _endYear;
  late final TextEditingController _description;
  bool _isCurrent = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final d = widget.initial;
    _school = TextEditingController(text: d['school'] as String? ?? '');
    _degree = TextEditingController(text: d['degree'] as String? ?? '');
    _field = TextEditingController(text: d['field'] as String? ?? '');
    _startYear = TextEditingController(text: '${d['startYear'] ?? ''}');
    _endYear = TextEditingController(text: '${d['endYear'] ?? ''}');
    _description = TextEditingController(text: d['description'] as String? ?? '');
    _isCurrent = d['isCurrent'] == true;
  }

  @override
  void dispose() {
    for (final c in [_school, _degree, _field, _startYear, _endYear, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (_school.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await widget.onSave({
      'id': widget.initial['id'],
      'school': _school.text.trim(),
      'degree': _degree.text.trim(),
      'field': _field.text.trim(),
      'startYear': int.tryParse(_startYear.text.trim()) ?? 0,
      'endYear': _isCurrent ? 0 : int.tryParse(_endYear.text.trim()),
      'isCurrent': _isCurrent,
      'description': _description.text.trim(),
    });
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.initial['id'] != null ? 'Edit Education' : 'Add Education',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            _f(_school, 'School / Institution*'),
            _f(_degree, 'Degree'),
            _f(_field, 'Field of study'),
            _f(_startYear, 'Start year', type: TextInputType.number),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Currently attending'),
              value: _isCurrent,
              onChanged: (v) => setState(() => _isCurrent = v),
            ),
            if (!_isCurrent) _f(_endYear, 'End year', type: TextInputType.number),
            _f(_description, 'Description', maxLines: 2),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'Saving…' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _f(TextEditingController c, String label, {int maxLines = 1, TextInputType type = TextInputType.text}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        maxLines: maxLines,
        keyboardType: type,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}

// ─── Skill form ───────────────────────────────────────────

class _SkillForm extends StatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSave;
  const _SkillForm({required this.onSave});

  @override
  State<_SkillForm> createState() => _SkillFormState();
}

class _SkillFormState extends State<_SkillForm> {
  final _name = TextEditingController();
  String _level = '';
  bool _saving = false;

  static const _levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await widget.onSave({'name': _name.text.trim(), 'level': _level});
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Add Skill', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Skill name*'),
            ),
            const SizedBox(height: 12),
            const Text('Level', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: _levels.map((l) {
                final selected = _level == l;
                return ChoiceChip(
                  label: Text(l[0] + l.substring(1).toLowerCase()),
                  selected: selected,
                  onSelected: (_) => setState(() => _level = l),
                  selectedColor: AppColors.accentBlue.withValues(alpha: 0.2),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'Saving…' : 'Add Skill'),
            ),
          ],
        ),
      ),
    );
  }
}
