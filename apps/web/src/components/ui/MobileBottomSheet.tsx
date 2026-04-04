'use client';

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileBottomSheet({ open, onClose, children }: MobileBottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border-primary rounded-t-2xl animate-slide-up max-h-[70vh] overflow-y-auto mobile-safe-bottom">
        <div className="w-10 h-1 rounded-full bg-border-secondary mx-auto mt-2 mb-4" />
        <div className="px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
