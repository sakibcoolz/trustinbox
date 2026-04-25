import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/chat_service.dart';

// ─── Forward Bottom Sheet ──────────────────────────────
// Lists the user's other conversations and forwards the message content
// (and any inherited attachments) to whichever conversation is tapped.
//
// There is no dedicated /forward endpoint — we send a normal message with
// a `forwardedFrom: {senderName}` envelope, mirroring the web app.
class ForwardSheet extends StatefulWidget {
  final String currentConversationId;
  final String content;
  final String fromSenderName;
  final List<String>? attachmentIds;

  const ForwardSheet({
    super.key,
    required this.currentConversationId,
    required this.content,
    required this.fromSenderName,
    this.attachmentIds,
  });

  static Future<void> show(
    BuildContext context, {
    required String currentConversationId,
    required String content,
    required String fromSenderName,
    List<String>? attachmentIds,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => ForwardSheet(
        currentConversationId: currentConversationId,
        content: content,
        fromSenderName: fromSenderName,
        attachmentIds: attachmentIds,
      ),
    );
  }

  @override
  State<ForwardSheet> createState() => _ForwardSheetState();
}

class _ForwardSheetState extends State<ForwardSheet> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  final Set<String> _sending = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await ChatService.listConversations();
    if (!mounted) return;
    setState(() {
      _conversations = list
          .where((c) => (c['id'] as String?) != widget.currentConversationId)
          .toList();
      _loading = false;
    });
  }

  Future<void> _forwardTo(String conversationId) async {
    setState(() => _sending.add(conversationId));
    final ok = await ChatService.forwardMessage(
      conversationId,
      widget.content,
      fromSenderName: widget.fromSenderName,
      attachmentIds: widget.attachmentIds,
    );
    if (!mounted) return;
    setState(() => _sending.remove(conversationId));
    if (ok != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Forwarded'), duration: Duration(seconds: 1)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to forward')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      builder: (_, scrollController) {
        return Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.textMuted,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Forward to…',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _conversations.isEmpty
                      ? Center(
                          child: Text(
                            'No other conversations',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: _conversations.length,
                          itemBuilder: (_, i) {
                            final c = _conversations[i];
                            final id = c['id'] as String;
                            final participants =
                                (c['participants'] as List<dynamic>? ?? const []);
                            String name = c['displayName'] as String? ?? 'Chat';
                            for (final p in participants) {
                              final m = p as Map<String, dynamic>;
                              if (m['userId'] != userId) {
                                final n = (m['fullName'] as String?)?.trim();
                                if (n != null && n.isNotEmpty) {
                                  name = n;
                                  break;
                                }
                              }
                            }
                            final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
                            final isSending = _sending.contains(id);

                            return ListTile(
                              leading: CircleAvatar(
                                backgroundColor:
                                    AppColors.accentBlue.withValues(alpha: 0.2),
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    color: AppColors.accentBlue,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
                              trailing: isSending
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.send, size: 18),
                              onTap: isSending ? null : () => _forwardTo(id),
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
