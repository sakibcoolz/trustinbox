import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustInbox',
  description: 'Privacy-first customer communication platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('trustinbox:theme');var d=document.documentElement;if(t==='light'){d.classList.add('light');d.classList.remove('dark')}else if(t==='dark'||!t){d.classList.add('dark');d.classList.remove('light')}else{var m=window.matchMedia('(prefers-color-scheme:light)').matches;d.classList.add(m?'light':'dark');d.classList.remove(m?'dark':'light')}}catch(e){document.documentElement.classList.add('dark')}})();` }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
