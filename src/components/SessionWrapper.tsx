'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { useCredits } from '@/context/CreditContext';

function CreditFetcher() {
  const { status } = useSession();
  const { setCredits } = useCredits();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !hasFetched.current) {
      hasFetched.current = true;

      const fetchCredits = async () => {
        try {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data?.user?.credits !== undefined) {
            setCredits(data.user.credits);
          }
        } catch (err) {
          console.error('Erreur lors du fetch des crédits dans SessionWrapper:', err);
        }
      };

      fetchCredits();
    }
  }, [status, setCredits]);

  return null; // Ce composant est juste un worker invisible
}

export default function SessionWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CreditFetcher />
      {children}
    </SessionProvider>
  );
}
