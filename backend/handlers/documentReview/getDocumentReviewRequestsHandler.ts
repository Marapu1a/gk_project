import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetDocumentReviewRequestsRoute extends RouteGenericInterface {
  Querystring: {
    status?: string;
    email?: string;
    paid?: string;
    from?: string;
    to?: string;
  };
}

export async function getDocumentReviewRequestsHandler(
  req: FastifyRequest<GetDocumentReviewRequestsRoute>,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { status, email, paid, from, to } = req.query;

  const where: any = {};

  if (status) where.status = status;
  if (paid !== undefined) where.paid = paid === 'true';

  if (from || to) {
    where.submittedAt = {};
    if (from) where.submittedAt.gte = new Date(from);
    if (to) where.submittedAt.lte = new Date(to);
  }

  if (email) {
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });
    if (targetUser) {
      where.userId = targetUser.id;
    } else {
      return reply.send([]); // если юзера с таким email нет
    }
  }

  const requests = await prisma.documentReviewRequest.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    include: { user: true }, // чтобы видеть email юзера
  });

  return reply.send(requests);
}
