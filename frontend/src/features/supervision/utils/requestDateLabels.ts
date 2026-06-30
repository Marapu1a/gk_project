export type SupervisionRequestKind = 'supervision' | 'mentorship';

export const SUPERVISION_REQUEST_DATE_LABEL = 'Дата проведения супервизии';
export const MENTORSHIP_REQUEST_DATE_LABEL = 'Дата получения наставничества (менторства)';

export function getSupervisionRequestDateLabel(kind: SupervisionRequestKind) {
  return kind === 'mentorship' ? MENTORSHIP_REQUEST_DATE_LABEL : SUPERVISION_REQUEST_DATE_LABEL;
}
