import { gql } from '@apollo/client';

export const MY_SERVICE_PROVIDERS = gql`
  query MyServiceProviders($limit: Int, $offset: Int, $search: String) {
    myServiceProviders(limit: $limit, offset: $offset, search: $search) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
      }
      totalCount
    }
  }
`;

export const SP_DIRECTORY = gql`
  query SPDirectory($search: String, $limit: Int, $offset: Int, $industry: String) {
    serviceProviderDirectory(search: $search, limit: $limit, offset: $offset, industry: $industry) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
        address
        city
        state
        country
        postalCode
        latitude
        longitude
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
    }
  }
`;

export const SERVICE_PROVIDER_ACTIVE_BOTS = gql`
  # Per product rule #9, the gateway restricts this consumer-facing query to
  # MANAGER bots only. Each service provider has exactly one MANAGER, so this
  # returns at most one bot. Sub-agents are not exposed to consumer apps.
  query ServiceProviderActiveBots($serviceProviderId: ID!, $limit: Int, $offset: Int) {
    bots(serviceProviderId: $serviceProviderId, status: ACTIVE, limit: $limit, offset: $offset) {
      nodes {
        id
        name
        purpose
        status
        createdBySpUserId
      }
      totalCount
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

export const FOLLOWED_PROVIDERS = gql`
  query FollowedProviders($limit: Int, $offset: Int, $search: String) {
    followedServiceProviders(limit: $limit, offset: $offset, search: $search) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
        address
        city
        state
        country
        latitude
        longitude
      }
      totalCount
    }
  }
`;

export const NEARBY_PROVIDERS = gql`
  query NearbyProviders($latitude: Float!, $longitude: Float!, $radiusKm: Float, $limit: Int, $offset: Int) {
    nearbyServiceProviders(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm, limit: $limit, offset: $offset) {
      nodes {
        id
        slug
        name
        industry
        description
        verificationStatus
        status
        website
        address
        city
        state
        country
        latitude
        longitude
      }
      totalCount
    }
  }
`;
