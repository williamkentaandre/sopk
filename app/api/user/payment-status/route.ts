import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.id) {
    return NextResponse.json({ paid: false }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: { stripePaymentStatus: true },
  });
  return NextResponse.json({
    paid: user?.stripePaymentStatus === 'paid',
  });
}
