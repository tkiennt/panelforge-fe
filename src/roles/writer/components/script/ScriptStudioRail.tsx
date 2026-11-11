import React, { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { SidebarTheme } from '@/app/sidebarTheme';
import '@/styles/modules/sidebar-theme.css';

export interface ScriptRailMenuItem {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  testId?: string;
  onSelect: () => void;
}

export interface ScriptRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  /** Màu nhấn của icon khi không active: AI dùng violet theo DESIGN_RULES */
  tone?: 'default' | 'ai' | 'ok' | 'warn';
  disabled?: boolean;
  busy?: boolean;
  testId?: string;
  onClick?: () => void;
  menu?: ScriptRailMenuItem[];
}

interface ScriptStudioRailProps {
  ariaLabel: string;
  items: ScriptRailItem[];
  footerItems?: ScriptRailItem[];
}

const TONE_CLASS: Record<NonNullable<ScriptRailItem['tone']>, string> = {
  default: 'text-current',
  ai: 'text-violet-600',
  ok: 'text-emerald-600',
  warn: 'text-rose-600',
};

function readSidebarTheme(): SidebarTheme {
  try {
    return (localStorage.getItem('pf.sidebar.theme') as SidebarTheme) || 'paper';
  } catch {
    return 'paper';
  }
}

/** Thanh biểu tượng bên trái của bàn viết, cùng ngôn ngữ hình ảnh với thanh công cụ của Bàn vẽ. */
export const ScriptStudioRail: React.FC<ScriptStudioRailProps> = ({
  ariaLabel,
  items,
  footerItems = [],
}) => {
  const [theme] = useState<SidebarTheme>(readSidebarTheme);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !railRef.current?.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [openMenuId]);

  const renderItem = (item: ScriptRailItem) => {
    const Icon = item.icon;
    const isMenuOpen = openMenuId === item.id;
    const highlighted = item.active || isMenuOpen;
    return (
      <div key={item.id} className='relative'>
        <button
          type='button'
          data-testid={item.testId}
          disabled={item.disabled}
          aria-pressed={item.menu ? undefined : Boolean(item.active)}
          aria-expanded={item.menu ? isMenuOpen : undefined}
          aria-haspopup={item.menu ? 'menu' : undefined}
          onClick={() => {
            if (item.menu) {
              setOpenMenuId((prev) => (prev === item.id ? null : item.id));
              return;
            }
            item.onClick?.();
          }}
          className={`relative w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            highlighted
              ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
              : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${highlighted ? 'text-[var(--sb-accent)]' : TONE_CLASS[item.tone || 'default']} ${
              item.busy ? 'animate-spin' : ''
            }`}
          />
          <span className='text-xs leading-none tracking-tight'>{item.label}</span>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className='absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-xs leading-4 font-mono font-bold text-center'>
              {item.badge}
            </span>
          )}
        </button>

        {item.menu && isMenuOpen && (
          <div
            role='menu'
            className='absolute left-[68px] top-0 z-50 w-60 rounded-xl border border-stone-200/80 bg-white p-1.5 shadow-lg animate-in fade-in slide-in-from-left-1 duration-100'
          >
            {item.menu.map((entry) => (
              <button
                key={entry.id}
                type='button'
                role='menuitem'
                data-testid={entry.testId}
                disabled={entry.disabled}
                onClick={() => {
                  setOpenMenuId(null);
                  entry.onSelect();
                }}
                className='w-full text-left px-3 py-2 rounded-lg text-sm text-stone-800 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <span className='block font-medium'>{entry.label}</span>
                {entry.hint && (
                  <span className='block text-xs text-stone-500 mt-0.5'>{entry.hint}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      ref={railRef}
      aria-label={ariaLabel}
      data-sb-theme={theme}
      data-testid='script-studio-rail'
      className='pf-sidebar w-[72px] shrink-0 bg-[var(--sb-bg)] text-[var(--sb-muted)] border-r border-[var(--sb-border)] flex flex-col items-center justify-between py-3 z-30'
    >
      <div className='flex flex-col items-center gap-2'>{items.map(renderItem)}</div>
      {footerItems.length > 0 && (
        <div className='flex flex-col items-center gap-2'>{footerItems.map(renderItem)}</div>
      )}
    </nav>
  );
};
