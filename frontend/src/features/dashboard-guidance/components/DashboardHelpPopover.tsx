import type { ReactNode } from 'react';
import { HelpTooltip } from '@/components/HelpTooltip';

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

export function DashboardHelpPopover({ title, children, className, align = 'center' }: Props) {
  return (
    <HelpTooltip
      title={title}
      content={children}
      className={className}
      align={align}
    />
  );
}
