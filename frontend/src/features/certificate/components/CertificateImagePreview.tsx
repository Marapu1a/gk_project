import { useEffect, useMemo, useState } from 'react';

type Props = {
  certificateId: string;
  fileVersion: string;
  title: string;
  className?: string;
  allowRetry?: boolean;
};

function apiUrl(path: string) {
  const base = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}

export function CertificateImagePreview({
  certificateId,
  fileVersion,
  title,
  className = '',
  allowRetry = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setFailed(false);
    setRetry(0);
  }, [certificateId, fileVersion]);

  const src = useMemo(() => {
    const params = new URLSearchParams({ v: fileVersion });
    if (retry > 0) params.set('retry', String(retry));
    return apiUrl(`/certificates/${encodeURIComponent(certificateId)}/preview?${params}`);
  }, [certificateId, fileVersion, retry]);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[8px] border border-[#DCE3EF] bg-[#F4F6FA] px-5 text-center text-[#8D96B5] ${className}`}
      >
        <p className="text-[18px] font-extrabold text-[var(--color-blue-dark)]">
          Не удалось загрузить превью
        </p>
        <p className="mt-2 max-w-[300px] text-[14px] font-semibold leading-[1.3]">
          Сам сертификат доступен для просмотра и скачивания.
        </p>
        {allowRetry ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setFailed(false);
              setRetry(Date.now());
            }}
            className="btn mt-4 min-h-[40px] rounded-[8px] bg-[var(--color-blue-dark)] px-5 text-[14px] font-extrabold text-white hover:bg-[#16254A]"
          >
            Попробовать снова
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || 'Сертификат'}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
