import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useUserCEUMatrix } from '../hooks/ceu/useUserCEUMatrix';
import { useUpdateUserCEUMatrix } from '../hooks/ceu/useUpdateUserCEUMatrix';
import type { CEUCategory } from '../api/ceu/getUserCEUMatrix';
import { AdminNotifyChoiceModal } from './AdminNotifyChoiceModal';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

const CATEGORIES: Array<{ key: CEUCategory; label: string; requiredKey: RequiredKey }> = [
  { key: 'ETHICS', label: 'Этика', requiredKey: 'ethics' },
  { key: 'SUPERVISION', label: 'Супервизия', requiredKey: 'supervision' },
  { key: 'CULTURAL_DIVERSITY', label: 'Культурное разнообразие', requiredKey: 'cultDiver' },
  { key: 'GENERAL', label: 'Общие баллы', requiredKey: 'general' },
];

type RequiredKey = 'ethics' | 'supervision' | 'cultDiver' | 'general';

type RequiredSummary = Partial<Record<RequiredKey, number>> | null | undefined;

type Props = {
  userId: string;
  required?: RequiredSummary;
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeCeuInput(value: string) {
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const normalized = (() => {
    if (firstDot === -1) return cleaned.slice(0, 4);

    const before = cleaned.slice(0, firstDot).slice(0, 4);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 1);
    return `${before}.${after}`;
  })();

  return normalized;
}

function normalizeCeuInputOnBlur(value: string) {
  const parsed = parseValue(value);
  if (parsed === null) return '0';
  return formatNumber(parsed);
}

function parseValue(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function AdminCEUMatrixBlock({ userId, required }: Props) {
  const { data, isLoading, error } = useUserCEUMatrix(userId);
  const mutation = useUpdateUserCEUMatrix(userId);

  const [draft, setDraft] = useState<Partial<Record<CEUCategory, string>>>({});
  const [isNotifyChoiceOpen, setIsNotifyChoiceOpen] = useState(false);

  const values = useMemo(() => {
    const matrix = data?.matrix;

    return CATEGORIES.reduce(
      (acc, category) => {
        const current = matrix?.[category.key]?.CONFIRMED ?? 0;
        const categoryRequired = required?.[category.requiredKey] ?? 0;
        acc[category.key] = {
          current,
          draft: draft[category.key] ?? formatNumber(current),
          required: categoryRequired,
        };
        return acc;
      },
      {} as Record<CEUCategory, { current: number; draft: string; required: number }>,
    );
  }, [data?.matrix, draft, required]);

  const hasChanges = CATEGORIES.some((category) => {
    if (values[category.key].required <= 0) return false;
    const parsed = parseValue(values[category.key].draft);
    return parsed !== null && parsed !== values[category.key].current;
  });

  const save = async (notifyUser: boolean) => {
    const editableCategories = CATEGORIES.filter((category) => values[category.key].required > 0);
    const changed = editableCategories.map((category) => {
      const parsed = parseValue(values[category.key].draft);
      return {
        category: category.key,
        value: parsed,
        current: values[category.key].current,
      };
    }).filter((item) => item.value !== null && item.value !== item.current);

    if (!changed.length) {
      toast.info(UI_TOAST_MESSAGES.admin.noChanges);
      return;
    }

    const invalid = editableCategories.some(
      (category) => parseValue(values[category.key].draft) === null,
    );
    if (invalid) {
      toast.error(UI_TOAST_MESSAGES.ceu.valuesInvalid);
      return;
    }

    try {
      for (let index = 0; index < changed.length; index += 1) {
        const item = changed[index];
        await mutation.mutateAsync({
          category: item.category,
          status: 'CONFIRMED',
          value: item.value ?? 0,
          notifyUser: notifyUser && index === 0,
        });
      }

      setDraft({
        ETHICS: undefined,
        SUPERVISION: undefined,
        CULTURAL_DIVERSITY: undefined,
        GENERAL: undefined,
      });
      toast.success(notifyUser ? UI_TOAST_MESSAGES.ceu.adminSavedNotify : UI_TOAST_MESSAGES.ceu.adminSavedQuiet);
      setIsNotifyChoiceOpen(false);
    } catch (err: any) {
      const errorCode = err?.response?.data?.errorCode ?? err?.response?.data?.error;
      const message =
        errorCode === 'NO_ACTIVE_CYCLE'
          ? UI_TOAST_MESSAGES.admin.noActiveCycleForEdit
          : err?.response?.data?.error || UI_TOAST_MESSAGES.ceu.adminSaveFailed;
      toast.error(message);
    }
  };

  if (isLoading) {
    return <p className="dashboard-v2-text text-[#6B7894]">Загрузка CEU-баллов...</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 dashboard-v2-text text-[var(--color-danger)]">
        Не удалось загрузить CEU-баллы. Возможно, у пользователя нет активного цикла.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="dashboard-v2-title">Корректировка CEU-баллов</h2>
        <p className="dashboard-v2-caption mt-1 text-[#6B7894]">
          Ручная правка итоговых подтвержденных баллов активного цикла. Обычная проверка заявок
          выполняется в разделе «Проверка CEU».
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((category) => {
          const item = values[category.key];
          const isEditable = item.required > 0;

          return (
            <label
              key={category.key}
              className="flex min-h-[86px] items-center justify-between gap-5 rounded-[10px] bg-[var(--color-blue-soft)] px-5 py-4"
            >
              <span className="min-w-0 text-[16px] font-extrabold leading-[1.2] text-[#1F305E]">
                {category.label}
              </span>

              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <input
                  value={item.draft}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [category.key]: normalizeCeuInput(event.target.value),
                    }))
                  }
                  onFocus={(event) => {
                    if (event.target.value === '0') {
                      setDraft((current) => ({ ...current, [category.key]: '' }));
                    }
                  }}
                  onBlur={() => {
                    setDraft((current) => ({
                      ...current,
                      [category.key]: normalizeCeuInputOnBlur(current[category.key] ?? item.draft),
                    }));
                  }}
                  inputMode="decimal"
                  className="h-[38px] w-[82px] rounded-[10px] border border-[#B8C4D8] bg-white px-2 text-right text-[24px] font-extrabold leading-none text-[#1F305E] outline-none transition focus:border-[var(--color-blue-dark)] focus:shadow-[0_0_0_2px_rgba(31,48,94,0.12)] disabled:cursor-not-allowed disabled:border-[#D7DCE7] disabled:bg-[#EEF0F4] disabled:text-[#8D96B5]"
                  disabled={mutation.isPending || !isEditable}
                  aria-label={`${category.label}: подтвержденные CEU-баллы`}
                  title={isEditable ? undefined : 'Для этой категории баллы не требуются'}
                />
                <span className="text-[14px] font-semibold text-[#7F8AA3]">
                  /{formatNumber(item.required)}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-[#DCE8EC] pt-4">
        <button
          type="button"
          className="btn dashboard-v2-action dashboard-v2-action-primary"
          disabled={mutation.isPending || !hasChanges}
          onClick={() => setIsNotifyChoiceOpen(true)}
        >
          Сохранить
        </button>
      </div>

      {isNotifyChoiceOpen ? (
        <AdminNotifyChoiceModal
          title="Сохранить CEU-баллы?"
          isPending={mutation.isPending}
          onChoose={(notify) => void save(notify)}
          onClose={() => setIsNotifyChoiceOpen(false)}
        />
      ) : null}
    </div>
  );
}
