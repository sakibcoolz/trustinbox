import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/callbacks.dart';
import '../../models/callback_request.dart';
import '../../config/theme.dart';
import '../../services/contact_service.dart';
import '../../widgets/empty_state.dart';

// ─── Callbacks Screen ───────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/callbacks/page.tsx

class CallbacksScreen extends StatefulWidget {
  const CallbacksScreen({super.key});

  @override
  State<CallbacksScreen> createState() => _CallbacksScreenState();
}

class _CallbacksScreenState extends State<CallbacksScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      setState(() {
        switch (_tabController.index) {
          case 0:
            _statusFilter = null;
            break;
          case 1:
            _statusFilter = 'pending';
            break;
          case 2:
            _statusFilter = 'approved';
            break;
          case 3:
            _statusFilter = 'rejected';
            break;
        }
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
        title: const Text('Callback Requests'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Pending'),
            Tab(text: 'Approved'),
            Tab(text: 'Rejected'),
          ],
        ),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myCallbacksQuery),
          variables: {
            'status': _statusFilter,
            'limit': 20,
            'offset': 0,
          },
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final nodes = result.data?['myCallbackRequests']?['nodes'] as List<dynamic>? ?? [];
          final callbacks = nodes.map((c) => CallbackRequest.fromJson(c as Map<String, dynamic>)).toList();

          if (callbacks.isEmpty) {
            return EmptyState(
              icon: Icons.phone_callback_outlined,
              title: 'No callback requests',
              subtitle: 'Callback requests from service providers will appear here',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => refetch?.call(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: callbacks.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
              itemBuilder: (context, index) {
                final cb = callbacks[index];
                return _CallbackTile(
                  callback: cb,
                  onApprove: () => _showApproveDialog(context, cb),
                  onReject: () => _showRejectDialog(context, cb.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showApproveDialog(BuildContext context, CallbackRequest cb) {
    final nameController = TextEditingController(text: cb.serviceProvider?.name ?? '');
    final phoneController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Approve Callback'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Approve callback from ${cb.serviceProvider?.name ?? "Unknown"}?'),
            const SizedBox(height: 16),
            const Text('Save as contact (for calls):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Contact Name',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                hintText: 'Enter SP phone to save',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          Mutation(
            options: MutationOptions(
              document: gql(approveCallbackMutation),
              onCompleted: (data) async {
                Navigator.pop(ctx);
                // Auto-save contact if phone number provided
                final phone = phoneController.text.trim();
                final name = nameController.text.trim();
                if (phone.isNotEmpty && name.isNotEmpty) {
                  final saved = await ContactService.saveContact(
                    phoneNumber: phone,
                    displayName: name,
                    organization: cb.serviceProvider?.name,
                    note: 'Approved via TrustInbox callback',
                  );
                  if (saved && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Contact "$name" saved — they can now call you')),
                    );
                  }
                }
              },
            ),
            builder: (runMutation, result) {
              return FilledButton(
                onPressed: () {
                  runMutation({
                    'input': {
                      'callbackRequestId': cb.id,
                      'approvedSlotStart': DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
                      'approvedSlotEnd': DateTime.now().add(const Duration(hours: 2)).toIso8601String(),
                    },
                  });
                },
                child: const Text('Approve & Save Contact'),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context, String callbackId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Callback'),
        content: const Text('Reject this callback request?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          Mutation(
            options: MutationOptions(
              document: gql(rejectCallbackMutation),
              onCompleted: (_) => Navigator.pop(ctx),
            ),
            builder: (runMutation, result) {
              return FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.accentRed),
                onPressed: () {
                  runMutation({
                    'input': {'callbackRequestId': callbackId},
                  });
                },
                child: const Text('Reject'),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CallbackTile extends StatelessWidget {
  final CallbackRequest callback;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _CallbackTile({
    required this.callback,
    required this.onApprove,
    required this.onReject,
  });

  Color _statusColor() {
    switch (callback.status) {
      case 'approved':
        return AppColors.statusSuccess;
      case 'rejected':
        return AppColors.statusError;
      case 'expired':
        return AppColors.textMuted;
      default:
        return AppColors.statusWarning;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: _statusColor().withValues(alpha: 0.15),
        child: Icon(Icons.phone_callback_outlined, color: _statusColor(), size: 20),
      ),
      title: Text(callback.serviceProvider?.name ?? 'Unknown'),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (callback.reason != null)
            Text(callback.reason!, maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _statusColor().withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              callback.status.toUpperCase(),
              style: TextStyle(color: _statusColor(), fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      trailing: callback.status == 'pending'
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.check_circle_outline, color: AppColors.statusSuccess, size: 20),
                  onPressed: onApprove,
                ),
                IconButton(
                  icon: const Icon(Icons.cancel_outlined, color: AppColors.statusError, size: 20),
                  onPressed: onReject,
                ),
              ],
            )
          : null,
    );
  }
}
