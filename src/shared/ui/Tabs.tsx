import React, { forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CountChip } from './CountChip';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  count?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { items, value, onChange, ariaLabel, className, ...props },
  ref,
) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledIndices = items
      .map((item, idx) => (!item.disabled ? idx : -1))
      .filter((idx) => idx !== -1);

    if (enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(index);
    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = enabledIndices[(currentPos + 1) % enabledIndices.length];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        targetIndex =
          enabledIndices[(currentPos - 1 + enabledIndices.length) % enabledIndices.length];
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = enabledIndices[0];
        break;
      case 'End':
        e.preventDefault();
        targetIndex = enabledIndices[enabledIndices.length - 1];
        break;
      default:
        break;
    }

    if (targetIndex !== -1) {
      const targetItem = items[targetIndex];
      if (targetItem) {
        onChange(targetItem.id);
        tabsRef.current[targetIndex]?.focus();
      }
    }
  };

  return (
    <div
      ref={ref}
      role='tablist'
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1 border-b border-stone-200 overflow-x-auto', className)}
      {...props}
    >
      {items.map((item, index) => {
        const isSelected = item.id === value;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabsRef.current[index] = el;
            }}
            type='button'
            role='tab'
            id={`tab-${item.id}`}
            aria-selected={isSelected}
            aria-controls={`panel-${item.id}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'group relative inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-all outline-hidden cursor-pointer whitespace-nowrap',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'border-b-2 border-accent text-stone-900 font-semibold'
                : 'border-b-2 border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900',
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  'size-3.5 transition-colors',
                  isSelected ? 'text-accent' : 'text-stone-500 group-hover:text-stone-700',
                )}
              />
            )}
            <span>{item.label}</span>
            {item.count !== undefined && item.count !== null && (
              <CountChip count={item.count} className='ml-0.5' />
            )}
          </button>
        );
      })}
    </div>
  );
});
