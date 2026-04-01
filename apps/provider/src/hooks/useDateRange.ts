'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export interface DateRange {
  preset: 'today' | '7d' | '30d' | '90d' | 'custom';
  from: Date;
  to: Date;
}

export function computeDateRange(preset: string): DateRange {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
  }
  return { preset: preset as DateRange['preset'], from, to };
}

export function useDateRange() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [range, setRange] = useState<DateRange>(() => {
    const preset = searchParams.get('range') || '30d';
    return computeDateRange(preset);
  });

  const updateRange = useCallback(
    (newRange: DateRange) => {
      setRange(newRange);
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', newRange.preset);
      router.replace(`?${params}`, { scroll: false });
    },
    [searchParams, router],
  );

  return { range, updateRange };
}
