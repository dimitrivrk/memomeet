// NO IMPORTS HERE !
// Juste le module declare

declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // 👈 C'est ça qui manquait
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscription?: string;
      credits?: number;
      isUnlimited?: boolean;
    };
  }

  interface User {
    id: string; // 👈 Ça aussi il vaut mieux l'ajouter ici
    subscription?: string;
    credits?: number;
    isUnlimited?: boolean;
  }

  interface JWT {
    id?: string;
    subscription?: string;
    credits?: number;
    isUnlimited?: boolean;
  }
}
