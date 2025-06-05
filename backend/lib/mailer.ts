import { MailtrapClient } from 'mailtrap';

const client = new MailtrapClient({
  token: process.env.MAILTRAP_API!,
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
    await client.send({
      from: {
        email: 'hello@demomailtrap.co',
        name: 'ЦС ПАП',
      },
      to: [{ email: to }],
      subject,
      html,
    });

    console.log('✅ Письмо отправлено успешно');
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    throw new Error('Не удалось отправить письмо');
  }
}
