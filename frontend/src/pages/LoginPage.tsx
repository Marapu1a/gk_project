// src/pages/LoginPage.tsx
import { LoginForm } from '../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-blue-dark">Вход</h1>
      <LoginForm />
    </div>
  );
}
