/* Lucian UX/UI Prompt #072 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#072 */
/* Adapted for PanelForge Editorial AI Studio */

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Info, X } from 'lucide-react';
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

const TYPE_CONFIG = {
  danger: {
    color: 'var(--ux-danger, #EF4444)',
    icon: AlertCircle,
  },
  warning: {
    color: 'var(--ux-warn, #F59E0B)',
    icon: AlertTriangle,
  },
  info: {
    color: 'var(--ux-accent, #3B82F6)',
    icon: Info,
  },
  success: {
    color: 'var(--ux-mint, #10B981)',
    icon: CheckCircle2,
  },
};

export const LucianInlineAlert: React.FC<LucianInlineAlertProps> = ({
  type = 'info',
  title,
  description,
  details,
  dismissible = true,
  onDismiss,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (isDismissed) return null;

  const config = TYPE_CONFIG[type];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`u072 ${className}`}>
      <div className={`u072-it ${isDismissed ? 'gone' : ''}`}>
        <div>
          <div
            className='u072-a'
            role={type === 'danger' || type === 'warning' ? 'alert' : 'status'}
            style={{ '--c': config.color } as React.CSSProperties}
          >
            <span className='u072-ic' aria-hidden='true'>
              <IconComponent className='w-4 h-4' />
            </span>

            <div className='u072-tx'>
              <b>{title}</b>
              {description && <p>{description}</p>}

              {details && (
                <>
                  <button
                    type='button'
                    className='u072-more'
                    aria-expanded={isDetailsOpen}
                    onClick={() => setIsDetailsOpen((prev) => !prev)}
                  >
                    <span>{isDetailsOpen ? 'Ẩn chi tiết' : 'Chi tiết'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isDetailsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div className={`u072-log ${isDetailsOpen ? 'on' : ''}`}>
                    <div>
                      <code>{details}</code>
                    </div>
                  </div>
                </>
              )}
            </div>

            {dismissible && (
              <button
                type='button'
                onClick={handleDismiss}
                aria-label='Đóng thông báo'
                className='u072-x'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
