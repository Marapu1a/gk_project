// src/pages/RegisterPage.tsx
import { AuthScreen } from '@/features/auth/components/AuthLayout';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthScreen title="Регистрация" maxWidth="max-w-[628px]">
      <RegisterForm />
    </AuthScreen>
  );
}
