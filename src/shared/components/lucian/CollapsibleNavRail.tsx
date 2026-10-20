/* Lucian UX/UI Prompt #040 · Collapsible navigation rail · (c) 2026 Seokwoo Lee · MIT License */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import './lucian-040.css';

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

export const CollapsibleNavRail: React.FC<CollapsibleNavRailProps> = ({
  items,
  activeId,
  onSelect,
  isExpanded: controlledExpanded,
  onToggleExpand,
  user,
  logoText = 'PF',
  title = 'PanelForge',
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isWide = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const highlightRef = useRef<HTMLLIElement | null>(null);

  const currentActiveId = activeId ?? items[0]?.id;

  const updateHighlightPosition = useCallback(() => {
    if (!currentActiveId) return;
    const activeBtn = itemRefs.current.get(currentActiveId);
    if (activeBtn && highlightRef.current) {
      const top = activeBtn.offsetTop;
      highlightRef.current.style.setProperty('--y', `${top}px`);
    }
  }, [currentActiveId]);

  useEffect(() => {
    updateHighlightPosition();
  }, [updateHighlightPosition, isWide]);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const handleItemClick = (id: string) => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + items.length) % items.length;
    }

    if (nextIndex >= 0) {
      const nextId = items[nextIndex].id;
      const nextBtn = itemRefs.current.get(nextId);
      nextBtn?.focus();
    }
  };

  return (
    <div
      className={`u040-container ${isWide ? 'is-wide' : ''} ${className}`}
      data-testid='collapsible-nav-rail-root'
    >
      <nav className='u040-rail' aria-label='Main menu'>
        {/* Top: Logo & Title */}
        <div className='u040-top'>
          <span className='u040-logo' aria-hidden='true'>
            {logoText}
          </span>
          <span className='u040-name'>{title}</span>
        </div>

        {/* Toggle Expand Button */}
        <button
          className='u040-tog'
          type='button'
          aria-expanded={isWide}
          aria-label={isWide ? 'Collapse menu' : 'Expand menu'}
          onClick={handleToggle}
          data-testid='nav-rail-toggle'
        >
          <svg viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M6 3.5L10.5 8 6 12.5' />
          </svg>
        </button>

        {/* Nav Items List */}
        <ul className='u040-nav' role='menubar'>
          {/* Moving active indicator */}
          <li ref={highlightRef} className='u040-hl' role='presentation' aria-hidden='true' />

          {items.map((item, index) => {
            const isActive = item.id === currentActiveId;
            const Icon = item.icon;

            return (
              <li key={item.id} role='none'>
                <button
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  className='u040-it'
                  type='button'
                  style={{ '--i': index } as React.CSSProperties}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  role='menuitem'
                  data-testid={`nav-rail-item-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  <Icon aria-hidden='true' />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <em
                      className='u040-bd'
                      aria-label={`${item.badge} new notifications`}
                      data-testid={`nav-rail-badge-${item.id}`}
                    >
                      {item.badge}
                    </em>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* User Profile at Bottom */}
        {user && (
          <div className='u040-me' data-testid='nav-rail-user-profile'>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className='u040-me-avatar object-cover'
              />
            ) : (
              <div className='u040-me-avatar' aria-hidden='true'>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className='u040-me-info'>
              <span className='truncate block max-w-[130px]'>{user.name}</span>
              {user.role && <small className='truncate block max-w-[130px]'>{user.role}</small>}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
