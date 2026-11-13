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
  AlertCircle,
  History as HistoryIcon,
  Clock,
  Check,
  ArrowUpRight,
  Loader2,
  Type,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import { ArtistPageItem, PageStage } from './ArtistPageSidebar';
import { SidebarTheme } from '@/app/sidebarTheme';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { FrameTemplateDto } from '@/services/frameTemplate.service';
import { ChangeRequestDto } from '@/types/pipeline';
import { hasChangeRequestLocation } from '../../utils/changeRequestLocation';
import { PageHistoryDto } from '@/services/page.service';
import { ElementSnapshotDto } from '@/services/element.service';
import '@/styles/modules/sidebar-theme.css';

export type CanvaSidebarTab =
  'pages' | 'script' | 'bible' | 'templates' | 'changes' | 'history' | 'lettering';

export interface ScriptLineItem {
  id: string;
  panelNumber?: number;
  pageNumber?: number;
  sceneId?: string;
  sceneNumber?: number;
  sceneTitle?: string;
  sceneSlugline?: string;
  speakerCharacterId?: string | null;
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
  // Khóa chọn mẫu khi trang đang chứa bản phác thảo toàn trang (tránh đè chồng khung)
  hasSketchUnderlay?: boolean;
  // Controlled tab & drawer props
  activeTab?: CanvaSidebarTab;
  onTabChange?: (tab: CanvaSidebarTab) => void;
  isDrawerOpen?: boolean;
  onToggleDrawer?: (open?: boolean) => void;
  // Global Theme integration
  theme?: SidebarTheme;
  // Tùy chọn ẩn tab Trang khi quản lý trang đã chuyển xuống đáy
  hidePagesTab?: boolean;
  // Change Requests (Yêu cầu chỉnh sửa công đoạn)
  changeRequests?: ChangeRequestDto[];
  isLoadingChangeRequests?: boolean;
  onResolveChangeRequest?: (id: string, note?: string) => Promise<void> | void;
  isResolvingChangeRequest?: boolean;
  onNavigateToChangeRequestTarget?: (cr: ChangeRequestDto) => void;
  // Page History & Restore
  pageHistory?: PageHistoryDto | null;
  isLoadingPageHistory?: boolean;
  onRestoreVersion?: (version: number) => Promise<void> | void;
  isRestoringVersion?: boolean;
  onRefreshHistory?: () => void;
  // Lettering Sidetab Props (P0 Lõi MVP)
  letteringElements?: ElementSnapshotDto[];
  onAddLetteringElement?: (
    type: 'SPEECH_BALLOON' | 'THOUGHT_BALLOON' | 'NARRATION_BOX',
    scriptLine?: ScriptLineItem,
  ) => void;
  onDeleteLetteringElement?: (id: string) => void;
  selectedElementId?: string | null;
  onSelectElementId?: (id: string | null) => void;
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
    dialogueText: 'Mau tìm chỗ ẩn nấp trước khi đội tuần tra phát hiện!',
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
    stageDirection: 'Ánh sáng hắt từ khe cửa đá rọi vào bàn thờ cổ phủ đầy bụi thời gian.',
  },
  {
    id: 'line-11',
    pageNumber: 4,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText: 'Cuộn gia phả Viễn Cổ vẫn còn nguyên vẹn ở đây!',
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
    dialogueText: 'Cẩn thận! Cả căn mật thất đang tự động kích hoạt cơ quan phong ấn!',
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
    dialogueText: 'Chúng ta phải rời khỏi Thượng Cảnh trước khi màn đêm buông xuống!',
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
    description: 'Bạn đồng hành thông minh, tinh thông phong thuật và bản đồ địa hình cổ đại.',
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
    description: 'Cửa ngõ phòng thủ kiên cố ngăn cách sa mạc Tử Thần với đô thành Thượng Cảnh.',
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
    name: '4 Khung 4-Koma Cổ Điển',
    code: 'TPL-MANGA-01',
    category: 'narrative',
    description:
      '4 khung truyện thẳng hàng (Khởi - Thừa - Chuyển - Hợp) chuẩn hài hước & đời thường',
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
    name: '3 Tầng Cân Bằng (5 Khung)',
    code: 'TPL-MANGA-02',
    category: 'narrative',
    description:
      'Bố cục 3 tầng cổ điển: Tier 1 mở cảnh, Tier 2 trọng tâm kịch tính, Tier 3 chuyển tiếp trang',
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
    name: 'Lưới 3 Tầng Dày (6 Khung)',
    code: 'TPL-MANGA-03',
    category: 'narrative',
    description:
      'Lưới 3 hàng × 2 cột cho các phân cảnh nhiều đối thoại, điều tra, tranh luận gay cấn',
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
    name: 'Lưới 9 Khung Cổ Điển',
    code: 'TPL-COMIC-01',
    category: 'narrative',
    description:
      'Lưới 3×3 phong cách Watchmen/DC Classic: nhịp kể đều đặn, phân tích tâm lý sâu sắc',
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
    name: '4 Khung Vát Chéo Shonen',
    code: 'TPL-MANGA-04',
    category: 'action',
    description:
      'Rãnh cắt chéo góc 15°-25° tạo xung lực gia tốc cực mạnh cho phân cảnh combat, ra đòn chớp nhoáng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      {
        x: 0.025,
        y: 0.025,
        w: 0.95,
        h: 0.28,
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 0.75 },
          { x: 0, y: 1 },
        ],
        borderless: false,
      },
      {
        x: 0.44,
        y: 0.26,
        w: 0.535,
        h: 0.38,
        corners: [
          { x: 0, y: 0.22 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 0.85 },
        ],
        borderless: false,
      },
      {
        x: 0.025,
        y: 0.32,
        w: 0.4,
        h: 0.38,
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0.15 },
          { x: 1, y: 1 },
          { x: 0, y: 0.85 },
        ],
        borderless: false,
      },
      {
        x: 0.025,
        y: 0.685,
        w: 0.95,
        h: 0.29,
        corners: [
          { x: 0, y: 0.15 },
          { x: 1, y: 0.05 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        borderless: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000010',
    name: 'Khung Lồng Khung (Inset)',
    code: 'TPL-MANGA-06',
    category: 'action',
    description:
      '1 khung toàn cảnh chiến trường làm nền lồng 2 khung cận cảnh biểu cảm và chi tiết vũ khí',
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
    name: '5 Khung Cao Trào Shonen',
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
    name: '6 Khung Hành Động Dày',
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
    name: 'Đại Cảnh Tràn Lề',
    category: 'cinematic',
    description:
      '1 panel tràn viền 100% đến hết vùng Bleed dành cho trang bìa hoặc đại cảnh kết liễu',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 1,
    slots: [{ x: 0, y: 0, w: 1, h: 1, borderless: true }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    name: 'Đại Cảnh 1 Khung',
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
    name: 'Đại Cảnh 70/30',
    code: 'TPL-MANGA-05',
    category: 'cinematic',
    description:
      'Khung chiếm 70% trang trên cho cảnh đại chiến bùng nổ, 3 khung hẹp 30% dưới cho phản hồi của đồng đội',
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
    name: '3 Khung Điện Ảnh Rộng',
    code: 'TPL-COMIC-02',
    category: 'cinematic',
    description:
      '3 thanh dài ngang tỉ lệ màn ảnh rộng widescreen cho cảnh thiên nhiên kéo dài hoặc du hành thời gian',
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
    name: '1 Khung Lớn + 2 Nhỏ',
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
    name: 'Trang Đôi: Toàn Cảnh + 3 Khung',
    category: 'cinematic',
    description: 'Bố cục trang đôi (Spread): Đại cảnh trải dài 2 trang kết hợp 3 khung nhịp điệu',
    layoutFormat: 'SpreadDouble',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.6, borderless: false },
      { x: 0.025, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.345, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.665, y: 0.64, w: 0.31, h: 0.335, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 4: WEBTOON / MOBILE VERTICAL SCROLL ──────────────────────────────────
  {
    id: 'f0000000-0000-0000-0000-000000000011',
    name: 'Cuộn Dọc 3 Khung (Webtoon)',
    code: 'TPL-WEBTOON-01',
    category: 'webtoon',
    description:
      'Bố cục cuộn dọc tiêu chuẩn smartphone 9:16 với khoảng lặng ngừng nghỉ (negative space)',
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
    name: 'So Sánh Song Song (Webtoon)',
    code: 'TPL-WEBTOON-02',
    category: 'webtoon',
    description:
      '1 khung dẫn đề ở trên + 2 cột song song 50-50 để miêu tả 2 góc nhìn đối thoại đồng thời',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.04, y: 0.04, w: 0.92, h: 0.32, borderless: false },
      { x: 0.515, y: 0.4, w: 0.445, h: 0.55, borderless: false },
      { x: 0.04, y: 0.4, w: 0.445, h: 0.55, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000013',
    name: 'Khung Nổi Không Viền (Webtoon)',
    code: 'TPL-WEBTOON-03',
    category: 'webtoon',
    description:
      'Khung tranh không viền chìm dần vào trang cuộn, tạo cảm xúc bay bổng hoặc hồi tưởng',
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
  hasSketchUnderlay = false,
  activeTab: activeTabProp,
  onTabChange,
  isDrawerOpen: isDrawerOpenProp,
  onToggleDrawer,
  theme,
  hidePagesTab = false,
  changeRequests = [],
  isLoadingChangeRequests = false,
  onResolveChangeRequest,
  isResolvingChangeRequest = false,
  onNavigateToChangeRequestTarget,
  pageHistory = null,
  isLoadingPageHistory = false,
  onRestoreVersion,
  isRestoringVersion = false,
  onRefreshHistory,
  letteringElements = [],
  onAddLetteringElement,
  onDeleteLetteringElement,
  selectedElementId = null,
  onSelectElementId,
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
    hidePagesTab ? 'script' : 'pages',
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
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
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
  const [bibleCategory, setBibleCategory] = useState<'all' | 'character' | 'location' | 'lore'>(
    'all',
  );
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');

  // Bộ lọc Mẫu khung tranh (Panel Templates)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCountFilter, setTemplateCountFilter] = useState<'all' | '1-2' | '3' | '4+'>('all');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<
    'all' | 'narrative' | 'action' | 'cinematic' | 'webtoon'
  >('all');

  // Trạng thái cho Yêu cầu chỉnh sửa (Tab Changes)
  const [changeFilterStatus, setChangeFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [resolveNoteByCrId, setResolveNoteByCrId] = useState<Record<string, string>>({});
  const [activeResolveInputId, setActiveResolveInputId] = useState<string | null>(null);

  // Trạng thái lọc câu thoại kịch bản trong Tab Lettering (mặc định chỉ hiển thị trang hiện tại)
  const [letteringFilterCurrentPage, setLetteringFilterCurrentPage] = useState(true);

  // Trạng thái cho Lịch sử phiên bản (Tab History)
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);

  // Đếm số lượng Change Requests cần sửa (Open)
  const openChangeRequestsCount = useMemo(() => {
    return changeRequests.filter((cr) => {
      const s = String(cr.status).toLowerCase();
      return s === 'open' || s === '0' || cr.status === 0;
    }).length;
  }, [changeRequests]);

  // Danh sách Change Requests sau khi lọc
  const filteredChangeRequests = useMemo(() => {
    return changeRequests.filter((cr) => {
      const s = String(cr.status).toLowerCase();
      const isOpen = s === 'open' || s === '0' || cr.status === 0;
      if (changeFilterStatus === 'open') return isOpen;
      if (changeFilterStatus === 'resolved') return !isOpen;
      return true;
    });
  }, [changeRequests, changeFilterStatus]);

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

  // Danh sách câu thoại hiển thị trong Tab Lettering (theo trang hiện tại hoặc toàn bộ)
  const displayedLetteringScriptLines = useMemo(() => {
    if (!letteringFilterCurrentPage) return scriptLines;
    const pageLines = scriptLines.filter((l) => (l.pageNumber ?? 1) === activePageNumber);
    return pageLines.length > 0 ? pageLines : scriptLines;
  }, [scriptLines, letteringFilterCurrentPage, activePageNumber]);

  // Đồng bộ tiêu đề phân cảnh & slugline theo đúng trang đang chọn
  const activeSceneInfo = useMemo(() => {
    const linesForPage = scriptLines.filter((l) => (l.pageNumber || 1) === activePageNumber);
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
          (l.sceneSlugline && l.sceneSlugline.toLowerCase().includes(q)),
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
                  activeTab === 'pages' && isDrawerOpen ? 'text-[var(--sb-accent)]' : 'text-current'
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
                activeTab === 'script' && isDrawerOpen ? 'text-[var(--sb-accent)]' : 'text-current'
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
                activeTab === 'bible' && isDrawerOpen ? 'text-[var(--sb-accent)]' : 'text-current'
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

          {/* Nút Tab: Chèn thoại & Bóng thoại (Lettering Sidetab P0) */}
          <button
            type='button'
            onClick={() => handleTabClick('lettering')}
            data-testid='canva-tab-lettering'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'lettering' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
            title='Chèn thoại & Bóng thoại'
          >
            <Type
              className={`w-5 h-5 mb-1 ${
                activeTab === 'lettering' && isDrawerOpen
                  ? 'text-[var(--sb-accent)]'
                  : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Thoại</span>
          </button>

          {/* Nút Tab 5: Yêu cầu chỉnh sửa (Sidetab Change Requests) */}
          <button
            type='button'
            onClick={() => handleTabClick('changes')}
            data-testid='canva-tab-changes'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              activeTab === 'changes' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
            title='Yêu cầu chỉnh sửa bản thảo'
          >
            <div className='relative'>
              <AlertCircle
                className={`w-5 h-5 mb-1 ${
                  activeTab === 'changes' && isDrawerOpen
                    ? 'text-[var(--sb-accent)]'
                    : openChangeRequestsCount > 0
                      ? 'text-rose-500'
                      : 'text-current'
                }`}
              />
              {openChangeRequestsCount > 0 && (
                <span
                  data-testid='changes-badge-counter'
                  className='absolute -top-1 -right-2 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75'
                >
                  {openChangeRequestsCount > 9 ? '9+' : openChangeRequestsCount}
                </span>
              )}
            </div>
            <span className='text-[10px] tracking-tight'>Sửa đổi</span>
          </button>

          {/* Nút Tab 6: Lịch sử phiên bản trang (Page History Drawer) */}
          <button
            type='button'
            onClick={() => handleTabClick('history')}
            data-testid='canva-tab-history'
            className={`w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'history' && isDrawerOpen
                ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] ring-1 ring-[var(--sb-accent)]/60 shadow-md font-semibold'
                : 'hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)] text-[var(--sb-muted)]'
            }`}
            title='Lịch sử phiên bản trang'
          >
            <HistoryIcon
              className={`w-5 h-5 mb-1 ${
                activeTab === 'history' && isDrawerOpen ? 'text-[var(--sb-accent)]' : 'text-current'
              }`}
            />
            <span className='text-[10px] tracking-tight'>Lịch sử</span>
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
          2. CANVA SECONDARY DRAWER (Ngăn nội dung chi tiết: History là drawer nhỏ 280-290px, các tab khác 330-350px)
          - Hiệu ứng trượt mở mượt mà (transition-all duration-300 ease-in-out)
          ========================================================================= */}
      <aside
        data-testid='canva-secondary-drawer'
        aria-hidden={!isDrawerOpen}
        className={`bg-[var(--sb-popover,var(--sb-bg))] text-[var(--sb-text)] border-r border-[var(--sb-border)] flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
          isDrawerOpen
            ? `${activeTab === 'history' ? 'w-[280px] sm:w-[290px]' : 'w-[330px] sm:w-[350px]'} opacity-100 shadow-xl`
            : 'w-0 opacity-0 pointer-events-none border-r-0'
        }`}
      >
        {/* -------------------------------------------------------------
              TAB 1: PAGES (QUẢN LÝ TRANG)
              ------------------------------------------------------------- */}
        {isDrawerOpen && activeTab === 'pages' && (
          <div data-testid='canva-drawer-pages' className='flex flex-col h-full overflow-hidden'>
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
                {(['all', 'pencil', 'ink', 'lettering', 'completed'] as const).map((stage) => {
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
                })}
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
          <div data-testid='canva-drawer-script' className='flex flex-col h-full overflow-hidden'>
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
                  {scriptViewMode === 'current-page' &&
                    !scriptSearchQuery.trim() &&
                    scriptLines.length > 0 && (
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
                            {panelsInPage.filter((p) => p.panelNumber > 0).length ||
                              panelsInPage.length}{' '}
                            khung
                          </span>
                        </button>

                        {/* Danh sách các khung và lời thoại trong trang (chảy liền mạch, không chia ô hộp) */}
                        <div className='space-y-3'>
                          {panelsInPage.map(({ panelNumber, lines }) => {
                            const firstSceneTitle = lines[0]?.sceneTitle || '';
                            const firstSceneSlug = lines[0]?.sceneSlugline || '';
                            const sceneKey = `${firstSceneTitle}|${firstSceneSlug}`;
                            const showSceneHeader = Boolean(
                              firstSceneTitle && sceneKey !== lastSceneKey,
                            );
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
                                                style={{
                                                  color: line.characterColor || 'var(--sb-accent)',
                                                }}
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
                                (scene.sceneNumber
                                  ? `Phân cảnh ${scene.sceneNumber}`
                                  : 'Phân cảnh')}
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
                                          style={{
                                            color: line.characterColor || 'var(--sb-accent)',
                                          }}
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
          <div data-testid='canva-drawer-bible' className='flex flex-col h-full overflow-hidden'>
            {/* Header Drawer Hồ sơ */}
            <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0'>
              <div className='flex items-center justify-between mb-1'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[10px] uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                    Hồ sơ truyện
                  </span>
                  {isLoadingBible && (
                    <span className='text-[10px] text-[var(--sb-muted)] animate-pulse'>
                      Đang tải...
                    </span>
                  )}
                </div>
                <span className='text-[10px] text-[var(--sb-muted)] truncate max-w-[130px]'>
                  {seriesTitle}
                </span>
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
                        ? {
                            label: 'Hành động',
                            cls: 'bg-red-500/15 text-red-600 border-red-500/30',
                          }
                        : tpl.category === 'cinematic'
                          ? {
                              label: 'Đại cảnh',
                              cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
                            }
                          : tpl.category === 'webtoon'
                            ? {
                                label: 'Cuộn dọc',
                                cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                              }
                            : {
                                label: 'Tự sự',
                                cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
                              };

                    return (
                      <button
                        key={tpl.id}
                        type='button'
                        disabled={isApplyingTemplate || hasSketchUnderlay}
                        onClick={() => {
                          if (hasSketchUnderlay) return;
                          if (isLayoutLocked && hasPageArtwork && !isSelected) {
                            onUnlockLayout?.();
                          } else {
                            onSelectTemplate?.(tpl);
                          }
                        }}
                        data-testid={`canva-template-card-${tpl.id}`}
                        title={
                          hasSketchUnderlay
                            ? 'Trang đang có ảnh phác thảo toàn trang. Vui lòng tách khung hoặc gỡ ảnh trước.'
                            : tpl.description || tpl.name
                        }
                        className={`group p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                          hasSketchUnderlay
                            ? 'opacity-40 cursor-not-allowed bg-stone-100/50 border-stone-200'
                            : isSelected
                              ? 'bg-[var(--sb-active-bg)] border-[var(--sb-accent)] ring-1 ring-[var(--sb-accent)]/60 shadow-sm cursor-pointer'
                              : isLayoutLocked
                                ? 'bg-[var(--sb-surface)] border-[var(--sb-border)] opacity-70 hover:opacity-100 hover:border-amber-400 cursor-pointer'
                                : 'bg-[var(--sb-surface)] border-[var(--sb-border)] hover:border-[var(--sb-accent)]/50 hover:bg-[var(--sb-surface-hover)] cursor-pointer'
                        }`}
                      >
                        {/* Wireframe Preview tỷ lệ B5 / Spread */}
                        <div className='w-full h-28 bg-stone-100/70 rounded-lg border border-[var(--sb-border)] flex items-center justify-center p-1.5 mb-1.5 relative overflow-hidden'>
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
                                        points={s
                                          .corners!.map((c) => `${c.x * 100},${c.y * 100}`)
                                          .join(' ')}
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

                        {/* Tên & Phân loại + số lượng khung */}
                        <div className='w-full space-y-1'>
                          <div
                            className={`text-[11.5px] leading-tight truncate ${
                              isSelected
                                ? 'font-bold text-[var(--sb-accent)]'
                                : 'font-semibold text-[var(--sb-text)]'
                            }`}
                            title={tpl.name}
                          >
                            {tpl.name}
                          </div>
                          <div className='flex items-center justify-between text-[9px]'>
                            <span
                              className={`text-[8.5px] font-semibold px-1.5 py-0.2 rounded border ${catBadge.cls}`}
                            >
                              {catBadge.label}
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
        {/* -------------------------------------------------------------
              TAB 5: CHANGES (YÊU CẦU CHỈNH SỬA)
              ------------------------------------------------------------- */}
        {isDrawerOpen && activeTab === 'changes' && (
          <div data-testid='canva-drawer-changes' className='flex flex-col h-full overflow-hidden'>
            {/* Header Drawer */}
            <div className='p-3.5 border-b border-[var(--sb-border)] shrink-0 space-y-2.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-rose-500' />
                  <h3 className='text-xs font-bold text-[var(--sb-text)] uppercase tracking-wider'>
                    Yêu cầu chỉnh sửa
                  </h3>
                </div>
                {openChangeRequestsCount > 0 && (
                  <span className='px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20'>
                    {openChangeRequestsCount} cần xử lý
                  </span>
                )}
              </div>

              <p className='text-[11px] text-[var(--sb-muted)] leading-relaxed'>
                Các ghi chú và phản hồi từ Đạo diễn & Biên tập viên yêu cầu chỉnh sửa bản vẽ.
              </p>

              {/* Filter Chips */}
              <div className='flex items-center gap-1.5 pt-1'>
                {(
                  [
                    { key: 'all', label: 'Tất cả' },
                    { key: 'open', label: `Cần sửa (${openChangeRequestsCount})` },
                    { key: 'resolved', label: 'Đã xong' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.key}
                    type='button'
                    onClick={() => setChangeFilterStatus(chip.key)}
                    data-testid={`btn-filter-cr-${chip.key}`}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      changeFilterStatus === chip.key
                        ? 'bg-[var(--sb-accent)] text-white shadow-2xs'
                        : 'bg-[var(--sb-surface)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:bg-[var(--sb-surface-hover)] border border-[var(--sb-border)]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách Yêu cầu chỉnh sửa */}
            <div className='flex-1 overflow-y-auto p-3 space-y-2.5'>
              {isLoadingChangeRequests ? (
                <div className='flex flex-col items-center justify-center py-12 gap-2 text-[var(--sb-muted)]'>
                  <Loader2 className='w-5 h-5 animate-spin text-[var(--sb-accent)]' />
                  <span className='text-xs'>Đang tải danh sách yêu cầu...</span>
                </div>
              ) : filteredChangeRequests.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center p-4 space-y-2'>
                  <div className='w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
                    <CheckCircle2 className='w-5 h-5' />
                  </div>
                  <div className='text-xs font-semibold text-[var(--sb-text)]'>
                    Không có yêu cầu chỉnh sửa nào
                  </div>
                  <div className='text-[11px] text-[var(--sb-muted)] max-w-[220px]'>
                    {changeFilterStatus === 'open'
                      ? 'Tất cả yêu cầu đã được xử lý xong!'
                      : 'Biên tập viên chưa ghi nhận yêu cầu chỉnh sửa cho chương này.'}
                  </div>
                </div>
              ) : (
                filteredChangeRequests.map((cr) => {
                  const statusStr = String(cr.status).toLowerCase();
                  const isOpen = statusStr === 'open' || statusStr === '0' || cr.status === 0;
                  const isResolved =
                    statusStr === 'resolved' || statusStr === '1' || cr.status === 1;
                  const isVerified =
                    statusStr === 'verified' || statusStr === '2' || cr.status === 2;
                  const isInputOpen = activeResolveInputId === cr.id;

                  return (
                    <div
                      key={cr.id}
                      data-testid={`change-request-card-${cr.id}`}
                      className={`rounded-xl border p-3 space-y-2 transition-all ${
                        isOpen
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                          : isResolved
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                            : 'bg-[var(--sb-surface)] border-[var(--sb-border)] opacity-80'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isOpen
                              ? 'bg-rose-500 text-white'
                              : isResolved
                                ? 'bg-amber-500 text-white'
                                : isVerified
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-500 text-white'
                          }`}
                        >
                          {isOpen
                            ? 'Cần sửa'
                            : isResolved
                              ? 'Đã báo sửa'
                              : isVerified
                                ? 'Đã duyệt đạt'
                                : 'Đã đóng'}
                        </span>
                        {cr.dueDate && (
                          <span className='text-[10px] text-[var(--sb-muted)] flex items-center gap-1'>
                            <Clock className='w-3 h-3' />
                            <span>Hạn: {new Date(cr.dueDate).toLocaleDateString('vi-VN')}</span>
                          </span>
                        )}
                      </div>

                      <p className='text-xs text-[var(--sb-text)] font-medium leading-relaxed whitespace-pre-wrap'>
                        {cr.description}
                      </p>

                      {cr.reviewerComment && (
                        <div className='p-2 rounded-lg bg-[var(--sb-surface-hover)] border border-[var(--sb-border)] text-[11px] text-[var(--sb-muted)] space-y-0.5'>
                          <div className='font-semibold text-[10px] text-[var(--sb-text)]'>
                            Phản hồi của kiểm duyệt:
                          </div>
                          <div className='italic'>{cr.reviewerComment}</div>
                        </div>
                      )}

                      {cr.resolutionNote && (
                        <div className='p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5'>
                          <div className='font-semibold text-[10px]'>
                            Ghi chú đã sửa của Họa sĩ:
                          </div>
                          <div>{cr.resolutionNote}</div>
                        </div>
                      )}

                      {isInputOpen && (
                        <div className='space-y-1.5 pt-1.5 border-t border-[var(--sb-border)] animate-in fade-in duration-150'>
                          <input
                            type='text'
                            value={resolveNoteByCrId[cr.id] || ''}
                            onChange={(e) =>
                              setResolveNoteByCrId((prev) => ({ ...prev, [cr.id]: e.target.value }))
                            }
                            placeholder='Ghi chú cách bạn đã khắc phục (tuỳ chọn)...'
                            className='w-full px-2.5 py-1.5 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-surface)] text-xs text-[var(--sb-text)] placeholder:text-[var(--sb-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--sb-accent)]'
                          />
                          <div className='flex items-center justify-end gap-1.5'>
                            <button
                              type='button'
                              onClick={() => setActiveResolveInputId(null)}
                              className='px-2 py-1 rounded-md text-[10px] text-[var(--sb-muted)] hover:bg-[var(--sb-surface-hover)] cursor-pointer'
                            >
                              Hủy
                            </button>
                            <button
                              type='button'
                              disabled={isResolvingChangeRequest}
                              onClick={() => {
                                onResolveChangeRequest?.(cr.id, resolveNoteByCrId[cr.id]);
                                setActiveResolveInputId(null);
                              }}
                              data-testid={`btn-confirm-resolve-${cr.id}`}
                              className='px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors'
                            >
                              <Check className='w-3 h-3' />
                              <span>Xác nhận đã sửa</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className='flex items-center justify-end gap-1.5 pt-1'>
                          {onNavigateToChangeRequestTarget && hasChangeRequestLocation(cr) && (
                          <button
                            type='button'
                            onClick={() => onNavigateToChangeRequestTarget(cr)}
                            data-testid={`btn-navigate-cr-${cr.id}`}
                            className='px-2 py-1 rounded-lg border border-[var(--sb-border)] hover:bg-[var(--sb-surface-hover)] text-[10px] font-semibold text-[var(--sb-text)] flex items-center gap-1 cursor-pointer transition-colors'
                          >
                            <ArrowUpRight className='w-3 h-3 text-[var(--sb-accent)]' />
                            <span>Xem vị trí</span>
                          </button>
                        )}

                        {isOpen && !isInputOpen && onResolveChangeRequest && (
                          <button
                            type='button'
                            onClick={() => setActiveResolveInputId(cr.id)}
                            data-testid={`btn-resolve-cr-${cr.id}`}
                            className='px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors'
                          >
                            <Check className='w-3 h-3' />
                            <span>Báo đã sửa...</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
              TAB 6: HISTORY (LỊCH SỬ PHIÊN BẢN TRANG - DRAWER NHỎ 280-290px)
              ------------------------------------------------------------- */}
        {isDrawerOpen && activeTab === 'history' && (
          <div data-testid='canva-drawer-history' className='flex flex-col h-full overflow-hidden'>
            {/* Header Drawer nhỏ */}
            <div className='p-3 border-b border-[var(--sb-border)] shrink-0 space-y-1.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <HistoryIcon className='w-4 h-4 text-[var(--sb-accent)]' />
                  <h3 className='text-xs font-bold text-[var(--sb-text)] uppercase tracking-wider'>
                    Lịch sử trang
                  </h3>
                </div>
                {onRefreshHistory && (
                  <button
                    type='button'
                    onClick={onRefreshHistory}
                    data-testid='btn-refresh-history'
                    title='Tải lại lịch sử phiên bản'
                    className='w-6 h-6 rounded-md hover:bg-[var(--sb-surface-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] flex items-center justify-center transition-colors cursor-pointer'
                  >
                    <RotateCcw className='w-3.5 h-3.5' />
                  </button>
                )}
              </div>

              <div className='flex items-center justify-between text-[11px] text-[var(--sb-muted)]'>
                <span>Trang {selectedPage?.pageNumber || activePageNumber}</span>
                <span className='font-mono font-bold text-[var(--sb-accent)]'>
                  v{pageHistory?.currentVersion || 1}
                </span>
              </div>
            </div>

            {/* Timeline lịch sử */}
            <div className='flex-1 overflow-y-auto p-3 space-y-2'>
              {isLoadingPageHistory ? (
                <div className='flex flex-col items-center justify-center py-10 gap-2 text-[var(--sb-muted)]'>
                  <Loader2 className='w-4 h-4 animate-spin text-[var(--sb-accent)]' />
                  <span className='text-[11px]'>Đang tải lịch sử...</span>
                </div>
              ) : !pageHistory || !pageHistory.items || pageHistory.items.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-center space-y-2 text-[var(--sb-muted)]'>
                  <Clock className='w-6 h-6 text-stone-400' />
                  <div className='text-xs font-semibold text-[var(--sb-text)]'>
                    Phiên bản ban đầu
                  </div>
                  <div className='text-[10px] leading-relaxed max-w-[200px]'>
                    Trang chưa có lịch sử chỉnh sửa. Mọi thay đổi khung vẽ sẽ tự động tạo phiên bản
                    mới.
                  </div>
                </div>
              ) : (
                <div className='relative pl-3.5 border-l-2 border-[var(--sb-border)] space-y-3.5 my-1'>
                  {pageHistory.items.map((entry) => {
                    const isCurrent = entry.version === pageHistory.currentVersion;
                    const isConfirming = confirmRestoreVersion === entry.version;

                    const eventLabel = (() => {
                      switch (entry.eventType) {
                        case 'PageCreated':
                          return 'Khởi tạo trang';
                        case 'ElementAdded':
                          return 'Thêm đối tượng';
                        case 'ElementMoved':
                          return 'Di chuyển đối tượng';
                        case 'ElementRemoved':
                          return 'Xóa đối tượng';
                        case 'ElementRestored':
                          return 'Phục hồi đối tượng';
                        case 'CanvasUpdated':
                          return 'Cập nhật canvas';
                        case 'VersionRestored':
                          return 'Khôi phục bản cũ';
                        default:
                          return entry.eventType || 'Chỉnh sửa bản vẽ';
                      }
                    })();

                    return (
                      <div
                        key={`history-v${entry.version}`}
                        data-testid={`history-entry-v${entry.version}`}
                        className='relative space-y-1'
                      >
                        <div
                          className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[var(--sb-popover,var(--sb-bg))] ${
                            isCurrent
                              ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                              : 'bg-[var(--sb-border)]'
                          }`}
                        />

                        <div className='flex items-center justify-between gap-1'>
                          <span className='font-mono text-xs font-bold text-[var(--sb-text)]'>
                            v{entry.version}
                          </span>
                          {isCurrent && (
                            <span className='px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/20'>
                              Hiện hành
                            </span>
                          )}
                        </div>

                        <div className='text-[11px] text-[var(--sb-muted)]'>{eventLabel}</div>

                        {!isCurrent && onRestoreVersion && (
                          <div className='pt-1'>
                            {isConfirming ? (
                              <div className='p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in duration-150'>
                                <div className='text-[10px] text-amber-700 dark:text-amber-300 font-semibold'>
                                  Khôi phục về v{entry.version}?
                                </div>
                                <div className='flex items-center gap-1'>
                                  <button
                                    type='button'
                                    disabled={isRestoringVersion}
                                    onClick={() => {
                                      onRestoreVersion(entry.version);
                                      setConfirmRestoreVersion(null);
                                    }}
                                    data-testid={`btn-confirm-restore-v${entry.version}`}
                                    className='flex-1 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer transition-colors'
                                  >
                                    {isRestoringVersion ? 'Đang khôi phục...' : 'Đồng ý'}
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => setConfirmRestoreVersion(null)}
                                    className='px-2 py-1 rounded text-[10px] text-[var(--sb-muted)] hover:bg-[var(--sb-surface-hover)] cursor-pointer'
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type='button'
                                onClick={() => setConfirmRestoreVersion(entry.version)}
                                data-testid={`btn-restore-v${entry.version}`}
                                className='text-[10px] font-semibold text-[var(--sb-accent)] hover:underline flex items-center gap-1 cursor-pointer'
                              >
                                <RotateCcw className='w-3 h-3' />
                                <span>Khôi phục bản này</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* 7. NGĂN NỘI DUNG TAB 7: CHÈN THOẠI & BÓNG THOẠI (LETTERING SIDETAB P0) */}
        {activeTab === 'lettering' && (
          <div
            data-testid='canva-drawer-lettering'
            className='w-full h-full flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar'
          >
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-sm font-bold text-[var(--sb-text)] flex items-center gap-1.5'>
                  <Type className='w-4 h-4 text-orange-500' />
                  <span>Chèn Thoại &amp; Bóng Thoại</span>
                </h3>
                <p className='text-[11px] text-[var(--sb-muted)]'>
                  Kéo thả 3 dạng bóng cơ bản và ràng buộc với câu thoại
                </p>
              </div>
            </div>

            {/* 3 Dạng bóng cơ bản: Speech, Thought, Narration */}
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-[var(--sb-text)] flex items-center justify-between'>
                <span>3 Dạng bóng cơ bản</span>
                <span className='text-[10px] text-[var(--sb-muted)] font-normal'>
                  Kéo thả vào trang
                </span>
              </label>
              <div className='grid grid-cols-3 gap-2'>
                {/* 1. Speech (Thoại) */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ type: 'SPEECH_BALLOON' }),
                    );
                    e.dataTransfer.setData('text/plain', 'SPEECH_BALLOON');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAddLetteringElement?.('SPEECH_BALLOON')}
                  data-testid='lettering-drag-speech'
                  className='flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 cursor-grab active:cursor-grabbing transition-all text-center shadow-2xs group'
                >
                  <div className='w-8 h-8 rounded-full border-2 border-stone-800 bg-white flex items-center justify-center mb-1.5 group-hover:border-orange-500 transition-colors'>
                    <MessageSquare className='w-4 h-4 text-stone-700 group-hover:text-orange-500' />
                  </div>
                  <span className='text-xs font-bold text-stone-800'>Thoại</span>
                  <span className='text-[10px] text-stone-400'>Speech</span>
                </div>

                {/* 2. Thought (Suy nghĩ) */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ type: 'THOUGHT_BALLOON' }),
                    );
                    e.dataTransfer.setData('text/plain', 'THOUGHT_BALLOON');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAddLetteringElement?.('THOUGHT_BALLOON')}
                  data-testid='lettering-drag-thought'
                  className='flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 cursor-grab active:cursor-grabbing transition-all text-center shadow-2xs group'
                >
                  <div className='w-8 h-8 rounded-full border-2 border-dashed border-stone-800 bg-white flex items-center justify-center mb-1.5 group-hover:border-orange-500 transition-colors'>
                    <span className='text-xs'>💭</span>
                  </div>
                  <span className='text-xs font-bold text-stone-800'>Suy nghĩ</span>
                  <span className='text-[10px] text-stone-400'>Thought</span>
                </div>

                {/* 3. Narration (Dẫn truyện) */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ type: 'NARRATION_BOX' }),
                    );
                    e.dataTransfer.setData('text/plain', 'NARRATION_BOX');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAddLetteringElement?.('NARRATION_BOX')}
                  data-testid='lettering-drag-narration'
                  className='flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 cursor-grab active:cursor-grabbing transition-all text-center shadow-2xs group'
                >
                  <div className='w-8 h-6 rounded-xs border-2 border-stone-800 bg-amber-50/60 flex items-center justify-center mb-2.5 group-hover:border-orange-500 transition-colors'>
                    <span className='text-[9px] font-mono font-bold text-stone-700'>REC</span>
                  </div>
                  <span className='text-xs font-bold text-stone-800'>Dẫn truyện</span>
                  <span className='text-[10px] text-stone-400'>Narration</span>
                </div>
              </div>
            </div>

            {/* Ràng buộc kịch bản (Script Binding) */}
            <div className='space-y-2 pt-2 border-t border-[var(--sb-border)]'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-semibold text-[var(--sb-text)] flex items-center gap-1.5'>
                  <FileText className='w-3.5 h-3.5 text-stone-500' />
                  <span>Gắn câu thoại kịch bản</span>
                </label>
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={() => setLetteringFilterCurrentPage((prev) => !prev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      letteringFilterCurrentPage
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                        : 'bg-stone-100 border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300'
                    }`}
                    title='Lọc câu thoại theo trang đang chọn'
                  >
                    {letteringFilterCurrentPage ? `Trang #${activePageNumber}` : 'Tất cả'}
                  </button>
                  <span className='text-[10px] text-[var(--sb-muted)]'>
                    {displayedLetteringScriptLines.length} câu
                  </span>
                </div>
              </div>

              <div className='space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1'>
                {displayedLetteringScriptLines.length === 0 ? (
                  <p className='text-xs text-[var(--sb-muted)] italic p-2 bg-[var(--sb-surface-hover)] rounded-lg'>
                    Chưa có câu thoại nào cho trang này.
                  </p>
                ) : (
                  displayedLetteringScriptLines.map((line) => {
                    const isLinked = letteringElements.some((el) => el.scriptLineId === line.id);
                    const isNarrator =
                      !line.characterName ||
                      line.characterName === 'Người dẫn' ||
                      line.characterName === 'Lời dẫn';
                    const suggestedType: 'SPEECH_BALLOON' | 'THOUGHT_BALLOON' | 'NARRATION_BOX' =
                      isNarrator ? 'NARRATION_BOX' : 'SPEECH_BALLOON';

                    return (
                      <div
                        key={line.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({
                              type: suggestedType,
                              scriptLine: line,
                            }),
                          );
                          e.dataTransfer.setData('text/plain', line.dialogueText || line.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => {
                          onAddLetteringElement?.(suggestedType, line);
                        }}
                        data-testid={`lettering-script-line-${line.id}`}
                        className={`p-2 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all space-y-1 ${
                          isLinked
                            ? 'bg-emerald-50/50 border-emerald-200 text-stone-800'
                            : 'bg-white hover:bg-orange-50/30 border-stone-200 hover:border-orange-400 text-stone-800'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-1'>
                          <div className='flex items-center gap-1.5 min-w-0'>
                            {/* Huy hiệu Page & Panel */}
                            <span className='px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono font-bold text-[9px] text-stone-600 dark:text-stone-300 shrink-0'>
                              P.{line.pageNumber || activePageNumber} · Ô {line.panelNumber || 1}
                            </span>
                            {/* Tên người nói */}
                            <span
                              className='font-bold text-[11px] truncate'
                              style={{
                                color: line.characterColor || (isNarrator ? '#78716C' : '#EA580C'),
                              }}
                            >
                              {line.characterName || (isNarrator ? 'Người dẫn' : 'Nhân vật')}
                            </span>
                          </div>
                          {isLinked && (
                            <span className='text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold shrink-0'>
                              ✓ Đã gắn
                            </span>
                          )}
                        </div>
                        <p className='text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2'>
                          {line.dialogueText || line.stageDirection}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Danh sách bóng thoại đã tạo trên trang & Cảnh báo P0 */}
            <div className='space-y-2 pt-2 border-t border-[var(--sb-border)]'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-semibold text-[var(--sb-text)] flex items-center gap-1.5'>
                  <span>Bóng thoại trên trang ({letteringElements.length})</span>
                </label>
              </div>

              <div className='space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1'>
                {letteringElements.length === 0 ? (
                  <p className='text-xs text-[var(--sb-muted)] italic p-2 bg-[var(--sb-surface-hover)] rounded-lg text-center'>
                    Chưa có bóng thoại nào trên trang. Hãy kéo thả loại bóng ở trên vào canvas.
                  </p>
                ) : (
                  letteringElements.map((el, idx) => {
                    const isSelected = selectedElementId === el.elementId;
                    const textLen = (el.content || '').length;
                    // Giả lập kiểm tra tràn chữ P0: chiều cao khung so với lượng chữ
                    const isOverflow = textLen > 70 && (el.height || 100) < 120;
                    // Giả lập kiểm tra ngược thứ tự đọc P0 (Manga RTL)
                    const isOrderWarning = idx > 0 && el.x > letteringElements[idx - 1].x;

                    return (
                      <div
                        key={el.elementId}
                        onClick={() => onSelectElementId?.(el.elementId)}
                        data-testid={`lettering-item-${el.elementId}`}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className='flex-1 min-w-0 space-y-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-mono font-bold text-[10px] text-stone-500'>
                              #{el.readingOrder ?? idx + 1}
                            </span>
                            <span className='font-semibold text-stone-800 truncate text-[11px]'>
                              {el.elementType === 'SPEECH_BALLOON'
                                ? 'Bóng thoại'
                                : el.elementType === 'THOUGHT_BALLOON'
                                  ? 'Suy nghĩ'
                                  : 'Dẫn truyện'}
                            </span>
                          </div>
                          <p className='text-[10px] text-stone-600 truncate'>
                            {el.content || '(Chưa có nội dung)'}
                          </p>

                          {/* Cảnh báo P0: Text Overflow & Reading Order */}
                          {(isOverflow || isOrderWarning) && (
                            <div className='flex items-center gap-1 pt-0.5'>
                              {isOverflow && (
                                <span
                                  data-testid='lettering-warning-overflow'
                                  className='inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-50 text-rose-600 text-[9px] font-bold border border-rose-200'
                                  title='Văn bản vượt quá kích thước bóng thoại'
                                >
                                  <AlertTriangle className='w-2.5 h-2.5' /> Tràn chữ
                                </span>
                              )}
                              {isOrderWarning && (
                                <span
                                  data-testid='lettering-warning-order'
                                  className='inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200'
                                  title='Vị trí bóng có thể ngược thứ tự đọc Manga RTL'
                                >
                                  <AlertCircle className='w-2.5 h-2.5' /> Đọc ngược
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {onDeleteLetteringElement && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLetteringElement(el.elementId);
                            }}
                            data-testid={`btn-delete-lettering-${el.elementId}`}
                            className='p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer'
                            title='Xóa bóng thoại'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default ArtistCanvaSidebar;
