import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadFile } from '@/features/files/api/uploadFile';
import { submitCeuRequest } from '../api/submitCeuRequest';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { SubmissionSuccessModal } from '@/components/SubmissionSuccessModal';
import {
  formatDecimalInput,
  getDecimalInputBlurValue,
  getDecimalInputFocusValue,
  normalizeDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from '@/utils/decimalInput';

type CeuCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
type CeuActivityType = 'TRAINING_ATTENDANCE' | 'PRESENTATION' | 'PUBLICATION' | 'TEACHING';
type CeuCategoryDraft = {
  selected: boolean;
  value: string;
};

const MAX_SIZE_MB = 10;
const CATEGORIES: Array<{ value: CeuCategory; label: string }> = [
  { value: 'ETHICS', label: 'Этика' },
  { value: 'CULTURAL_DIVERSITY', label: 'Культурное разнообразие' },
  { value: 'SUPERVISION', label: 'Супервизия' },
  { value: 'GENERAL', label: 'Общие' },
];

const ACTIVITY_TYPES: Array<{ value: CeuActivityType; label: string }> = [
  {
    value: 'TRAINING_ATTENDANCE',
    label:
      'Участие в онлайн- или очных семинарах, воркшопах и тренингах по прикладному анализу поведения (ПАП) или смежным направлениям поведенческого анализа',
  },
  {
    value: 'PRESENTATION',
    label:
      'Проведение семинара, воркшопа или тренинга по прикладному анализу поведения (ПАП) или смежным направлениям',
  },
  {
    value: 'PUBLICATION',
    label:
      'Публикация материалов по прикладному анализу поведения или смежным направлениям',
  },
  {
    value: 'TEACHING',
    label:
      'Преподавание курсов, соответствующих содержательным требованиям и компетенциям уровней Инструктор/Супервизор',
  },
];

function createInitialEntries(): Record<CeuCategory, CeuCategoryDraft> {
  return {
    ETHICS: { selected: false, value: '0' },
    CULTURAL_DIVERSITY: { selected: false, value: '0' },
    SUPERVISION: { selected: false, value: '0' },
    GENERAL: { selected: true, value: '0' },
  };
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseCeuValue(value: string) {
  const parsed = parseDecimalInput(value);
  if (parsed == null) return 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeCeuValueInput(rawValue: string) {
  return sanitizeDecimalInput(rawValue, { maxDecimals: 2 });
}

function normalizeCeuValueInput(value: string) {
  return normalizeDecimalInput(value, { maxDecimals: 2 });
}

function isHalfStep(value: number) {
  return Math.abs(value * 2 - Math.round(value * 2)) < 0.001;
}

type CeuPointsRequestFormProps = {
  defaultOpen?: boolean;
};

export function CeuPointsRequestForm({ defaultOpen = true }: CeuPointsRequestFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [eventDate, setEventDate] = useState('');
  const [eventName, setEventName] = useState('');
  const [activityType, setActivityType] = useState<CeuActivityType>('TRAINING_ATTENDANCE');
  const [categoryEntries, setCategoryEntries] = useState(createInitialEntries);
  const [restoreCategoryValues, setRestoreCategoryValues] = useState<
    Partial<Record<CeuCategory, string>>
  >({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const selectedEntries = CATEGORIES.filter((item) => categoryEntries[item.value].selected).map(
    (item) => ({
      category: item.value,
      value: parseCeuValue(categoryEntries[item.value].value),
    }),
  );
  const totalValue = selectedEntries.reduce((sum, entry) => sum + entry.value, 0);

  const handleDrop = (accepted: File[]) => {
    const file = accepted[0];
    if (!file || submitting) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(UI_TOAST_MESSAGES.files.tooLarge(MAX_SIZE_MB));
      return;
    }

    setSelectedFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: {
      'application/pdf': [],
      'image/jpeg': [],
      'image/png': [],
    },
    disabled: submitting,
  });

  const resetForm = () => {
    setEventDate('');
    setEventName('');
    setActivityType('TRAINING_ATTENDANCE');
    setCategoryEntries(createInitialEntries());
    setSelectedFile(null);
  };

  const submit = async () => {
    const trimmedEventName = eventName.trim();
    const today = todayInputValue();

    if (selectedEntries.length === 0) {
      toast.error(UI_TOAST_MESSAGES.ceu.pointsRequired);
      return;
    }

    if (selectedEntries.some((entry) => entry.value <= 0)) {
      toast.error(UI_TOAST_MESSAGES.ceu.pointsRequired);
      return;
    }

    if (selectedEntries.some((entry) => !isHalfStep(entry.value))) {
      toast.error(UI_TOAST_MESSAGES.ceu.stepInvalid);
      return;
    }

    if (!activityType) {
      toast.error(UI_TOAST_MESSAGES.ceu.activityTypeRequired);
      return;
    }

    if (!eventDate) {
      toast.error(UI_TOAST_MESSAGES.ceu.eventDateRequired);
      return;
    }

    if (eventDate > today) {
      toast.error(UI_TOAST_MESSAGES.ceu.eventDateInFuture);
      return;
    }

    if (!trimmedEventName) {
      toast.error(UI_TOAST_MESSAGES.ceu.eventNameRequired);
      return;
    }

    if (!selectedFile) {
      toast.error(UI_TOAST_MESSAGES.ceu.fileRequired);
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadFile(selectedFile, 'ceu');
      await submitCeuRequest({
        eventName: trimmedEventName,
        eventDate,
        fileId: uploaded.fileId,
        activityType,
        entries: selectedEntries.map((entry) => ({
          ...entry,
          activityType,
        })),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ceuSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['ceu', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] }),
      ]);

      resetForm();
      setIsOpen(false);
      setIsSuccessOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.ceu.requestFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`btn btn-dark w-full rounded-[10px] text-[16px] font-extrabold transition-all duration-300 ease-out ${
          isOpen
            ? 'pointer-events-none mt-0 h-0 overflow-hidden opacity-0'
            : 'mt-5 h-[48px] opacity-100'
        }`}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        Добавить баллы
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <section className="rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mx-auto mb-5 flex cursor-pointer items-center gap-2 text-[16px] font-extrabold text-[#1F305E]"
            >
              Добавить баллы
              <img
                src="/dashboard-v2/btn_hide.svg"
                alt=""
                className="h-[21px] w-[21px] cursor-pointer"
              />
            </button>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_236px]">
              <div className="min-w-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)]">
                  <Field label="Дата">
                    <input
                      className="input-design h-[32px]"
                      type="date"
                      max={todayInputValue()}
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Название или ведущий тренинга">
                    <input
                      className="input-design h-[32px]"
                      value={eventName}
                      onChange={(event) => setEventName(event.target.value)}
                      disabled={submitting}
                      placeholder="Название, провайдер или ведущий"
                    />
                  </Field>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-4 px-3 text-[13px] font-semibold text-[#1F305E]">
                      <span>Тема CEU</span>
                      <span>Баллы</span>
                    </div>

                    {CATEGORIES.map((item) => {
                      const draft = categoryEntries[item.value];
                      return (
                        <div
                          key={item.value}
                          className={`grid grid-cols-1 gap-3 rounded-[10px] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center ${
                            draft.selected ? 'bg-[#E5EFF1]' : 'bg-[#F7F9FB]'
                          }`}
                        >
                          <CheckOption
                            label={item.label}
                            checked={draft.selected}
                            disabled={submitting}
                            onChange={() =>
                              setCategoryEntries((current) => ({
                                ...current,
                                [item.value]: {
                                  ...current[item.value],
                                  selected: !current[item.value].selected,
                                },
                              }))
                            }
                          />

                          <label className="block text-[12px] font-semibold text-[#1F305E]">
                            <span className="mb-1 block sm:hidden">Баллы</span>
                            <input
                              className="input-design h-[34px]"
                              inputMode="decimal"
                              value={draft.value}
                              onFocus={() => {
                                const { focusedValue, restoreValue } = getDecimalInputFocusValue(
                                  draft.value,
                                );
                                setRestoreCategoryValues((current) => ({
                                  ...current,
                                  [item.value]: restoreValue,
                                }));
                                setCategoryEntries((current) => ({
                                  ...current,
                                  [item.value]: { ...current[item.value], value: focusedValue },
                                }));
                              }}
                              onBlur={() => {
                                const rawValue = getDecimalInputBlurValue(
                                  categoryEntries[item.value].value,
                                  restoreCategoryValues[item.value],
                                );
                                setCategoryEntries((current) => ({
                                  ...current,
                                  [item.value]: {
                                    ...current[item.value],
                                    value: normalizeCeuValueInput(rawValue),
                                  },
                                }));
                                setRestoreCategoryValues((current) => ({
                                  ...current,
                                  [item.value]: undefined,
                                }));
                              }}
                              onChange={(event) => {
                                const nextValue = sanitizeCeuValueInput(event.target.value);
                                if (nextValue !== null) {
                                  setCategoryEntries((current) => ({
                                    ...current,
                                    [item.value]: { ...current[item.value], value: nextValue },
                                  }));
                                }
                              }}
                              disabled={submitting || !draft.selected}
                              placeholder="0"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="px-3 text-[13px] font-semibold text-[#1F305E]">Тип CEU</div>
                    <div className="space-y-2 rounded-[10px] bg-[#F7F9FB] px-3 py-3">
                      {ACTIVITY_TYPES.map((item) => (
                        <CheckOption
                          key={item.value}
                          label={item.label}
                          checked={activityType === item.value}
                          disabled={submitting}
                          onChange={() => setActivityType(item.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[10px] bg-[#E5EFF1] px-4 py-3 text-[14px] font-semibold text-[#1F305E]">
                  Всего баллов по заявке:{' '}
                  <span className="font-extrabold">{formatDecimalInput(totalValue, 2)}</span>
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-end">
                <div
                  {...getRootProps()}
                  className={`flex min-h-[126px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed px-5 text-center text-[13px] transition ${
                    selectedFile
                      ? 'border-[#A5CB37] bg-[rgba(165,203,55,0.10)] text-[#1F305E] hover:bg-[rgba(165,203,55,0.14)]'
                      : 'border-[#B8C4D8] text-[#A7B1C7] hover:bg-[#F7F9FB]'
                  } ${
                    submitting ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-2">
                    {selectedFile ? (
                      <span className="mx-auto flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[rgba(165,203,55,0.22)] text-[#75AD14]">
                        <span className="block h-[8px] w-[14px] rotate-[-45deg] border-b-[3px] border-l-[3px] border-current" />
                      </span>
                    ) : null}

                    <div className="font-medium leading-[1.25]">
                      {isDragActive
                        ? 'Отпустите файл здесь'
                        : selectedFile
                          ? 'Файл загружен'
                          : 'Выберите или перетащите файл PDF, JPG, PNG'}
                    </div>

                    {selectedFile ? (
                      <>
                        <div className="mx-auto max-w-[180px] truncate text-[12px] text-[#6B7894]">
                          {selectedFile.name}
                        </div>
                        <div className="text-[12px] font-semibold text-[#1F305E]">Изменить файл</div>
                      </>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="btn btn-dark mt-4 h-[48px] w-full rounded-[10px] text-[16px] font-extrabold disabled:cursor-not-allowed disabled:bg-[#B7BFCE]"
                >
                  {submitting ? 'Отправляем...' : 'Отправить'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <SubmissionSuccessModal
        open={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Заявка с CEU-баллами отправлена"
        description="Заявка добавлена в историю. После проверки здесь появится её статус."
      />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[13px] font-semibold text-[#1F305E]">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function CheckOption({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="flex w-full cursor-pointer items-start gap-3 text-left text-[12px] leading-[1.28] text-[#1F305E] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`mt-0.5 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[8px] border border-[#B8C4D8] bg-white ${
          checked ? 'text-[#1F305E]' : 'text-transparent'
        }`}
      >
        <span className="block h-[8px] w-[14px] rotate-[-45deg] border-b-[3px] border-l-[3px] border-current" />
      </span>
      <span>{label}</span>
    </button>
  );
}
