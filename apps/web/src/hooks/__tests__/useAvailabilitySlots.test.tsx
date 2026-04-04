/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { useAvailabilitySlots } from '@/hooks/useAvailabilitySlots';
import { MY_AVAILABILITY_SLOTS, CREATE_AVAILABILITY_SLOT, DELETE_AVAILABILITY_SLOT } from '@/lib/graphql/settings';
import { createMockAvailabilitySlot } from '@/__tests__/helpers';

function createWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe('useAvailabilitySlots', () => {
  const slot1 = createMockAvailabilitySlot({ id: 'slot-1', dayOfWeek: 'MON' });
  const slot2 = createMockAvailabilitySlot({ id: 'slot-2', dayOfWeek: 'WED' });

  const defaultMock: MockedResponse = {
    request: { query: MY_AVAILABILITY_SLOTS },
    result: {
      data: {
        myAvailabilitySlots: [slot1, slot2],
      },
    },
  };

  it('fetches availability slots', async () => {
    const { result } = renderHook(() => useAvailabilitySlots(), {
      wrapper: createWrapper([defaultMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.slots).toHaveLength(2);
    expect(result.current.slots[0].dayOfWeek).toBe('MON');
  });

  it('creates a new slot', async () => {
    let mutationCalled = false;
    const newSlot = createMockAvailabilitySlot({ id: 'slot-3', dayOfWeek: 'FRI' });

    const createMock: MockedResponse = {
      request: {
        query: CREATE_AVAILABILITY_SLOT,
        variables: {
          input: {
            dayOfWeek: 'FRI',
            startTime: '09:00',
            endTime: '17:00',
            slotType: 'CALLBACK',
          },
        },
      },
      result: () => {
        mutationCalled = true;
        return { data: { createAvailabilitySlot: newSlot } };
      },
    };

    const { result } = renderHook(() => useAvailabilitySlots(), {
      wrapper: createWrapper([defaultMock, createMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.createSlot({
        dayOfWeek: 'FRI',
        startTime: '09:00',
        endTime: '17:00',
        slotType: 'CALLBACK',
      });
    });

    expect(mutationCalled).toBe(true);
  });

  it('deletes a slot', async () => {
    let mutationCalled = false;
    const deleteMock: MockedResponse = {
      request: {
        query: DELETE_AVAILABILITY_SLOT,
        variables: { id: 'slot-1' },
      },
      result: () => {
        mutationCalled = true;
        return { data: { deleteAvailabilitySlot: true } };
      },
    };

    const { result } = renderHook(() => useAvailabilitySlots(), {
      wrapper: createWrapper([defaultMock, deleteMock]),
    });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    await act(async () => {
      await result.current.deleteSlot('slot-1');
    });

    expect(mutationCalled).toBe(true);
  });

  it('handles error', async () => {
    const errorMock: MockedResponse = {
      request: { query: MY_AVAILABILITY_SLOTS },
      error: new Error('Fetch failed'),
    };

    const { result } = renderHook(() => useAvailabilitySlots(), {
      wrapper: createWrapper([errorMock]),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
