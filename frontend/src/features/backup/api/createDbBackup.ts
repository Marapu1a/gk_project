import axios from 'axios';
import { api } from '@/lib/axios';

function getFilenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch =
    disposition.match(/filename="([^"]+)"/i) ||
    disposition.match(/filename=([^;]+)/i);

  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }

  return null;
}

async function extractAxiosBlobError(error: unknown): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return 'Ошибка создания бэкапа';
  }

  const data = error.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { error?: string; details?: string };

      if (parsed.details) {
        return `${parsed.error || 'Ошибка создания бэкапа'}: ${parsed.details}`;
      }

      return parsed.error || 'Ошибка создания бэкапа';
    } catch {
      return error.message || 'Ошибка создания бэкапа';
    }
  }

  const payload = data as { error?: string; details?: string } | undefined;

  if (payload?.details) {
    return `${payload.error || 'Ошибка создания бэкапа'}: ${payload.details}`;
  }

  return payload?.error || error.message || 'Ошибка создания бэкапа';
}

export type CreateDbBackupResult = { ok: true; file: string };

export async function createDbBackup(): Promise<CreateDbBackupResult> {
  try {
    const response = await api.get<Blob>('/admin/db/backup', {
      responseType: 'blob',
    });

    const blob = response.data;
    const filename =
      getFilenameFromDisposition(response.headers['content-disposition']) ||
      `cspap_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.dump`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    return { ok: true, file: filename };
  } catch (error) {
    throw new Error(await extractAxiosBlobError(error));
  }
}
