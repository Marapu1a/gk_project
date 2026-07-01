import { ModalCloseButton } from '@/components/ModalCloseButton';

export type CertificateIssuedReport = {
  email: string;
  title: string;
  number: string;
  groupName: string;
  spentCeuCount: number | null;
  paymentsResetCount: number | null;
};

function formatNum(value: number | null) {
  return value == null ? '—' : String(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#DCE8EC] py-2 last:border-b-0">
      <span className="text-[13px] font-semibold text-[#6B7894]">{label}</span>
      <span className="text-[14px] font-extrabold text-[#1F305E]">{value}</span>
    </div>
  );
}

export function CertificateIssuedModal({
  report,
  onClose,
}: {
  report: CertificateIssuedReport;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative w-full max-w-[480px] rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="mb-5 text-center text-[20px] font-extrabold text-[#1F305E]">
          Сертификат выдан
        </h3>

        <div className="rounded-[12px] bg-[rgba(165,203,55,0.14)] px-4 py-3 text-center">
          <div className="text-[15px] font-extrabold text-[#1F305E]">«{report.title}»</div>
          <div className="mt-0.5 text-[13px] text-[#6B7894]">№ {report.number}</div>
        </div>

        <div className="mt-4">
          <Row label="Кому" value={report.email} />
          <Row label="Уровень обновлён" value={report.groupName} />
          <Row label="Цикл" value="Закрыт" />
          <Row label="CEU списано" value={formatNum(report.spentCeuCount)} />
          <Row label="Оплаты сброшены" value={formatNum(report.paymentsResetCount)} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-dark mt-6 h-[44px] w-full rounded-[10px] text-[14px] font-extrabold"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
