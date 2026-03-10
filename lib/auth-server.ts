import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function getCurrentUser(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: {
      id: true,
      email: true,
      stripePaymentStatus: true,
      serpApiKey: true,
      hl: true,
      gl: true,
    },
  });
  if (!user || user.stripePaymentStatus !== 'paid') return null;
  return user;
}
