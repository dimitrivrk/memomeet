import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

type ExtendedToken = {
  id?: string;
  credits?: number;
  subscription?: 'none' | 'standard' | 'pro';
  isUnlimited?: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  error?: string;
};

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    refresh_token: token.refresh_token,
  });

  try {
    const { credentials } = await client.refreshAccessToken();
    const refreshedToken: ExtendedToken = {
      ...token,
      access_token: credentials.access_token ?? token.access_token,
      expires_at: credentials.expiry_date
        ? Math.floor(credentials.expiry_date / 1000)
        : Math.floor(Date.now() / 1000 + 3600),
    };

    // 🔁 Mise à jour en base
    await prisma.account.updateMany({
      where: {
        provider: 'google',
        userId: token.id,
      },
      data: {
        access_token: refreshedToken.access_token ?? '',
        expires_at: refreshedToken.expires_at ?? null,
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
      const extendedToken = token as ExtendedToken;

      if (user) {
        const u = user as PrismaUser;
        extendedToken.id = u.id;
        extendedToken.credits = u.credits;
        extendedToken.subscription = u.subscription;
        extendedToken.isUnlimited = u.isUnlimited;
      }

      if (account?.provider === 'google') {
        extendedToken.access_token = account.access_token ?? undefined;
        extendedToken.refresh_token = account.refresh_token ?? undefined;
        extendedToken.expires_at = account.expires_at ?? undefined;

        await prisma.account.updateMany({
          where: {
            provider: 'google',
            userId: extendedToken.id,
          },
          data: {
            access_token: account.access_token ?? '',
            refresh_token: account.refresh_token ?? '',
            expires_at: account.expires_at ?? null,
          },
        });
      }

      if (extendedToken.expires_at && Date.now() / 1000 > extendedToken.expires_at) {
        return await refreshAccessToken(extendedToken);
      }

      return extendedToken;
    },

    async session({ session, token }) {
      const t = token as ExtendedToken;

      if (session.user && t) {
        session.user.id = t.id ?? '';
        session.user.credits = t.credits ?? 0;
        session.user.subscription = t.subscription ?? 'none';
        session.user.isUnlimited = t.isUnlimited ?? false;
        session.user.access_token = t.access_token ?? '';
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
