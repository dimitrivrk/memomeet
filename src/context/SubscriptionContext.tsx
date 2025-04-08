'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

type SubscriptionType = 'pro' | 'standard' | 'none';

type SubscriptionContextType = {
  subscription: SubscriptionType;
  setSubscription: (value: SubscriptionType) => void;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: 'none',
  setSubscription: () => {},
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionType>('none');
  const hasFetched = useRef(false);

  const refreshSubscription = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data?.user?.subscription) {
        setSubscription(data.user.subscription);
      }
    } catch (err) {
      console.error('Erreur lors du refresh de l’abonnement :', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && !hasFetched.current) {
      hasFetched.current = true;
      refreshSubscription();
    }
  }, [status]);

  return (
    <SubscriptionContext.Provider value={{ subscription, setSubscription, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
