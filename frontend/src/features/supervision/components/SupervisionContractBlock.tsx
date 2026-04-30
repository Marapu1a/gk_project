import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { uploadFile } from '@/features/files/api/uploadFile';
import { useReviewerSuggestions } from '../hooks/useReviewerSuggestions';
import {
  useDeleteSupervisionContract,
  useCreateSupervisionContract,
  useSupervisionContracts,
} from '../hooks/useSupervisionContracts';

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

export function SupervisionContractBlock({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [supervisorInput, setSupervisorInput] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: contracts = [], isLoading } = useSupervisionContracts();
  const createContract = useCreateSupervisionContract();
  const deleteContract = useDeleteSupervisionContract();

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

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
        duration: 8000,
      });
    });

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

    const confirmed = await confirmToast('Загрузить контракт с выбранным супервизором?');
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
    const confirmed = await confirmToast('Удалить загруженный контракт?');
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`btn w-full rounded-[10px] border-2 border-[#1F305E] text-[16px] font-extrabold text-[#1F305E] transition-all duration-300 ease-out hover:bg-[rgba(31,48,94,0.04)] ${
          isOpen
            ? 'pointer-events-none mt-0 h-0 overflow-hidden opacity-0'
            : 'mt-5 h-[48px] opacity-100'
        }`}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        Загрузить контракт с супервизором
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <section className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-[64px] w-full items-center justify-center gap-2 text-[16px] font-extrabold text-[#1F305E]"
            >
              Контракт с супервизором
              <img
                src="/dashboard-v2/btn_hide.svg"
                alt=""
                className="h-[21px] w-[21px] cursor-pointer"
              />
            </button>

            <div className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out grid-rows-[1fr]">
              <div className="min-h-0">
                <div className="grid gap-8 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div>
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
                    Пользователь не найден. Можно ввести имя или email вручную.
                  </div>
                ) : null}
              </label>

              <div
                {...getRootProps()}
                className={`mt-4 flex min-h-[126px] cursor-pointer items-center justify-center rounded-[10px] border-2 border-dashed border-[#B8C4D8] px-5 text-center text-[14px] text-[#A7B1C7] transition hover:bg-[#F7F9FB] ${
                  uploading || createContract.isPending ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <input {...getInputProps()} />
                {uploading || createContract.isPending
                  ? 'Загрузка...'
                  : isDragActive
                    ? 'Отпустите файл здесь'
                    : selectedFile
                      ? selectedFile.name
                      : 'Выберите или перетащите файл PDF, JPG, PNG'}
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

            <div className="space-y-3">
              {isLoading ? (
                <p className="text-[14px] text-[#6B7894]">Загрузка контрактов...</p>
              ) : contracts.length === 0 ? (
                <p className="text-[14px] text-[#6B7894]">Контракты пока не загружены.</p>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                    <div className="min-w-0 rounded-[10px] bg-[#EFF1F5] px-3 py-2 text-[13px] text-[#1F305E]">
                      <div className="truncate font-semibold">
                        {contract.supervisorName || contract.supervisorInput}
                      </div>
                      <div className="truncate text-[#6B7894]">{contract.file.name}</div>
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
                      className="btn h-[32px] w-[32px] rounded-full border border-[#A7B1C7] text-[18px] leading-none text-[#1F305E] disabled:opacity-50"
                      aria-label="Удалить контракт"
                      title="Удалить контракт"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
