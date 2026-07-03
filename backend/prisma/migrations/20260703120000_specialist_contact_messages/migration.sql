CREATE TYPE "SpecialistContactRequestType" AS ENUM (
  'PARENT_CONSULTATION',
  'SUPERVISION',
  'QUESTION'
);

CREATE TABLE "SpecialistContactMessage" (
  "id" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "replyContact" TEXT NOT NULL,
  "requestType" "SpecialistContactRequestType" NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SpecialistContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpecialistContactMessage_specialistId_isRead_createdAt_idx"
  ON "SpecialistContactMessage"("specialistId", "isRead", "createdAt");

CREATE INDEX "SpecialistContactMessage_createdAt_idx"
  ON "SpecialistContactMessage"("createdAt");

ALTER TABLE "SpecialistContactMessage"
  ADD CONSTRAINT "SpecialistContactMessage_specialistId_fkey"
  FOREIGN KEY ("specialistId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
