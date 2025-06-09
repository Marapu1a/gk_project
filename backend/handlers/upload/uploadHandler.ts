import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export async function uploadHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
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

  const ext = path.extname(data.filename);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const dir = path.resolve(__dirname, '../../../uploads', user.userId);
  const filePath = path.join(dir, fileName);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, await data.toBuffer());

  const fileId = `uploads/${user.userId}/${fileName}`;
  return reply.send({ fileId });
}
