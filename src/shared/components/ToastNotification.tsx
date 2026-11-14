import React from 'react';
import {
  Toast,
  ToastStack as SharedToastStack,
  type ToastAction,
  type ToastData,
} from '@/shared/ui';
import type { AlertTone } from '@/shared/ui';

export type ToastType = 'success' | 'warning' | 'info' | 'error' | 'logout';
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
  index?: number;
  isStacked?: boolean;
  isHovered?: boolean;
  total?: number;
}

const tone = (type?: ToastType): AlertTone =>
  type === 'error' ? 'danger' : type === 'logout' ? 'neutral' : (type ?? 'success');
const adapt = (toast: ToastItemData): ToastData => ({
  id: toast.id,
  title: toast.title,
  description: toast.desc,
  tone: tone(toast.type),
  type: toast.type,
  action: toast.action,
  duration: toast.duration,
  iconTestId: `toast-icon-${toast.type ?? 'success'}`,
});

export function ToastItem({ toast, onClose }: ToastNotificationProps) {
  return <Toast toast={adapt(toast)} onClose={onClose} closeLabel='Đóng thông báo' />;
}

export function ToastStack({
  toasts,
  onClose,
}: {
  toasts: ToastItemData[];
  onClose: (id: string) => void;
}) {
  return (
    <SharedToastStack
      toasts={toasts.map(adapt)}
      onClose={onClose}
      closeLabel='Đóng thông báo'
      regionLabel='Thông báo hệ thống'
    />
  );
}
