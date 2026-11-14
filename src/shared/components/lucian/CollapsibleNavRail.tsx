import React, { useState } from 'react';
import { SidebarItem, SidebarSection } from '@/shared/ui';
import '@/styles/modules/lucian/lucian-040.css';

export interface NavRailItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  href?: string;
}
export interface NavRailUser {
  name: string;
  role?: string;
  avatarUrl?: string;
}
export interface CollapsibleNavRailProps {
  items: NavRailItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  user?: NavRailUser;
  logoText?: string;
  title?: string;
  className?: string;
}

export function CollapsibleNavRail({
  items,
  activeId,
  onSelect,
  isExpanded,
  onToggleExpand,
  user,
  logoText = 'PF',
  title = 'PanelForge',
  className = '',
}: CollapsibleNavRailProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded ?? internalExpanded;
  const current = activeId ?? items[0]?.id;
  const toggle = () => (onToggleExpand ? onToggleExpand() : setInternalExpanded((value) => !value));
  return (
    <div
      className={`u040-container ${expanded ? 'is-wide' : ''} ${className}`}
      data-testid='collapsible-nav-rail-root'
    >
      <nav className='u040-rail' aria-label={title}>
        <div className='u040-top'>
          <span className='u040-logo' aria-hidden='true'>
            {logoText}
          </span>
          <span className='u040-name'>{title}</span>
        </div>
        <button
          className='u040-tog'
          type='button'
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
          onClick={toggle}
          data-testid='nav-rail-toggle'
        >
          <svg viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M6 3.5L10.5 8 6 12.5' />
          </svg>
        </button>
        <SidebarSection collapsed={!expanded} className='u040-nav'>
          {items.map((item) => (
            <SidebarItem
              key={item.id}
              href={`#${item.href ?? item.id}`}
              currentPath={current}
              icon={item.icon}
              label={item.label}
              collapsed={!expanded}
              data-testid={`nav-rail-item-${item.id}`}
              badge={
                item.badge == null ? undefined : (
                  <em data-testid={`nav-rail-badge-${item.id}`}>{item.badge}</em>
                )
              }
              badgeLabel={item.badge == null ? undefined : `${item.badge} new notifications`}
              onClick={(event) => {
                event.preventDefault();
                onSelect?.(item.id);
              }}
            />
          ))}
        </SidebarSection>
        {user && (
          <div className='u040-me' data-testid='nav-rail-user-profile'>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className='u040-me-avatar object-cover' />
            ) : (
              <div className='u040-me-avatar' aria-hidden='true'>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className='u040-me-info'>
              <span>{user.name}</span>
              {user.role && <small>{user.role}</small>}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
