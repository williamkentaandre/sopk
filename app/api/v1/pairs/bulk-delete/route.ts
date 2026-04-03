export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 400, message: 'Invalid JSON' } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 400, message: 'Invalid body', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;
  const uniqueIds = [...new Set(ids)];

  const result = await prisma.pair.deleteMany({
    where: { userId: user.id, id: { in: uniqueIds } },
  });

  return NextResponse.json({
    success: true,
    deleted: result.count,
    requested: uniqueIds.length,
  });
}
