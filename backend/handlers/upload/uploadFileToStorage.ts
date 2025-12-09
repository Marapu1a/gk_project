// handlers/files/uploadFileToStorage.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR;
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function uploadFileToStorage(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  let data;
  try {
    data = await req.file({
      limits: { fileSize: MAX_FILE_SIZE_BYTES } // обязательное условие!
    });
  } catch (e: any) {
    console.error('multipart-limit:', e.message);
    return reply.code(413).send({ error: `Файл превышает ${MAX_FILE_SIZE_MB}MB` });
  }

  if (!data) return reply.code(400).send({ error: 'Файл не получен' });

  // ⬅️ теперь это реально работает
  if (data.file.truncated) {
    return reply.code(413).send({ error: `Файл превышает ${MAX_FILE_SIZE_MB}MB` });
  }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(data.mimetype)) {
    return reply.code(415).send({ error: 'Недопустимый тип файла' });
  }

  const category = String((req.query as any).category ?? 'misc').toLowerCase();

  if (!/^[a-z0-9_-]+$/i.test(category))
    return reply.code(400).send({ error: 'Недопустимая категория файлов' });

  if (category === 'documents') {
    const count = await prisma.uploadedFile.count({
      where: { userId: user.userId, fileId: { contains: '/documents/' } },
    });
    if (count >= MAX_FILES)
      return reply.code(400).send({ error: `Можно загрузить максимум ${MAX_FILES} документов` });
  }

  const ext = path.extname(data.filename).replace(/[^a-zA-Z0-9.]/g, '');
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  const dir = path.join(baseDir, String(user.userId), category);

  if (category === 'avatar') {
    try {
      const files = await fs.readdir(dir).catch(() => []);
      await Promise.all(files.map(x => fs.unlink(path.join(dir, x)).catch(() => { })));

      await prisma.uploadedFile.deleteMany({
        where: { userId: user.userId, fileId: { startsWith: `${user.userId}/avatar/` } },
      });
    } catch { }
  }

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), await data.toBuffer());

  const fileId = `${user.userId}/${category}/${fileName}`;

  const uploaded = await prisma.uploadedFile.create({
    data: { userId: user.userId, fileId, name: data.filename, mimeType: data.mimetype },
  });

  return reply.code(201).send(uploaded);
}
