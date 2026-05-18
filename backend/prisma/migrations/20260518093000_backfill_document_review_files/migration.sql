INSERT INTO "DocumentReviewFile" (
  "id",
  "requestId",
  "fileId",
  "type",
  "status",
  "adminComment",
  "reviewedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_' || uf."id",
  uf."requestId",
  uf."id",
  uf."type",
  CASE drr."status"
    WHEN 'CONFIRMED' THEN 'CONFIRMED'::"DocumentReviewFileStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"DocumentReviewFileStatus"
    ELSE 'UNCONFIRMED'::"DocumentReviewFileStatus"
  END,
  CASE
    WHEN drr."status" = 'REJECTED' THEN drr."comment"
    ELSE NULL
  END,
  drr."reviewedAt",
  uf."createdAt",
  NOW()
FROM "UploadedFile" uf
JOIN "DocumentReviewRequest" drr ON drr."id" = uf."requestId"
WHERE uf."requestId" IS NOT NULL
ON CONFLICT ("requestId", "fileId") DO NOTHING;
