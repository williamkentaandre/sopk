import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return NextResponse.json({ error: { code: 400, message: 'Invalid token' } }, { status: 400 });
  }
  const tokenHash = hashToken(token);
  const now = new Date();
  const record = await prisma.emailChangeToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
  });
  if (!record) {
    return NextResponse.json({ error: { code: 400, message: 'Invalid or expired token' } }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: record.newEmail } });
  if (existing) {
    return NextResponse.json({ error: { code: 409, message: 'Email already in use' } }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { email: record.newEmail, emailVerified: now },
    }),
    prisma.emailChangeToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}

