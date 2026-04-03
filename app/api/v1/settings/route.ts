export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { settingsSchema } from '@/lib/validators';
import { callSerperGoogleSearch } from '@/lib/serper';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  return NextResponse.json({
    hl: user.hl || null,
    gl: user.gl || null,
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
    const hasSerpApiKeyField = Object.prototype.hasOwnProperty.call(body, 'serpApiKey');
    const serpApiKeyRaw =
      body.serpApiKey === null ? null : typeof body.serpApiKey === 'string' ? body.serpApiKey.trim() : undefined;
    const serpApiKey = serpApiKeyRaw || null;

    // If user is trying to set a non-empty key, validate it against Serper before saving
    if (hasSerpApiKeyField && serpApiKey) {
      try {
        await callSerperGoogleSearch(
          { q: 'google', hl: hl ?? 'fr', gl: gl ?? 'fr', num: 1, page: 1 },
          { apiKey: serpApiKey }
        );
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : 'Clé Serper invalide.';
        return NextResponse.json(
          { error: { code: 400, message } },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hl: hl ?? '',
        gl: gl ?? '',
        ...(hasSerpApiKeyField && { serpApiKey }),
      },
    });

    return NextResponse.json({
      hl: hl ?? null,
      gl: gl ?? null,
      hasSerpApiKey: hasSerpApiKeyField ? !!serpApiKey : !!user.serpApiKey,
    });
  } catch (e) {
    console.error('Settings update error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
