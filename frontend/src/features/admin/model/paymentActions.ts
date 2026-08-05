import type { PaymentStatus, PaymentType } from '@/features/payment/api/getUserPayments';

export type AdminPaymentNextStatus = 'PAID' | 'UNPAID';

type PaymentActionInput = {
  type: PaymentType;
  status: PaymentStatus;
};

type PaymentActionContext = {
  managedByPackage: boolean;
  hasPaidSeparatePayment: boolean;
};

export function getAdminPaymentActions(
  payment: PaymentActionInput,
  context: PaymentActionContext,
): AdminPaymentNextStatus[] {
  if (context.managedByPackage) return [];

  if (payment.status === 'PAID') return ['UNPAID'];

  const packageConfirmationBlocked =
    payment.type === 'FULL_PACKAGE' && context.hasPaidSeparatePayment;

  if (payment.status === 'PENDING') {
    return packageConfirmationBlocked ? ['UNPAID'] : ['PAID', 'UNPAID'];
  }

  return packageConfirmationBlocked ? [] : ['PAID'];
}
