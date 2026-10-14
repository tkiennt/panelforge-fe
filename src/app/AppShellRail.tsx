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
    className='hidden md:flex flex-col items-center shrink-0 select-none z-20 h-full w-14 bg-[#F8F6F0] border-r border-[#E7E7E7] py-3 gap-3'
    data-testid='app-shell-rail'
  >
    <button
      type='button'
      onClick={onExpand}
      aria-label='Mở rộng menu hệ thống'
      title='Mở rộng menu'
      data-testid='app-shell-rail-expand'
      className='w-9 h-9 rounded-lg bg-[#171717] text-white flex items-center justify-center font-heading font-bold text-sm shadow-sm hover:bg-black cursor-pointer'
    >
      PF
    </button>
    <button
      type='button'
      onClick={onExpand}
      aria-label='Mở rộng menu hệ thống'
      title='Mở rộng menu'
      className='p-1.5 rounded-lg text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7] cursor-pointer'
    >
      <PanelLeftOpen className='w-4 h-4' />
    </button>
    <nav className='flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center gap-1 w-full px-1.5'>
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
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                item.isActive
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]'
              }`}
            >
              {Icon ? <Icon className='w-4 h-4 stroke-[2]' /> : null}
            </a>
          );
        }),
      )}
    </nav>
  </aside>
);
