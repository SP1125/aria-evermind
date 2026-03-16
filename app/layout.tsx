// src/app/layout.tsx
import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'ARIA — Adaptive Rerouting Intelligence Agent',
  description: 'A disruption-intelligent scheduling companion that knows you well enough to adapt in real time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#000510' }}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}