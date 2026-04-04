import { gql } from '@apollo/client';

export const MY_DOCUMENTS = gql`
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
`;
