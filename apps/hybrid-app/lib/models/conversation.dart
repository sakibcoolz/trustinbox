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

/// Single attachment associated with a message.
/// Mirrors the gateway `attachmentResponse` payload from POST /api/upload.
class Attachment {
  final String id;
  final String fileName;
  final String fileType;
  final int fileSize;
  final String url;

  const Attachment({
    required this.id,
    required this.fileName,
    required this.fileType,
    required this.fileSize,
    required this.url,
  });

  bool get isImage => fileType.startsWith('image/');
  bool get isAudio => fileType.startsWith('audio/');
  bool get isVideo => fileType.startsWith('video/');

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] as String? ?? '',
      fileName: json['fileName'] as String? ?? '',
      fileType: json['fileType'] as String? ?? 'application/octet-stream',
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
      url: json['url'] as String? ?? '',
    );
  }
}

/// Aggregated reaction count for a message (one row per emoji).
class Reaction {
  final String emoji;
  final int count;
  final List<String> userIds;
  final bool mine;

  const Reaction({
    required this.emoji,
    required this.count,
    this.userIds = const [],
    this.mine = false,
  });

  factory Reaction.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final users = (json['userIds'] as List<dynamic>?)?.cast<String>() ?? const [];
    return Reaction(
      emoji: json['emoji'] as String? ?? '',
      count: (json['count'] as num?)?.toInt() ?? users.length,
      userIds: users,
      mine: currentUserId != null && users.contains(currentUserId),
    );
  }

  Reaction copyWith({int? count, List<String>? userIds, bool? mine}) => Reaction(
        emoji: emoji,
        count: count ?? this.count,
        userIds: userIds ?? this.userIds,
        mine: mine ?? this.mine,
      );
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
  final List<Attachment> attachments;
  final List<Reaction> reactions;
  final Map<String, dynamic>? forwardedFrom;
  final String? editedAt;
  final String? deletedAt;
  final Map<String, dynamic>? metadata;
  final String? createdAt;
  final String? status;

  // Local-only flags (not server-persisted) — see Phase 01 plan.
  final bool starred;
  final bool pinned;

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
    this.attachments = const [],
    this.reactions = const [],
    this.forwardedFrom,
    this.editedAt,
    this.deletedAt,
    this.metadata,
    this.createdAt,
    this.status,
    this.starred = false,
    this.pinned = false,
  });

  Message copyWith({
    String? content,
    List<Attachment>? attachments,
    List<Reaction>? reactions,
    String? editedAt,
    String? deletedAt,
    String? status,
    bool? starred,
    bool? pinned,
  }) {
    return Message(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      senderType: senderType,
      senderRefId: senderRefId,
      messageType: messageType,
      content: content ?? this.content,
      replyToId: replyToId,
      replyPreview: replyPreview,
      attachments: attachments ?? this.attachments,
      reactions: reactions ?? this.reactions,
      forwardedFrom: forwardedFrom,
      editedAt: editedAt ?? this.editedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      metadata: metadata,
      createdAt: createdAt,
      status: status ?? this.status,
      starred: starred ?? this.starred,
      pinned: pinned ?? this.pinned,
    );
  }

  /// Parse from REST /api/conversations/{id}/messages response
  factory Message.fromRestJson(Map<String, dynamic> json, {String? currentUserId}) {
    final attachmentsRaw = json['attachments'] as List<dynamic>?;
    final reactionsRaw = json['reactions'] as List<dynamic>?;
    final metadata = json['metadata'] as Map<String, dynamic>?;
    final forwarded = (json['forwardedFrom'] as Map<String, dynamic>?) ??
        (metadata?['forwardedFrom'] as Map<String, dynamic>?);

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
      attachments: attachmentsRaw == null
          ? const []
          : attachmentsRaw
              .whereType<Map<String, dynamic>>()
              .map(Attachment.fromJson)
              .toList(),
      reactions: reactionsRaw == null
          ? const []
          : reactionsRaw
              .whereType<Map<String, dynamic>>()
              .map((r) => Reaction.fromJson(r, currentUserId: currentUserId))
              .toList(),
      forwardedFrom: forwarded,
      editedAt: json['editedAt'] as String?,
      deletedAt: json['deletedAt'] as String?,
      metadata: metadata,
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
