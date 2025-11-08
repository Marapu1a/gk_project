-- CreateEnum
CREATE TYPE "TargetLevel" AS ENUM ('INSTRUCTOR', 'CURATOR', 'SUPERVISOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "targetLevel" "TargetLevel";
