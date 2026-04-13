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
    RENEWAL:
      'https://reestrpap.ru/product/resertifikatsiya-uroven-instruktor-pap-ibt',
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
    RENEWAL:
      'https://reestrpap.ru/product/resertifikatsiya-uroven-kurator-pap',
  },
  куратор: {
    DOCUMENT_REVIEW:
      'https://reestrpap.ru/product/ekspertiza-dokumentov-soiskatelya-na-uroven-supervizor-pap-iba',
    EXAM_ACCESS:
      'https://reestrpap.ru/product/ekzamen-na-uroven-supervizor-pap-iba',
    FULL_PACKAGE:
      'https://reestrpap.ru/product/stoimost-so-skidkoy-10-pri-edinovremennoy-oplate-vseh-treh-platezhey-supervizor',
    RENEWAL:
      'https://reestrpap.ru/product/recertification-na-uroven-supervizor-pap-iba-2',
  },
  супервизор: {
    RENEWAL:
      'https://reestrpap.ru/product/recertification-na-uroven-supervizor-pap-iba-2',
  },
  'опытный супервизор': {
    RENEWAL:
      'https://reestrpap.ru/product/recertification-na-uroven-supervizor-pap-iba-2',
  },
};

export function getPaymentLink(type: PaymentItem['type'], billingGroup?: string): string | null {
  if (!billingGroup) return null;

  const normalizedGroup = billingGroup.toLowerCase().trim();
  const url = PAYMENT_LINKS[normalizedGroup]?.[type];

  return url && /^https?:\/\//.test(url) ? url : null;
}
