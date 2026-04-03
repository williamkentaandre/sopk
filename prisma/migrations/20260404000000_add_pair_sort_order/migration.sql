-- AlterTable
ALTER TABLE "Pair" ADD COLUMN "sortOrder" INTEGER;

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
