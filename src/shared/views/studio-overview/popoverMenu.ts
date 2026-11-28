/* Helpers dùng chung cho menu/popover của Studio (Popover API + invoker gốc, DESIGN_RULES / modern-web-guidance). */

export const hasNativeInvoker = () =>
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

export const supportsAnchorPos = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('position-area', 'block-end');

export const invokerAttrs = (targetId: string) =>
  ({ commandfor: targetId, command: 'toggle-popover' }) as Record<string, string>;

export const positionPopoverFallback = (trigger: HTMLElement | null, menu: HTMLElement | null) => {
  if (!trigger || !menu || supportsAnchorPos()) return;
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const width = menu.offsetWidth || 208;
  const height = menu.offsetHeight || 260;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.max(margin, Math.min(r.right - width, vw - width - margin));
  const top = Math.max(margin, Math.min(r.bottom + 6, vh - height - margin));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
};

export const safeShowPopover = (menu: HTMLElement | null, source?: HTMLElement | null) => {
  if (!menu) return;
  try {
    const fn = (menu as HTMLElement & { showPopover?: (opts?: { source?: HTMLElement }) => void })
      .showPopover;
    if (typeof fn === 'function') {
      fn.call(menu, source ? { source } : undefined);
    }
  } catch {
    // ignore if unsupported in JSDOM
  }
};

export const safeHidePopover = (menu: HTMLElement | null) => {
  if (!menu) return;
  try {
    if (typeof menu.hidePopover === 'function') {
      menu.hidePopover();
    }
  } catch {
    // ignore if unsupported in JSDOM
  }
};
