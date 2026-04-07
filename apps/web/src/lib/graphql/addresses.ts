import { gql } from '@apollo/client';

export const MY_ADDRESSES = gql`
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
`;

export const MY_CURRENT_ADDRESS = gql`
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
`;

export const CREATE_ADDRESS = gql`
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
`;

export const UPDATE_ADDRESS = gql`
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
`;

export const DELETE_ADDRESS = gql`
  mutation DeleteAddress($id: ID!) {
    deleteAddress(id: $id)
  }
`;

export const SET_CURRENT_ADDRESS = gql`
  mutation SetCurrentAddress($id: ID!) {
    setCurrentAddress(id: $id)
  }
`;
