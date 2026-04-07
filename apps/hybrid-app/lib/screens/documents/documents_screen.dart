import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/documents.dart';
import '../../models/document.dart';
import '../../widgets/empty_state.dart';
import '../../config/theme.dart';
import 'package:intl/intl.dart';

// ─── Documents Screen ───────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/documents/page.tsx

class DocumentsScreen extends StatelessWidget {
  const DocumentsScreen({super.key});

  IconData _fileIcon(String? fileType) {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Icons.image_outlined;
      case 'doc':
      case 'docx':
        return Icons.description_outlined;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart_outlined;
      default:
        return Icons.insert_drive_file_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: Query(
        options: QueryOptions(
          document: gql(myDocumentsQuery),
          variables: const {'limit': 20, 'offset': 0},
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final nodes = result.data?['myDocuments']?['nodes'] as List<dynamic>? ?? [];
          final docs = nodes.map((d) => Document.fromJson(d as Map<String, dynamic>)).toList();

          if (docs.isEmpty) {
            return EmptyState(
              icon: Icons.description_outlined,
              title: 'No documents',
              subtitle: 'Documents shared by service providers will appear here',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => refetch?.call(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: docs.length,
              itemBuilder: (context, index) {
                final doc = docs[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(
                      _fileIcon(doc.fileType),
                      color: AppColors.accentBlue,
                      size: 32,
                    ),
                    title: Text(
                      doc.fileName ?? 'Document',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (doc.serviceProvider != null)
                          Text(doc.serviceProvider!.name, style: Theme.of(context).textTheme.bodySmall),
                        if (doc.createdAt != null)
                          Text(
                            DateFormat('MMM d, yyyy').format(DateTime.parse(doc.createdAt!)),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
                          ),
                      ],
                    ),
                    trailing: const Icon(Icons.open_in_new, size: 18),
                    onTap: () {
                      // TODO: Open document via presigned URL
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
