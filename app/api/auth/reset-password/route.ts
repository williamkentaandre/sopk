import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 400, message: 'Invalid data', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const { token, newPassword } = parsed.data;

    const tokenHash = hashToken(token);
    const now = new Date();

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, expiresAt: { gt: now } },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: { code: 400, message: 'Invalid or expired reset link. Please request a new one.' } },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetRecord.userId } }),
    ]);

    return NextResponse.json({ message: 'Password updated. You can now log in.' });
  } catch (e) {
    console.error('Reset password error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Server error' } },
      { status: 500 }
    );
  }
}
