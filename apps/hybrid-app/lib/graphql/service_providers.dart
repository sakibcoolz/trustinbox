// ─── GraphQL Service Provider Queries ───────────────────
// Mirrors: apps/web/src/lib/graphql/service-providers.ts

const String myServiceProvidersQuery = r'''
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
''';

const String spDirectoryQuery = r'''
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
''';

const String serviceProviderQuery = r'''
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
      address
      city
      state
      country
      postalCode
      latitude
      longitude
    }
  }
''';

const String serviceProviderActiveBotsQuery = r'''
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
''';

const String blockSPMutation = r'''
  mutation BlockServiceProvider($serviceProviderId: ID!, $reason: String) {
    blockServiceProvider(serviceProviderId: $serviceProviderId, reason: $reason)
  }
''';

const String unblockSPMutation = r'''
  mutation UnblockServiceProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
''';

const String reportSpamMutation = r'''
  mutation ReportSpam($input: ReportSpamInput!) {
    reportSpam(input: $input)
  }
''';

const String followedProvidersQuery = r'''
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
''';

const String nearbyProvidersQuery = r'''
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
''';
