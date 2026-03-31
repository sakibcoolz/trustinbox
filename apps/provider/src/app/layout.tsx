import '@/app/globals.css';
import { Inter } from 'next/font/google';
import SidebarWrapper from '@/components/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`} suppressHydrationWarning>
        <div className="flex h-screen">
          <SidebarWrapper />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
