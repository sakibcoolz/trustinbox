'use client';

interface CompleteStepProps {
  config: { privacySet: boolean; dndSet: boolean; availabilitySet: boolean };
  onComplete: () => void;
}

export function CompleteStep({ config, onComplete }: CompleteStepProps) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">You&apos;re All Set!</h2>
      <p className="text-sm text-text-secondary mb-5">
        Your TrustInbox is configured and ready to use.
      </p>

      <div className="space-y-2 mb-6 text-left">
        <SummaryRow label="Privacy preferences" done={config.privacySet} />
        <SummaryRow label="Quiet hours (DND)" done={config.dndSet} />
        <SummaryRow label="Availability slots" done={config.availabilitySet} />
      </div>

      <button onClick={onComplete} className="btn-primary w-full">
        Go to Dashboard
      </button>
    </div>
  );
}

function SummaryRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-bg-tertiary">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-accent-green/10 text-accent-green' : 'bg-bg-hover text-text-muted'}`}>
        {done ? '✓' : '–'}
      </span>
      <span className="text-sm text-text-primary">{label}</span>
      <span className={`text-2xs ml-auto ${done ? 'text-accent-green' : 'text-text-muted'}`}>
        {done ? 'Configured' : 'Using defaults'}
      </span>
    </div>
  );
}
