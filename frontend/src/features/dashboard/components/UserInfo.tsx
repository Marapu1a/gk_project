// src/features/user/components/UserInfo.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';
import { Button } from '@/components/Button';
import { QualificationStatusBlock } from '@/features/certificate/components/QualificationStatusBlock';
import { UserPaymentDashboard } from '@/features/payment/components/UserPaymentDashboard';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AvatarDisplay } from '@/features/files/components/AvatarDisplay';
import { AvatarUploadModal } from '@/features/files/components/AvatarUploadModal';
import { UserSelfProfileBlock } from '@/features/user/components/UserSelfProfileBlock';
import { BioEditModal } from '@/features/user/components/BioEditModal';
import { AdminDbBackupBlock } from '@/features/backup/components/AdminDbBackupBlock';
import { TargetLevelSelector } from './TargetLevelSelector';
import { useDownloadUsersExport } from '@/features/admin/hooks/useDownloadUsersExport';
import type { TargetLevel } from '@/features/user/api/setTargetLevel';

// фиксируем тип уровня
const LEVELS = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
type Level = (typeof LEVELS)[number];

const RU_BY_LEVEL: Record<Level, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export function UserInfo() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: payments = [], isLoading: payLoading } = useUserPayments();
  const exportUsers = useDownloadUsersExport();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  if (isLoading || !user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isSupervisorLike = ['Супервизор', 'Опытный Супервизор'].includes(
    user.activeGroup?.name ?? '',
  );

  const registrationPaid =
    payments.some((p) => p.type === 'REGISTRATION' && p.status === 'PAID') ||
    payments.some((p) => p.type === 'FULL_PACKAGE' && p.status === 'PAID');

  const targetLevelName = user.targetLevel ? RU_BY_LEVEL[user.targetLevel as Level] : undefined;
  const hasTargetLevel = !!user.targetLevel;

  // 🔑 Оплата:
  // - обычные: только при выбранной цели
  // - супервизоры / опытные: всегда доступна, цель им не нужна
  const canShowPayments = isSupervisorLike || hasTargetLevel;

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h2 className="text-xl font-semibold text-blue-dark">Информация о пользователе</h2>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-3 text-sm">
        {/* Аватар */}
        <div className="flex items-start">
          <AvatarDisplay
            src={user.avatarUrl}
            alt={user.fullName}
            w="w-28"
            h="h-28"
            editable
            onClick={() => setAvatarOpen(true)}
          />
        </div>
        {avatarOpen && <AvatarUploadModal userId={user.id} onClose={() => setAvatarOpen(false)} />}

        <UserSelfProfileBlock user={user} />

        {/* === О себе === */}
        {user.bio ? (
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-blue-soft)' }}>
            <div className="text-sm text-blue-dark whitespace-pre-wrap">{user.bio}</div>
          </div>
        ) : (
          <div
            className="rounded-xl p-3 text-sm"
            style={{
              background: 'var(--color-blue-soft)',
              border: '1px solid rgba(31,48,94,0.2)',
            }}
          >
            <p>Вы можете добавить краткое описание «О себе» (до 500 символов).</p>
          </div>
        )}
        <button className="btn btn-accent mr-2" onClick={() => setBioOpen(true)}>
          {user.bio ? 'Изменить «О себе»' : 'Добавить «О себе»'}
        </button>
        {bioOpen && (
          <BioEditModal userId={user.id} initial={user.bio} onClose={() => setBioOpen(false)} />
        )}

        {isAdmin ? (
          <>
            <Button onClick={() => navigate('/admin/document-review')} className="mr-2">
              Проверка документов
            </Button>

            <Button
              onClick={() => exportUsers.mutate()}
              disabled={exportUsers.isPending}
              className="mr-2"
            >
              {exportUsers.isPending ? 'Формирую XLSX…' : 'Выгрузка пользователей (XLSX)'}
            </Button>

            <AdminDbBackupBlock />
          </>
        ) : (
          <>
            <Button onClick={() => navigate('/document-review')} className="mr-2">
              Загрузить документы на проверку
            </Button>
            <Button onClick={() => navigate('/my-certificate')}>Мой сертификат</Button>

            {/* === Выбор цели === */}
            {!isSupervisorLike && <TargetLevelSelector user={user} isAdmin={isAdmin} />}

            {/* === Статус допуска === */}
            {(() => {
              if (payLoading) return null;

              // оплаты ещё нет — показываем только подсказку про оплату
              if (!registrationPaid) {
                return (
                  <div
                    className="mt-3 rounded-xl p-3 text-sm"
                    style={{
                      background: 'var(--color-blue-soft)',
                      border: '1px solid rgba(31,48,94,0.2)',
                    }}
                  >
                    <p>
                      Доступ к сертификации откроется после оплаты{' '}
                      <strong>«Регистрация и супервизия»</strong> или{' '}
                      <strong>«Полный пакет»</strong>.
                    </p>
                  </div>
                );
              }

              // оплата есть, но цель не выбрана (и это не супервизор) → прячем большой блок
              if (!isSupervisorLike && !hasTargetLevel) {
                return (
                  <div
                    className="mt-3 rounded-xl p-3 text-sm"
                    style={{
                      background: 'var(--color-blue-soft)',
                      border: '1px solid rgba(31,48,94,0.2)',
                    }}
                  >
                    <p>
                      Выберите <strong>уровень сертификации</strong> выше, чтобы увидеть статус
                      допуска и прогресс по требованиям.
                    </p>
                  </div>
                );
              }

              // всё есть — показываем QualificationStatusBlock
              return (
                <QualificationStatusBlock
                  activeGroupName={user.activeGroup?.name}
                  targetLevel={user.targetLevel as TargetLevel}
                />
              );
            })()}

            {/* === Оплата === */}
            {canShowPayments ? (
              <UserPaymentDashboard
                activeGroupName={user.activeGroup?.name || ''}
                targetLevelName={targetLevelName}
              />
            ) : (
              <div
                className="mt-3 rounded-xl p-3 text-sm"
                style={{
                  background: 'var(--color-blue-soft)',
                  border: '1px solid rgba(31,48,94,0.2)',
                }}
              >
                <p>
                  Чтобы перейти к оплате, сначала выберите <strong>уровень сертификации</strong>{' '}
                  выше.
                </p>
              </div>
            )}
          </>
        )}
        <Button className="ml-2" onClick={logout}>
          Выйти
        </Button>
      </div>
    </div>
  );
}
