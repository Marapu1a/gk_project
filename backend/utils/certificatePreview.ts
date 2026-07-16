import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import { UPLOAD_ROOT } from '../config/storage';
import { prisma } from '../lib/prisma';
import { isStoredPdfFile } from './pdfValidation';

const execFileAsync = promisify(execFile);
const PREVIEW_ROOT = path.join(UPLOAD_ROOT, '.previews', 'certificates');
const PREVIEW_MAX_SIZE = 1600;
const GENERATION_TIMEOUT_MS = 20_000;

const pendingPreviews = new Map<string, Promise<CertificatePreviewFile>>();

export type CertificatePreviewFile = {
  path: string;
  fileVersion: string;
};

function previewPath(certificateId: string, uploadedFileId: string) {
  return path.join(PREVIEW_ROOT, `${certificateId}-${uploadedFileId}.png`);
}

async function isUsablePreview(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function generateCertificatePreview(
  certificateId: string,
  uploadedFileId: string,
  storedFileId: string,
): Promise<CertificatePreviewFile> {
  const outputPath = previewPath(certificateId, uploadedFileId);
  if (await isUsablePreview(outputPath)) {
    return { path: outputPath, fileVersion: uploadedFileId };
  }

  if (!(await isStoredPdfFile(storedFileId))) {
    throw new Error('Certificate source is missing or is not a valid PDF');
  }

  const sourcePath = path.resolve(UPLOAD_ROOT, storedFileId);
  const relativeSourcePath = path.relative(UPLOAD_ROOT, sourcePath);
  if (relativeSourcePath.startsWith('..') || path.isAbsolute(relativeSourcePath)) {
    throw new Error('Certificate source path is outside upload storage');
  }

  await fs.mkdir(PREVIEW_ROOT, { recursive: true });

  const temporaryPrefix = path.join(
    PREVIEW_ROOT,
    `.tmp-${certificateId}-${crypto.randomBytes(8).toString('hex')}`,
  );
  const temporaryPath = `${temporaryPrefix}.png`;

  try {
    await execFileAsync(
      'pdftoppm',
      [
        '-f',
        '1',
        '-l',
        '1',
        '-singlefile',
        '-png',
        '-scale-to',
        String(PREVIEW_MAX_SIZE),
        sourcePath,
        temporaryPrefix,
      ],
      {
        timeout: GENERATION_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
    );

    if (!(await isUsablePreview(temporaryPath))) {
      throw new Error('PDF renderer did not create a preview');
    }

    await fs.rename(temporaryPath, outputPath);
    return { path: outputPath, fileVersion: uploadedFileId };
  } finally {
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
}

export async function ensureCertificatePreview(certificateId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      file: { select: { id: true, fileId: true } },
    },
  });

  if (!certificate) return null;

  const key = `${certificate.id}:${certificate.file.id}`;
  const existing = pendingPreviews.get(key);
  if (existing) return existing;

  const pending = generateCertificatePreview(
    certificate.id,
    certificate.file.id,
    certificate.file.fileId,
  ).finally(() => pendingPreviews.delete(key));

  pendingPreviews.set(key, pending);
  return pending;
}

export async function deleteCertificatePreviews(certificateId: string) {
  const files = await fs.readdir(PREVIEW_ROOT).catch(() => []);
  const prefix = `${certificateId}-`;

  await Promise.all(
    files
      .filter((fileName) => fileName.startsWith(prefix) && fileName.endsWith('.png'))
      .map((fileName) => fs.unlink(path.join(PREVIEW_ROOT, fileName)).catch(() => undefined)),
  );
}
