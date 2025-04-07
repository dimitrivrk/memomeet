import NextAuth from 'next-auth/next'; // 🔥 C'est LA solution de contournement
import { authOptions } from '@/lib/authOptions';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
