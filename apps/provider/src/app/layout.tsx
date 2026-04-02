import '@/app/globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LayoutShell } from '@/components/LayoutShell';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { LiveRegionProvider } from '@/components/LiveRegion';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
  openGraph: {
    title: 'TrustInbox Provider Portal',
    description: 'Service Provider dashboard for TrustInbox',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark' as const,
  themeColor: '#0b0d0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`} suppressHydrationWarning>
          <AuthProvider>
            <ToastProvider>
              <LiveRegionProvider>
                <LayoutShell>{children}</LayoutShell>
              </LiveRegionProvider>
            </ToastProvider>
          </AuthProvider>
      </body>
    </html>
  );
}
