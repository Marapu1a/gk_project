import { api } from '@/lib/axios';

export type SpecialistContactRequestType = 'PARENT_CONSULTATION' | 'SUPERVISION' | 'QUESTION';

export type CreateSpecialistContactMessagePayload = {
  senderName: string;
  replyContact: string;
  requestType: SpecialistContactRequestType;
  message: string;
};

export type SpecialistContactMessage = {
  id: string;
  specialistId: string;
  senderName: string;
  replyContact: string;
  requestType: SpecialistContactRequestType;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SpecialistContactMessagesResponse = {
  items: SpecialistContactMessage[];
  unreadCount: number;
};

export async function createSpecialistContactMessage(
  userId: string,
  payload: CreateSpecialistContactMessagePayload,
) {
  const res = await api.post(`/registry/${userId}/contact`, payload);
  return res.data as { id: string };
}

export async function getSpecialistContactMessages() {
  const res = await api.get('/specialist-contact-messages');
  return res.data as SpecialistContactMessagesResponse;
}

export async function markSpecialistContactMessageRead(id: string) {
  await api.patch(`/specialist-contact-messages/${id}/read`);
}

export async function deleteSpecialistContactMessage(id: string) {
  await api.delete(`/specialist-contact-messages/${id}`);
}
