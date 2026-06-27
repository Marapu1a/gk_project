export type DocumentRequirementLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

export const documentRequirementHints: Record<
  DocumentRequirementLevel,
  { title: string; items: string[] }
> = {
  INSTRUCTOR: {
    title: 'Документы для уровня «Инструктор»',
    items: [
      'Диплом государственного образца о законченном высшем образовании в любой области.',
      'Удостоверение о повышении квалификации установленного образца об образовании ПАП (не менее 40 часов).',
    ],
  },
  CURATOR: {
    title: 'Документы для уровня «Куратор»',
    items: [
      'Диплом государственного образца о законченном высшем образовании в любой области.',
      'Удостоверение(я) о повышении квалификации установленного образца об образовании ПАП (не менее 216 часов) или диплом о профессиональной переподготовке в области ПАП.',
    ],
  },
  SUPERVISOR: {
    title: 'Документы для уровня «Супервизор»',
    items: [
      'Диплом государственного образца о законченном высшем образовании в любой области.',
      'Диплом о профессиональной переподготовке в области ПАП (не менее 270 часов).',
    ],
  },
};

export function getDocumentRequirementHint(level?: string | null) {
  if (level === 'INSTRUCTOR' || level === 'CURATOR' || level === 'SUPERVISOR') {
    return documentRequirementHints[level];
  }

  return null;
}
