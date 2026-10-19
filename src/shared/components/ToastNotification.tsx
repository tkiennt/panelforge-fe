import React from 'react';
import { CheckCircle2, Clock, LogOut, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error' | 'logout';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItemData {
  id: string;
  title: string;
  desc: string;
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastNotificationProps {
  toast: ToastItemData;
  onClose: (id: string) => void;
}

export const ToastItem: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const isWarning = toast.type === 'warning';
  const isLogout = toast.type === 'logout';
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div
      role={isWarning ? 'alert' : 'status'}
      aria-live={isWarning ? 'assertive' : 'polite'}
      aria-atomic='true'
      className='pointer-events-auto bg-[#1C1917] text-[#FCFBF8] p-3.5 sm:p-4 rounded-xl shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] border border-[#2E2A27] flex items-start gap-3 w-full sm:w-[360px] max-w-[400px] transition-all duration-200 ease-out animate-in slide-in-from-bottom-3 fade-in motion-reduce:animate-none motion-reduce:transition-none'
    >
      {/* Icon Badge */}
      <div className='shrink-0 mt-0.5' aria-hidden='true'>
        {isWarning ? (
          <div
            data-testid='toast-icon-warning'
            className='w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400'
          >
            <Clock className='w-4 h-4' />
          </div>
        ) : isLogout ? (
          <div
            data-testid='toast-icon-logout'
            className='w-7 h-7 rounded-full bg-stone-500/15 border border-stone-500/30 flex items-center justify-center text-stone-300'
          >
            <LogOut className='w-4 h-4' />
          </div>
        ) : isError ? (
          <div
            data-testid='toast-icon-error'
            className='w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400'
          >
            <AlertCircle className='w-4 h-4' />
          </div>
        ) : isInfo ? (
          <div
            data-testid='toast-icon-info'
            className='w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400'
          >
            <Info className='w-4 h-4' />
          </div>
        ) : (
          <div
            data-testid='toast-icon-success'
            className='w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400'
          >
            <CheckCircle2 className='w-4 h-4' />
          </div>
        )}
      </div>

      {/* Content Text: Sans-serif font, 14px semibold title, 13px description with 1.5 line-height */}
      <div className='flex-1 min-w-0 pr-1'>
        <h4 className='text-sm font-semibold text-[#FCFBF8] leading-tight font-sans tracking-normal select-text'>
          {toast.title}
        </h4>
        <p className='text-[13px] text-[#D6D3D1] leading-relaxed mt-1 font-sans [text-wrap:pretty] select-text'>
          {toast.desc}
        </p>
        {toast.action && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
            }}
            className='mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs transition-colors'
          >
            <span>{toast.action.label}</span>
            <span aria-hidden='true'>→</span>
          </button>
        )}
      </div>

      {/* Accessible Close Button */}
      <button
        type='button'
        onClick={() => onClose(toast.id)}
        aria-label='Đóng thông báo'
        className='shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-[#FCFBF8] hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
      >
        <X className='w-4 h-4' aria-hidden='true' />
      </button>
    </div>
  );
};

export interface ToastStackProps {
  toasts: ToastItemData[];
  onClose: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      role='region'
      aria-label='Thông báo hệ thống'
      className='fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2.5 pointer-events-none'
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
