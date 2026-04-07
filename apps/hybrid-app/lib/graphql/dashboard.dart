// ─── GraphQL Dashboard Queries ──────────────────────────
// Mirrors: apps/web/src/lib/graphql/dashboard.ts

const String dashboardSummaryQuery = r'''
  query MyDashboardSummary {
    myDashboardSummary {
      unreadNotifications
      pendingCallbacks
      activeConversations
      sharedDocuments
      blockedProviders
      dndActive
    }
  }
''';
