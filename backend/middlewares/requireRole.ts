// backend/middlewares/requireRole.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';

/**
 * Гард роли уровня роута. Ставится в preHandler ПОСЛЕ verifyToken
 * (тот кладёт request.user). Заменяет повторяющиеся проверки
 * `if (req.user.role !== 'ADMIN') return 403` в хендлерах.
 *
 * Использование: { preHandler: [verifyToken, requireRole(Role.ADMIN)] }
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.user?.role as Role | undefined;
    if (!role || !roles.includes(role)) {
      return reply.code(403).send({ error: 'Доступ запрещён' });
    }
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
