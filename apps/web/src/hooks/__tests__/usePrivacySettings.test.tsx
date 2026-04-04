/// <reference types="vitest/globals" />
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { MY_PRIVACY_PREFERENCES, UPDATE_PRIVACY } from '@/lib/graphql/settings';
import { createMockPrivacyPreference } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('usePrivacySettings', () => {
  const mockPrefs = createMockPrivacyPreference();

  const defaultMock: MockedResponse = {
    request: { query: MY_PRIVACY_PREFERENCES },
    result: {
      data: {
        myPrivacyPreferences: mockPrefs,
      },
    },
  };

  it('fetches current privacy preferences', async () => {
    const { result } = renderHook(() => usePrivacySettings(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.privacy).toBeTruthy();
    expect(result.current.privacy?.allowPersonalNotifications).toBe(true);
    expect(result.current.privacy?.allowAdvertisements).toBe(false);
    expect(result.current.privacy?.requireCallApproval).toBe(true);
  });

  it('starts in loading state', async () => {
    const { result } = renderHook(() => usePrivacySettings(), {
      wrapper: createWrapper([defaultMock]),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => { expect(result.current.loading).toBe(false); });
  });

  it('handles query error', async () => {
    const errorMock: MockedResponse = {
      request: { query: MY_PRIVACY_PREFERENCES },
      error: new Error('Network error'),
    };

    const { result } = renderHook(() => usePrivacySettings(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('all 7 privacy fields are populated', async () => {
    const { result } = renderHook(() => usePrivacySettings(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    const p = result.current.privacy;
    expect(p).toHaveProperty('allowPersonalNotifications');
    expect(p).toHaveProperty('allowSPNotifications');
    expect(p).toHaveProperty('allowAdvertisements');
    expect(p).toHaveProperty('allowCallbackRequests');
    expect(p).toHaveProperty('allowChat');
    expect(p).toHaveProperty('allowDocumentShares');
    expect(p).toHaveProperty('requireCallApproval');
  });
});
