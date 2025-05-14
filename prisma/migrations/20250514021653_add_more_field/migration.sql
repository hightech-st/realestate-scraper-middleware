/*
  Warnings:

  - Added the required column `post_id` to the `RealEstateItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RealEstateItem" ADD COLUMN     "group_id" TEXT,
ADD COLUMN     "is_content_processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_image_processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "post_id" TEXT NOT NULL,
ADD COLUMN     "processed_content" TEXT,
ADD COLUMN     "s3_image_links" TEXT[];

-- CreateIndex
CREATE INDEX "RealEstateItem_post_id_idx" ON "RealEstateItem"("post_id");

-- CreateIndex
CREATE INDEX "RealEstateItem_group_id_idx" ON "RealEstateItem"("group_id");

-- CreateIndex
CREATE INDEX "RealEstateItem_is_content_processed_idx" ON "RealEstateItem"("is_content_processed");

-- CreateIndex
CREATE INDEX "RealEstateItem_is_image_processed_idx" ON "RealEstateItem"("is_image_processed");
