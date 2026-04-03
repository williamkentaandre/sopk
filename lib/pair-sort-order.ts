import { prisma } from '@/lib/prisma';

/** Next sortOrder values for new pairs (lower = higher in the list). Batch is placed above existing rows. */
export async function allocateSortOrdersForNewPairs(
  userId: string,
  count: number
): Promise<number[]> {
  if (count <= 0) return [];
  const agg = await prisma.pair.aggregate({
    where: { userId },
    _min: { sortOrder: true },
  });
  const min = agg._min.sortOrder;
  let start = min != null ? min - 1 : 0;
  return Array.from({ length: count }, (_, i) => start - i);
}
