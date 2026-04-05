import { gql } from '@apollo/client';

export const MY_SERVICE_PROVIDERS = gql`
  query MyServiceProviders($limit: Int, $offset: Int, $search: String, $serviceMode: String) {
    myServiceProviders(limit: $limit, offset: $offset, search: $search, serviceMode: $serviceMode) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
        serviceMode
      }
      totalCount
    }
  }
`;

export const SP_DIRECTORY = gql`
  query SPDirectory($search: String, $limit: Int, $offset: Int, $industry: String, $serviceMode: String) {
    serviceProviderDirectory(search: $search, limit: $limit, offset: $offset, industry: $industry, serviceMode: $serviceMode) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
        serviceMode
      }
      totalCount
    }
  }
`;

export const SERVICE_PROVIDER = gql`
  query ServiceProvider($id: ID!) {
    serviceProvider(id: $id) {
      id
      slug
      name
      legalName
      industry
      description
      verificationStatus
      status
      website
      serviceMode
    }
  }
`;

export const BLOCK_SP = gql`
  mutation BlockServiceProvider($serviceProviderId: ID!, $reason: String) {
    blockServiceProvider(serviceProviderId: $serviceProviderId, reason: $reason)
  }
`;

export const UNBLOCK_SP = gql`
  mutation UnblockServiceProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;

export const REPORT_SPAM = gql`
  mutation ReportSpam($input: ReportSpamInput!) {
    reportSpam(input: $input)
  }
`;
