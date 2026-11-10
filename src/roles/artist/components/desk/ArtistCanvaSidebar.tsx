import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Layers,
  FileText,
  Sparkles,
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
  User,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { ArtistPageItem, PageStage } from './ArtistPageSidebar';
import { SidebarTheme } from '@/app/sidebarTheme';
import '@/styles/modules/sidebar-theme.css';

export type CanvaSidebarTab = 'pages' | 'script' | 'bible';

export interface ScriptLineItem {
  id: string;
  panelNumber: number;
  characterName?: string;
  characterColor?: string;
  dialogueText?: string;
  stageDirection?: string;
}

export interface BibleEntityItem {
  id: string;
  name: string;
  category: 'character' | 'location' | 'lore';
  tag: string;
  description: string;
  visualNotes: string[];
  color?: string;
}

export interface ArtistCanvaSidebarProps {
  pages: ArtistPageItem[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (pageId: string) => void;
  // Script props
  scriptLines?: ScriptLineItem[];
  sceneTitle?: string;
  sceneSlugline?: string;
  // Bible props
  bibleEntities?: BibleEntityItem[];
  seriesTitle?: string;
  // Global Theme integration
  theme?: SidebarTheme;
  onBackToStudio?: () => void;
}

const DEFAULT_SCRIPT_LINES: ScriptLineItem[] = [
  {
    id: 'line-1',
    panelNumber: 1,
    stageDirection:
      'Góc toàn cảnh (Extreme Wide Shot): Thung lũng hoang tàn sau cơn bão cát. Khói bốc lên từ tháp quan sát cổng thành phía Nam.',
  },
  {
    id: 'line-2',
    panelNumber: 1,
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Cuối cùng chúng ta cũng vượt qua thung lũng bóng đêm. Nhưng cổng thành... đã bị phong toả hoàn toàn.',
  },
  {
    id: 'line-3',
    panelNumber: 2,
    stageDirection:
      'Cận cảnh (Close-Up): Thanh kiếm của Minh Triết cắm sâu xuống lớp cát lún, ánh thép phản chiếu vệt nắng đầu tiên của bình minh.',
  },
  {
    id: 'line-4',
    panelNumber: 3,
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Nhìn lên tường thành kia kìa! Dấu ấn của gia tộc Hắc Long vừa mới được khắc lên đó.',
  },
  {
    id: 'line-5',
    panelNumber: 4,
    stageDirection:
      'Góc hất từ dưới lên (Low Angle): Cửa sắt nặng nề bắt đầu rung chuyển với âm thanh rít chói tai.',
  },
];

const DEFAULT_BIBLE_ENTITIES: BibleEntityItem[] = [
  {
    id: 'char-1',
    name: 'Minh Triết (Nhân vật chính)',
    category: 'character',
    tag: 'Kiếm Sĩ / Lãng Khách',
    color: '#F97316',
    description:
      'Chiến binh mang huyết thống Viễn Cổ. Trầm tĩnh, quyết đoán, sử dụng trường kiếm cổ bản rộng.',
    visualNotes: [
      'Tóc đen buộc cao nửa đầu, áo choàng rách gấu màu xám tro',
      'Vết sẹo mảnh cắt ngang gò má phải',
      'Chuôi kiếm bọc da thuộc sẫm màu với hoa văn mây lửa',
    ],
  },
  {
    id: 'char-2',
    name: 'Thanh Hà',
    category: 'character',
    tag: 'Thuật Sĩ Gió',
    color: '#06B6D4',
    description:
      'Bạn đồng hành thông minh, tinh thông phong thuật và bản đồ địa hình cổ đại.',
    visualNotes: [
      'Tóc ngắn ngang vai xanh lơ, đeo dải băng trán ngọc lục bảo',
      'Ống phóng phi tiêu nhỏ ở cổ tay trái',
      'Áo khoác dáng lửng màu trắng ngà viền chỉ xanh ngọc',
    ],
  },
  {
    id: 'loc-1',
    name: 'Cổng Thành Phía Nam (Nam Môn Quan)',
    category: 'location',
    tag: 'Địa danh Canon',
    color: '#8B5CF6',
    description:
      'Cửa ngõ phòng thủ kiên cố ngăn cách sa mạc Tử Thần với đô thành Thượng Cảnh.',
    visualNotes: [
      'Tường đá rêu phong cao 20m, xây từ các khối đá hoa cương xám đen',
      'Cánh cổng sắt khổng lồ có chạm phù điêu đôi rồng vờn ngọc',
      'Tháp canh phía Tây bị nứt vỡ một mảng lớn sau trận chiến',
    ],
  },
  {
    id: 'lore-1',
    name: 'Dấu Ấn Hắc Long',
    category: 'lore',
    tag: 'Quy tắc Canon',
    color: '#EF4444',
    description:
      'Ký hiệu nguyền rủa của hoàng tộc thoái vị. Khi xuất hiện ở đâu, nơi đó sẽ chịu phong ấn vĩnh viễn.',
    visualNotes: [
      'Hình tròn đồng tâm lồng 3 vuốt rồng nhọn hướng vào tâm',
      'Luôn phát ra khói đen mờ ảo khi tiếp xúc ánh sáng mặt trời',
    ],
  },
];

/**
 * ArtistCanvaSidebar - Sidebar Canva Navigation chuyên biệt cho Artist Desk
 * - Đồng bộ hoàn toàn bảng màu & biến CSS với Sidebar toàn hệ thống (.pf-sidebar & data-sb-theme).
 * - Đóng vai trò là thanh Sidebar chính khi Artist vào màn hình làm việc bản vẽ.
 * - Thanh công cụ chính Canva Dock (72px): [Pages] - [Script] - [Series Bible] cùng nút quay lại Studio.
 * - Ngăn phụ trượt Canva Drawer (340px): Xem kịch bản, tra cứu bible, quản lý toàn diện trang tranh.
 */
export const ArtistCanvaSidebar: React.FC<ArtistCanvaSidebarProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onToggleVisibility,
  scriptLines = DEFAULT_SCRIPT_LINES,
  sceneTitle = 'Phân cảnh 1: Cổng Thành Phía Nam',
  sceneSlugline = 'NGOẠI · CỔNG THÀNH · SÁNG',
  bibleEntities = DEFAULT_BIBLE_ENTITIES,
  seriesTitle = 'Huyết Thống Viễn Cổ',
  theme,
  onBackToStudio,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();

