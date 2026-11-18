import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertTone } from './Alert';
import '@/styles/modules/lucian/lucian-070.css';

export type ToastType = AlertTone | 'error' | 'logout';

export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface ToastData {
  id: string;
  title: string;
  description: string;
  tone: AlertTone;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  iconTestId?: string;
}

export interface ToastProps {
  toast: ToastData;
  closeLabel: string;
  onClose: (id: string) => void;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
  error: AlertCircle,
  logout: LogOut,
};
const colors = {
  info: 'var(--studio-status-info, #2563eb)',
  success: 'var(--studio-status-success, #119c72)',
  warning: 'var(--studio-status-warning, #d6731e)',
  danger: 'var(--studio-status-danger, #d93a55)',
  neutral: 'var(--studio-ink-muted, #57534e)',
};

export function Toast({ toast, closeLabel, onClose }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration ?? 5000);
  const toastType = toast.type ?? toast.tone;
  const Icon = icons[toastType];

  useEffect(() => {
    if (toast.tone === 'danger' || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [onClose, paused, toast.id, toast.tone]);

  return (
    <div
      className={cn(
        'u070-t !relative !inset-auto !left-auto !right-auto !top-auto !transform-none flex items-start gap-3.5 min-h-[60px] p-4 rounded-2xl bg-white dark:bg-[#1C1917] text-[#1C1917] dark:text-[#FCFBF8]',
        'shadow-[0_12px_36px_-6px_rgba(28,27,27,0.16)] border border-stone-200/90 dark:border-stone-800 border-l-[5px] pointer-events-auto select-none overflow-hidden backdrop-blur-md transition-all',
        `u070-type-${toast.tone}`,
      )}
      style={
        { '--c': colors[toast.tone], borderLeftColor: colors[toast.tone] } as React.CSSProperties
      }
      role='status'
      aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
      aria-atomic='true'
      data-testid={`toast-item-${toastType}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <span
        className='u070-ic flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 shadow-2xs'
        style={{ color: colors[toast.tone] }}
        aria-hidden='true'
        data-testid={toast.iconTestId ?? `toast-icon-${toastType}`}
      >
        <Icon className='size-5' />
      </span>
      <div className='u070-tx flex-1 min-w-0 flex flex-col gap-0.5 text-left'>
        <b className='text-sm font-semibold text-stone-900 dark:text-stone-100 whitespace-pre-line break-words leading-snug'>
          {toast.title}
        </b>
        {toast.description && (
          <small className='text-xs text-stone-600 dark:text-stone-400 whitespace-pre-line break-words leading-relaxed'>
            {toast.description}
          </small>
        )}
        {toast.action && (
          <button
            type='button'
            className='u070-act text-xs font-semibold text-[#F97316] hover:underline mt-1 text-left cursor-pointer'
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type='button'
        className='u070-x flex-shrink-0 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer'
        aria-label={closeLabel}
        onClick={() => onClose(toast.id)}
      >
        <X className='size-4' aria-hidden='true' />
      </button>
    </div>
  );
}

export function ToastStack({
  toasts,
  closeLabel,
  regionLabel,
  onClose,
}: {
  toasts: ToastData[];
  closeLabel: string;
  regionLabel: string;
  onClose: (id: string) => void;
}) {
  const stackRef = useRef<HTMLDivElement>(null);

  // Modern Web Guidance (MWG-10): Promotes Toast container to Top Layer using popover="manual"
  // so toasts remain visible and interactive above native modal dialogs without backdrop interception.
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    if (toasts.length > 0) {
      if (typeof el.showPopover === 'function') {
        try {
          el.showPopover();
        } catch {
          // ignore
        }
      }
    } else {
      if (typeof el.hidePopover === 'function') {
        try {
          el.hidePopover();
        } catch {
          // ignore
        }
      }
    }
  }, [toasts.length]);

  if (!toasts.length) return null;
  return (
    <div
      ref={stackRef}
      popover='manual'
      className='u070-zone !fixed !inset-auto !bottom-5 !right-5 !left-auto !top-auto !m-0 !p-0 !border-none !bg-transparent !z-[var(--studio-z-toast)] flex flex-col gap-3 overflow-visible w-[380px] max-w-[calc(100vw-32px)] pointer-events-none'
      role='region'
      aria-label={regionLabel}
    >
      {[...toasts].reverse().map((toast) => (
        <Toast key={toast.id} toast={toast} closeLabel={closeLabel} onClose={onClose} />
      ))}
    </div>
  );
}
