import NextAuth from 'next-auth';

import { authOptions } from '@/lib/auth';

const handler = async (req: Request) => {
  const nextAuth = (await import('next-auth')).default;
  return nextAuth(req, authOptions);
};

export { handler as GET, handler as POST };
