import { SupervisionStatus } from '@prisma/client'
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

type CeuRequirement = {
  ethics: number
  cultDiver: number
  general: number
}

type CeuRequirementMap = {
  STUDENT: null
  INSTRUCTOR: CeuRequirement
  CURATOR: CeuRequirement
  SUPERVISOR: CeuRequirement
  SENIOR_SUPERVISOR: CeuRequirement
}

type SupervisionRequirement = {
  instructor: number
  curator: number
  supervisor: number
}

const GROUP_ORDER = ['STUDENT', 'INSTRUCTOR', 'CURATOR', 'SUPERVISOR', 'SENIOR_SUPERVISOR'] as const

const GROUP_MAP: Record<string, keyof CeuRequirementMap> = {
  'СТУДЕНТ': 'STUDENT',
  'ИНСТРУКТОР': 'INSTRUCTOR',
  'КУРАТОР': 'CURATOR',
  'СУПЕРВИЗОР': 'SUPERVISOR',
  'ОПЫТНЫЙ СУПЕРВИЗОР': 'SENIOR_SUPERVISOR',
}

const CEU_REQUIREMENTS: CeuRequirementMap = {
  STUDENT: null,
  INSTRUCTOR: { ethics: 1, cultDiver: 1, general: 2 },
  CURATOR: { ethics: 2, cultDiver: 2, general: 4 },
  SUPERVISOR: { ethics: 3, cultDiver: 3, general: 6 },
  SENIOR_SUPERVISOR: { ethics: 4, cultDiver: 4, general: 8 },
}

const SUPERVISION_REQUIREMENTS: Record<keyof CeuRequirementMap, SupervisionRequirement> = {
  STUDENT: { instructor: 0, curator: 0, supervisor: 0 },
  INSTRUCTOR: { instructor: 25, curator: 0, supervisor: 0 },
  CURATOR: { instructor: 25, curator: 25, supervisor: 0 },
  SUPERVISOR: { instructor: 25, curator: 25, supervisor: 50 },
  SENIOR_SUPERVISOR: { instructor: 25, curator: 25, supervisor: 100 },
}

export async function getCeuSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      groups: { include: { group: true } },
      ceuRecords: true,
    },
  })

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' })

  const sortedGroups = dbUser.groups.map(g => g.group).sort((a, b) => a.rank - b.rank)
  const activeGroup = sortedGroups[0] || null

  const userGroupKeys = sortedGroups.map(g => GROUP_MAP[g.name.toUpperCase()] ?? 'STUDENT')
  const currentIndex = GROUP_ORDER.findIndex(g => userGroupKeys.includes(g))
  const nextGroupKey = GROUP_ORDER[currentIndex + 1] ?? GROUP_ORDER[currentIndex] ?? 'STUDENT'

  const required = CEU_REQUIREMENTS[nextGroupKey]
  const supervisionRequired = SUPERVISION_REQUIREMENTS[nextGroupKey]

  console.log('Активная группа:', activeGroup?.name ?? '—')
  console.log('Следующая цель:', nextGroupKey)
  console.log('Норматив CEU:', required)
  console.log('Норматив часов:', supervisionRequired)

  const usable = dbUser.ceuRecords.filter(r => r.is_valid && !r.spentOnCertificate)
  const valid = dbUser.ceuRecords.filter(r => r.is_valid)

  const sum = (records: typeof dbUser.ceuRecords) =>
    records.reduce((acc, r) => ({
      ethics: acc.ethics + r.ceu_ethics,
      cultDiver: acc.cultDiver + r.ceu_cult_diver,
      general: acc.general + r.ceu_general,
    }), { ethics: 0, cultDiver: 0, general: 0 })

  const usableSum = sum(usable)
  const totalSum = sum(valid)

  const percent = required
    ? {
      ethics: Math.min(100, Math.round((usableSum.ethics / required.ethics) * 100)),
      cultDiver: Math.min(100, Math.round((usableSum.cultDiver / required.cultDiver) * 100)),
      general: Math.min(100, Math.round((usableSum.general / required.general) * 100)),
    }
    : null

  const approvedRequests = await prisma.supervisionRequest.findMany({
    where: {
      studentId: user.userId,
      status: SupervisionStatus.APPROVED,
    },
  })

  const supervisionActual = approvedRequests.reduce(
    (acc, req) => ({
      instructor: acc.instructor + (req.approvedHoursInstructor ?? 0),
      curator: acc.curator + (req.approvedHoursCurator ?? 0),
      supervisor: acc.supervisor + (req.approvedHoursSupervisor ?? 0),
    }),
    { instructor: 0, curator: 0, supervisor: 0 }
  )

  console.log('Подтверждённые часы:', supervisionActual)

  return reply.send({
    required,
    percent,
    usable: usableSum,
    total: totalSum,
    supervisionRequired,
    supervisionActual,
  })
}
