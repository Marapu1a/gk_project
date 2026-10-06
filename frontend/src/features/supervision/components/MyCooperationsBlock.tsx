import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ModalShell } from '@/components/ModalShell';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { api } from '@/lib/axios';
import { getUiErrorMessage } from '@/utils/uiMessages';
import { useFinishCooperation } from '../hooks/useFinishCooperation';

type Cooperation = {
  id: string;
  kind: 'SUPERVISION' | 'MENTORSHIP';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ENDED';
  createdAt: string;
  endedAt: string | null;
  endReason: string | null;
  endedByLabel: string | null;
  reviewer: { fullName: string | null; email: string };
};

const statusLabel: Record<Cooperation['status'], string> = {
  PENDING: 'Ожидает подтверждения',
  ACCEPTED: 'Сотрудничество активно',
  REJECTED: 'Сотрудничество отклонено',
  ENDED: 'Сотрудничество завершено',
};

export function MyCooperationsBlock() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { confirm } = useConfirm();
  const finish = useFinishCooperation();
  const { data, isLoading } = useQuery({
    queryKey: ['supervision', 'cooperations', 'mine'],
    queryFn: async () => (await api.get<{ items: Cooperation[] }>('/supervision/cooperations/mine')).data,
  });
  const items = data?.items ?? [];
  const current = items.filter((item) => item.status === 'ACCEPTED' || item.status === 'PENDING');
  const history = items.filter((item) => item.status === 'ENDED' || item.status === 'REJECTED');
  if (isLoading || !items.length) return null;

  const onFinish = async (relation: Cooperation) => {
    const ok = await confirm({
      title: 'Завершить сотрудничество?',
      message: `Завершить сотрудничество с ${relation.reviewer.fullName || relation.reviewer.email}?`,
      description: 'Непроверенные заявки этому специалисту будут отменены. Подтверждённые часы останутся в истории.',
      confirmLabel: 'Завершить',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const result = await finish.mutateAsync(relation.id);
      toast.success(result.cancelledHours
        ? `Сотрудничество завершено. Отменено заявок часов: ${result.cancelledHours}.`
        : 'Сотрудничество завершено.');
    } catch (error) {
      toast.error(getUiErrorMessage(error, 'Не удалось завершить сотрудничество. Обновите страницу и попробуйте ещё раз.'));
    }
  };

  return (
    <section className="mt-5 rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <h2 className="text-[18px] font-extrabold text-[#1F305E]">Сотрудничество с проверяющими</h2>
      {current.length ? <div className="mt-3 space-y-3">
        {current.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#DCE8EC] p-3">
            <div className="text-[14px] text-[#1F305E]">
              <div className="font-semibold">{item.reviewer.fullName || item.reviewer.email}</div>
              <div>{item.kind === 'MENTORSHIP' ? 'Менторство' : 'Супервизия'} · {statusLabel[item.status]}</div>
              <div className="text-[#6B7894]">Начато {new Date(item.createdAt).toLocaleDateString('ru-RU')}</div>
              {item.endedAt ? <div className="text-[#6B7894]">Завершено {new Date(item.endedAt).toLocaleDateString('ru-RU')}{item.endedByLabel ? ` · ${item.endedByLabel}` : ''}</div> : null}
            </div>
            {item.status === 'ACCEPTED' ? (
              <button type="button" className="btn rounded-full border border-[#1F305E] px-4 py-2 text-[#1F305E]" disabled={finish.isPending} onClick={() => onFinish(item)}>
                Завершить
              </button>
            ) : null}
          </div>
        ))}
      </div> : null}
      {history.length ? (
        <button type="button" onClick={() => setHistoryOpen(true)} className="mt-3 text-[14px] font-semibold text-[#1F305E] underline underline-offset-4 hover:text-[#526C9D]">
          История сотрудничества · {history.length} — Показать
        </button>
      ) : null}
      {historyOpen ? (
        <ModalShell
          onClose={() => setHistoryOpen(false)}
          ariaLabelledBy="cooperation-history-title"
          overlayClassName="z-50 bg-black/70 px-4 py-6"
          dialogClassName="relative max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
        >
          <ModalCloseButton onClick={() => setHistoryOpen(false)} />
          <h3 id="cooperation-history-title" className="mb-5 pr-10 text-center text-[18px] font-extrabold text-[#1F305E]">
            История сотрудничества
          </h3>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-[10px] border border-[#DCE8EC] px-4 py-3 text-[14px] text-[#1F305E]">
                <div className="font-semibold">{item.reviewer.fullName || item.reviewer.email}</div>
                <div>{item.kind === 'MENTORSHIP' ? 'Менторство' : 'Супервизия'} · {statusLabel[item.status]}</div>
                <div className="text-[#6B7894]">Начато {new Date(item.createdAt).toLocaleDateString('ru-RU')}</div>
                {item.endedAt ? <div className="text-[#6B7894]">Завершено {new Date(item.endedAt).toLocaleDateString('ru-RU')}{item.endedByLabel ? ` · ${item.endedByLabel}` : ''}</div> : null}
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}
