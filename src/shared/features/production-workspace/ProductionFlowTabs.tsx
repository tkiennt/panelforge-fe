import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  buildChapterReaderUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
  buildSeriesPath,
} from '@/app/routePaths';

export type ProductionFlowTab =
  | 'progress'
  | 'chapters'
  | 'crew'
  | 'script'
  | 'reader'
  | 'handoff';

interface ProductionFlowTabsProps {
  workspaceId?: string;
  seriesId?: string;
  chapterId?: string;
  activeTab: ProductionFlowTab;
  className?: string;
}

export const ProductionFlowTabs: React.FC<ProductionFlowTabsProps> = ({
  workspaceId,
  seriesId,
  chapterId,
  activeTab,
  className = '',
}) => {
  const { t } = useTranslation('pipeline');
  if (!workspaceId || !seriesId) return null;

  const items: Array<{ key: ProductionFlowTab; label: string; to: string }> = [
    {
      key: 'progress',
      label: t('workbench.subtabs.progress', 'Ma trận trang'),
      to: buildProductionWorkspaceUrl(workspaceId, seriesId, { chapterId, tab: 'progress' }),
    },
    {
      key: 'chapters',
      label: t('workbench.subtabs.chapters', 'Tổng quan chương'),
      to: buildProductionWorkspaceUrl(workspaceId, seriesId, { chapterId, tab: 'chapters' }),
    },
    {
      key: 'crew',
      label: t('workbench.subtabs.crew', 'Ê-kíp'),
      to: buildProductionWorkspaceUrl(workspaceId, seriesId, { chapterId, tab: 'crew' }),
    },
    {
      key: 'script',
      label: t('workbench.subtabs.script', 'Kịch bản'),
      to: chapterId
        ? buildScriptReviewUrl(workspaceId, seriesId, chapterId)
        : buildSeriesPath(workspaceId, seriesId, 'chapters'),
    },
    {
      key: 'reader',
      label: t('workbench.subtabs.reader', 'Đọc thử & Soát trang'),
      to: chapterId
        ? buildChapterReaderUrl(workspaceId, seriesId, chapterId)
        : buildProductionWorkspaceUrl(workspaceId, seriesId),
    },
    {
      key: 'handoff',
      label: t('workbench.subtabs.handoff', 'Bàn giao'),
      to: buildSeriesExportUrl(workspaceId, seriesId, chapterId),
    },
  ];

  return (
    <nav
      aria-label={t('workbench.subtabs.navigationLabel', 'Luồng sản xuất chương')}
      className={`max-w-full overflow-x-auto rounded-lg border border-stone-200 bg-stone-100 p-1 ${className}`}
    >
      <div className='flex min-w-max items-center gap-0.5'>
        {items.map((item) => {
          const isActive = item.key === activeTab;
          return (
            <Link
              key={item.key}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${
                isActive
                  ? 'bg-white font-semibold text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'font-medium text-stone-600 hover:bg-white/70 hover:text-stone-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
