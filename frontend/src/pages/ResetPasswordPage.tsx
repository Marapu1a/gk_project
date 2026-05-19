import { AuthScreen } from '@/features/auth/components/AuthLayout';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <AuthScreen title="Сброс пароля" maxWidth="max-w-[380px]">
      <ResetPasswordForm />
    </AuthScreen>
  );
}
