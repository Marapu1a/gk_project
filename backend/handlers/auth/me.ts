// src/handlers/auth/me.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { TargetLevel } from '@prisma/client';
import { TRANSBORDER_CONSENT_DOCUMENT } from '../../utils/transborderConsentDocument';

type RenewalEligibleLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;

function resolveRenewalEligibleLevel(activeGroupName: string | null | undefined): TargetLevel | null {
  if (activeGroupName === 'Инструктор') return TargetLevel.INSTRUCTOR;
  if (activeGroupName === 'Куратор') return TargetLevel.CURATOR;
  if (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор') {
    return TargetLevel.SUPERVISOR;
  }
  return null;
}

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      fullNameLatin: true,
      phone: true,
      birthDate: true,
      country: true,
      city: true,
      avatarUrl: true,
      bio: true,
      targetLevel: true,
      targetLockRank: true,
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  // === CONSENT CHECK ===
  const documentType = TRANSBORDER_CONSENT_DOCUMENT.type;
  const documentVersion = TRANSBORDER_CONSENT_DOCUMENT.version;

  const consent = await prisma.userConsent.findFirst({
    where: {
      userId: dbUser.id,
      documentType,
      documentVersion,
    },
    select: {
      id: true,
      consentedAt: true,
    },
  });

  const hasConsent = Boolean(consent);

  // === GROUPS ===
  const groupList = dbUser.groups
    .map(({ group }) => ({ id: group.id, name: group.name, rank: group.rank }))
    .sort((a, b) => b.rank - a.rank);

  const activeGroup = groupList[0]
    ? { id: groupList[0].id, name: groupList[0].name, rank: groupList[0].rank }
    : null;

  const renewalCandidateLevel = resolveRenewalEligibleLevel(activeGroup?.name);

  let renewalEligibleLevel: RenewalEligibleLevel = null;

  if (renewalCandidateLevel) {
    const supervisorBranch =
      renewalCandidateLevel === TargetLevel.SUPERVISOR
        ? ['Супервизор', 'Опытный Супервизор']
        : null;

    const activeCertificate = await prisma.certificate.findFirst({
      where: {
        userId: dbUser.id,
        expiresAt: { gt: new Date() },
        ...(supervisorBranch
          ? {
            group: {
              name: { in: supervisorBranch },
            },
          }
          : {
            group: {
              name:
                renewalCandidateLevel === TargetLevel.INSTRUCTOR
                  ? 'Инструктор'
                  : renewalCandidateLevel === TargetLevel.CURATOR
                    ? 'Куратор'
                    : 'Супервизор',
            },
          }),
      },
      orderBy: { issuedAt: 'desc' },
      select: { id: true },
    });

    if (activeCertificate) {
      renewalEligibleLevel = renewalCandidateLevel;
    }
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: dbUser.id, status: 'ACTIVE' },
    select: { id: true, status: true, type: true, targetLevel: true, startedAt: true },
  });

  const debugRequested = (req.query as any)?.debug === '1';
  const isDev = process.env.NODE_ENV !== 'production';
  const isAdmin = dbUser.role === 'ADMIN';
  const allowDebug = debugRequested && (isDev || isAdmin);

  const cycleStats =
    allowDebug && activeCycle
      ? {
        ceuRecords: await prisma.cEURecord.count({
          where: { userId: dbUser.id, cycleId: activeCycle.id },
        }),
        supervisionRecords: await prisma.supervisionRecord.count({
          where: { userId: dbUser.id, cycleId: activeCycle.id },
        }),
        ceuRecordsUnlinked: await prisma.cEURecord.count({
          where: { userId: dbUser.id, cycleId: null },
        }),
        supervisionRecordsUnlinked: await prisma.supervisionRecord.count({
          where: { userId: dbUser.id, cycleId: null },
        }),
      }
      : null;

  return reply.send({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    fullName: dbUser.fullName,
    fullNameLatin: dbUser.fullNameLatin,
    phone: dbUser.phone,
    birthDate: dbUser.birthDate,
    country: dbUser.country,
    city: dbUser.city,
    avatarUrl: dbUser.avatarUrl,
    bio: dbUser.bio,
    targetLevel: dbUser.targetLevel,
    targetLockRank: dbUser.targetLockRank,
    groups: groupList.map(({ id, name }) => ({ id, name })),
    activeGroup,
    renewalEligibleLevel,

    // === CONSENT INFO ===
    transborderConsent: {
      required: true,
      accepted: hasConsent,
      documentVersion,
      consentedAt: consent?.consentedAt ?? null,
    },

    // temp: for testing cycles; can be removed later
    activeCycle,
    cycleStats,
  });
}
