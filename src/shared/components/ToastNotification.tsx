/* Lucian UX/UI Prompt #070 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#070 */
/* Adapted for PanelForge Editorial AI Studio */

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, LogOut, AlertCircle, Info, X } from 'lucide-react';
import '@/styles/modules/lucian/lucian-070.css';

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
  index?: number;
  isStacked?: boolean;
  isHovered?: boolean;
  total?: number;
}

const TYPE_COLORS: Record<ToastType, string> = {
  warning: '#F59E0B',
  logout: '#A8A29E',
  error: '#EF4444',
  info: '#3B82F6',
  success: '#10B981',
};

export const ToastItem: React.FC<ToastNotificationProps> = ({
  toast,
  onClose,
  index = 0,
  isStacked = false,
  isHovered = false,
}) => {
  const isWarning = toast.type === 'warning';
  const isLogout = toast.type === 'logout';
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';
  const color = TYPE_COLORS[toast.type || 'success'];

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(1);
  const dragStartX = useRef(0);
  const duration = toast.duration ?? 5000;
  const remainingRef = useRef(duration);
  const lastTimeRef = useRef<number | null>(null);

  // Countdown timer progress with pause-on-hover
  useEffect(() => {
    let animFrame: number;

    const tick = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isHovered && !isDragging) {
        remainingRef.current = Math.max(0, remainingRef.current - dt);
        setProgress(remainingRef.current / duration);

        if (remainingRef.current <= 0) {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 250);
          return;
        }
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [duration, isHovered, isDragging, onClose, toast.id]);

  // Pointer drag/swipe gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    setDragX(dx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (Math.abs(dragX) > 85) {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 200);
    } else {
      setDragX(0);
    }
  };

  // Stack calculation
  const yOffset = isStacked
    ? isHovered
      ? -(index * 74)
      : -(index * 12)
    : 0;

  const scale = isStacked && !isHovered ? Math.max(0.85, 1 - index * 0.05) : 1;
  const opacity = isStacked && !isHovered && index > 2 ? 0 : 1;
  const isBack = isStacked && !isHovered && index > 0;

  const dynamicStyle = {
    '--c': color,
    '--dx': `${dragX}px`,
    '--y': `${yOffset}px`,
    '--s': scale,
    '--o': opacity,
    '--left': progress,
    zIndex: 50 - index,
  } as React.CSSProperties;

  return (
    <div
      role={isWarning ? 'alert' : 'status'}
      aria-live={isWarning ? 'assertive' : 'polite'}
      aria-atomic='true'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={dynamicStyle}
      className={`u070-t ${isDragging ? 'drag' : ''} ${isExiting ? 'leave' : ''} ${isBack ? 'back' : ''}`}
    >
      {/* Icon Badge */}
      <div className='u070-ic' aria-hidden='true'>
        {isWarning ? (
          <div data-testid='toast-icon-warning' className='flex items-center justify-center'>
            <Clock className='w-4 h-4' />
          </div>
        ) : isLogout ? (
          <div data-testid='toast-icon-logout' className='flex items-center justify-center'>
            <LogOut className='w-4 h-4' />
          </div>
        ) : isError ? (
          <div data-testid='toast-icon-error' className='flex items-center justify-center'>
            <AlertCircle className='w-4 h-4' />
          </div>
        ) : isInfo ? (
          <div data-testid='toast-icon-info' className='flex items-center justify-center'>
            <Info className='w-4 h-4' />
          </div>
        ) : (
          <div data-testid='toast-icon-success' className='flex items-center justify-center'>
            <CheckCircle2 className='w-4 h-4' />
          </div>
        )}
      </div>

      {/* Content Text */}
      <div className='u070-tx'>
        <b>{toast.title}</b>
        <small>{toast.desc}</small>
        {toast.action && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
            }}
            className='u070-act'
          >
            <span>{toast.action.label}</span>
            <span aria-hidden='true'>→</span>
          </button>
        )}
      </div>

      {/* Accessible Close Button */}
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          onClose(toast.id);
        }}
        aria-label='Đóng thông báo'
        className='u070-x'
      >
        <X className='w-4 h-4' aria-hidden='true' />
      </button>

      {/* Dynamic Progress Countdown Bar */}
      <span
        className='u070-bar'
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }}
        aria-hidden='true'
      />
    </div>
  );
};

export interface ToastStackProps {
  toasts: ToastItemData[];
  onClose: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onClose }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (toasts.length === 0) return null;

  // The latest toast is at index 0 for 3D stacking depth
  const reversedToasts = [...toasts].reverse();

  return (
    <div
      role='region'
      aria-label='Thông báo hệ thống'
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className='u070-zone pointer-events-none'
    >
      {reversedToasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          isStacked={toasts.length > 1}
          isHovered={isHovered}
          total={toasts.length}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
