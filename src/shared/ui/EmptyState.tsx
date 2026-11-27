import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, description, action, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <div className='mb-4 grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700 [&_svg]:size-5'>
          {icon}
        </div>
      )}
      <h3 className='font-serif text-lg font-bold text-stone-900'>{title}</h3>
      {description && <p className='mt-1 max-w-md text-sm text-stone-600'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
});
