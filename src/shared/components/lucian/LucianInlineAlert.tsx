import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Alert } from '@/shared/ui';
import '@/styles/modules/lucian/lucian-072.css';

export interface LucianInlineAlertProps {
  type?: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description?: string;
  details?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function LucianInlineAlert({
  type = 'info',
  title,
  description,
  details,
  dismissible = true,
  onDismiss,
  className,
}: LucianInlineAlertProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert
      tone={type}
      title={title}
      className={className}
      onDismiss={
        dismissible
          ? () => {
              setDismissed(true);
              onDismiss?.();
            }
          : undefined
      }
      dismissLabel={t('common.alert.dismiss', 'Dismiss alert')}
      announce
    >
      {description && <p>{description}</p>}
      {details && (
        <>
          <button
            type='button'
            className='u072-more'
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open
              ? t('common.alert.hideDetails', 'Hide details')
              : t('common.alert.details', 'Details')}
            <ChevronDown className={`size-3.5 ${open ? 'rotate-180' : ''}`} aria-hidden='true' />
          </button>
          <code className={`u072-log block ${open ? 'on' : ''}`}>{details}</code>
        </>
      )}
    </Alert>
  );
}
