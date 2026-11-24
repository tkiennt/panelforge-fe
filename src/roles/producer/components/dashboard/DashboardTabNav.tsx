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
import { useTranslation } from '@/lib/i18n';

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
  labelKey: string;
  areaKey: string;
  icon: LucideIcon;
  producerOnly?: boolean;
}

const ALL_TABS: TabDefinition[] = [
  {
    id: 'all',
    labelKey: 'dashboard.tabs.all',
    areaKey: 'dashboard.tabs.areaAll',
    icon: LayoutDashboard,
  },
  {
    id: 'chapters',
    labelKey: 'dashboard.tabs.chapters',
    areaKey: 'dashboard.tabs.areaChaptersFull',
    icon: BookOpen,
  },
  {
    id: 'progress',
    labelKey: 'dashboard.tabs.progress',
    areaKey: 'dashboard.tabs.areaProgress',
    icon: Kanban,
  },
  {
    id: 'script',
    labelKey: 'dashboard.tabs.script',
    areaKey: 'dashboard.tabs.areaScript',
    icon: FileText,
  },
  {
    id: 'reader',
    labelKey: 'dashboard.tabs.reader',
    areaKey: 'dashboard.tabs.areaReader',
    icon: Eye,
  },
  {
    id: 'handoff',
    labelKey: 'dashboard.tabs.handoff',
    areaKey: 'dashboard.tabs.areaHandoff',
    icon: UploadCloud,
  },
  {
    id: 'bible',
    labelKey: 'dashboard.tabs.bible',
    areaKey: 'dashboard.tabs.areaBible',
    icon: BookMarked,
  },
  {
    id: 'revenue',
    labelKey: 'dashboard.tabs.revenue',
    areaKey: 'dashboard.tabs.areaRevenue',
    icon: DollarSign,
    producerOnly: true,
  },
  {
    id: 'team',
    labelKey: 'dashboard.tabs.team',
    areaKey: 'dashboard.tabs.areaTeamFull',
    icon: Users,
    producerOnly: true,
  },
  {
    id: 'reports',
    labelKey: 'dashboard.tabs.reports',
    areaKey: 'dashboard.tabs.areaReportsFull',
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
  const { t } = useTranslation('production');
  const visibleTabs = React.useMemo(() => {
    return ALL_TABS.filter((tab) => (tab.producerOnly ? isProducer : true));
  }, [isProducer]);
  const activeTabDef = visibleTabs.find((tab) => tab.id === activeTab);

  return (
    <nav
      aria-label={t('dashboard.tabs.navAria')}
      className='flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3 pt-1'
    >
      <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
        {visibleTabs.map(({ id, labelKey, icon: Icon }) => {
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
              <span>{t(labelKey)}</span>
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
        <span>{t('dashboard.tabs.area')}</span>
        <span className='font-semibold text-stone-900'>
          {activeTabDef ? t(activeTabDef.areaKey) : ''}
        </span>
      </div>
    </nav>
  );
};
