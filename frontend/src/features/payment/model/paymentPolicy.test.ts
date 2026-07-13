import { describe, expect, it } from 'vitest';
import type { PaymentStatus, PaymentType } from '../api/getUserPayments';
import {
  areRequiredPaymentsPaid,
  findPaymentForTarget,
  getRequiredPaymentTypes,
  getVisiblePaymentTypes,
  hasCertificationAccessPayment,
  isDocumentReviewPaymentCovered,
} from './paymentPolicy';

const payment = (
  type: PaymentType,
  status: PaymentStatus = 'PAID',
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null = null,
) => ({ type, status, targetLevel });

describe('paymentPolicy', () => {
  it('matches backend requirements for regular certification targets', () => {
    expect(getRequiredPaymentTypes('CERTIFICATION', 'CURATOR')).toEqual([
      'REGISTRATION',
      'DOCUMENT_REVIEW',
      'EXAM_ACCESS',
    ]);
    expect(
      areRequiredPaymentsPaid(
        [payment('REGISTRATION'), payment('DOCUMENT_REVIEW'), payment('EXAM_ACCESS')],
        'CERTIFICATION',
        'CURATOR',
      ),
    ).toBe(true);
  });

  it('does not require a separate registration payment for supervisor certification', () => {
    expect(getRequiredPaymentTypes('CERTIFICATION', 'SUPERVISOR')).toEqual([
      'DOCUMENT_REVIEW',
      'EXAM_ACCESS',
    ]);
    expect(
      areRequiredPaymentsPaid(
        [payment('DOCUMENT_REVIEW'), payment('EXAM_ACCESS')],
        'CERTIFICATION',
        'SUPERVISOR',
      ),
    ).toBe(true);
  });

  it('lets a paid full package cover certification but not renewal', () => {
    const payments = [payment('FULL_PACKAGE')];

    expect(areRequiredPaymentsPaid(payments, 'CERTIFICATION', 'INSTRUCTOR')).toBe(true);
    expect(areRequiredPaymentsPaid(payments, 'RENEWAL', 'INSTRUCTOR')).toBe(false);
  });

  it('requires only the renewal payment for renewal readiness', () => {
    expect(getRequiredPaymentTypes('RENEWAL', 'SUPERVISOR')).toEqual(['RENEWAL']);
    expect(areRequiredPaymentsPaid([payment('RENEWAL')], 'RENEWAL', 'SUPERVISOR')).toBe(true);
  });

  it('does not use a paid renewal from another target level', () => {
    const payments = [
      payment('RENEWAL', 'PAID', 'INSTRUCTOR'),
      payment('RENEWAL', 'UNPAID', 'CURATOR'),
    ];

    expect(areRequiredPaymentsPaid(payments, 'RENEWAL', 'CURATOR')).toBe(false);
    expect(areRequiredPaymentsPaid(payments, 'RENEWAL', 'INSTRUCTOR')).toBe(true);
  });

  it('selects the current target payment before a legacy fallback', () => {
    const payments = [
      payment('FULL_PACKAGE', 'PAID', null),
      payment('FULL_PACKAGE', 'UNPAID', 'CURATOR'),
      payment('FULL_PACKAGE', 'PENDING', 'INSTRUCTOR'),
    ];

    expect(findPaymentForTarget(payments, 'FULL_PACKAGE', 'CURATOR')?.status).toBe('UNPAID');
    expect(findPaymentForTarget(payments, 'FULL_PACKAGE', 'SUPERVISOR')?.targetLevel).toBeNull();
  });

  it('keeps document review free for renewal and covered by the full package', () => {
    expect(isDocumentReviewPaymentCovered([], 'RENEWAL')).toBe(true);
    expect(isDocumentReviewPaymentCovered([payment('FULL_PACKAGE')], 'CERTIFICATION')).toBe(true);
    expect(isDocumentReviewPaymentCovered([], 'CERTIFICATION')).toBe(false);
  });

  it('preserves the current entry-payment rule for certification content', () => {
    expect(
      hasCertificationAccessPayment(
        [payment('DOCUMENT_REVIEW')],
        'CERTIFICATION',
        'SUPERVISOR',
      ),
    ).toBe(true);
    expect(
      hasCertificationAccessPayment(
        [payment('DOCUMENT_REVIEW')],
        'CERTIFICATION',
        'CURATOR',
      ),
    ).toBe(false);
    expect(hasCertificationAccessPayment([], 'RENEWAL', 'CURATOR')).toBe(true);
  });

  it('hides the linked registration row for supervisor certification', () => {
    expect(getVisiblePaymentTypes('CERTIFICATION', 'SUPERVISOR')).toEqual([
      'FULL_PACKAGE',
      'DOCUMENT_REVIEW',
      'EXAM_ACCESS',
    ]);
  });
});
