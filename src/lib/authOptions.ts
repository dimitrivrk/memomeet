import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function refreshAccessToken(token: any) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    refresh_token: token.refresh_token,
  });

  try {
    const { credentials } = await client.refreshAccessToken();
    const refreshedToken = {
      ...token,
      access_token: credentials.access_token,
      expires_at: Math.floor(Date.now() / 1000 + (credentials.expiry_date ?? 3600) / 1000),
    };

    // 🔁 Enregistre aussi en base
    await prisma.account.updateMany({
      where: {
        provider: 'google',
        userId: token.id,
      },
      data: {
        access_token: credentials.access_token ?? '',
        expires_at: refreshedToken.expires_at,
      },
    });

    return refreshedToken;
  } catch (err) {
    console.error('❌ Erreur lors du refresh Google token:', err);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as PrismaUser;
        token.id = u.id;
        token.credits = u.credits;
        token.subscription = u.subscription;
        token.isUnlimited = u.isUnlimited;
      }

      if (account?.provider === 'google') {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;

        // Sauvegarde dans Prisma
        await prisma.account.updateMany({
          where: {
            provider: 'google',
            userId: token.id,
          },
          data: {
            access_token: account.access_token ?? '',
            refresh_token: account.refresh_token ?? '',
            expires_at: account.expires_at ?? null,
          },
        });
      }

      // Rafraîchir si expiré
      if (token.expires_at && Date.now() / 1000 > token.expires_at) {
        return await refreshAccessToken(token);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.credits = token.credits as number;
        session.user.subscription = token.subscription as 'none' | 'standard' | 'pro';
        session.user.isUnlimited = token.isUnlimited as boolean;

        if (token.access_token) {
          session.user.access_token = token.access_token as string;
        }
      }

      return session;
    },

    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
