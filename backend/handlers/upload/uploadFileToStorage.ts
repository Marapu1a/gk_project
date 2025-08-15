import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

export async function uploadFileToStorage(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ error: 'Файл не получен' });
  }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowed.includes(data.mimetype)) {
    return reply.code(415).send({ error: 'Недопустимый тип файла' });
  }

  const { category = 'misc' } = req.query as { category?: string };

  const ext = path.extname(data.filename);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const dir = path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads', user.userId, category);
  const filePath = path.join(dir, fileName);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, await data.toBuffer());

  const fileId = `${user.userId}/${category}/${fileName}`;

  const uploaded = await prisma.uploadedFile.create({
    data: {
      userId: user.userId,
      fileId,
      name: data.filename,
      mimeType: data.mimetype,
    },
  });

  return reply.code(201).send(uploaded);
}

