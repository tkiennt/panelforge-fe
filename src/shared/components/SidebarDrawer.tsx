import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Navigation Menu',
  children,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus vào drawer, giữ Tab trong drawer, khoá cuộn nền và trả focus khi đóng
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = drawerRef.current;
    panel.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onTab);
    return () => {
      panel.removeEventListener('keydown', onTab);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 md:hidden flex'
      role='dialog'
      aria-modal='true'
      aria-label={title}
      data-testid='sidebar-drawer'
    >
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity'
        onClick={onClose}
        data-testid='sidebar-drawer-backdrop'
        aria-hidden='true'
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className='relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl focus:outline-none z-10 bg-[#FCFBF8] border-r border-[#E7E2D9]'
      >
        {/* Close Button Header */}
        <div className='absolute top-3 right-3 z-30'>
          <button
            onClick={onClose}
            aria-label='Đóng menu điều hướng'
            className='p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8] transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C]'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
