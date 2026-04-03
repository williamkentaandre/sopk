-- Idempotent: safe on DBs that already had tables before Prisma Migrate (P3005 baseline).
-- Pair.sortOrder: lower = higher in the list; backfill matches former createdAt DESC order.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Pair'
      AND column_name = 'sortOrder'
  ) THEN
    ALTER TABLE "Pair" ADD COLUMN "sortOrder" INTEGER;
  END IF;
END $$;

UPDATE "Pair" AS p
SET "sortOrder" = sub.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) - 1) AS rn
  FROM "Pair"
) AS sub
WHERE p.id = sub.id;

ALTER TABLE "Pair" ALTER COLUMN "sortOrder" SET NOT NULL;
ALTER TABLE "Pair" ALTER COLUMN "sortOrder" SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Pair_userId_sortOrder_idx" ON "Pair"("userId", "sortOrder");
