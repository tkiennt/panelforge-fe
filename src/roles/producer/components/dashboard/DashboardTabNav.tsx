import React from 'react';
import { BookOpen, LayoutDashboard, TrendingDown, Users, type LucideIcon } from 'lucide-react';

export type DashboardTab = 'all' | 'chapters' | 'team' | 'reports';

const TABS: { id: DashboardTab; label: string; area: string; icon: LucideIcon }[] = [
  {
    id: 'all',
    label: 'Tổng quan toàn diện',
    area: 'Tổng quan đầy đủ các phần',
    icon: LayoutDashboard,
  },
  {
    id: 'chapters',
    label: 'Chương & Công đoạn',
    area: 'Chương & Ma trận công đoạn',
    icon: BookOpen,
  },
  { id: 'team', label: 'Đội ngũ & Phân công', area: 'Phân công nhân sự & Khối lượng', icon: Users },
  {
    id: 'reports',
    label: 'Báo cáo Burndown',
    area: 'Phân tích tiến độ & Xu hướng',
    icon: TrendingDown,
  },
];

interface DashboardTabNavProps {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  counts: Partial<Record<DashboardTab, number>>;
}

export const DashboardTabNav: React.FC<DashboardTabNavProps> = ({
  activeTab,
  onChange,
  counts,
}) => (
  <nav
    aria-label='Phân nhóm quản lý tổng quan'
    className='flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3 pt-1'
  >
    <div className='flex flex-wrap items-center gap-2'>
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        const count = counts[id];
        return (
          <button
            key={id}
            type='button'
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            className={`focus-ring h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isActive
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Icon className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={`px-1.5 rounded-full text-xs font-mono font-bold ${
                  isActive ? 'bg-orange-100 text-orange-900' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>

    <div className='hidden sm:flex items-center gap-2 text-xs text-stone-600'>
      <span>Khu vực:</span>
      <span className='font-semibold text-stone-900'>
        {TABS.find((t) => t.id === activeTab)?.area}
      </span>
    </div>
  </nav>
);
