import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR; // на серве есть, локально нет

export async function uploadFileToStorage(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ error: 'Файл не получен' });
  }

  // ⬇️ добавили webp
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(data.mimetype)) {
    return reply.code(415).send({ error: 'Недопустимый тип файла' });
  }

  // ⬇️ нормализация и базовая валидация категории (без whitelisting, чтобы не ломать текущие)
  const rawCategory = (req.query as { category?: string })?.category ?? 'misc';
  const category = String(rawCategory).trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/i.test(category)) {
    return reply.code(400).send({ error: 'Недопустимая категория' });
  }

  const ext = path.extname(data.filename);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  const dir = path.join(baseDir, String(user.userId), category);

  // ⬇️ если аватар — подчистили папку и БД-записи перед записью нового файла
  if (category === 'avatar') {
    try {
      const names = await fs.readdir(dir);
      await Promise.all(names.map(n => fs.unlink(path.join(dir, n)).catch(() => { })));
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e; // если папки нет — ок
    }
    await prisma.uploadedFile.deleteMany({
      where: {
        userId: user.userId,
        fileId: { startsWith: `${user.userId}/avatar/` },
      },
    });
  }

  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
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
