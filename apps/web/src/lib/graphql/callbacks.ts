import { gql } from '@apollo/client';

export const MY_CALLBACKS = gql`
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
`;

export const MY_CALLBACK = gql`
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
`;

export const APPROVE_CALLBACK = gql`
  mutation ApproveCallback($input: ApproveCallbackRequestInput!) {
    approveCallbackRequest(input: $input) {
      id
      status
      respondedAt
      approvedSlotStart
      approvedSlotEnd
    }
  }
`;

export const REJECT_CALLBACK = gql`
  mutation RejectCallback($input: RejectCallbackRequestInput!) {
    rejectCallbackRequest(input: $input) {
      id
      status
      respondedAt
    }
  }
`;
