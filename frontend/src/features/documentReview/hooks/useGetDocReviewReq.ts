import { useQuery } from '@tanstack/react-query';
import { getDocReviewReq } from '../api/getDocReviewReq';

export function useGetDocReviewReq() {
  return useQuery({
    queryKey: ['docReviewReq'],
    queryFn: getDocReviewReq,
  });
}
