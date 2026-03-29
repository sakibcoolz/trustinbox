'use client';

import { useState } from 'react';
import Link from 'next/link';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-accent-blue' : 'bg-bg-tertiary'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function PrivacySettingsPage() {
  const [ads, setAds] = useState(false);
  const [callbackApproval, setCallbackApproval] = useState(true);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Privacy</h1>
            <p className="text-2xs text-text-muted">Control what service providers can see about you.</p>
          </div>
        </div>

        <div className="card space-y-0 divide-y divide-border-primary">
          <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div><p className="text-sm font-medium text-text-primary">Show Phone Number</p><p className="text-2xs text-text-muted mt-0.5">Never reveal your actual number to service providers.</p></div>
            <span className="chip-red text-2xs">Always Hidden</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <div><p className="text-sm font-medium text-text-primary">Allow Advertisements</p><p className="text-2xs text-text-muted mt-0.5">Receive promotional content from verified service providers.</p></div>
            <Toggle on={ads} onToggle={() => setAds(!ads)} />
          </div>
          <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div><p className="text-sm font-medium text-text-primary">Require Callback Approval</p><p className="text-2xs text-text-muted mt-0.5">Service providers must request approval before calling you.</p></div>
            <Toggle on={callbackApproval} onToggle={() => setCallbackApproval(!callbackApproval)} />
          </div>
        </div>
      </div>
    </div>
  );
}
