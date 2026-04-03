import { api } from '@/lib/axios';

export type ConsentItemCode =
  | 'PRIVACY_POLICY_ACK'
  | 'TRANSBORDER_PD_TRANSFER';

export type ConsentSource = 'REGISTRATION_MODAL' | 'LEGACY_MODAL';

export type ConsentDocumentItem = {
  code: ConsentItemCode;
  label: string;
  required: boolean;
  link?: string;
};

export type TransborderConsentDocument = {
  type: 'TRANSBORDER_PD_TRANSFER';
  version: string;
  title: string;
  fullText: string;
  items: ConsentDocumentItem[];
};

export type AcceptTransborderConsentPayload = {
  source: ConsentSource;
  acceptedItems: Record<ConsentItemCode, boolean>;
};

export type AcceptTransborderConsentResponse = {
  success: boolean;
  alreadyAccepted: boolean;
  consentId: string;
  documentType: 'TRANSBORDER_PD_TRANSFER';
  documentVersion: string;
  consentedAt: string;
};

export async function fetchTransborderConsentDocument(): Promise<TransborderConsentDocument> {
  const { data } = await api.get('/auth/consent/transborder/document');
  return data;
}

export async function acceptTransborderConsent(
  payload: AcceptTransborderConsentPayload,
): Promise<AcceptTransborderConsentResponse> {
  const { data } = await api.post('/auth/consent/transborder', payload, {
    headers: {
      'x-client-id': getOrCreateClientId(),
    },
  });

  return data;
}

function getOrCreateClientId(): string {
  const storageKey = 'client_id';
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}
