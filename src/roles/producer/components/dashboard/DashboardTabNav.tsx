import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  TrendingDown,
  Users,
  FileText,
  Eye,
  UploadCloud,
  BookMarked,
  DollarSign,
  Kanban,
  type LucideIcon,
} from 'lucide-react';

export type DashboardTab =
  | 'all'
  | 'chapters'
  | 'progress'
  | 'script'
  | 'reader'
  | 'handoff'
  | 'bible'
  | 'revenue'
  | 'team'
  | 'reports';

export interface TabDefinition {
  id: DashboardTab;
  label: string;
  area: string;
  icon: LucideIcon;
  producerOnly?: boolean;
}

const ALL_TABS: TabDefinition[] = [
  {
    id: 'all',
    label: 'Tổng quan toàn diện',
    area: 'Tổng quan đầy đủ các phần',
    icon: LayoutDashboard,
  },
  {
    id: 'chapters',
    label: 'Chương & Công đoạn',
    area: 'Tổng quan chương & danh sách công đoạn',
    icon: BookOpen,
  },
  {
    id: 'progress',
    label: 'Ma trận tiến độ',
    area: 'Ma trận công đoạn & rủi ro hạn nộp',
    icon: Kanban,
  },
  {
    id: 'script',
    label: 'Kịch bản',
    area: 'Kịch bản chương & soát thoại',
    icon: FileText,
  },
  {
    id: 'reader',
    label: 'Đọc thử & Duyệt trang',
    area: 'Đọc thử bản thảo & soát khung tranh',
    icon: Eye,
  },
  {
    id: 'handoff',
    label: 'Bàn giao xuất bản',
    area: 'Đóng gói bản thảo & thông số in ấn',
    icon: UploadCloud,
  },
  {
    id: 'bible',
    label: 'Series Bible',
    area: 'Hồ sơ thiết kế & quy tắc lore',
    icon: BookMarked,
  },
  {
    id: 'revenue',
    label: 'Doanh thu & Độc giả',
    area: 'Thống kê tài chính & lượt đọc',
    icon: DollarSign,
    producerOnly: true,
  },
  {
    id: 'team',
    label: 'Đội ngũ & Phân công',
    area: 'Phân công nhân sự & khối lượng vẽ',
    icon: Users,
    producerOnly: true,
  },
  {
    id: 'reports',
    label: 'Báo cáo Burndown',
    area: 'Phân tích tiến độ & xu hướng hoàn thành',
    icon: TrendingDown,
  },
];

interface DashboardTabNavProps {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  counts: Partial<Record<DashboardTab, number>>;
  isProducer?: boolean;
}

export const DashboardTabNav: React.FC<DashboardTabNavProps> = ({
  activeTab,
  onChange,
  counts,
  isProducer = true,
}) => {
  const visibleTabs = React.useMemo(() => {
    return ALL_TABS.filter((t) => (t.producerOnly ? isProducer : true));
  }, [isProducer]);

  return (
    <nav
      aria-label='Phân nhóm quản lý tổng quan'
      className='flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3 pt-1'
    >
      <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
        {visibleTabs.map(({ id, label, icon: Icon }) => {
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
                  ? 'bg-orange-50 text-orange-800 border-orange-200 shadow-2xs'
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

      <div className='hidden xl:flex items-center gap-2 text-xs text-stone-600'>
        <span>Khu vực:</span>
        <span className='font-semibold text-stone-900'>
          {visibleTabs.find((t) => t.id === activeTab)?.area}
        </span>
      </div>
    </nav>
  );
};
