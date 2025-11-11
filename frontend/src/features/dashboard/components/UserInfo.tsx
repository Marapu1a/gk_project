// src/features/user/components/UserInfo.tsx
import { useEffect, useState } from 'react';
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
import { useSetTargetLevel } from '@/features/user/hooks/useSetTargetLevel';
import type { TargetLevel as ApiTargetLevel } from '@/features/user/api/setTargetLevel';
import { isTargetLocked } from '@/features/auth/api/me';

// 🔒 Локально фиксируем чистый тип без null
const LEVELS = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
type Level = (typeof LEVELS)[number];

const RU_BY_LEVEL: Record<Level, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

// без «Студент» цели нет, но он может быть активным
const FULL_ORDER = [
  'Студент',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

function levelIndex(lvl: Level) {
  return FULL_ORDER.indexOf(RU_BY_LEVEL[lvl] as (typeof FULL_ORDER)[number]);
}

export function UserInfo() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: payments = [], isLoading: payLoading } = useUserPayments();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  const setTarget = useSetTargetLevel(user?.id || '');
  if (isLoading || !user) return null;

  // локальное состояние: либо Level, либо пустая строка для «лесенки»
  const [selected, setSelected] = useState<Level | ''>(user.targetLevel ?? '');

  // синхронимся когда пришёл me
  useEffect(() => {
    setSelected((user.targetLevel ?? '') as Level | '');
  }, [user.targetLevel]);

  const isAdmin = user.role === 'ADMIN';
  const isSupervisorLike = ['Супервизор', 'Опытный Супервизор'].includes(
    user.activeGroup?.name ?? '',
  );
  const locked = isTargetLocked(user) && !isAdmin;

  const activeIdx = user.activeGroup
    ? FULL_ORDER.indexOf(user.activeGroup.name as (typeof FULL_ORDER)[number])
    : -1;

  // доступны только уровни строго выше активной группы
  const availableLevels: Level[] = LEVELS.filter((lvl) => levelIndex(lvl) > activeIdx);

  // если выбранный уровень стал недоступен (повышение) — сброс на «лесенку»
  useEffect(() => {
    if (selected && !availableLevels.includes(selected)) {
      setSelected('');
    }
  }, [selected, availableLevels]);

  const registrationPaid =
    payments.some((p) => p.type === 'REGISTRATION' && p.status === 'PAID') ||
    payments.some((p) => p.type === 'FULL_PACKAGE' && p.status === 'PAID');

  const targetLevelName = user.targetLevel ? RU_BY_LEVEL[user.targetLevel as Level] : undefined;
  const targetNameForBadge = targetLevelName ?? 'не выбрана (лесенка)';

  const noChange =
    (selected === '' && user.targetLevel === null) ||
    (selected !== '' && (user.targetLevel as ApiTargetLevel | null) === selected);

  const saveDisabled =
    setTarget.isPending ||
    locked ||
    noChange ||
    (selected !== '' && !availableLevels.includes(selected));

  const serverErr = (setTarget.error as any)?.response?.data?.error as string | undefined;
  const lockedMsg =
    serverErr === 'TARGET_LOCKED'
      ? 'Цель уже выбрана. Сменить можно после повышения уровня или через администратора.'
      : null;

  const selectDisabled = locked;

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
            style={{ background: 'var(--color-blue-soft)', border: '1px solid rgba(31,48,94,0.2)' }}
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
            <AdminDbBackupBlock />
          </>
        ) : (
          <>
            <Button onClick={() => navigate('/document-review')} className="mr-2">
              Загрузить документы на проверку
            </Button>
            <Button onClick={() => navigate('/my-certificate')}>Мой сертификат</Button>

            {/* === Выбор цели === */}
            {!isAdmin && !isSupervisorLike && (
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'var(--color-blue-soft)' }}
              >
                <div>
                  <strong>Текущая цель:</strong> {targetNameForBadge}
                  {locked && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      выбор заблокирован до повышения уровня
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="border rounded-md px-2 py-1"
                    value={selected}
                    onChange={(e) => {
                      const v = e.target.value as '' | Level;
                      setSelected(v === '' ? '' : (v as Level));
                    }}
                    disabled={selectDisabled}
                    title={
                      locked
                        ? 'Сменить можно после повышения уровня (или через администратора)'
                        : undefined
                    }
                  >
                    <option value="">— Лесенка —</option>
                    {availableLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {RU_BY_LEVEL[lvl]}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={() =>
                      setTarget.mutate(selected === '' ? null : (selected as ApiTargetLevel))
                    }
                    disabled={saveDisabled}
                    title={
                      locked
                        ? 'Сменить можно после повышения уровня (или через администратора)'
                        : undefined
                    }
                  >
                    Сохранить
                  </Button>

                  {setTarget.isError && (
                    <span className="text-red-600">{lockedMsg ?? 'Ошибка сохранения'}</span>
                  )}
                  {setTarget.isSuccess && <span className="text-green-600">Цель обновлена</span>}
                </div>
              </div>
            )}

            {!payLoading && (isAdmin || registrationPaid) ? (
              <QualificationStatusBlock activeGroupName={user.activeGroup?.name} />
            ) : (
              !payLoading && (
                <div
                  className="mt-3 rounded-xl p-3 text-sm"
                  style={{
                    background: 'var(--color-blue-soft)',
                    border: '1px solid rgba(31,48,94,0.2)',
                  }}
                >
                  <p>
                    Доступ к сертификации откроется после оплаты{' '}
                    <strong>«Регистрация и супервизия»</strong> или <strong>«Полный пакет»</strong>.
                  </p>
                </div>
              )
            )}

            <UserPaymentDashboard
              activeGroupName={user.activeGroup?.name || ''}
              targetLevelName={targetLevelName}
            />
          </>
        )}

        <Button onClick={logout}>Выйти</Button>
      </div>
    </div>
  );
}
