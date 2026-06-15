import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { PageNav } from '@/components/PageNav';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useUpdateMe } from '@/features/user/hooks/useUpdateMe';
import { useRequestProfileArchive } from '@/features/user/hooks/useRequestProfileArchive';
import { UserLocationFields } from '@/features/user/components/UserLocationFields';
import { ProfileAvatar } from '@/features/dashboard-v2/dashboardV2/components/info/profile-avatar/component/ProfileAvatar';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import {
  buildFullNameLatin,
  buildFullNameRu,
  splitFullName,
} from '@/features/user/utils/name';
import { normalizePhone } from '@/features/user/utils/phone';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

const strToArr = (value?: string | null) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const arrToStr = (items: string[]) =>
  items
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useCurrentUser();
  const updateMe = useUpdateMe();
  const archiveRequest = useRequestProfileArchive();
  const { confirm } = useConfirm();

  const initialForm = useMemo(() => {
    const namesRu = splitFullName(user?.fullName);
    const namesLatin = splitFullName((user as any)?.fullNameLatin);
    const middleName = namesRu.middleName || '';

    return {
      firstName: namesRu.firstName,
      lastName: namesRu.lastName,
      middleName,
      noMiddleName: !middleName || middleName === '-',
      firstNameLatin: namesLatin.firstName,
      lastNameLatin: namesLatin.lastName,
      countries: strToArr(user?.country),
      cities: strToArr(user?.city),
      birthDate: toDateInput(user?.birthDate),
      phone: user?.phone ?? '',
      bio: user?.bio ?? '',
      ibaoId: user?.ibaoId ?? '',
    };
  }, [user]);

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleSave = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const middleName = form.noMiddleName ? '' : form.middleName.trim();
    const firstNameLatin = form.firstNameLatin.trim();
    const lastNameLatin = form.lastNameLatin.trim();

    if (!firstName || !lastName) {
      toast.error(UI_TOAST_MESSAGES.profile.shortFullNameRequired);
      return;
    }

    if (!form.noMiddleName && !middleName) {
      toast.error(UI_TOAST_MESSAGES.profile.middleNameRequired);
      return;
    }

    if (!firstNameLatin || !lastNameLatin) {
      toast.error(UI_TOAST_MESSAGES.profile.latinNameEngRequired);
      return;
    }

    const phone = normalizePhone(form.phone);
    if (phone && !isValidPhoneNumber(phone)) {
      toast.error(UI_TOAST_MESSAGES.profile.phoneInvalid);
      return;
    }

    try {
      await updateMe.mutateAsync({
        fullName: buildFullNameRu(lastName, firstName, middleName),
        fullNameLatin: buildFullNameLatin(lastNameLatin, firstNameLatin),
        country: arrToStr(form.countries) || undefined,
        city: arrToStr(form.cities) || undefined,
        birthDate: form.birthDate || undefined,
        phone: phone || undefined,
        bio: form.bio.trim() || undefined,
        ibaoId: form.ibaoId.trim(),
      });

      toast.success(UI_TOAST_MESSAGES.profile.dataSaved);
      navigate('/dashboard-v2');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.profile.saveFailed);
    }
  };

  const handleArchiveRequest = async () => {
    const ok = await confirm({
      message: 'Отправить администраторам запрос на удаление профиля?',
      description: 'До обработки запроса профиль продолжит работать.',
      confirmLabel: 'Отправить',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await archiveRequest.mutateAsync();
      toast.success(UI_TOAST_MESSAGES.profile.deleteRequestSent);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.profile.deleteRequestFailed);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-blue-dark">Загрузка...</div>;
  }

  if (error || !user) {
    return <div className="p-6 text-error">Ошибка загрузки профиля</div>;
  }

  return (
    <div className="px-4 pb-10 pt-3 text-blue-dark">
      <PageNav />

      <div className="mx-auto max-w-[980px]">
        <header className="mb-5 text-center">
          <h1 className="dashboard-v2-title text-[24px]">Редактирование данных</h1>
          <p className="mt-5 text-[14px] text-[#8D96B5]">
            Для прохождения сертификации необходимо заполнить все поля
          </p>
        </header>

        <section className="card-section shadow-soft px-5 py-5 md:px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
            <div className="flex justify-center md:justify-start">
              <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <Field label="Имя">
                <input
                  className="input-design h-[32px]"
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </Field>

              <Field label="Фамилия">
                <input
                  className="input-design h-[32px]"
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </Field>

              <Field label="Отчество">
                <input
                  className="input-design h-[32px]"
                  value={form.middleName}
                  disabled={form.noMiddleName}
                  onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
                />
              </Field>

              <label className="mt-[22px] flex min-h-[32px] items-center gap-2 text-[14px] text-[#8D96B5]">
                <input
                  type="checkbox"
                  checked={form.noMiddleName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      noMiddleName: e.target.checked,
                      middleName: e.target.checked ? '' : prev.middleName,
                    }))
                  }
                  className="h-[28px] w-[28px] cursor-pointer accent-[var(--color-blue-dark)]"
                />
                У меня нет отчества
              </label>

              <Field label="Имя ENG" hint="как в загранпаспорте">
                <input
                  className="input-design h-[32px]"
                  value={form.firstNameLatin}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, firstNameLatin: e.target.value }))
                  }
                />
              </Field>

              <Field label="Фамилия ENG" hint="как в загранпаспорте">
                <input
                  className="input-design h-[32px]"
                  value={form.lastNameLatin}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lastNameLatin: e.target.value }))
                  }
                />
              </Field>

              <div className="profile-edit-select">
                <UserLocationFields
                  countries={form.countries}
                  cities={form.cities}
                  onChange={({ countries, cities }) =>
                    setForm((prev) => ({ ...prev, countries, cities }))
                  }
                />
              </div>

              <Field label="Дата рождения">
                <input
                  type="date"
                  className="input-design h-[32px]"
                  value={form.birthDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </Field>

              <Field label="Телефон">
                <input
                  type="tel"
                  className="input-design h-[32px]"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </Field>

              <Field label="О себе" hint="необязательно" className="md:col-span-2">
                <textarea
                  className="input-design min-h-[154px] resize-none"
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                />
                <div className="mt-1 text-right text-[12px] text-[#8D96B5]">
                  {form.bio.length}/500
                </div>
              </Field>

              <Field label="IBAO ID" hint="если есть">
                <input
                  className="input-design h-[32px]"
                  value={form.ibaoId}
                  onChange={(e) => setForm((prev) => ({ ...prev, ibaoId: e.target.value }))}
                />
              </Field>

              <div className="pt-[18px] text-[13px] text-[#8D96B5]">
                <div>Регистрационный номер ЦСПАП</div>
                <div className="mt-1 text-[#222]">{user.registrationNumber ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[180px_1fr_190px]">
            <button
              type="button"
              className="btn h-[52px] rounded-[10px] border border-[var(--color-danger)] px-5 text-[15px] font-extrabold text-[var(--color-danger)] hover:bg-[rgba(255,83,100,0.08)]"
              onClick={handleArchiveRequest}
              disabled={archiveRequest.isPending}
            >
              {archiveRequest.isPending ? 'Отправляю...' : 'Удалить профиль'}
            </button>

            <div className="text-[13px]">
              <div className="text-[#8D96B5]">Email</div>
              <div className="mt-1 text-[#222]">{user.email}</div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={updateMe.isPending}
              className="btn btn-dark h-[52px] rounded-[10px] px-8 text-[16px] font-extrabold"
            >
              {updateMe.isPending ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-[14px] font-medium text-blue-dark ${className}`}>
      {label}
      {hint ? <span className="ml-1 font-normal text-[#8D96B5]">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}
