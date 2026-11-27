import React, { forwardRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
// Style u072-* của Alert; trước đây chỉ LucianInlineAlert import nên trang nào không tải nó thì Alert mất style
import '@/styles/modules/lucian/lucian-072.css';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dismissLabel?: string;
  onDismiss?: () => void;
  announce?: boolean;
}

const config = {
  info: { color: 'var(--studio-status-info)', icon: Info },
  success: { color: 'var(--studio-status-success)', icon: CheckCircle2 },
  warning: { color: 'var(--studio-status-warning)', icon: AlertTriangle },
  danger: { color: 'var(--studio-status-danger)', icon: AlertCircle },
  neutral: { color: 'var(--studio-ink-muted)', icon: Info },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    tone = 'neutral',
    title,
    icon,
    action,
    dismissLabel,
    onDismiss,
    announce,
    className,
    children,
    ...props
  },
  ref,
) {
  const Icon = config[tone].icon;
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : announce ? 'status' : undefined;
  return (
    <div ref={ref} {...props} role={role} className={cn('u072 u072-it', className)}>
      <div className='u072-a' style={{ '--c': config[tone].color } as React.CSSProperties}>
        <span className='u072-ic' aria-hidden='true'>
          {icon ?? <Icon className='size-4' />}
        </span>
        <div className='u072-tx'>
          {title && <b>{title}</b>}
          <div>{children}</div>
          {action}
        </div>
        {onDismiss && dismissLabel && (
          <button type='button' onClick={onDismiss} aria-label={dismissLabel} className='u072-x'>
            <X className='size-3.5' aria-hidden='true' />
          </button>
        )}
      </div>
    </div>
  );
});
