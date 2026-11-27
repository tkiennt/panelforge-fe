import React, { forwardRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getStatusTone, type StatusKind } from '../lib/statusTone';
import type { SurfaceTone } from './Surface';

export type BadgeTone = 'brand' | 'ai' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-orange-50 text-orange-800 border-orange-200',
  ai: 'bg-violet-50 text-violet-800 border-violet-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  neutral: 'bg-stone-100 text-stone-600 border-stone-200',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', icon, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap leading-normal',
        '[&_svg]:size-3.5',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
});

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  kind: StatusKind;
  status: string | number;
  labelOverride?: React.ReactNode;
  iconOverride?: React.ReactNode;
  toneOverride?: SurfaceTone;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { kind, status, labelOverride, iconOverride, toneOverride, className, ...props },
  ref,
) {
  const { t } = useTranslation();
  const meta = getStatusTone(kind, status);
  const Icon = meta.icon;
  const label = labelOverride ?? t(meta.labelKey, meta.defaultLabel ?? String(status));
  const tone = toneOverride ?? meta.tone;

  const resolvedIcon =
    iconOverride !== undefined ? (
      iconOverride
    ) : Icon ? (
      <Icon className='size-3.5' aria-hidden='true' />
    ) : null;

  return (
    <Badge ref={ref} tone={tone} icon={resolvedIcon} className={className} {...props}>
      {label}
    </Badge>
  );
});
