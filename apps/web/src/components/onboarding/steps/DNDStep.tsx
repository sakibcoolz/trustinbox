'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_DND_RULE } from '@/lib/graphql/settings';

interface DNDStepProps {
  onNext: () => void;
  onSkip: () => void;
  onConfigured: () => void;
}

const PRESETS = [
  { label: 'Overnight (10 PM – 8 AM)', start: '22:00', end: '08:00', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekday Evenings (6 PM – 9 AM)', start: '18:00', end: '09:00', days: [1, 2, 3, 4, 5] },
] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DNDStep({ onNext, onSkip, onConfigured }: DNDStepProps) {
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('08:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);
  const [createDND] = useMutation(CREATE_DND_RULE);

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
      await createDND({
        variables: {
          input: {
            scopeType: 'ALL',
            startTime,
            endTime,
            daysOfWeek: days,
            isActive: true,
          },
        },
      });
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
      <h2 className="text-lg font-bold text-text-primary mb-1">Set Quiet Hours</h2>
      <p className="text-sm text-text-secondary mb-5">Block notifications during specific times.</p>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p)} className="text-2xs px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            {p.label}
          </button>
        ))}
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
