/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog, type ConfirmDialogVariant } from '@/shared/ui';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationText?: string;
  variant?: ConfirmDialogVariant | 'warning' | 'info';
  dismissible?: boolean;
  /** Existing localized call sites; prefer confirmLabel. */
  confirmText?: string;
  /** Existing localized call sites; prefer cancelLabel. */
  cancelText?: string;
}

export type ConfirmFunction = (options: string | ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    if (!resolve) return;
    resolverRef.current = null;
    setOptions(null);
    resolve(result);
  }, []);

  const confirm = useCallback<ConfirmFunction>((nextOptions) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(typeof nextOptions === 'string' ? { description: nextOptions } : nextOptions);
    });
  }, []);

  const title = options?.title ?? t('common.confirm.title', 'Confirm request');
  const confirmLabel =
    options?.confirmLabel ?? options?.confirmText ?? t('common.actions.confirm', 'Continue');
  const cancelLabel =
    options?.cancelLabel ?? options?.cancelText ?? t('common.actions.cancel', 'Cancel');

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={options !== null}
        title={title}
        description={options?.description}
        variant={
          options?.variant === 'danger' || options?.variant === 'type-to-confirm'
            ? options.variant
            : 'default'
        }
        confirmationText={options?.confirmationText}
        confirmationInputLabel={t('common.dangerZone.typeInputLabel', 'Type name to confirm')}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        closeLabel={t('common.actions.close', 'Close')}
        dismissible={options?.dismissible ?? true}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFunction {
  const context = useContext(ConfirmContext);
  if (!context) {
    return async (options) => {
      const message =
        typeof options === 'string'
          ? options
          : `${options.title ?? ''}\n${options.description ?? ''}`;
      return typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(message)
        : true;
    };
  }
  return context;
}
