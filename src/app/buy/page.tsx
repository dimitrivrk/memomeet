'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function BuyCreditsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleBuy = async (quantity: number) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Envoie le cookie de session
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert('Erreur lors de la redirection vers Stripe.');
    }
  };

  const handleSubscribe = async (priceId: string) => {
    const res = await fetch('/api/stripe/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Idem ici
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert('Erreur lors de la redirection vers Stripe.');
    }
  };

  if (status !== 'authenticated') return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-neutral-900 px-4">
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-md dark:shadow max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Acheter des crédits
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Choisis une offre pour continuer à résumer !
        </p>

        <div className="space-y-4">
          <button
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            onClick={() => handleBuy(10)}
          >
            💳 10 crédits – 10€
          </button>

          <button
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            onClick={() => handleBuy(50)}
          >
            💳 50 crédits – 20€
          </button>

          <hr className="my-6 border-gray-300 dark:border-gray-600" />

          <button
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
            onClick={() => handleSubscribe('price_1R5ficK9mEToSu4YF0OdylSe')}
          >
            🔁 Abonnement Standard – 100 crédits/mois – 9€
          </button>

          <button
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 dark:hover:bg-gray-700"
            onClick={() => handleSubscribe('price_1R5fj5K9mEToSu4YjLTjE1g3')}
          >
            🔥 Abonnement Pro – Illimité – 19€
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Paiement 100% sécurisé via Stripe 🛡️
        </p>
      </div>
    </div>
  );
}
