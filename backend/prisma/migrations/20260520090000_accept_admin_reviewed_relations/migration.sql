UPDATE "ReviewerCandidateRelation" r
SET "status" = 'ACCEPTED'
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1
    FROM "SupervisionRecord" sr
    JOIN "SupervisionHour" sh ON sh."recordId" = sr."id"
    WHERE sr."userId" = r."candidateId"
      AND sr."cycleId" = r."cycleId"
      AND sh."reviewerId" = r."reviewerId"
      AND sh."reviewedById" IS NOT NULL
      AND sh."status" IN ('CONFIRMED', 'REJECTED', 'SPENT')
      AND (
        (r."kind" = 'MENTORSHIP' AND sh."type" IN ('SUPERVISOR', 'SUPERVISION'))
        OR
        (r."kind" = 'SUPERVISION' AND sh."type" IN ('INSTRUCTOR', 'CURATOR', 'PRACTICE', 'IMPLEMENTING', 'PROGRAMMING'))
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "SupervisionRecord" sr
    JOIN "SupervisionHour" sh ON sh."recordId" = sr."id"
    WHERE sr."userId" = r."candidateId"
      AND sr."cycleId" = r."cycleId"
      AND sh."reviewerId" = r."reviewerId"
      AND sh."status" = 'UNCONFIRMED'
      AND (
        (r."kind" = 'MENTORSHIP' AND sh."type" IN ('SUPERVISOR', 'SUPERVISION'))
        OR
        (r."kind" = 'SUPERVISION' AND sh."type" IN ('INSTRUCTOR', 'CURATOR', 'PRACTICE', 'IMPLEMENTING', 'PROGRAMMING'))
      )
  );
