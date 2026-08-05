import { describe, expect, it } from 'vitest';
import { getAdminPaymentActions } from './paymentActions';

describe('getAdminPaymentActions', () => {
  it('allows an admin to either confirm or cancel a pending payment', () => {
    expect(
      getAdminPaymentActions(
        { type: 'DOCUMENT_REVIEW', status: 'PENDING' },
        { managedByPackage: false, hasPaidSeparatePayment: false },
      ),
    ).toEqual(['PAID', 'UNPAID']);
  });

  it('allows canceling a pending package when a separate payment is already paid', () => {
    expect(
      getAdminPaymentActions(
        { type: 'FULL_PACKAGE', status: 'PENDING' },
        { managedByPackage: false, hasPaidSeparatePayment: true },
      ),
    ).toEqual(['UNPAID']);
  });

  it('does not allow activating an unpaid package when a separate payment is already paid', () => {
    expect(
      getAdminPaymentActions(
        { type: 'FULL_PACKAGE', status: 'UNPAID' },
        { managedByPackage: false, hasPaidSeparatePayment: true },
      ),
    ).toEqual([]);
  });

  it('keeps child payments locked while the package is active', () => {
    expect(
      getAdminPaymentActions(
        { type: 'DOCUMENT_REVIEW', status: 'PAID' },
        { managedByPackage: true, hasPaidSeparatePayment: false },
      ),
    ).toEqual([]);
  });
});
