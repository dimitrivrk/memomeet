// PAS BESOIN D'IMPORTER "next-auth" MANUELLEMENT
declare module "next-auth" {
    interface Session {
      user: {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
        credits?: number;
        subscription?: 'none' | 'standard' | 'pro';
        isUnlimited?: boolean;
      };
    }
  }
  