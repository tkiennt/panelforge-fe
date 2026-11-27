import React, { forwardRef, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CountChip } from './CountChip';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: React.ReactNode;
}
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label': string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { items, value, onChange, className, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const generatedId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectAt = (index: number) => {
    const item = items[index];
    if (!item) return;
    onChange(item.id);
    buttons.current[index]?.focus();
  };
  return (
    <div
      ref={ref}
      role='tablist'
      aria-label={ariaLabel}
      className={cn('flex max-w-full overflow-x-auto border-b border-stone-200', className)}
      {...props}
    >
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type='button'
            role='tab'
            id={`${generatedId}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${generatedId}-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'ArrowRight') selectAt((index + 1) % items.length);
              else if (event.key === 'ArrowLeft')
                selectAt((index - 1 + items.length) % items.length);
              else if (event.key === 'Home') selectAt(0);
              else if (event.key === 'End') selectAt(items.length - 1);
              else return;
              event.preventDefault();
            }}
            className={cn(
              'relative inline-flex min-h-10 shrink-0 items-center gap-2 px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-[-2px] after:absolute after:inset-x-2 after:bottom-0 after:border-b-2 after:border-transparent',
              selected
                ? 'text-stone-900 after:border-accent'
                : 'text-stone-600 hover:text-stone-900',
            )}
          >
            {item.icon && <span className='[&_svg]:size-4'>{item.icon}</span>}
            <span>{item.label}</span>
            {item.count !== undefined && <CountChip>{item.count}</CountChip>}
          </button>
        );
      })}
    </div>
  );
});
