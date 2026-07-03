import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSpecialistContactMessage,
  deleteSpecialistContactMessage,
  getSpecialistContactMessages,
  markSpecialistContactMessageRead,
  type CreateSpecialistContactMessagePayload,
} from '../api/contactMessages';

export function useCreateSpecialistContactMessage(userId: string) {
  return useMutation({
    mutationFn: (payload: CreateSpecialistContactMessagePayload) =>
      createSpecialistContactMessage(userId, payload),
  });
}

export function useSpecialistContactMessages() {
  return useQuery({
    queryKey: ['specialist-contact-messages'],
    queryFn: getSpecialistContactMessages,
  });
}

export function useMarkSpecialistContactMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSpecialistContactMessageRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-contact-messages'] });
    },
  });
}

export function useDeleteSpecialistContactMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSpecialistContactMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-contact-messages'] });
    },
  });
}
