import { api } from '@/lib/axios';

export async function createFullBackup(): Promise<void> {
  const { data } = await api.post<{ ticket: string }>('/admin/full-backup/ticket');
  if (!data?.ticket) throw new Error('Сервер не выдал ссылку на полный бэкап');

  const base = String(api.defaults.baseURL || '/api').replace(/\/$/, '');
  const link = document.createElement('a');
  link.href = `${base}/admin/full-backup/download?ticket=${encodeURIComponent(data.ticket)}`;
  link.download = '';
  link.referrerPolicy = 'no-referrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
