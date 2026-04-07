// ─── GraphQL Settings Queries ───────────────────────────
// Mirrors: apps/web/src/lib/graphql/settings.ts

const String myPrivacyPreferencesQuery = r'''
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
''';

const String updatePrivacyMutation = r'''
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
''';

const String myDNDRulesQuery = r'''
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
''';

const String createDNDRuleMutation = r'''
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
''';

const String updateDNDRuleMutation = r'''
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
''';

const String deleteDNDRuleMutation = r'''
  mutation DeleteDNDRule($id: ID!) {
    deleteDNDRule(id: $id)
  }
''';

const String myAvailabilitySlotsQuery = r'''
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
''';

const String createAvailabilitySlotMutation = r'''
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
''';

const String deleteAvailabilitySlotMutation = r'''
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
''';

const String blockedProvidersQuery = r'''
  query MyBlockedProviders {
    myBlockedProviders {
      nodes {
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        blockedAt
        reason
      }
      totalCount
    }
  }
''';

const String unblockProviderMutation = r'''
  mutation UnblockProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
''';
