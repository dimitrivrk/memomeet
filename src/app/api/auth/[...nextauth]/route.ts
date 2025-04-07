import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth/app'; // ✅ nouvelle syntaxe App Router

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
