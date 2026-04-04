/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useNotificationsGql } from '@/hooks/useNotificationsGql';
import {
  MY_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  ARCHIVE_NOTIFICATION,
  MARK_ALL_NOTIFICATIONS_READ,
} from '@/lib/graphql/notifications';
import { createMockNotification } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useNotificationsGql', () => {
  const notif1 = createMockNotification({ id: 'n1', title: 'Notif 1' });
  const notif2 = createMockNotification({ id: 'n2', title: 'Notif 2', read: true });

  const defaultMock: MockedResponse = {
    request: {
      query: MY_NOTIFICATIONS,
      variables: { category: null, status: null, limit: 20, offset: 0 },
    },
    result: {
      data: {
        myNotifications: {
          nodes: [notif1, notif2],
          totalCount: 2,
        },
      },
    },
  };

  it('fetches notifications and returns them', async () => {
    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([defaultMock]),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.notifications[0].title).toBe('Notif 1');
  });

  it('handles loading state correctly', async () => {
    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([defaultMock]),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.notifications).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: MY_NOTIFICATIONS,
        variables: { category: null, status: null, limit: 20, offset: 0 },
      },
      error: new Error('Network error'),
    };

    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('passes category filter as variable', async () => {
    const filteredMock: MockedResponse = {
      request: {
        query: MY_NOTIFICATIONS,
        variables: { limit: 20, offset: 0, category: 'PERSONAL', status: null },
      },
      result: {
        data: {
          myNotifications: { nodes: [notif1], totalCount: 1 },
        },
      },
    };

    const { result } = renderHook(
      () => useNotificationsGql({ category: 'PERSONAL' }),
      { wrapper: createWrapper([filteredMock]) },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('markRead fires mutation', async () => {
    let mutationCalled = false;
    const markReadMock: MockedResponse = {
      request: {
        query: MARK_NOTIFICATION_READ,
        variables: { id: 'n1' },
      },
      result: () => {
        mutationCalled = true;
        return { data: { markNotificationAsRead: true } };
      },
    };

    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([defaultMock, markReadMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(mutationCalled).toBe(true);
  });

  it('archive fires mutation', async () => {
    let mutationCalled = false;
    const archiveMock: MockedResponse = {
      request: {
        query: ARCHIVE_NOTIFICATION,
        variables: { id: 'n1' },
      },
      result: () => {
        mutationCalled = true;
        return { data: { archiveNotification: true } };
      },
    };

    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([defaultMock, archiveMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.archive('n1');
    });

    expect(mutationCalled).toBe(true);
  });

  it('markAllRead fires mutation', async () => {
    let mutationCalled = false;
    const markAllMock: MockedResponse = {
      request: { query: MARK_ALL_NOTIFICATIONS_READ },
      result: () => {
        mutationCalled = true;
        return { data: { markAllNotificationsRead: true } };
      },
    };

    const { result } = renderHook(() => useNotificationsGql(), {
      wrapper: createWrapper([defaultMock, markAllMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mutationCalled).toBe(true);
  });
});
