import 'service_provider.dart';

// ─── Document Model ─────────────────────────────────────

class Document {
  final String id;
  final String? documentId;
  final String? fileName;
  final String? fileType;
  final String? shareContext;
  final ServiceProvider? serviceProvider;
  final String? createdAt;
  final String? openedAt;

  const Document({
    required this.id,
    this.documentId,
    this.fileName,
    this.fileType,
    this.shareContext,
    this.serviceProvider,
    this.createdAt,
    this.openedAt,
  });

  factory Document.fromJson(Map<String, dynamic> json) {
    return Document(
      id: json['id'] as String,
      documentId: json['documentId'] as String?,
      fileName: json['fileName'] as String?,
      fileType: json['fileType'] as String?,
      shareContext: json['shareContext'] as String?,
      serviceProvider: json['serviceProvider'] != null
          ? ServiceProvider.fromJson(json['serviceProvider'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] as String?,
      openedAt: json['openedAt'] as String?,
    );
  }
}
