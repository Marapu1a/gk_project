import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Сброс пароля</h1>
      <ResetPasswordForm />
    </div>
  );
}
