import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/document.dart';
import '../../providers/auth_provider.dart';

// ─── Document Detail Screen ─────────────────────────────
// Route: /documents/:id (root navigator)
// Shows document metadata + presigned-URL download with progress.

const String _documentByIdQuery = r'''
  query DocumentById($id: ID!) {
    document(id: $id) {
      id
      documentId
      fileName
      fileType
      fileSize
      shareContext
      description
      expiresAt
      createdAt
      openedAt
      serviceProvider {
        id
        name
        industry
        verificationStatus
      }
    }
  }
''';

class DocumentDetailScreen extends StatefulWidget {
  final String documentId;
  const DocumentDetailScreen({super.key, required this.documentId});

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  bool _downloading = false;
  double _downloadProgress = 0;

  IconData _fileIcon(String? t) {
    switch (t?.toLowerCase()) {
      case 'pdf': return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return Icons.image_outlined;
      case 'doc':
      case 'docx': return Icons.description_outlined;
      case 'xls':
      case 'xlsx': return Icons.table_chart_outlined;
      default: return Icons.insert_drive_file_outlined;
    }
  }

  Color _fileColor(String? t) {
    switch (t?.toLowerCase()) {
      case 'pdf': return AppColors.accentRed;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return AppColors.accentGreen;
      case 'doc':
      case 'docx': return AppColors.accentBlue;
      case 'xls':
      case 'xlsx': return AppColors.accentGreen;
      default: return AppColors.textMuted;
    }
  }

  String _formatSize(dynamic bytes) {
    if (bytes == null) return '—';
    final n = (bytes is int) ? bytes : int.tryParse(bytes.toString()) ?? 0;
    if (n < 1024) return '$n B';
    if (n < 1024 * 1024) return '${(n / 1024).toStringAsFixed(1)} KB';
    return '${(n / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  Future<void> _download(BuildContext ctx, Document doc) async {
    // Capture context-dependent values before any await
    final auth = ctx.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(ctx);
    final token = auth.token;
    if (token == null) return;

    setState(() {
      _downloading = true;
      _downloadProgress = 0;
    });

    try {
      // Step 1: Get presigned URL from gateway
      final signedResp = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/api/gateway/documents/signed-url/${doc.id}'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (signedResp.statusCode != 200) {
        throw Exception('Failed to get download URL (${signedResp.statusCode})');
      }

      // Parse either { url: ... } or plain string response
      String downloadUrl;
      final body = signedResp.body.trim();
      if (body.startsWith('{')) {
        final decoded = jsonDecode(body) as Map<String, dynamic>;
        downloadUrl = decoded['url'] as String;
      } else {
        downloadUrl = body.replaceAll('"', '');
      }

      // Step 2: Download file with progress tracking
      final request = http.Request('GET', Uri.parse(downloadUrl));
      final streamResp = await request.send();
      final total = streamResp.contentLength ?? 0;

      final dir = await getApplicationDocumentsDirectory();
      final fileName = doc.fileName ?? 'document_${doc.id}';
      final file = File('${dir.path}/$fileName');
      final sink = file.openWrite();

      int received = 0;
      await for (final chunk in streamResp.stream) {
        sink.add(chunk);
        received += chunk.length;
        if (total > 0 && mounted) {
          setState(() => _downloadProgress = received / total);
        }
      }
      await sink.close();

      if (!mounted) return;
      setState(() {
        _downloading = false;
        _downloadProgress = 1;
      });

      // Step 3: Try to open the file
      final uri = Uri.file(file.path);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text('Saved to ${file.path}'),
            action: SnackBarAction(label: 'OK', onPressed: () {}),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _downloading = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text('Download failed: ${e.toString().substring(0, 80)}'),
          backgroundColor: AppColors.statusError,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/documents');
            }
          },
        ),
        title: const Text('Document'),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(_documentByIdQuery),
          variables: {'id': widget.documentId},
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final raw = result.data?['document'] as Map<String, dynamic>?;
          if (raw == null) {
            return const Center(child: Text('Document not found'));
          }

          final doc = Document.fromJson(raw);
          final color = _fileColor(doc.fileType);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // ─── File header ──────────────────────────
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(_fileIcon(doc.fileType), color: color, size: 30),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              doc.fileName ?? 'Document',
                              style: Theme.of(context).textTheme.titleMedium,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${(doc.fileType ?? '').toUpperCase()}  ·  ${_formatSize(raw['fileSize'])}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // ─── Download button ──────────────────────
              if (_downloading) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Downloading… ${(_downloadProgress * 100).toStringAsFixed(0)}%',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(value: _downloadProgress > 0 ? _downloadProgress : null),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                FilledButton.icon(
                  onPressed: () => _download(context, doc),
                  icon: const Icon(Icons.download_outlined),
                  label: const Text('Download'),
                ),
              ],
              const SizedBox(height: 12),

              // ─── Metadata card ────────────────────────
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text('Details', style: Theme.of(context).textTheme.titleSmall),
                    ),
                    if (doc.serviceProvider != null) ...[
                      _DetailRow(
                        icon: Icons.business_outlined,
                        label: 'Sender',
                        value: doc.serviceProvider!.name,
                      ),
                      const Divider(height: 1),
                    ],
                    if (doc.shareContext != null) ...[
                      _DetailRow(
                        icon: Icons.label_outline,
                        label: 'Context',
                        value: doc.shareContext!,
                      ),
                      const Divider(height: 1),
                    ],
                    if (doc.createdAt != null)
                      _DetailRow(
                        icon: Icons.calendar_today_outlined,
                        label: 'Shared',
                        value: DateFormat('MMM d, yyyy HH:mm').format(DateTime.parse(doc.createdAt!)),
                      ),
                    if (raw['expiresAt'] != null) ...[
                      const Divider(height: 1),
                      _DetailRow(
                        icon: Icons.timer_outlined,
                        label: 'Expires',
                        value: DateFormat('MMM d, yyyy HH:mm').format(DateTime.parse(raw['expiresAt'] as String)),
                      ),
                    ],
                    if (raw['description'] != null && (raw['description'] as String).isNotEmpty) ...[
                      const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Description', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
                            const SizedBox(height: 4),
                            Text(raw['description'] as String),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 18, color: AppColors.textMuted),
      title: Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
      trailing: Flexible(
        child: Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.end,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
