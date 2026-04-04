import { api } from '@/lib/axios';

export type ConsentItemCode =
  | 'PUBLIC_OFFER_ACCEPTED'
  | 'PD_PROCESSING_ACCEPTED'
  | 'TRANSBORDER_PD_TRANSFER'
  | 'EMAIL_MARKETING_ACCEPTED';

export type ConsentSource = 'REGISTRATION_MODAL' | 'LEGACY_MODAL';

export type ConsentDocumentLink = {
  text: string;
  href: string;
};

export type ConsentDocumentItem = {
  code: ConsentItemCode;
  label: string;
  required: boolean;
  links?: ConsentDocumentLink[];
};

export type TransborderConsentDocument = {
  type: 'TRANSBORDER_PD_TRANSFER';
  version: string;
  title: string;
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

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const created = generateClientId();
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return generateClientId();
  }
}

function generateClientId(): string {
  const cryptoObj = window.crypto as Crypto | undefined;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;
}
