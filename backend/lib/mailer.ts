import nodemailer from 'nodemailer';

const smtpDebugEnabled = process.env.SMTP_DEBUG === '1';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Boolean(Number(process.env.SMTP_SECURE)),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: smtpDebugEnabled,
  debug: smtpDebugEnabled,
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await transporter.sendMail({
      from: {
        name: 'ЦС ПАП',
        address: process.env.SMTP_USER || 'noreply@reestrpap.ru',
      },
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('✉ [EMAIL ERROR]:', error instanceof Error ? error.message : error);
    throw new Error('Не удалось отправить письмо');
  }
}
