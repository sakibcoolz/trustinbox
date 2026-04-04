# Task 4.9 — New User Onboarding Flow

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.9 — New User Onboarding Flow
> **Files**: `apps/web/src/components/onboarding/OnboardingWizard.tsx` (new), `apps/web/src/components/onboarding/steps/` (new), `apps/web/src/app/(dashboard)/layout.tsx`
> **Dependencies**: Phase 3E (Privacy wired), Phase 3F (DND wired), Phase 3G (Availability wired)
> **Trigger**: First login — check `localStorage.getItem('trustinbox:onboarding-complete')`

---

## Objective

Create a multi-step onboarding wizard that guides new users through initial setup: welcome overview, privacy preferences, DND rules, and availability slots. The wizard appears after the first successful login and walks users through essential configuration steps with skip-able individual steps and a progress indicator.

---

## Current State

### No Onboarding Component
```
❌ apps/web/src/components/onboarding/ — directory does NOT exist
❌ No onboarding wizard, no step components, no progress tracking
❌ No localStorage flag for onboarding completion
```

### Dashboard Layout — Where Wizard Would Mount
```typescript
// apps/web/src/app/(dashboard)/layout.tsx
// Auth check: redirects to /auth/login if not authenticated
// Renders: Sidebar + Header + Content + MobileNav
// No onboarding overlay or conditional rendering
```

### Providers — No Onboarding Context
```typescript
// apps/web/src/components/providers.tsx
// Wraps: AuthProvider → NotificationProvider → ToastContainer
// No onboarding state provider
```

### Existing Preference Pages (for content reference)
```
✅ settings/privacy/page.tsx — 7 toggle preferences (partial real API)
✅ settings/dnd/page.tsx — DND rule creation with day/time selection
✅ settings/availability/page.tsx — Availability slot creation with type/day/time
```

---

## Requirements

### 4.9.1 — Create Onboarding Wizard Shell
- [x] Create `apps/web/src/components/onboarding/OnboardingWizard.tsx`:
  - [x] Full-screen overlay on top of the dashboard (z-50)
  - [x] Step progress indicator (dots or numbered bar)
  - [x] Back / Next / Skip navigation buttons
  - [x] Step content area with smooth transitions
  - [x] "Don't show again" or "Skip all" option
  - [x] On completion → set `localStorage.setItem('trustinbox:onboarding-complete', 'true')`
  - [x] Fade-in animation on mount, fade-out on completion

### 4.9.2 — Step 1: Welcome
- [x] Create `apps/web/src/components/onboarding/steps/WelcomeStep.tsx`:
  - [x] TrustInbox logo and brand name
  - [x] Welcome message: "Welcome to TrustInbox"
  - [x] Brief overview: "Take control of your communications. TrustInbox puts you in charge of when and how service providers can contact you."
  - [x] Feature highlights (3 cards or icons):
    - Privacy-first: Control who can reach you
    - Smart filtering: Organize by category
    - Callback scheduling: Accept calls on your terms
  - [x] "Get Started" button → next step

### 4.9.3 — Step 2: Privacy Preferences
- [x] Create `apps/web/src/components/onboarding/steps/PrivacyStep.tsx`:
  - [x] Header: "Set Your Privacy Preferences"
  - [x] Description: "Choose which types of communications you want to receive"
  - [x] Three category toggles:
    - Personal: messages from friends and contacts (default: ON)
    - Service Provider: updates from organizations you work with (default: ON)
    - Advertisements: promotional content from service providers (default: OFF)
  - [x] Save preferences via `updateMyPrivacyPreferences` mutation (or batch on wizard completion)
  - [x] Skip option: uses defaults

### 4.9.4 — Step 3: Do Not Disturb
- [x] Create `apps/web/src/components/onboarding/steps/DNDStep.tsx`:
  - [x] Header: "Set Quiet Hours"
  - [x] Description: "Block notifications during specific times"
  - [x] Quick preset buttons:
    - "Overnight (10 PM – 8 AM)" → pre-fills time range
    - "Weekday Evenings (6 PM – 9 AM)" → pre-fills time range
    - "Custom" → shows time picker
  - [x] Day selector: checkboxes for Mon–Sun
  - [x] Time range: start time → end time
  - [x] Create DND rule via `createDNDRule` mutation (or batch on wizard completion)
  - [x] Skip option: no DND rule created

