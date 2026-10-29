import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Contented Portál',
  description: 'Tartalom-jóváhagyás a Contented ügyfeleinek',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
