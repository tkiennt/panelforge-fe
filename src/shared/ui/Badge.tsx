import React, { forwardRef } from 'react';
import {
  Ban,
  CheckCircle2,
  Circle,
  CircleX,
  Clock3,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getStatusTone, type StatusIconName, type StatusKind } from '@/shared/lib/statusTone';
import type { SurfaceTone } from './Surface';

const toneClasses: Record<SurfaceTone, string> = {
  brand: 'border-orange-200 bg-orange-50 text-orange-800',
  ai: 'border-violet-200 bg-violet-50 text-violet-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  neutral: 'border-stone-200 bg-stone-100 text-stone-700',
};

const statusIcons = {
  circle: Circle,
  clock: Clock3,
  'circle-check': CheckCircle2,
  'circle-x': CircleX,
  lock: Lock,
  send: Send,
  'shield-check': ShieldCheck,
  'triangle-alert': TriangleAlert,
  ban: Ban,
  sparkles: Sparkles,
} satisfies Record<
  StatusIconName,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
>;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: SurfaceTone;
  icon?: React.ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', icon, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {icon && <span className='[&_svg]:size-3.5'>{icon}</span>}
      {children}
    </span>
  );
});

export interface StatusBadgeProps extends Omit<BadgeProps, 'tone' | 'icon' | 'children'> {
  kind: StatusKind;
  status: string | number | null | undefined;
  label?: React.ReactNode;
  showIcon?: boolean;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { kind, status, label, showIcon = true, ...props },
  ref,
) {
  const { t } = useTranslation('common');
  const definition = getStatusTone(kind, status);
  const Icon = statusIcons[definition.icon];
  return (
    <Badge
      ref={ref}
      tone={definition.tone}
      icon={showIcon ? <Icon aria-hidden='true' /> : undefined}
      {...props}
    >
      {label ?? t(definition.labelKey)}
    </Badge>
  );
});
