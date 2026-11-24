import React, { useState, useMemo } from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  Sparkles,
  Lock,
  Unlock,
  SlidersHorizontal,
} from 'lucide-react';
import { CollapsibleSidebar, SidebarSection } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

export type PageStage = 'pencil' | 'ink' | 'lettering' | 'completed';

export interface ArtistPageItem {
  id: string;
  pageNumber: number;
  title: string;
  stage: PageStage;
  panelsCount: number;
  format?: string;
  thumbnailUrl?: string | null;
  isVisible: boolean;
  isLocked?: boolean;
}

export interface ArtistPageSidebarProps {
  pages: ArtistPageItem[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (pageId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const STAGE_CONFIG: Record<
  PageStage,
  { labelKey: string; bg: string; text: string; border: string; dot: string }
> = {
  pencil: {
    labelKey: 'pageSidebar.stagePencil',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-700/50',
    dot: 'bg-amber-400',
  },
  ink: {
    labelKey: 'pageSidebar.stageInk',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    border: 'border-cyan-700/50',
    dot: 'bg-cyan-400',
  },
  lettering: {
    labelKey: 'pageSidebar.stageLettering',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    border: 'border-purple-700/50',
    dot: 'bg-purple-400',
  },
  completed: {
    labelKey: 'pageSidebar.stageCompleted',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
    dot: 'bg-emerald-400',
  },
};

/**
 * ArtistPageSidebar - Photoshop-inspired Manga Page Management Sidebar
 * Mô phỏng giao diện Artboards / Pages / Layers trứ danh của Adobe Photoshop:
 * - Theme Charcoal / Dark Studio (#1E1E1E, #252526, #2D2D30).
 * - Thanh tiêu đề chuẩn Photoshop: tab Pages, menu flyout, nút thu phóng 1-click.
 * - Thanh công cụ lọc & tìm kiếm trang nhanh (Search / Stage filter).
 * - Danh sách thumbnail trang chuẩn tỷ lệ Manga B5 với Eye toggle, Panel count.
 * - Thanh công cụ đáy Photoshop (Footer): Thùng rác, Di chuyển Lên/Xuống, Nhân đôi trang, Tạo trang mới.
 * - Khả năng Dock / Thu gọn về dải biểu tượng 48px siêu gọn khi cần mở rộng diện tích vẽ.
 */
export const ArtistPageSidebar: React.FC<ArtistPageSidebarProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onToggleVisibility,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useTranslation('artist');
  const [filterStage, setFilterStage] = useState<PageStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'thumbnail' | 'compact'>('thumbnail');
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // Lọc danh sách trang theo từ khoá và giai đoạn
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchStage = filterStage === 'all' || page.stage === filterStage;
      const matchSearch =
        searchQuery.trim() === '' ||
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `trang ${page.pageNumber}`.includes(searchQuery.toLowerCase()) ||
        `${page.pageNumber}` === searchQuery.trim();
      return matchStage && matchSearch;
    });
  }, [pages, filterStage, searchQuery]);

  const selectedPageIndex = pages.findIndex((p) => p.id === selectedPageId);
  const selectedPage = pages[selectedPageIndex] || null;

  // Render trạng thái thu gọn kiểu Photoshop Docked Strip
  if (isCollapsed) {
    return (
      <CollapsibleSidebar
        collapsed
        label={t('pageSidebar.sidebarLabel')}
        data-testid='artist-page-sidebar-collapsed'
        className='bg-[#252526] border-r border-[#383838] flex flex-col items-center py-2 select-none z-20 transition-all duration-200'
      >
        {/* Nút mở rộng Sidebar (Photoshop flyout toggle >>) */}
        <button
          type='button'
          onClick={onToggleCollapse}
          title={t('pageSidebar.expandTitle')}
          data-testid='btn-expand-sidebar'
          className='w-8 h-8 flex items-center justify-center rounded-xs text-[#CCCCCC] hover:text-white hover:bg-[#3E3E42] transition-colors mb-2'
        >
          <ChevronRight className='w-4 h-4' />
        </button>

        <div className='w-8 h-[1px] bg-[#383838] mb-2' />

        {/* Biểu tượng Tab Pages */}
        <div
          title={t('pageSidebar.pagesTabTitle')}
          className='w-8 h-8 flex items-center justify-center text-[#CCCCCC]/70 mb-2'
        >
          <Layers className='w-4 h-4' />
        </div>

        {/* Danh sách trang dạng mini strip */}
        <SidebarSection
          collapsed
          label={t('pageSidebar.pagesSectionLabel')}
          className='flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1.5 px-1 py-1 scrollbar-thin scrollbar-thumb-[#3E3E42]'
        >
          {pages.map((p) => {
            const isSelected = p.id === selectedPageId;
            return (
              <button
                key={p.id}
                type='button'
                onClick={() => onSelectPage(p.id)}
                title={t('pageSidebar.miniPageTitle', {
                  page: p.pageNumber,
                  title: p.title,
                  stage: t(STAGE_CONFIG[p.stage].labelKey),
                })}
                data-testid={`mini-page-btn-${p.pageNumber}`}
                className={`w-8 h-10 rounded-xs flex flex-col items-center justify-center border text-[10px] font-mono relative transition-all ${
                  isSelected
                    ? 'bg-[#094771] border-[#007ACC] text-white shadow-sm ring-1 ring-[#007ACC]'
                    : 'bg-[#1E1E1E] border-[#383838] text-[#9E9E9E] hover:border-[#555555] hover:text-[#CCCCCC]'
                }`}
              >
                <span className='font-semibold'>P{p.pageNumber}</span>
                {/* Dot trạng thái giai đoạn */}
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STAGE_CONFIG[p.stage].dot}`} />
              </button>
            );
          })}
        </SidebarSection>

        <div className='w-8 h-[1px] bg-[#383838] my-2' />

        {/* Nút thêm trang nhanh ở dạng collapsed */}
        <button
          type='button'
          onClick={onAddPage}
          title={t('pageSidebar.addPageTitle')}
          data-testid='btn-add-page-collapsed'
          className='w-8 h-8 flex items-center justify-center rounded-xs text-[#CCCCCC] hover:text-white hover:bg-[#3E3E42] transition-colors'
        >
          <Plus className='w-4 h-4' />
        </button>
      </CollapsibleSidebar>
    );
  }

  // Render trạng thái mở rộng đầy đủ (Photoshop Expanded Panel)
  return (
    <CollapsibleSidebar
      collapsed={false}
      label={t('pageSidebar.sidebarLabel')}
      data-testid='artist-page-sidebar'
      className='bg-[#252526] text-[#CCCCCC] border-r border-[#383838] flex flex-col h-full select-none z-20 font-sans shadow-lg'
    >
      {/* 1. Header bảng điều khiển kiểu Photoshop Tab */}
      <div className='h-9 bg-[#2D2D30] border-b border-[#383838] px-2.5 flex items-center justify-between shrink-0'>
        <div className='flex items-center gap-2'>
          <Layers className='w-3.5 h-3.5 text-[#007ACC]' />
          <span className='text-[11px] font-bold tracking-wider uppercase text-[#CCCCCC]'>
            {t('pageSidebar.headerTitle')}
          </span>
          <span className='text-[10px] bg-[#1E1E1E] border border-[#3E3E42] text-[#858585] px-1.5 py-0.2 rounded-xs font-mono'>
            {pages.length}
          </span>
        </div>

        <div className='flex items-center gap-0.5 relative'>
          {/* Menu phụ Flyout (Photoshop Panel Hamburger Menu) */}
          <button
            type='button'
            onClick={() => setIsFlyoutOpen((prev) => !prev)}
            title={t('pageSidebar.flyoutTitle')}
            data-testid='btn-panel-flyout'
            className='w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#3E3E42] text-[#CCCCCC] hover:text-white transition-colors'
          >
            <MoreHorizontal className='w-3.5 h-3.5' />
          </button>

          {/* Nút thu gọn Sidebar (Photoshop <<) */}
          <button
            type='button'
            onClick={onToggleCollapse}
            title={t('pageSidebar.collapseTitle')}
            data-testid='btn-collapse-sidebar'
            className='w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#3E3E42] text-[#CCCCCC] hover:text-white transition-colors'
          >
            <ChevronLeft className='w-3.5 h-3.5' />
          </button>

          {/* Menu Dropdown Flyout */}
          {isFlyoutOpen && (
            <div
              data-testid='panel-flyout-menu'
              className='absolute top-7 right-0 w-48 bg-[#1E1E1E] border border-[#3E3E42] rounded-xs shadow-2xl py-1 z-50 text-[12px]'
            >
              <button
                type='button'
                onClick={() => {
                  onAddPage();
                  setIsFlyoutOpen(false);
                }}
                className='w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 text-[#CCCCCC]'
              >
                <Plus className='w-3.5 h-3.5' /> {t('pageSidebar.addPage')}
              </button>
              {selectedPage && (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      onDuplicatePage(selectedPage.id);
                      setIsFlyoutOpen(false);
                    }}
                    className='w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 text-[#CCCCCC]'
                  >
                    <Copy className='w-3.5 h-3.5' />{' '}
                    {t('pageSidebar.duplicatePageNumber', { page: selectedPage.pageNumber })}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      onDeletePage(selectedPage.id);
                      setIsFlyoutOpen(false);
                    }}
                    className='w-full text-left px-3 py-1.5 hover:bg-rose-900/60 hover:text-rose-200 flex items-center gap-2 text-rose-400'
                  >
                    <Trash2 className='w-3.5 h-3.5' />{' '}
                    {t('pageSidebar.deletePageNumber', { page: selectedPage.pageNumber })}
                  </button>
                </>
              )}
              <div className='my-1 border-t border-[#2D2D30]' />
              <div className='px-3 py-1 text-[10px] text-[#858585] uppercase tracking-wider font-semibold'>
                {t('pageSidebar.viewModeHeader')}
              </div>
              <button
                type='button'
                onClick={() => {
                  setViewMode('thumbnail');
                  setIsFlyoutOpen(false);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  viewMode === 'thumbnail' ? 'text-[#007ACC] font-medium' : 'text-[#CCCCCC]'
                }`}
              >
                <span>{t('pageSidebar.viewThumbnails')}</span>
                {viewMode === 'thumbnail' && <CheckCircle2 className='w-3 h-3' />}
              </button>
              <button
                type='button'
                onClick={() => {
                  setViewMode('compact');
                  setIsFlyoutOpen(false);
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  viewMode === 'compact' ? 'text-[#007ACC] font-medium' : 'text-[#CCCCCC]'
                }`}
              >
                <span>{t('pageSidebar.viewCompact')}</span>
                {viewMode === 'compact' && <CheckCircle2 className='w-3 h-3' />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Thanh lọc và tìm kiếm kiểu Photoshop Filter Strip */}
      <div className='p-2 bg-[#1E1E1E] border-b border-[#383838] flex flex-col gap-1.5 shrink-0'>
        {/* Hàng tìm kiếm & đổi chế độ xem */}
        <div className='flex items-center gap-1.5'>
          <div className='flex-1 relative'>
            <Search className='w-3 h-3 text-[#858585] absolute left-2 top-2' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pageSidebar.searchPlaceholder')}
              data-testid='input-search-pages'
              className='w-full h-7 bg-[#252526] border border-[#3E3E42] rounded-xs pl-7 pr-2 text-[11px] text-[#CCCCCC] placeholder-[#858585] focus:outline-none focus:border-[#007ACC]'
            />
          </div>

          <div className='flex items-center bg-[#252526] border border-[#3E3E42] rounded-xs p-0.5'>
            <button
              type='button'
              onClick={() => setViewMode('thumbnail')}
              title={t('pageSidebar.viewThumbnailTitle')}
              data-testid='btn-view-thumbnail'
              className={`w-5 h-5 flex items-center justify-center rounded-xs transition-colors ${
                viewMode === 'thumbnail'
                  ? 'bg-[#094771] text-white'
                  : 'text-[#858585] hover:text-[#CCCCCC]'
              }`}
            >
              <LayoutGrid className='w-3 h-3' />
            </button>
            <button
              type='button'
              onClick={() => setViewMode('compact')}
              title={t('pageSidebar.viewCompactTitle')}
              data-testid='btn-view-compact'
              className={`w-5 h-5 flex items-center justify-center rounded-xs transition-colors ${
                viewMode === 'compact'
                  ? 'bg-[#094771] text-white'
                  : 'text-[#858585] hover:text-[#CCCCCC]'
              }`}
            >
              <List className='w-3 h-3' />
            </button>
          </div>
        </div>

        {/* Thanh lọc trạng thái giai đoạn (Chips) */}
        <div className='flex items-center gap-1 overflow-x-auto py-0.5 text-[10px] scrollbar-none'>
          {(['all', 'pencil', 'ink', 'lettering', 'completed'] as const).map((stage) => {
            const isActive = filterStage === stage;
            const label =
              stage === 'all' ? t('pageSidebar.filterAll') : t(STAGE_CONFIG[stage].labelKey);
            return (
              <button
                key={stage}
                type='button'
                onClick={() => setFilterStage(stage)}
                data-testid={`filter-stage-${stage}`}
                className={`px-2 py-0.5 rounded-xs shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#007ACC] text-white font-medium'
                    : 'bg-[#252526] text-[#858585] hover:text-[#CCCCCC] hover:bg-[#2D2D30]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Danh sách trang (Photoshop Layers / Pages Container) */}
      <div
        data-testid='artist-pages-container'
        className='flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-[#3E3E42] scrollbar-track-[#1E1E1E]'
      >
        {filteredPages.length === 0 ? (
          <div className='py-8 text-center text-[#858585] text-[11px] flex flex-col items-center justify-center'>
            <FileText className='w-6 h-6 mb-1 text-[#858585]/60' />
            <span>{t('pageSidebar.noPagesFound')}</span>
          </div>
        ) : (
          filteredPages.map((page) => {
            const isSelected = page.id === selectedPageId;
            const stageMeta = STAGE_CONFIG[page.stage];

            if (viewMode === 'compact') {
              // Compact List Row (Giống Photoshop Layers list)
              return (
                <div
                  key={page.id}
                  data-testid={`page-row-${page.pageNumber}`}
                  onClick={() => onSelectPage(page.id)}
                  className={`group relative flex items-center justify-between px-2 py-1.5 rounded-xs border text-[11px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#094771] border-[#007ACC] text-white font-medium'
                      : 'bg-[#1E1E1E] border-transparent text-[#CCCCCC] hover:bg-[#2A2D2E]'
                  }`}
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    {/* Nút bật/tắt hiển thị (Photoshop Eye icon) */}
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(page.id);
                      }}
                      title={page.isVisible ? t('pageSidebar.hidePage') : t('pageSidebar.showPage')}
                      className='text-[#858585] hover:text-white shrink-0'
                      data-testid={`btn-eye-${page.pageNumber}`}
                    >
                      {page.isVisible ? (
                        <Eye className='w-3.5 h-3.5 text-[#007ACC]' />
                      ) : (
                        <EyeOff className='w-3.5 h-3.5 opacity-40' />
                      )}
                    </button>

                    <span className='font-mono text-[10px] text-[#858585] group-hover:text-white shrink-0'>
                      #{String(page.pageNumber).padStart(2, '0')}
                    </span>

                    <span className='truncate text-[11px]'>{page.title}</span>
                  </div>

                  <div className='flex items-center gap-1.5 shrink-0'>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-xs border ${stageMeta.bg} ${stageMeta.text} ${stageMeta.border}`}
                    >
                      {t(stageMeta.labelKey)}
                    </span>
                  </div>
                </div>
              );
            }

            // Thumbnail Card View (Giống Artboard / Canvas Preview)
            return (
              <div
                key={page.id}
                data-testid={`page-card-${page.pageNumber}`}
                onClick={() => onSelectPage(page.id)}
                className={`group relative flex gap-2.5 p-2 rounded-xs border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#094771]/90 border-[#007ACC] text-white shadow-md'
                    : 'bg-[#1E1E1E] border-[#333333] text-[#CCCCCC] hover:bg-[#2A2D2E] hover:border-[#444444]'
                }`}
              >
                {/* 1. Nút con mắt Photoshop (Eye toggle) bên lề trái */}
                <div className='flex flex-col items-center justify-between shrink-0 pt-0.5'>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(page.id);
                    }}
                    title={page.isVisible ? t('pageSidebar.hidePage') : t('pageSidebar.showPage')}
                    className='text-[#858585] hover:text-white transition-colors'
                    data-testid={`btn-eye-${page.pageNumber}`}
                  >
                    {page.isVisible ? (
                      <Eye className='w-3.5 h-3.5 text-[#007ACC]' />
                    ) : (
                      <EyeOff className='w-3.5 h-3.5 opacity-40' />
                    )}
                  </button>

                  <span className='text-[9px] font-mono text-[#858585]'>
                    {String(page.pageNumber).padStart(2, '0')}
                  </span>
                </div>

                {/* 2. Manga B5 Thumbnail Canvas Box */}
                <div
                  className={`w-12 h-16 bg-white border rounded-2xs relative flex flex-col items-center justify-center shrink-0 overflow-hidden shadow-xs transition-transform ${
                    page.isVisible ? 'opacity-100' : 'opacity-30'
                  } ${isSelected ? 'border-white' : 'border-[#858585]/40'}`}
                >
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={t('pageSidebar.pageAlt', { page: page.pageNumber })}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='w-full h-full p-1 flex flex-col justify-between'>
                      {/* Dấu định vị góc vẽ (Registration Marks) */}
                      <div className='flex justify-between w-full opacity-40'>
                        <div className='w-1 h-1 border-t border-l border-neutral-600' />
                        <div className='w-1 h-1 border-t border-r border-neutral-600' />
                      </div>
                      {/* Minh hoạ khung panel */}
                      <div className='w-full flex-1 my-0.5 border border-dashed border-neutral-400/80 rounded-2xs flex items-center justify-center'>
                        <span className='text-[8px] font-mono font-bold text-neutral-500'>
                          P{page.pageNumber}
                        </span>
                      </div>
                      <div className='flex justify-between w-full opacity-40'>
                        <div className='w-1 h-1 border-b border-l border-neutral-600' />
                        <div className='w-1 h-1 border-b border-r border-neutral-600' />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Chi tiết trang & Metadata */}
                <div className='flex-1 min-w-0 flex flex-col justify-between py-0.5'>
                  <div>
                    <div className='flex items-center justify-between gap-1'>
                      <span className='text-[11px] font-semibold truncate'>
                        {t('pageSidebar.pageLabel', { page: page.pageNumber })}
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded-xs border font-medium ${stageMeta.bg} ${stageMeta.text} ${stageMeta.border}`}
                      >
                        {t(stageMeta.labelKey)}
                      </span>
                    </div>

                    <p className='text-[10px] text-[#858585] truncate mt-0.5'>
                      {page.title || t('pageSidebar.untitled')}
                    </p>
                  </div>

                  <div className='flex items-center justify-between text-[9px] text-[#858585] mt-1'>
                    <span>{t('pageSidebar.panelsCount', { count: page.panelsCount })}</span>
                    <span>{page.format || 'B5 Master'}</span>
                  </div>
                </div>

                {/* 4. Thanh công cụ hover nhanh (Quick actions on card) */}
                <div className='absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5 bg-[#252526]/90 p-0.5 rounded-xs border border-[#3E3E42]'>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(page.id);
                    }}
                    title={t('pageSidebar.duplicatePageTitle')}
                    data-testid={`btn-quick-duplicate-${page.pageNumber}`}
                    className='w-4 h-4 flex items-center justify-center text-[#CCCCCC] hover:text-white hover:bg-[#3E3E42] rounded-xs'
                  >
                    <Copy className='w-2.5 h-2.5' />
                  </button>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    title={t('pageSidebar.deletePageTitle')}
                    data-testid={`btn-quick-delete-${page.pageNumber}`}
                    className='w-4 h-4 flex items-center justify-center text-rose-400 hover:text-rose-200 hover:bg-rose-900/60 rounded-xs'
                  >
                    <Trash2 className='w-2.5 h-2.5' />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Thanh công cụ đáy chuẩn Photoshop (Layers Panel Footer) */}
      <div className='h-9 bg-[#2D2D30] border-t border-[#383838] px-2 flex items-center justify-between shrink-0'>
        {/* Nút xoá trang đang chọn */}
        <button
          type='button'
          disabled={!selectedPage || pages.length <= 1}
          onClick={() => selectedPage && onDeletePage(selectedPage.id)}
          title={t('pageSidebar.footerDeleteTitle')}
          data-testid='btn-footer-delete'
          className='w-6 h-6 flex items-center justify-center rounded-xs text-[#858585] hover:text-rose-400 hover:bg-[#3E3E42] disabled:opacity-30 disabled:pointer-events-none transition-colors'
        >
          <Trash2 className='w-3.5 h-3.5' />
        </button>

        <div className='flex items-center gap-0.5'>
          {/* Di chuyển lên */}
          <button
            type='button'
            disabled={!selectedPage || selectedPageIndex === 0}
            onClick={() => selectedPage && onMovePage(selectedPage.id, 'up')}
            title={t('pageSidebar.footerMoveUpTitle')}
            data-testid='btn-footer-move-up'
            className='w-6 h-6 flex items-center justify-center rounded-xs text-[#858585] hover:text-white hover:bg-[#3E3E42] disabled:opacity-30 disabled:pointer-events-none transition-colors'
          >
            <ChevronUp className='w-3.5 h-3.5' />
          </button>

          {/* Di chuyển xuống */}
          <button
            type='button'
            disabled={!selectedPage || selectedPageIndex === pages.length - 1}
            onClick={() => selectedPage && onMovePage(selectedPage.id, 'down')}
            title={t('pageSidebar.footerMoveDownTitle')}
            data-testid='btn-footer-move-down'
            className='w-6 h-6 flex items-center justify-center rounded-xs text-[#858585] hover:text-white hover:bg-[#3E3E42] disabled:opacity-30 disabled:pointer-events-none transition-colors'
          >
            <ChevronDown className='w-3.5 h-3.5' />
          </button>

          {/* Nhân bản trang */}
          <button
            type='button'
            disabled={!selectedPage}
            onClick={() => selectedPage && onDuplicatePage(selectedPage.id)}
            title={t('pageSidebar.footerDuplicateTitle')}
            data-testid='btn-footer-duplicate'
            className='w-6 h-6 flex items-center justify-center rounded-xs text-[#858585] hover:text-white hover:bg-[#3E3E42] disabled:opacity-30 disabled:pointer-events-none transition-colors'
          >
            <Copy className='w-3.5 h-3.5' />
          </button>
        </div>

        {/* Nút tạo trang mới (Photoshop New Layer/Page + icon) */}
        <button
          type='button'
          onClick={onAddPage}
          title={t('pageSidebar.addPageTitle')}
          data-testid='btn-footer-add-page'
          className='w-6 h-6 flex items-center justify-center rounded-xs bg-[#007ACC] hover:bg-[#0062A3] text-white transition-colors shadow-xs'
        >
          <Plus className='w-4 h-4' />
        </button>
      </div>
    </CollapsibleSidebar>
  );
};

export default ArtistPageSidebar;
