// src/features/backup/components/AdminDbBackupBlock.tsx
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { useCreateDbBackup } from '../hooks/useCreateDbBackup';

export function AdminDbBackupBlock() {
  const backup = useCreateDbBackup();

  const onClick = async () => {
    try {
      await backup.mutateAsync();
      toast.success('Бэкап создан');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка создания бэкапа');
    }
  };

  return (
    <Button onClick={onClick} disabled={backup.isPending}>
      {backup.isPending ? 'Делаю бэкап…' : 'Сделать бэкап БД'}
    </Button>
  );
}
