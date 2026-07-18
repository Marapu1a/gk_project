export const CERTIFICATE_SUSPENSION_DAYS = 60;
export const CERTIFICATE_SUSPENSION_MS =
  CERTIFICATE_SUSPENSION_DAYS * 24 * 60 * 60 * 1000;

export type CertificateRegistryStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'GRACE_EXPIRED';

export function getCertificateRegistryStatus(
  expiresAt: Date | string,
  now = new Date(),
): CertificateRegistryStatus {
  const expiryTime = new Date(expiresAt).getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(expiryTime)) return 'GRACE_EXPIRED';
  if (expiryTime >= nowTime) return 'ACTIVE';
  if (nowTime <= expiryTime + CERTIFICATE_SUSPENSION_MS) return 'SUSPENDED';
  return 'GRACE_EXPIRED';
}

export function isCertificateVisibleAsSpecialist(
  expiresAt: Date | string,
  now = new Date(),
) {
  return getCertificateRegistryStatus(expiresAt, now) !== 'GRACE_EXPIRED';
}

export function getCertificateSuspensionBoundary(now = new Date()) {
  return new Date(now.getTime() - CERTIFICATE_SUSPENSION_MS);
}
