export type CeuDuplicateCandidate = {
  id: string;
  userId: string;
  cycleId: string | null;
  fileId: string | null;
  eventName: string;
  eventDate: Date;
  createdAt: Date;
  points: number;
  status: string;
};

export type CeuPotentialDuplicate = Pick<
  CeuDuplicateCandidate,
  'id' | 'cycleId' | 'fileId' | 'eventName' | 'eventDate' | 'createdAt' | 'points' | 'status'
>;

function eventKey(record: CeuDuplicateCandidate) {
  const name = record.eventName
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return null;
  return `${record.userId}\u0000${record.eventDate.toISOString().slice(0, 10)}\u0000${name}`;
}

export function findPotentialCeuDuplicates(
  records: CeuDuplicateCandidate[],
): Map<string, { count: number; matches: CeuPotentialDuplicate[] }> {
  const groups = new Map<string, CeuDuplicateCandidate[]>();
  for (const record of records) {
    if (record.status === 'REJECTED') continue;
    const key = eventKey(record);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const result = new Map<string, { count: number; matches: CeuPotentialDuplicate[] }>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    for (const record of group) {
      result.set(record.id, {
        count: group.length - 1,
        matches: group
          .filter((candidate) => candidate.id !== record.id)
          .slice(0, 5)
          .map(({ id, cycleId, fileId, eventName, eventDate, createdAt, points, status }) => ({
            id,
            cycleId,
            fileId,
            eventName,
            eventDate,
            createdAt,
            points,
            status,
          })),
      });
    }
  }
  return result;
}
