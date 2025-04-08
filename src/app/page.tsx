'use client';

import UploadForm from '@/components/UploadForm';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCredits } from '@/context/CreditContext';
import { useSubscription } from '@/context/SubscriptionContext';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const { refreshCredits } = useCredits();
  const { refreshSubscription } = useSubscription();
  const fetched = useRef(false); // 🚨 Pas de spam

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !fetched.current) {
      fetched.current = true;

      const syncData = async () => {
        try {
          await refreshCredits();
          await refreshSubscription();
        } catch (e) {
          console.error('💥 Erreur sync données depuis Home', e);
        }
      };

      syncData();
    }
  }, [status, router, refreshCredits, refreshSubscription]);

  if (status === 'loading') {
    return (
      <p className="text-center mt-8 text-gray-700 dark:text-gray-200">
        Chargement...
      </p>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 p-4 text-gray-800 dark:text-gray-100">
        <UploadForm onCreditUsed={() => refreshCredits()} />
      </main>
    </div>
  );
}
