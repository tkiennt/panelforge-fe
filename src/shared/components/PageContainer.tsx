import React from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full px-4 md:px-6 lg:px-8', className)} {...props}>
        {children}
      </div>
    );
  },
);

PageContainer.displayName = 'PageContainer';
