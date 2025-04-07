'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // ✅ Redirige vers la page d'accueil
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <p className="text-center mt-8">Chargement...</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Bienvenue sur MemoMeet 👋</h1>
        <button
          onClick={() => signIn('google')}
          className="w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
}
