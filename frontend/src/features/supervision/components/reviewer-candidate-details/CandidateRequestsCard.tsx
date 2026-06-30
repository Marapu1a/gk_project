import { useState } from 'react';
import { format } from 'date-fns';
import type {
  ReviewerCandidateKind,
  ReviewerCandidateRequest,
} from '../../api/getReviewerCandidateDetails';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { CandidateRequestDetailsModal } from './CandidateRequestDetailsModal';
import { getSupervisionRequestDateLabel } from '../../utils/requestDateLabels';

type CandidateRequestsCardProps = {
  kind: ReviewerCandidateKind;
  title: string;
  requests: ReviewerCandidateRequest[];
};

const STATUS_LABELS: Record<ReviewerCandidateRequest['status'], string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Часы подтверждены',
  REJECTED: 'Часы отклонены',
  SPENT: 'Использовано',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'dd.MM.yyyy');
}

function statusClass(status: ReviewerCandidateRequest['status']) {
  if (status === 'REJECTED') return 'text-[#A7B1C7]';
  if (status === 'CONFIRMED') return 'text-[#1F305E]';
  return 'text-[#7F8AA3]';
}

export function CandidateRequestsCard({ kind, title, requests }: CandidateRequestsCardProps) {
  const [selectedRequest, setSelectedRequest] = useState<ReviewerCandidateRequest | null>(null);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const requestDateLabel = getSupervisionRequestDateLabel(kind);

  const sortedRequests = [...requests].sort((a, b) => {
    const aTime = new Date(a.supervisionDate ?? a.createdAt).getTime();
    const bTime = new Date(b.supervisionDate ?? b.createdAt).getTime();
    return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
  });

  return (
    <section className="rounded-[22px] bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <h2 className="dashboard-v2-title mb-7">{title}</h2>

      {requests.length === 0 ? (
        <p className="dashboard-v2-text text-[#6B7894]">Заявок пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-v2-text w-full min-w-[460px] text-[#1F305E]">
            <thead>
              <tr className="bg-[var(--color-blue-soft)] text-left">
                <th className="rounded-l-[8px] px-3 py-3 text-center font-medium">
                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
                    }
                    className="mx-auto inline-flex cursor-pointer items-center gap-1"
                  >
                    {requestDateLabel}
                    <img
                      src="/dashboard-v2/icon_sort_by.svg"
                      alt=""
                      className={`h-[12px] w-[12px] transition-transform ${
                        sortDirection === 'asc' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </th>
                <th className="px-3 py-3 text-center font-medium">Статус</th>
                <th className="w-[54px] rounded-r-[8px] px-3 py-3" />
              </tr>
            </thead>

            <tbody>
              {sortedRequests.map((request) => {
                const isRejected = request.status === 'REJECTED';

                return (
                  <tr
                    key={request.id}
                    className={`border-b border-[#DCE8EC] last:border-b-0 ${
                      isRejected ? 'text-[#A7B1C7]' : ''
                    }`}
                  >
                    <td className="px-3 py-4 text-center">
                      {formatDate(request.supervisionDate ?? request.createdAt)}
                    </td>

                    <td className="px-3 py-4">
                      {request.status === 'CONFIRMED' ? (
                        <div className="flex justify-center">
                          <span className="dashboard-v2-caption rounded-full bg-[var(--color-blue-soft)] px-3 py-1 text-[#1F305E]">
                            {STATUS_LABELS[request.status]}
                          </span>
                        </div>
                      ) : (
                        <div className={`dashboard-v2-caption text-center ${statusClass(request.status)}`}>
                          {STATUS_LABELS[request.status]}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <ActionArrowButton
                        onClick={() => setSelectedRequest(request)}
                        size={30}
                        title="Открыть детали заявки"
                        aria-label="Открыть детали заявки"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedRequest ? (
        <CandidateRequestDetailsModal
          kind={kind}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      ) : null}
    </section>
  );
}
