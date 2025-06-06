import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/validators/auth';
import type { RegisterFormData } from '@/validators/auth';
import { useRegisterMutation } from '@/hooks/useRegisterMutation';
import { saveAuth } from '@/utils/auth';
import { useNavigate, Link } from 'react-router-dom';

export function RegisterForm() {
  const navigate = useNavigate();
  const mutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...payload } = data;
    mutation.mutate(payload, {
      onSuccess: (res) => {
        saveAuth(res.token);
        navigate('/dashboard');
      },
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md mx-auto mt-12 font-sans space-y-5"
      >
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          {...register('email')}
          className="input"
        />
        {errors.email && <p className="text-error">{errors.email.message}</p>}

        <input type="text" placeholder="Имя" {...register('firstName')} className="input" />
        {errors.firstName && <p className="text-error">{errors.firstName.message}</p>}

        <input type="text" placeholder="Фамилия" {...register('lastName')} className="input" />
        {errors.lastName && <p className="text-error">{errors.lastName.message}</p>}

        <input type="tel" placeholder="Телефон" {...register('phone')} className="input" />
        {errors.phone && <p className="text-error">{errors.phone.message}</p>}

        <input
          type="password"
          autoComplete="new-password"
          placeholder="Пароль"
          {...register('password')}
          className="input"
        />
        {errors.password && <p className="text-error">{errors.password.message}</p>}

        <input
          type="password"
          autoComplete="new-password"
          placeholder="Повторите пароль"
          {...register('confirmPassword')}
          className="input"
        />
        {errors.confirmPassword && <p className="text-error">{errors.confirmPassword.message}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-brand w-full disabled:opacity-50"
        >
          {mutation.isPending ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        {mutation.isError && (
          <p className="text-error text-center">Ошибка: {mutation.error?.message}</p>
        )}
        <p className="text-sm text-center text-blue-dark">
          Уже есть аккаунт?
          <Link to="/login" className="ml-1 text-brand hover:underline font-medium">
            Войти
          </Link>
        </p>
      </form>
    </>
  );
}
