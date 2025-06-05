import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../lib/mailer';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPasswordHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Некорректные данные', details: parsed.error.flatten() });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return reply.code(200).send({ success: true });

  const resetToken = jwt.sign(
    { userId: user.id },
    process.env.RESET_PASSWORD_SECRET!,
    { expiresIn: '15m' }
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Сброс пароля',
      html: `Для сброса пароля перейдите по <a href="${resetLink}">этой ссылке</a>.`,
    });

    return reply.send({ success: true });
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    return reply.code(500).send({ error: 'Не удалось отправить письмо' });
  }
}

