// ─── GraphQL Address Queries ────────────────────────────
// Mirrors: apps/web/src/lib/graphql/addresses.ts

const String myAddressesQuery = r'''
  query MyAddresses {
    myAddresses {
      id
      userId
      label
      addressLine1
      addressLine2
      city
      state
      postalCode
      country
      latitude
      longitude
      isCurrent
      createdAt
      updatedAt
    }
  }
''';

const String myCurrentAddressQuery = r'''
  query MyCurrentAddress {
    myCurrentAddress {
      id
      userId
      label
      addressLine1
      city
      state
      postalCode
      country
      latitude
      longitude
      isCurrent
    }
  }
''';

const String createAddressMutation = r'''
  mutation CreateAddress($input: CreateAddressInput!) {
    createAddress(input: $input) {
      id
      label
      addressLine1
      addressLine2
      city
      state
      postalCode
      country
      latitude
      longitude
      isCurrent
    }
  }
''';

const String updateAddressMutation = r'''
  mutation UpdateAddress($input: UpdateAddressInput!) {
    updateAddress(input: $input) {
      id
      label
      addressLine1
      addressLine2
      city
      state
      postalCode
      country
      latitude
      longitude
      isCurrent
    }
  }
''';

const String deleteAddressMutation = r'''
  mutation DeleteAddress($id: ID!) {
    deleteAddress(id: $id)
  }
''';

const String setCurrentAddressMutation = r'''
  mutation SetCurrentAddress($id: ID!) {
    setCurrentAddress(id: $id)
  }
''';
