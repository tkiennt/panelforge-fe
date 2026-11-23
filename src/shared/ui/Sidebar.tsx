import React, { forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  collapsed?: boolean;
}

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function SidebarSection({ label, collapsed, className, children, ...props }, ref) {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = Array.from(
        sectionRef.current?.querySelectorAll<HTMLElement>(
          '[data-sidebar-item]:not([aria-disabled="true"])',
        ) ?? [],
      );
      if (!items.length) return;
      event.preventDefault();
      const index = Math.max(0, items.indexOf(document.activeElement as HTMLElement));
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? (index + 1) % items.length
              : (index - 1 + items.length) % items.length;
      items[next].focus();
    };
    return (
      <div
        {...props}
        ref={(node) => {
          sectionRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn('space-y-0.5', className)}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <div
            className={cn(
              'px-2 py-1 text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between',
              collapsed && 'sr-only',
            )}
          >
            <span>{label}</span>
          </div>
        )}
        {children}
      </div>
    );
  },
);

export interface SidebarItemProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  icon?: React.ElementType;
  label: string;
  href?: string;
  currentPath?: string;
  badge?: React.ReactNode;
  badgeLabel?: string;
  collapsed?: boolean;
  disabled?: boolean;
  onAction?: React.MouseEventHandler<HTMLButtonElement>;
}

export const SidebarItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, SidebarItemProps>(
  function SidebarItem(
    {
      icon: Icon,
      label,
      href,
      currentPath,
      badge,
      badgeLabel,
      collapsed,
      disabled,
      onAction,
      className,
      onClick,
      ...props
    },
    ref,
  ) {
    const normalizedPath = currentPath?.split('?')[0].replace(/\/$/, '') ?? '';
    const normalizedHref = href?.replace(/^#/, '').split('?')[0].replace(/\/$/, '') ?? '';
    const active =
      !!normalizedHref &&
      (normalizedPath === normalizedHref ||
        normalizedPath.endsWith(normalizedHref) ||
        (normalizedHref !== '' && normalizedHref !== '/' && normalizedPath.includes(normalizedHref)));
    const classes = cn(
      'pf-sb-item group relative flex items-center text-xs transition-colors cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-500',
      collapsed ? 'size-10 justify-center mx-auto' : 'gap-2.5 px-3 py-2 min-h-9',
      active
        ? 'bg-orange-50 text-orange-600 font-semibold border border-orange-200/60 shadow-2xs'
        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium',
      disabled && 'cursor-not-allowed opacity-50',
      className,
    );
    const content = (
      <>
        {Icon && (
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              active ? 'text-orange-600' : 'text-stone-500 group-hover:text-stone-800',
            )}
            aria-hidden='true'
          />
        )}
        <span className={collapsed ? 'sr-only' : 'flex-1 truncate text-left'}>{label}</span>
        {badge != null && !collapsed && (
          <span className='ml-auto shrink-0 flex items-center' aria-label={badgeLabel}>
            {badge}
          </span>
        )}
        {active && !collapsed && (
          <span
            className='active-dot ml-auto w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0'
            aria-hidden='true'
          />
        )}
        {collapsed && (
          <span
            role='tooltip'
            className='pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-xs text-white shadow-md group-hover:block group-focus-visible:block'
          >
            {label}
          </span>
        )}
      </>
    );
    if (href) {
      return (
        <a
          {...props}
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          onClick={disabled ? (event) => event.preventDefault() : onClick}
          aria-current={active ? 'page' : undefined}
          aria-disabled={disabled || undefined}
          aria-label={collapsed ? label : undefined}
          tabIndex={disabled ? -1 : undefined}
          data-sidebar-item
          className={classes}
        >
          {content}
        </a>
      );
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type='button'
        disabled={disabled}
        onClick={onAction}
        data-sidebar-item
        className={classes}
        aria-label={collapsed ? label : undefined}
      >
        {content}
      </button>
    );
  },
);

export interface CollapsibleSidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed: boolean;
  label: string;
}

export const CollapsibleSidebar = forwardRef<HTMLElement, CollapsibleSidebarProps>(
  function CollapsibleSidebar({ collapsed, label, className, children, ...props }, ref) {
    return (
      <aside
        {...props}
        ref={ref}
        aria-label={label}
        className={cn(
          'shrink-0 transition-[width] duration-[var(--studio-motion-base)]',
          collapsed ? 'w-16' : 'w-[248px]',
          className,
        )}
      >
        {children}
      </aside>
    );
  },
);