### 4.9.5 — Step 4: Availability
- [x] Create `apps/web/src/components/onboarding/steps/AvailabilityStep.tsx`:
  - [x] Header: "Set Your Availability"
  - [x] Description: "Let service providers know when you're available for callbacks"
  - [x] Quick preset buttons:
    - "Weekday Business Hours (9 AM – 5 PM)" → pre-fills
    - "Flexible (10 AM – 8 PM)" → pre-fills
    - "Custom" → shows time/day picker
  - [x] Type selector: Callback, Meeting
  - [x] Day selector: checkboxes for Mon–Sun
  - [x] Time range: start time → end time
  - [x] Create availability slot via `createAvailabilitySlot` mutation (or batch on wizard completion)
  - [x] Skip option: no slot created

### 4.9.6 — Step 5: Complete
- [x] Create `apps/web/src/components/onboarding/steps/CompleteStep.tsx`:
  - [x] Header: "You're All Set!"
  - [x] Summary of what was configured:
    - Privacy: "Category preferences updated" or "Using defaults"
    - DND: "Overnight quiet hours enabled" or "No rules set"
    - Availability: "Business hours availability set" or "No slots set"
  - [x] "Go to Dashboard" button → closes wizard
  - [x] Confetti or checkmark animation (subtle)

### 4.9.7 — Wire Wizard to Dashboard Layout
- [x] Update `apps/web/src/app/(dashboard)/layout.tsx`:
  - [x] Check `localStorage.getItem('trustinbox:onboarding-complete')`
  - [x] If NOT complete → render `<OnboardingWizard />` overlay on top of dashboard
  - [x] On wizard completion → set flag, hide wizard, show dashboard
  - [x] Use `useState` + `useEffect` to avoid SSR mismatch

---

## Implementation Details

### Onboarding Wizard Shell

```tsx
// apps/web/src/components/onboarding/OnboardingWizard.tsx
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
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-accent-blue' :
                i < step ? 'bg-accent-blue/50' : 'bg-bg-tertiary'
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
              <button onClick={handleBack} className="btn-ghost text-sm">
                Back
              </button>
              <button onClick={handleSkipAll} className="text-xs text-text-muted hover:text-text-secondary">
                Skip setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Welcome Step

```tsx
// apps/web/src/components/onboarding/steps/WelcomeStep.tsx
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

      {/* Feature highlights */}
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
```

### Dashboard Layout Integration

```tsx
// apps/web/src/app/(dashboard)/layout.tsx — add onboarding check
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('trustinbox:onboarding-complete');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  return (
    <ChatProvider>
      <div className="flex h-screen bg-bg-primary overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <div className="flex flex-1 min-w-0 overflow-hidden pb-16 sm:pb-0">{children}</div>
        </div>
      </div>
      <MobileNav />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </ChatProvider>
  );
}
```

---

## Verification

- [x] First-time login → onboarding wizard appears as full-screen overlay
- [x] Progress dots reflect current step
- [x] Step 1 (Welcome): shows logo, features, "Get Started" button
- [x] Step 2 (Privacy): category toggles work, "Next" saves preferences, "Skip" moves on
- [x] Step 3 (DND): preset buttons pre-fill time/day, "Next" creates rule, "Skip" moves on
- [x] Step 4 (Availability): preset buttons pre-fill, "Next" creates slot, "Skip" moves on
- [x] Step 5 (Complete): shows configuration summary, "Go to Dashboard" closes wizard
- [x] "Skip setup" on any step → closes wizard, marks complete
- [x] Back button navigates to previous step
- [x] `localStorage.getItem('trustinbox:onboarding-complete')` is `'true'` after completion
- [x] Subsequent logins → wizard does NOT appear
- [x] If saved preferences/rules actually exist in backend after wizard completion
- [x] Wizard looks good on mobile (full-width card, smaller padding)
- [x] No flash of dashboard content before wizard appears (useEffect + conditional render)
