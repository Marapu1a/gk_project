// src/pages/CeuRequestPage.tsx
import { CeuRequestForm } from '@/features/ceu/components/CeuRequestForm';

export default function CeuRequestPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-dark">Создание заявки на CEU</h1>
      <CeuRequestForm />
    </div>
  );
}
