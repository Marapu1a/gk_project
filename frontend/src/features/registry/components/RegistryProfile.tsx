import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { CheckCircle, Mail, Printer, Send, XCircle } from 'lucide-react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useRegistryProfile } from '../hooks/useRegistryProfile';
import type { RegistryCertificate } from '../api/getRegistryProfile';
import { SpecialistContactModal } from './SpecialistContactModal';
import { formatCertificateDate, isCertificateDateActive } from '@/features/certificate/utils/certificateDates';
import { ModalCloseButton } from '@/components/ModalCloseButton';

const COPY_ICON = '/dashboard-v2/icon_copy.svg';

type Props = { userId: string };

function certificateUrl(cert: RegistryCertificate) {
  return `/uploads/${cert.fileId}`;
}

function certificateFileName(cert: RegistryCertificate) {
  const title = cert.title?.trim() || 'certificate';
  const number = cert.number?.trim() || cert.id;
  return `${title}-${number}.pdf`.replace(/[\\/:*?"<>|]+/g, '-');
}

function isCertificateActive(cert: RegistryCertificate) {
  return isCertificateDateActive(cert.expiresAt);
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} скопирован`);
  } catch {
    toast.error('Не удалось скопировать');
  }
}

export function RegistryProfile({ userId }: Props) {
  const { data: profile, isLoading, error } = useRegistryProfile(userId);
  const [previewCert, setPreviewCert] = useState<RegistryCertificate | null>(null);
  const [checkCert, setCheckCert] = useState<RegistryCertificate | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  if (isLoading) {
    return <div className="rounded-[18px] bg-white px-5 py-8 text-center text-[#8D96B5] shadow-soft">Загрузка...</div>;
  }

  if (error || !profile) {
    return <div className="rounded-[18px] bg-white px-5 py-8 text-center text-[#8D96B5] shadow-soft">Профиль не найден</div>;
  }

  const cert = profile.certificate;
  const canContact = Boolean(cert && isCertificateActive(cert));
  const avatarPlaceholder = '/avatar_placeholder.svg';
  const location = [profile.country, profile.city].filter(Boolean).join(', ');

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  return (
    <>
      <section className="rounded-[22px] bg-white px-5 py-5 shadow-soft md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[276px_minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="flex h-[276px] w-full items-center justify-center overflow-hidden rounded-[10px] border border-[#B8C1D6] bg-[#E7EAF0]">
              <img
                src={profile.avatarUrl || avatarPlaceholder}
                alt={profile.fullName}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.src.endsWith('avatar_placeholder.svg')) return;
                  image.src = avatarPlaceholder;
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                disabled={!canContact}
                className="btn min-h-[44px] rounded-[8px] bg-[var(--color-blue-dark)] px-4 text-[15px] font-extrabold text-white hover:bg-[#16254A] disabled:cursor-not-allowed disabled:bg-[#D1D7E3]"
                title={canContact ? 'Связаться со специалистом' : 'Связаться можно только со специалистом с действующим сертификатом'}
              >
                Связаться
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="btn min-h-[44px] rounded-[8px] border-2 border-[var(--color-blue-dark)] bg-white px-4 text-[15px] font-extrabold text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)]"
              >
                Поделиться
              </button>
            </div>

            {cert ? (
              <button
                type="button"
                onClick={() => setCheckCert(cert)}
                className="btn min-h-[44px] w-full rounded-[8px] border-2 border-[var(--color-blue-dark)] bg-white px-4 text-[15px] font-extrabold text-[var(--color-blue-dark)] hover:bg-[var(--color-blue-soft)]"
              >
                Проверить сертификат
              </button>
            ) : null}
          </div>

          <div className="min-w-0 px-0 py-2 lg:px-1">
            <h1 className="text-[18px] leading-tight text-[#222]">
              <strong className="font-extrabold">{profile.fullName.split(' ')[0]}</strong>{' '}
              {profile.fullName.split(' ').slice(1).join(' ')}
            </h1>

            {profile.groupName ? (
              <span className="mt-4 inline-flex min-h-[28px] max-w-full items-center rounded-full bg-[var(--color-blue-soft)] px-3 text-[14px] font-extrabold leading-[1.1] text-[var(--color-blue-dark)]">
                <span className="truncate">{profile.groupName}</span>
              </span>
            ) : null}

            {profile.bio ? (
              <div className="mt-5 border-l-[6px] border-[var(--color-blue-soft)] pl-3 text-[14px] leading-[1.25] text-[#222] whitespace-pre-wrap">
                {profile.bio}
              </div>
            ) : (
              <p className="mt-5 text-[14px] leading-[1.35] text-[#8D96B5]">Описание специалиста пока не заполнено.</p>
            )}

            {location ? <p className="mt-5 text-[14px] font-semibold text-[#8D96B5]">{location}</p> : null}
          </div>

          <div className="flex flex-col items-center lg:items-end">
            {cert ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewCert(cert)}
                  className="flex h-[320px] w-full max-w-[250px] cursor-pointer items-center justify-center rounded-[4px] bg-white p-1 transition hover:shadow-soft"
                  aria-label="Открыть сертификат"
                  title="Открыть сертификат"
                >
                  <CertificatePreview cert={cert} className="h-full w-full" />
                </button>
                <button
                  type="button"
                  onClick={() => copyText(cert.number, 'Номер сертификата')}
                  className="mt-3 inline-flex max-w-full cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[var(--color-blue-dark)] hover:text-[#16254A]"
                  title="Скопировать номер сертификата"
                >
                  <span className="truncate">{cert.number}</span>
                  <img src={COPY_ICON} alt="" className="h-[14px] w-[14px]" />
                </button>
              </>
            ) : (
              <div className="flex h-[320px] w-full max-w-[250px] items-center justify-center rounded-[10px] bg-[var(--color-blue-soft)] px-4 text-center text-[14px] font-semibold text-[#8D96B5]">
                Сертификат не найден
              </div>
            )}
          </div>
        </div>
      </section>

      {previewCert ? <CertificateFullscreenModal cert={previewCert} onClose={() => setPreviewCert(null)} /> : null}
      {checkCert ? (
        <CertificateCheckModal
          cert={checkCert}
          fullName={profile.fullName}
          onClose={() => setCheckCert(null)}
        />
      ) : null}
      <SpecialistContactModal
        specialistId={profile.id}
        specialistName={profile.fullName}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </>
  );
}

function CertificatePreview({ cert, className = '' }: { cert: RegistryCertificate; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const url = certificateUrl(cert);

  useEffect(() => {
    let cancelled = false;
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    async function renderPdf(canvas: HTMLCanvasElement) {
      try {
        setFailed(false);
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 760;
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');

        if (!context) {
          setFailed(true);
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        context.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, canvasContext: context, viewport }).promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    renderPdf(canvasElement);

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-[8px] border border-[#DCE3EF] bg-[#F4F6FA] px-5 text-center text-[#8D96B5] ${className}`}>
        <p className="text-[18px] font-extrabold text-[var(--color-blue-dark)]">Сертификат не найден</p>
        <p className="mt-2 max-w-[260px] text-[14px] font-semibold leading-[1.25]">
          Тут должен быть файл сертификата, но сейчас он недоступен.
        </p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={`object-contain ${className}`} aria-label={cert.title || 'Сертификат'} />;
}

