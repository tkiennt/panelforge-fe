import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChapterDto } from '@/services/chapter.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';

export type ProducerSubTab =
  'progress' | 'chapters' | 'script' | 'reader' | 'handoff' | 'crew' | 'bible' | 'revenue';

export interface ProducerSharedHeaderProps {
  workspaceId?: string;
  seriesId?: string;
  currentChapterId?: string;
  chapters?: ChapterDto[];
  seriesTitle?: string;
  seriesFormat?: string;
  subtitle?: string;
  currentChapter?: ChapterDto | null;
  activeTab: ProducerSubTab;
  onChapterChange?: (newChapterId: string) => void;
  onBackToChapters?: () => void;
  onStartProduction?: () => void;
  actionCta?: React.ReactNode;
  loadingChapters?: boolean;
}

const CHAPTER_STATUS_META: Record<string, { label: string; cls: string }> = {
  PreProduction: {
    label: 'Tiền kỳ (viết kịch bản)',
    cls: 'text-stone-800 bg-stone-100 border-stone-200',
  },
  InProduction: {
    label: 'Đang sản xuất',
    cls: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  ChapterApproved: {
    label: 'Đã nghiệm thu (Gate 3)',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  Approved: {
    label: 'Đã duyệt hoàn tất',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  HandedOffAndPublished: {
    label: 'Đã bàn giao & phát hành',
    cls: 'text-stone-800 bg-stone-100 border-stone-200',
  },
  Published: {
    label: 'Đã xuất bản',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
};

export const ProducerSharedHeader: React.FC<ProducerSharedHeaderProps> = ({
  workspaceId,
  seriesId,
  currentChapterId,
  chapters = [],
  seriesTitle,
  seriesFormat,
  subtitle,
  currentChapter,
  activeTab,
  onChapterChange,
  onBackToChapters,
  onStartProduction,
  actionCta,
  loadingChapters = false,
}) => {
  const { t } = useTranslation('pipeline');
  const navigate = useNavigate();

  const resolvedChapter =
    currentChapter || chapters.find((c) => c.id === currentChapterId) || chapters[0] || null;

  const effectiveChapterId = currentChapterId || resolvedChapter?.id || '';
  const chapterQuery = effectiveChapterId ? `?chapterId=${effectiveChapterId}` : '';

  const currentChapterFormattedTitle = resolvedChapter
    ? formatChapterLabel(resolvedChapter.chapterNumber, resolvedChapter.title || 'Bản thảo')
    : 'Chọn chương';

  const statusMeta = resolvedChapter
    ? (CHAPTER_STATUS_META[String(resolvedChapter.status)] ?? {
        label: String(resolvedChapter.status),
        cls: 'text-stone-800 bg-stone-100 border-stone-200',
      })
    : null;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    if (onChapterChange) {
      onChapterChange(nextId);
    } else if (workspaceId && seriesId) {
      if (activeTab === 'script') {
        navigate(`/workspaces/${workspaceId}/series/${seriesId}/chapters/${nextId}/script/review`);
      } else if (activeTab === 'reader') {
        navigate(`/workspaces/${workspaceId}/series/${seriesId}/chapters/${nextId}/reader`);
      } else if (activeTab === 'handoff') {
        navigate(`/workspaces/${workspaceId}/series/${seriesId}/export?chapterId=${nextId}`);
      } else {
        navigate(`/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${nextId}`);
      }
    }
  };

  const handleTabClick = (tabKey: 'progress' | 'chapters' | 'script' | 'reader' | 'handoff') => {
    if (!workspaceId || !seriesId) return;
    if (tabKey === 'progress') {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/workspace${chapterQuery}`);
    } else if (tabKey === 'chapters') {
      if (onBackToChapters) {
        onBackToChapters();
      } else {
        navigate(
          `/workspaces/${workspaceId}/series/${seriesId}/workspace?tab=chapters${
            effectiveChapterId ? `&chapterId=${effectiveChapterId}` : ''
          }`,
        );
      }
    } else if (tabKey === 'script') {
      navigate(
        effectiveChapterId
          ? `/workspaces/${workspaceId}/series/${seriesId}/chapters/${effectiveChapterId}/script/review`
          : `/workspaces/${workspaceId}/series/${seriesId}/chapters`,
      );
    } else if (tabKey === 'reader') {
      navigate(
        effectiveChapterId
          ? `/workspaces/${workspaceId}/series/${seriesId}/chapters/${effectiveChapterId}/reader`
          : `/workspaces/${workspaceId}/series/${seriesId}/workspace`,
      );
    } else if (tabKey === 'handoff') {
      navigate(
        `/workspaces/${workspaceId}/series/${seriesId}/export${
          effectiveChapterId ? `?chapterId=${effectiveChapterId}` : ''
        }`,
      );
    }
  };

  const handleBack = () => {
    if (onBackToChapters) {
      onBackToChapters();
    } else if (workspaceId && seriesId) {
      navigate(
        `/workspaces/${workspaceId}/series/${seriesId}/workspace?tab=chapters${
          effectiveChapterId ? `&chapterId=${effectiveChapterId}` : ''
        }`,
      );
    }
  };

  return (
    <div className='w-full bg-white border-b border-stone-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 shadow-2xs'>
      <div className='max-w-[1640px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4'>
        {/* Left: Back Link, Title, Subtitle, Status Pill */}
        <div className='flex flex-wrap items-center gap-3'>
          <div>
            <button
              type='button'
              onClick={handleBack}
              className='inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:underline mb-1 transition-colors cursor-pointer'
            >
              <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
              <span>{t('workbench.backToChapters', 'Quay lại Tổng quan chương')}</span>
            </button>
            <h2 className='text-base font-bold text-stone-900 leading-tight'>
              {seriesTitle ? `${seriesTitle} : ` : ''}
              {currentChapterFormattedTitle}
            </h2>
            <p className='text-xs text-stone-500'>
              {subtitle || seriesFormat || t('workbench.shonenFormat', 'Quy chuẩn Shonen')}
            </p>
          </div>
          {statusMeta && (
            <span
              className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusMeta.cls}`}
            >
              {statusMeta.label}
            </span>
          )}
        </div>

        {/* Right: Chapter Selector, Subtab Bar, Action CTA */}
        <div className='flex flex-wrap items-center gap-2.5'>
          {/* Chapter Selector Dropdown */}
          <div className='relative flex items-center'>
            <label htmlFor='producer-chapter-select' className='sr-only'>
              Chương:
            </label>
            <select
              id='producer-chapter-select'
              aria-label='Chương:'
              value={effectiveChapterId}
              onChange={handleSelectChange}
              disabled={loadingChapters || chapters.length === 0}
              className='px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:border-stone-400 cursor-pointer shadow-2xs'
            >
              {chapters.length === 0 ? (
                <option value=''>Đang nạp danh sách chương...</option>
              ) : (
                chapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {formatChapterLabel(chap.chapterNumber, chap.title || 'Bản thảo')}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sub-tabs Navigation */}
          <div
            className='inline-flex p-1 rounded-lg bg-stone-100 border border-stone-200'
            id='subtab-bar'
          >
            <button
              type='button'
              data-subtab='progress'
              id='subtab-progress'
              onClick={() => handleTabClick('progress')}
              className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {t('workbench.subtabs.progress', 'Ma trận trang')}
            </button>
            <button
              type='button'
              data-subtab='chapters'
              id='subtab-chapters'
              onClick={() => handleTabClick('chapters')}
              className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'chapters'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {t('workbench.subtabs.chapters', 'Tổng quan chương')}
            </button>
            <button
              type='button'
              data-subtab='script'
              id='subtab-script'
              onClick={() => handleTabClick('script')}
              className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'script'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {t('workbench.subtabs.script', 'Kịch bản')}
            </button>
            <button
              type='button'
              data-subtab='reader'
              id='subtab-reader'
              onClick={() => handleTabClick('reader')}
              className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'reader'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {t('workbench.subtabs.reader', 'Đọc thử & Soát trang')}
            </button>
            <button
              type='button'
              data-subtab='handoff'
              id='subtab-handoff'
              onClick={() => handleTabClick('handoff')}
              className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'handoff'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {t('workbench.subtabs.handoff', 'Bàn giao')}
            </button>
          </div>

          {/* Action CTA */}
          {actionCta !== undefined ? (
            actionCta
          ) : onStartProduction ? (
            <button
              type='button'
              onClick={onStartProduction}
              className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer'
            >
              <Rocket className='w-3.5 h-3.5' />
              <span>{t('workbench.startProduction', 'Bắt đầu sản xuất')}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
