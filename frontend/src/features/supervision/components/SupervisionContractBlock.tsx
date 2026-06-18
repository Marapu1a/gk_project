import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { uploadFile } from '@/features/files/api/uploadFile';
import { useReviewerSuggestions } from '../hooks/useReviewerSuggestions';
import {
  useDeleteSupervisionContract,
  useCreateSupervisionContract,
  useSupervisionContracts,
} from '../hooks/useSupervisionContracts';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { ModalCloseButton } from '@/components/ModalCloseButton';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const MAX_SIZE_MB = 10;

const norm = (value: string) => value.toLowerCase().normalize('NFKC').trim();
const tokenize = (value: string) =>
  norm(value)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

type ReviewerSuggestion = {
  id: string;
  fullName: string | null;
  email: string;
  groups?: { name: string }[];
};

type SupervisionContractBlockProps = {
  open: boolean;
  onClose: () => void;
};

export function SupervisionContractBlock({ open, onClose }: SupervisionContractBlockProps) {
  const [supervisorInput, setSupervisorInput] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: contracts = [], isLoading } = useSupervisionContracts();
  const createContract = useCreateSupervisionContract();
  const deleteContract = useDeleteSupervisionContract();
  const { confirm } = useConfirm();

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(supervisorInput.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [supervisorInput]);

  const { data: usersData, isLoading: isUsersLoading } = useReviewerSuggestions({
    search,
    supervision: 'practice',
    limit: 20,
  });

  const suggestions = (usersData?.users ?? []) as ReviewerSuggestion[];
  const matchedUsers = useMemo(() => {
    const tokens = tokenize(supervisorInput);
    if (!tokens.length) return [];

    return suggestions.filter((suggestion) => {
      const hay = norm(
        [
          suggestion.fullName,
          suggestion.email,
          ...(suggestion.groups?.map((group) => group.name) ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      );
      return tokens.every((token) => hay.includes(token));
    });
  }, [suggestions, supervisorInput]);

  const handleDrop = (accepted: File[]) => {
    const file = accepted[0];

    if (!file || uploading || createContract.isPending) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Файл больше ${MAX_SIZE_MB} МБ`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    const trimmedSupervisor = supervisorInput.trim();

    if (!trimmedSupervisor) {
      toast.error('Укажите супервизора для контракта');
      return;
    }

    if (!selectedFile) {
      toast.error('Выберите файл контракта');
      return;
    }

    const confirmed = await confirm({
      message: 'Загрузить контракт с выбранным супервизором?',
      confirmLabel: 'Загрузить',
    });
    if (!confirmed) return;

    setUploading(true);
    try {
      const uploaded = await uploadFile(selectedFile, 'supervisor-contracts');
      await createContract.mutateAsync({
        uploadedFileId: uploaded.id,
        supervisorInput: trimmedSupervisor,
        supervisorId: selectedSupervisorId,
      });
      toast.success('Контракт загружен');
      setSupervisorInput('');
      setSelectedSupervisorId(undefined);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось загрузить контракт');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      message: 'Удалить загруженный контракт?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteContract.mutateAsync(id);
      toast.success('Контракт удален');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить контракт');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: {
      'application/pdf': [],
      'image/jpeg': [],
      'image/png': [],
    },
    disabled: uploading || createContract.isPending,
  });

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervision-contract-title"
        className="relative max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[16px] bg-white px-5 pb-5 pt-4 text-[#1F305E] shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:px-7 sm:pb-7"
      >
        <ModalCloseButton onClick={onClose} iconClassName="h-6 w-6" />

        <h2
          id="supervision-contract-title"
          className="pr-9 text-center text-[22px] font-extrabold leading-tight sm:text-[24px]"
        >
          Контракт с супервизором
        </h2>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div>
              <h3 className="mb-4 text-[16px] font-extrabold">Загрузить контракт</h3>

              <label className="relative block text-[13px] font-semibold text-[#1F305E]">
                <span className="mb-1 block">Добавить супервизора</span>
                <input
                  className="input-design h-[32px]"
                  value={supervisorInput}
                  onChange={(event) => {
                    setSupervisorInput(event.target.value);
                    setSelectedSupervisorId(undefined);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (supervisorInput.trim()) setShowSuggestions(true);
                  }}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="ФИО или Email"
                  autoComplete="off"
                />

                {showSuggestions && supervisorInput.trim() && matchedUsers.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] bg-white shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                    {matchedUsers.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="w-full border-b border-[#DCE8EC] px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#F5F8FA]"
                        onClick={() => {
                          setSupervisorInput(suggestion.fullName || suggestion.email);
                          setSelectedSupervisorId(suggestion.id);
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="block font-semibold text-[#1F305E]">
                          {suggestion.fullName || 'Без имени'}
                        </span>
                        <span className="block text-[#6B7894]">{suggestion.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {showSuggestions &&
                supervisorInput.trim() &&
                !isUsersLoading &&
                matchedUsers.length === 0 ? (
                  <div className="absolute z-20 mt-1 w-full rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#6B7894] shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                    Супервизор не найден в системе.
                  </div>
                ) : null}
              </label>

              <div
                {...getRootProps()}
                className={`mt-4 flex min-h-[126px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed px-5 text-center text-[14px] transition ${
                  selectedFile
                    ? 'border-[#A5CB37] bg-[rgba(165,203,55,0.10)] text-[#1F305E] hover:bg-[rgba(165,203,55,0.14)]'
                    : 'border-[#B8C4D8] text-[#A7B1C7] hover:bg-[#F7F9FB]'
                } ${uploading || createContract.isPending ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  {selectedFile ? (
                    <span className="mx-auto flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[rgba(165,203,55,0.22)] text-[#75AD14]">
                      <span className="block h-[8px] w-[14px] rotate-[-45deg] border-b-[3px] border-l-[3px] border-current" />
                    </span>
                  ) : null}

                  <div className="font-medium">
                    {uploading || createContract.isPending
                      ? 'Загрузка...'
                      : isDragActive
                        ? 'Отпустите файл здесь'
                        : selectedFile
                          ? 'Файл выбран'
                          : 'Выберите или перетащите файл PDF, JPG, PNG'}
                  </div>

                  {selectedFile ? (
                    <>
                      <div className="mx-auto max-w-[260px] truncate text-[12px] text-[#6B7894]">
                        {selectedFile.name}
                      </div>
                      <div className="text-[12px] font-semibold text-[#1F305E]">Изменить файл</div>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  createContract.isPending ||
                  !selectedFile ||
                  !supervisorInput.trim()
                }
                className="btn btn-dark mt-4 h-[44px] w-full rounded-[10px] text-[15px] font-extrabold disabled:bg-[#B7BFCE]"
              >
                {uploading || createContract.isPending ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>

            <div>
              <h3 className="mb-4 text-[16px] font-extrabold">История контрактов</h3>

              <div className="space-y-3">
              {isLoading ? (
                <p className="text-[14px] text-[#6B7894]">Загрузка контрактов...</p>
              ) : contracts.length === 0 ? (
                <p className="text-[14px] text-[#6B7894]">Контракты пока не загружены.</p>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[10px] border border-[#A5CB37] bg-[rgba(165,203,55,0.10)] px-3 py-2 text-[13px] text-[#1F305E]">
                      <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[rgba(165,203,55,0.22)] text-[#75AD14]">
                        <span className="block h-[7px] w-[12px] rotate-[-45deg] border-b-[2px] border-l-[2px] border-current" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {contract.supervisorName || contract.supervisorInput}
                        </div>
                        <div className="truncate text-[#6B7894]">{contract.file.name}</div>
                        <div className="text-[11px] font-semibold text-[#75AD14]">Загружен</div>
                      </div>
                    </div>
                    <a
                      href={`/uploads/${contract.file.fileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn h-[32px] rounded-full border border-[#1F305E] px-4 text-[13px] font-semibold text-[#1F305E]"
                    >
                      Детали
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(contract.id)}
                      disabled={deleteContract.isPending}
                      className="flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full opacity-65 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Удалить контракт"
                      title="Удалить контракт"
                    >
                      <img src={EXIT_ICON} alt="" className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
              </div>
            </div>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
