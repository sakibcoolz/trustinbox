'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface DNDRule {
  id: string;
  scopeType: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mockRules: DNDRule[] = [
  { id: '1', scopeType: 'GLOBAL', startTime: '22:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true },
  { id: '2', scopeType: 'GLOBAL', startTime: '09:00', endTime: '17:00', daysOfWeek: [0, 6], isActive: false },
];

export default function DNDSettingsPage() {
  const [rules, setRules] = useState<DNDRule[]>(mockRules);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('07:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = useCallback((d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }, []);

  const handleSave = useCallback(() => {
    if (editId) {
      setRules((prev) => prev.map((r) => r.id === editId ? { ...r, startTime, endTime, daysOfWeek: days } : r));
    } else {
      setRules((prev) => [...prev, { id: Date.now().toString(), scopeType: 'GLOBAL', startTime, endTime, daysOfWeek: days, isActive: true }]);
    }
    setShowForm(false);
    setEditId(null);
    setStartTime('22:00');
    setEndTime('07:00');
    setDays([0, 1, 2, 3, 4, 5, 6]);
  }, [editId, startTime, endTime, days]);

  const handleEdit = useCallback((rule: DNDRule) => {
    setEditId(rule.id);
    setStartTime(rule.startTime);
    setEndTime(rule.endTime);
    setDays(rule.daysOfWeek);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleToggleActive = useCallback((id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Do Not Disturb</h1>
            <p className="text-2xs text-text-muted">Set schedules when notifications are silenced.</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); }} className="btn-primary text-sm">Add Rule</button>
        </div>

        {showForm && (
          <div className="card space-y-4 border-accent-blue/30">
            <h3 className="text-sm font-semibold text-text-primary">{editId ? 'Edit Rule' : 'New DND Rule'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-text-muted block mb-1">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="text-2xs text-text-muted block mb-1">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field w-full" />
              </div>
            </div>
            <div>
              <label className="text-2xs text-text-muted block mb-2">Active Days</label>
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => toggleDay(i)}
                    className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${days.includes(i) ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-sm">{editId ? 'Update' : 'Create'} Rule</button>
            </div>
          </div>
        )}

        {rules.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-2xl mb-3">🌙</div>
            <p className="text-sm text-text-secondary">No DND rules yet</p>
            <p className="text-2xs text-text-muted mt-1">Add a rule to set quiet hours and silence notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="card flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${rule.isActive ? 'bg-accent-purple/10' : 'bg-bg-tertiary'}`}>🌙</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{rule.startTime} – {rule.endTime}</p>
                    <span className={`chip text-2xs ${rule.isActive ? 'chip-green' : 'chip-default'}`}>{rule.isActive ? 'Active' : 'Paused'}</span>
                  </div>
                  <p className="text-2xs text-text-muted mt-0.5">{rule.daysOfWeek.map((d) => DAYS[d]).join(', ')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleActive(rule.id)} className="btn-icon" title={rule.isActive ? 'Pause' : 'Activate'}>
                    {rule.isActive ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                    )}
                  </button>
                  <button onClick={() => handleEdit(rule)} className="btn-icon" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="btn-icon text-accent-red" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
