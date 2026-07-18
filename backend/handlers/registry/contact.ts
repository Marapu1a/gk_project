import { FastifyReply, FastifyRequest } from 'fastify';
import { SpecialistContactRequestType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getCertificateSuspensionBoundary } from '../../utils/certificateLifecycle';

const contactRequestSchema = z.object({
  senderName: z.string().trim().min(2).max(120),
  replyContact: z.string().trim().min(3).max(160),
  requestType: z.nativeEnum(SpecialistContactRequestType),
  message: z.string().trim().min(10).max(3000),
});

type ContactParams = {
  userId: string;
};

export async function createSpecialistContactMessageHandler(
  req: FastifyRequest<{ Params: ContactParams }>,
  reply: FastifyReply,
) {
  const specialistId = req.params.userId;
  const parsed = contactRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Заполните обязательные поля сообщения.' });
  }

  const suspensionBoundary = getCertificateSuspensionBoundary();
  const specialist = await prisma.user.findFirst({
    where: {
      id: specialistId,
      role: { not: 'ADMIN' },
      archivedAt: null,
      isProfileVisible: true,
      certificates: {
        some: {
          expiresAt: { gte: suspensionBoundary },
        },
      },
    },
    select: { id: true },
  });

  if (!specialist) {
    return reply.code(403).send({ error: 'Сообщение можно отправить только специалисту, который отображается в реестре.' });
  }

  // TODO: публичная форма доступна извне; при необходимости добавить антиспам/лимиты.
  const message = await prisma.specialistContactMessage.create({
    data: {
      specialistId,
      senderName: parsed.data.senderName,
      replyContact: parsed.data.replyContact,
      requestType: parsed.data.requestType,
      message: parsed.data.message,
    },
  });

  return reply.code(201).send({ id: message.id });
}
