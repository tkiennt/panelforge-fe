import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, History, Layers, Sliders, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export type StudioHubTabId = 'series' | 'members' | 'schedule' | 'audit' | 'automation';

export interface StudioHubTabBarProps {
  activeTab: string;
  canManageStudio: boolean;
  onSelectTab: (tab: StudioHubTabId) => void;
}

interface StudioTabItem {
  id: StudioHubTabId;
  label: string;
  icon: React.ElementType;
}

const MORE_BUTTON_RESERVE_PX = 92;
const TAB_GAP_PX = 4;

const hasNativeInvoker = () =>
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

const supportsAnchorPos = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('position-area', 'block-end');

const invokerAttrs = (targetId: string) =>
  ({ commandfor: targetId, command: 'toggle-popover' }) as Record<string, string>;

const positionPopoverFallback = (trigger: HTMLElement | null, menu: HTMLElement | null) => {
  if (!trigger || !menu || supportsAnchorPos()) return;
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const width = menu.offsetWidth || 208;
  const height = menu.offsetHeight || 180;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.max(margin, Math.min(r.right - width, vw - width - margin));
  const top = Math.max(margin, Math.min(r.bottom + 6, vh - height - margin));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
};

const safeShowPopover = (menu: HTMLElement | null, source?: HTMLElement | null) => {
  if (!menu) return;
  try {
    const fn = (menu as HTMLElement & { showPopover?: (opts?: { source?: HTMLElement }) => void })
      .showPopover;
    if (typeof fn === 'function') {
      fn.call(menu, source ? { source } : undefined);
    }
  } catch {
    // ignore if already open or unsupported in JSDOM
  }
};

const safeHidePopover = (menu: HTMLElement | null) => {
  if (!menu) return;
  try {
    if (typeof menu.hidePopover === 'function') {
      menu.hidePopover();
    }
  } catch {
    // ignore if already closed or unsupported in JSDOM
  }
};

