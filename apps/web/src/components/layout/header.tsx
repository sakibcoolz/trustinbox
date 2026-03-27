'use client';

export function Header() {
  return (
    <header className="h-12 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search notifications, organizations..."
          className="input-field w-80 text-sm h-8"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative text-text-secondary hover:text-text-primary transition-colors" aria-label="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            3
          </span>
        </button>
      </div>
    </header>
  );
}
