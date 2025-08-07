import type { PaymentItem } from "@/features/payment/api/getUserPayments"

type PaymentTypeExtended = PaymentItem['type'] | 'DOCUMENT_REVIEW_REPEAT';

const PAYMENT_LINKS: Record<string, Partial<Record<PaymentTypeExtended, string>>> = {
  студент: {
    REGISTRATION: 'https://reestrpap.reestrpap.ru/product/регистрация-на-сайте-и-сбор-часов-супе/',
    DOCUMENT_REVIEW: 'https://reestrpap.reestrpap.ru/product/экспертиза-документов-соискателя-на-3/',
    EXAM_ACCESS: 'https://reestrpap.reestrpap.ru/product/экзамен-на-уровень-инструктор-пап-ibt/',
    FULL_PACKAGE: 'https://reestrpap.reestrpap.ru/product/стоимость-со-скидкой-10-при-единовремен/',
    DOCUMENT_REVIEW_REPEAT: 'https://reestrpap.reestrpap.ru/product/ресертификация-уровень-инструктор-п/',
  },
  инструктор: {
    REGISTRATION: 'https://reestrpap.reestrpap.ru/product/регистрация-на-сайте-и-сбор-часов-супе-2/',
    DOCUMENT_REVIEW: 'https://reestrpap.reestrpap.ru/product/экспертиза-документов-соискателя-на/',
    EXAM_ACCESS: 'https://reestrpap.reestrpap.ru/product/экзамен-на-уровень-куратор-пап/',
    FULL_PACKAGE: 'https://reestrpap.reestrpap.ru/product/стоимость-со-скидкой-10-при-единовреме-2/',
    DOCUMENT_REVIEW_REPEAT: 'https://reestrpap.reestrpap.ru/product/ресертификация-уровень-куратор-пап/',
  },
  куратор: {
    REGISTRATION: 'https://reestrpap.reestrpap.ru/product/регистрация-на-сайте-и-сбор-часов-супе-3/',
    DOCUMENT_REVIEW: 'https://reestrpap.reestrpap.ru/product/экспертиза-документов-соискателя-на-2/',
    EXAM_ACCESS: 'https://reestrpap.reestrpap.ru/product/экзамен-на-уровень-супервизор-пап-iba/',
  },
  // супервизор → опытный — пока без ссылок
};

export function getPaymentLink(type: PaymentItem['type'], currentGroup: string): string {
  const group = currentGroup.trim().toLowerCase();
  return PAYMENT_LINKS[group]?.[type] || '#';
}