  // Đồng bộ theme hệ thống từ localStorage hoặc prop
  const [currentTheme, setCurrentTheme] = useState<SidebarTheme>(() => {
    if (theme) return theme;
    try {
      const saved = localStorage.getItem('pf.sidebar.theme');
      return (saved as SidebarTheme) || 'ink';
    } catch {
      return 'ink';
    }
  });

  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [theme]);

  // Trạng thái tab Canva: 'pages' | 'script' | 'bible'
  const [activeTab, setActiveTab] = useState<CanvaSidebarTab>('pages');
  // Trạng thái mở/đóng ngăn phụ (Canva Drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  // Bộ lọc trang (Tab Pages)
  const [pageFilterStage, setPageFilterStage] = useState<PageStage | 'all'>('all');
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageViewMode, setPageViewMode] = useState<'thumbnail' | 'compact'>('thumbnail');

  // Bộ lọc Bible
  const [bibleCategory, setBibleCategory] = useState<'all' | 'character' | 'location' | 'lore'>('all');
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');

  // Xử lý khi nhấn nút Tab Canva Dock
  const handleTabClick = (tab: CanvaSidebarTab) => {
    if (activeTab === tab) {
      setIsDrawerOpen((prev) => !prev);
    } else {
      setActiveTab(tab);
      setIsDrawerOpen(true);
    }
  };

  // Quay lại Studio Workspace
  const handleBack = () => {
    if (onBackToStudio) {
      onBackToStudio();
    } else if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/workspace`);
    } else if (workspaceId) {
      navigate(`/workspaces/${workspaceId}`);
    } else {
      navigate('/workspaces');
    }
  };

  // Lọc danh sách trang
  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const matchStage = pageFilterStage === 'all' || p.stage === pageFilterStage;
      const matchSearch =
        pageSearchQuery.trim() === '' ||
        p.title.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
        `trang ${p.pageNumber}`.includes(pageSearchQuery.toLowerCase()) ||
        String(p.pageNumber) === pageSearchQuery.trim();
      return matchStage && matchSearch;
    });
  }, [pages, pageFilterStage, pageSearchQuery]);

  // Lọc danh sách Series Bible
  const filteredBible = useMemo(() => {
    return bibleEntities.filter((item) => {
      const matchCat = bibleCategory === 'all' || item.category === bibleCategory;
      const matchSearch =
        bibleSearchQuery.trim() === '' ||
        item.name.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
        item.tag.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(bibleSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [bibleEntities, bibleCategory, bibleSearchQuery]);

  const selectedPageIndex = pages.findIndex((p) => p.id === selectedPageId);
  const selectedPage = pages[selectedPageIndex] || null;

  return (
    <div
      className='pf-sidebar flex h-full select-none z-30 shrink-0 font-sans shadow-xl relative'
      data-sb-theme={currentTheme}
      data-testid='artist-desk-sidebar'
    >
      {/* =========================================================================
          1. CANVA PRIMARY DOCK (Thanh biểu tượng chính 72px)
          - Sử dụng các biến CSS chuẩn hệ thống: var(--sb-bg), var(--sb-border), var(--sb-accent)...
          ========================================================================= */}
      <nav
        data-testid='canva-primary-dock'
        className='w-[72px] bg-[var(--sb-bg)] text-[var(--sb-muted)] flex flex-col items-center py-3 border-r border-[var(--sb-border)] shrink-0 justify-between transition-colors'
      >
        <div className='w-full flex flex-col items-center gap-2'>
          {/* Nút Quay lại Studio Workspace */}
          <button
            type='button'
            onClick={handleBack}
            title='Quay lại Studio Workspace'
            data-testid='canva-btn-back-studio'
            className='w-10 h-10 rounded-xl bg-[var(--sb-surface)] hover:bg-[var(--sb-hover)] border border-[var(--sb-border)] flex items-center justify-center text-[var(--sb-text)] hover:text-[var(--sb-accent)] mb-2 transition-all cursor-pointer shadow-2xs'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>

          {/* Nút Tab 1: Pages (Trang) */}
          <button
            type='button'
            onClick={() => handleTabClick('pages')}
            data-testid='canva-tab-pages'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'pages' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
          >
            <Layers
              className={`w-5 h-5 mb-1 ${
                activeTab === 'pages' && isDrawerOpen
                  ? 'text-[var(--sb-accent)]'
                  : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Trang</span>
          </button>

          {/* Nút Tab 2: Script (Kịch bản) */}
          <button
            type='button'
            onClick={() => handleTabClick('script')}
            data-testid='canva-tab-script'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'script' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
          >
            <FileText
              className={`w-5 h-5 mb-1 ${
                activeTab === 'script' && isDrawerOpen
                  ? 'text-[var(--sb-accent)]'
                  : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Kịch bản</span>
          </button>

          {/* Nút Tab 3: Series Bible */}
          <button
            type='button'
            onClick={() => handleTabClick('bible')}
            data-testid='canva-tab-bible'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'bible' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
          >
            <Sparkles
              className={`w-5 h-5 mb-1 ${
                activeTab === 'bible' && isDrawerOpen
                  ? 'text-[var(--sb-accent)]'
                  : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Bible</span>
          </button>
        </div>

        {/* Nút thu gọn / mở rộng Drawer nhanh ở đáy dock */}
        <button
          type='button'
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          title={isDrawerOpen ? 'Thu gọn ngăn chi tiết' : 'Mở rộng ngăn chi tiết'}
          data-testid='canva-drawer-toggle'
          className='w-10 h-10 rounded-lg hover:bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] flex items-center justify-center transition-colors cursor-pointer'
        >
          {isDrawerOpen ? (
            <ChevronLeft className='w-5 h-5' />
          ) : (
            <ChevronRight className='w-5 h-5' />
          )}
        </button>
      </nav>

      {/* =========================================================================
          2. CANVA SECONDARY DRAWER (Ngăn nội dung chi tiết 340px)
          - Sử dụng var(--sb-popover, var(--sb-bg)) đồng bộ với theme hệ thống
          ========================================================================= */}
      {isDrawerOpen && (
        <aside
          data-testid='canva-secondary-drawer'
          className='w-[330px] sm:w-[350px] bg-[var(--sb-popover,var(--sb-bg))] text-[var(--sb-text)] border-r border-[var(--sb-border)] flex flex-col h-full overflow-hidden'
        >
          {/* -------------------------------------------------------------
              TAB 1: PAGES (QUẢN LÝ TRANG)
              ------------------------------------------------------------- */}
          {activeTab === 'pages' && (
            <div
              data-testid='canva-drawer-pages'
              className='flex flex-col h-full overflow-hidden'
            >
              {/* Header Drawer Trang */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] flex items-center justify-between shrink-0'>
                <div>
                  <h2 className='text-xs font-bold uppercase tracking-wider text-[var(--sb-text)] flex items-center gap-1.5'>
                    <Layers className='w-4 h-4 text-[var(--sb-accent)]' />
                    Quản Lý Trang ({pages.length})
                  </h2>
                  <p className='text-[11px] text-[var(--sb-muted)] mt-0.5'>
                    Tỷ lệ chuẩn Manga B5 Tankōbon
                  </p>
                </div>

                {/* Nút thêm trang đồng bộ màu accent hệ thống */}
                <button
                  type='button'
                  onClick={onAddPage}
                  data-testid='canva-btn-add-page-header'
                  className='h-7 px-2.5 rounded-lg bg-[var(--sb-accent)] hover:opacity-90 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' /> Thêm trang
                </button>
              </div>

              {/* Thanh lọc & tìm kiếm trang */}
              <div className='p-3 border-b border-[var(--sb-border)] flex flex-col gap-2 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 relative'>
                    <Search className='w-3.5 h-3.5 text-[var(--sb-muted)] absolute left-2.5 top-2.5' />
                    <input
                      type='text'
                      value={pageSearchQuery}
                      onChange={(e) => setPageSearchQuery(e.target.value)}
                      placeholder='Tìm theo tên trang hoặc số...'
                      data-testid='canva-input-search-pages'
                      className='w-full h-8 bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-[11px] text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
                    />
                  </div>

                  <div className='flex items-center bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg p-0.5'>
                    <button
                      type='button'
                      onClick={() => setPageViewMode('thumbnail')}
                      data-testid='canva-btn-view-grid'
                      className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer ${
                        pageViewMode === 'thumbnail'
                          ? 'bg-[var(--sb-accent)] text-white'
                          : 'text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      <LayoutGrid className='w-3.5 h-3.5' />
                    </button>
                    <button
                      type='button'
                      onClick={() => setPageViewMode('compact')}
                      data-testid='canva-btn-view-list'
                      className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer ${
                        pageViewMode === 'compact'
                          ? 'bg-[var(--sb-accent)] text-white'
                          : 'text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      <List className='w-3.5 h-3.5' />
                    </button>
                  </div>
                </div>

                {/* Filter Chips */}
                <div className='flex items-center gap-1 overflow-x-auto text-[10px] scrollbar-none'>
                  {(['all', 'pencil', 'ink', 'lettering', 'completed'] as const).map(
                    (stage) => {
                      const labels: Record<string, string> = {
                        all: 'Tất cả',
                        pencil: 'Chì',
                        ink: 'Mực',
                        lettering: 'Thoại',
                        completed: 'Hoàn tất',
                      };
                      return (
                        <button
                          key={stage}
                          type='button'
                          onClick={() => setPageFilterStage(stage)}
                          className={`px-2.5 py-1 rounded-full shrink-0 font-medium transition-colors cursor-pointer ${
                            pageFilterStage === stage
                              ? 'bg-[var(--sb-accent)] text-white'
                              : 'bg-[var(--sb-surface)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:bg-[var(--sb-hover)]'
                          }`}
                        >
                          {labels[stage]}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Danh sách thẻ trang */}
              <div
                data-testid='canva-pages-container'
                className='flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar'
              >
                {filteredPages.map((page) => {
                  const isSelected = page.id === selectedPageId;
                  return (
                    <div
                      key={page.id}
                      data-testid={`canva-page-card-${page.pageNumber}`}
                      onClick={() => onSelectPage(page.id)}
                      className={`group relative flex gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--sb-active-bg)] border-[var(--sb-accent)] ring-1 ring-[var(--sb-accent)]/60 shadow-sm'
                          : 'bg-[var(--sb-surface)] border-[var(--sb-border)] hover:border-[var(--sb-accent)]/50 hover:bg-[var(--sb-surface-hover)]'
                      }`}
                    >
                      {/* Mini B5 Manga Thumbnail */}
                      <div
                        className={`w-14 h-20 bg-white rounded-md border shrink-0 flex flex-col items-center justify-between p-1 shadow-2xs transition-opacity ${
                          page.isVisible ? 'opacity-100' : 'opacity-30'
                        } ${isSelected ? 'border-[var(--sb-accent)]' : 'border-neutral-300'}`}
                      >
                        <div className='flex justify-between w-full opacity-40'>
                          <div className='w-1 h-1 border-t border-l border-neutral-600' />
                          <div className='w-1 h-1 border-t border-r border-neutral-600' />
                        </div>
                        <div className='w-full flex-1 my-0.5 border border-dashed border-neutral-400/70 rounded-xs flex items-center justify-center'>
                          <span className='text-[9px] font-mono font-bold text-neutral-600'>
                            P{page.pageNumber}
                          </span>
                        </div>
                        <div className='flex justify-between w-full opacity-40'>
                          <div className='w-1 h-1 border-b border-l border-neutral-600' />
                          <div className='w-1 h-1 border-b border-r border-neutral-600' />
                        </div>
                      </div>

                      {/* Chi tiết trang */}
                      <div className='flex-1 min-w-0 flex flex-col justify-between py-0.5'>
                        <div>
                          <div className='flex items-center justify-between gap-1'>
                            <span className='text-xs font-bold text-[var(--sb-text)] truncate'>
                              Trang {page.pageNumber}
                            </span>
                            <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-medium'>
                              {page.stage}
                            </span>
                          </div>
                          <p className='text-[11px] text-[var(--sb-muted)] truncate mt-0.5'>
                            {page.title}
                          </p>
                        </div>

                        <div className='flex items-center justify-between text-[10px] text-[var(--sb-muted)]'>
                          <span>{page.panelsCount} khung</span>
                          <span>{page.format || 'B5 Master'}</span>
                        </div>
                      </div>

                      {/* Thao tác hover nhanh */}
                      <div className='absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-[var(--sb-popover,var(--sb-bg))] p-1 rounded-lg border border-[var(--sb-border)] shadow-md'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(page.id);
                          }}
                          data-testid={`canva-btn-eye-${page.pageNumber}`}
                          className='p-1 text-[var(--sb-muted)] hover:text-[var(--sb-text)] rounded hover:bg-[var(--sb-hover)] cursor-pointer'
                          title={page.isVisible ? 'Ẩn trang' : 'Hiện trang'}
                        >
                          {page.isVisible ? (
                            <Eye className='w-3.5 h-3.5 text-[var(--sb-accent)]' />
                          ) : (
                            <EyeOff className='w-3.5 h-3.5 opacity-50' />
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePage(page.id);
                          }}
                          className='p-1 text-[var(--sb-muted)] hover:text-[var(--sb-text)] rounded hover:bg-[var(--sb-hover)] cursor-pointer'
                          title='Nhân đôi trang'
                        >
                          <Copy className='w-3.5 h-3.5' />
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(page.id);
                          }}
                          className='p-1 text-rose-400 hover:text-rose-200 rounded hover:bg-rose-950/50 cursor-pointer'
                          title='Xoá trang'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer quản lý trang */}
              <div className='p-2.5 border-t border-[var(--sb-border)] bg-[var(--sb-surface)] flex items-center justify-between text-xs text-[var(--sb-muted)] shrink-0'>
                <span>Đang chọn: Trang {selectedPage?.pageNumber || 1}</span>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    disabled={!selectedPage || selectedPageIndex === 0}
                    onClick={() => selectedPage && onMovePage(selectedPage.id, 'up')}
                    className='p-1.5 rounded-lg hover:bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] disabled:opacity-30 cursor-pointer'
                    title='Di chuyển trang lên'
                  >
                    <ChevronUp className='w-4 h-4' />
                  </button>
                  <button
                    type='button'
                    disabled={!selectedPage || selectedPageIndex === pages.length - 1}
                    onClick={() => selectedPage && onMovePage(selectedPage.id, 'down')}
                    className='p-1.5 rounded-lg hover:bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] disabled:opacity-30 cursor-pointer'
                    title='Di chuyển trang xuống'
                  >
                    <ChevronDown className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 2: SCRIPT (XEM KỊCH BẢN PHÂN CẢNH)
              ------------------------------------------------------------- */}
          {activeTab === 'script' && (
            <div
              data-testid='canva-drawer-script'
              className='flex flex-col h-full overflow-hidden'
            >
              {/* Header Drawer Kịch bản */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                    Kịch Bản Chương 1
                  </span>
                  <span className='text-[10px] text-[var(--sb-muted)]'>
                    Trang {selectedPage?.pageNumber || 1}
                  </span>
                </div>
                <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight truncate'>
                  {sceneTitle}
                </h2>
                <p className='text-[10px] font-mono text-[var(--sb-muted)] uppercase truncate mt-0.5'>
                  {sceneSlugline}
                </p>
              </div>

              {/* Danh sách dòng kịch bản chuẩn Studio */}
              <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
                {scriptLines.map((line) => (
                  <div
                    key={line.id}
                    data-testid={`script-line-${line.id}`}
                    className='p-3 rounded-xl bg-[var(--sb-surface)] border border-[var(--sb-border)] space-y-1.5 hover:border-[var(--sb-accent)]/50 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--sb-surface-hover)] text-[var(--sb-text)] font-semibold'>
                        Khung {line.panelNumber}
                      </span>
                      {line.characterName && (
                        <span
                          className='text-[11px] font-bold'
                          style={{ color: line.characterColor || 'var(--sb-accent)' }}
                        >
                          {line.characterName}
                        </span>
                      )}
                    </div>

                    {line.stageDirection && (
                      <p className='text-[11px] text-[var(--sb-muted)] italic leading-relaxed bg-[var(--sb-hover)] p-2 rounded-lg border border-[var(--sb-border)]'>
                        🎬 {line.stageDirection}
                      </p>
                    )}

                    {line.dialogueText && (
                      <div className='text-xs text-[var(--sb-text)] bg-[var(--sb-active-bg)] p-2.5 rounded-lg border border-[var(--sb-border)] font-serif leading-relaxed'>
                        💬 &ldquo;{line.dialogueText}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 3: SERIES BIBLE (TRA CỨU CANON)
              ------------------------------------------------------------- */}
          {activeTab === 'bible' && (
            <div
              data-testid='canva-drawer-bible'
              className='flex flex-col h-full overflow-hidden'
            >
              {/* Header Drawer Bible */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                    Series Bible
                  </span>
                  <span className='text-[10px] text-[var(--sb-muted)]'>{seriesTitle}</span>
                </div>
                <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight'>
                  Tra Cứu Nhân Vật & Bối Cảnh Canon
                </h2>
              </div>

              {/* Thanh lọc phân loại Bible */}
              <div className='p-3 border-b border-[var(--sb-border)] flex flex-col gap-2 shrink-0'>
                <div className='relative'>
                  <Search className='w-3.5 h-3.5 text-[var(--sb-muted)] absolute left-2.5 top-2.5' />
                  <input
                    type='text'
                    value={bibleSearchQuery}
                    onChange={(e) => setBibleSearchQuery(e.target.value)}
                    placeholder='Tìm nhân vật, địa danh, quy tắc...'
                    data-testid='canva-input-search-bible'
                    className='w-full h-8 bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-[11px] text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
                  />
                </div>

                <div className='flex items-center gap-1 text-[10px]'>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'character', label: 'Nhân vật' },
                    { id: 'location', label: 'Bối cảnh' },
                    { id: 'lore', label: 'Quy tắc' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type='button'
                      onClick={() => setBibleCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                        bibleCategory === cat.id
                          ? 'bg-[var(--sb-accent)] text-white'
                          : 'bg-[var(--sb-surface)] text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách thẻ thực thể Bible */}
              <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
                {filteredBible.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`bible-entity-${item.id}`}
                    className='p-3 rounded-xl bg-[var(--sb-surface)] border border-[var(--sb-border)] space-y-2 hover:border-[var(--sb-accent)]/50 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        {item.category === 'character' ? (
                          <User className='w-4 h-4 text-orange-400' />
                        ) : item.category === 'location' ? (
                          <MapPin className='w-4 h-4 text-purple-400' />
                        ) : (
                          <Sparkles className='w-4 h-4 text-emerald-400' />
                        )}
                        <span className='text-xs font-bold text-[var(--sb-text)]'>
                          {item.name}
                        </span>
                      </div>
                      <span className='text-[9px] px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-muted)] font-medium'>
                        {item.tag}
                      </span>
                    </div>

                    <p className='text-[11px] text-[var(--sb-muted)] leading-relaxed'>
                      {item.description}
                    </p>

                    {item.visualNotes.length > 0 && (
                      <div className='space-y-1 pt-1 border-t border-[var(--sb-border)]'>
                        <span className='text-[9px] font-semibold text-[var(--sb-accent)] uppercase tracking-wider'>
                          Đặc điểm tạo hình:
                        </span>
                        <ul className='text-[10px] text-[var(--sb-muted)] space-y-0.5 list-disc list-inside'>
                          {item.visualNotes.map((note, idx) => (
                            <li key={idx} className='leading-tight'>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

export default ArtistCanvaSidebar;
