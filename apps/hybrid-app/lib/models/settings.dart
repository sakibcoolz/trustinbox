// ─── Settings Models ────────────────────────────────────

class PrivacyPreferences {
  final bool allowPersonalNotifications;
  final bool allowSPNotifications;
  final bool allowAdvertisements;
  final bool allowCallbackRequests;
  final bool allowChat;
  final bool allowDocumentShares;
  final bool requireCallApproval;
  final bool notificationSoundEnabled;

  const PrivacyPreferences({
    this.allowPersonalNotifications = true,
    this.allowSPNotifications = true,
    this.allowAdvertisements = false,
    this.allowCallbackRequests = true,
    this.allowChat = true,
    this.allowDocumentShares = true,
    this.requireCallApproval = true,
    this.notificationSoundEnabled = true,
  });

  factory PrivacyPreferences.fromJson(Map<String, dynamic> json) {
    return PrivacyPreferences(
      allowPersonalNotifications: json['allowPersonalNotifications'] as bool? ?? true,
      allowSPNotifications: json['allowSPNotifications'] as bool? ?? true,
      allowAdvertisements: json['allowAdvertisements'] as bool? ?? false,
      allowCallbackRequests: json['allowCallbackRequests'] as bool? ?? true,
      allowChat: json['allowChat'] as bool? ?? true,
      allowDocumentShares: json['allowDocumentShares'] as bool? ?? true,
      requireCallApproval: json['requireCallApproval'] as bool? ?? true,
      notificationSoundEnabled: json['notificationSoundEnabled'] as bool? ?? true,
    );
  }
}

class DNDRule {
  final String id;
  final String? scopeType;
  final String? scopeRefId;
  final String startTime;
  final String endTime;
  final List<int> daysOfWeek;
  final bool isActive;

  const DNDRule({
    required this.id,
    this.scopeType,
    this.scopeRefId,
    required this.startTime,
    required this.endTime,
    this.daysOfWeek = const [],
    this.isActive = true,
  });

  factory DNDRule.fromJson(Map<String, dynamic> json) {
    return DNDRule(
      id: json['id'] as String,
      scopeType: json['scopeType'] as String?,
      scopeRefId: json['scopeRefId'] as String?,
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      daysOfWeek: (json['daysOfWeek'] as List<dynamic>?)?.cast<int>() ?? [],
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class AvailabilitySlot {
  final String id;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String? slotType;
  final bool isActive;

  const AvailabilitySlot({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.slotType,
    this.isActive = true,
  });

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlot(
      id: json['id'] as String,
      dayOfWeek: json['dayOfWeek'] as int? ?? 0,
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      slotType: json['slotType'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class UserAddress {
  final String id;
  final String? userId;
  final String label;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String? state;
  final String? postalCode;
  final String country;
  final double? latitude;
  final double? longitude;
  final bool isCurrent;
  final String? createdAt;
  final String? updatedAt;

  const UserAddress({
    required this.id,
    this.userId,
    required this.label,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    this.state,
    this.postalCode,
    required this.country,
    this.latitude,
    this.longitude,
    this.isCurrent = false,
    this.createdAt,
    this.updatedAt,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    return UserAddress(
      id: json['id'] as String,
      userId: json['userId'] as String?,
      label: json['label'] as String? ?? '',
      addressLine1: json['addressLine1'] as String? ?? '',
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String? ?? '',
      state: json['state'] as String?,
      postalCode: json['postalCode'] as String?,
      country: json['country'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      isCurrent: json['isCurrent'] as bool? ?? false,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }
}

class DashboardSummary {
  final int unreadNotifications;
  final int pendingCallbacks;
  final int activeConversations;
  final int sharedDocuments;
  final int blockedProviders;
  final bool dndActive;

  const DashboardSummary({
    this.unreadNotifications = 0,
    this.pendingCallbacks = 0,
    this.activeConversations = 0,
    this.sharedDocuments = 0,
    this.blockedProviders = 0,
    this.dndActive = false,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      unreadNotifications: json['unreadNotifications'] as int? ?? 0,
      pendingCallbacks: json['pendingCallbacks'] as int? ?? 0,
      activeConversations: json['activeConversations'] as int? ?? 0,
      sharedDocuments: json['sharedDocuments'] as int? ?? 0,
      blockedProviders: json['blockedProviders'] as int? ?? 0,
      dndActive: json['dndActive'] as bool? ?? false,
    );
  }
}

class UserProfile {
  final String id;
  final String? username;
  final String? fullName;
  final String? email;
  final String? avatarUrl;
  final String? timezone;
  final String? language;

  const UserProfile({
    required this.id,
    this.username,
    this.fullName,
    this.email,
    this.avatarUrl,
    this.timezone,
    this.language,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      username: json['username'] as String?,
      fullName: json['fullName'] as String?,
      email: json['email'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      timezone: json['timezone'] as String?,
      language: json['language'] as String?,
    );
  }
}

class BlockedProvider {
  final ServiceProviderRef serviceProvider;
  final String? blockedAt;
  final String? reason;

  const BlockedProvider({
    required this.serviceProvider,
    this.blockedAt,
    this.reason,
  });

  factory BlockedProvider.fromJson(Map<String, dynamic> json) {
    return BlockedProvider(
      serviceProvider: ServiceProviderRef.fromJson(
        json['serviceProvider'] as Map<String, dynamic>,
      ),
      blockedAt: json['blockedAt'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

class ServiceProviderRef {
  final String id;
  final String name;
  final String? industry;
  final String? verificationStatus;

  const ServiceProviderRef({
    required this.id,
    required this.name,
    this.industry,
    this.verificationStatus,
  });

  factory ServiceProviderRef.fromJson(Map<String, dynamic> json) {
    return ServiceProviderRef(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      industry: json['industry'] as String?,
      verificationStatus: json['verificationStatus'] as String?,
    );
  }
}

class Friend {
  final String id;
  final FriendUser user;
  final String? createdAt;

  const Friend({required this.id, required this.user, this.createdAt});

  factory Friend.fromJson(Map<String, dynamic> json) {
    return Friend(
      id: json['id'] as String,
      user: FriendUser.fromJson(json['user'] as Map<String, dynamic>),
      createdAt: json['createdAt'] as String?,
    );
  }
}

class FriendUser {
  final String id;
  final String? username;
  final String? fullName;
  final String? virtualPublicId;

  const FriendUser({
    required this.id,
    this.username,
    this.fullName,
    this.virtualPublicId,
  });

  factory FriendUser.fromJson(Map<String, dynamic> json) {
    return FriendUser(
      id: json['id'] as String,
      username: json['username'] as String?,
      fullName: json['fullName'] as String?,
      virtualPublicId: json['virtualPublicId'] as String?,
    );
  }
}

class FriendRequest {
  final String id;
  final FriendUser user;
  final String? direction;
  final String? status;
  final String? message;
  final String? createdAt;

  const FriendRequest({
    required this.id,
    required this.user,
    this.direction,
    this.status,
    this.message,
    this.createdAt,
  });

  factory FriendRequest.fromJson(Map<String, dynamic> json) {
    return FriendRequest(
      id: json['id'] as String,
      user: FriendUser.fromJson(json['user'] as Map<String, dynamic>),
      direction: json['direction'] as String?,
      status: json['status'] as String?,
      message: json['message'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
