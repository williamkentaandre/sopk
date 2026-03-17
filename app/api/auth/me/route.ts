import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, emailVerified: true },
  });
  return NextResponse.json({
    authenticated: true,
    email: user?.email ?? email,
    emailVerified: user?.emailVerified ?? null,
  });
}

