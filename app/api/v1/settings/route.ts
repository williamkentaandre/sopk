export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { settingsSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  return NextResponse.json({
    hl: user.hl ?? 'fr',
    gl: user.gl ?? 'fr',
    hasSerpApiKey: !!user.serpApiKey,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validationResult = settingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: { code: 400, message: 'Données invalides', details: validationResult.error.errors } },
        { status: 400 }
      );
    }
    const { hl, gl } = validationResult.data;
    const serpApiKey = typeof body.serpApiKey === 'string' ? body.serpApiKey : undefined;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hl,
        gl,
        ...(serpApiKey !== undefined && { serpApiKey: serpApiKey || null }),
      },
    });

    return NextResponse.json({
      hl,
      gl,
      hasSerpApiKey: serpApiKey !== undefined ? !!serpApiKey : !!user.serpApiKey,
    });
  } catch (e) {
    console.error('Settings update error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
