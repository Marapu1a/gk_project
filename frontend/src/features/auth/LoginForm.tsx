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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md mx-auto mt-12 font-sans space-y-5"
      >
        {/* Email */}
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          {...register('email')}
          className="input"
        />
        {errors.email && <p className="text-error">{errors.email.message}</p>}

        {/* Password */}
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          {...register('password')}
          className="input"
        />
        {errors.password && <p className="text-error">{errors.password.message}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-brand w-full disabled:opacity-50"
        >
          {mutation.isPending ? 'Вход...' : 'Войти'}
        </button>

        {/* Forgot Password */}
        <p className="text-sm text-center text-blue-dark">
          <Link to="/forgot-password" className="text-brand hover:underline font-medium">
            Забыли пароль?
          </Link>
        </p>

        {/* Error */}
        {mutation.isError && <p className="text-error text-center">Неверный email или пароль</p>}
        <BackButton />
      </form>
    </>
  );
}
