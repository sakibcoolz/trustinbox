// ─── GraphQL Callback Queries ───────────────────────────
// Mirrors: apps/web/src/lib/graphql/callbacks.ts

const String myCallbacksQuery = r'''
  query MyCallbacks($status: CallbackRequestStatus, $limit: Int, $offset: Int) {
    myCallbackRequests(status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        reason
        details
        status
        requestedAt
        respondedAt
        approvedSlotStart
        approvedSlotEnd
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
      }
      totalCount
    }
  }
''';

const String myCallbackQuery = r'''
  query MyCallback($id: ID!) {
    callbackRequest(id: $id) {
      id
      reason
      details
      status
      requestedAt
      respondedAt
      approvedSlotStart
      approvedSlotEnd
      serviceProvider {
        id
        name
        industry
        verificationStatus
      }
    }
  }
''';

const String approveCallbackMutation = r'''
  mutation ApproveCallback($input: ApproveCallbackRequestInput!) {
    approveCallbackRequest(input: $input) {
      id
      status
      respondedAt
      approvedSlotStart
      approvedSlotEnd
    }
  }
''';

const String rejectCallbackMutation = r'''
  mutation RejectCallback($input: RejectCallbackRequestInput!) {
    rejectCallbackRequest(input: $input) {
      id
      status
      respondedAt
    }
  }
''';
