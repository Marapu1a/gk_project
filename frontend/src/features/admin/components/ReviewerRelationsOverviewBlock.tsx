import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { Link, useNavigate } from 'react-router-dom';

type RelationKind = 'SUPERVISION' | 'MENTORSHIP';
type RelationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

type Relation = {
  id: string;
  kind: RelationKind;
  status: RelationStatus;
  createdAt: string;
  candidate: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

type Props = {
  reviewerEmail: string;
  activeGroupName: string | null;
  relations: Relation[];
};

const STATUS_LABELS: Record<RelationStatus, string> = {
  ACCEPTED: 'Сотрудничество подтверждено',
  PENDING: 'Ожидает подтверждения',
  REJECTED: 'Сотрудничество отклонено',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function candidateName(name?: string | null) {
  const value = name?.trim();
  if (!value) return ['—', ''];

  const parts = value.split(/\s+/);
  if (parts.length <= 1) return [value, ''];

  return [parts[0], parts.slice(1).join(' ')];
}

function statusClass(status: RelationStatus) {
  if (status === 'ACCEPTED') return 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]';
  if (status === 'REJECTED') return 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]';
  return 'bg-[#FFF0C2] text-[#8A6200]';
}

function reviewUrl(kind: 'supervision' | 'mentorship', reviewerEmail: string) {
  const params = new URLSearchParams({
    kind,
    reviewerSearch: reviewerEmail,
  });

  return `/admin/supervision-candidates?${params.toString()}`;
}

function RelationsCard({
  title,
  kind,
  reviewerEmail,
  relations,
}: {
  title: string;
  kind: 'supervision' | 'mentorship';
  reviewerEmail: string;
  relations: Relation[];
}) {
  const navigate = useNavigate();
  const to = reviewUrl(kind, reviewerEmail);

  return (
    <section className="rounded-[18px] bg-white px-5 py-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="dashboard-v2-title">{title}</h2>
        <Link
          to={to}
          className="btn min-h-[34px] rounded-full border border-[#8D96B5] bg-white px-4 text-[13px] font-extrabold text-[#6B7894] transition hover:bg-[var(--color-blue-soft)] hover:text-[var(--color-blue-dark)]"
        >
          История
        </Link>
      </div>

      {relations.length === 0 ? (
        <p className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 text-[14px] font-semibold text-[#8D96B5]">
          Связей пока нет.
        </p>
      ) : (
        <div className="overflow-hidden">
          <div className="grid grid-cols-[42px_minmax(0,1.2fr)_minmax(0,1.15fr)_120px_150px] items-center rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-[12px] font-semibold text-[var(--color-blue-dark)]">
            <span />
            <span>ФИО</span>
            <span>Email</span>
            <span>Дата связи</span>
            <span>Статус</span>
          </div>

          <div>
            {relations.map((relation) => {
              const [surname, restName] = candidateName(relation.candidate.fullName);

              return (
                <div
                  key={relation.id}
                  className={`grid grid-cols-[42px_minmax(0,1.2fr)_minmax(0,1.15fr)_120px_150px] items-center border-b border-[var(--color-blue-soft)] px-4 py-3 text-[13px] last:border-b-0 ${
                    relation.status === 'REJECTED' ? 'text-[#8D96B5]' : 'text-[var(--color-blue-dark)]'
                  }`}
                >
                  <ActionArrowButton
                    onClick={() => navigate(to)}
                    aria-label={`Открыть проверку часов: ${relation.candidate.email}`}
                  />
                  <div className="min-w-0">
                    <AdminUserNameLink
                      userId={relation.candidate.id}
                      fullName={relation.candidate.fullName}
                      email={relation.candidate.email}
                      className="block min-w-0"
                    >
                      <span className="block font-extrabold leading-tight">{surname}</span>
                      {restName ? <span className="block leading-tight">{restName}</span> : null}
                    </AdminUserNameLink>
                  </div>
                  <div className="min-w-0 truncate" title={relation.candidate.email}>
                    {relation.candidate.email}
                  </div>
                  <div>{formatDate(relation.createdAt)}</div>
                  <div>
                    <span
                      className={`inline-flex min-h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold ${statusClass(relation.status)}`}
                    >
                      {STATUS_LABELS[relation.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function ReviewerRelationsOverviewBlock({
  reviewerEmail,
  activeGroupName,
  relations,
}: Props) {
  const isSupervisor = activeGroupName === 'Супервизор';
  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';

  if (!isSupervisor && !isExperiencedSupervisor) return null;

  const supervisionRelations = relations.filter((relation) => relation.kind === 'SUPERVISION');
  const mentorshipRelations = relations.filter((relation) => relation.kind === 'MENTORSHIP');

  return (
    <div className="space-y-4">
      <RelationsCard
        title="Кандидаты: супервизия"
        kind="supervision"
        reviewerEmail={reviewerEmail}
        relations={supervisionRelations}
      />

      {isExperiencedSupervisor ? (
        <RelationsCard
          title="Кандидаты: менторство"
          kind="mentorship"
          reviewerEmail={reviewerEmail}
          relations={mentorshipRelations}
        />
      ) : null}
    </div>
  );
}
