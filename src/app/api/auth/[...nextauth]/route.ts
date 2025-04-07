import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth';

// ✅ App Router compatible
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
