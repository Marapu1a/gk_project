// backend/middlewares/verifyToken.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyJwt } from "../utils/jwt";
import { prisma } from "../lib/prisma";

const LAST_ACTIVE_THROTTLE_MS = 15 * 60 * 1000;

async function touchLastActive(userId: string) {
  const threshold = new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS);

  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: threshold } }],
    },
    data: { lastActiveAt: new Date() },
  });
}

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader) return reply.code(401).send({ error: "Нет токена" });

  // "Bearer <token>" (без хрупкости к регистру/пробелам)
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply.code(401).send({ error: "Неверный формат токена" });

  const token = match[1];

  let payload: { userId: string; role: string; email: string } | null = null;

  try {
    payload = verifyJwt<{ userId: string; role: string; email: string }>(token);
  } catch {
    payload = null;
  }

  if (!payload) return reply.code(401).send({ error: "Неверный токен" });

  request.user = payload;

  // фоном, без ожидания
  touchLastActive(payload.userId).catch(() => { });
}
