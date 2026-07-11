import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_ROOT } from '../config/storage';

const PDF_HEADER_SEARCH_LIMIT = 1024;

/** PDF may begin with a small byte-order marker, so search the first kilobyte. */
export function isPdfBuffer(buffer: Buffer) {
  return buffer.subarray(0, PDF_HEADER_SEARCH_LIMIT).includes(Buffer.from('%PDF-'));
}

export async function isStoredPdfFile(fileId: string) {
  const root = path.resolve(UPLOAD_ROOT);
  const filePath = path.resolve(root, fileId);

  if (!filePath.startsWith(`${root}${path.sep}`)) return false;

  try {
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(PDF_HEADER_SEARCH_LIMIT);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return isPdfBuffer(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}
