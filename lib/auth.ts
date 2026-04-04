import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const OAUTH_DUMMY_PASSWORD_HASH =
  '$2b$10$8EMbFLw2HaCGtr2nEpiYzOiWraafpiIGPk7Ku0Bb6aj5v87aLaEfK';

export const authOptions: NextAuthOptions = {
  providers: [
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                prompt: 'select_account', // Force account picker after logout (no silent re-use)
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        if (!user.emailVerified) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          stripePaymentStatus: user.stripePaymentStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // Credentials: user already has id + stripePaymentStatus from authorize()
        if ((user as any).stripePaymentStatus !== undefined) {
          token.id = user.id;
          token.stripePaymentStatus = (user as any).stripePaymentStatus;
          return token;
        }
        // OAuth (Google): find or create Prisma user by email
        if (user.email) {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            create: {
              email: user.email,
              // Avoid expensive bcrypt during OAuth creation (serverless latency).
              // Credentials sign-in will never use this for OAuth-created users.
              passwordHash: OAUTH_DUMMY_PASSWORD_HASH,
              stripePaymentStatus: 'pending',
              emailVerified: new Date(),
            },
            update: {},
          });
          token.id = dbUser.id;
          token.stripePaymentStatus = dbUser.stripePaymentStatus;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).stripePaymentStatus = token.stripePaymentStatus;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // OAuth / config failures append ?error= (e.g. OAuthCallback) so we can show a helpful message
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};

export type SessionUser = {
  id: string;
  email?: string | null;
  stripePaymentStatus?: string;
};
