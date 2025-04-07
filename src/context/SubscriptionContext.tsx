// src/context/SubscriptionContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';

type SubscriptionType = 'pro' | 'standard' | 'none';

type SubscriptionContextType = {
  subscription: SubscriptionType;
  setSubscription: (value: SubscriptionType) => void;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionType>('none');

  return (
    <SubscriptionContext.Provider value={{ subscription, setSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
