/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useBlockedProviders } from '@/hooks/useBlockedProviders';
import { MY_BLOCKED_PROVIDERS } from '@/lib/graphql/profile';
import { UNBLOCK_SP } from '@/lib/graphql/service-providers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useBlockedProviders', () => {
  const blocked1 = { id: 'sp-1', name: 'Blocked Co', industry: 'Finance', verified: true, trustScore: 50 };
  const blocked2 = { id: 'sp-2', name: 'Spam Inc', industry: 'Marketing', verified: false, trustScore: 10 };

  const defaultMock: MockedResponse = {
    request: {
      query: MY_BLOCKED_PROVIDERS,
      variables: { limit: 20, offset: 0 },
    },
    result: {
      data: {
        myBlockedProviders: {
          nodes: [blocked1, blocked2],
          totalCount: 2,
        },
      },
    },
  };

  it('fetches blocked providers', async () => {
    const { result } = renderHook(() => useBlockedProviders(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.blockedProviders).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.blockedProviders[0].name).toBe('Blocked Co');
  });

  it('unblocks a provider', async () => {
    let mutationCalled = false;
    const unblockMock: MockedResponse = {
      request: {
        query: UNBLOCK_SP,
        variables: { serviceProviderId: 'sp-1' },
      },
      result: () => {
        mutationCalled = true;
        return { data: { unblockServiceProvider: true } };
      },
    };

    const { result } = renderHook(() => useBlockedProviders(), {
      wrapper: createWrapper([defaultMock, unblockMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.unblock('sp-1');
    });

    expect(mutationCalled).toBe(true);
  });

  it('handles error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: MY_BLOCKED_PROVIDERS,
        variables: { limit: 20, offset: 0 },
      },
      error: new Error('Fetch failed'),
    };

    const { result } = renderHook(() => useBlockedProviders(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
