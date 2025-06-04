// src/pages/RegisterPage.tsx
import { RegisterForm } from '@/features/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <RegisterForm />
    </div>
  );
}
