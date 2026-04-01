'use client';

import { CheckCircle2, XCircle, Lock, Clock, Sun, Moon } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { PrivacyPreference, DNDRule, AvailabilitySlot } from '@/lib/graphql/customers';

// ─── Days ───────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isCurrentlyInDND(rules: DNDRule[]): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return rules.some(
    (rule) =>
      rule.isActive &&
      rule.daysOfWeek.includes(currentDay) &&
      currentTime >= rule.startTime &&
      currentTime <= rule.endTime,
  );
}

// ─── Privacy Preference Card ────────────────────────────

interface PrivacyStatusProps {
  preference: PrivacyPreference;
  dndRules: DNDRule[];
  availabilitySlots: AvailabilitySlot[];
}

const PREFERENCE_ROWS: { key: keyof PrivacyPreference; label: string; isLock?: boolean }[] = [
  { key: 'allowPersonalNotifications', label: 'Personal Notifications' },
  { key: 'allowSPNotifications', label: 'SP Notifications' },
  { key: 'allowAdvertisements', label: 'Advertisements' },
  { key: 'allowCallbackRequests', label: 'Callback Requests' },
  { key: 'allowChat', label: 'Chat' },
  { key: 'allowDocumentShares', label: 'Document Shares' },
  { key: 'requireCallApproval', label: 'Require Call Approval', isLock: true },
];

export function PrivacyStatusDisplay({ preference, dndRules, availabilitySlots }: PrivacyStatusProps) {
  const inDND = isCurrentlyInDND(dndRules);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preferences */}
      <Card>
        <CardHeader title="Privacy Preferences" />
        <CardContent>
          <div className="space-y-3">
            {PREFERENCE_ROWS.map(({ key, label, isLock }) => {
              const value = preference[key];
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{label}</span>
                  {isLock ? (
                    value ? (
                      <span className="flex items-center gap-1 text-xs text-accent-orange">
                        <Lock size={13} /> Required
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-status-success">
                        <CheckCircle2 size={13} /> Not required
                      </span>
                    )
                  ) : value ? (
                    <span className="flex items-center gap-1 text-xs text-status-success">
                      <CheckCircle2 size={13} /> Allowed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-status-error">
                      <XCircle size={13} /> Blocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* DND Rules + Availability */}
      <div className="space-y-6">
        {/* DND */}
        <Card>
          <CardHeader
            title="Do Not Disturb"
            action={
              inDND ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-accent-orange/10 text-accent-orange rounded-full">
                  <Moon size={11} /> Currently in DND
                </span>
              ) : undefined
            }
          />
          <CardContent>
            {dndRules.length === 0 ? (
              <p className="text-sm text-text-muted">No DND rules configured</p>
            ) : (
              <div className="space-y-3">
                {dndRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between px-3 py-2 bg-bg-hover rounded-lg"
                  >
                    <div>
                      <div className="flex gap-1 mb-1">
                        {rule.daysOfWeek.map((d) => (
                          <span
                            key={d}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted"
                          >
                            {DAY_LABELS[d]}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-text-secondary">
                        <Clock size={11} className="inline mr-1" />
                        {rule.startTime} – {rule.endTime}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        rule.isActive
                          ? 'bg-status-success/10 text-status-success'
                          : 'bg-bg-tertiary text-text-muted'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader title="Preferred Contact Times" />
          <CardContent>
            {availabilitySlots.length === 0 ? (
              <p className="text-sm text-text-muted">No preferred times set</p>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {DAY_LABELS.map((label, dayIdx) => {
                  const slots = availabilitySlots.filter((s) => s.dayOfWeek === dayIdx);
                  return (
                    <div key={dayIdx} className="text-center">
                      <span className="text-[10px] text-text-muted block mb-1">{label}</span>
                      {slots.length > 0 ? (
                        slots.map((slot, i) => (
                          <div
                            key={i}
                            className="text-[9px] px-1 py-0.5 bg-accent-blue/10 text-accent-blue rounded mb-0.5"
                          >
                            {slot.startTime}–{slot.endTime}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-text-muted">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
