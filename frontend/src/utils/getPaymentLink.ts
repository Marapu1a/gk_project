import type { PaymentItem } from "@/features/payment/api/getUserPayments"

type PaymentTypeExtended = PaymentItem['type'] | 'DOCUMENT_REVIEW_REPEAT';

const PAYMENT_LINKS: Record<string, Partial<Record<PaymentTypeExtended, string>>> = {
  Студент: {
    REGISTRATION: 'https://reestrpap.ru/product/registratsiya-na-sayte-i-sbor-chasov-superviziruemoy-praktiki-uroven-instruktor-pap-ibt',
    DOCUMENT_REVIEW: 'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-instruktor-pap-ibt',
    EXAM_ACCESS: 'https://reestrpap.ru/product/ekzamen-na-uroven-instruktor-pap-ibt',
    FULL_PACKAGE: 'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-instruktor',
  },
  инструктор: {
    REGISTRATION: 'https://reestrpap.ru/product/registratsiya-na-sayte-i-sbor-chasov-superviziruemoy-praktiki-uroven-kurator-pap',
    DOCUMENT_REVIEW: 'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-kurator-pap',
    EXAM_ACCESS: 'https://reestrpap.ru/product/ekzamen-na-uroven-kurator-pap',
    FULL_PACKAGE: 'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-kurator',
  },
  куратор: {
    DOCUMENT_REVIEW: 'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-supervizor-pap-iba',
    EXAM_ACCESS: 'https://reestrpap.ru/product/ekzamen-na-uroven-supervizor-pap-iba',
    FULL_PACKAGE: 'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-supervizor',
  },
  // супервизор → опытный — пока без ссылок
};

export function getPaymentLink(
  type: PaymentItem['type'],
  currentGroup?: string
): string | null {
  if (!currentGroup) return null;
  const group = currentGroup.toLowerCase().trim();
  const url = PAYMENT_LINKS[group]?.[type];
  return (url && /^https?:\/\//.test(url)) ? url : null;
}
