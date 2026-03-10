export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { updatePairSchema } from '@/lib/validators';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';

async function getPairForUser(pairId: string, userId: string) {
  return prisma.pair.findFirst({
    where: { id: pairId, userId },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  const { pairId } = params;
  const pair = await getPairForUser(pairId, user.id);
  if (!pair) {
    return NextResponse.json({ error: { code: 404, message: 'Pair not found' } }, { status: 404 });
  }
  return NextResponse.json({
    pair_id: pair.id,
    keyword: pair.keyword,
    url: pair.rawUrl,
    last_position: pair.lastPosition,
    last_checked_at: pair.lastCheckedAt?.toISOString() ?? null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  const { pairId } = params;
  const pair = await getPairForUser(pairId, user.id);
  if (!pair) {
    return NextResponse.json({ error: { code: 404, message: 'Pair not found' } }, { status: 404 });
  }

  const body = await request.json();
  const validationResult = updatePairSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: { code: 400, message: 'Données invalides', details: validationResult.error.errors } },
      { status: 400 }
    );
  }

  const updates: { keyword?: string; url?: string; rawUrl?: string } = {};
  if (validationResult.data.keyword) updates.keyword = validationResult.data.keyword;
  if (validationResult.data.url) {
    if (!isValidUrl(validationResult.data.url)) {
      return NextResponse.json(
        { error: { code: 400, message: 'URL invalide' } },
        { status: 400 }
      );
    }
    updates.url = normalizeUrl(validationResult.data.url);
    updates.rawUrl = validationResult.data.url;
  }

  const updated = await prisma.pair.update({
    where: { id: pairId },
    data: updates,
  });

  return NextResponse.json({
    pair_id: updated.id,
    keyword: updated.keyword,
    url: updated.rawUrl,
    last_position: updated.lastPosition,
    last_checked_at: updated.lastCheckedAt?.toISOString() ?? null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  const { pairId } = params;
  const pair = await getPairForUser(pairId, user.id);
  if (!pair) {
    return NextResponse.json({ error: { code: 404, message: 'Pair not found' } }, { status: 404 });
  }

  await prisma.pair.delete({ where: { id: pairId } });
  return new NextResponse(null, { status: 204 });
}
