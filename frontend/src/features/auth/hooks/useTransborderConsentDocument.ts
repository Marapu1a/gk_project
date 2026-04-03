import { useQuery } from '@tanstack/react-query';
import {
  fetchTransborderConsentDocument,
  type TransborderConsentDocument,
} from '../api/consent';

export function useTransborderConsentDocument(enabled = true) {
  return useQuery<TransborderConsentDocument>({
    queryKey: ['transborder-consent-document'],
    queryFn: fetchTransborderConsentDocument,
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
