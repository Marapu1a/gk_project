import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { PageNav } from '@/components/PageNav';
import { UserBannerView } from '@/features/userBanner/components/UserBannerView';
import { useAdminUserBanner, useUpdateAdminUserBanner } from '@/features/userBanner/hooks/useUserBanner';
import type { UserBannerTone } from '@/features/userBanner/api/userBanner';

const toneOptions: Array<{ value: UserBannerTone; label: string }> = [
  { value: 'DANGER', label: 'Красный' },
  { value: 'DARK', label: 'Синий' },
  { value: 'SOFT', label: 'Светлый' },
];

function AdminUserBannerPageInner() {
  const { data: banner, isLoading, error } = useAdminUserBanner();
  const updateBanner = useUpdateAdminUserBanner();

  const [enabled, setEnabled] = useState(false);
  const [tone, setTone] = useState<UserBannerTone>('DARK');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [dismissible, setDismissible] = useState(true);

  useEffect(() => {
    if (!banner) return;
    setEnabled(banner.enabled);
    setTone(banner.tone);
    setMessage(banner.message);
    setCtaLabel(banner.ctaLabel ?? '');
    setCtaUrl(banner.ctaUrl ?? '');
    setDismissible(banner.dismissible);
  }, [banner]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await updateBanner.mutateAsync({
        enabled,
        tone,
        message,
        ctaLabel: ctaLabel.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        dismissible,
      });
      toast.success('Баннер сохранен');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось сохранить баннер');
    }
  };

  const previewBanner = {
    tone,
    message:
      message ||
      'В личном кабинете появилось важное сообщение для пользователей. Подробности - [ссылка](https://reestrpap.ru)',
    ctaLabel: ctaLabel.trim() || null,
    ctaUrl: ctaUrl.trim() || null,
    dismissible,
  };

  if (isLoading) {
    return <div className="container-fixed p-6 text-blue-dark">Загрузка...</div>;
  }

  if (error) {
    return <div className="container-fixed p-6 text-error">Ошибка загрузки баннера</div>;
  }

  return (
    <div className="container-fixed px-2 pb-10 pt-3 text-blue-dark md:px-6">
      <PageNav />

      <div className="mx-auto mt-2 max-w-[960px]">
        <header className="mb-5 text-center">
          <h1 className="dashboard-v2-title text-[24px]">Баннер для пользователей</h1>
        </header>

        <form onSubmit={onSubmit} className="card-section shadow-soft space-y-6 px-5 py-5 md:px-6">
          <div>
            <div className="mb-2 text-[14px] font-extrabold">Предпросмотр</div>
            <UserBannerView banner={previewBanner} preview />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="flex min-h-[40px] items-center gap-3 text-[14px] font-medium">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-[28px] w-[28px] accent-[var(--color-blue-dark)]"
              />
              Включить баннер
            </label>

            <label className="flex min-h-[40px] items-center gap-3 text-[14px] font-medium">
              <input
                type="checkbox"
                checked={dismissible}
                onChange={(event) => setDismissible(event.target.checked)}
                className="h-[28px] w-[28px] accent-[var(--color-blue-dark)]"
              />
              Пользователь может закрыть
            </label>

            <div className="md:col-span-2">
              <div className="mb-2 text-[14px] font-medium">Цвет</div>
              <div className="inline-flex rounded-[10px] bg-[#F0F0F0] p-1">
                {toneOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTone(option.value)}
                    className={`btn h-[34px] rounded-[8px] px-5 text-[14px] font-extrabold ${
                      tone === option.value
                        ? 'bg-white text-[var(--color-blue-dark)] shadow-sm'
                        : 'text-[#8D96B5]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-[14px] font-medium md:col-span-2">
              Текст баннера
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="input-design mt-1 min-h-[132px] resize-y"
                maxLength={1000}
                placeholder="Например: В личном кабинете появилось важное сообщение для пользователей. Подробности - [ссылка](https://reestrpap.ru)"
              />
              <span className="mt-1 block text-[12px] text-[#8D96B5]">
                Для ссылки используйте формат: [текст ссылки](https://example.com)
              </span>
            </label>

            <label className="block text-[14px] font-medium">
              Текст кнопки
              <input
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                className="input-design mt-1 h-[36px]"
                maxLength={80}
                placeholder="Например: Подробнее"
              />
            </label>

            <label className="block text-[14px] font-medium">
              Ссылка кнопки
              <input
                value={ctaUrl}
                onChange={(event) => setCtaUrl(event.target.value)}
                className="input-design mt-1 h-[36px]"
                maxLength={500}
                placeholder="Введите полный URL или внутренний путь, например /dashboard-v2"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateBanner.isPending}
              className="btn btn-dark h-[52px] rounded-[10px] px-8 text-[16px] font-extrabold"
            >
              {updateBanner.isPending ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUserBannerPage() {
  return <AdminUserBannerPageInner />;
}
