'use client';

import { useState, useCallback } from 'react';
import { WelcomeStep } from './steps/WelcomeStep';
import { PrivacyStep } from './steps/PrivacyStep';
import { DNDStep } from './steps/DNDStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { CompleteStep } from './steps/CompleteStep';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'dnd', label: 'Quiet Hours' },
  { id: 'availability', label: 'Availability' },
  { id: 'complete', label: 'Done' },
] as const;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    privacySet: false,
    dndSet: false,
    availabilitySet: false,
  });

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('trustinbox:onboarding-complete', 'true');
    onComplete();
  }, [onComplete]);

  const handleSkipAll = useCallback(() => {
    localStorage.setItem('trustinbox:onboarding-complete', 'true');
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-lg mx-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-accent-blue' :
                i < step ? 'w-2 bg-accent-blue/50' : 'w-2 bg-bg-tertiary'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="card shadow-elevated">
          {step === 0 && <WelcomeStep onNext={handleNext} />}
          {step === 1 && (
            <PrivacyStep
              onNext={handleNext}
              onSkip={handleNext}
              onConfigured={() => setConfig((c) => ({ ...c, privacySet: true }))}
            />
          )}
          {step === 2 && (
            <DNDStep
              onNext={handleNext}
              onSkip={handleNext}
              onConfigured={() => setConfig((c) => ({ ...c, dndSet: true }))}
            />
          )}
          {step === 3 && (
            <AvailabilityStep
              onNext={handleNext}
              onSkip={handleNext}
              onConfigured={() => setConfig((c) => ({ ...c, availabilitySet: true }))}
            />
          )}
          {step === 4 && <CompleteStep config={config} onComplete={handleComplete} />}

          {/* Navigation */}
          {step > 0 && step < 4 && (
            <div className="flex items-center justify-between px-6 pb-6">
              <button onClick={handleBack} className="btn-ghost text-sm">Back</button>
              <button onClick={handleSkipAll} className="text-xs text-text-muted hover:text-text-secondary">Skip setup</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
