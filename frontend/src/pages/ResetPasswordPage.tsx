import { BackButton } from '@/components/BackButton';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="p-4">
      <ResetPasswordForm />
      <BackButton />
    </div>
  );
}
