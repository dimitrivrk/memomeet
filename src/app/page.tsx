'use client';

import UploadForm from '@/components/UploadForm';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCredits } from '@/context/CreditContext';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const { setCredits } = useCredits();
  const fetched = useRef(false); // Anti-boucle

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated' && !fetched.current) {
      fetched.current = true;

      const fetchCredits = async () => {
        try {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data?.user?.credits !== undefined) {
            setCredits(data.user.credits);
          }
        } catch (e) {
          console.error('💥 Erreur fetch crédits depuis Home', e);
        }
      };

      fetchCredits();
    }
  }, [status, router, setCredits]);

  if (status === 'loading') {
    return <p className="text-center mt-8 text-gray-700 dark:text-gray-200">Chargement...</p>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 p-4 text-gray-800 dark:text-gray-100">
        <UploadForm onCreditUsed={(newCredits) => setCredits(newCredits)} />
      </main>
    </div>
  );
}
