import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useTransborderConsentDocument } from '../hooks/useTransborderConsentDocument';
import { useAcceptTransborderConsent } from '../hooks/useAcceptTransborderConsent';
import type { ConsentItemCode, ConsentSource } from '../api/consent';

type Props = {
  open: boolean;
  source: ConsentSource;
  onAccepted: () => void;
  onLogout?: () => void;
};

type ConsentState = Record<ConsentItemCode, boolean>;

const INITIAL_STATE: ConsentState = {
  PRIVACY_POLICY_ACK: false,
  TRANSBORDER_PD_TRANSFER: false,
};

export function TransborderConsentModal({ open, source, onAccepted, onLogout }: Props) {
  const { data, isLoading, isError } = useTransborderConsentDocument(open);
  const acceptMutation = useAcceptTransborderConsent();

  const [acceptedItems, setAcceptedItems] = useState<ConsentState>(INITIAL_STATE);

  useEffect(() => {
    if (open) {
      setAcceptedItems(INITIAL_STATE);
    }
  }, [open]);

  const requiredCodes = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => item.required).map((item) => item.code);
  }, [data]);

  const canSubmit = requiredCodes.every((code) => acceptedItems[code] === true);

  if (!open) return null;

  const handleToggle = (code: ConsentItemCode) => {
    setAcceptedItems((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Нужно подтвердить все обязательные пункты');
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        source,
        acceptedItems,
      });

      toast.success('Согласие сохранено');
      onAccepted();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось сохранить согласие');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="card-section shadow-strong flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--color-border-soft)' }}>
          <h2 className="text-xl font-bold text-blue-darker">
            Согласие на трансграничную передачу персональных данных
          </h2>
          <p className="mt-2 text-sm text-blue-dark">
            Для продолжения работы с личным кабинетом нужно подтвердить согласие.
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {isLoading ? <p className="text-sm text-blue-dark">Загрузка документа...</p> : null}

          {isError ? (
            <p className="text-error">
              Не удалось загрузить текст согласия. Обновите страницу и попробуйте снова.
            </p>
          ) : null}

          {data ? (
            <>
              <div
                className="rounded-card border bg-white p-4"
                style={{ borderColor: 'var(--color-border-soft)' }}
              >
                <h3 className="mb-3 text-base font-bold text-blue-darker">{data.title}</h3>

                <div className="max-h-[320px] overflow-y-auto whitespace-pre-line text-sm leading-6 text-blue-dark">
                  {data.fullText}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {data.items.map((item) => (
                  <label
                    key={item.code}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition hover:bg-[rgba(214,239,139,0.12)]"
                    style={{ borderColor: 'var(--color-border-soft)' }}
                  >
                    <input
                      type="checkbox"
                      checked={acceptedItems[item.code]}
                      onChange={() => handleToggle(item.code)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-green-brand)]"
                    />

                    <span className="text-sm leading-6 text-blue-dark">
                      {item.label}{' '}
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-darker underline underline-offset-2"
                        >
                          Открыть документ
                        </a>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div
          className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--color-border-soft)' }}
        >
          <p className="text-xs leading-5 text-blue-dark">
            Подтверждение фиксируется в системе вместе со временем действия и техническими данными.
          </p>

          <div className="flex gap-3">
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-ghost rounded-button px-4 py-3 text-sm"
              >
                Выйти
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || acceptMutation.isPending}
              className="btn btn-dark rounded-button px-5 py-3 text-sm font-bold"
            >
              {acceptMutation.isPending ? 'Сохраняем...' : 'Подтверждаю'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
