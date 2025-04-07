import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt', // 'database' ne permet pas les champs custom dans session.user
  },
  callbacks: {
    async jwt({ token, user }) {
      // Premier login : user est défini
      if (user) {
        token.id = user.id;
        token.credits = (user as any).credits;
        token.subscription = (user as any).subscription;
        token.isUnlimited = (user as any).isUnlimited;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        session.user.credits = token.credits as number;
        session.user.subscription = token.subscription as string;
        session.user.isUnlimited = token.isUnlimited as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
