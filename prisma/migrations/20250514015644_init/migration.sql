-- CreateTable
CREATE TABLE "RealEstateItem" (
    "id" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB NOT NULL,

    CONSTRAINT "RealEstateItem_pkey" PRIMARY KEY ("id")
);
