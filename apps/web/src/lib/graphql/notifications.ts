import { gql } from '@apollo/client';

export const MY_NOTIFICATIONS = gql`
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
`;

export const MY_NOTIFICATION = gql`
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
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`;

export const ARCHIVE_NOTIFICATION = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
