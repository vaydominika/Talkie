-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "targetKey" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_kind_targetKey_idx" ON "MediaAsset"("kind", "targetKey");
