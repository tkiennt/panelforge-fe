import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { LucianConfirmModal } from '@/shared/components/lucian/LucianConfirmModal';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export type ConfirmFunction = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFunction>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Xác nhận yêu cầu',
          description: options,
          confirmText: 'Đồng ý',
          cancelText: 'Hủy',
          variant: 'danger',
        });
      } else {
        setModalState({
          isOpen: true,
          title: options.title || 'Xác nhận yêu cầu',
          description: options.description,
          confirmText: options.confirmText || 'Đồng ý',
          cancelText: options.cancelText || 'Hủy',
          variant: options.variant || 'danger',
        });
      }
    });
  }, []);

  const handleConfirm = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <LucianConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        description={modalState.description}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFunction => {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Graceful fallback to window.confirm in non-provider test environments
    return async (options: string | ConfirmOptions) => {
      const msg = typeof options === 'string' ? options : `${options.title}\n${options.description || ''}`;
      return typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(msg)
        : true;
    };
  }
  return context;
};
