// src/handlers/user/getUserFullDetails.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

// Локальная нормализация: старые значения → новые логические категории
function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type; // SUPERVISOR, PRACTICE, SUPERVISION — без изменений
}

export async function getUserFullDetailsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      fullNameLatin: true,
      phone: true,
      birthDate: true,
      country: true,
      city: true,
      avatarUrl: true,
      isEmailConfirmed: true,
      role: true,
      createdAt: true,

      // 🔥 Добавлено
      targetLevel: true,
      targetLockRank: true,

      groups: { select: { group: { select: { id: true, name: true, rank: true } } } },

      certificates: {
        select: {
          id: true,
          number: true,
          title: true,
          issuedAt: true,
          expiresAt: true,
          isRenewal: true,
          comment: true,
          file: { select: { fileId: true, name: true } },
          group: { select: { id: true, name: true } },
          confirmedBy: { select: { email: true, fullName: true } },
        },
      },

      payments: {
        select: {
          id: true,
          type: true,
          status: true,
          comment: true,
          createdAt: true,
          confirmedAt: true,
        },
      },

      ceuRecords: {
        select: {
          id: true,
          eventName: true,
          eventDate: true,
          fileId: true,
          entries: {
            select: {
              id: true,
              category: true,
              value: true,
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: { select: { email: true, fullName: true } },
            },
          },
        },
      },

      supervisionRecords: {
        select: {
          id: true,
          fileId: true,
          createdAt: true,
          hours: {
            select: {
              id: true,
              type: true,
              value: true,
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: { select: { email: true, fullName: true } },
            },
            orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }], // стабильнее в UI
          },
        },
        orderBy: { createdAt: 'desc' },
      },

      uploadedFiles: {
        select: {
          id: true,
          fileId: true,
          name: true,
          mimeType: true,
          type: true,
          comment: true,
          createdAt: true,
          certificate: {
            select: { title: true, number: true, issuedAt: true, expiresAt: true },
          },
        },
      },

      documentReviewRequests: {
        select: {
          id: true,
          status: true,
          paid: true,
          reviewerEmail: true,
          submittedAt: true,
          reviewedAt: true,
          comment: true,
          documents: { select: { fileId: true, name: true } },
        },
      },
    },
  });

  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  // Преобразуем группы и нормализуем типы часов в supervisionRecords
  const groups = user.groups.map((g) => g.group);
  const supervisionRecords = user.supervisionRecords.map((r) => ({
    ...r,
    hours: r.hours.map((h) => ({ ...h, type: normalizeLevel(h.type) })),
  }));

  return reply.send({
    ...user,
    groups,
    supervisionRecords,
    targetLevel: user.targetLevel,        // 👈 теперь UI увидит
    targetLockRank: user.targetLockRank,  // 👈 пригодится для историй-логики
  });
}
