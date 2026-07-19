import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../lib/mailer';
import { z } from 'zod';
import { reportOperationalFailure } from '../../lib/errorMonitoring';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPasswordHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Некорректные данные', details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim();

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, archivedAt: null },
    orderBy: [{ email: 'asc' }, { id: 'asc' }],
  });
  if (!user) return reply.code(200).send({ success: true });

  const secret = process.env.RESET_PASSWORD_SECRET;
  if (!secret) return reply.code(500).send({ error: 'Секрет не задан' });

  const resetToken = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Сброс пароля',
      html: `Для сброса пароля перейдите по <a href="${resetLink}">этой ссылке</a>.`,
    });

    return reply.send({ success: true });
  } catch (err) {
    reportOperationalFailure(
      'password_reset_email',
      err,
      { userId: user.id, requestId: req.id },
      req.log,
    );
    return reply.code(500).send({ error: 'Не удалось отправить письмо' });
  }
}
