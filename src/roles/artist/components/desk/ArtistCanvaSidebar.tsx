import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutTemplate,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';
import { ArtistPageItem, PageStage } from './ArtistPageSidebar';
import { SidebarTheme } from '@/app/sidebarTheme';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { FrameTemplateDto } from '@/services/frameTemplate.service';
import '@/styles/modules/sidebar-theme.css';

export type CanvaSidebarTab = 'pages' | 'script' | 'bible' | 'templates';

export interface ScriptLineItem {
  id: string;
  panelNumber?: number;
  pageNumber?: number;
  sceneId?: string;
  sceneNumber?: number;
  sceneTitle?: string;
  sceneSlugline?: string;
  characterName?: string;
  characterColor?: string;
  dialogueText?: string;
  stageDirection?: string;
  narrationMode?: string;
  panelId?: string;
  lineOrder?: number;
}

export interface BibleEntityItem {
  id: string;
  code?: string;
  name: string;
  subtitle?: string;
  category: 'character' | 'location' | 'lore';
  tag: string;
  description: string;
  visualNotes: string[];
  color?: string;
  imageUrl?: string;
  gallery?: Array<{ url: string; label?: string }>;
  status?: string;
}

export interface SidebarChapterOption {
  id: string;
  chapterNumber: number;
  title?: string | null;
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
  chapterTitle?: string;
  chapters?: SidebarChapterOption[];
  selectedChapterId?: string | null;
  onSelectChapter?: (chapterId: string) => void;
  isLoadingScript?: boolean;
  // Bible props
  bibleEntities?: BibleEntityItem[];
  seriesTitle?: string;
  isLoadingBible?: boolean;
  // Panel Template props (Áp dụng tức thì vào trang hiện tại)
  templates?: FrameTemplateDto[];
  activeTemplateId?: string | null;
  onSelectTemplate?: (template: FrameTemplateDto) => void;
  onClearTemplate?: () => void;
  hasPagePanels?: boolean;
  isLoadingTemplates?: boolean;
  isApplyingTemplate?: boolean;
  templateError?: string | null;
  // Layout Lock / Confirm props
  isLayoutLocked?: boolean;
  onLockLayout?: () => void;
  onUnlockLayout?: () => void;
  hasPageArtwork?: boolean;
  // Controlled tab & drawer props
  activeTab?: CanvaSidebarTab;
  onTabChange?: (tab: CanvaSidebarTab) => void;
  isDrawerOpen?: boolean;
  onToggleDrawer?: (open?: boolean) => void;
  // Global Theme integration
  theme?: SidebarTheme;
  // Tùy chọn ẩn tab Trang khi quản lý trang đã chuyển xuống đáy
  hidePagesTab?: boolean;
}

function formatNarrationMode(mode?: string): string | null {
  if (!mode || mode === 'Present') return null;
  const lower = mode.toLowerCase();
  if (lower.includes('flashback')) return 'Hồi tưởng';
  if (lower.includes('inner') || lower.includes('monologue') || lower.includes('thought')) {
    return 'Độc thoại nội tâm';
  }
  if (lower.includes('voice') || lower.includes('narrat')) return 'Lời dẫn';
  return null;
}

const DEFAULT_SCRIPT_LINES: ScriptLineItem[] = [
  {
    id: 'line-1',
    pageNumber: 1,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Góc toàn cảnh: Thung lũng hoang tàn sau cơn bão cát. Khói bốc lên từ tháp quan sát cổng thành phía Nam.',
  },
  {
    id: 'line-2',
    pageNumber: 1,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Cuối cùng chúng ta cũng vượt qua thung lũng bóng đêm. Nhưng cổng thành... đã bị phong toả hoàn toàn.',
  },
  {
    id: 'line-3',
    pageNumber: 1,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Cận cảnh: Thanh kiếm của Minh Triết cắm sâu xuống lớp cát lún, ánh thép phản chiếu vệt nắng đầu tiên của bình minh.',
  },
  {
    id: 'line-4',
    pageNumber: 1,
    panelNumber: 3,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Nhìn lên tường thành kia kìa! Dấu ấn của gia tộc Hắc Long vừa mới được khắc lên đó.',
  },
  {
    id: 'line-5',
    pageNumber: 1,
    panelNumber: 4,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Góc hất từ dưới lên: Cửa sắt nặng nề bắt đầu rung chuyển với âm thanh rít chói tai.',
  },
  {
    id: 'line-6',
    pageNumber: 2,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · ĐÔ THÀNH THƯỢNG CẢNH · SƯƠNG SỚM',
    stageDirection:
      'Đại cảnh thành phố cổ kính chìm trong màn sương mờ ảo. Những ngọn tháp cao vút chọc thủng tầng mây.',
  },
  {
    id: 'line-7',
    pageNumber: 2,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · ĐÔ THÀNH THƯỢNG CẢNH · SƯƠNG SỚM',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Mau tìm chỗ ẩn nấp trước khi đội tuần tra phát hiện!',
  },
  {
    id: 'line-8',
    pageNumber: 3,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · HẺM ĐÁ CỔ · SÁNG',
    stageDirection:
      'Góc trung cảnh: Hai người áp sát bức tường rêu, tiếng bước chân tuần tra nặng nề vang vọng phía đầu hẻm.',
  },
  {
    id: 'line-9',
    pageNumber: 3,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · HẺM ĐÁ CỔ · SÁNG',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Đội hình bọn chúng có 5 người. Để tôi dùng phong thuật đánh lạc hướng phía bên kia.',
  },
  {
    id: 'line-10',
    pageNumber: 4,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    stageDirection:
      'Ánh sáng hắt từ khe cửa đá rọi vào bàn thờ cổ phủ đầy bụi thời gian.',
  },
  {
    id: 'line-11',
    pageNumber: 4,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Cuộn gia phả Viễn Cổ vẫn còn nguyên vẹn ở đây!',
  },
  {
    id: 'line-12',
    pageNumber: 5,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    stageDirection:
      'Đặc tả cận cảnh: Dấu ấn Hắc Long bất ngờ phát sáng đỏ rực trên nền đá khi Minh Triết chạm tay vào cuộn thư.',
  },
  {
    id: 'line-13',
    pageNumber: 5,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Cẩn thận! Cả căn mật thất đang tự động kích hoạt cơ quan phong ấn!',
  },
  {
    id: 'line-14',
    pageNumber: 6,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 4: Thoát Khỏi Vòng Vây',
    sceneSlugline: 'NGOẠI · THÁP CHUÔNG PHÍA TÂY · CHIỀU TÀ',
    stageDirection:
      'Góc hành động: Minh Triết vung kiếm chém đứt dây xích cửa sập, ánh hoàng hôn rực rỡ tràn vào khung hình.',
  },
  {
    id: 'line-15',
    pageNumber: 6,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 4: Thoát Khỏi Vòng Vây',
    sceneSlugline: 'NGOẠI · THÁP CHUÔNG PHÍA TÂY · CHIỀU TÀ',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Chúng ta phải rời khỏi Thượng Cảnh trước khi màn đêm buông xuống!',
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
    tag: 'Địa danh chính',
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
    tag: 'Quy tắc cốt truyện',
    color: '#EF4444',
    description:
      'Ký hiệu nguyền rủa của hoàng tộc thoái vị. Khi xuất hiện ở đâu, nơi đó sẽ chịu phong ấn vĩnh viễn.',
    visualNotes: [
      'Hình tròn đồng tâm lồng 3 vuốt rồng nhọn hướng vào tâm',
      'Luôn phát ra khói đen mờ ảo khi tiếp xúc ánh sáng mặt trời',
    ],
  },
];

