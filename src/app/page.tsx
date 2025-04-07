'use client';

import UploadForm from '@/components/UploadForm';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [credits, setCredits] = useState<number>(session?.user?.credits ?? 0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated') {
      setCredits(session?.user?.credits ?? 0);
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <p className="text-center mt-8 text-gray-700 dark:text-gray-200">Chargement...</p>;
  }

  return (
    <div className="flex">
      <Sidebar credits={credits} />
      <main className="flex-1 min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 p-4 text-gray-800 dark:text-gray-100">
        <UploadForm onCreditUsed={(newCredits) => setCredits(newCredits)} />
      </main>
    </div>
  );
}
