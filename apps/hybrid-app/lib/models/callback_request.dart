import 'service_provider.dart';

// ─── Callback Request Model ─────────────────────────────

class CallbackRequest {
  final String id;
  final String? reason;
  final String? details;
  final String status;
  final String? requestedAt;
  final String? respondedAt;
  final String? approvedSlotStart;
  final String? approvedSlotEnd;
  final ServiceProvider? serviceProvider;

  const CallbackRequest({
    required this.id,
    this.reason,
    this.details,
    required this.status,
    this.requestedAt,
    this.respondedAt,
    this.approvedSlotStart,
    this.approvedSlotEnd,
    this.serviceProvider,
  });

  factory CallbackRequest.fromJson(Map<String, dynamic> json) {
    return CallbackRequest(
      id: json['id'] as String,
      reason: json['reason'] as String?,
      details: json['details'] as String?,
      status: json['status'] as String? ?? 'pending',
      requestedAt: json['requestedAt'] as String?,
      respondedAt: json['respondedAt'] as String?,
      approvedSlotStart: json['approvedSlotStart'] as String?,
      approvedSlotEnd: json['approvedSlotEnd'] as String?,
      serviceProvider: json['serviceProvider'] != null
          ? ServiceProvider.fromJson(json['serviceProvider'] as Map<String, dynamic>)
          : null,
    );
  }
}
