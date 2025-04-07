import { authOptions } from '@/lib/authOptions';
import { NextAuthHandler } from 'next-auth';

const handler = NextAuthHandler(authOptions);

export { handler as GET, handler as POST };
