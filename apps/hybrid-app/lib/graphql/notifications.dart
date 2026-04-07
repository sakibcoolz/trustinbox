// ─── GraphQL Notification Queries ───────────────────────
// Mirrors: apps/web/src/lib/graphql/notifications.ts

const String myNotificationsQuery = r'''
  query MyNotifications($category: NotificationCategory, $status: String, $limit: Int, $offset: Int) {
    myNotifications(category: $category, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        category
        title
        body
        priority
        status
        metadata
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        createdAt
      }
      totalCount
    }
  }
''';

const String myNotificationQuery = r'''
  query MyNotification($id: ID!) {
    notification(id: $id) {
      id
      category
      title
      body
      priority
      status
      metadata
      serviceProvider {
        id
        name
        industry
        verificationStatus
      }
      createdAt
    }
  }
''';

const String markNotificationReadMutation = r'''
  mutation MarkNotificationRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
''';

const String archiveNotificationMutation = r'''
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id)
  }
''';

const String markAllNotificationsReadMutation = r'''
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
''';