function CertificateFullscreenModal({ cert, onClose }: { cert: RegistryCertificate; onClose: () => void }) {
  const url = certificateUrl(cert);

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
    toast.info('Отправка пока не работает. Скачайте сертификат и отправьте файл вручную.');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-5">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть просмотр сертификата" />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-[760px] flex-col items-center overflow-y-auto">
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
            download={certificateFileName(cert)}
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
    </div>,
    document.body,
  );
}

function CertificateCheckModal({
  cert,
  fullName,
  onClose,
}: {
  cert: RegistryCertificate;
  fullName: string;
  onClose: () => void;
}) {
  const active = isCertificateActive(cert);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-5">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть проверку сертификата" />

      <div className="relative z-10 max-h-[90vh] w-full max-w-[750px] overflow-y-auto rounded-[22px] bg-white px-7 py-7 shadow-soft">
        <ModalCloseButton onClick={onClose} iconClassName="h-7 w-7" />

        <h2 className="mb-6 flex items-center justify-center gap-2 text-[30px] font-extrabold leading-none text-[var(--color-blue-dark)]">
          {active ? (
            <CheckCircle size={28} className="text-[var(--color-green-brand)]" />
          ) : (
            <XCircle size={28} className="text-[var(--color-danger)]" />
          )}
          О сертификате
        </h2>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-[330px_minmax(0,1fr)]">
          <div className="flex justify-center">
            <CertificatePreview cert={cert} className="max-h-[462px] w-full max-w-[330px]" />
          </div>

          <dl className="space-y-7 text-[#222]">
            <CertificateField label="ФИО" value={fullName} />
            <CertificateField label="Уровень" value={cert.title || '—'} />
            <CertificateField label="Выдан" value={formatCertificateDate(cert.issuedAt)} />
            <CertificateField
              label="Действует до"
              value={formatCertificateDate(cert.expiresAt)}
              danger={!active}
            />
            <div>
              <dt className="mb-1 text-[15px] font-semibold text-[#8D96B5]">Номер</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => copyText(cert.number, 'Номер сертификата')}
                  className="inline-flex max-w-full cursor-pointer items-center gap-1.5 text-[18px] font-medium text-[var(--color-blue-dark)] hover:text-[#16254A]"
                >
                  <span className="truncate">{cert.number}</span>
                  <img src={COPY_ICON} alt="" className="h-[16px] w-[16px]" />
                </button>
              </dd>
            </div>
            <CertificateField label="Орган" value="ЦС ПАП" />
          </dl>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CertificateField({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="mb-1 text-[15px] font-semibold text-[#8D96B5]">{label}</dt>
      <dd className={`text-[18px] font-medium ${danger ? 'text-[var(--color-danger)]' : 'text-[#222]'}`}>
        {value}
      </dd>
    </div>
  );
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
