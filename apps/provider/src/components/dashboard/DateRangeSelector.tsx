'use client';

import { computeDateRange, type DateRange } from '@/hooks/useDateRange';

const PRESETS: { label: string; value: DateRange['preset'] }[] = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

export function DateRangeSelector({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className="flex items-center gap-1 bg-bg-hover rounded-lg p-0.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(computeDateRange(preset.value))}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value.preset === preset.value
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
