import { isPdfBuffer } from './pdfValidation';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

const EXTENSION_BY_MIME_TYPE: Record<AllowedUploadMimeType, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const ALLOWED_MIME_TYPES_BY_CATEGORY: Record<string, readonly AllowedUploadMimeType[]> = {
  avatar: ['image/png', 'image/jpeg', 'image/webp'],
  certificate: ['application/pdf'],
  ceu: ['application/pdf', 'image/png', 'image/jpeg'],
  documents: ['application/pdf', 'image/png', 'image/jpeg'],
  'supervisor-contracts': ['application/pdf', 'image/png', 'image/jpeg'],
};

export function isAllowedUploadMimeType(value: string): value is AllowedUploadMimeType {
  return ALLOWED_UPLOAD_MIME_TYPES.includes(value as AllowedUploadMimeType);
}

export function isMimeTypeAllowedForCategory(category: string, mimeType: AllowedUploadMimeType) {
  const categoryTypes = ALLOWED_MIME_TYPES_BY_CATEGORY[category];
  return !categoryTypes || categoryTypes.includes(mimeType);
}

export function getCanonicalUploadExtension(mimeType: AllowedUploadMimeType) {
  return EXTENSION_BY_MIME_TYPE[mimeType];
}

export function matchesDeclaredUploadType(buffer: Buffer, mimeType: AllowedUploadMimeType) {
  if (mimeType === 'application/pdf') return isPdfBuffer(buffer);

  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
