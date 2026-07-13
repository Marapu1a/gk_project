import type {
  PaymentItem,
  PaymentStatus,
  PaymentTargetLevel,
  PaymentType,
} from '../api/getUserPayments';

export type PaymentCycleType = 'CERTIFICATION' | 'RENEWAL';

export const CERTIFICATION_PAYMENT_TYPES: PaymentType[] = [
  'FULL_PACKAGE',
  'REGISTRATION',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
];

const BUNDLED_PAYMENT_TYPES: PaymentType[] = [
  'REGISTRATION',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
];

type PaymentLike = Pick<PaymentItem, 'type' | 'status'> & {
  targetLevel?: PaymentTargetLevel;
};

function belongsToTarget(
  payment: PaymentLike,
  targetLevel: PaymentTargetLevel | undefined,
): boolean {
  if (targetLevel === undefined) return true;
  return payment.targetLevel == null || payment.targetLevel === targetLevel;
}

export function hasPaymentStatus(
  payments: readonly PaymentLike[],
  type: PaymentType,
  status: PaymentStatus = 'PAID',
  targetLevel?: PaymentTargetLevel,
): boolean {
  return payments.some(
    (payment) =>
      payment.type === type &&
      payment.status === status &&
      belongsToTarget(payment, targetLevel),
  );
}

export function findPaymentForTarget<T extends PaymentLike>(
  payments: readonly T[],
  type: PaymentType,
  targetLevel?: PaymentTargetLevel,
): T | undefined {
  if (targetLevel === undefined) {
    return payments.find((payment) => payment.type === type);
  }

  const exactPayment = payments.find(
    (payment) => payment.type === type && payment.targetLevel === targetLevel,
  );
  if (exactPayment || targetLevel === null) return exactPayment;

  return payments.find(
    (payment) => payment.type === type && payment.targetLevel == null,
  );
}

export function isFullPackageActive(
  payments: readonly PaymentLike[],
  targetLevel?: PaymentTargetLevel,
): boolean {
  return payments.some(
    (payment) =>
      payment.type === 'FULL_PACKAGE' &&
      (payment.status === 'PENDING' || payment.status === 'PAID') &&
      belongsToTarget(payment, targetLevel),
  );
}

export function hasPaidSeparatePayment(
  payments: readonly PaymentLike[],
  targetLevel?: PaymentTargetLevel,
): boolean {
  return payments.some(
    (payment) =>
      BUNDLED_PAYMENT_TYPES.includes(payment.type) &&
      payment.status === 'PAID' &&
      belongsToTarget(payment, targetLevel),
  );
}

export function getRequiredPaymentTypes(
  cycleType: PaymentCycleType,
  targetLevel: PaymentTargetLevel,
): PaymentType[] {
  if (cycleType === 'RENEWAL') return ['RENEWAL'];
  if (targetLevel === 'SUPERVISOR') return ['DOCUMENT_REVIEW', 'EXAM_ACCESS'];
  return ['REGISTRATION', 'DOCUMENT_REVIEW', 'EXAM_ACCESS'];
}

export function getVisiblePaymentTypes(
  cycleType: PaymentCycleType,
  targetLevel: PaymentTargetLevel,
): PaymentType[] {
  if (cycleType === 'RENEWAL') return ['RENEWAL'];
  if (targetLevel === 'SUPERVISOR') {
    return CERTIFICATION_PAYMENT_TYPES.filter((type) => type !== 'REGISTRATION');
  }
  return CERTIFICATION_PAYMENT_TYPES;
}

export function areRequiredPaymentsPaid(
  payments: readonly PaymentLike[],
  cycleType: PaymentCycleType,
  targetLevel: PaymentTargetLevel,
): boolean {
  if (
    cycleType === 'CERTIFICATION' &&
    hasPaymentStatus(payments, 'FULL_PACKAGE', 'PAID', targetLevel)
  ) {
    return true;
  }

  return getRequiredPaymentTypes(cycleType, targetLevel).every((type) =>
    hasPaymentStatus(payments, type, 'PAID', targetLevel),
  );
}

export function isDocumentReviewPaymentCovered(
  payments: readonly PaymentLike[],
  cycleType: PaymentCycleType,
  targetLevel?: PaymentTargetLevel,
): boolean {
  return (
    cycleType === 'RENEWAL' ||
    hasPaymentStatus(payments, 'FULL_PACKAGE', 'PAID', targetLevel) ||
    hasPaymentStatus(payments, 'DOCUMENT_REVIEW', 'PAID', targetLevel)
  );
}

export function hasCertificationAccessPayment(
  payments: readonly PaymentLike[],
  cycleType: PaymentCycleType,
  targetLevel: PaymentTargetLevel,
): boolean {
  if (cycleType === 'RENEWAL') return true;
  if (hasPaymentStatus(payments, 'FULL_PACKAGE', 'PAID', targetLevel)) return true;

  return targetLevel === 'SUPERVISOR'
    ? hasPaymentStatus(payments, 'DOCUMENT_REVIEW', 'PAID', targetLevel)
    : hasPaymentStatus(payments, 'REGISTRATION', 'PAID', targetLevel);
}

export function resolveBillingGroup(
  targetLevelName?: string,
  activeGroupName?: string,
): string {
  if (targetLevelName === 'Инструктор') return 'соискатель';
  if (targetLevelName === 'Куратор') return 'инструктор';
  if (targetLevelName === 'Супервизор') return 'куратор';

  if (activeGroupName === 'Соискатель') return 'соискатель';
  if (activeGroupName === 'Инструктор') return 'инструктор';
  if (activeGroupName === 'Куратор') return 'куратор';

  return '';
}
