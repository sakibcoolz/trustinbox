import { gql } from '@apollo/client';

export const MY_PRIVACY_PREFERENCES = gql`
  query MyPrivacyPreferences {
    myPrivacyPreferences {
      allowPersonalNotifications
      allowSPNotifications
      allowAdvertisements
      allowCallbackRequests
      allowChat
      allowDocumentShares
      requireCallApproval
      notificationSoundEnabled
    }
  }
`;

export const UPDATE_PRIVACY = gql`
  mutation UpdatePrivacy($input: UpdatePrivacyPreferenceInput!) {
    updatePrivacyPreference(input: $input) {
      allowPersonalNotifications
      allowSPNotifications
      allowAdvertisements
      allowCallbackRequests
      allowChat
      allowDocumentShares
      requireCallApproval
      notificationSoundEnabled
    }
  }
`;

export const MY_DND_RULES = gql`
  query MyDNDRules {
    myDNDRules {
      id
      scopeType
      scopeRefId
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
`;

export const CREATE_DND_RULE = gql`
  mutation CreateDNDRule($input: CreateDNDRuleInput!) {
    createDNDRule(input: $input) {
      id
      scopeType
      scopeRefId
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
`;

export const UPDATE_DND_RULE = gql`
  mutation UpdateDNDRule($input: UpdateDNDRuleInput!) {
    updateDNDRule(input: $input) {
      id
      scopeType
      scopeRefId
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
`;

export const DELETE_DND_RULE = gql`
  mutation DeleteDNDRule($id: ID!) {
    deleteDNDRule(id: $id)
  }
`;

export const MY_AVAILABILITY_SLOTS = gql`
  query MyAvailabilitySlots {
    myAvailabilitySlots {
      id
      dayOfWeek
      startTime
      endTime
      slotType
      isActive
    }
  }
`;

export const CREATE_AVAILABILITY_SLOT = gql`
  mutation CreateAvailabilitySlot($input: CreateAvailabilitySlotInput!) {
    createAvailabilitySlot(input: $input) {
      id
      dayOfWeek
      startTime
      endTime
      slotType
      isActive
    }
  }
`;

export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
