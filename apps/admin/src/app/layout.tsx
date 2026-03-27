import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustInbox Admin',
  description: 'TrustInbox platform administration portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
