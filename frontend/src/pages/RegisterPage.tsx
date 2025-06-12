// src/pages/RegisterPage.tsx
import { RegisterForm } from '../features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-blue-dark">Регистрация</h1>
      <RegisterForm />
    </div>
  );
}