export const StudioHubTabBar: React.FC<StudioHubTabBarProps> = ({
  activeTab,
  canManageStudio,
  onSelectTab,
}) => {
  const { t, lang } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const tabBtnRefs = useRef<Partial<Record<StudioHubTabId, HTMLButtonElement | null>>>({});
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuId = useId();
  const moreTriggerId = useId();

  const [overflowIds, setOverflowIds] = useState<StudioHubTabId[]>([]);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const tabs: StudioTabItem[] = canManageStudio
    ? [
        { id: 'series', label: t('workspace.studioHub.tabs.series'), icon: Layers },
        { id: 'members', label: t('workspace.studioHub.tabs.crew'), icon: Users },
        { id: 'schedule', label: t('workspace.studioHub.tabs.schedule'), icon: Calendar },
        { id: 'audit', label: t('workspace.studioHub.tabs.audit'), icon: History },
        { id: 'automation', label: t('workspace.studioHub.tabs.automation'), icon: Sliders },
      ]
    : [
        { id: 'series', label: t('workspace.studioHub.tabs.series'), icon: Layers },
        { id: 'automation', label: t('workspace.studioHub.tabs.automation'), icon: Sliders },
      ];

  const tabSignature = `${lang}:${tabs.map((item) => item.id).join(',')}`;

  // Measure natural inline tab widths against nav width; overflowed tabs move into native Popover "Thêm".
  useLayoutEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const recalculate = () => {
      const style = window.getComputedStyle(navEl);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const available = Math.floor(navEl.clientWidth - padX);
      if (available <= 0) {
        setOverflowIds((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const widths = tabs.map((item) => {
        const el = tabBtnRefs.current[item.id];
        return el ? Math.ceil(el.offsetWidth) : 0;
      });
      if (widths.every((w) => w === 0)) {
        setOverflowIds((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const totalWidth = widths.reduce((sum, w, idx) => sum + w + (idx > 0 ? TAB_GAP_PX : 0), 0);
      if (totalWidth <= available) {
        setOverflowIds((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const budget = Math.max(0, available - MORE_BUTTON_RESERVE_PX);
      let used = 0;
      let overflowing = false;
      const nextOverflow: StudioHubTabId[] = [];
      tabs.forEach((item, idx) => {
        const needed = widths[idx] + (idx > 0 ? TAB_GAP_PX : 0);
        if (!overflowing && (idx === 0 || used + needed <= budget)) {
          used += needed;
        } else {
          overflowing = true;
          nextOverflow.push(item.id);
        }
      });

      setOverflowIds((prev) =>
        prev.length === nextOverflow.length && prev.every((id, i) => id === nextOverflow[i])
          ? prev
          : nextOverflow,
      );
    };

    recalculate();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(recalculate);
    ro.observe(navEl);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabSignature]);

  useEffect(() => {
    const menu = moreMenuRef.current;
    if (!menu) return;
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      setIsMoreOpen(open);
      if (open) {
        positionPopoverFallback(moreBtnRef.current, menu);
      }
    };
    menu.addEventListener('toggle', onToggle);
    return () => menu.removeEventListener('toggle', onToggle);
  }, [overflowIds.length]);

  const overflowSet = new Set(overflowIds);
  const overflowTabs = tabs.filter((item) => overflowSet.has(item.id));
  const hasActiveInOverflow = overflowTabs.some((item) => item.id === activeTab);

  const handleMoreTriggerClick = () => {
    if (hasNativeInvoker()) return;
    const menu = moreMenuRef.current;
    const nextOpen = !isMoreOpen;
    if (nextOpen) {
      positionPopoverFallback(moreBtnRef.current, menu);
      safeShowPopover(menu, moreBtnRef.current);
      setIsMoreOpen(true);
    } else {
      safeHidePopover(menu);
      setIsMoreOpen(false);
    }
  };

  const handleSelectOverflowTab = (tabId: StudioHubTabId) => {
    safeHidePopover(moreMenuRef.current);
    setIsMoreOpen(false);
    onSelectTab(tabId);
  };

  return (
    <div className='bg-white border-b border-head-line shrink-0 z-10'>
      <nav
        ref={navRef}
        aria-label={t('workspace.studioHub.tabsLabel')}
        data-testid='studio-hub-tabs'
        className='flex items-center gap-2 h-11 px-4 md:px-8 xl:px-12 overflow-hidden'
      >
        <div className='flex items-center gap-1 min-w-0 flex-1 overflow-x-clip'>
          {tabs.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            const isOverflowed = overflowSet.has(item.id);
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabBtnRefs.current[item.id] = el;
                }}
                type='button'
                aria-current={isCurrent && !isOverflowed ? 'page' : undefined}
                aria-hidden={isOverflowed || undefined}
                tabIndex={isOverflowed ? -1 : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`focus-ring relative h-11 inline-flex items-center gap-2 px-3 text-sm whitespace-nowrap shrink-0 border-b-2 transition-studio cursor-pointer ${
                  isCurrent
                    ? 'border-accent text-accent-dark font-semibold'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-head-line font-medium'
                } ${isOverflowed ? 'invisible pointer-events-none' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isCurrent ? 'text-accent-dark' : 'text-stone-400'
                  }`}
                  aria-hidden='true'
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {overflowTabs.length > 0 && (
          <div className='shrink-0'>
            <button
              ref={moreBtnRef}
              id={moreTriggerId}
              type='button'
              data-testid='studio-hub-tabs-more-btn'
              aria-label={t('workspace.studioHub.tabsMoreAria')}
              aria-expanded={isMoreOpen}
              aria-controls={moreMenuId}
              {...invokerAttrs(moreMenuId)}
              onClick={handleMoreTriggerClick}
              className={`focus-ring h-11 inline-flex items-center gap-1.5 px-2.5 text-sm whitespace-nowrap border-b-2 transition-studio cursor-pointer ${
                hasActiveInOverflow || isMoreOpen
                  ? 'border-accent text-accent-dark font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              <span>{t('workspace.studioHub.tabsMore')}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`}
                aria-hidden='true'
              />
            </button>

            <div
              ref={moreMenuRef}
              id={moreMenuId}
              popover='auto'
              data-placement='bottom-end'
              data-testid='studio-hub-tabs-more-menu'
              aria-labelledby={moreTriggerId}
              className={`pf-sb-popover-menu w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl text-stone-900 ${
                !hasNativeInvoker() && !isMoreOpen ? 'hidden' : ''
              }`}
            >
              {overflowTabs.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type='button'
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => handleSelectOverflowTab(item.id)}
                    className={`focus-ring w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-studio cursor-pointer ${
                      isCurrent
                        ? 'bg-head-wash text-accent-dark font-semibold'
                        : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-medium'
                    }`}
                  >
                    <span className='flex items-center gap-2 min-w-0'>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isCurrent ? 'text-accent-dark' : 'text-stone-400'
                        }`}
                        aria-hidden='true'
                      />
                      <span className='truncate'>{item.label}</span>
                    </span>
                    {isCurrent && (
                      <Check className='w-3.5 h-3.5 text-accent-dark shrink-0' aria-hidden='true' />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
