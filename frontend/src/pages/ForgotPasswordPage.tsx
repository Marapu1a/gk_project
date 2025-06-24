import { BackButton } from '@/components/BackButton';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="p-4">
      <ForgotPasswordForm />
      <BackButton />
    </div>
  );
}
