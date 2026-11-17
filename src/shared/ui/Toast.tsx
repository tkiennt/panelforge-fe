import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, LogOut, X } from 'lucide-react';
import type { AlertTone } from './Alert';

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
  info: 'var(--studio-status-info)',
  success: 'var(--studio-status-success)',
  warning: 'var(--studio-status-warning)',
  danger: 'var(--studio-status-danger)',
  neutral: 'var(--studio-ink-muted)',
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
      className={`u070-t u070-type-${toast.tone} !relative !inset-auto border-l-4`}
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
        className='u070-ic'
        aria-hidden='true'
        data-testid={toast.iconTestId ?? `toast-icon-${toastType}`}
      >
        <Icon className='size-4' />
      </span>
      <div className='u070-tx'>
        <b className='whitespace-pre-line break-words'>{toast.title}</b>
        <small className='whitespace-pre-line break-words'>{toast.description}</small>
        {toast.action && (
          <button type='button' className='u070-act' onClick={toast.action.onClick}>
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type='button'
        className='u070-x'
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
      className='u070-zone !bottom-5 !top-auto !z-[var(--studio-z-toast)] flex flex-col gap-3 border-none bg-transparent p-0 m-0 overflow-visible'
      role='region'
      aria-label={regionLabel}
    >
      {[...toasts].reverse().map((toast) => (
        <Toast key={toast.id} toast={toast} closeLabel={closeLabel} onClose={onClose} />
      ))}
    </div>
  );
}
