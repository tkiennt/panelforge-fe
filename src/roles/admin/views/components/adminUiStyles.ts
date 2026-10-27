// Class strings and hooks shared by admin UI (kept out of AdminUi.tsx for fast refresh).
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export const adminFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card';

export const adminFieldClass = cn(
  'w-full min-h-11 px-3 rounded-xl border border-admin-line bg-admin-field text-sm text-admin-ink placeholder:text-admin-muted/80',
  'focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/25 disabled:opacity-60 disabled:cursor-not-allowed',
);

export const adminTable = {
  wrap: 'overflow-x-auto',
  table: 'w-full min-w-[880px] text-left text-sm',
  thead: 'bg-admin-subtle border-b border-admin-line text-xs text-admin-muted',
  th: 'py-3 px-4 font-semibold whitespace-nowrap',
  tbody: 'divide-y divide-admin-line/70',
  tr: 'hover:bg-admin-subtle transition-colors',
  td: 'py-3 px-4 align-top text-admin-ink',
};

export type AdminToastState = {
  type: 'success' | 'warning' | 'error';
  message: string;
} | null;

/** Toast state with auto-dismiss. */
export const useAdminToast = (ms = 5000) => {
  const [toast, setToast] = React.useState<AdminToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = React.useCallback(
    (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
      setToast({ type, message });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), ms);
    },
    [ms],
  );
  const clear = React.useCallback(() => setToast(null), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, clear };
};
