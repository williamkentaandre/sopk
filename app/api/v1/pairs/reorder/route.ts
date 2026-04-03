export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
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

  const { orderedIds } = parsed.data;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json(
      { error: { code: 400, message: 'Duplicate ids in orderedIds' } },
      { status: 400 }
    );
  }

  const existing = await prisma.pair.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const set = new Set(existing.map((p) => p.id));

  if (orderedIds.length !== set.size) {
    return NextResponse.json(
      { error: { code: 400, message: 'orderedIds must include each pair exactly once' } },
      { status: 400 }
    );
  }

  for (const id of orderedIds) {
    if (!set.has(id)) {
      return NextResponse.json(
        { error: { code: 400, message: 'Unknown or foreign pair id in orderedIds' } },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.pair.update({
        where: { id },
        data: { sortOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}
