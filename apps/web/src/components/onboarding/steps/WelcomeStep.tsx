'use client';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Welcome to TrustInbox</h2>
      <p className="text-sm text-text-secondary mb-6">
        Take control of your communications. You decide when and how service providers can contact you.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-bg-tertiary">
          <span className="text-lg">🔒</span>
          <p className="text-2xs text-text-secondary mt-1">Privacy-first</p>
        </div>
        <div className="p-3 rounded-xl bg-bg-tertiary">
          <span className="text-lg">📋</span>
          <p className="text-2xs text-text-secondary mt-1">Smart filtering</p>
        </div>
        <div className="p-3 rounded-xl bg-bg-tertiary">
          <span className="text-lg">📞</span>
          <p className="text-2xs text-text-secondary mt-1">Call scheduling</p>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Get Started
      </button>
    </div>
  );
}
