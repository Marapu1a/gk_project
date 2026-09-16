export type ReminderTask = {
  id: string;
  kind: 'cooperation' | 'hours';
  createdAt: string;
};

export type ReminderSnapshot = {
  reviewerId: string;
  fullName: string;
  email: string;
  tasks: ReminderTask[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!
));

export function buildReviewerReminder(snapshot: ReminderSnapshot, test = false) {
  const tasks = [...new Map(snapshot.tasks.map((task) => [`${task.kind}:${task.id}`, task])).values()];
  if (!tasks.length) return null;
  const cooperation = tasks.filter((task) => task.kind === 'cooperation').length;
  const hours = tasks.filter((task) => task.kind === 'hours').length;
  const lines = [
    cooperation ? `запросы на сотрудничество — ${cooperation}` : '',
    hours ? `заявки часов на проверку — ${hours}` : '',
  ].filter(Boolean).map((line, index, items) => `${line}${index === items.length - 1 ? '.' : ';'}`);
  const heading = snapshot.fullName ? `Добрый день, ${snapshot.fullName}!` : 'Добрый день!';
  const testNote = test ? `Тестовое письмо. Сводка для: ${snapshot.fullName} (${snapshot.email}).` : '';
  const footer = 'Данные актуальны на момент формирования письма.';
  return {
    subject: `${test ? '[ТЕСТ] ' : ''}ЦС ПАП: заявки ожидают решения`,
    text: [testNote, heading, 'В личном кабинете ожидают вашей реакции следующие обращения:', lines.join('\n'),
      'Просим перейти в личный кабинет и рассмотреть их.',
      'Перейти в личный кабинет: https://account.reestrpap.ru/', footer,
      'С уважением,\nслужба поддержки ЦС «ПАП»'].filter(Boolean).join('\n\n'),
    html: `${testNote ? `<p>${escapeHtml(testNote)}</p>` : ''}<p>${escapeHtml(heading)}</p>
      <p>В личном кабинете ожидают вашей реакции следующие обращения:</p>
      <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      <p>Просим перейти в личный кабинет и рассмотреть их.</p>
      <p><a href="https://account.reestrpap.ru/"><strong>Перейти в личный кабинет</strong></a></p>
      <p>${footer}</p>
      <p>С уважением,<br />служба поддержки ЦС «ПАП»</p>`,
    tasks,
  };
}
