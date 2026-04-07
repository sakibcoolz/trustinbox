// ─── GraphQL Document Queries ───────────────────────────
// Mirrors: apps/web/src/lib/graphql/documents.ts

const String myDocumentsQuery = r'''
  query MyDocuments($limit: Int, $offset: Int, $serviceProviderId: ID, $classification: String) {
    myDocuments(limit: $limit, offset: $offset, serviceProviderId: $serviceProviderId, classification: $classification) {
      nodes {
        id
        documentId
        fileName
        fileType
        shareContext
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        createdAt
        openedAt
      }
      totalCount
    }
  }
''';
