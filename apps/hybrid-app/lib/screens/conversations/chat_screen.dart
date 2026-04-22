import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/chat_service.dart';
import '../../config/theme.dart';
import 'package:intl/intl.dart';

// ─── Chat Screen ────────────────────────────────────────
// Mirrors: apps/web/src/components/chat/chat-area.tsx
// Profile header, reply, edit, delete, context menu, load more.

class ChatScreen extends StatefulWidget {
  final String conversationId;
  const ChatScreen({super.key, required this.conversationId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  List<Message> _messages = [];
  Conversation? _conversation;
  bool _isLoading = true;
  bool _isSending = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  VoidCallback? _unsubscribeChat;
  VoidCallback? _unsubscribeRead;

  // Reply / Edit state
  Message? _replyingTo;
  Message? _editing;

  @override
  void initState() {
    super.initState();
    _loadConversation();
    _subscribeToChatMessages();
    _subscribeToReadReceipts();
    _scrollController.addListener(_onScroll);
  }

  // ─── Scroll-to-Load-More ─────────────────────────────
  void _onScroll() {
    if (_scrollController.hasClients &&
        _scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMoreMessages();
    }
  }

  void _subscribeToChatMessages() {
    final notifProvider = context.read<NotificationProvider>();
    _unsubscribeChat = notifProvider.onChatMessage((data) {
      final convId = data['conversationId'] as String?;
      if (convId != widget.conversationId) return;

      final auth = context.read<AuthProvider>();
      final userId = auth.user?.id ?? '';
      final senderId = data['senderId'] as String? ?? '';

      // Skip own messages (already shown via optimistic echo)
      if (senderId == userId) return;

      final msg = Message(
        id: data['messageId'] as String? ?? data['id'] as String? ?? '',
        conversationId: convId,
        senderId: senderId,
        senderName: data['senderName'] as String?,
        senderType: 'USER',
        messageType: data['messageType'] as String? ?? 'TEXT',
        content: data['content'] as String? ?? '',
        createdAt: data['timestamp'] as String? ?? DateTime.now().toIso8601String(),
        status: 'sent',
      );

      if (mounted) {
        setState(() {
          // Deduplicate by ID
          if (!_messages.any((m) => m.id == msg.id)) {
            _messages.add(msg);
          }
        });
        _scrollToBottom();
      }
    });
  }

  // ─── Read Receipt Subscription ───────────────────────
  void _subscribeToReadReceipts() {
    final notifProvider = context.read<NotificationProvider>();
    _unsubscribeRead = notifProvider.onMessageRead((data) {
      final convId = data['conversationId'] as String?;
      if (convId != widget.conversationId) return;

      if (mounted) {
        setState(() {
          _messages = _messages.map((m) {
            // Upgrade own sent/delivered messages to 'read'
            if (m.status == 'sent' || m.status == 'delivered') {
              return Message(
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderName: m.senderName,
                senderType: m.senderType,
                senderRefId: m.senderRefId,
                messageType: m.messageType,
                content: m.content,
                replyToId: m.replyToId,
                replyPreview: m.replyPreview,
                attachments: m.attachments,
                reactions: m.reactions,
                editedAt: m.editedAt,
                deletedAt: m.deletedAt,
                metadata: m.metadata,
                createdAt: m.createdAt,
                status: 'read',
              );
            }
            return m;
          }).toList();
        });
      }
    });
  }

  @override
  void dispose() {
    _unsubscribeChat?.call();
    _unsubscribeRead?.call();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ─── Load Conversation + Messages ────────────────────
  Future<void> _loadConversation() async {
    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.user?.id ?? '';

      final results = await Future.wait([
        ChatService.getConversation(widget.conversationId),
        ChatService.listMessages(widget.conversationId, limit: 50),
      ]);

      final convData = results[0] as Map<String, dynamic>?;
      final msgData = results[1] as List<Map<String, dynamic>>;

      if (mounted) {
        setState(() {
          if (convData != null) {
            _conversation = Conversation.fromRestJson(convData, userId);
          }
          _messages = msgData.map((m) => Message.fromRestJson(m)).toList();
          _hasMore = msgData.length >= 50;
          _isLoading = false;
        });
        ChatService.markAsRead(widget.conversationId);
      }
    } catch (e) {
      debugPrint('[ChatScreen] _loadConversation error: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadMoreMessages() async {
    if (_messages.isEmpty || _isLoadingMore) return;

    setState(() => _isLoadingMore = true);

    try {
      final oldest = _messages.first;
      final msgData = await ChatService.listMessages(
        widget.conversationId,
        limit: 50,
        before: oldest.createdAt,
      );

      if (mounted) {
        setState(() {
          for (final m in msgData.map((d) => Message.fromRestJson(d))) {
            if (!_messages.any((existing) => existing.id == m.id)) {
              _messages.insert(0, m);
            }
          }
          _hasMore = msgData.length >= 50;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      debugPrint('[ChatScreen] _loadMoreMessages error: $e');
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  // ─── Send / Edit Message ─────────────────────────────
  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    // Handle edit mode
    if (_editing != null) {
      setState(() => _isSending = true);
      _messageController.clear();
      final success = await ChatService.editMessage(_editing!.id, text);
      if (mounted) {
        setState(() {
          _isSending = false;
          if (success) {
            final idx = _messages.indexWhere((m) => m.id == _editing!.id);
            if (idx != -1) {
              _messages[idx] = Message(
                id: _messages[idx].id,
                conversationId: _messages[idx].conversationId,
                senderId: _messages[idx].senderId,
                senderName: _messages[idx].senderName,
                senderType: _messages[idx].senderType,
                senderRefId: _messages[idx].senderRefId,
                messageType: _messages[idx].messageType,
                content: text,
                replyToId: _messages[idx].replyToId,
                replyPreview: _messages[idx].replyPreview,
                attachments: _messages[idx].attachments,
                reactions: _messages[idx].reactions,
                editedAt: DateTime.now().toIso8601String(),
                deletedAt: _messages[idx].deletedAt,
                createdAt: _messages[idx].createdAt,
                status: _messages[idx].status,
              );
            }
          }
          _editing = null;
        });
      }
      return;
    }

    // Normal send with optimistic echo
    setState(() => _isSending = true);
    _messageController.clear();

    final replyId = _replyingTo?.id;
    final replyPreview = _replyingTo != null
        ? {'senderName': _replyingTo!.senderName ?? '', 'content': _replyingTo!.content}
        : null;

    final echo = Message(
      id: 'pending-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: widget.conversationId,
      senderId: userId,
      senderType: 'USER',
      messageType: 'TEXT',
      content: text,
      replyToId: replyId,
      replyPreview: replyPreview,
      createdAt: DateTime.now().toIso8601String(),
      status: 'pending',
    );

    setState(() {
      _messages.add(echo);
      _replyingTo = null;
    });
    _scrollToBottom();

    final result = await ChatService.sendMessage(
      widget.conversationId,
      text,
      replyToId: replyId,
    );

    if (mounted) {
      setState(() {
        _isSending = false;
        _messages.removeWhere((m) => m.id == echo.id);
        if (result != null) {
          _messages.add(Message.fromRestJson(result));
        }
      });
    }
  }

  // ─── Delete Message ──────────────────────────────────
  Future<void> _deleteMessage(Message msg) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Message'),
        content: const Text('Are you sure you want to delete this message?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.accentRed)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final success = await ChatService.deleteMessage(msg.id);
    if (success && mounted) {
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == msg.id);
        if (idx != -1) {
          _messages[idx] = Message(
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderType: msg.senderType,
            messageType: msg.messageType,
            content: '',
            deletedAt: DateTime.now().toIso8601String(),
            createdAt: msg.createdAt,
            status: msg.status,
          );
        }
      });
    }
  }

  // ─── Reply / Edit Helpers ────────────────────────────
  void _startReply(Message msg) {
    setState(() {
      _replyingTo = msg;
      _editing = null;
    });
  }

  void _startEdit(Message msg) {
    setState(() {
      _editing = msg;
      _replyingTo = null;
      _messageController.text = msg.content;
    });
  }

  void _cancelReplyOrEdit() {
    setState(() {
      if (_editing != null) _messageController.clear();
      _replyingTo = null;
      _editing = null;
    });
  }

  // ─── Message Context Menu ────────────────────────────
  void _showMessageActions(Message msg) {
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';
    final isMe = msg.senderId == userId || msg.senderRefId == userId;

    if (msg.deletedAt != null) return;

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.reply),
              title: const Text('Reply'),
              onTap: () {
                Navigator.pop(ctx);
                _startReply(msg);
              },
            ),
            ListTile(
              leading: const Icon(Icons.copy),
              title: const Text('Copy'),
              onTap: () {
                Clipboard.setData(ClipboardData(text: msg.content));
                Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Copied to clipboard'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                }
              },
            ),
            if (isMe) ...[
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Edit'),
                onTap: () {
                  Navigator.pop(ctx);
                  _startEdit(msg);
                },
              ),
              ListTile(
                leading: Icon(Icons.delete_outline, color: AppColors.accentRed),
                title: Text('Delete', style: TextStyle(color: AppColors.accentRed)),
                onTap: () {
                  Navigator.pop(ctx);
                  _deleteMessage(msg);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ─── Date Separator Logic ────────────────────────────
  bool _shouldShowDate(Message current, Message previous) {
    final a = DateTime.tryParse(current.createdAt ?? '');
    final b = DateTime.tryParse(previous.createdAt ?? '');
    if (a == null || b == null) return false;
    return a.day != b.day || a.month != b.month || a.year != b.year;
  }

  // ─── Build ───────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (context.canPop()) { context.pop(); } else { context.go('/conversations'); }
            },
          ),
          title: const Text('Chat'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final messages = _messages.reversed.toList();

    // Peer info for header
    final peer = _conversation?.participants.cast<Participant?>().firstWhere(
      (p) => p!.userId != userId,
      orElse: () => null,
    );
    final peerName = (peer?.fullName.isNotEmpty == true)
        ? peer!.fullName
        : (_conversation?.displayName ?? 'Chat');
    final peerOnline = peer?.online ?? false;
    final initial = peerName.isNotEmpty ? peerName[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) { context.pop(); } else { context.go('/conversations'); }
          },
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.accentBlue.withValues(alpha: 0.2),
              child: Text(
                initial,
                style: const TextStyle(
                  color: AppColors.accentBlue,
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    peerName,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: peerOnline ? AppColors.statusSuccess : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        peerOnline ? 'Online' : 'Offline',
                        style: TextStyle(
                          fontSize: 12,
                          color: peerOnline ? AppColors.statusSuccess : AppColors.textMuted,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.phone_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text('No messages yet',
                            style: TextStyle(color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text('Send a message to start the conversation',
                            style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: messages.length + (_isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (_isLoadingMore && index == messages.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        );
                      }
                      final msg = messages[index];
                      final isMe = msg.senderId == userId || msg.senderRefId == userId;

                      // Date separator
                      Widget? dateSep;
                      if (index == messages.length - 1 ||
                          _shouldShowDate(msg, messages[index + 1])) {
                        dateSep = _DateSeparator(date: msg.createdAt);
                      }

                      return Column(
                        children: [
                          if (dateSep != null) dateSep,
                          GestureDetector(
                            onLongPress: () => _showMessageActions(msg),
                            child: _MessageBubble(
                              message: msg,
                              isMe: isMe,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          // Reply / Edit bar
          if (_replyingTo != null || _editing != null)
            _ReplyEditBar(
              replyingTo: _replyingTo,
              editing: _editing,
              onCancel: _cancelReplyOrEdit,
            ),

          // Composer
          _MessageComposer(
            controller: _messageController,
            isSending: _isSending,
            isEditing: _editing != null,
            onSend: _sendMessage,
          ),
        ],
      ),
    );
  }
}

// ─── Date Separator ─────────────────────────────────────

class _DateSeparator extends StatelessWidget {
  final String? date;
  const _DateSeparator({this.date});

  @override
  Widget build(BuildContext context) {
    final dt = DateTime.tryParse(date ?? '');
    if (dt == null) return const SizedBox.shrink();
    final now = DateTime.now();
    String label;
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      label = 'Today';
    } else if (dt.year == now.year && dt.month == now.month && dt.day == now.day - 1) {
      label = 'Yesterday';
    } else {
      label = DateFormat('MMM d, yyyy').format(dt);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          const Expanded(child: Divider()),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ),
          const Expanded(child: Divider()),
        ],
      ),
    );
  }
}

// ─── Reply / Edit Bar ───────────────────────────────────

class _ReplyEditBar extends StatelessWidget {
  final Message? replyingTo;
  final Message? editing;
  final VoidCallback onCancel;

  const _ReplyEditBar({this.replyingTo, this.editing, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final isEdit = editing != null;
    final msg = isEdit ? editing! : replyingTo!;
    final color = isEdit ? AppColors.accentOrange : AppColors.accentBlue;
    final label = isEdit ? 'Editing' : 'Replying to ${msg.senderName ?? 'message'}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: color.withValues(alpha: 0.3))),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 36,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
                Text(
                  msg.content,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: onCancel,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}

// ─── Message Bubble ─────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMe;

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final isPending = message.status == 'pending';
    final isDeleted = message.deletedAt != null;

    return Opacity(
      opacity: isPending ? 0.6 : 1.0,
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.only(bottom: 6),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
          child: Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              // Reply preview
              if (message.replyPreview != null && !isDeleted) _buildReplyPreview(context),

              // Main bubble
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDeleted
                      ? (Theme.of(context).cardTheme.color ?? AppColors.bgCard).withValues(alpha: 0.5)
                      : isMe
                          ? AppColors.accentBlue
                          : Theme.of(context).cardTheme.color ?? AppColors.bgCard,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                    bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sender name (other's messages)
                    if (!isMe && message.senderName != null && !isDeleted)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Text(
                          message.senderName!,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isMe ? Colors.white70 : AppColors.accentBlue,
                          ),
                        ),
                      ),

                    // Message content
                    Text(
                      isDeleted ? 'This message was deleted' : message.content,
                      style: TextStyle(
                        color: isMe ? Colors.white : null,
                        fontStyle: isDeleted ? FontStyle.italic : null,
                        fontSize: isDeleted ? 13 : 14,
                      ),
                    ),

                    // Meta row: time + edited + status label
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (message.editedAt != null && !isDeleted)
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Text(
                              'edited',
                              style: TextStyle(fontSize: 10, color: isMe ? Colors.white54 : AppColors.textMuted),
                            ),
                          ),
                        Text(
                          _statusLabel(message, isMe),
                          style: TextStyle(fontSize: 9, color: isMe ? Colors.white54 : AppColors.textMuted),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReplyPreview(BuildContext context) {
    final preview = message.replyPreview!;
    final senderName = preview['senderName'] as String? ?? '';
    final content = preview['content'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: (isMe ? Colors.white : AppColors.accentBlue).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border(left: BorderSide(color: AppColors.accentBlue, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (senderName.isNotEmpty)
            Text(senderName, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentBlue)),
          Text(content, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  // ─── Status Label (text-based) ─────────────────────
  // Sent messages show cumulative: s: 08:15 | r: 08:15 | rr: 08:15
  // Received messages: r: 08:15
  String _statusLabel(Message msg, bool isMe) {
    final time = _formatTime(msg.createdAt);
    if (!isMe) return 'r: $time';
    switch (msg.status) {
      case 'pending':
        return 's: ...';
      case 'sent':
        return 's: $time';
      case 'delivered':
        return 's: $time | r: $time';
      case 'read':
        return 's: $time | r: $time | rr: $time';
      default:
        return 's: $time';
    }
  }

  String _formatTime(String? ts) {
    if (ts == null) return '';
    final dt = DateTime.tryParse(ts);
    if (dt == null) return '';
    return DateFormat('HH:mm').format(dt);
  }
}

// _StatusIcon removed — replaced by text-based _statusLabel above

// ─── Message Composer ───────────────────────────────────

class _MessageComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool isSending;
  final bool isEditing;
  final VoidCallback onSend;

  const _MessageComposer({
    required this.controller,
    required this.isSending,
    this.isEditing = false,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 12,
        right: 8,
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 8,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerTheme.color ?? AppColors.borderPrimary),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              maxLines: 4,
              minLines: 1,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: isEditing ? 'Edit message...' : 'Type a message...',
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
          const SizedBox(width: 4),
          IconButton(
            icon: isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    isEditing ? Icons.check_circle : Icons.send,
                    color: AppColors.accentBlue,
                  ),
            onPressed: isSending ? null : onSend,
          ),
        ],
      ),
    );
  }
}
