import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { UpdateUserPasswordModal } from './UpdateUserPasswordModal';
import { useArchiveUser, useRestoreUser } from '../hooks/useArchiveUser';
import { useToggleUserRole } from '../hooks/useToggleUserRole';
import { useUpdateUserVisibility } from '../hooks/useUpdateUserVisibility';
import { useUserActionLog } from '../hooks/useUserActionLog';

type ActionKey = 'registryVisible' | 'archived' | 'adminRole';

type Props = {
  userId: string;
  role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  isProfileVisible: boolean;
  archivedAt?: string | null;
};

const ACTION_LABELS: Record<ActionKey, string> = {
  registryVisible: 'Показывать в реестре',
  archived: 'Профиль в архиве',
  adminRole: 'Администратор',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

export function AdminAccountActionsBlock({
  userId,
  role,
  isProfileVisible,
  archivedAt,
}: Props) {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const updateVisibility = useUpdateUserVisibility(userId);
  const archiveUser = useArchiveUser();
  const restoreUser = useRestoreUser();
  const toggleRole = useToggleUserRole();

  const currentState = useMemo<Record<ActionKey, boolean>>(
    () => ({
      registryVisible: isProfileVisible,
      archived: Boolean(archivedAt),
      adminRole: role === 'ADMIN',
    }),
    [archivedAt, isProfileVisible, role],
  );

  const [selected, setSelected] = useState<Record<ActionKey, boolean>>(currentState);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: logs = [], isLoading: logsLoading } = useUserActionLog(userId, isHistoryOpen);

  useEffect(() => {
    setSelected(currentState);
  }, [currentState]);

  const pending =
    updateVisibility.isPending || archiveUser.isPending || restoreUser.isPending || toggleRole.isPending;
  const selectedActions = useMemo(
    () =>
      (Object.keys(selected) as ActionKey[]).filter((key) => selected[key] !== currentState[key]),
    [currentState, selected],
  );

  const toggleSelected = (key: ActionKey, value: boolean) => {
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const resetSelected = () => {
    setSelected(currentState);
  };

  const runAction = async (key: ActionKey) => {
    const nextValue = selected[key];
    const message =
      key === 'registryVisible'
          ? nextValue
            ? 'Вы уверены, что хотите показать профиль в реестре?'
            : 'Вы уверены, что хотите скрыть профиль из реестра?'
          : key === 'archived'
            ? nextValue
              ? 'Вы уверены, что хотите архивировать профиль?'
              : 'Вы уверены, что хотите восстановить профиль из архива?'
            : nextValue
              ? 'Вы уверены, что хотите назначить пользователя администратором?'
              : 'Вы уверены, что хотите снять права администратора?';

    const ok = await confirm({
      message,
      confirmLabel: 'Да',
      cancelLabel: 'Нет',
      variant: (key === 'archived' && nextValue) || (key === 'adminRole' && !nextValue)
        ? 'danger'
        : 'primary',
    });
    if (!ok) return false;

    if (key === 'registryVisible') {
      await updateVisibility.mutateAsync(nextValue);
      return true;
    }

    if (key === 'archived') {
      if (nextValue) {
        await archiveUser.mutateAsync({ userId });
      } else {
        await restoreUser.mutateAsync(userId);
      }
      return true;
    }

    if (key === 'adminRole') {
      await toggleRole.mutateAsync(userId);
      return true;
    }

    return false;
  };

  const onPasswordClick = async () => {
    const ok = await confirm({
      message: 'Вы уверены, что хотите сменить пароль?',
      confirmLabel: 'Да',
      cancelLabel: 'Нет',
      variant: 'primary',
    });
    if (ok) setIsPasswordOpen(true);
  };

  const onSave = async () => {
    if (!selectedActions.length) {
      toast.info('Выберите действие');
      return;
    }

    try {
      for (const key of selectedActions) {
        const applied = await runAction(key);
        if (!applied) return;
      }

      resetSelected();
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] });
      toast.success('Действия выполнены');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось выполнить действие');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(ACTION_LABELS) as ActionKey[])
            .map((key) => (
              <ActionToggle
                key={key}
                label={ACTION_LABELS[key]}
                checked={selected[key]}
                disabled={pending}
                onChange={(checked) => toggleSelected(key, checked)}
              />
            ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn dashboard-v2-action dashboard-v2-action-secondary"
              onClick={onPasswordClick}
            >
              Сменить пароль
            </button>

            <button
              type="button"
              className="btn dashboard-v2-action dashboard-v2-action-secondary"
              onClick={() => setIsHistoryOpen(true)}
            >
              История действий
            </button>
          </div>

          <button
            type="button"
            className="btn dashboard-v2-action dashboard-v2-action-primary"
            disabled={pending || !selectedActions.length}
            onClick={onSave}
          >
            Сохранить
          </button>
        </div>
      </div>

      {isPasswordOpen ? (
        <UpdateUserPasswordModal userId={userId} onClose={() => setIsPasswordOpen(false)} />
      ) : null}

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-3xl rounded-[18px] bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="dashboard-v2-title">История действий администратора</h3>
              <button
                type="button"
                className="btn"
                onClick={() => setIsHistoryOpen(false)}
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-[14px] border border-[var(--color-blue-soft)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#1F305E]" style={{ background: 'var(--color-blue-soft)' }}>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Действие</th>
                    <th className="px-3 py-2 text-left">Email администратора</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td className="px-3 py-4 text-center" colSpan={3}>Загрузка...</td>
                    </tr>
                  ) : logs.length ? (
                    logs.map((log) => (
                      <tr key={log.id} className="border-t border-[var(--color-blue-soft)]">
                        <td className="px-3 py-2 align-top">{formatDate(log.createdAt)}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="font-semibold">{log.action}</div>
                          {log.details ? (
                            <div className="mt-1 text-xs text-[#8D96B5]">{log.details}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top">{log.adminEmail}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-4 text-center text-[#8D96B5]" colSpan={3}>
                        История пока пустая.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-4 rounded-[12px] bg-white px-4 text-[15px] font-semibold text-[#1F305E]">
      <span>{label}</span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--color-green-brand)]' : 'bg-[var(--color-danger)]'
        } ${disabled ? 'opacity-55' : 'cursor-pointer'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </label>
  );
}
