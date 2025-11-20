import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

// Старые значения приводим к новой терминологии экспорта
function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type; // SUPERVISOR / PRACTICE / SUPERVISION — без изменений
}

export async function getUserExportHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };

  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      // скаляры (без password)
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
      bio: true,
      createdAt: true,

      // группы
      groups: {
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          group: { select: { id: true, name: true, rank: true } },
        },
      },

      // сертификаты
      certificates: {
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          number: true,
          title: true,
          issuedAt: true,
          expiresAt: true,
          isRenewal: true,
          comment: true,
          createdAt: true,
          group: { select: { id: true, name: true, rank: true } },
          file: { select: { id: true, fileId: true, name: true, mimeType: true, type: true, comment: true, createdAt: true } },
          previous: { select: { id: true, number: true, issuedAt: true } },
          next: { select: { id: true, number: true, issuedAt: true } },
          confirmedBy: { select: { id: true, email: true, fullName: true } },
        },
      },

      // платежи
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, status: true, comment: true, createdAt: true, confirmedAt: true,
        },
      },

      // CEU
      ceuRecords: {
        orderBy: { eventDate: 'desc' },
        select: {
          id: true,
          eventName: true,
          eventDate: true,
          fileId: true,
          createdAt: true,
          entries: {
            orderBy: { id: 'asc' },
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

      // супервизия
      supervisionRecords: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileId: true,
          createdAt: true,
          hours: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              type: true,      // нормализуем ниже
              value: true,
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: { select: { email: true, fullName: true } },
            },
          },
        },
      },

      // файлы пользователя
      uploadedFiles: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fileId: true, name: true, mimeType: true, type: true, comment: true, createdAt: true, requestId: true,
          certificate: { select: { id: true, title: true, number: true, issuedAt: true, expiresAt: true } },
        },
      },

      // заявки на проверку документов
      documentReviewRequests: {
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          paid: true,
          reviewerEmail: true,
          submittedAt: true,
          reviewedAt: true,
          comment: true,
          documents: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, fileId: true, name: true, mimeType: true, type: true, comment: true, createdAt: true },
          },
        },
      },

      // экзамен
      examApplication: {
        select: { id: true, status: true, createdAt: true, updatedAt: true },
      },

      // уведомления
      notifications: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, message: true, link: true, createdAt: true },
      },
    },
  });

  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  // группы и активная по максимальному rank
  const groupList = user.groups.map(g => ({
    id: g.group.id,
    name: g.group.name,
    rank: g.group.rank,
    joinedAt: g.createdAt,
  }));
  const activeGroup = groupList.length
    ? groupList.reduce((a, b) => (a.rank >= b.rank ? a : b))
    : null;

  // нормализуем типы часов в выгрузке
  const supervisionRecords = user.supervisionRecords.map(r => ({
    ...r,
    hours: r.hours.map(h => ({ ...h, type: normalizeLevel(h.type) })),
  }));

  const { groups, supervisionRecords: _old, ...rest } = user;
  return reply.send({ ...rest, groups: groupList, activeGroup, supervisionRecords });
}
