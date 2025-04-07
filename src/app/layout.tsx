import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SessionWrapper from '@/components/SessionWrapper';
import Sidebar from '@/components/Sidebar';
import { CreditProvider } from '@/context/CreditContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext'; // ✅ ajout

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MemoMeet',
  description: 'Résumé intelligent de réunions audio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="darkmode">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <SessionWrapper>
          <SubscriptionProvider> {/* ✅ Contexte d'abonnement */}
            <CreditProvider> {/* ✅ Contexte de crédits */}
              <div className="relative min-h-screen">
                <Sidebar />
                <main className="pl-0 lg:pl-0">{children}</main>
              </div>
            </CreditProvider>
          </SubscriptionProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
