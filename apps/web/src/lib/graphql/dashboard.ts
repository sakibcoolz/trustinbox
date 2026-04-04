import { gql } from '@apollo/client';

export const DASHBOARD_SUMMARY = gql`
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
`;
