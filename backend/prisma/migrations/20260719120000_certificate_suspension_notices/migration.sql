ALTER TABLE "Certificate"
ADD COLUMN "suspensionNotifiedAt" TIMESTAMP(3),
ADD COLUMN "graceExpiredNotifiedAt" TIMESTAMP(3);

-- Не создаём при первом запуске задачи по старым архивным сертификатам.
UPDATE "Certificate"
SET
  "suspensionNotifiedAt" = CURRENT_TIMESTAMP,
  "graceExpiredNotifiedAt" = CURRENT_TIMESTAMP
WHERE "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '60 days';
