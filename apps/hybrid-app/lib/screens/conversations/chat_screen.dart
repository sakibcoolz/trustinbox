import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';
import '../../config/theme.dart';

// ─── Chat Screen ────────────────────────────────────────
// Mirrors: apps/web/src/components/chat/chat-area.tsx
// Uses REST /api/conversations/{id}/messages (same as web app).

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

  @override
  void initState() {
    super.initState();
    _loadConversation();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadConversation() async {
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
        _isLoading = false;
      });
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    setState(() => _isSending = true);
    _messageController.clear();

    // Optimistic echo
    final echo = Message(
      id: 'pending-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: widget.conversationId,
      senderId: userId,
      senderType: 'USER',
      messageType: 'TEXT',
      content: text,
      createdAt: DateTime.now().toIso8601String(),
      status: 'pending',
    );
    setState(() => _messages.add(echo));
    _scrollToBottom();

    final result = await ChatService.sendMessage(widget.conversationId, text);

    if (mounted) {
      setState(() {
        _isSending = false;
        // Replace optimistic echo with server response
        _messages.removeWhere((m) => m.id == echo.id);
        if (result != null) {
          _messages.add(Message.fromRestJson(result));
        }
      });
    }
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

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final userId = auth.user?.id ?? '';

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chat')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final title = _conversation?.displayName ?? 'Chat';
    final messages = _messages.reversed.toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: messages.isEmpty
                ? const Center(child: Text('No messages yet'))
                : ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      final isMe = msg.senderId == userId ||
                          (msg.senderType == 'USER' && msg.senderRefId == userId);
                      return _MessageBubble(message: msg, isMe: isMe);
                    },
                  ),
          ),

          // Composer
          _MessageComposer(
            controller: _messageController,
            isSending: _isSending,
            onSend: _sendMessage,
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMe;

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final isPending = message.status == 'pending';
    final isDeleted = message.deletedAt != null;

    return Opacity(
      opacity: isPending ? 0.6 : (isDeleted ? 0.4 : 1.0),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
          decoration: BoxDecoration(
            color: isMe ? AppColors.accentBlue : Theme.of(context).cardTheme.color,
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
              if (!isMe && message.senderName != null) ...[
                Text(
                  message.senderName!,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isMe ? Colors.white70 : Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
                const SizedBox(height: 2),
              ],
              Text(
                isDeleted ? 'This message was deleted' : message.content,
                style: TextStyle(
                  color: isMe ? Colors.white : Theme.of(context).textTheme.bodyLarge?.color,
                  fontStyle: isDeleted ? FontStyle.italic : FontStyle.normal,
                ),
              ),
              if (message.editedAt != null)
                Text(
                  '(edited)',
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe ? Colors.white54 : Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MessageComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool isSending;
  final VoidCallback onSend;

  const _MessageComposer({
    required this.controller,
    required this.isSending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 8,
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 8,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerTheme.color ?? Colors.transparent),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.send,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          IconButton(
            icon: isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send, color: AppColors.accentBlue),
            onPressed: isSending ? null : onSend,
          ),
        ],
      ),
    );
  }
}
