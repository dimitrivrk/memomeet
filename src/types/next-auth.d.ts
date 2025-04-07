// types/next-auth.d.ts

// PAS D'IMPORT ICI !

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscription?: 'none' | 'standard' | 'pro';
      credits?: number;
      isUnlimited?: boolean;
    };
  }

  interface User {
    id: string;
    subscription?: 'none' | 'standard' | 'pro';
    credits?: number;
    isUnlimited?: boolean;
  }

  interface JWT {
    id?: string;
    subscription?: 'none' | 'standard' | 'pro';
    credits?: number;
    isUnlimited?: boolean;
  }
}
