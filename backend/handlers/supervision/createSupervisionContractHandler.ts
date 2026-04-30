import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionContractSchema } from '../../schemas/supervisionContract';

export async function createSupervisionContractHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createSupervisionContractSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { uploadedFileId, supervisorInput, supervisorId } = parsed.data;

  const uploadedFile = await prisma.uploadedFile.findFirst({
    where: {
      id: uploadedFileId,
      userId,
    },
    select: {
      id: true,
      fileId: true,
    },
  });

  if (!uploadedFile) {
    return reply.code(404).send({ error: 'Файл не найден' });
  }

  if (!uploadedFile.fileId.includes('/supervisor-contracts/')) {
    return reply.code(400).send({ error: 'Файл должен быть загружен как контракт с супервизором' });
  }

  let supervisor:
    | { id: string; email: string; fullName: string | null }
    | null = null;

  if (supervisorId) {
    supervisor = await prisma.user.findUnique({
      where: { id: supervisorId },
      select: { id: true, email: true, fullName: true },
    });
  }

  if (!supervisor && supervisorInput.includes('@')) {
    supervisor = await prisma.user.findFirst({
      where: { email: { equals: supervisorInput.trim(), mode: 'insensitive' } },
      select: { id: true, email: true, fullName: true },
      orderBy: [{ email: 'asc' }, { id: 'asc' }],
    });
  }

  if (supervisor?.id === userId) {
    return reply.code(400).send({ error: 'Нельзя выбрать себя супервизором по контракту' });
  }

  const contract = await prisma.supervisionContract.create({
    data: {
      userId,
      supervisorId: supervisor?.id,
      supervisorInput,
      supervisorEmail: supervisor?.email,
      supervisorName: supervisor?.fullName,
      fileId: uploadedFile.id,
    },
    include: {
      file: true,
      supervisor: { select: { id: true, email: true, fullName: true } },
    },
  });

  return reply.code(201).send({ success: true, contract });
}

