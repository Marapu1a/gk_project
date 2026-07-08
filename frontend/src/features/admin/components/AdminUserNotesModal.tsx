import { useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { LONG_TEXT_MAX_LENGTH } from '@/utils/formLimits';
import { useCreateUserNote } from '../hooks/useCreateUserNote';
import { useDeleteUserNote } from '../hooks/useDeleteUserNote';
import type { AdminUserActionLogItem } from '../api/getUserActionLog';
import { UI_TOAST_MESSAGES } from '../../../utils/uiMessages';
import { ModalCloseButton } from '@/components/ModalCloseButton';

type Props = {
  userId: string;
  notes: AdminUserActionLogItem[];
  isLoading?: boolean;
  onClose: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

export function AdminUserNotesModal({ userId, notes, isLoading, onClose }: Props) {
  const createNote = useCreateUserNote(userId);
  const deleteNote = useDeleteUserNote(userId);
  const { confirm } = useConfirm();
  const [noteText, setNoteText] = useState('');

  const saveNote = async () => {
    const text = noteText.trim();
    if (!text) {
      toast.info(UI_TOAST_MESSAGES.admin.noteRequired);
      return;
    }

    try {
      await createNote.mutateAsync(text);
      setNoteText('');
      toast.success(UI_TOAST_MESSAGES.admin.noteSaved);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.admin.noteSaveFailed);
    }
  };

  const removeNote = async (noteId: string) => {
    const ok = await confirm({
      message: 'Удалить заметку администратора?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteNote.mutateAsync(noteId);
      toast.success(UI_TOAST_MESSAGES.admin.noteDeleted);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.admin.noteDeleteFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[22px] bg-white p-5 pr-14 text-[var(--color-blue-dark)] shadow-soft">
        <ModalCloseButton onClick={onClose} />
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="dashboard-v2-title">Заметки администратора</h3>
            <p className="mt-1 text-[13px] font-semibold text-[#8D96B5]">
              Служебные заметки видны только администраторам.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
          <textarea
            className="input-design min-h-[84px] resize-y py-2"
            placeholder="Напишите служебную заметку"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            maxLength={LONG_TEXT_MAX_LENGTH}
            disabled={createNote.isPending}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn dashboard-v2-action dashboard-v2-action-primary"
              onClick={saveNote}
              disabled={createNote.isPending || !noteText.trim()}
            >
              Сохранить
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-[14px] bg-[#F7F8FA] px-4 py-5 text-center text-[14px] font-semibold text-[#8D96B5]">
              Загрузка заметок...
            </div>
          ) : notes.length ? (
            <ol className="space-y-2">
              {notes.map((note, index) => (
                <li
                  key={note.id}
                  className="grid gap-3 rounded-[14px] bg-[#F7F8FA] px-4 py-3 text-[14px] sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {index + 1}. {note.details}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[#8D96B5]">
                      {formatDate(note.createdAt)} · {note.adminEmail}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger self-start px-3 py-1 text-xs"
                    onClick={() => removeNote(note.id)}
                    disabled={deleteNote.isPending}
                  >
                    Удалить
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-[14px] bg-[#F7F8FA] px-4 py-5 text-center text-[14px] font-semibold text-[#8D96B5]">
              Заметок пока нет.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
