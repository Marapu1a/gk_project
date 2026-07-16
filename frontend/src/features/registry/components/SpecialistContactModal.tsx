import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { getUiErrorMessage } from '@/utils/uiMessages';
import { useCreateSpecialistContactMessage } from '../hooks/useSpecialistContactMessages';
import type { SpecialistContactRequestType } from '../api/contactMessages';

type Props = {
  specialistId: string;
  specialistName: string;
  open: boolean;
  onClose: () => void;
};

const REQUEST_TYPES: Array<{ value: SpecialistContactRequestType; label: string }> = [
  { value: 'PARENT_CONSULTATION', label: 'Консультация родителя' },
  { value: 'SUPERVISION', label: 'Супервизия' },
  { value: 'QUESTION', label: 'Вопрос' },
];

function trimForm(form: {
  senderName: string;
  replyContact: string;
  requestType: SpecialistContactRequestType;
  message: string;
}) {
  return {
    senderName: form.senderName.trim(),
    replyContact: form.replyContact.trim(),
    requestType: form.requestType,
    message: form.message.trim(),
  };
}

export function SpecialistContactModal({ specialistId, specialistName, open, onClose }: Props) {
  const mutation = useCreateSpecialistContactMessage(specialistId);
  const [form, setForm] = useState({
    senderName: '',
    replyContact: '',
    requestType: 'PARENT_CONSULTATION' as SpecialistContactRequestType,
    message: '',
  });

  const payload = useMemo(() => trimForm(form), [form]);
  const canSubmit =
    payload.senderName.length >= 2 &&
    payload.replyContact.length >= 3 &&
    payload.message.length >= 10 &&
    !mutation.isPending;

  if (!open) return null;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Заполните имя, контакт для ответа и сообщение.');
      return;
    }

    try {
      await mutation.mutateAsync(payload);
      toast.success('Сообщение отправлено специалисту.');
      setForm({
        senderName: '',
        replyContact: '',
        requestType: 'PARENT_CONSULTATION',
        message: '',
      });
      onClose();
    } catch (error) {
      toast.error(getUiErrorMessage(error, 'Не удалось отправить сообщение.'));
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      ariaLabelledBy="specialist-contact-title"
      overlayClassName="z-50 bg-black/70 px-4 py-5"
      dialogClassName="relative max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[22px] bg-white px-6 py-7 shadow-soft md:px-8"
    >
        <ModalCloseButton onClick={onClose} disabled={mutation.isPending} iconClassName="h-7 w-7" />

        <h2 id="specialist-contact-title" className="mb-7 text-center text-[28px] font-extrabold leading-tight text-[var(--color-blue-dark)]">
          Связаться со специалистом
        </h2>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <label className="block">
              <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Имя</span>
              <input
                className="input-design mt-1 h-[38px]"
                value={form.senderName}
                maxLength={120}
                onChange={(event) => setForm((current) => ({ ...current, senderName: event.target.value }))}
                placeholder="Введите ваше имя"
              />
            </label>

            <label className="block">
              <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Контакт для ответа</span>
              <input
                className="input-design mt-1 h-[38px]"
                value={form.replyContact}
                maxLength={160}
                onChange={(event) => setForm((current) => ({ ...current, replyContact: event.target.value }))}
                placeholder="Укажите email или телефон"
              />
            </label>
          </div>

          <fieldset className="space-y-4">
            <legend className="dashboard-v2-label mb-2 text-[var(--color-blue-dark)]">Тип запроса</legend>
            {REQUEST_TYPES.map((type) => (
              <label key={type.value} className="flex cursor-pointer items-center gap-3 text-[15px] text-[#222]">
                <input
                  type="radio"
                  name="specialist-contact-request-type"
                  checked={form.requestType === type.value}
                  onChange={() => setForm((current) => ({ ...current, requestType: type.value }))}
                  className="h-8 w-8 cursor-pointer accent-[var(--color-blue-dark)]"
                />
                <span>{type.label}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <label className="mt-6 block">
          <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Сообщение</span>
          <textarea
            className="input-design mt-1 min-h-[142px] resize-y py-3"
            value={form.message}
            maxLength={3000}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            placeholder={`Напишите, с чем хотите обратиться к специалисту ${specialistName}`}
          />
        </label>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 md:px-20">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="btn min-h-[48px] rounded-[10px] border-2 border-[var(--color-blue-dark)] bg-white text-[16px] font-extrabold text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)] disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn btn-dark min-h-[48px] rounded-[10px] text-[16px] font-extrabold disabled:bg-[#9AA3B8]"
          >
            Отправить
          </button>
        </div>
    </ModalShell>
  );
}
