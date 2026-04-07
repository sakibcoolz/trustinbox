import 'service_provider.dart';

// ─── Conversation & Message Models ──────────────────────
// Matches REST /api/conversations response from gateway chat.go

class Participant {
  final String userId;
  final String username;
  final String fullName;
  final bool online;
  final String role;
  final String? lastReadAt;

  const Participant({
    required this.userId,
    required this.username,
    this.fullName = '',
    this.online = false,
    this.role = 'MEMBER',
    this.lastReadAt,
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      userId: json['userId'] as String? ?? '',
      username: json['username'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      online: json['online'] as bool? ?? false,
      role: json['role'] as String? ?? 'MEMBER',
      lastReadAt: json['lastReadAt'] as String?,
    );
  }
}

class Conversation {
  final String id;
  final String? type;
  final String? status;
  final String? lastMessageAt;
  final String? lastMessagePreview;
  final List<Participant> participants;
  final int unreadCount;
  final bool muted;
  final String? createdAt;
  final String? updatedAt;

  // Computed display fields
  final String? displayName;
  final ServiceProvider? serviceProvider;
  final List<Message> messages;
  final int totalMessages;

  const Conversation({
    required this.id,
    this.type,
    this.status,
    this.lastMessageAt,
    this.lastMessagePreview,
    this.participants = const [],
    this.unreadCount = 0,
    this.muted = false,
    this.createdAt,
    this.updatedAt,
    this.displayName,
    this.serviceProvider,
    this.messages = const [],
    this.totalMessages = 0,
  });

  /// Parse from REST /api/conversations response
  factory Conversation.fromRestJson(Map<String, dynamic> json, String currentUserId) {
    final participants = (json['participants'] as List<dynamic>?)
            ?.map((p) => Participant.fromJson(p as Map<String, dynamic>))
            .toList() ??
        [];

    // Compute display name: other participant's name for DIRECT chats
    String? displayName;
    final otherParticipant = participants.cast<Participant?>().firstWhere(
      (p) => p!.userId != currentUserId,
      orElse: () => null,
    );
    if (otherParticipant != null) {
      displayName = otherParticipant.fullName.isNotEmpty
          ? otherParticipant.fullName
          : otherParticipant.username;
    }

    return Conversation(
      id: json['id'] as String,
      type: json['type'] as String?,
      status: json['status'] as String?,
      lastMessageAt: json['lastMessageAt'] as String?,
      lastMessagePreview: json['lastMessagePreview'] as String?,
      participants: participants,
      unreadCount: json['unreadCount'] as int? ?? 0,
      muted: json['muted'] as bool? ?? false,
      createdAt: json['createdAt'] as String?,
      displayName: displayName,
    );
  }

  /// Parse from GraphQL response (fallback for non-chat queries)
  factory Conversation.fromJson(Map<String, dynamic> json) {
    final messagesData = json['messages'];
    List<Message> messages = [];
    int totalMessages = 0;

    if (messagesData is Map<String, dynamic>) {
      final nodes = messagesData['nodes'] as List<dynamic>? ?? [];
      messages = nodes.map((m) => Message.fromJson(m as Map<String, dynamic>)).toList();
      totalMessages = messagesData['totalCount'] as int? ?? 0;
    }

    return Conversation(
      id: json['id'] as String,
      status: json['status'] as String?,
      serviceProvider: json['serviceProvider'] != null
          ? ServiceProvider.fromJson(json['serviceProvider'] as Map<String, dynamic>)
          : null,
      messages: messages,
      totalMessages: totalMessages,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      lastMessagePreview: json['lastMessagePreview'] as String?,
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

class Message {
  final String id;
  final String? conversationId;
  final String? senderId;
  final String? senderName;
  final String? senderType;
  final String? senderRefId;
  final String? messageType;
  final String content;
  final String? replyToId;
  final Map<String, dynamic>? replyPreview;
  final List<dynamic>? attachments;
  final List<dynamic>? reactions;
  final String? editedAt;
  final String? deletedAt;
  final Map<String, dynamic>? metadata;
  final String? createdAt;
  final String? status;

  const Message({
    required this.id,
    this.conversationId,
    this.senderId,
    this.senderName,
    this.senderType,
    this.senderRefId,
    this.messageType,
    required this.content,
    this.replyToId,
    this.replyPreview,
    this.attachments,
    this.reactions,
    this.editedAt,
    this.deletedAt,
    this.metadata,
    this.createdAt,
    this.status,
  });

  /// Parse from REST /api/conversations/{id}/messages response
  factory Message.fromRestJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String?,
      senderId: json['senderId'] as String?,
      senderName: json['senderName'] as String?,
      senderType: json['senderType'] as String?,
      messageType: json['messageType'] as String?,
      content: json['content'] as String? ?? '',
      replyToId: json['replyToId'] as String?,
      replyPreview: json['replyPreview'] as Map<String, dynamic>?,
      attachments: json['attachments'] as List<dynamic>?,
      reactions: json['reactions'] as List<dynamic>?,
      editedAt: json['editedAt'] as String?,
      deletedAt: json['deletedAt'] as String?,
      createdAt: json['createdAt'] as String?,
      status: json['status'] as String?,
    );
  }

  /// Parse from GraphQL response (fallback)
  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      senderType: json['senderType'] as String?,
      senderRefId: json['senderRefId'] as String?,
      messageType: json['messageType'] as String?,
      content: json['content'] as String? ?? '',
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String?,
      status: json['status'] as String?,
    );
  }
}
