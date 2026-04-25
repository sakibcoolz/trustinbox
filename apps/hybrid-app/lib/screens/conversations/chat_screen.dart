import 'dart:async';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';
import 'package:provider/provider.dart';
import '../../models/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/chat_service.dart';
import '../../services/message_flags_store.dart';
import '../../services/token_storage.dart';
import '../../config/theme.dart';
import 'package:intl/intl.dart';
import 'widgets/attachment_bubble.dart';
import 'widgets/forward_sheet.dart';
import 'widgets/message_reactions.dart';
import 'widgets/typing_indicator.dart';
import 'widgets/voice_message_bubble.dart';

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
  VoidCallback? _unsubscribeReactionAdded;
  VoidCallback? _unsubscribeReactionRemoved;
  VoidCallback? _unsubscribeTyping;
  VoidCallback? _unsubscribePresence;

  // Reply / Edit state
  Message? _replyingTo;
  Message? _editing;

  // Pending attachments staged before send (mirrors web `pendingAttachments`)
  final List<Attachment> _pendingAttachments = [];

  // Local-only flags persisted per-device.
  Set<String> _starred = {};
  Set<String> _pinned = {};

  // Live presence + typing.
  bool _peerOnline = false;
  String? _typingUserName;
  Timer? _typingClearTimer;
  String? _authToken;

  @override
  void initState() {
    super.initState();
    _loadAuthToken();
    _loadFlags();
    _loadConversation();
    _subscribeToChatMessages();
    _subscribeToReadReceipts();
    _subscribeToReactions();
    _subscribeToTyping();
    _subscribeToPresence();
    _scrollController.addListener(_onScroll);
  }

  Future<void> _loadAuthToken() async {
    final token = await TokenStorage().read('accessToken');
    if (mounted) setState(() => _authToken = token);
  }

  Future<void> _loadFlags() async {
    final s = await MessageFlagsStore.getStarred(widget.conversationId);
    final p = await MessageFlagsStore.getPinned(widget.conversationId);
    if (!mounted) return;
    setState(() {
      _starred = s;
      _pinned = p;
    });
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
              return m.copyWith(status: 'read');
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
    _unsubscribeReactionAdded?.call();
    _unsubscribeReactionRemoved?.call();
    _unsubscribeTyping?.call();
    _unsubscribePresence?.call();
    _typingClearTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ─── Reaction Subscriptions ──────────────────────────
  void _subscribeToReactions() {
    final notifProvider = context.read<NotificationProvider>();
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    _unsubscribeReactionAdded = notifProvider.onReactionAdded((data) {
      final convId = data['conversationId'] as String?;
      if (convId != widget.conversationId) return;
      final msgId = data['messageId'] as String?;
      final emoji = data['emoji'] as String?;
      final reactorId = data['userId'] as String?;
      if (msgId == null || emoji == null || reactorId == null) return;
      _applyReactionDelta(msgId, emoji, reactorId, add: true, currentUserId: userId);
    });

    _unsubscribeReactionRemoved = notifProvider.onReactionRemoved((data) {
      final convId = data['conversationId'] as String?;
      if (convId != widget.conversationId) return;
      final msgId = data['messageId'] as String?;
      final emoji = data['emoji'] as String?;
      final reactorId = data['userId'] as String?;
      if (msgId == null || emoji == null || reactorId == null) return;
      _applyReactionDelta(msgId, emoji, reactorId, add: false, currentUserId: userId);
    });
  }

  void _applyReactionDelta(
    String msgId,
    String emoji,
    String reactorId, {
    required bool add,
    required String currentUserId,
  }) {
    if (!mounted) return;
    setState(() {
      final idx = _messages.indexWhere((m) => m.id == msgId);
      if (idx == -1) return;
      final msg = _messages[idx];
      final updated = List<Reaction>.from(msg.reactions);
      final rIdx = updated.indexWhere((r) => r.emoji == emoji);

      if (add) {
        if (rIdx == -1) {
          updated.add(Reaction(
            emoji: emoji,
            count: 1,
            userIds: [reactorId],
            mine: reactorId == currentUserId,
          ));
        } else {
          final existing = updated[rIdx];
          if (!existing.userIds.contains(reactorId)) {
            final users = [...existing.userIds, reactorId];
            updated[rIdx] = existing.copyWith(
              count: users.length,
              userIds: users,
              mine: existing.mine || reactorId == currentUserId,
            );
          }
        }
      } else {
        if (rIdx != -1) {
          final existing = updated[rIdx];
          final users = existing.userIds.where((u) => u != reactorId).toList();
          if (users.isEmpty) {
            updated.removeAt(rIdx);
          } else {
            updated[rIdx] = existing.copyWith(
              count: users.length,
              userIds: users,
              mine: existing.mine && reactorId != currentUserId,
            );
          }
        }
      }
      _messages[idx] = msg.copyWith(reactions: updated);
    });
  }

  // ─── Typing Subscription ─────────────────────────────
  void _subscribeToTyping() {
    final notifProvider = context.read<NotificationProvider>();
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    _unsubscribeTyping = notifProvider.onTyping((data, isTyping) {
      final convId = data['conversationId'] as String?;
      if (convId != widget.conversationId) return;
      final fromUser = data['userId'] as String?;
      if (fromUser == null || fromUser == userId) return;

      if (!mounted) return;
      if (isTyping) {
        final name = (data['senderName'] as String?)?.trim();
        setState(() => _typingUserName = (name?.isNotEmpty == true) ? name : 'Someone');
        _typingClearTimer?.cancel();
        _typingClearTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) setState(() => _typingUserName = null);
        });
      } else {
        _typingClearTimer?.cancel();
        setState(() => _typingUserName = null);
      }
    });
  }

  // ─── Presence Subscription ───────────────────────────
  void _subscribeToPresence() {
    final notifProvider = context.read<NotificationProvider>();
    _unsubscribePresence = notifProvider.onPresenceUpdate((data) {
      final uid = data['userId'] as String?;
      if (uid == null || _conversation == null) return;
      final isPeer =
          _conversation!.participants.any((p) => p.userId == uid && p.userId != _currentUserId());
      if (!isPeer) return;
      final status = data['status'] as String? ?? data['presence'] as String?;
      if (!mounted) return;
      setState(() => _peerOnline = status == 'online');
    });
  }

  String _currentUserId() {
    return context.read<AuthProvider>().user?.id ?? '';
  }

  // ─── Reactions: add / remove via REST ────────────────
  Future<void> _toggleReaction(Message msg, String emoji) async {
    final mine = msg.reactions.any((r) => r.emoji == emoji && r.mine);
    if (mine) {
      await ChatService.removeReaction(msg.id, emoji);
    } else {
      await ChatService.addReaction(msg.id, emoji);
    }
    // SSE roundtrip will update the bubble — we don't optimistic-update
    // because the server is the source of truth.
  }

  Future<void> _pickReaction(Message msg) async {
    final emoji = await ReactionPickerSheet.show(context);
    if (emoji != null) await _toggleReaction(msg, emoji);
  }

  // ─── Star / Pin (local) ──────────────────────────────
  Future<void> _toggleStar(Message msg) async {
    final on = await MessageFlagsStore.toggleStarred(widget.conversationId, msg.id);
    if (!mounted) return;
    setState(() {
      if (on) {
        _starred.add(msg.id);
      } else {
        _starred.remove(msg.id);
      }
    });
  }

  Future<void> _togglePin(Message msg) async {
    final on = await MessageFlagsStore.togglePinned(widget.conversationId, msg.id);
    if (!mounted) return;
    setState(() {
      if (on) {
        _pinned.add(msg.id);
      } else {
        _pinned.remove(msg.id);
      }
    });
  }

  // ─── Forward ─────────────────────────────────────────
  Future<void> _forward(Message msg) async {
    final attIds = msg.attachments.map((a) => a.id).toList();
    await ForwardSheet.show(
      context,
      currentConversationId: widget.conversationId,
      content: msg.content,
      fromSenderName: msg.senderName ?? 'Unknown',
      attachmentIds: attIds.isEmpty ? null : attIds,
    );
  }

  // ─── Attachments: pick + stage ───────────────────────
  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;
    await _uploadAndStage(File(picked.path));
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: false);
    if (result == null || result.files.isEmpty) return;
    final path = result.files.single.path;
    if (path == null) return;
    await _uploadAndStage(File(path));
  }

  Future<void> _uploadAndStage(File file) async {
    // 25 MB cap (matches Phase 01 plan)
    const maxBytes = 25 * 1024 * 1024;
    final size = await file.length();
    if (size > maxBytes) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File too large (max 25 MB)')),
        );
      }
      return;
    }
    final mime = lookupMimeType(file.path);
    setState(() => _isSending = true);
    final att = await ChatService.uploadFile(file, contentType: mime);
    if (!mounted) return;
    setState(() {
      _isSending = false;
      if (att != null) _pendingAttachments.add(att);
    });
    if (att == null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Upload failed')),
      );
    }
  }

  Future<void> _recordVoice() async {
    final file = await VoiceRecorderSheet.show(context);
    if (file == null || !mounted) return;
    final mime = lookupMimeType(file.path) ?? 'audio/m4a';
    setState(() => _isSending = true);
    final att = await ChatService.uploadFile(file, contentType: mime);
    if (!mounted) return;
    setState(() => _isSending = false);
    if (att == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Voice upload failed')),
        );
      }
      return;
    }
    // Send a VOICE message immediately (no text body needed)
    await _sendCore(content: '', messageType: 'VOICE', attachmentIds: [att.id]);
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
            // Seed initial peer online state from conversation participants.
            final peer = _conversation!.participants
                .where((p) => p.userId != userId)
                .cast<Participant?>()
                .firstWhere((_) => true, orElse: () => null);
            _peerOnline = peer?.online ?? false;
          }
          _messages = msgData.map((m) => Message.fromRestJson(m, currentUserId: userId)).toList();
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
      final auth = context.read<AuthProvider>();
      final userId = auth.user?.id ?? '';
      final oldest = _messages.first;
      final msgData = await ChatService.listMessages(
        widget.conversationId,
        limit: 50,
        before: oldest.createdAt,
      );

      if (mounted) {
        setState(() {
          for (final m in msgData.map((d) => Message.fromRestJson(d, currentUserId: userId))) {
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
    final hasText = text.isNotEmpty;
    final hasAttachments = _pendingAttachments.isNotEmpty;
    if (!hasText && !hasAttachments) return;
    if (_isSending) return;

    // Handle edit mode (text-only — web doesn't allow attachment editing).
    if (_editing != null) {
      if (!hasText) return;
      setState(() => _isSending = true);
      _messageController.clear();
      final success = await ChatService.editMessage(_editing!.id, text);
      if (mounted) {
        setState(() {
          _isSending = false;
          if (success) {
            final idx = _messages.indexWhere((m) => m.id == _editing!.id);
            if (idx != -1) {
              _messages[idx] = _messages[idx].copyWith(
                content: text,
                editedAt: DateTime.now().toIso8601String(),
              );
            }
          }
          _editing = null;
        });
      }
      return;
    }

    final attachmentsToSend = List<Attachment>.from(_pendingAttachments);
    final ids = attachmentsToSend.map((a) => a.id).toList();
    final replyId = _replyingTo?.id;

    // Pick a sensible messageType from the first attachment.
    String messageType = 'TEXT';
    if (hasAttachments) {
      final first = attachmentsToSend.first;
      if (first.isImage) {
        messageType = 'IMAGE';
      } else if (first.isAudio) {
        messageType = 'VOICE';
      } else {
        messageType = 'FILE';
      }
    }

    _messageController.clear();
    setState(() {
      _pendingAttachments.clear();
      _replyingTo = null;
    });

    await _sendCore(
      content: text,
      messageType: messageType,
      attachmentIds: ids,
      replyToId: replyId,
      stagedAttachments: attachmentsToSend,
    );
  }

  /// Shared send pipeline used by both _sendMessage and _recordVoice.
  /// Performs an optimistic echo, calls the API, and reconciles.
  Future<void> _sendCore({
    required String content,
    required String messageType,
    List<String> attachmentIds = const [],
    String? replyToId,
    List<Attachment> stagedAttachments = const [],
  }) async {
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    final replyPreview = _replyingTo != null
        ? {
            'senderName': _replyingTo!.senderName ?? '',
            'content': _replyingTo!.content,
          }
        : null;

    final echo = Message(
      id: 'pending-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: widget.conversationId,
      senderId: userId,
      senderType: 'USER',
      messageType: messageType,
      content: content,
      replyToId: replyToId,
      replyPreview: replyPreview,
      attachments: stagedAttachments,
      createdAt: DateTime.now().toIso8601String(),
      status: 'pending',
    );

    setState(() {
      _messages.add(echo);
      _isSending = true;
    });
    _scrollToBottom();

    final result = await ChatService.sendMessage(
      widget.conversationId,
      content,
      messageType: messageType,
      replyToId: replyToId,
      attachmentIds: attachmentIds.isEmpty ? null : attachmentIds,
    );

    if (mounted) {
      setState(() {
        _isSending = false;
        _messages.removeWhere((m) => m.id == echo.id);
        if (result != null) {
          _messages.add(Message.fromRestJson(result, currentUserId: userId));
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
          _messages[idx] = msg.copyWith(
            content: '',
            deletedAt: DateTime.now().toIso8601String(),
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

    final isStarred = _starred.contains(msg.id);
    final isPinned = _pinned.contains(msg.id);

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
              leading: const Icon(Icons.add_reaction_outlined),
              title: const Text('React'),
              onTap: () {
                Navigator.pop(ctx);
                _pickReaction(msg);
              },
            ),
            ListTile(
              leading: const Icon(Icons.reply),
              title: const Text('Reply'),
              onTap: () {
                Navigator.pop(ctx);
                _startReply(msg);
              },
            ),
            ListTile(
              leading: const Icon(Icons.forward),
              title: const Text('Forward'),
              onTap: () {
                Navigator.pop(ctx);
                _forward(msg);
              },
            ),
            ListTile(
              leading: Icon(isStarred ? Icons.star : Icons.star_outline,
                  color: isStarred ? AppColors.accentOrange : null),
              title: Text(isStarred ? 'Unstar' : 'Star'),
              onTap: () {
                Navigator.pop(ctx);
                _toggleStar(msg);
              },
            ),
            ListTile(
              leading: Icon(isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                  color: isPinned ? AppColors.accentBlue : null),
              title: Text(isPinned ? 'Unpin' : 'Pin'),
              onTap: () {
                Navigator.pop(ctx);
                _togglePin(msg);
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
    final peerOnline = _peerOnline;
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
            icon: const Icon(Icons.star_outline),
            tooltip: 'Starred messages',
            onPressed: _openStarred,
          ),
          IconButton(
            icon: const Icon(Icons.phone_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Pinned banner
          if (_pinned.isNotEmpty) _buildPinnedBanner(),

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
                              authToken: _authToken,
                              isStarred: _starred.contains(msg.id),
                              isPinned: _pinned.contains(msg.id),
                              onReactionTap: (emoji) => _toggleReaction(msg, emoji),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          // Typing indicator
          TypingIndicator(typingUserName: _typingUserName),

          // Reply / Edit bar
          if (_replyingTo != null || _editing != null)
            _ReplyEditBar(
              replyingTo: _replyingTo,
              editing: _editing,
              onCancel: _cancelReplyOrEdit,
            ),

          // Pending attachments preview
          if (_pendingAttachments.isNotEmpty) _buildPendingAttachments(),

          // Composer
          _MessageComposer(
            controller: _messageController,
            isSending: _isSending,
            isEditing: _editing != null,
            hasAttachments: _pendingAttachments.isNotEmpty,
            onSend: _sendMessage,
            onPickImage: _pickImage,
            onPickFile: _pickFile,
            onRecordVoice: _recordVoice,
          ),
        ],
      ),
    );
  }

  // ─── Pinned Banner ───────────────────────────────────
  Widget _buildPinnedBanner() {
    final firstPinned = _messages.firstWhere(
      (m) => _pinned.contains(m.id) && m.deletedAt == null,
      orElse: () => const Message(id: '', content: ''),
    );
    if (firstPinned.id.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.accentBlue.withValues(alpha: 0.08),
        border: Border(bottom: BorderSide(color: AppColors.borderPrimary)),
      ),
      child: Row(
        children: [
          const Icon(Icons.push_pin, size: 14, color: AppColors.accentBlue),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              firstPinned.content.isEmpty
                  ? '${_pinned.length} pinned message${_pinned.length == 1 ? '' : 's'}'
                  : firstPinned.content,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          if (_pinned.length > 1)
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Text(
                '+${_pinned.length - 1}',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Pending Attachments Strip ───────────────────────
  Widget _buildPendingAttachments() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.borderPrimary)),
      ),
      child: SizedBox(
        height: 60,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _pendingAttachments.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final a = _pendingAttachments[i];
            return Stack(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppColors.bgCard,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Icon(
                      a.isImage
                          ? Icons.image_outlined
                          : a.isAudio
                              ? Icons.audiotrack
                              : Icons.insert_drive_file_outlined,
                      color: AppColors.accentBlue,
                    ),
                  ),
                ),
                Positioned(
                  top: -4,
                  right: -4,
                  child: GestureDetector(
                    onTap: () => setState(() => _pendingAttachments.removeAt(i)),
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: AppColors.accentRed,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 12, color: Colors.white),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  // ─── Starred messages screen ─────────────────────────
  void _openStarred() {
    final starredMessages =
        _messages.where((m) => _starred.contains(m.id)).toList();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Column(
          children: [
            const SizedBox(height: 12),
            const Text('Starred Messages',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Expanded(
              child: starredMessages.isEmpty
                  ? Center(
                      child: Text('No starred messages',
                          style: TextStyle(color: AppColors.textMuted)),
                    )
                  : ListView.builder(
                      controller: scrollController,
                      itemCount: starredMessages.length,
                      itemBuilder: (_, i) {
                        final m = starredMessages[i];
                        return ListTile(
                          leading: const Icon(Icons.star, color: AppColors.accentOrange),
                          title: Text(
                            m.content.isEmpty ? '(attachment)' : m.content,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(m.senderName ?? ''),
                        );
                      },
                    ),
            ),
          ],
        ),
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
  final String? authToken;
  final bool isStarred;
  final bool isPinned;
  final void Function(String emoji) onReactionTap;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    required this.authToken,
    required this.isStarred,
    required this.isPinned,
    required this.onReactionTap,
  });

  @override
  Widget build(BuildContext context) {
    final isPending = message.status == 'pending';
    final isDeleted = message.deletedAt != null;
    final hasAttachments = message.attachments.isNotEmpty;
    final hasText = message.content.isNotEmpty;

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

              // Forwarded-from pill
              if (message.forwardedFrom != null && !isDeleted) _buildForwardedPill(),

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

                    // Attachments (images/files/voice)
                    if (hasAttachments && !isDeleted)
                      ...message.attachments.map((a) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: a.isAudio
                                ? VoiceMessageBubble(
                                    attachment: a,
                                    authToken: authToken ?? '',
                                    isMe: isMe,
                                  )
                                : AttachmentBubble(
                                    attachment: a,
                                    authToken: authToken ?? '',
                                    isMe: isMe,
                                  ),
                          )),

                    // Message content (text)
                    if (hasText || isDeleted)
                      Text(
                        isDeleted ? 'This message was deleted' : message.content,
                        style: TextStyle(
                          color: isMe ? Colors.white : null,
                          fontStyle: isDeleted ? FontStyle.italic : null,
                          fontSize: isDeleted ? 13 : 14,
                        ),
                      ),

                    // Meta row: time + edited + status label + flags
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isStarred)
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Icon(Icons.star,
                                size: 11, color: isMe ? Colors.white70 : AppColors.accentOrange),
                          ),
                        if (isPinned)
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Icon(Icons.push_pin,
                                size: 11, color: isMe ? Colors.white70 : AppColors.accentBlue),
                          ),
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

              // Reactions strip below the bubble
              if (message.reactions.isNotEmpty && !isDeleted)
                MessageReactions(
                  reactions: message.reactions,
                  onToggle: onReactionTap,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForwardedPill() {
    final from = (message.forwardedFrom?['senderName'] as String?) ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.forward, size: 12, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Text(
            'Forwarded${from.isNotEmpty ? " from $from" : ""}',
            style: TextStyle(
              fontSize: 11,
              fontStyle: FontStyle.italic,
              color: AppColors.textMuted,
            ),
          ),
        ],
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

class _MessageComposer extends StatefulWidget {
  final TextEditingController controller;
  final bool isSending;
  final bool isEditing;
  final bool hasAttachments;
  final VoidCallback onSend;
  final VoidCallback onPickImage;
  final VoidCallback onPickFile;
  final VoidCallback onRecordVoice;

  const _MessageComposer({
    required this.controller,
    required this.isSending,
    this.isEditing = false,
    this.hasAttachments = false,
    required this.onSend,
    required this.onPickImage,
    required this.onPickFile,
    required this.onRecordVoice,
  });

  @override
  State<_MessageComposer> createState() => _MessageComposerState();
}

class _MessageComposerState extends State<_MessageComposer> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    if (mounted) setState(() {});
  }

  void _showAttachMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.image_outlined),
              title: const Text('Photo from gallery'),
              onTap: () {
                Navigator.pop(ctx);
                widget.onPickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.attach_file),
              title: const Text('File'),
              onTap: () {
                Navigator.pop(ctx);
                widget.onPickFile();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasText = widget.controller.text.trim().isNotEmpty;
    final canSend = hasText || widget.hasAttachments;
    final showMic = !widget.isEditing && !canSend;

    return Container(
      padding: EdgeInsets.only(
        left: 4,
        right: 4,
        top: 6,
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
          if (!widget.isEditing)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Attach',
              onPressed: widget.isSending ? null : () => _showAttachMenu(context),
            ),
          Expanded(
            child: TextField(
              controller: widget.controller,
              maxLines: 4,
              minLines: 1,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: widget.isEditing ? 'Edit message...' : 'Type a message...',
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
          const SizedBox(width: 4),
          if (showMic)
            IconButton(
              icon: const Icon(Icons.mic, color: AppColors.accentBlue),
              tooltip: 'Voice message',
              onPressed: widget.isSending ? null : widget.onRecordVoice,
            )
          else
            IconButton(
              icon: widget.isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      widget.isEditing ? Icons.check_circle : Icons.send,
                      color: AppColors.accentBlue,
                    ),
              onPressed: (widget.isSending || !canSend) ? null : widget.onSend,
            ),
        ],
      ),
    );
  }
}
