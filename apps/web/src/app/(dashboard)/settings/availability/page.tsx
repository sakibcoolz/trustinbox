import Link from 'next/link';

export default function AvailabilitySettingsPage() {
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
          <button className="btn-primary text-sm">Add Slot</button>
        </div>
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-green/10 flex items-center justify-center text-2xl mb-3">🕐</div>
          <p className="text-sm text-text-secondary">No availability slots</p>
          <p className="text-2xs text-text-muted mt-1">Add time slots when you&apos;re available for callbacks.</p>
        </div>
      </div>
    </div>
  );
}
