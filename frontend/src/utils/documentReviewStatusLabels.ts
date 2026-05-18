export const documentReviewStatusLabels: Record<string, string> = {
  UNCONFIRMED: 'На рассмотрении',
  PARTIALLY_CONFIRMED: 'Частично принято',
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
};

export const documentReviewStatusColors: Record<string, string> = {
  UNCONFIRMED: 'text-yellow-600',
  PARTIALLY_CONFIRMED: 'text-blue-dark',
  CONFIRMED: 'text-green-600',
  REJECTED: 'text-[#FF5364]',
};
