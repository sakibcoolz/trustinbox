/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useDNDRules } from '@/hooks/useDNDRules';
import { MY_DND_RULES, CREATE_DND_RULE, DELETE_DND_RULE } from '@/lib/graphql/settings';
import { createMockDNDRule } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useDNDRules', () => {
  const rule1 = createMockDNDRule({ id: 'dnd-1' });
  const rule2 = createMockDNDRule({ id: 'dnd-2', scopeType: 'SERVICE_PROVIDER', serviceProviderId: 'sp-1' });

  const defaultMock: MockedResponse = {
    request: { query: MY_DND_RULES },
    result: {
      data: {
        myDNDRules: [rule1, rule2],
      },
    },
  };

  it('fetches existing DND rules', async () => {
    const { result } = renderHook(() => useDNDRules(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.rules).toHaveLength(2);
    expect(result.current.rules[0].scopeType).toBe('GLOBAL');
  });

  it('creates a new DND rule', async () => {
    let mutationCalled = false;
    const newRule = createMockDNDRule({ id: 'dnd-3', startTime: '23:00', endTime: '06:00' });

    const createMock: MockedResponse = {
      request: {
        query: CREATE_DND_RULE,
        variables: {
          input: {
            scopeType: 'GLOBAL',
            startTime: '23:00',
            endTime: '06:00',
            daysOfWeek: ['MON', 'TUE'],
            isActive: true,
          },
        },
      },
      result: () => {
        mutationCalled = true;
        return { data: { createDNDRule: newRule } };
      },
    };

    const { result } = renderHook(() => useDNDRules(), {
      wrapper: createWrapper([defaultMock, createMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.createRule({
        scopeType: 'GLOBAL',
        startTime: '23:00',
        endTime: '06:00',
        daysOfWeek: ['MON', 'TUE'],
        isActive: true,
      });
    });

    expect(mutationCalled).toBe(true);
  });

  it('deletes a DND rule', async () => {
    let mutationCalled = false;
    const deleteMock: MockedResponse = {
      request: {
        query: DELETE_DND_RULE,
        variables: { id: 'dnd-1' },
      },
      result: () => {
        mutationCalled = true;
        return { data: { deleteDNDRule: true } };
      },
    };

    const { result } = renderHook(() => useDNDRules(), {
      wrapper: createWrapper([defaultMock, deleteMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.deleteRule('dnd-1');
    });

    expect(mutationCalled).toBe(true);
  });

  it('handles error on fetch', async () => {
    const errorMock: MockedResponse = {
      request: { query: MY_DND_RULES },
      error: new Error('Failed to fetch'),
    };

    const { result } = renderHook(() => useDNDRules(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
