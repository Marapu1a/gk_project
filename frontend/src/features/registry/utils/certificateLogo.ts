import type { RegistryCard } from '../api/getRegistry';

export function getCertificateLogo({ groupName, certificateStatus }: Pick<RegistryCard, 'groupName' | 'certificateStatus'>) {
  if (certificateStatus !== 'ACTIVE') return null;
  switch (groupName?.trim().toLowerCase()) {
    case 'инструктор': return 'IBT';
    case 'супервизор':
    case 'опытный супервизор': return 'IBA';
    default: return null;
  }
}
