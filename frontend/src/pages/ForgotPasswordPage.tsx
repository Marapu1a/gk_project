import { AuthScreen } from '@/features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthScreen title="Восстановление пароля" maxWidth="max-w-[380px]">
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
