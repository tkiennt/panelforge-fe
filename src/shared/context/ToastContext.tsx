/* Lucian UX/UI Prompt #070 Context Provider · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#070 */
/* Adapted for PanelForge Editorial AI Studio */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  ToastItemData,
  ToastOptions,
  ToastType,
  ToastStack,
} from '@/shared/components/ToastNotification';

export interface ToastContextType {
  showToast: (title: string, desc: string, options?: ToastOptions) => void;
  success: (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => void;
  error: (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => void;
  warning: (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => void;
  info: (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => void;
  closeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const lastToastTimestamps = useRef<Map<string, number>>(new Map());

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, desc: string, options?: ToastOptions) => {
    const toastId =
      options?.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const dedupeKey = options?.id || `${title}:${desc}`;
    const now = Date.now();
    const lastTime = lastToastTimestamps.current.get(dedupeKey) || 0;

    // Prevent duplicate toast spam within 2.5 seconds
    if (now - lastTime < 2500) {
      return;
    }
    lastToastTimestamps.current.set(dedupeKey, now);

    let resolvedType: ToastType = options?.type || 'success';
    if (!options?.type) {
      const lower = `${title} ${desc}`.toLowerCase();
      if (
        lower.includes('lỗi') ||
        lower.includes('error') ||
        lower.includes('thất bại') ||
        lower.includes('failed')
      ) {
        resolvedType = 'error';
      } else if (
        lower.includes('cảnh báo') ||
        lower.includes('warning') ||
        lower.includes('hết hạn')
      ) {
        resolvedType = 'warning';
      } else if (lower.includes('đăng xuất') || lower.includes('logout')) {
        resolvedType = 'logout';
      } else if (lower.includes('thông tin') || lower.includes('info')) {
        resolvedType = 'info';
      }
    }

    const newToast: ToastItemData = {
      id: toastId,
      title,
      desc,
      type: resolvedType,
      duration: options?.duration ?? 2200,
      action: options?.action,
    };

    // Luôn giữ tối đa 1 toast đang hiển thị để tránh xếp chồng đè lên nhau
    setToasts([newToast]);
  }, []);

  const success = useCallback(
    (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => {
      showToast(title, desc, { ...options, type: 'success' });
    },
    [showToast],
  );

  const error = useCallback(
    (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => {
      showToast(title, desc, { ...options, type: 'error' });
    },
    [showToast],
  );

  const warning = useCallback(
    (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => {
      showToast(title, desc, { ...options, type: 'warning' });
    },
    [showToast],
  );

  const info = useCallback(
    (title: string, desc: string, options?: Omit<ToastOptions, 'type'>) => {
      showToast(title, desc, { ...options, type: 'info' });
    },
    [showToast],
  );

  const value: ToastContextType = {
    showToast,
    success,
    error,
    warning,
    info,
    closeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (t, d) => console.log('[Toast]', t, d),
      success: (t, d) => console.log('[Toast Success]', t, d),
      error: (t, d) => console.error('[Toast Error]', t, d),
      warning: (t, d) => console.warn('[Toast Warning]', t, d),
      info: (t, d) => console.info('[Toast Info]', t, d),
      closeToast: () => {},
    };
  }
  return context;
};
