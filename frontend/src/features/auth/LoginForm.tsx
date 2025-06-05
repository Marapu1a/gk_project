import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/validators/auth';
import type { LoginFormData } from '@/validators/auth';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';

export function LoginForm() {
  const navigate = useNavigate();
  const mutation = useLoginMutation();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        login(res.token); // <- вызовет и saveAuth, и setUser
        navigate(res.redirectTo);
      },
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
        <input
          {...register('email')}
          placeholder="Email"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}

        <input
          {...register('password')}
          type="password"
          placeholder="Пароль"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Вход...' : 'Войти'}
        </button>

        <p className="text-sm text-center text-gray-600">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            Забыли пароль?
          </Link>
        </p>

        {mutation.isError && <p className="text-red-600 text-sm">{'Неверный email или пароль'}</p>}
      </form>
      <BackButton />
    </>
  );
}
