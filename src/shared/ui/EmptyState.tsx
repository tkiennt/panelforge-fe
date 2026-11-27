import React, { forwardRef } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    icon = <Inbox className='size-6 text-orange-600' aria-hidden='true' />,
    title,
    description,
    action,
    className,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-testid='empty-state'
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-8 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className='mb-3.5 grid size-12 place-items-center rounded-xl bg-orange-50 text-orange-600 [&_svg]:size-6'>
          {icon}
        </div>
      )}
      <h3 className='font-serif text-lg font-bold text-stone-900'>{title}</h3>
      {description && <p className='mt-1 max-w-sm text-xs text-stone-600'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
});
