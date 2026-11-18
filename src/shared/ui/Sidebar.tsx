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
        className={cn('space-y-1', className)}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <div
            className={cn(
              'px-2 text-xs font-semibold uppercase tracking-wider text-[var(--studio-ink-muted)]',
              collapsed && 'sr-only',
            )}
          >
            {label}
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
    const normalizedPath = currentPath?.replace(/\/$/, '');
    const normalizedHref = href?.replace(/^#/, '').split('?')[0].replace(/\/$/, '');
    const active = !!normalizedHref && normalizedPath === normalizedHref;
    const classes = cn(
      'pf-sb-item group relative flex min-h-10 items-center rounded-xl text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-focus-ring)]',
      collapsed ? 'mx-auto size-10 justify-center' : 'gap-3 px-4 py-2.5',
      active && 'bg-[var(--sb-active-bg)] font-semibold text-[var(--sb-text)] shadow-xs',
      disabled && 'cursor-not-allowed opacity-50',
      className,
    );
    const content = (
      <>
        {active && (
          <span
            className='absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-[var(--sb-accent)]'
            aria-hidden='true'
          />
        )}
        {Icon && (
          <Icon
            className={cn('pf-sb-icon size-5 shrink-0', active && 'text-[var(--sb-accent)]')}
            aria-hidden='true'
          />
        )}
        <span className={collapsed ? 'sr-only' : 'pf-sb-label flex-1 text-left'}>{label}</span>
        {badge != null && (
          <span className={collapsed ? 'sr-only' : 'pf-sb-label ml-auto'} aria-label={badgeLabel}>
            {badge}
          </span>
        )}
        {collapsed && (
          <span
            role='tooltip'
            className='pointer-events-none absolute left-full z-[var(--studio-z-tooltip)] ml-2 hidden whitespace-nowrap rounded-[var(--studio-radius-sm)] bg-stone-900 px-2 py-1 text-xs text-white shadow-md group-hover:block group-focus-visible:block'
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
