import '@/app/globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LayoutShell } from '@/components/LayoutShell';
import { ApolloWrapper } from '@/lib/apollo-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
  themeColor: '#0b0d0f',
  openGraph: {
    title: 'TrustInbox Provider Portal',
    description: 'Service Provider dashboard for TrustInbox',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`} suppressHydrationWarning>
        <ApolloWrapper>
          <AuthProvider>
            <ToastProvider>
              <LayoutShell>{children}</LayoutShell>
            </ToastProvider>
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
