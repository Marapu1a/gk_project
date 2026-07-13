// src/features/certificate/components/MyCertificatesBlock.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';

import { useMyCertificates } from '../hooks/useMyCertificates';
import type { CertificateDTO } from '../api/issueCertificate';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { usePdfPreview } from '@/hooks/usePdfPreview';

function fileUrl(cert: CertificateDTO) {
  return `/uploads/${cert.file.fileId}`;
}

function fileName(cert: CertificateDTO) {
  const safeTitle = cert.title?.trim() || 'certificate';
  const safeNumber = cert.number?.trim() || cert.id;
  return `${safeTitle}-${safeNumber}.pdf`.replace(/[\\/:*?"<>|]+/g, '-');
}

export function MyCertificatesBlock() {
  const { data, isLoading, error } = useMyCertificates(true);
  const [selected, setSelected] = useState<CertificateDTO | null>(null);

  const certs = data ?? [];

  if (isLoading) {
    return <p className="text-[14px] text-[#6B7894]">Загрузка сертификатов...</p>;
  }

  if (error) {
    return <p className="text-[14px] text-[#FF5364]">Ошибка загрузки сертификатов</p>;
  }

  if (!certs.length) {
    return (
      <section className="card-section mx-auto max-w-[720px] text-center text-[16px] text-[#6B7894] shadow-soft">
        У вас пока нет выданных сертификатов.
      </section>
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {certs.map((cert) => (
          <button
            key={cert.id}
            type="button"
            onClick={() => setSelected(cert)}
            className="group flex min-h-[408px] cursor-pointer items-center justify-center rounded-[10px] border border-[#B8C4D8] bg-white p-5 transition hover:border-[var(--color-blue-dark)] hover:shadow-soft"
            title="Открыть сертификат"
          >
            <CertificatePreview cert={cert} className="h-full max-h-[368px] w-full" />
          </button>
        ))}
      </section>

      {selected ? (
        <CertificateModal cert={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

function CertificatePreview({ cert, className = '' }: { cert: CertificateDTO; className?: string }) {
  const url = fileUrl(cert);
  const { canvasRef, failed } = usePdfPreview(url);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-[4px] border border-[#DCE3EF] bg-[#F4F6FA] text-[18px] font-extrabold text-[#8D96B5] ${className}`}
      >
        PDF
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`object-contain ${className}`}
      aria-label={cert.title || 'Сертификат'}
    />
  );
}

function CertificateModal({ cert, onClose }: { cert: CertificateDTO; onClose: () => void }) {
  const url = fileUrl(cert);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => iframe.remove(), 1000);
    };
  };

  const showTemporaryUnavailable = () => {
    toast.info(UI_TOAST_MESSAGES.certificate.sendUnavailable);
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Закрыть просмотр сертификата"
      />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-[760px] flex-col items-center">
        <ModalCloseButton
          onClick={onClose}
          variant="light"
          iconClassName="h-6 w-6 brightness-0 invert"
          positionClassName="absolute right-[34px] top-[-34px] flex h-11 w-11"
          className="opacity-80"
        />

        <div className="flex max-h-[calc(96vh-82px)] w-full items-center justify-center">
          <div className="rounded-[6px] bg-white p-2 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
            <CertificatePreview cert={cert} className="max-h-[calc(96vh-98px)] max-w-full" />
          </div>
        </div>

        <div className="mt-4 flex w-full max-w-[410px] items-center justify-between gap-5">
          <a
            href={url}
            download={fileName(cert)}
            className="btn h-[44px] min-w-[126px] rounded-[8px] border-2 border-white px-6 text-[14px] font-extrabold text-white hover:bg-white/10"
          >
            Скачать
          </a>

          <div className="flex items-center gap-3">
            <IconAction title="Отправить по email" onClick={showTemporaryUnavailable}>
              <Mail size={22} />
            </IconAction>

            <IconAction title="Отправить в мессенджере" onClick={showTemporaryUnavailable}>
              <Send size={22} />
            </IconAction>

            <IconAction title="Распечатать" onClick={handlePrint}>
              <Printer size={22} />
            </IconAction>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="btn h-[36px] w-[36px] rounded-[8px] border-2 border-white text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}
