// src/pages/LoginPage.tsx
import { AuthScreen } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <AuthScreen title="Вход" maxWidth="max-w-[380px]">
      <LoginForm />
    </AuthScreen>
  );
}
