import React from 'react';
import { PanelLeftOpen } from 'lucide-react';

interface RailItem {
  icon?: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
}

interface AppShellRailProps {
  navSections: { section: string; items: RailItem[] }[];
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  onExpand: () => void;
}

/**
 * Thanh icon thu gọn của menu hệ thống, dùng ở các màn cần nhiều diện tích làm việc (Letterer).
 * Mở rộng bằng nút trên cùng: menu đầy đủ hiện dạng lớp phủ, không đẩy nội dung.
 */
export const AppShellRail: React.FC<AppShellRailProps> = ({
  navSections,
  handleNavClick,
  onExpand,
}) => (
  <aside
    className='hidden md:flex flex-col items-center shrink-0 select-none z-20 h-full w-14 bg-[#FCFBF8] border-r border-[#E7E2D9] py-3 gap-3'
    data-testid='app-shell-rail'
  >
    <button
      type='button'
      onClick={onExpand}
      aria-label='Mở rộng menu hệ thống'
      title='Mở rộng menu'
      data-testid='app-shell-rail-expand'
      className='w-9 h-9 rounded-lg bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C]/30 flex items-center justify-center font-heading font-bold text-xs hover:bg-[#FFE8D6] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1'
    >
      PF
    </button>
    <button
      type='button'
      onClick={onExpand}
      aria-label='Mở rộng menu hệ thống'
      title='Mở rộng menu'
      className='p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F1EEE8] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1'
    >
      <PanelLeftOpen className='w-4 h-4' />
    </button>
    <nav className='flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center gap-1.5 w-full px-1.5'>
      {navSections.flatMap((section) =>
        section.items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={`${section.section}-${item.href}`}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              aria-label={item.label}
              aria-current={item.isActive ? 'page' : undefined}
              title={item.label}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
                item.isActive
                  ? 'bg-[#FFF2E6] text-[#1C1917]'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8]'
              }`}
            >
              {item.isActive && (
                <span
                  className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#C2410C] rounded-r-[2px]'
                  aria-hidden='true'
                />
              )}
              {Icon ? (
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    item.isActive ? 'text-[#C2410C] stroke-[2]' : 'text-[#78716C] stroke-[1.8]'
                  }`}
                />
              ) : null}
            </a>
          );
        }),
      )}
    </nav>
  </aside>
);
