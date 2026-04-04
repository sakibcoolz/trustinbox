'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAvailabilitySlots } from '@/hooks/useAvailabilitySlots';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_TYPES = ['Callback', 'Meeting', 'Any'];

export default function AvailabilitySettingsPage() {
  const { slots, loading, error, createSlot, deleteSlot } = useAvailabilitySlots();
  const [showForm, setShowForm] = useState(false);
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotType, setSlotType] = useState('Callback');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = useCallback(async () => {
    setSubmitting(true);
    try {
      await createSlot({ dayOfWeek: day, startTime, endTime, slotType });
      setShowForm(false);
      setDay(1);
      setStartTime('09:00');
      setEndTime('17:00');
      setSlotType('Callback');
    } catch {
      // Error handled by Apollo
    } finally {
      setSubmitting(false);
    }
  }, [day, startTime, endTime, slotType, createSlot]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteSlot(id);
    } catch {
      // Error handled by Apollo
    }
  }, [deleteSlot]);

  const handleToggle = useCallback(async (id: string) => {
    const slot = slots.find((s: { id: string }) => s.id === id);
    if (!slot) return;
    try {
      await deleteSlot(id);
      await createSlot({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotType: slot.slotType,
      });
    } catch {
      // Error handled by Apollo
    }
  }, [slots, deleteSlot, createSlot]);

  const slotTypeColor = (type: string) => {
    if (type === 'Callback') return 'bg-accent-blue/10 text-accent-blue';
    if (type === 'Meeting') return 'bg-accent-purple/10 text-accent-purple';
    return 'bg-accent-green/10 text-accent-green';
  };

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary">Availability</h1>
              <p className="text-2xs text-text-muted">Define when service providers can reach you.</p>
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="card p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-4 bg-bg-tertiary rounded shrink-0" />
                  <div className="flex-1 h-9 bg-bg-tertiary rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load availability slots</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Availability</h1>
            <p className="text-2xs text-text-muted">Define when service providers can reach you.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add Slot</button>
        </div>

        {showForm && (
          <div className="card space-y-4 border-accent-green/30">
            <h3 className="text-sm font-semibold text-text-primary">New Availability Slot</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-2xs text-text-muted block mb-1">Day of Week</label>
                <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="input-field w-full">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-2xs text-text-muted block mb-1">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="text-2xs text-text-muted block mb-1">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field w-full" />
              </div>
              <div className="col-span-2">
                <label className="text-2xs text-text-muted block mb-1">Slot Type</label>
                <select value={slotType} onChange={(e) => setSlotType(e.target.value)} className="input-field w-full">
                  {SLOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={submitting} className="btn-primary text-sm">{submitting ? 'Adding…' : 'Add Slot'}</button>
            </div>
          </div>
        )}

        {/* Weekly calendar view */}
        <div className="space-y-2">
          {DAYS.map((dayName, dayIdx) => {
            const daySlots = slots.filter((s: any) => s.dayOfWeek === dayIdx);
            return (
              <div key={dayIdx} className="card p-3">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-text-primary shrink-0">{dayName}</span>
                  <div className="flex-1 flex flex-wrap gap-2 min-h-[36px] items-center">
                    {daySlots.length === 0 ? (
                      <span className="text-2xs text-text-muted">No availability</span>
                    ) : (
                      daySlots.map((slot: any) => (
                        <div key={slot.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs border transition-opacity ${slot.isActive ? 'border-border-secondary' : 'border-border-primary opacity-40'}`}>
                          <span className={`chip text-2xs ${slotTypeColor(slot.slotType)}`}>{slot.slotType}</span>
                          <span className="text-text-secondary font-medium">{slot.startTime} – {slot.endTime}</span>
                          <button onClick={() => handleToggle(slot.id)} className="text-text-muted hover:text-text-primary ml-1" title={slot.isActive ? 'Disable' : 'Enable'}>
                            {slot.isActive ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                            )}
                          </button>
                          <button onClick={() => handleDelete(slot.id)} className="text-text-muted hover:text-accent-red" title="Remove">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
