import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { useCreateDbBackup } from '../hooks/useCreateDbBackup';

export function AdminDbBackupBlock() {
  const backup = useCreateDbBackup();

  const onClick = async () => {
    try {
      const result = await backup.mutateAsync();
      toast.success(`Бэкап скачан: ${result.file}`);
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
