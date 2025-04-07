'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BuySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/');
    }, 4000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 dark:bg-neutral-900 px-4">
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-md dark:shadow max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4">
          Merci ! 🎉
        </h1>
        <p className="text-gray-700 dark:text-gray-200">
          Ton paiement a bien été validé.
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Redirection vers l’accueil dans quelques secondes...
        </p>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Si rien ne se passe,{' '}
          <a href="/" className="text-blue-500 dark:text-blue-400 underline">
            clique ici
          </a>.
        </p>
        <div className="mt-4 animate-pulse text-green-500 dark:text-green-400 text-xl">
          ...
        </div>
      </div>
    </div>
  );
}
