/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useCallbacks } from '@/hooks/useCallbacks';
import { MY_CALLBACKS, APPROVE_CALLBACK, REJECT_CALLBACK } from '@/lib/graphql/callbacks';
import { createMockCallback } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useCallbacks', () => {
  const cb1 = createMockCallback({ id: 'cb-1', status: 'PENDING' });
  const cb2 = createMockCallback({ id: 'cb-2', status: 'APPROVED' });

  const defaultMock: MockedResponse = {
    request: {
      query: MY_CALLBACKS,
      variables: { status: null, limit: 20, offset: 0 },
    },
    result: {
      data: {
        myCallbackRequests: {
          nodes: [cb1, cb2],
          totalCount: 2,
        },
      },
    },
  };

  it('fetches callbacks', async () => {
    const { result } = renderHook(() => useCallbacks(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.callbacks).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });

  it('handles loading state', async () => {
    const { result } = renderHook(() => useCallbacks(), {
      wrapper: createWrapper([defaultMock]),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('filters by status', async () => {
    const filteredMock: MockedResponse = {
      request: {
        query: MY_CALLBACKS,
        variables: { status: 'PENDING', limit: 20, offset: 0 },
      },
      result: {
        data: {
          myCallbackRequests: { nodes: [cb1], totalCount: 1 },
        },
      },
    };

    const { result } = renderHook(() => useCallbacks({ status: 'PENDING' }), {
      wrapper: createWrapper([filteredMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.callbacks).toHaveLength(1);
  });

  it('approve fires mutation with correct variables', async () => {
    let mutationCalled = false;
    const approveMock: MockedResponse = {
      request: {
        query: APPROVE_CALLBACK,
        variables: {
          input: {
            callbackRequestId: 'cb-1',
            approvedSlotStart: '2025-01-01T09:00:00Z',
            approvedSlotEnd: '2025-01-01T10:00:00Z',
          },
        },
      },
      result: () => {
        mutationCalled = true;
        return {
          data: {
            approveCallbackRequest: { ...cb1, status: 'APPROVED' },
          },
        };
      },
    };

    const { result } = renderHook(() => useCallbacks(), {
      wrapper: createWrapper([defaultMock, approveMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.approve({
        callbackRequestId: 'cb-1',
        approvedSlotStart: '2025-01-01T09:00:00Z',
        approvedSlotEnd: '2025-01-01T10:00:00Z',
      });
    });

    expect(mutationCalled).toBe(true);
  });

  it('reject fires mutation with reason', async () => {
    let mutationCalled = false;
    const rejectMock: MockedResponse = {
      request: {
        query: REJECT_CALLBACK,
        variables: {
          input: {
            callbackRequestId: 'cb-1',
            reason: 'Not available',
          },
        },
      },
      result: () => {
        mutationCalled = true;
        return {
          data: {
            rejectCallbackRequest: { ...cb1, status: 'REJECTED' },
          },
        };
      },
    };

    const { result } = renderHook(() => useCallbacks(), {
      wrapper: createWrapper([defaultMock, rejectMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.reject({
        callbackRequestId: 'cb-1',
        reason: 'Not available',
      });
    });

    expect(mutationCalled).toBe(true);
  });

  it('handles query error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: MY_CALLBACKS,
        variables: { status: null, limit: 20, offset: 0 },
      },
      error: new Error('Network error'),
    };

    const { result } = renderHook(() => useCallbacks(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
