import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadFile } from '@/features/files/api/uploadFile';
import { submitCeuRequest } from '../api/submitCeuRequest';

type CeuCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
type CeuActivityType = 'TRAINING_ATTENDANCE' | 'PRESENTATION' | 'PUBLICATION' | 'TEACHING';

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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseCeuValue(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [duration, setDuration] = useState('0');
  const [eventDate, setEventDate] = useState('');
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState<CeuCategory>('GENERAL');
  const [activityType, setActivityType] = useState<CeuActivityType>('TRAINING_ATTENDANCE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDrop = (accepted: File[]) => {
    const file = accepted[0];
    if (!file || submitting) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Файл больше ${MAX_SIZE_MB} МБ`);
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
    setDuration('0');
    setEventDate('');
    setEventName('');
    setCategory('GENERAL');
    setActivityType('TRAINING_ATTENDANCE');
    setSelectedFile(null);
  };

  const submit = async () => {
    const value = parseCeuValue(duration);
    const trimmedEventName = eventName.trim();
    const today = todayInputValue();

    if (value <= 0) {
      toast.error('Укажите количество CEU-баллов');
      return;
    }

    if (!isHalfStep(value)) {
      toast.error('Шаг для CEU-баллов должен быть 0,5');
      return;
    }

    if (!eventDate) {
      toast.error('Укажите дату мероприятия');
      return;
    }

    if (eventDate > today) {
      toast.error('Дата мероприятия не может быть в будущем');
      return;
    }

    if (!trimmedEventName) {
      toast.error('Укажите название или ведущего тренинга');
      return;
    }

    if (!selectedFile) {
      toast.error('Выберите файл подтверждения');
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
        entries: [{ category, value }],
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ceuSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['ceu', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] }),
      ]);

      toast.success('Заявка на CEU отправлена');
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось отправить заявку на CEU');
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

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_236px]">
              <div className="min-w-0">
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.8fr)]">
                  <Field label="Длительность">
                    <input
                      className="input-design h-[32px]"
                      inputMode="decimal"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      disabled={submitting}
                      placeholder="0"
                    />
                  </Field>

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

                <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <p className="mb-3 text-[13px] font-semibold text-[#1F305E]">Тема CEU</p>
                    <div className="space-y-4">
                      {CATEGORIES.map((item) => (
                        <CheckOption
                          key={item.value}
                          label={item.label}
                          checked={category === item.value}
                          disabled={submitting}
                          onChange={() => setCategory(item.value)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[13px] font-semibold text-[#1F305E]">Тип CEU</p>
                    <div className="space-y-3">
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
              </div>

              <div className="flex min-w-0 flex-col justify-end">
                <div
                  {...getRootProps()}
                  className={`flex min-h-[126px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed px-5 text-center text-[14px] transition ${
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

                    <div className="font-medium">
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
      className="flex w-full cursor-pointer items-start gap-3 text-left text-[13px] leading-[1.25] text-[#1F305E] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] border border-[#B8C4D8] bg-white ${
          checked ? 'text-[#1F305E]' : 'text-transparent'
        }`}
      >
        <span className="block h-[8px] w-[14px] rotate-[-45deg] border-b-[3px] border-l-[3px] border-current" />
      </span>
      <span>{label}</span>
    </button>
  );
}
