import { prisma } from '../lib/prisma';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_ROOT } from '../config/storage';

async function storedFileHash(fileId: string, knownHash: string | null): Promise<string | null> {
  if (knownHash) return knownHash;
  const fullPath = path.resolve(UPLOAD_ROOT, fileId);
  const relative = path.relative(UPLOAD_ROOT, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  try {
    await access(fullPath);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(fullPath)) hash.update(chunk);
    return hash.digest('hex');
  } catch {
    return null;
  }
}

export function getCertificateDateWarnings(issuedAt: Date, expiresAt: Date, now = new Date()) {
  const days = Math.ceil((expiresAt.getTime() - issuedAt.getTime()) / 86_400_000);
  const warnings: string[] = [];
  if (days < 90) warnings.push(`Необычно короткий срок: ${days} дн.`);
  if (days > 366 * 5) warnings.push(`Необычно длинный срок: ${days} дн.`);
  if (expiresAt < now) warnings.push('Сертификат уже истёк на момент внесения.');
  return warnings;
}

export async function getCertificateWarnings(options: {
  userId: string;
  certificateId?: string;
  number: string;
  issuedAt: Date;
  expiresAt: Date;
  fileId: string;
}) {
  const warnings = getCertificateDateWarnings(options.issuedAt, options.expiresAt);
  const existing = await prisma.certificate.findMany({
    where: { userId: options.userId, ...(options.certificateId ? { id: { not: options.certificateId } } : {}) },
    select: { number: true, issuedAt: true, file: { select: { fileId: true, contentHash: true } } },
  });
  const normalizeNumber = (value: string) => value.replace(/\s+/g, '').toUpperCase();
  if (existing.some((c) => normalizeNumber(c.number) === normalizeNumber(options.number) && c.issuedAt.getTime() === options.issuedAt.getTime())) {
    warnings.push('У пользователя уже есть сертификат с таким номером и датой выдачи.');
  }
  const file = await prisma.uploadedFile.findUnique({ where: { id: options.fileId }, select: { fileId: true, contentHash: true } });
  const currentHash = file ? await storedFileHash(file.fileId, file.contentHash) : null;
  let duplicatePdf = false;
  if (currentHash) {
    for (const certificate of existing) {
      if (await storedFileHash(certificate.file.fileId, certificate.file.contentHash) === currentHash) {
        duplicatePdf = true;
        break;
      }
    }
  }
  if (duplicatePdf) {
    warnings.push('Такой же PDF уже прикреплён к другому сертификату пользователя.');
  }
  return warnings;
}
