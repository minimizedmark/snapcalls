import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyMagicLink, getUserSession } from '@/lib/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          return null;
        }

        const userId = await verifyMagicLink(credentials.token);

        if (!userId) {
          return null;
        }

        const session = await getUserSession(userId);

        if (!session) {
          return null;
        }

        return {
          id: session.id,
          email: session.email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
