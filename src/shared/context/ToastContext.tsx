/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  ToastStack,
  type ToastAction,
  type ToastData,
  type ToastType,
  type AlertTone,
} from '@/shared/ui';

export interface ToastOptions {
  id?: string;
  type?: AlertTone | 'error' | 'logout';
  tone?: AlertTone;
  duration?: number;
  action?: ToastAction;
}

type ToastMethod = (
  title: string,
  description: string,
  options?: Omit<ToastOptions, 'type' | 'tone'>,
) => void;
export interface ToastContextType {
  toast: (title: string, description: string, options: ToastOptions & { tone: AlertTone }) => void;
  showToast: (title: string, description: string, options?: ToastOptions) => void;
  success: ToastMethod;
  warning: ToastMethod;
  danger: ToastMethod;
  info: ToastMethod;
  neutral: ToastMethod;
  error: ToastMethod;
  closeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);
const normalizeTone = (type?: ToastType): AlertTone =>
  type === 'error' ? 'danger' : type === 'logout' ? 'neutral' : (type ?? 'success');

const inferType = (title: string, description: string): ToastType => {
  const content = `${title} ${description}`.toLowerCase();
  if (/lỗi|error|thất bại|failed/.test(content)) return 'error';
  if (/cảnh báo|warning|hết hạn/.test(content)) return 'warning';
  if (/đăng xuất|logout/.test(content)) return 'logout';
  if (/thông tin|info/.test(content)) return 'info';
  return 'success';
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timestamps = useRef(new Map<string, number>());
  const closeToast = useCallback(
    (id: string) => setToasts((current) => current.filter((item) => item.id !== id)),
    [],
  );

  const showToast = useCallback(
    (title: string, description: string, options: ToastOptions = {}) => {
      const type = options.tone ?? options.type ?? inferType(title, description);
      const tone = normalizeTone(type);
      const key = options.id ?? `${tone}:${title}:${description}`;
      const now = Date.now();
      if (now - (timestamps.current.get(key) ?? 0) < 2500) return;
      timestamps.current.set(key, now);
      const item: ToastData = {
        id: options.id ?? `toast-${now}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        description,
        tone,
        type,
        duration: options.duration ?? 5000,
        action: options.action,
      };
      setToasts((current) => [...current, item].slice(-3));
    },
    [],
  );

  const method = useCallback(
    (tone: AlertTone): ToastMethod =>
      (title, description, options) => {
        showToast(title, description, { ...options, tone });
      },
    [showToast],
  );

  const value: ToastContextType = {
    toast: (title, description, options) => showToast(title, description, options),
    showToast,
    success: method('success'),
    warning: method('warning'),
    danger: method('danger'),
    info: method('info'),
    neutral: method('neutral'),
    error: method('danger'),
    closeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack
        toasts={toasts}
        onClose={closeToast}
        closeLabel={t('common.toast.close', 'Close notification')}
        regionLabel={t('common.toast.region', 'System notifications')}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context) return context;
  const log = (title: string, description: string) => console.info('[Toast]', title, description);
  return {
    toast: log,
    showToast: log,
    success: log,
    warning: log,
    danger: log,
    info: log,
    neutral: log,
    error: log,
    closeToast: () => undefined,
  };
}
