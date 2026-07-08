import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
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
import { normalizePhone } from '@/shared/validation/profileFields';
import {
  profileFormSchema,
  type ProfileFormValues,
} from '@/features/user/validation/profileSchema';
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

  const defaultValues = useMemo<ProfileFormValues>(() => {
    const namesRu = splitFullName(user?.fullName);
    const namesLatin = splitFullName((user as any)?.fullNameLatin);
    const middleName = namesRu.middleName || '';

    return {
      firstName: namesRu.firstName,
      lastName: namesRu.lastName,
      middleName: middleName === '-' ? '' : middleName,
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onSubmit',
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const noMiddleName = watch('noMiddleName');
  const countries = watch('countries');
  const cities = watch('cities');
  const bio = watch('bio') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    const middleName = values.noMiddleName ? '' : values.middleName.trim();
    const phoneIntl = normalizePhone(values.phone);

    try {
      await updateMe.mutateAsync({
        fullName: buildFullNameRu(values.lastName.trim(), values.firstName.trim(), middleName),
        fullNameLatin: buildFullNameLatin(
          values.lastNameLatin.trim(),
          values.firstNameLatin.trim(),
        ),
        country: arrToStr(values.countries),
        city: arrToStr(values.cities),
        // Очищаемые поля: пусто → null (бэкенд очистит значение).
        birthDate: values.birthDate || null,
        phone: phoneIntl || null,
        bio: values.bio.trim() || null,
        ibaoId: values.ibaoId.trim() || null,
      });

      toast.success(UI_TOAST_MESSAGES.profile.dataSaved);
      navigate('/dashboard-v2');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.profile.saveFailed);
    }
  });

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
    <div className="px-0 pb-10 pt-3 text-blue-dark sm:px-4">
      <PageNav className="mb-4" />

      <div className="mx-auto max-w-[980px]">
        <header className="mb-5 text-center">
          <h1 className="dashboard-v2-title text-[24px]">Редактирование данных</h1>
          <p className="mt-5 text-[14px] text-[#8D96B5]">
            Для прохождения сертификации необходимо заполнить все поля
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <section className="card-section shadow-soft px-5 py-5 md:px-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
              <div className="flex justify-center md:justify-start">
                <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />
              </div>

              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                <Field label="Имя" error={errors.firstName?.message}>
                  <input className="input-design h-[32px]" {...register('firstName')} />
                </Field>

                <Field label="Фамилия" error={errors.lastName?.message}>
                  <input className="input-design h-[32px]" {...register('lastName')} />
                </Field>

                <Field label="Отчество" error={errors.middleName?.message}>
                  <input
                    className="input-design h-[32px]"
                    disabled={noMiddleName}
                    {...register('middleName')}
                  />
                </Field>

                <label className="mt-[22px] flex min-h-[32px] items-center gap-2 text-[14px] text-[#8D96B5]">
                  <Controller
                    control={control}
                    name="noMiddleName"
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.checked);
                          if (e.target.checked) {
                            setValue('middleName', '', { shouldValidate: true });
                          }
                        }}
                        className="h-[28px] w-[28px] cursor-pointer accent-[var(--color-blue-dark)]"
                      />
                    )}
                  />
                  У меня нет отчества
                </label>

                <Field label="Имя ENG" hint="как в загранпаспорте" error={errors.firstNameLatin?.message}>
                  <input className="input-design h-[32px]" {...register('firstNameLatin')} />
                </Field>

                <Field
                  label="Фамилия ENG"
                  hint="как в загранпаспорте"
                  error={errors.lastNameLatin?.message}
                >
                  <input className="input-design h-[32px]" {...register('lastNameLatin')} />
                </Field>

                <div className="profile-edit-select md:col-span-2">
                  <UserLocationFields
                    countries={countries}
                    cities={cities}
                    onChange={({ countries: nextCountries, cities: nextCities }) => {
                      setValue('countries', nextCountries, { shouldValidate: true });
                      setValue('cities', nextCities, { shouldValidate: true });
                    }}
                  />
                  {errors.countries?.message ? (
                    <p className="text-error">{errors.countries.message}</p>
                  ) : null}
                  {errors.cities?.message ? (
                    <p className="text-error">{errors.cities.message}</p>
                  ) : null}
                </div>

                <Field label="Дата рождения" error={errors.birthDate?.message}>
                  <input type="date" className="input-design h-[32px]" {...register('birthDate')} />
                </Field>

                <Field label="Телефон" error={errors.phone?.message}>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneInput
                        country="ru"
                        enableSearch
                        containerClass="auth-phone"
                        inputClass="input-design auth-phone-input"
                        buttonClass="auth-phone-flag"
                        specialLabel=""
                        value={field.value || ''}
                        onChange={(value) => field.onChange(value)}
                        inputProps={{ name: 'tel', autoComplete: 'tel' }}
                      />
                    )}
                  />
                </Field>

                <Field label="О себе" hint="необязательно" className="md:col-span-2" error={errors.bio?.message}>
                  <textarea
                    className="input-design min-h-[154px] resize-none"
                    maxLength={500}
                    {...register('bio')}
                  />
                  <div className="mt-1 text-right text-[12px] text-[#8D96B5]">{bio.length}/500</div>
                </Field>

                <Field label="IBAO ID" hint="если есть" error={errors.ibaoId?.message}>
                  <input className="input-design h-[32px]" {...register('ibaoId')} />
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
                type="submit"
                disabled={updateMe.isPending}
                className="btn btn-dark h-[52px] rounded-[10px] px-8 text-[16px] font-extrabold"
              >
                {updateMe.isPending ? 'Сохраняю...' : 'Сохранить'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className = '',
  error,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <label className={`block text-[14px] font-medium text-blue-dark ${className}`}>
      {label}
      {hint ? <span className="ml-1 font-normal text-[#8D96B5]">{hint}</span> : null}
      <div className="mt-1">{children}</div>
      {error ? <p className="text-error">{error}</p> : null}
    </label>
  );
}
