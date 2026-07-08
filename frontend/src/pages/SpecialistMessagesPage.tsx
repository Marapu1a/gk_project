import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageNav } from '@/components/PageNav';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import {
  useDeleteSpecialistContactMessage,
  useMarkSpecialistContactMessageRead,
  useSpecialistContactMessages,
} from '@/features/registry/hooks/useSpecialistContactMessages';
import type {
  SpecialistContactMessage,
  SpecialistContactRequestType,
} from '@/features/registry/api/contactMessages';

const REQUEST_TYPE_LABELS: Record<SpecialistContactRequestType, string> = {
  PARENT_CONSULTATION: 'Консультация родителя',
  SUPERVISION: 'Супервизия',
  QUESTION: 'Вопрос',
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SpecialistMessagesPage() {
  const { data, isLoading } = useSpecialistContactMessages();
  const markRead = useMarkSpecialistContactMessageRead();
  const deleteMessage = useDeleteSpecialistContactMessage();
  const { confirm } = useConfirm();
  const [selected, setSelected] = useState<SpecialistContactMessage | null>(null);

  const messages = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [messages],
  );

  const openMessage = async (message: SpecialistContactMessage) => {
    setSelected(message);

    if (!message.isRead) {
      try {
        await markRead.mutateAsync(message.id);
      } catch {
        toast.error('Не удалось отметить сообщение прочитанным.');
      }
    }
  };

  const handleDelete = async (message: SpecialistContactMessage) => {
    const ok = await confirm({
      title: 'Удалить сообщение?',
      message: 'Сообщение будет удалено из списка обращений.',
      confirmLabel: 'Да, удалить',
      cancelLabel: 'Нет',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteMessage.mutateAsync(message.id);
      if (selected?.id === message.id) setSelected(null);
      toast.success('Сообщение удалено.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить сообщение.');
    }
  };

  return (
    <main className="container-fixed mx-auto w-full px-2 py-8 text-blue-dark md:px-6">
      <div className="mb-6">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="text-center text-[24px] font-extrabold leading-tight text-blue-dark">
            Сообщения специалисту
          </h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="hidden grid-cols-[auto_1fr] items-center gap-4 sm:grid">
          <PageNav />
          <h1 className="text-center text-[24px] font-extrabold leading-tight text-blue-dark">
            Сообщения специалисту
          </h1>
        </div>
      </div>

      <section className="card-section shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="dashboard-v2-title">Обращения из реестра</h2>
            <p className="dashboard-v2-text mt-1 text-[#8D96B5]">
              Здесь появляются первые сообщения от посетителей реестра.
            </p>
          </div>

          {unreadCount > 0 && (
            <span className="badge badge-danger min-w-[32px] justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="rounded-[12px] bg-[#F5F7FB] px-5 py-8 text-center text-[#8D96B5]">
              Загрузка сообщений...
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="rounded-[12px] bg-[#F5F7FB] px-5 py-8 text-center text-[#8D96B5]">
              Сообщений пока нет.
            </div>
          ) : (
            <>
              {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
              <div className="hidden overflow-hidden rounded-[12px] border border-[var(--color-blue-soft)] lg:block">
                <div className="grid grid-cols-[minmax(150px,1.2fr)_minmax(170px,1.1fr)_minmax(150px,1fr)_150px_150px] bg-[#E5EFF1] px-4 py-3 text-[15px] font-medium">
                  <span>Отправитель</span>
                  <span>Контакт для ответа</span>
                  <span>Тип запроса</span>
                  <span>Дата</span>
                  <span className="text-center">Действие</span>
                </div>

                {sortedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`grid grid-cols-[minmax(150px,1.2fr)_minmax(170px,1.1fr)_minmax(150px,1fr)_150px_150px] items-center gap-0 border-t border-[var(--color-blue-soft)] px-4 py-3 text-[15px] ${
                      message.isRead ? 'bg-white' : 'bg-[#F4FAFB]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!message.isRead && (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-danger)]" />
                        )}
                        <span className="truncate font-semibold">{message.senderName}</span>
                      </div>
                    </div>

                    <span className="min-w-0 truncate text-[#1F305E]" title={message.replyContact}>
                      {message.replyContact}
                    </span>
                    <span>{REQUEST_TYPE_LABELS[message.requestType]}</span>
                    <span className="text-[#8D96B5]">{formatDateTime(message.createdAt)}</span>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openMessage(message)}
                        className="btn h-[34px] rounded-full border border-[var(--color-blue-dark)] px-4 text-[14px] font-medium text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)]"
                      >
                        Открыть
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(message)}
                        disabled={deleteMessage.isPending}
                        className="btn h-[34px] w-[34px] rounded-full border border-[var(--color-danger)] text-[var(--color-danger)] transition hover:bg-[rgba(255,83,100,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Удалить сообщение"
                        aria-label="Удалить сообщение"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Мобильная версия — карточки вместо таблицы */}
              <div className="space-y-3 lg:hidden">
                {sortedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-[12px] border border-[var(--color-blue-soft)] px-4 py-3 text-[15px] ${
                      message.isRead ? 'bg-white' : 'bg-[#F4FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!message.isRead && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-danger)]" />
                      )}
                      <span className="min-w-0 truncate font-semibold">{message.senderName}</span>
                    </div>

                    <div className="mt-1 min-w-0 truncate text-[#1F305E]" title={message.replyContact}>
                      {message.replyContact}
                    </div>

                    <div className="mt-1 text-[#8D96B5]">
                      {REQUEST_TYPE_LABELS[message.requestType]} · {formatDateTime(message.createdAt)}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openMessage(message)}
                        className="btn h-[34px] flex-1 rounded-full border border-[var(--color-blue-dark)] px-4 text-[14px] font-medium text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)]"
                      >
                        Открыть
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(message)}
                        disabled={deleteMessage.isPending}
                        className="btn h-[34px] w-[34px] shrink-0 rounded-full border border-[var(--color-danger)] text-[var(--color-danger)] transition hover:bg-[rgba(255,83,100,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Удалить сообщение"
                        aria-label="Удалить сообщение"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {selected && (
        <MessageDetailsModal message={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function MessageDetailsModal({
  message,
  onClose,
}: {
  message: SpecialistContactMessage;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Закрыть сообщение"
      />

      <section className="relative z-10 max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[22px] bg-white px-6 py-7 shadow-soft md:px-8">
        <ModalCloseButton onClick={onClose} label="Закрыть сообщение" iconClassName="h-7 w-7" />

        <h2 className="mb-6 text-center text-[26px] font-extrabold leading-tight text-[var(--color-blue-dark)]">
          Сообщение из реестра
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoCell label="Отправитель" value={message.senderName} />
          <InfoCell label="Контакт для ответа" value={message.replyContact} />
          <InfoCell label="Тип запроса" value={REQUEST_TYPE_LABELS[message.requestType]} />
          <InfoCell label="Получено" value={formatDateTime(message.createdAt)} />
        </div>

        <div className="mt-5 rounded-[12px] bg-[#F5F7FB] px-4 py-4">
          <div className="dashboard-v2-label mb-2 text-[#8D96B5]">Сообщение</div>
          <p className="whitespace-pre-wrap text-[16px] leading-[1.45] text-[var(--color-blue-dark)]">
            {message.message}
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#E5EFF1] px-4 py-3">
      <div className="dashboard-v2-label text-[#8D96B5]">{label}</div>
      <div className="mt-1 break-words text-[16px] font-semibold text-[var(--color-blue-dark)]">
        {value || '—'}
      </div>
    </div>
  );
}
