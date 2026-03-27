'use client';

import { AuthProvider } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { ToastContainer } from '@/components/ui/toast-container';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}
