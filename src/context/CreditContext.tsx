'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

type CreditContextType = {
  credits: number | null;
  setCredits: (credits: number) => void;
};

const CreditContext = createContext<CreditContextType>({
  credits: null,
  setCredits: () => {},
});

export const CreditProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (status === 'authenticated' && !hasFetched.current) {
        hasFetched.current = true;

        try {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data?.user?.credits !== undefined) {
            setCredits(data.user.credits);
          }
        } catch (err) {
          console.error('Erreur récupération crédits dans CreditProvider:', err);
        }
      }
    };

    fetchCredits();
  }, [status]);

  return (
    <CreditContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => useContext(CreditContext);
