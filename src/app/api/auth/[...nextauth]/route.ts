import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// App Router uses NextAuth as a function
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
