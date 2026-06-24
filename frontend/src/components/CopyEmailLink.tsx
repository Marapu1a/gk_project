import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

type CopyEmailLinkProps = {
  email: string;
  children?: ReactNode;
  className?: string;
  title?: string;
};

export function CopyEmailLink({
  email,
  children,
  className = '',
  title = 'Скопировать почту',
}: CopyEmailLinkProps) {
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(UI_TOAST_MESSAGES.admin.emailCopied);
    } catch {
      toast.error(UI_TOAST_MESSAGES.admin.emailCopyFailed);
    }
  };

  return (
    <button type="button" onClick={copyEmail} className={className} title={title}>
      {children ?? email}
    </button>
  );
}
