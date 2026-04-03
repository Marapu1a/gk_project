import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acceptTransborderConsent,
  type AcceptTransborderConsentPayload,
  type AcceptTransborderConsentResponse,
} from '../api/consent';

export function useAcceptTransborderConsent() {
  const queryClient = useQueryClient();

  return useMutation<AcceptTransborderConsentResponse, Error, AcceptTransborderConsentPayload>({
    mutationFn: acceptTransborderConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
