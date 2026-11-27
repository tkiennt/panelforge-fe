import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './Badge';
import { Card, CardBody, CardHeader, type CardProps, type SurfaceTone } from './Surface';

export interface StatKpiCardProps extends Omit<CardProps, 'title'> {
  title: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: BadgeProps['tone'];
  valueSuffix?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: SurfaceTone;
}

export const StatKpiCard = forwardRef<HTMLDivElement, StatKpiCardProps>(function StatKpiCard(
  {
    title,
    value,
    icon,
    badge,
    badgeTone = 'neutral',
    valueSuffix,
    description,
    footer,
    tone = 'brand',
    className,
    ...props
  },
  ref,
) {
  return (
    <Card ref={ref} tone={tone} className={cn('flex h-full flex-col', className)} {...props}>
      <CardHeader
        title={title}
        icon={icon}
        tone={tone}
        actions={badge ? <Badge tone={badgeTone}>{badge}</Badge> : undefined}
      />
      <CardBody className='flex flex-1 flex-col'>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-4xl font-bold tracking-tight text-[#171717]'>{value}</span>
          {valueSuffix && <span className='text-stone-600'>{valueSuffix}</span>}
        </div>
        {description && <div className='mt-1 text-sm text-stone-600'>{description}</div>}
        {footer && <div className='mt-auto pt-4'>{footer}</div>}
      </CardBody>
    </Card>
  );
});
