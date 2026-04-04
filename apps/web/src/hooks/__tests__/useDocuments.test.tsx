/// <reference types="vitest/globals" />
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useDocuments } from '@/hooks/useDocuments';
import { MY_DOCUMENTS } from '@/lib/graphql/documents';
import { createMockDocument } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useDocuments', () => {
  const doc1 = createMockDocument({ id: 'doc-1', name: 'Report.pdf' });
  const doc2 = createMockDocument({ id: 'doc-2', name: 'Invoice.pdf', fileSize: 2048000 });

  const defaultMock: MockedResponse = {
    request: {
      query: MY_DOCUMENTS,
      variables: { limit: 20, offset: 0, serviceProviderId: null, classification: null },
    },
    result: {
      data: {
        myDocuments: {
          nodes: [doc1, doc2],
          totalCount: 2,
        },
      },
    },
  };

  it('fetches documents with pagination', async () => {
    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.documents).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.documents[0].name).toBe('Report.pdf');
  });

  it('handles loading state', async () => {
    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper([defaultMock]),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => { expect(result.current.loading).toBe(false); });
  });

  it('handles error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: MY_DOCUMENTS,
        variables: { limit: 20, offset: 0, serviceProviderId: null, classification: null },
      },
      error: new Error('Network error'),
    };

    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('passes custom limit/offset', async () => {
    const customMock: MockedResponse = {
      request: {
        query: MY_DOCUMENTS,
        variables: { limit: 10, offset: 5, serviceProviderId: null, classification: null },
      },
      result: {
        data: {
          myDocuments: { nodes: [doc1], totalCount: 6 },
        },
      },
    };

    const { result } = renderHook(() => useDocuments({ limit: 10, offset: 5 }), {
      wrapper: createWrapper([customMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.documents).toHaveLength(1);
    expect(result.current.totalCount).toBe(6);
  });
});
