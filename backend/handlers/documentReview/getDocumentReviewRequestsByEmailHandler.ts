import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetRequestsByEmailRoute extends RouteGenericInterface {
  Params: {
    email: string;
  };
}

export async function getDocumentReviewRequestsByEmailHandler(
  req: FastifyRequest<GetRequestsByEmailRoute>,
  reply: FastifyReply,
) {
  const { email } = req.params;

  const requests = await prisma.documentReviewRequest.findMany({
    where: {
      user: {
        email: {
          contains: email,
          mode: 'insensitive',
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });

  return reply.send(requests);
}
