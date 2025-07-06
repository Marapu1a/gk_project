export const documentTypeLabels: Record<string, string> = {
  HIGHER_EDUCATION: 'Высшее образование',
  ADDITIONAL_EDUCATION: 'Доп. образование',
  OTHER: 'Другое',
};

export type DocumentType = keyof typeof documentTypeLabels;
