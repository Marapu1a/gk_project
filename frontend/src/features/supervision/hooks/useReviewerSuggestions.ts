import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getReviewerSuggestions,
  type ReviewerSuggestionsResponse,
} from '../api/getReviewerSuggestions';

type Params = {
  search: string;
  supervision: 'practice' | 'mentor';
  limit?: number;
};

export function useReviewerSuggestions({ search, supervision, limit = 20 }: Params) {
  const normalizedSearch = search.trim();

  return useQuery<ReviewerSuggestionsResponse, Error>({
    queryKey: ['reviewer-suggestions', normalizedSearch, supervision, limit],
    queryFn: () =>
      getReviewerSuggestions({
        search: normalizedSearch,
        supervision,
        limit,
      }),
    enabled: normalizedSearch.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
