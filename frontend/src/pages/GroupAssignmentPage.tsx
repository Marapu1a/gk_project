import { BackButton } from '@/components/BackButton';
import { GroupAssignmentForm } from '@/features/groups/components/GroupAssignmentForm';

export default function GroupAssignmentPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Управление группами</h1>
      <GroupAssignmentForm />
      <BackButton />
    </div>
  );
}
