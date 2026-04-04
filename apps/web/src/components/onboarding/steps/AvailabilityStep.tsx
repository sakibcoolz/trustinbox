'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_AVAILABILITY_SLOT } from '@/lib/graphql/settings';

interface AvailabilityStepProps {
  onNext: () => void;
  onSkip: () => void;
  onConfigured: () => void;
}

const PRESETS = [
  { label: 'Weekday Business (9 AM – 5 PM)', start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
  { label: 'Flexible (10 AM – 8 PM)', start: '10:00', end: '20:00', days: [1, 2, 3, 4, 5, 6] },
] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailabilityStep({ onNext, onSkip, onConfigured }: AvailabilityStepProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [slotType, setSlotType] = useState('CALLBACK');
  const [saving, setSaving] = useState(false);
  const [createSlot] = useMutation(CREATE_AVAILABILITY_SLOT);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setDays([...preset.days]);
  };

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    if (days.length === 0) { onNext(); return; }
    setSaving(true);
    try {
      // Create a slot for each selected day
      await Promise.all(
        days.map((day) =>
          createSlot({
            variables: {
              input: {
                dayOfWeek: day,
                startTime,
                endTime,
                slotType,
                isActive: true,
              },
            },
          })
        )
      );
      onConfigured();
      onNext();
    } catch {
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-text-primary mb-1">Set Your Availability</h2>
      <p className="text-sm text-text-secondary mb-5">Let service providers know when you&apos;re available for callbacks.</p>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p)} className="text-2xs px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-2xs text-text-muted block mb-1.5">Type</label>
        <div className="flex gap-2">
          {['CALLBACK', 'MEETING'].map((t) => (
            <button
              key={t}
              onClick={() => setSlotType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                slotType === t ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'CALLBACK' ? 'Callback' : 'Meeting'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => toggleDay(i)}
            className={`w-9 h-9 rounded-lg text-2xs font-medium transition-colors ${
              days.includes(i) ? 'bg-accent-blue text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label className="text-2xs text-text-muted block mb-1">Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field w-full" />
        </div>
        <div>
          <label className="text-2xs text-text-muted block mb-1">End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field w-full" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onSkip} className="btn-ghost flex-1 text-sm">Skip</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
