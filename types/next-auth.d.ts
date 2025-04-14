// types/next-auth.d.ts
import type { DefaultSession, DefaultUser, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      subscription?: "none" | "standard" | "pro";
      credits?: number;
      isUnlimited?: boolean;
      access_token?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    subscription?: "none" | "standard" | "pro";
    credits?: number;
    isUnlimited?: boolean;
  }

  interface JWT extends DefaultJWT {
    id?: string;
    subscription?: "none" | "standard" | "pro";
    credits?: number;
    isUnlimited?: boolean;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    error?: string;
  }
}
