import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentReviewFileStatus, NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notifyAdmins } from '../../utils/notifications';
import { reportOperationalFailure } from '../../lib/errorMonitoring';

type Body = {
  comment?: string;
};

export async function requestDocumentReviewFileDeletion(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const user = req.user as any;
  const { fileReviewId } = req.params as { fileReviewId: string };
  const { comment } = (req.body || {}) as Body;

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const trimmedComment = comment?.trim();
  if (!trimmedComment) {
    return reply.code(400).send({ error: 'Укажите причину удаления' });
  }

  if (trimmedComment.length > 1000) {
    return reply.code(400).send({ error: 'Комментарий слишком длинный' });
  }

  const reviewFile = await prisma.documentReviewFile.findFirst({
    where: {
      id: fileReviewId,
      request: { userId: user.userId },
    },
    include: {
      file: { select: { name: true } },
      request: { select: { id: true } },
    },
  });

  if (!reviewFile) {
    return reply.code(404).send({ error: 'Документ не найден' });
  }

  if (reviewFile.status === DocumentReviewFileStatus.DELETED) {
    return reply.code(400).send({ error: 'Документ уже удален' });
  }

  const updated = await prisma.documentReviewFile.update({
    where: { id: fileReviewId },
    data: {
      deletionRequestedAt: new Date(),
      deletionRequestComment: trimmedComment,
    },
    include: {
      file: true,
      reviewedBy: { select: { id: true, email: true, fullName: true } },
      deletedBy: { select: { id: true, email: true, fullName: true } },
    },
  });

  try {
    await notifyAdmins({
      type: NotificationType.DOCUMENT,
      message: `Пользователь ${user.email} просит удалить документ: ${reviewFile.file.name}`,
      link: `/admin/document-review/${reviewFile.request.id}`,
      excludeUserId: user.userId,
    });
  } catch (err) {
    reportOperationalFailure(
      'document_deletion_admin_notification',
      err,
      { userId: user.userId, fileReviewId, requestId: req.id },
      req.log,
    );
  }

  return reply.send(updated);
}
