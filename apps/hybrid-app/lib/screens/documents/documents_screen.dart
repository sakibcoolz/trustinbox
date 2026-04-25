import 'dart:async';
import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../graphql/documents.dart';
import '../../models/document.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/empty_state.dart';

// ─── Documents Screen ───────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/documents/page.tsx
// + search bar (client-side filter), tap → /documents/:id

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _query = _searchController.text.trim().toLowerCase());
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  IconData _fileIcon(String? fileType) {
    switch (fileType?.toLowerCase()) {
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

  Color _fileColor(String? fileType) {
    switch (fileType?.toLowerCase()) {
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

  bool _matches(Document doc) {
    if (_query.isEmpty) return true;
    final name = (doc.fileName ?? '').toLowerCase();
    final spName = (doc.serviceProvider?.name ?? '').toLowerCase();
    final ctx = (doc.shareContext ?? '').toLowerCase();
    return name.contains(_query) || spName.contains(_query) || ctx.contains(_query);
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
              context.go('/');
            }
          },
        ),
        title: const Text('Documents'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showUploadSheet,
        tooltip: 'Upload document',
        child: const Icon(Icons.upload_file_outlined),
      ),
      body: Column(
        children: [
          // ─── Search bar ─────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search documents…',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          // ─── List ────────────────────────────────────
          Expanded(
            child: Query(
              options: QueryOptions(
                document: gql(myDocumentsQuery),
                variables: const {'limit': 50, 'offset': 0},
                fetchPolicy: FetchPolicy.cacheAndNetwork,
              ),
              builder: (result, {fetchMore, refetch}) {
                if (result.isLoading && result.data == null) {
                  return const Center(child: CircularProgressIndicator());
                }

                final nodes = result.data?['myDocuments']?['nodes'] as List<dynamic>? ?? [];
                final allDocs = nodes.map((d) => Document.fromJson(d as Map<String, dynamic>)).toList();
                final docs = allDocs.where(_matches).toList();

                if (docs.isEmpty) {
                  return EmptyState(
                    icon: Icons.description_outlined,
                    title: _query.isNotEmpty ? 'No results for "$_query"' : 'No documents',
                    subtitle: _query.isNotEmpty
                        ? 'Try a different search term.'
                        : 'Documents shared by service providers will appear here.',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => refetch?.call(),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: docs.length,
                    itemBuilder: (_, index) {
                      final doc = docs[index];
                      final color = _fileColor(doc.fileType);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(_fileIcon(doc.fileType), color: color, size: 22),
                          ),
                          title: Text(
                            doc.fileName ?? 'Document',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (doc.serviceProvider != null)
                                Text(
                                  doc.serviceProvider!.name,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              if (doc.createdAt != null)
                                Text(
                                  DateFormat('MMM d, yyyy').format(DateTime.parse(doc.createdAt!)),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        fontSize: 11,
                                        color: AppColors.textMuted,
                                      ),
                                ),
                            ],
                          ),
                          trailing: const Icon(Icons.chevron_right, size: 18),
                          onTap: () => context.push('/documents/${doc.id}'),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ─── Upload document bottom sheet ────────────────────────────
  void _showUploadSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _UploadSheet(onUploaded: () => setState(() {})),
    );
  }
}

// ─── Upload bottom sheet ──────────────────────────────────────

class _UploadSheet extends StatefulWidget {
  final VoidCallback onUploaded;
  const _UploadSheet({required this.onUploaded});

  @override
  State<_UploadSheet> createState() => _UploadSheetState();
}

class _UploadSheetState extends State<_UploadSheet> {
  PlatformFile? _file;
  final _descController = TextEditingController();
  bool _uploading = false;
  String? _error;

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result != null && result.files.isNotEmpty) {
      setState(() { _file = result.files.first; });
    }
  }

  Future<void> _upload() async {
    final file = _file;
    if (file == null) return;

    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() { _uploading = true; _error = null; });
    try {
      // 1. Request presigned upload URL
      final urlRes = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/documents/upload-url'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({
          'fileName': file.name,
          'contentType': file.extension != null ? 'application/${file.extension}' : 'application/octet-stream',
          'description': _descController.text.trim(),
        }),
      );
      final urlData = jsonDecode(urlRes.body) as Map<String, dynamic>;
      if (urlRes.statusCode != 200) {
        setState(() { _error = urlData['error'] as String? ?? 'Failed to get upload URL'; });
        return;
      }

      // 2. PUT file bytes to presigned URL
      final putRes = await http.put(
        Uri.parse(urlData['uploadUrl'] as String),
        headers: {'Content-Type': 'application/octet-stream'},
        body: file.bytes,
      );
      if (putRes.statusCode >= 300) {
        setState(() { _error = 'File upload to storage failed (${putRes.statusCode})'; });
        return;
      }

      // 3. Confirm
      await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/api/documents/${urlData['documentId']}/confirm'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (mounted) {
        Navigator.of(context).pop();
        widget.onUploaded();
      }
    } catch (e) {
      setState(() { _error = 'Network error. Please try again.'; });
    } finally {
      if (mounted) setState(() { _uploading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.borderPrimary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Text('Upload Document', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),

          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.accentRed.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.accentRed.withValues(alpha: 0.3)),
              ),
              child: Text(_error!, style: TextStyle(color: AppColors.accentRed, fontSize: 13)),
            ),

          // File picker
          GestureDetector(
            onTap: _pickFile,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                border: Border.all(
                  color: _file != null ? AppColors.accentBlue : AppColors.borderPrimary,
                  style: BorderStyle.solid,
                  width: _file != null ? 1.5 : 1,
                ),
                borderRadius: BorderRadius.circular(12),
                color: AppColors.bgSecondary,
              ),
              child: _file != null
                  ? Row(
                      children: [
                        Icon(Icons.insert_drive_file_outlined, color: AppColors.accentBlue),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(_file!.name, style: TextStyle(color: AppColors.textPrimary), overflow: TextOverflow.ellipsis),
                        ),
                        GestureDetector(
                          onTap: () => setState(() => _file = null),
                          child: Icon(Icons.close, size: 18, color: AppColors.textMuted),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        Icon(Icons.upload_file_outlined, size: 36, color: AppColors.textMuted),
                        const SizedBox(height: 8),
                        Text('Tap to select a file', style: TextStyle(color: AppColors.textSecondary)),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),

          // Description
          TextField(
            controller: _descController,
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
              hintText: 'Brief description…',
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 24),

          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _uploading ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: (_file == null || _uploading) ? null : _upload,
                  child: _uploading
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Upload'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
