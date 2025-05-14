/*
  Warnings:

  - Added the required column `source` to the `RealEstateItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RealEstateItem" ADD COLUMN     "source" TEXT NOT NULL;
