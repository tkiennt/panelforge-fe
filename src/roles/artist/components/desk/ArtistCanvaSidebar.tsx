import React, { useState, useMemo } from 'react';
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
  BookOpen,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { ArtistPageItem, PageStage } from './ArtistPageSidebar';

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
 * ArtistCanvaSidebar - Sidebar Canva Navigation đa năng cho Artist Desk
 * - Thanh công cụ chính Canva Dock (72px) bên trái: Chuyển đổi giữa [Pages] - [Script] - [Series Bible].
 * - Ngăn trượt mở rộng Canva Drawer (340px): Hiển thị nội dung chi tiết tương ứng với tab được chọn.
 * - Nhấp lại vào tab đang mở sẽ thu gọn Drawer (trải nghiệm Canvas mượt mà tương tự Canva Editor).
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
}) => {
  // Trạng thái tab Canva đang hoạt động: 'pages' | 'script' | 'bible'
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

  // Xử lý khi nhấn vào nút Tab Canva Dock
  const handleTabClick = (tab: CanvaSidebarTab) => {
    if (activeTab === tab) {
      // Nhấn lại tab hiện tại -> Toggle đóng/mở Drawer (chuẩn Canva)
      setIsDrawerOpen((prev) => !prev);
    } else {
      // Chuyển sang tab mới và đảm bảo Drawer luôn mở
      setActiveTab(tab);
      setIsDrawerOpen(true);
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
    <div className='flex h-full select-none z-30 shrink-0 font-sans shadow-xl relative'>
      {/* =========================================================================
          1. CANVA PRIMARY DOCK (Thanh biểu tượng chính 72px)
          - Luôn ghim cố định ở góc trái ngoài cùng, nền tối #121316
          ========================================================================= */}
      <nav
        data-testid='canva-primary-dock'
        className='w-[72px] bg-[#121316] text-[#A6AAB4] flex flex-col items-center py-3 border-r border-[#26282E] shrink-0 justify-between'
      >
        <div className='w-full flex flex-col items-center gap-2'>
          {/* Logo / Huy hiệu phong cách Canva Editor */}
          <div
            title='PanelForge Manga Studio'
            className='w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7D2AE8] to-[#00C4CC] flex items-center justify-center text-white font-bold text-sm shadow-md mb-2 cursor-pointer hover:scale-105 transition-transform'
          >
            PF
          </div>

          {/* Nút Tab 1: Pages (Trang) */}
          <button
            type='button'
            onClick={() => handleTabClick('pages')}
            data-testid='canva-tab-pages'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'pages' && isDrawerOpen
                ? 'bg-gradient-to-br from-[#7D2AE8] to-[#591AC2] text-white shadow-lg shadow-purple-900/30'
                : 'hover:bg-[#202227] hover:text-white text-[#A6AAB4]'
            }`}
          >
            <Layers className='w-5 h-5 mb-1' />
            <span className='text-[10px] font-semibold tracking-tight'>Trang</span>
          </button>

          {/* Nút Tab 2: Script (Kịch bản) */}
          <button
            type='button'
            onClick={() => handleTabClick('script')}
            data-testid='canva-tab-script'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'script' && isDrawerOpen
                ? 'bg-gradient-to-br from-[#7D2AE8] to-[#591AC2] text-white shadow-lg shadow-purple-900/30'
                : 'hover:bg-[#202227] hover:text-white text-[#A6AAB4]'
            }`}
          >
            <FileText className='w-5 h-5 mb-1' />
            <span className='text-[10px] font-semibold tracking-tight'>Kịch bản</span>
          </button>

          {/* Nút Tab 3: Series Bible */}
          <button
            type='button'
            onClick={() => handleTabClick('bible')}
            data-testid='canva-tab-bible'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'bible' && isDrawerOpen
                ? 'bg-gradient-to-br from-[#7D2AE8] to-[#591AC2] text-white shadow-lg shadow-purple-900/30'
                : 'hover:bg-[#202227] hover:text-white text-[#A6AAB4]'
            }`}
          >
            <Sparkles className='w-5 h-5 mb-1' />
            <span className='text-[10px] font-semibold tracking-tight'>Bible</span>
          </button>
        </div>

        {/* Nút thu gọn / mở rộng Drawer nhanh ở đáy dock */}
        <button
          type='button'
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          title={isDrawerOpen ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
          data-testid='canva-drawer-toggle'
          className='w-10 h-10 rounded-lg hover:bg-[#202227] text-[#A6AAB4] hover:text-white flex items-center justify-center transition-colors'
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
          - Hiển thị nội dung tương ứng theo tab: Pages | Script | Bible
          ========================================================================= */}
      {isDrawerOpen && (
        <aside
          data-testid='canva-secondary-drawer'
          className='w-[330px] sm:w-[350px] bg-[#1E1F24] text-[#E0E2EC] border-r border-[#2C2D35] flex flex-col h-full overflow-hidden'
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
              <div className='p-3.5 border-b border-[#2C2D35] bg-[#18191D] flex items-center justify-between shrink-0'>
                <div>
                  <h2 className='text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5'>
                    <Layers className='w-4 h-4 text-[#7D2AE8]' />
                    Quản Lý Trang ({pages.length})
                  </h2>
                  <p className='text-[11px] text-[#8C90A0] mt-0.5'>
                    Tỷ lệ chuẩn Manga B5 Tankōbon
                  </p>
                </div>

                {/* Nút thêm trang Canva tím nổi bật */}
                <button
                  type='button'
                  onClick={onAddPage}
                  data-testid='canva-btn-add-page-header'
                  className='h-7 px-2.5 rounded-lg bg-[#7D2AE8] hover:bg-[#6C20CE] text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm'
                >
                  <Plus className='w-3.5 h-3.5' /> Thêm trang
                </button>
              </div>

              {/* Thanh lọc & tìm kiếm trang */}
              <div className='p-3 border-b border-[#2C2D35] bg-[#1E1F24] flex flex-col gap-2 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 relative'>
                    <Search className='w-3.5 h-3.5 text-[#8C90A0] absolute left-2.5 top-2.5' />
                    <input
                      type='text'
                      value={pageSearchQuery}
                      onChange={(e) => setPageSearchQuery(e.target.value)}
                      placeholder='Tìm theo tên trang hoặc số...'
                      data-testid='canva-input-search-pages'
                      className='w-full h-8 bg-[#15161A] border border-[#31333B] rounded-lg pl-8 pr-3 text-[11px] text-white placeholder-[#8C90A0] focus:outline-none focus:border-[#7D2AE8]'
                    />
                  </div>

                  <div className='flex items-center bg-[#15161A] border border-[#31333B] rounded-lg p-0.5'>
                    <button
                      type='button'
                      onClick={() => setPageViewMode('thumbnail')}
                      data-testid='canva-btn-view-grid'
                      className={`w-7 h-7 flex items-center justify-center rounded-md ${
                        pageViewMode === 'thumbnail'
                          ? 'bg-[#7D2AE8] text-white'
                          : 'text-[#8C90A0] hover:text-white'
                      }`}
                    >
                      <LayoutGrid className='w-3.5 h-3.5' />
                    </button>
                    <button
                      type='button'
                      onClick={() => setPageViewMode('compact')}
                      data-testid='canva-btn-view-list'
                      className={`w-7 h-7 flex items-center justify-center rounded-md ${
                        pageViewMode === 'compact'
                          ? 'bg-[#7D2AE8] text-white'
                          : 'text-[#8C90A0] hover:text-white'
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
                          className={`px-2 py-1 rounded-full shrink-0 font-medium transition-colors ${
                            pageFilterStage === stage
                              ? 'bg-white text-black'
                              : 'bg-[#15161A] text-[#8C90A0] hover:text-white hover:bg-[#282931]'
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
                          ? 'bg-[#282338] border-[#7D2AE8] ring-1 ring-[#7D2AE8] shadow-md'
                          : 'bg-[#18191D] border-[#2C2D35] hover:border-[#40434F] hover:bg-[#202227]'
                      }`}
                    >
                      {/* Mini B5 Manga Thumbnail */}
                      <div
                        className={`w-14 h-20 bg-white rounded-md border shrink-0 flex flex-col items-center justify-between p-1 shadow-sm transition-opacity ${
                          page.isVisible ? 'opacity-100' : 'opacity-30'
                        } ${isSelected ? 'border-purple-400' : 'border-neutral-300'}`}
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
                            <span className='text-xs font-bold text-white truncate'>
                              Trang {page.pageNumber}
                            </span>
                            <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-800/50 font-medium'>
                              {page.stage}
                            </span>
                          </div>
                          <p className='text-[11px] text-[#8C90A0] truncate mt-0.5'>
                            {page.title}
                          </p>
                        </div>

                        <div className='flex items-center justify-between text-[10px] text-[#8C90A0]'>
                          <span>{page.panelsCount} khung</span>
                          <span>{page.format || 'B5 Master'}</span>
                        </div>
                      </div>

                      {/* Thao tác hover nhanh */}
                      <div className='absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-[#121316]/90 p-1 rounded-lg border border-[#31333B]'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(page.id);
                          }}
                          data-testid={`canva-btn-eye-${page.pageNumber}`}
                          className='p-1 text-[#8C90A0] hover:text-white rounded hover:bg-[#202227]'
                          title={page.isVisible ? 'Ẩn trang' : 'Hiện trang'}
                        >
                          {page.isVisible ? (
                            <Eye className='w-3.5 h-3.5 text-purple-400' />
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
                          className='p-1 text-[#8C90A0] hover:text-white rounded hover:bg-[#202227]'
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
                          className='p-1 text-rose-400 hover:text-rose-200 rounded hover:bg-rose-950/50'
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
              <div className='p-2.5 border-t border-[#2C2D35] bg-[#18191D] flex items-center justify-between text-xs text-[#8C90A0] shrink-0'>
                <span>Đang chọn: Trang {selectedPage?.pageNumber || 1}</span>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    disabled={!selectedPage || selectedPageIndex === 0}
                    onClick={() => selectedPage && onMovePage(selectedPage.id, 'up')}
                    className='p-1.5 rounded-lg hover:bg-[#25262C] text-[#8C90A0] hover:text-white disabled:opacity-30'
                    title='Di chuyển trang lên'
                  >
                    <ChevronUp className='w-4 h-4' />
                  </button>
                  <button
                    type='button'
                    disabled={!selectedPage || selectedPageIndex === pages.length - 1}
                    onClick={() => selectedPage && onMovePage(selectedPage.id, 'down')}
                    className='p-1.5 rounded-lg hover:bg-[#25262C] text-[#8C90A0] hover:text-white disabled:opacity-30'
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
              <div className='p-3.5 border-b border-[#2C2D35] bg-[#18191D] shrink-0'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-bold'>
                    Kịch Bản Chương 1
                  </span>
                  <span className='text-[10px] text-[#8C90A0]'>
                    Trang {selectedPage?.pageNumber || 1}
                  </span>
                </div>
                <h2 className='text-xs font-bold text-white tracking-tight truncate'>
                  {sceneTitle}
                </h2>
                <p className='text-[10px] font-mono text-[#8C90A0] uppercase truncate mt-0.5'>
                  {sceneSlugline}
                </p>
              </div>

              {/* Danh sách dòng kịch bản chuẩn Studio */}
              <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
                {scriptLines.map((line) => (
                  <div
                    key={line.id}
                    data-testid={`script-line-${line.id}`}
                    className='p-3 rounded-xl bg-[#18191D] border border-[#2C2D35] space-y-1.5 hover:border-[#40434F] transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#25262C] text-neutral-300 font-semibold'>
                        Khung {line.panelNumber}
                      </span>
                      {line.characterName && (
                        <span
                          className='text-[11px] font-bold'
                          style={{ color: line.characterColor || '#F97316' }}
                        >
                          {line.characterName}
                        </span>
                      )}
                    </div>

                    {line.stageDirection && (
                      <p className='text-[11px] text-[#A6AAB4] italic leading-relaxed bg-[#141518] p-2 rounded-lg border border-[#26282E]'>
                        🎬 {line.stageDirection}
                      </p>
                    )}

                    {line.dialogueText && (
                      <div className='text-xs text-white bg-purple-950/30 p-2.5 rounded-lg border border-purple-900/40 font-serif leading-relaxed'>
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
              <div className='p-3.5 border-b border-[#2C2D35] bg-[#18191D] shrink-0'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 font-bold'>
                    Series Bible
                  </span>
                  <span className='text-[10px] text-[#8C90A0]'>{seriesTitle}</span>
                </div>
                <h2 className='text-xs font-bold text-white tracking-tight'>
                  Tra Cứu Nhân Vật & Bối Cảnh Canon
                </h2>
              </div>

              {/* Thanh lọc phân loại Bible */}
              <div className='p-3 border-b border-[#2C2D35] bg-[#1E1F24] flex flex-col gap-2 shrink-0'>
                <div className='relative'>
                  <Search className='w-3.5 h-3.5 text-[#8C90A0] absolute left-2.5 top-2.5' />
                  <input
                    type='text'
                    value={bibleSearchQuery}
                    onChange={(e) => setBibleSearchQuery(e.target.value)}
                    placeholder='Tìm nhân vật, địa danh, quy tắc...'
                    data-testid='canva-input-search-bible'
                    className='w-full h-8 bg-[#15161A] border border-[#31333B] rounded-lg pl-8 pr-3 text-[11px] text-white placeholder-[#8C90A0] focus:outline-none focus:border-[#7D2AE8]'
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
                      className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                        bibleCategory === cat.id
                          ? 'bg-[#7D2AE8] text-white'
                          : 'bg-[#15161A] text-[#8C90A0] hover:text-white'
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
                    className='p-3 rounded-xl bg-[#18191D] border border-[#2C2D35] space-y-2 hover:border-[#40434F] transition-colors'
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
                        <span className='text-xs font-bold text-white'>
                          {item.name}
                        </span>
                      </div>
                      <span className='text-[9px] px-2 py-0.5 rounded-full bg-[#25262C] text-neutral-300 font-medium'>
                        {item.tag}
                      </span>
                    </div>

                    <p className='text-[11px] text-[#A6AAB4] leading-relaxed'>
                      {item.description}
                    </p>

                    {item.visualNotes.length > 0 && (
                      <div className='space-y-1 pt-1 border-t border-[#26282E]'>
                        <span className='text-[9px] font-semibold text-purple-300 uppercase tracking-wider'>
                          Đặc điểm tạo hình:
                        </span>
                        <ul className='text-[10px] text-[#8C90A0] space-y-0.5 list-disc list-inside'>
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
