// Lucian UX/UI Prompt #460 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#460
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface ScriptActionGooeyItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  testId?: string;
  color?: string;
}

export interface ScriptActionGooeyMenuProps {
  label: string;
  openLabel: string;
  closeLabel: string;
  actions: ScriptActionGooeyItem[];
  triggerTestId?: string;
}

const RADIUS = 92;
const ANGLES = [-150, -110, -70];

export function ScriptActionGooeyMenu({
  label,
  openLabel,
  closeLabel,
  actions,
  triggerTestId,
}: ScriptActionGooeyMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gooActive, setGooActive] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const gooTimerRef = useRef<number | null>(null);
  const actionTimerRef = useRef<number | null>(null);
  const filterId = `u460-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    return () => {
      if (gooTimerRef.current !== null) window.clearTimeout(gooTimerRef.current);
      if (actionTimerRef.current !== null) window.clearTimeout(actionTimerRef.current);
    };
  }, []);

  const close = useCallback(
    (restoreFocus = false) => {
      setIsOpen(false);
      setHoveredIndex(null);
      if (gooTimerRef.current !== null) window.clearTimeout(gooTimerRef.current);
      gooTimerRef.current = window.setTimeout(() => setGooActive(false), reducedMotion ? 0 : 900);
      if (restoreFocus) requestAnimationFrame(() => fabRef.current?.focus({ preventScroll: true }));
    },
    [reducedMotion],
  );

  const open = useCallback(() => {
    if (gooTimerRef.current !== null) window.clearTimeout(gooTimerRef.current);
    setGooActive(true);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [close, isOpen]);

  const handleAction = (action: ScriptActionGooeyItem) => {
    if (action.disabled) return;
    close();
    if (actionTimerRef.current !== null) window.clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(action.onSelect, reducedMotion ? 0 : 200);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('.u460-a:not([disabled])'),
    );
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!direction || buttons.length === 0) return;
    event.preventDefault();
    buttons[
      currentIndex < 0
        ? direction > 0
          ? 0
          : buttons.length - 1
        : (currentIndex + direction + buttons.length) % buttons.length
    ]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={rootRef}
      className={`ux u460${isOpen ? ' is-open' : ''}`}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (isOpen && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          close();
        }
      }}
      aria-label={label}
    >
      <style>{`
        .u460,.u460 *,.u460 *::before,.u460 *::after{box-sizing:border-box}
        .u460{
          --u460-accent:var(--studio-accent,#EA580C);
          --u460-accent-ink:var(--studio-accent-ink,#fff);
          --u460-save:var(--studio-mint,#119C72);
          --u460-import:var(--studio-accent,#F97316);
          --u460-ai:#7C3AED;
          --u460-shadow:color-mix(in srgb,var(--studio-ink,#292524) 18%,transparent);
          position:relative;width:250px;height:220px;pointer-events:none;color:var(--u460-accent-ink)
        }
        [data-theme='dark'] .u460{
          --u460-accent:var(--studio-accent,#FB923C);
          --u460-accent-ink:var(--studio-accent-ink,#1C1917);
          --u460-ai:#B7A4FF;
          --u460-shadow:rgba(0,0,0,.55)
        }
        @media (prefers-color-scheme:dark){
          :root:not([data-theme='light']) .u460{
            --u460-accent:var(--studio-accent,#FB923C);
            --u460-accent-ink:var(--studio-accent-ink,#1C1917);
            --u460-ai:#B7A4FF;
            --u460-shadow:rgba(0,0,0,.55)
          }
        }
        .u460-defs{position:absolute;width:0;height:0;overflow:hidden}
        .u460-st{position:absolute;right:31px;bottom:31px;width:0;height:0;pointer-events:auto}
        .u460-sh{position:absolute;left:-140px;top:-140px;width:280px;height:280px;filter:drop-shadow(0 10px 14px var(--u460-shadow));pointer-events:none}
        .u460-goo{position:absolute;inset:0;filter:var(--u460-filter)}
        .u460-bb{position:absolute;left:140px;top:140px;width:52px;height:52px;margin:-26px;border-radius:50%;background:var(--u460-action,var(--u460-accent));transform:translate(var(--u460-tx,0px),var(--u460-ty,0px)) scale(.5);transition:transform .5s cubic-bezier(.55,-.35,.4,1);transition-delay:calc((2 - var(--u460-i,0)) * 35ms);will-change:transform}
        .u460-bb.is-fab{width:62px;height:62px;margin:-31px;transform:none;transition:none}
        .u460.is-open .u460-bb:not(.is-fab){transform:translate(var(--u460-tx),var(--u460-ty)) scale(1);transition:transform .7s cubic-bezier(.3,1.45,.45,1);transition-delay:calc(var(--u460-i,0) * 45ms)}
        .u460.is-open .u460-bb.is-hov{transform:translate(var(--u460-tx),var(--u460-ty)) scale(1.12);transition:transform .45s cubic-bezier(.34,1.6,.5,1)}
        .u460-ic{position:absolute;left:0;top:0;width:0;height:0}
        .u460-a{position:absolute;left:-26px;top:-26px;width:52px;height:52px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:var(--u460-action,var(--u460-accent));color:var(--u460-accent-ink);opacity:0;visibility:hidden;transform:translate(var(--u460-tx,0px),var(--u460-ty,0px)) scale(.5);transition:transform .5s cubic-bezier(.55,-.35,.4,1),opacity .14s cubic-bezier(.2,.8,.2,1),visibility 0s linear .5s;transition-delay:calc((2 - var(--u460-i,0)) * 35ms),0s,0s;will-change:transform,opacity}
        .u460.is-open .u460-a{opacity:1;visibility:visible;transform:translate(var(--u460-tx),var(--u460-ty));transition:transform .7s cubic-bezier(.3,1.45,.45,1),opacity .25s cubic-bezier(.2,.8,.2,1),visibility 0s;transition-delay:calc(var(--u460-i,0) * 45ms),calc(var(--u460-i,0) * 45ms + .16s),0s}
        .u460-a svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .u460 .u460-a:focus-visible,.u460 .u460-fab:focus-visible{outline:2px solid var(--u460-accent);outline-offset:4px}
        .u460-fab{position:absolute;left:-31px;top:-31px;width:62px;height:62px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:none;color:var(--u460-accent-ink)}
        .u460-fab svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;transition:transform .55s cubic-bezier(.34,1.6,.5,1)}
        .u460.is-open .u460-fab svg{transform:rotate(135deg)}
        .u460-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
        @media (prefers-reduced-motion:reduce){
          .u460,.u460 *,.u460 *::before,.u460 *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
        }
      `}</style>
      <svg className='u460-defs' aria-hidden='true' focusable='false'>
        <filter
          id={filterId}
          x='-30%'
          y='-30%'
          width='160%'
          height='160%'
          colorInterpolationFilters='sRGB'
        >
          <feGaussianBlur in='SourceGraphic' stdDeviation='9' result='blur' />
          <feColorMatrix
            in='blur'
            type='matrix'
            values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11'
            result='goo'
          />
          <feComposite in='SourceGraphic' in2='goo' operator='atop' />
        </filter>
      </svg>
      <div className='u460-st'>
        <div className='u460-sh' aria-hidden='true'>
          <div
            className='u460-goo'
            style={
              { '--u460-filter': gooActive ? `url(#${filterId})` : 'none' } as React.CSSProperties
            }
          >
            {actions.slice(0, 3).map((_, index) => {
              const angle = (ANGLES[index] * Math.PI) / 180;
              const x = `${(Math.cos(angle) * RADIUS).toFixed(1)}px`;
              const y = `${(Math.sin(angle) * RADIUS).toFixed(1)}px`;
              return (
                <i
                  key={index}
                  className={`u460-bb${hoveredIndex === index ? ' is-hov' : ''}`}
                  style={
                    {
                      '--u460-i': index,
                      '--u460-action': actions[index]?.color ?? 'var(--u460-accent)',
                      '--u460-tx': isOpen ? x : '0px',
                      '--u460-ty': isOpen ? y : '0px',
                    } as React.CSSProperties
                  }
                />
              );
            })}
            <i className='u460-bb is-fab' />
          </div>
        </div>
        <button
          ref={fabRef}
          type='button'
          className='u460-fab'
          aria-label={isOpen ? closeLabel : openLabel}
          aria-expanded={isOpen}
          aria-controls={`${filterId}-actions`}
          data-testid={triggerTestId}
          onClick={() => (isOpen ? close() : open())}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M12 5v14M5 12h14' />
          </svg>
        </button>
        <div id={`${filterId}-actions`} className='u460-ic' role='group' aria-label={label}>
          {actions.slice(0, 3).map((action, index) => {
            const angle = (ANGLES[index] * Math.PI) / 180;
            const x = `${(Math.cos(angle) * RADIUS).toFixed(1)}px`;
            const y = `${(Math.sin(angle) * RADIUS).toFixed(1)}px`;
            return (
              <button
                key={action.id}
                type='button'
                className='u460-a'
                style={
                  {
                    '--u460-i': index,
                    '--u460-action': action.color ?? 'var(--u460-accent)',
                    '--u460-tx': isOpen ? x : '0px',
                    '--u460-ty': isOpen ? y : '0px',
                  } as React.CSSProperties
                }
                aria-label={action.label}
                title={action.label}
                tabIndex={isOpen ? 0 : -1}
                disabled={action.disabled}
                data-testid={action.testId}
                onPointerEnter={() => setHoveredIndex(index)}
                onPointerLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                onClick={() => handleAction(action)}
              >
                {action.icon}
                <span className='u460-sr'>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
