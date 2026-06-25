import path from 'path';

// ── Единый источник правды по хранилищу загрузок ───────────────────────
// Раньше эти константы были скопированы в ~12 хендлеров + server.ts.

/** Максимальный размер загружаемого файла. Менять только здесь. */
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Корень хранилища загрузок: ENV `UPLOAD_DIR` (на сервере) либо локальный
 * fallback в frontend/public/uploads. Резолвится один раз при загрузке модуля
 * (как и раньше в каждом хендлере).
 */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');
