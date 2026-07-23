export function LegacyVersionBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-[#E8F5C8] px-2.5 py-1 text-[12px] font-bold leading-none text-[#536E13] ${className}`}
    >
      Из старой версии
    </span>
  );
}
