// src/utils/getPaymentLink.ts
import type { PaymentItem } from '@/features/payment/api/getUserPayments';

type PaymentTypeExtended = PaymentItem['type'] | 'DOCUMENT_REVIEW_REPEAT';

const PAYMENT_LINKS: Record<string, Partial<Record<PaymentTypeExtended, string>>> = {
  соискатель: {
    REGISTRATION:
      'https://reestrpap.ru/product/registratsiya-na-sayte-i-sbor-chasov-superviziruemoy-praktiki-uroven-instruktor-pap-ibt',
    DOCUMENT_REVIEW:
      'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-instruktor-pap-ibt',
    EXAM_ACCESS:
      'https://reestrpap.ru/product/ekzamen-na-uroven-instruktor-pap-ibt',
    FULL_PACKAGE:
      'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-instruktor',
  },
  инструктор: {
    REGISTRATION:
      'https://reestrpap.ru/product/registratsiya-na-sayte-i-sbor-chasov-superviziruemoy-praktiki-uroven-kurator-pap',
    DOCUMENT_REVIEW:
      'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-kurator-pap',
    EXAM_ACCESS:
      'https://reestrpap.ru/product/ekzamen-na-uroven-kurator-pap',
    FULL_PACKAGE:
      'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-kurator',
  },
  куратор: {
    DOCUMENT_REVIEW:
      'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-supervizor-pap-iba',
    EXAM_ACCESS:
      'https://reestrpap.ru/product/ekzamen-na-uroven-supervizor-pap-iba',
    FULL_PACKAGE:
      'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-supervizor',
  },
};

export function getPaymentLink(type: PaymentItem['type'], billingGroup?: string): string | null {
  if (!billingGroup) return null;

  // для ресертификации ссылка пока не заведена
  if (type === 'RENEWAL') {
    return null;
  }

  const normalizedGroup = billingGroup.toLowerCase().trim();
  const url = PAYMENT_LINKS[normalizedGroup]?.[type];

  return url && /^https?:\/\//.test(url) ? url : null;
}
