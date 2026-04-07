import 'service_provider.dart';

// ─── Notification Model ─────────────────────────────────

enum NotificationCategory { personal, serviceProvider, advertisement }

class AppNotification {
  final String id;
  final String category;
  final String title;
  final String body;
  final String? priority;
  final String? status;
  final Map<String, dynamic>? metadata;
  final ServiceProvider? serviceProvider;
  final String? createdAt;
  final bool read;
  final bool? suppressed;
  final bool? soundEnabled;
  final String? entityId;

  const AppNotification({
    required this.id,
    required this.category,
    required this.title,
    required this.body,
    this.priority,
    this.status,
    this.metadata,
    this.serviceProvider,
    this.createdAt,
    this.read = false,
    this.suppressed,
    this.soundEnabled,
    this.entityId,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      category: json['category'] as String? ?? 'ServiceProvider',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      priority: json['priority'] as String?,
      status: json['status'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      serviceProvider: json['serviceProvider'] != null
          ? ServiceProvider.fromJson(json['serviceProvider'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] as String?,
      read: json['read'] as bool? ?? false,
      suppressed: json['suppressed'] as bool?,
      soundEnabled: json['soundEnabled'] as bool?,
      entityId: json['entityId'] as String?,
    );
  }

  AppNotification copyWith({bool? read}) {
    return AppNotification(
      id: id,
      category: category,
      title: title,
      body: body,
      priority: priority,
      status: status,
      metadata: metadata,
      serviceProvider: serviceProvider,
      createdAt: createdAt,
      read: read ?? this.read,
      suppressed: suppressed,
      soundEnabled: soundEnabled,
      entityId: entityId,
    );
  }
}
