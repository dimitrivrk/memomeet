import type { DefaultSession } from "next-auth"
declare module 'html2pdf.js';

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      subscription?: 'none' | 'standard' | 'pro'
      credits?: number
      isUnlimited?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    subscription?: 'none' | 'standard' | 'pro'
    credits?: number
    isUnlimited?: boolean
  }

  interface JWT {
    id?: string
    subscription?: 'none' | 'standard' | 'pro'
    credits?: number
    isUnlimited?: boolean
  }
}
