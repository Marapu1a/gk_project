INSERT INTO "ReviewerCandidateRelation" (
  "id",
  "reviewerId",
  "candidateId",
  "cycleId",
  "kind",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'rc_' || substr(md5(concat_ws(':', h."reviewerId", r."userId", r."cycleId", relation_kind::text)), 1, 22),
  h."reviewerId",
  r."userId",
  r."cycleId",
  relation_kind,
  CASE
    WHEN bool_or(h."status" IN ('CONFIRMED', 'SPENT')) THEN 'ACCEPTED'::"ReviewerCandidateStatus"
    WHEN bool_or(h."status" = 'UNCONFIRMED') THEN 'PENDING'::"ReviewerCandidateStatus"
    ELSE 'REJECTED'::"ReviewerCandidateStatus"
  END,
  min(r."createdAt"),
  now()
FROM (
  SELECT
    h.*,
    CASE
      WHEN h."type" IN ('SUPERVISOR', 'SUPERVISION') THEN 'MENTORSHIP'::"ReviewerCandidateKind"
      ELSE 'SUPERVISION'::"ReviewerCandidateKind"
    END AS relation_kind
  FROM "SupervisionHour" h
) h
JOIN "SupervisionRecord" r ON r."id" = h."recordId"
JOIN "CertificationCycle" c ON c."id" = r."cycleId"
WHERE
  h."reviewerId" IS NOT NULL
  AND r."cycleId" IS NOT NULL
  AND h."reviewerId" <> r."userId"
  AND c."status" = 'ACTIVE'
GROUP BY h."reviewerId", r."userId", r."cycleId", relation_kind
ON CONFLICT ("reviewerId", "candidateId", "cycleId", "kind") DO NOTHING;
