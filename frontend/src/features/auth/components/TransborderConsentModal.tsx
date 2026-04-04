import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useTransborderConsentDocument } from '../hooks/useTransborderConsentDocument';
import { useAcceptTransborderConsent } from '../hooks/useAcceptTransborderConsent';
import type { ConsentItemCode, ConsentSource, ConsentDocumentItem } from '../api/consent';

type Props = {
  open: boolean;
  source: ConsentSource;
  onAccepted: () => void;
  onLogout?: () => void;
};

type ConsentState = Record<ConsentItemCode, boolean>;

const INITIAL_STATE: ConsentState = {
  PUBLIC_OFFER_ACCEPTED: false,
  PD_PROCESSING_ACCEPTED: false,
  TRANSBORDER_PD_TRANSFER: false,
  EMAIL_MARKETING_ACCEPTED: false,
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

      toast.success('Согласия сохранены');
      onAccepted();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось сохранить согласия');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="card-section shadow-strong flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--color-border-soft)' }}>
          <h2 className="text-xl font-bold text-blue-darker">Подтверждение условий и согласий</h2>
          <p className="mt-2 text-sm text-blue-dark">
            Для продолжения работы с личным кабинетом подтвердите обязательные пункты.
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {isLoading ? <p className="text-sm text-blue-dark">Загрузка...</p> : null}

          {isError ? (
            <p className="text-error">
              Не удалось загрузить условия. Обновите страницу и попробуйте снова.
            </p>
          ) : null}

          {data ? (
            <div className="space-y-3">
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
                    {renderConsentItemText(item)}
                    {item.required ? <span className="ml-1 text-pink-accent">*</span> : null}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--color-border-soft)' }}
        >
          <p className="text-xs leading-5 text-blue-dark">
            Обязательные пункты отмечены звездочкой. Подтверждение фиксируется в системе вместе со
            временем действия и техническими данными.
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

function renderConsentItemText(item: ConsentDocumentItem) {
  switch (item.code) {
    case 'PUBLIC_OFFER_ACCEPTED':
      return (
        <>
          Я принимаю условия{' '}
          <a
            href="https://reestrpap.ru/oferta"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-darker underline underline-offset-2"
          >
            Публичной оферты
          </a>
        </>
      );

    case 'PD_PROCESSING_ACCEPTED':
      return (
        <>
          Я ознакомлен(а) с{' '}
          <a
            href="https://reestrpap.ru/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-darker underline underline-offset-2"
          >
            Политикой обработки персональных данных
          </a>{' '}
          и даю{' '}
          <a
            href="https://reestrpap.ru/user-agreement"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-darker underline underline-offset-2"
          >
            согласие
          </a>{' '}
          на обработку персональных данных
        </>
      );

    case 'TRANSBORDER_PD_TRANSFER':
      return (
        <>
          Я даю{' '}
          <a
            href="https://reestrpap.ru/soglasie_peredacha_dannyh"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-darker underline underline-offset-2"
          >
            согласие на трансграничную передачу моих персональных данных
          </a>{' '}
          в IBAO в целях регистрации и прохождения международной сертификации.
        </>
      );

    case 'EMAIL_MARKETING_ACCEPTED':
      return <>Я согласен получать письма информационной рассылки</>;

    default:
      return <>{item.label}</>;
  }
}
