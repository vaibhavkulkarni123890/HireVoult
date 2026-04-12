import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Hirevoult — Hire Engineers Who Can Actually Code',
  description: 'Hirevoult replaces résumé-based hiring with AI-generated proctored assessments. Post a role, get ranked candidates in hours.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#111118', color: '#e2e8f0', border: '1px solid #1e1e2e' } }} />
      </body>
    </html>
  );
}
