-- CreateEnum
CREATE TYPE "UserBannerTone" AS ENUM ('DANGER', 'DARK', 'SOFT');

-- CreateTable
CREATE TABLE "UserBanner" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tone" "UserBannerTone" NOT NULL DEFAULT 'DARK',
    "message" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBanner_pkey" PRIMARY KEY ("id")
);
