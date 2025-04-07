'use client';

import { createContext, useContext, useState, useEffect } from 'react';
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
  const { data: session } = useSession();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.credits !== undefined) {
      setCredits(session.user.credits);
    }
  }, [session]);

  return (
    <CreditContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => useContext(CreditContext);
