import { api } from '@/lib/axios';

export type ReviewerSuggestion = {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  groups: { id: string; name: string }[];
};

export type ReviewerSuggestionsResponse = {
  users: ReviewerSuggestion[];
};

export async function getReviewerSuggestions(params: {
  search: string;
  supervision: 'practice' | 'mentor';
  limit?: number;
}): Promise<ReviewerSuggestionsResponse> {
  const { data } = await api.get('/users/reviewers', { params });
  return data as ReviewerSuggestionsResponse;
}
