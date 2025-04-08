'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

type CreditContextType = {
  credits: number | null;
  setCredits: (credits: number) => void;
  refreshCredits: () => Promise<void>;
};

const CreditContext = createContext<CreditContextType>({
  credits: null,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export const CreditProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const hasFetched = useRef(false);

  const refreshCredits = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data?.user?.credits !== undefined) {
        setCredits(data.user.credits);
      }
    } catch (err) {
      console.error('Erreur lors du refresh des crédits :', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && !hasFetched.current) {
      hasFetched.current = true;
      refreshCredits();
    }
  }, [status]);

  return (
    <CreditContext.Provider value={{ credits, setCredits, refreshCredits }}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => useContext(CreditContext);
