-- CreateTable
CREATE TABLE "FacebookGroups" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "group_link" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "group_location" TEXT NOT NULL,
    "for_foreigner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FacebookGroups_pkey" PRIMARY KEY ("id")
);