export const DEFAULT_FRAME_TEMPLATES: FrameTemplateDto[] = [
  // ── NHÓM 1: TỰ SỰ TIÊU CHUẨN (STANDARD & NARRATIVE) ─────────────────────────
  {
    id: 'f0000000-0000-0000-0000-00000000000c',
    name: '4-Koma Classic (Ki-shō-ten-ketsu)',
    code: 'TPL-MANGA-01',
    category: 'narrative',
    description: '4 khung truyện thẳng hàng (Khởi - Thừa - Chuyển - Hợp) chuẩn hài hước & đời thường',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.18, y: 0.025, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.2655, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.506, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.7465, w: 0.64, h: 0.2285, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000008',
    name: '3-Tier Balanced (5 Khung RTL)',
    code: 'TPL-MANGA-02',
    category: 'narrative',
    description: 'Bố cục 3 tầng cổ điển: Tier 1 mở cảnh, Tier 2 trọng tâm kịch tính, Tier 3 chuyển tiếp trang',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 5,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.31, w: 0.95, h: 0.38, borderless: false },
      { x: 0.506, y: 0.705, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.705, w: 0.469, h: 0.27, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000006',
    name: '3-Tier Dense (6 Khung Lưới 3×2)',
    code: 'TPL-MANGA-03',
    category: 'narrative',
    description: 'Lưới 3 hàng × 2 cột cho các phân cảnh nhiều đối thoại, điều tra, tranh luận gay cấn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 6,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.296, borderless: false },
      { x: 0.506, y: 0.336, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.336, w: 0.469, h: 0.296, borderless: false },
      { x: 0.506, y: 0.647, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.647, w: 0.469, h: 0.296, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000e',
    name: 'Classic 9-Panel Grid (Watchmen Style)',
    code: 'TPL-COMIC-01',
    category: 'narrative',
    description: 'Lưới 3×3 phong cách Watchmen/DC Classic: nhịp kể đều đặn, phân tích tâm lý sâu sắc',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 9,
    slots: [
      { x: 0.025, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.025, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.025, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    name: '2 Tầng Ngang Cơ Bản',
    category: 'narrative',
    description: 'Chia đôi trang theo chiều ngang, cân bằng nhịp kể',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.5075, w: 0.95, h: 0.4675, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'builtin-2-panel-split',
    name: '2 Khung Song Song (Đối thoại)',
    category: 'narrative',
    description: 'Chia đôi trang theo chiều dọc cho cảnh đối thoại hai nhân vật',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.95, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.95, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    name: '3 Tầng Ngang Cơ Bản',
    category: 'narrative',
    description: '3 dải ngang bằng nhau cho phân cảnh diễn biến theo trình tự thời gian',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.33, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.635, w: 0.95, h: 0.34, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000005',
    name: '4 Khung (Lưới 2×2)',
    category: 'narrative',
    description: '4 ô vuông cân xứng cho nhịp kể phân đoạn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.506, y: 0.5075, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.5075, w: 0.469, h: 0.4675, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 2: HÀNH ĐỘNG & KỊCH TÍNH (ACTION & HIGH-TENSION) ────────────────────
  {
    id: 'f0000000-0000-0000-0000-00000000000a',
    name: 'Dynamic Shonen Slanted (4 Khung Cắt Chéo)',
    code: 'TPL-MANGA-04',
    category: 'action',
    description: 'Rãnh cắt chéo góc 15°-25° tạo xung lực gia tốc cực mạnh cho phân cảnh combat, ra đòn chớp nhoáng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.28, corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.75 }, { x: 0, y: 1 }], borderless: false },
      { x: 0.44, y: 0.26, w: 0.535, h: 0.38, corners: [{ x: 0, y: 0.22 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0.85 }], borderless: false },
      { x: 0.025, y: 0.32, w: 0.40, h: 0.38, corners: [{ x: 0, y: 0 }, { x: 1, y: 0.15 }, { x: 1, y: 1 }, { x: 0, y: 0.85 }], borderless: false },
      { x: 0.025, y: 0.685, w: 0.95, h: 0.29, corners: [{ x: 0, y: 0.15 }, { x: 1, y: 0.05 }, { x: 1, y: 1 }, { x: 0, y: 1 }], borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000010',
    name: 'Inset Panels (Khung Lồng Khung)',
    code: 'TPL-MANGA-06',
    category: 'action',
    description: '1 khung toàn cảnh chiến trường làm nền lồng 2 khung cận cảnh biểu cảm và chi tiết vũ khí',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.95, borderless: false },
      { x: 0.55, y: 0.08, w: 0.39, h: 0.26, borderless: false },
      { x: 0.06, y: 0.62, w: 0.39, h: 0.26, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'builtin-5-action-dynamic',
    name: 'Shonen Dynamic (5 Khung Cao Trào)',
    category: 'action',
    description: '1 khung mở lớn đầu trang kết hợp 4 khung đối đầu dồn dập',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 5,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.44, borderless: false },
      { x: 0.506, y: 0.48, w: 0.469, h: 0.22, borderless: false },
      { x: 0.025, y: 0.48, w: 0.469, h: 0.22, borderless: false },
      { x: 0.506, y: 0.715, w: 0.469, h: 0.26, borderless: false },
      { x: 0.025, y: 0.715, w: 0.469, h: 0.26, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000009',
    name: 'Shonen Action Dense (6 Khung)',
    category: 'action',
    description: '1 mở đầu + 2 dồn dập + 1 cao trào lớn + 2 dư chấn phản ứng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 6,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.205, borderless: false },
      { x: 0.506, y: 0.245, w: 0.469, h: 0.205, borderless: false },
      { x: 0.025, y: 0.245, w: 0.469, h: 0.205, borderless: false },
      { x: 0.025, y: 0.465, w: 0.95, h: 0.265, borderless: false },
      { x: 0.506, y: 0.745, w: 0.469, h: 0.23, borderless: false },
      { x: 0.025, y: 0.745, w: 0.469, h: 0.23, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 3: ĐẠI CẢNH & ĐIỂM NHẤN (CINEMATIC & SPLASH) ─────────────────────────
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    name: 'Full Splash Bleed (1 Khung Tràn Lề)',
    category: 'cinematic',
    description: '1 panel tràn viền 100% đến hết vùng Bleed dành cho trang bìa hoặc đại cảnh kết liễu',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 1,
    slots: [{ x: 0, y: 0, w: 1, h: 1, borderless: true }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    name: 'Splash 1 Khung (Có Viền)',
    category: 'cinematic',
    description: '1 khung viền đơn toàn trang chuẩn lề in ấn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 1,
    slots: [{ x: 0.025, y: 0.025, w: 0.95, h: 0.95, borderless: false }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000d',
    name: 'Hero Splash 70/30 (Dominant Layout)',
    code: 'TPL-MANGA-05',
    category: 'cinematic',
    description: 'Khung chiếm 70% trang trên cho cảnh đại chiến bùng nổ, 3 khung hẹp 30% dưới cho phản hồi của đồng đội',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.67, borderless: false },
      { x: 0.665, y: 0.71, w: 0.31, h: 0.265, borderless: false },
      { x: 0.345, y: 0.71, w: 0.308, h: 0.265, borderless: false },
      { x: 0.025, y: 0.71, w: 0.308, h: 0.265, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000f',
    name: 'Cinematic Widescreen (3 Bars)',
    code: 'TPL-COMIC-02',
    category: 'cinematic',
    description: '3 thanh dài ngang tỉ lệ màn ảnh rộng cho cảnh thiên nhiên kéo dài hoặc du hành thời gian',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.33, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.635, w: 0.95, h: 0.34, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000007',
    name: '1 Lớn + 2 Nhỏ (Phản Ứng Đối Xứng)',
    category: 'cinematic',
    description: '1 khung chính phía trên kết hợp 2 khung cận cảnh phân tích bên dưới',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.52, borderless: false },
      { x: 0.506, y: 0.56, w: 0.469, h: 0.415, borderless: false },
      { x: 0.025, y: 0.56, w: 0.469, h: 0.415, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000b',
    name: 'Trang Đôi: 1 Khung Toàn Cảnh + 3 Khung',
    category: 'cinematic',
    description: 'Bố cục trang đôi (Spread): Đại cảnh trải dài 2 trang kết hợp 3 khung nhịp điệu',
    layoutFormat: 'SpreadDouble',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.60, borderless: false },
      { x: 0.025, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.345, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.665, y: 0.64, w: 0.31, h: 0.335, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 4: WEBTOON / MOBILE VERTICAL SCROLL ──────────────────────────────────
  {
    id: 'f0000000-0000-0000-0000-000000000011',
    name: 'Vertical Mobile Flow (3 Khung Cuộn)',
    code: 'TPL-WEBTOON-01',
    category: 'webtoon',
    description: 'Bố cục cuộn dọc tiêu chuẩn smartphone 9:16 với khoảng lặng ngừng nghỉ (negative space)',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.04, y: 0.04, w: 0.92, h: 0.27, borderless: false },
      { x: 0.04, y: 0.36, w: 0.92, h: 0.27, borderless: false },
      { x: 0.04, y: 0.68, w: 0.92, h: 0.28, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000012',
    name: 'Webtoon Split Comparison (Song Song)',
    code: 'TPL-WEBTOON-02',
    category: 'webtoon',
    description: '1 khung dẫn đề ở trên + 2 cột song song 50-50 để miêu tả 2 góc nhìn đối thoại đồng thời',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.04, y: 0.04, w: 0.92, h: 0.32, borderless: false },
      { x: 0.515, y: 0.40, w: 0.445, h: 0.55, borderless: false },
      { x: 0.04, y: 0.40, w: 0.445, h: 0.55, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000013',
    name: 'Webtoon Borderless Floating Flow',
    code: 'TPL-WEBTOON-03',
    category: 'webtoon',
    description: 'Khung tranh không viền chìm dần vào trang cuộn, tạo cảm xúc bay bổng hoặc hồi tưởng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0, y: 0, w: 1, h: 0.45, borderless: true },
      { x: 0.08, y: 0.52, w: 0.84, h: 0.42, borderless: true },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

/**
 * ArtistCanvaSidebar - Sidebar Canva Navigation chuyên biệt cho Artist Desk
 * - Đồng bộ hoàn toàn bảng màu & biến CSS với Sidebar toàn hệ thống (.pf-sidebar & data-sb-theme).
 * - Đóng vai trò là thanh Sidebar chính khi Artist vào màn hình làm việc bản vẽ.
 * - Thanh công cụ chính Canva Dock (72px): [Pages] - [Script] - [Series Bible] - [Khung] cùng nút thu gọn.
 * - Ngăn phụ trượt Canva Drawer (340px): Xem kịch bản, tra cứu bible, chọn mẫu khung tham khảo.
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
  chapterTitle,
  chapters,
  selectedChapterId,
  onSelectChapter,
  isLoadingScript = false,
  bibleEntities = DEFAULT_BIBLE_ENTITIES,
  seriesTitle = 'Huyết Thống Viễn Cổ',
  isLoadingBible = false,
  templates = DEFAULT_FRAME_TEMPLATES,
  activeTemplateId = null,
  onSelectTemplate,
  onClearTemplate,
  hasPagePanels = false,
  isLoadingTemplates = false,
  isApplyingTemplate = false,
  templateError = null,
  isLayoutLocked = false,
  onLockLayout,
  onUnlockLayout,
  hasPageArtwork = false,
  activeTab: activeTabProp,
  onTabChange,
  isDrawerOpen: isDrawerOpenProp,
  onToggleDrawer,
  theme,
  hidePagesTab = false,
}) => {
  // Đồng bộ theme hệ thống từ localStorage hoặc prop, mặc định theme màu sáng 'paper'
  const [currentTheme, setCurrentTheme] = useState<SidebarTheme>(() => {
    if (theme) return theme;
    try {
      const saved = localStorage.getItem('pf.sidebar.theme');
      return (saved as SidebarTheme) || 'paper';
    } catch {
      return 'paper';
    }
  });

  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [theme]);

  // Trạng thái tab Canva: 'pages' | 'script' | 'bible' (mặc định 'script' nếu tab Pages ẩn)
  const [internalActiveTab, setInternalActiveTab] = useState<CanvaSidebarTab>(
    hidePagesTab ? 'script' : 'pages'
  );
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;
  const setActiveTab = (tab: CanvaSidebarTab) => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  // Trạng thái mở/đóng ngăn phụ (Canva Drawer): Mặc định ĐÓNG (false) để chỉ hiển thị trang giấy trắng tinh
  const [internalDrawerOpen, setInternalDrawerOpen] = useState<boolean>(false);
  const isDrawerOpen = isDrawerOpenProp !== undefined ? isDrawerOpenProp : internalDrawerOpen;
  const setIsDrawerOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof open === 'function' ? open(isDrawerOpen) : open;
    setInternalDrawerOpen(nextVal);
    onToggleDrawer?.(nextVal);
  };

  // Phím tắt '[' để mở/đóng nhanh Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bộ lọc trang (Tab Pages)
  const [pageFilterStage, setPageFilterStage] = useState<PageStage | 'all'>('all');
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageViewMode, setPageViewMode] = useState<'thumbnail' | 'compact'>('thumbnail');

  // Bộ lọc Kịch bản (Tab Kịch bản: mặc định hiển thị xuyên suốt toàn bộ kịch bản, có thể chuyển sang trang đang chọn)
  const [scriptSearchQuery, setScriptSearchQuery] = useState('');
  const [scriptViewMode, setScriptViewMode] = useState<'all' | 'current-page'>('all');

  // Bộ lọc Bible
  const [bibleCategory, setBibleCategory] = useState<'all' | 'character' | 'location' | 'lore'>('all');
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');

  // Bộ lọc Mẫu khung tranh (Panel Templates)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCountFilter, setTemplateCountFilter] = useState<'all' | '1-2' | '3' | '4+'>('all');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'narrative' | 'action' | 'cinematic' | 'webtoon'>('all');

  // Xử lý khi nhấn nút Tab Canva Dock
  const handleTabClick = (tab: CanvaSidebarTab) => {
    if (activeTab === tab) {
      setIsDrawerOpen((prev) => !prev);
    } else {
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

  const selectedPageIndex = pages.findIndex((p) => p.id === selectedPageId);
  const selectedPage = pages[selectedPageIndex] || null;
  const activePageNumber = selectedPage?.pageNumber || 1;

  // Đồng bộ tiêu đề phân cảnh & slugline theo đúng trang đang chọn
  const activeSceneInfo = useMemo(() => {
    const linesForPage = scriptLines.filter(
      (l) => (l.pageNumber || 1) === activePageNumber
    );
    const lineWithScene = linesForPage.find((l) => l.sceneTitle || l.sceneSlugline);
    if (lineWithScene) {
      return {
        title: lineWithScene.sceneTitle || sceneTitle,
        slugline: lineWithScene.sceneSlugline || sceneSlugline,
      };
    }
    if (linesForPage.length > 0) {
      return {
        title: sceneTitle,
        slugline: sceneSlugline,
      };
    }
    return {
      title: `Trang ${activePageNumber}`,
      slugline: undefined,
    };
  }, [scriptLines, activePageNumber, sceneTitle, sceneSlugline]);

  // Tự động cuộn tới phân đoạn kịch bản của trang đang chọn khi đổi trang hoặc đổi chế độ xem
  useEffect(() => {
    if (activeTab === 'script' && isDrawerOpen) {
      const anchor = document.getElementById(`script-page-anchor-${activePageNumber}`);
      if (anchor && typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activePageNumber, activeTab, isDrawerOpen, scriptViewMode]);

  // Xử lý kịch bản: lọc & gom nhóm theo Trang -> Khung (panel), cộng các phân cảnh chưa gán trang để đọc xuyên suốt
  const { groupedScriptByPage, groupedUnpagedScenes } = useMemo(() => {
    let lines = scriptLines;

    // Tìm kiếm trong kịch bản
    if (scriptSearchQuery.trim()) {
      const q = scriptSearchQuery.toLowerCase().trim();
      lines = lines.filter(
        (l) =>
          (l.dialogueText && l.dialogueText.toLowerCase().includes(q)) ||
          (l.stageDirection && l.stageDirection.toLowerCase().includes(q)) ||
          (l.characterName && l.characterName.toLowerCase().includes(q)) ||
          (l.sceneTitle && l.sceneTitle.toLowerCase().includes(q)) ||
          (l.sceneSlugline && l.sceneSlugline.toLowerCase().includes(q))
      );
    }

    // Phân tách các dòng đã gắn với Trang và các dòng chưa gán trang
    const pagedLines = lines.filter((l) => typeof l.pageNumber === 'number' && l.pageNumber > 0);
    const unpagedLines = lines.filter((l) => typeof l.pageNumber !== 'number' || l.pageNumber <= 0);

    // Chế độ xem: Toàn bộ kịch bản xuyên suốt vs Chỉ xem trang đang vẽ
    const filteredPagedLines =
      scriptViewMode === 'current-page' && selectedPage
        ? pagedLines.filter((l) => l.pageNumber === selectedPage.pageNumber)
        : pagedLines;

    // Gom nhóm theo Trang -> Khung (panelNumber === 0 cho các dòng thuộc trang nhưng chưa gán panel)
    const pageMap = new Map<number, Map<number, ScriptLineItem[]>>();
    filteredPagedLines.forEach((l) => {
      const pNum = l.pageNumber!;
      const panelNum = typeof l.panelNumber === 'number' && l.panelNumber > 0 ? l.panelNumber : 0;
      if (!pageMap.has(pNum)) {
        pageMap.set(pNum, new Map<number, ScriptLineItem[]>());
      }
      const panelMap = pageMap.get(pNum)!;
      if (!panelMap.has(panelNum)) {
        panelMap.set(panelNum, []);
      }
      panelMap.get(panelNum)!.push(l);
    });

    const sortedPages = Array.from(pageMap.keys()).sort((a, b) => a - b);
    const byPage = sortedPages.map((pNum) => {
      const panelMap = pageMap.get(pNum)!;
      const sortedPanels = Array.from(panelMap.keys()).sort((a, b) => {
        if (a === 0) return 1;
        if (b === 0) return -1;
        return a - b;
      });
      return {
        pageNumber: pNum,
        panelsInPage: sortedPanels.map((panelNum) => ({
          panelNumber: panelNum,
          lines: panelMap.get(panelNum)!,
        })),
      };
    });

    // Gom nhóm các dòng chưa gắn trang theo Phân cảnh (chỉ hiển thị ở chế độ Toàn bộ kịch bản)
    const sceneMap = new Map<
      string,
      { sceneNumber?: number; sceneTitle?: string; sceneSlugline?: string; lines: ScriptLineItem[] }
    >();
    if (scriptViewMode === 'all') {
      unpagedLines.forEach((l) => {
        const key = l.sceneId || l.sceneTitle || 'unpaged-default';
        if (!sceneMap.has(key)) {
          sceneMap.set(key, {
            sceneNumber: l.sceneNumber,
            sceneTitle: l.sceneTitle,
            sceneSlugline: l.sceneSlugline,
            lines: [],
          });
        }
        sceneMap.get(key)!.lines.push(l);
      });
    }

    return {
      groupedScriptByPage: byPage,
      groupedUnpagedScenes: Array.from(sceneMap.entries()).map(([key, val]) => ({
        key,
        ...val,
      })),
    };
  }, [scriptLines, scriptSearchQuery, scriptViewMode, selectedPage]);

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

  // Lọc danh sách Mẫu Khung (Panel Templates)
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const q = templateSearchQuery.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        tpl.name.toLowerCase().includes(q) ||
        (tpl.code && tpl.code.toLowerCase().includes(q)) ||
        (tpl.description && tpl.description.toLowerCase().includes(q));

      const count = tpl.panelCount || tpl.slots?.length || 0;
      const matchCount =
        templateCountFilter === 'all'
          ? true
          : templateCountFilter === '1-2'
            ? count <= 2
            : templateCountFilter === '3'
              ? count === 3
              : count >= 4;

      const matchCategory =
        templateCategoryFilter === 'all' ||
        (tpl.category || 'narrative').toLowerCase() === templateCategoryFilter;

      return matchSearch && matchCount && matchCategory;
    });
  }, [templates, templateSearchQuery, templateCountFilter, templateCategoryFilter]);

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
          {/* Nút Tab 1: Pages (Trang) - Có thể ẩn nếu đã có quản lý trang ở đáy */}
          {!hidePagesTab && (
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
          )}

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
            <span className='text-[10px] tracking-tight'>Hồ sơ</span>
          </button>

          {/* Nút Tab 4: Mẫu Khung Tranh */}
          <button
            type='button'
            onClick={() => handleTabClick('templates')}
            data-testid='canva-tab-templates'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'templates' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
          >
            <LayoutTemplate
              className={`w-5 h-5 mb-1 ${
                activeTab === 'templates' && isDrawerOpen
                  ? 'text-[var(--sb-accent)]'
                  : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Mẫu khung</span>
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
          - Hiệu ứng trượt mở mượt mà (transition-all duration-300 ease-in-out)
          ========================================================================= */}
      <aside
        data-testid='canva-secondary-drawer'
        aria-hidden={!isDrawerOpen}
        className={`bg-[var(--sb-popover,var(--sb-bg))] text-[var(--sb-text)] border-r border-[var(--sb-border)] flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
          isDrawerOpen
            ? 'w-[330px] sm:w-[350px] opacity-100 shadow-xl'
            : 'w-0 opacity-0 pointer-events-none border-r-0'
        }`}
      >
          {/* -------------------------------------------------------------
              TAB 1: PAGES (QUẢN LÝ TRANG)
              ------------------------------------------------------------- */}
          {isDrawerOpen && activeTab === 'pages' && (
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
                    Khổ trang truyện tiêu chuẩn
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
                          <span>{page.format || 'Khổ tiêu chuẩn'}</span>
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
              TAB 2: SCRIPT (XEM KỊCH BẢN THAM KHẢO XUYÊN SUỐT)
              ------------------------------------------------------------- */}
          {activeTab === 'script' && (
            <div
              data-testid='canva-drawer-script'
              className='flex flex-col h-full overflow-hidden'
            >
              {/* Header Drawer Kịch bản */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0 space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-1.5 min-w-0'>
                    {chapters && chapters.length > 1 && onSelectChapter ? (
                      <select
                        value={selectedChapterId || ''}
                        onChange={(e) => onSelectChapter(e.target.value)}
                        data-testid='canva-script-chapter-select'
                        className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold focus:outline-none max-w-[190px] truncate cursor-pointer'
                      >
                        {chapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {`Chương ${ch.chapterNumber}${ch.title ? `: ${ch.title}` : ''}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold truncate max-w-[200px]'>
                        {chapterTitle || 'Kịch Bản Tham Chiếu'}
                      </span>
                    )}
                    {isLoadingScript && (
                      <span className='text-[10px] text-[var(--sb-muted)] animate-pulse shrink-0'>
                        Đang tải...
                      </span>
                    )}
                  </div>
                  <span className='text-[10px] font-medium text-[var(--sb-muted)] shrink-0'>
                    Trang {selectedPage?.pageNumber || 1}
                  </span>
                </div>

                <div>
                  <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight truncate'>
                    {activeSceneInfo.title}
                  </h2>
                  {activeSceneInfo.slugline && (
                    <p className='text-[10px] font-mono text-[var(--sb-muted)] uppercase truncate mt-0.5'>
                      {activeSceneInfo.slugline}
                    </p>
                  )}
                </div>

                {/* Thanh tìm kiếm kịch bản & Chế độ xem: Toàn bộ kịch bản xuyên suốt vs Trang đang chọn */}
                <div className='space-y-1.5 pt-1'>
                  <div className='relative'>
                    <Search className='w-3.5 h-3.5 text-[var(--sb-muted)] absolute left-2.5 top-2.5' />
                    <input
                      type='text'
                      value={scriptSearchQuery}
                      onChange={(e) => setScriptSearchQuery(e.target.value)}
                      placeholder='Tìm thoại, chỉ dẫn hình ảnh...'
                      data-testid='canva-input-search-script'
                      className='w-full h-8 bg-[var(--sb-hover)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-[11px] text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
                    />
                  </div>

                  <div className='flex items-center gap-1 text-[10px]'>
                    <button
                      type='button'
                      onClick={() => setScriptViewMode('all')}
                      data-testid='canva-script-mode-all'
                      className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                        scriptViewMode === 'all'
                          ? 'bg-[var(--sb-accent)] text-white'
                          : 'bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      Toàn bộ kịch bản
                    </button>
                    <button
                      type='button'
                      onClick={() => setScriptViewMode('current-page')}
                      data-testid='canva-script-mode-current-page'
                      className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                        scriptViewMode === 'current-page'
                          ? 'bg-[var(--sb-accent)] text-white'
                          : 'bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      Trang {activePageNumber}
                    </button>
                  </div>
                </div>
              </div>

              {/* Thân văn bản kịch bản liền mạch xuyên suốt theo trang & panel (không chia thành từng ô hộp) */}
              <div
                data-testid='canva-script-manuscript-flow'
                className='flex-1 overflow-y-auto px-4 py-3 space-y-5 custom-scrollbar text-left font-sans select-text'
              >
                {groupedScriptByPage.length === 0 && groupedUnpagedScenes.length === 0 ? (
                  <div className='py-12 px-3 text-center space-y-2.5'>
                    <p className='text-[var(--sb-muted)] text-xs italic'>
                      {scriptLines.length === 0 && !isLoadingScript
                        ? 'Chương này chưa có nội dung kịch bản.'
                        : scriptViewMode === 'current-page' && !scriptSearchQuery.trim()
                          ? `Trang ${activePageNumber} chưa có nội dung kịch bản được gán.`
                          : 'Không tìm thấy nội dung kịch bản phù hợp.'}
                    </p>
                    {scriptViewMode === 'current-page' && !scriptSearchQuery.trim() && scriptLines.length > 0 && (
                      <button
                        type='button'
                        onClick={() => setScriptViewMode('all')}
                        className='inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--sb-surface)] border border-[var(--sb-border)] text-[var(--sb-accent)] hover:bg-[var(--sb-hover)] transition-colors cursor-pointer'
                      >
                        Xem toàn bộ kịch bản
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {groupedScriptByPage.map(({ pageNumber, panelsInPage }) => {
                      const isSelectedPage = pageNumber === activePageNumber;
                      const matchingPage = pages.find((p) => p.pageNumber === pageNumber);
                      let lastSceneKey = '';

                      return (
                        <div
                          key={`script-page-${pageNumber}`}
                          id={`script-page-anchor-${pageNumber}`}
                          className='space-y-3'
                        >
                          {/* Tiêu đề phân trang nhẹ nhàng (click để nhảy tới trang vẽ) */}
                          <button
                            type='button'
                            onClick={() => matchingPage && onSelectPage(matchingPage.id)}
                            disabled={!matchingPage}
                            className={`w-full flex items-center justify-between pb-1 border-b transition-colors text-left ${
                              matchingPage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            } ${
                              isSelectedPage
                                ? 'border-[var(--sb-accent)] text-[var(--sb-accent)]'
                                : 'border-[var(--sb-border)] text-[var(--sb-muted)]'
                            }`}
                          >
                            <div className='flex items-center gap-2'>
                              <span className='font-mono text-xs font-bold uppercase tracking-wider'>
                                ── TRANG {pageNumber} ──
                              </span>
                              {isSelectedPage && (
                                <span className='text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--sb-accent)] text-white font-medium'>
                                  Đang vẽ
                                </span>
                              )}
                            </div>
                            <span className='text-[10px] font-mono opacity-80'>
                              {panelsInPage.filter((p) => p.panelNumber > 0).length || panelsInPage.length} khung
                            </span>
                          </button>

                          {/* Danh sách các khung và lời thoại trong trang (chảy liền mạch, không chia ô hộp) */}
                          <div className='space-y-3'>
                            {panelsInPage.map(({ panelNumber, lines }) => {
                              const firstSceneTitle = lines[0]?.sceneTitle || '';
                              const firstSceneSlug = lines[0]?.sceneSlugline || '';
                              const sceneKey = `${firstSceneTitle}|${firstSceneSlug}`;
                              const showSceneHeader = Boolean(firstSceneTitle && sceneKey !== lastSceneKey);
                              if (firstSceneTitle) {
                                lastSceneKey = sceneKey;
                              }

                              return (
                                <div
                                  key={`script-panel-${pageNumber}-${panelNumber}`}
                                  data-testid={`script-panel-section-${pageNumber}-${panelNumber}`}
                                  className='space-y-1.5'
                                >
                                  {showSceneHeader && (
                                    <div className='pt-0.5 text-[10px] font-mono uppercase tracking-wider text-[var(--sb-muted)]'>
                                      {firstSceneTitle}
                                      {firstSceneSlug ? ` · ${firstSceneSlug}` : ''}
                                    </div>
                                  )}

                                  {/* Nhãn Khung gọn nhẹ không đóng khung hộp */}
                                  <div className='flex items-center gap-2 pt-0.5'>
                                    <span className='text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--sb-accent)]'>
                                      {panelNumber > 0 ? `Khung ${panelNumber}` : 'Chưa gán khung'}
                                    </span>
                                  </div>

                                  {/* Các dòng thoại & chỉ dẫn chảy liền mạch */}
                                  <div className='space-y-2 pl-2.5 border-l border-[var(--sb-border)]'>
                                    {lines.map((line) => (
                                      <div
                                        key={line.id}
                                        data-testid={`script-line-${line.id}`}
                                        className='space-y-1'
                                      >
                                        {/* Chỉ dẫn hành động / bối cảnh */}
                                        {line.stageDirection && (
                                          <p className='text-[11.5px] text-[var(--sb-muted)] italic leading-relaxed font-sans'>
                                            🎬 {line.stageDirection}
                                          </p>
                                        )}

                                        {/* Lời thoại nhân vật */}
                                        {line.dialogueText && (
                                          <div className='py-0.5'>
                                            {line.characterName && (
                                              <div className='flex items-center gap-1.5'>
                                                <span
                                                  className='text-[11px] font-bold tracking-wide uppercase'
                                                  style={{ color: line.characterColor || 'var(--sb-accent)' }}
                                                >
                                                  {line.characterName}
                                                </span>
                                                {formatNarrationMode(line.narrationMode) && (
                                                  <span className='text-[9px] text-[var(--sb-muted)]'>
                                                    ({formatNarrationMode(line.narrationMode)})
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                            <p className='text-xs text-[var(--sb-text)] font-serif leading-relaxed mt-0.5'>
                                              &ldquo;{line.dialogueText}&rdquo;
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Các phân cảnh chưa gắn vào trang/panel (hiển thị xuyên suốt liền mạch để tham khảo) */}
                    {groupedUnpagedScenes.length > 0 && (
                      <div className='space-y-4 pt-1' data-testid='script-unpaged-scenes'>
                        {groupedScriptByPage.length > 0 && (
                          <div className='text-[10px] font-mono uppercase tracking-wider text-[var(--sb-muted)] border-t border-dashed border-[var(--sb-border)] pt-3'>
                            Phân cảnh chưa gắn trang
                          </div>
                        )}
                        {groupedUnpagedScenes.map((scene) => (
                          <div key={`unpaged-scene-${scene.key}`} className='space-y-2'>
                            <div className='pb-1 border-b border-[var(--sb-border)]'>
                              <div className='font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--sb-accent)]'>
                                {scene.sceneTitle ||
                                  (scene.sceneNumber ? `Phân cảnh ${scene.sceneNumber}` : 'Phân cảnh')}
                              </div>
                              {scene.sceneSlugline && (
                                <div className='text-[10px] font-mono uppercase text-[var(--sb-muted)] mt-0.5'>
                                  {scene.sceneSlugline}
                                </div>
                              )}
                            </div>

                            <div className='space-y-2 pl-2.5 border-l border-[var(--sb-border)]'>
                              {scene.lines.map((line) => (
                                <div
                                  key={line.id}
                                  data-testid={`script-line-${line.id}`}
                                  className='space-y-1'
                                >
                                  {line.stageDirection && (
                                    <p className='text-[11.5px] text-[var(--sb-muted)] italic leading-relaxed font-sans'>
                                      🎬 {line.stageDirection}
                                    </p>
                                  )}
                                  {line.dialogueText && (
                                    <div className='py-0.5'>
                                      {line.characterName && (
                                        <div className='flex items-center gap-1.5'>
                                          <span
                                            className='text-[11px] font-bold tracking-wide uppercase'
                                            style={{ color: line.characterColor || 'var(--sb-accent)' }}
                                          >
                                            {line.characterName}
                                          </span>
                                          {formatNarrationMode(line.narrationMode) && (
                                            <span className='text-[9px] text-[var(--sb-muted)]'>
                                              ({formatNarrationMode(line.narrationMode)})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <p className='text-xs text-[var(--sb-text)] font-serif leading-relaxed mt-0.5'>
                                        &ldquo;{line.dialogueText}&rdquo;
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
              {/* Header Drawer Hồ sơ */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0'>
                <div className='flex items-center justify-between mb-1'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[10px] uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                      Hồ sơ truyện
                    </span>
                    {isLoadingBible && (
                      <span className='text-[10px] text-[var(--sb-muted)] animate-pulse'>Đang tải...</span>
                    )}
                  </div>
                  <span className='text-[10px] text-[var(--sb-muted)] truncate max-w-[130px]'>{seriesTitle}</span>
                </div>
                <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight'>
                  Tra cứu nhân vật & bối cảnh
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
                {filteredBible.length === 0 ? (
                  <div className='py-12 px-3 text-center text-[var(--sb-muted)] text-xs italic'>
                    {bibleEntities.length === 0 && !isLoadingBible
                      ? 'Bộ truyện chưa có hồ sơ tham chiếu nào.'
                      : 'Không tìm thấy thông tin phù hợp.'}
                  </div>
                ) : (
                  filteredBible.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`bible-entity-${item.id}`}
                      className='p-3 rounded-xl bg-[var(--sb-surface)] border border-[var(--sb-border)] space-y-2 hover:border-[var(--sb-accent)]/50 transition-colors'
                    >
                      {/* Ảnh tham chiếu nếu có */}
                      {item.imageUrl && (
                        <div className='w-full h-28 rounded-lg overflow-hidden bg-black/5 border border-[var(--sb-border)] relative mb-2'>
                          <AuthenticatedImage
                            src={item.imageUrl}
                            alt={item.name}
                            className='w-full h-full object-cover object-top'
                            loading='lazy'
                          />
                        </div>
                      )}

                      <div className='flex items-center justify-between gap-1.5'>
                        <div className='flex items-center gap-1.5 min-w-0'>
                          {item.category === 'character' ? (
                            <User className='w-4 h-4 text-orange-400 shrink-0' />
                          ) : item.category === 'location' ? (
                            <MapPin className='w-4 h-4 text-purple-400 shrink-0' />
                          ) : (
                            <Sparkles className='w-4 h-4 text-emerald-400 shrink-0' />
                          )}
                          <span className='text-xs font-bold text-[var(--sb-text)] truncate'>
                            {item.name}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          {item.status === 'CanonLocked' && (
                            <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-semibold'>
                              Đã chốt
                            </span>
                          )}
                          <span className='text-[9px] px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-muted)] font-medium'>
                            {item.tag}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className='text-[11px] text-[var(--sb-muted)] leading-relaxed'>
                          {item.description}
                        </p>
                      )}

                      {item.visualNotes && item.visualNotes.length > 0 && (
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
                  ))
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 4: PANEL TEMPLATES (CHỌN MẪU KHUNG THAM KHẢO CHO TRANG HIỆN TẠI)
              ------------------------------------------------------------- */}
          {activeTab === 'templates' && (
            <div
              data-testid='canva-drawer-templates'
              className='flex flex-col h-full overflow-hidden'
            >
              {/* Header Drawer Templates */}
              <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0 space-y-1.5'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                      Mẫu Khung
                    </span>
                    {isLoadingTemplates && (
                      <span className='text-[10px] text-[var(--sb-muted)] animate-pulse'>
                        Đang nạp...
                      </span>
                    )}
                    {isApplyingTemplate && (
                      <span className='text-[10px] text-[var(--sb-accent)] animate-pulse font-medium'>
                        Đang áp dụng...
                      </span>
                    )}
                  </div>
                  <span className='text-[10px] font-semibold text-[var(--sb-accent)]'>
                    Trang {activePageNumber}
                  </span>
                </div>

                <div className='flex items-center justify-between gap-2'>
                  <div>
                    <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight'>
                      Mẫu Khung Tranh Tham Khảo
                    </h2>
                    <p className='text-[10.5px] text-[var(--sb-muted)] mt-0.5'>
                      Chọn mẫu để áp dụng trực tiếp vào Trang {activePageNumber}
                    </p>
                  </div>

                  {(hasPagePanels || activeTemplateId) && onClearTemplate && (
                    <button
                      type='button'
                      onClick={onClearTemplate}
                      data-testid='canva-btn-clear-template'
                      title='Xoá khung tham khảo trên trang này'
                      className='px-2 py-1 rounded-lg text-[10px] font-semibold border border-[var(--sb-border)] bg-[var(--sb-hover)] hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-300 text-[var(--sb-muted)] flex items-center gap-1 transition-colors cursor-pointer shrink-0'
                    >
                      <RotateCcw className='w-3 h-3' />
                      <span>Đặt lại</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Thanh tìm kiếm & lọc số lượng khung + nhóm mục đích kể chuyện */}
              <div className='p-3 border-b border-[var(--sb-border)] flex flex-col gap-2 shrink-0'>
                <div className='relative'>
                  <Search className='w-3.5 h-3.5 text-[var(--sb-muted)] absolute left-2.5 top-2.5' />
                  <input
                    type='text'
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder='Tìm mẫu khung (TPL-MANGA-01, Shonen, 4-Koma...)'
                    data-testid='canva-input-search-templates'
                    className='w-full h-8 bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-[11px] text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
                  />
                </div>

                {/* 1. Bộ lọc Nhóm Mục đích Kể chuyện (Koma-wari Storytelling Purpose) */}
                <div className='flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[9.5px]'>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'narrative', label: 'Tự sự' },
                    { id: 'action', label: 'Hành động' },
                    { id: 'cinematic', label: 'Đại cảnh' },
                    { id: 'webtoon', label: 'Cuộn dọc' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type='button'
                      onClick={() => setTemplateCategoryFilter(cat.id as any)}
                      className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        templateCategoryFilter === cat.id
                          ? 'bg-[var(--sb-accent)] text-white shadow-xs'
                          : 'bg-[var(--sb-surface)] text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 2. Bộ lọc số lượng khung */}
                <div className='flex items-center gap-1 text-[9.5px]'>
                  {[
                    { id: 'all', label: 'Mọi số ô' },
                    { id: '1-2', label: '1–2 ô' },
                    { id: '3', label: '3 ô' },
                    { id: '4+', label: '4+ ô' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type='button'
                      onClick={() => setTemplateCountFilter(f.id as any)}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                        templateCountFilter === f.id
                          ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                          : 'bg-[var(--sb-surface)] text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {templateError && (
                  <div className='px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-300/60 flex items-center gap-1.5 text-[10.5px] text-rose-600'>
                    <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                    <span className='truncate'>{templateError}</span>
                  </div>
                )}

                {/* Banner trạng thái Khóa / Chốt Bố Cục */}
                {isLayoutLocked ? (
                  <div
                    data-testid='canva-layout-locked-banner'
                    className='p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-800/60 space-y-2'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400'>
                        <Lock className='w-3.5 h-3.5 shrink-0' />
                        <span>Bố cục trang đã lưu</span>
                      </div>
                      <span className='px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'>
                        ĐÃ LƯU
                      </span>
                    </div>
                    <p className='text-[10px] text-[var(--sb-muted)] leading-relaxed'>
                      Khung đã lưu để bạn an tâm nạp tranh. Nhấn đổi mẫu nếu muốn thay đổi bố cục khác.
                    </p>
                    {onUnlockLayout && (
                      <button
                        type='button'
                        onClick={onUnlockLayout}
                        data-testid='canva-btn-unlock-template'
                        className='w-full py-1.5 px-2.5 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-surface)] hover:bg-[var(--sb-surface-hover)] text-[10.5px] font-semibold text-[var(--sb-text)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                      >
                        <RotateCcw className='w-3 h-3 text-amber-500' />
                        <span>Đổi mẫu khung</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    data-testid='canva-layout-draft-banner'
                    className='p-2.5 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-800/60 space-y-2'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-400'>
                        <Unlock className='w-3.5 h-3.5 shrink-0' />
                        <span>Chế độ chọn bố cục nháp</span>
                      </div>
                      {hasPagePanels && onLockLayout && (
                        <button
                          type='button'
                          onClick={onLockLayout}
                          data-testid='canva-btn-confirm-template'
                          className='px-2.5 py-1 rounded-lg bg-[var(--sb-accent)] hover:opacity-90 text-white text-[10.5px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all'
                        >
                          <CheckCircle2 className='w-3 h-3' />
                          <span>Lưu mẫu</span>
                        </button>
                      )}
                    </div>
                    <p className='text-[10px] text-[var(--sb-muted)] leading-relaxed'>
                      Chọn mẫu ưng ý rồi bấm <strong className='text-[var(--sb-text)]'>Lưu bố cục</strong> ở dưới khung tranh để mở tính năng nạp tranh.
                    </p>
                  </div>
                )}
              </div>

              {/* Lưới thẻ mẫu khung */}
              <div className='flex-1 overflow-y-auto p-3 custom-scrollbar'>
                {filteredTemplates.length === 0 ? (
                  <div className='py-12 px-3 text-center text-[var(--sb-muted)] text-xs italic'>
                    Không tìm thấy mẫu khung phù hợp.
                  </div>
                ) : (
                  <div className='grid grid-cols-2 gap-2.5'>
                    {filteredTemplates.map((tpl) => {
                      const isSelected = tpl.id === activeTemplateId;
                      const catBadge =
                        tpl.category === 'action'
                          ? { label: 'Hành động', cls: 'bg-red-500/15 text-red-600 border-red-500/30' }
                          : tpl.category === 'cinematic'
                            ? { label: 'Đại cảnh', cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30' }
                            : tpl.category === 'webtoon'
                              ? { label: 'Cuộn dọc', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' }
                              : { label: 'Tự sự', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' };

                      return (
                        <button
                          key={tpl.id}
                          type='button'
                          disabled={isApplyingTemplate}
                          onClick={() => {
                            if (isLayoutLocked && hasPageArtwork && !isSelected) {
                              onUnlockLayout?.();
                            } else {
                              onSelectTemplate?.(tpl);
                            }
                          }}
                          data-testid={`canva-template-card-${tpl.id}`}
                          title={tpl.description || tpl.name}
                          className={`group p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between disabled:opacity-60 relative ${
                            isSelected
                              ? 'bg-[var(--sb-active-bg)] border-[var(--sb-accent)] ring-1 ring-[var(--sb-accent)]/60 shadow-sm'
                              : isLayoutLocked
                                ? 'bg-[var(--sb-surface)] border-[var(--sb-border)] opacity-70 hover:opacity-100 hover:border-amber-400'
                                : 'bg-[var(--sb-surface)] border-[var(--sb-border)] hover:border-[var(--sb-accent)]/50 hover:bg-[var(--sb-surface-hover)]'
                          }`}
                        >
                          {/* Header của thẻ: Code badge & Category */}
                          <div className='w-full flex items-center justify-between gap-1 mb-1.5'>
                            {tpl.code ? (
                              <span className='font-mono font-bold text-[8.5px] px-1 py-0.2 rounded bg-stone-200/80 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'>
                                {tpl.code}
                              </span>
                            ) : (
                              <span className='text-[8.5px] text-[var(--sb-muted)]'>
                                {tpl.isBuiltIn ? 'Mặc định' : 'Tuỳ chỉnh'}
                              </span>
                            )}
                            <span className={`text-[8px] font-semibold px-1 py-0.2 rounded border ${catBadge.cls}`}>
                              {catBadge.label}
                            </span>
                          </div>

                          {/* Wireframe Preview tỷ lệ B5 / Spread */}
                          <div className='w-full h-28 bg-stone-100/70 rounded-lg border border-[var(--sb-border)] flex items-center justify-center p-1.5 mb-2 relative overflow-hidden'>
                            <div
                              className={`${
                                tpl.layoutFormat === 'SpreadDouble'
                                  ? 'aspect-[3/2] w-full max-h-full'
                                  : 'aspect-[2/3] h-full'
                              } bg-white border border-stone-300 rounded-xs relative overflow-hidden shadow-2xs`}
                            >
                              {tpl.slots.map((s, idx) => {
                                const isInsetChild = tpl.code === 'TPL-MANGA-06' && idx > 0;
                                const hasCorners = Boolean(s.corners && s.corners.length >= 3);
                                return (
                                  <div
                                    key={idx}
                                    className={`absolute flex items-center justify-center font-mono text-[8px] font-bold transition-colors ${
                                      hasCorners
                                        ? ''
                                        : s.borderless
                                          ? 'border border-dashed border-orange-400'
                                          : isSelected
                                            ? 'border border-[var(--sb-accent)]'
                                            : 'border border-stone-700'
                                    } ${
                                      isInsetChild
                                        ? 'bg-white shadow-xs z-10 text-stone-800 border border-stone-800'
                                        : isSelected
                                          ? 'bg-[var(--sb-accent)]/15 text-[var(--sb-accent)]'
                                          : 'bg-stone-100/90 text-stone-600'
                                    }`}
                                    style={{
                                      left: `${s.x * 100}%`,
                                      top: `${s.y * 100}%`,
                                      width: `${s.w * 100}%`,
                                      height: `${s.h * 100}%`,
                                      clipPath: hasCorners
                                        ? `polygon(${s.corners!.map((c) => `${c.x * 100}% ${c.y * 100}%`).join(', ')})`
                                        : undefined,
                                    }}
                                  >
                                    {hasCorners && (
                                      <svg
                                        className='absolute inset-0 w-full h-full pointer-events-none'
                                        viewBox='0 0 100 100'
                                        preserveAspectRatio='none'
                                      >
                                        <polygon
                                          points={s.corners!.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')}
                                          fill={isSelected ? 'currentColor' : '#f5f5f4'}
                                          fillOpacity={isSelected ? 0.15 : 0.9}
                                          stroke={isSelected ? 'var(--sb-accent)' : '#44403c'}
                                          strokeWidth='3'
                                          vectorEffect='non-scaling-stroke'
                                        />
                                      </svg>
                                    )}
                                    <span className='relative z-10'>{idx + 1}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {isSelected && (
                              <div className='absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--sb-accent)] text-white flex items-center justify-center shadow-xs'>
                                <CheckCircle2 className='w-3 h-3' />
                              </div>
                            )}
                          </div>

                          {/* Tên & số khung */}
                          <div className='w-full space-y-0.5'>
                            <div
                              className={`text-[11px] leading-tight truncate ${
                                isSelected
                                  ? 'font-bold text-[var(--sb-accent)]'
                                  : 'font-semibold text-[var(--sb-text)]'
                              }`}
                              title={tpl.name}
                            >
                              {tpl.name}
                            </div>
                            <div className='flex items-center justify-between text-[9.5px]'>
                              <span className='text-[var(--sb-muted)] truncate max-w-[100px]' title={tpl.description}>
                                {tpl.description ? tpl.description.slice(0, 22) + '...' : (tpl.isBuiltIn ? 'Chuẩn xuất bản' : 'Tuỳ chỉnh')}
                              </span>
                              <span
                                className={`font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                  isSelected
                                    ? 'bg-[var(--sb-accent)] text-white'
                                    : 'bg-[var(--sb-surface-hover)] text-[var(--sb-muted)]'
                                }`}
                              >
                                {tpl.panelCount || tpl.slots.length} ô
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
    </div>
  );
};

export default ArtistCanvaSidebar;
