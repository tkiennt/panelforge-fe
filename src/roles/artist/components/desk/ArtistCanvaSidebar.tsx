import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { translate, useTranslation } from '@/lib/i18n';
import { PanelModelSheetBlock } from './PanelModelSheetBlock';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { FrameTemplateDto } from '@/services/frameTemplate.service';
import { ChangeRequestDto } from '@/types/pipeline';
import { hasChangeRequestLocation } from '../../utils/changeRequestLocation';
import { LetteringScriptPanel } from './LetteringScriptPanel';
import type { BalloonType } from '../../hooks/useLetteringBalloons';
import { PageHistoryDto } from '@/services/page.service';
import { ElementSnapshotDto, type TextStyleDto } from '@/services/element.service';
import { CollapsibleSidebar, SidebarSection } from '@/shared/ui';
import { ArtistScriptReader, ChapterPanelRef } from './ArtistScriptReader';
import {
  DEFAULT_BIBLE_ENTITIES,
  DEFAULT_FRAME_TEMPLATES,
  DEFAULT_SCRIPT_LINES,
} from './artistSidebarDefaults';

export type CanvaSidebarTab =
  'pages' | 'script' | 'bible' | 'templates' | 'changes' | 'history' | 'lettering';

const ARTIST_TOOL_DRAWER_ID = 'artist-tool-drawer';

export interface ScriptLineItem {
  id: string;
  pageId?: string;
  panelNumber?: number;
  pageNumber?: number;
  sceneId?: string;
  sceneNumber?: number;
  sceneTitle?: string;
  sceneSlugline?: string;
  speakerCharacterId?: string | null;
  speakerLabel?: string | null;
  characterName?: string;
  characterColor?: string;
  characterAvatarUrl?: string;
  /** Biến thể tạo hình đang dùng ở chương/panel (BR-15), vd "Lúc nhỏ". */
  characterVariant?: string;
  dialogueText?: string;
  stageDirection?: string;
  narrationMode?: string;
  kind?: string | number | null;
  text?: string | null;
  panelId?: string;
  lineOrder?: number;
}

export interface BibleEntityItem {
  id: string;
  code?: string;
  name: string;
  subtitle?: string;
  variantLabel?: string;
  versionNumber?: number;
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
  chapterPanels?: ChapterPanelRef[];
  sceneTitle?: string;
  sceneSlugline?: string;
  chapterTitle?: string;
  chapters?: SidebarChapterOption[];
  selectedChapterId?: string | null;
  onSelectChapter?: (chapterId: string) => void;
  isLoadingScript?: boolean;
  selectedPanelId?: string | null;
  selectedPanelNumber?: number | null;
  onSelectPanelId?: (panelId: string | null) => void;
  // Bible props
  bibleEntities?: BibleEntityItem[];
  seriesTitle?: string;
  isLoadingBible?: boolean;
  artworkPanelKeys?: Set<string | number>;
  onSelectPanel?: (pageNumber: number, panelNumber: number) => void;
  // Panel Template props (Áp dụng tức thì vào trang hiện tại)
  templates?: FrameTemplateDto[];
  activeTemplateId?: string | null;
  onSelectTemplate?: (template: FrameTemplateDto) => void;
  onClearTemplate?: () => void;
  hasPagePanels?: boolean;
  isLoadingTemplates?: boolean;
  isApplyingTemplate?: boolean;
  templateError?: string | null;
  layoutLocked?: boolean;
  canEditPages?: boolean;
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
  markNumberById?: Record<string, number>;
  // Page History & Restore
  pageHistory?: PageHistoryDto | null;
  isLoadingPageHistory?: boolean;
  onRestoreVersion?: (version: number) => Promise<void> | void;
  isRestoringVersion?: boolean;
  onRefreshHistory?: () => void;
  // Lettering Sidetab Props (P0 Lõi MVP - BR-05, BR-20, BR-34)
  letteringElements?: ElementSnapshotDto[];
  onAddLetteringElement?: (type: BalloonType, scriptLine?: ScriptLineItem) => void;
  onDeleteLetteringElement?: (id: string) => void;
  selectedElementId?: string | null;
  /** Bóng đang chờ server lưu (chưa được xác nhận). */
  pendingElementIds?: ReadonlySet<string>;
  onSelectElementId?: (id: string | null) => void;
  activeLang?: string;
  originalLang?: string;
  translationReadOnly?: boolean;
  letteringReadOnly?: boolean;
  onUpdateElementText?: (id: string, text: string) => Promise<void> | void;
  onUpdateElementTranslation?: (id: string, text: string) => Promise<void> | void;
  /** Dòng script đã có bóng trên toàn chương (không chỉ trang hiện tại). */
  linkedScriptLineIds?: ReadonlySet<string>;
  /** Nội dung đặt ở đầu tab Letter (bộ chọn ngôn ngữ đang soạn). */
  letteringHeaderSlot?: React.ReactNode;
  onUpdateElementStyle?: (id: string, patch: Partial<TextStyleDto> | null) => Promise<void> | void;
}

/**
 * ArtistCanvaSidebar - Sidebar Canva Navigation chuyên biệt cho Artist Desk
 * - Giữ bề mặt paper sáng riêng cho công cụ Artist, không kế thừa theme của sidebar điều hướng.
 * - Đóng vai trò là thanh Sidebar chính khi Artist vào màn hình làm việc bản vẽ.
 * - Thanh công cụ chính Canva Dock: [Pages] - [Script] - [Series Bible] - [Khung] cùng nút thu gọn.
 * - Mỗi thời điểm chỉ hiển thị một drawer chi tiết để giữ canvas đủ rộng.
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
  chapterPanels,
  chapterTitle,
  chapters,
  selectedChapterId,
  onSelectChapter,
  isLoadingScript = false,
  selectedPanelId = null,
  selectedPanelNumber = null,
  onSelectPanelId,
  bibleEntities = DEFAULT_BIBLE_ENTITIES,
  seriesTitle = 'Huyết Thống Viễn Cổ',
  isLoadingBible = false,
  artworkPanelKeys = new Set<string | number>(),
  onSelectPanel,
  templates = DEFAULT_FRAME_TEMPLATES,
  activeTemplateId = null,
  onSelectTemplate,
  onClearTemplate,
  hasPagePanels = false,
  isLoadingTemplates = false,
  isApplyingTemplate = false,
  templateError = null,
  layoutLocked = false,
  canEditPages = true,
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
  markNumberById = {},
  pageHistory = null,
  isLoadingPageHistory = false,
  onRestoreVersion,
  isRestoringVersion = false,
  onRefreshHistory,
  letteringElements = [],
  onAddLetteringElement,
  onDeleteLetteringElement,
  selectedElementId = null,
  pendingElementIds,
  onSelectElementId,
  activeLang,
  originalLang = 'vi',
  translationReadOnly = false,
  letteringReadOnly = false,
  onUpdateElementText,
  onUpdateElementTranslation,
  linkedScriptLineIds,
  letteringHeaderSlot,
}) => {
  const { t, lang } = useTranslation('artist');
  // Artist tool drawer is a separate light canvas surface, independent from app navigation theme.
  const currentTheme = theme ?? 'paper';

  // Trạng thái tab Canva: 'pages' | 'script' | 'bible' (mặc định 'script' nếu tab Pages ẩn)
  const [internalActiveTab, setInternalActiveTab] = useState<CanvaSidebarTab>(
    hidePagesTab ? 'script' : 'pages',
  );
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;
  const [focusedToolTab, setFocusedToolTab] = useState<CanvaSidebarTab>(activeTab);
  const setActiveTab = (tab: CanvaSidebarTab) => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    setFocusedToolTab(activeTab);
  }, [activeTab]);

  // Trạng thái mở/đóng ngăn phụ (Canva Drawer): Mặc định ĐÓNG (false) để chỉ hiển thị trang giấy trắng tinh
  const [internalDrawerOpen, setInternalDrawerOpen] = useState<boolean>(false);
  const isDrawerOpen = isDrawerOpenProp !== undefined ? isDrawerOpenProp : internalDrawerOpen;
  const setIsDrawerOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof open === 'function' ? open(isDrawerOpen) : open;
      setInternalDrawerOpen(nextVal);
      onToggleDrawer?.(nextVal);
    },
    [isDrawerOpen, onToggleDrawer],
  );

  const [scriptDrawerWidth, setScriptDrawerWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('pf.artist.scriptReader.width'));
      return Number.isFinite(saved) && saved >= 320 && saved <= 560 ? saved : 400;
    } catch {
      return 400;
    }
  });
  const updateScriptDrawerWidth = (nextWidth: number) => {
    const width = Math.max(320, Math.min(560, nextWidth));
    setScriptDrawerWidth(width);
    try {
      localStorage.setItem('pf.artist.scriptReader.width', String(width));
    } catch {
      // Keep the resize interaction available when persistent storage is unavailable.
    }
  };

  // '[' mở/đóng nhanh; Escape luôn trả trọng tâm về canvas bằng cách đóng drawer.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        e.preventDefault();
        setIsDrawerOpen(false);
        return;
      }

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
  }, [isDrawerOpen, setIsDrawerOpen]);

  // Bộ lọc trang (Tab Pages)
  const [pageFilterStage, setPageFilterStage] = useState<PageStage | 'all'>('all');
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageViewMode, setPageViewMode] = useState<'thumbnail' | 'compact'>('thumbnail');

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
  const [resolveNoteByCrId, setResolveNoteByCrId] = useState<Record<string, string>>({});
  const [activeResolveInputId, setActiveResolveInputId] = useState<string | null>(null);

  // Trạng thái cho Lịch sử phiên bản (Tab History)
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);

  // Đếm số lượng Change Requests cần sửa (Open)
  const openChangeRequestsCount = useMemo(() => {
    return changeRequests.filter((cr) => {
      const s = String(cr.status).toLowerCase();
      return s === 'open' || s === '0' || cr.status === 0;
    }).length;
  }, [changeRequests]);

  // Xử lý khi nhấn nút Tab Canva Dock
  const handleTabClick = (tab: CanvaSidebarTab) => {
    if (activeTab === tab) {
      setIsDrawerOpen((prev) => !prev);
    } else {
      setActiveTab(tab);
      setIsDrawerOpen(true);
    }
  };

  const toolLabels: Record<CanvaSidebarTab, string> = {
    pages: t('canvaSidebar.tabPages'),
    script: t('canvaSidebar.tabScript'),
    bible: t('canvaSidebar.tabBible'),
    templates: t('canvaSidebar.tabTemplates'),
    lettering: t('canvaSidebar.tabLettering'),
    changes: t('canvaSidebar.tabChanges'),
    history: t('canvaSidebar.tabHistory'),
  };

  const toolButtonProps = (tab: CanvaSidebarTab) => ({
    'aria-controls': ARTIST_TOOL_DRAWER_ID,
    'aria-expanded': activeTab === tab && isDrawerOpen,
    'aria-pressed': activeTab === tab && isDrawerOpen,
    'aria-label': toolLabels[tab],
    'data-sidebar-item': true,
    tabIndex: focusedToolTab === tab ? 0 : -1,
    title: toolLabels[tab],
    onFocus: () => setFocusedToolTab(tab),
  });

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

  const contextualBibleIds = useMemo(() => {
    const relevantLines = scriptLines.filter((line) => {
      if (selectedPanelId) {
        return (
          line.panelId === selectedPanelId ||
          (selectedPanelNumber != null &&
            line.panelNumber === selectedPanelNumber &&
            (line.pageNumber === activePageNumber || line.pageId === selectedPageId))
        );
      }
      if (selectedPanelNumber != null) {
        return line.panelNumber === selectedPanelNumber && line.pageNumber === activePageNumber;
      }
      return line.pageNumber === activePageNumber || line.pageId === selectedPageId;
    });
    const contextText = relevantLines
      .flatMap((line) => [
        line.speakerLabel,
        line.characterName,
        line.dialogueText,
        line.stageDirection,
        line.text,
        line.sceneTitle,
        line.sceneSlugline,
      ])
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();

    return new Set(
      bibleEntities
        .filter((item) => {
          const names = [item.name, item.code, item.subtitle]
            .filter(Boolean)
            .map((value) => String(value).toLocaleLowerCase());
          return names.some((name) => name.length > 1 && contextText.includes(name));
        })
        .map((item) => item.id),
    );
  }, [
    activePageNumber,
    bibleEntities,
    scriptLines,
    selectedPageId,
    selectedPanelId,
    selectedPanelNumber,
  ]);

  const contextualBible = useMemo(
    () => filteredBible.filter((item) => contextualBibleIds.has(item.id)),
    [contextualBibleIds, filteredBible],
  );
  const otherBible = useMemo(
    () => filteredBible.filter((item) => !contextualBibleIds.has(item.id)),
    [contextualBibleIds, filteredBible],
  );

  const renderBibleEntity = (item: BibleEntityItem) => (
    <details
      key={item.id}
      data-testid={`bible-entity-${item.id}`}
      className='group rounded-lg border border-[var(--sb-border)] bg-[var(--sb-surface)] open:border-[var(--sb-accent)]/40 open:bg-white'
    >
      <summary className='focus-ring flex min-h-16 cursor-pointer list-none items-center gap-2.5 rounded-lg p-2.5 [&::-webkit-details-marker]:hidden'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--sb-border)] bg-[var(--sb-surface-hover)]'>
          {item.imageUrl ? (
            <AuthenticatedImage
              src={item.imageUrl}
              alt={item.name || ''}
              className='h-full w-full object-cover object-top'
              loading='lazy'
            />
          ) : item.category === 'character' ? (
            <User className='h-5 w-5 text-orange-500' aria-hidden='true' />
          ) : item.category === 'location' ? (
            <MapPin className='h-5 w-5 text-purple-500' aria-hidden='true' />
          ) : (
            <Sparkles className='h-5 w-5 text-emerald-600' aria-hidden='true' />
          )}
        </div>
        <span className='min-w-0 flex-1'>
          <span className='flex items-center gap-1.5'>
            <span className='truncate text-xs font-bold text-[var(--sb-text)]'>{item.name}</span>
            {item.variantLabel && (
              <span className='font-normal text-[var(--sb-muted)]'>
                {' '}
                — {item.variantLabel} (v{item.versionNumber ?? 1})
              </span>
            )}
            {item.status === 'CanonLocked' && (
              <span className='shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700'>
                {t('canvaSidebar.canonLocked')}
              </span>
            )}
          </span>
          <span className='mt-0.5 block truncate text-xs text-[var(--sb-muted)]'>
            {item.subtitle || item.tag}
          </span>
          {item.description && (
            <span className='mt-1 block line-clamp-1 text-xs leading-relaxed text-[var(--sb-muted)]'>
              {item.description}
            </span>
          )}
        </span>
        <ChevronRight
          className='h-4 w-4 shrink-0 text-[var(--sb-muted)] transition-transform group-open:rotate-90'
          aria-hidden='true'
        />
      </summary>
      <div className='space-y-2 border-t border-[var(--sb-border)] px-3 pb-3 pt-2.5'>
        {item.description && (
          <p className='text-xs leading-relaxed text-[var(--sb-text)]'>{item.description}</p>
        )}
        {item.visualNotes.length > 0 && (
          <div className='space-y-1.5'>
            <span className='text-xs font-semibold text-[var(--sb-accent)]'>
              {t('canvaSidebar.visualNotesLabel')}
            </span>
            <ul className='space-y-1 text-xs text-[var(--sb-muted)]'>
              {item.visualNotes.map((note, index) => (
                <li key={`${item.id}-note-${index}`} className='flex gap-2 leading-relaxed'>
                  <span className='text-[var(--sb-accent)]' aria-hidden='true'>
                    •
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );

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
      className='pf-sidebar !bg-white flex h-full select-none z-20 shrink-0 font-sans relative'
      data-sb-theme={currentTheme}
      data-testid='artist-desk-sidebar'
    >
      {/* =========================================================================
          1. CANVA PRIMARY DOCK
          ========================================================================= */}
      <CollapsibleSidebar
        collapsed
        label={t('canvaSidebar.dockLabel')}
        data-testid='canva-primary-dock'
        className='!w-16 bg-white text-stone-500 flex flex-col items-center py-3 border-r border-[#E7E5E4] justify-between transition-colors motion-reduce:transition-none shrink-0'
      >
        <SidebarSection
          collapsed
          label={t('canvaSidebar.toolsSectionLabel')}
          role='toolbar'
          aria-orientation='vertical'
          aria-controls={ARTIST_TOOL_DRAWER_ID}
          className='w-full flex flex-col items-center gap-1.5'
        >
          {/* Nút Tab 1: Pages (Trang) */}
          {!hidePagesTab && (
            <button
              type='button'
              {...toolButtonProps('pages')}
              onClick={() => handleTabClick('pages')}
              data-testid='canva-tab-pages'
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                activeTab === 'pages' && isDrawerOpen
                  ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Layers className='w-4 h-4 mb-0.5' aria-hidden='true' />
              <span className='text-xs leading-tight tracking-tight'>
                {t('canvaSidebar.tabPages')}
              </span>
            </button>
          )}

          {/* Nút Tab 2: Script (Kịch bản) */}
          <button
            type='button'
            {...toolButtonProps('script')}
            onClick={() => handleTabClick('script')}
            data-testid='canva-tab-script'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              activeTab === 'script' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <FileText className='w-4 h-4 mb-0.5' aria-hidden='true' />
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabScript')}
            </span>
          </button>

          {/* Nút Tab 3: Series Bible (Hồ sơ) */}
          <button
            type='button'
            {...toolButtonProps('bible')}
            onClick={() => handleTabClick('bible')}
            data-testid='canva-tab-bible'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              activeTab === 'bible' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <User className='w-4 h-4 mb-0.5' aria-hidden='true' />
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabBible')}
            </span>
          </button>

          {/* Nút Tab 4: Mẫu Khung Tranh */}
          <button
            type='button'
            {...toolButtonProps('templates')}
            aria-disabled={layoutLocked}
            title={
              layoutLocked
                ? t('canvaSidebar.tabTemplatesLockedTitle')
                : t('canvaSidebar.tabTemplatesTitle')
            }
            onClick={() => !layoutLocked && handleTabClick('templates')}
            data-testid='canva-tab-templates'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none aria-disabled:opacity-40 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              layoutLocked ? 'cursor-not-allowed' : 'cursor-pointer'
            } ${
              activeTab === 'templates' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <LayoutGrid className='w-4 h-4 mb-0.5' aria-hidden='true' />
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabTemplates')}
            </span>
          </button>

          {/* Nút Tab: Chèn thoại & Bóng thoại (Thoại) */}
          <button
            type='button'
            {...toolButtonProps('lettering')}
            onClick={() => handleTabClick('lettering')}
            data-testid='canva-tab-lettering'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              activeTab === 'lettering' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <MessageSquare className='w-4 h-4 mb-0.5' aria-hidden='true' />
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabLettering')}
            </span>
          </button>

          {/* Nút Tab 5: Yêu cầu chỉnh sửa (Sửa đổi) */}
          <button
            type='button'
            {...toolButtonProps('changes')}
            onClick={() => handleTabClick('changes')}
            data-testid='canva-tab-changes'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              activeTab === 'changes' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <AlertCircle
              aria-hidden='true'
              className={`w-4 h-4 mb-0.5 ${
                activeTab === 'changes' && isDrawerOpen
                  ? 'text-[#EA580C]'
                  : openChangeRequestsCount > 0
                    ? 'text-rose-500'
                    : 'text-current'
              }`}
            />
            {openChangeRequestsCount > 0 && (
              <span
                data-testid='changes-badge-counter'
                className='absolute top-0 right-0 px-1 min-w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center'
              >
                {openChangeRequestsCount > 9 ? '9+' : openChangeRequestsCount}
              </span>
            )}
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabChanges')}
            </span>
          </button>

          {/* Nút Tab 6: Lịch sử phiên bản trang */}
          <button
            type='button'
            {...toolButtonProps('history')}
            onClick={() => handleTabClick('history')}
            data-testid='canva-tab-history'
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              activeTab === 'history' && isDrawerOpen
                ? 'bg-orange-50 text-[#EA580C] border border-orange-200 font-semibold'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <HistoryIcon className='w-4 h-4 mb-0.5' aria-hidden='true' />
            <span className='text-xs leading-tight tracking-tight'>
              {t('canvaSidebar.tabHistory')}
            </span>
          </button>
        </SidebarSection>

        {/* Nút thu gọn / mở rộng Drawer nhanh ở đáy dock */}
        <button
          type='button'
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          aria-controls={ARTIST_TOOL_DRAWER_ID}
          aria-expanded={isDrawerOpen}
          title={
            isDrawerOpen
              ? t('canvaSidebar.collapseDrawerTitle')
              : t('canvaSidebar.expandDrawerTitle')
          }
          data-testid='canva-drawer-toggle'
          className='w-12 min-h-11 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 flex flex-col items-center justify-center gap-0.5 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'
        >
          {isDrawerOpen ? (
            <ChevronLeft className='w-4 h-4' aria-hidden='true' />
          ) : (
            <ChevronRight className='w-4 h-4' aria-hidden='true' />
          )}
          <span className='text-xs leading-none'>
            {isDrawerOpen ? t('canvaSidebar.drawerCloseShort') : t('canvaSidebar.drawerOpenShort')}
          </span>
        </button>
      </CollapsibleSidebar>

      {/* =========================================================================
          2. CANVA SECONDARY DRAWER (Cột docked trong layout flex, không đè canvas)
          ========================================================================= */}
      <aside
        id={ARTIST_TOOL_DRAWER_ID}
        data-testid='canva-secondary-drawer'
        aria-hidden={!isDrawerOpen}
        aria-label={t('canvaSidebar.drawerAria', { tool: toolLabels[activeTab] })}
        className={`bg-white text-stone-900 border-r border-[#E7E5E4] flex flex-col h-full overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none shrink-0 ${
          isDrawerOpen
            ? `${activeTab === 'script' ? '' : 'w-[340px]'} opacity-100`
            : 'w-0 opacity-0 pointer-events-none border-r-0'
        }`}
        style={isDrawerOpen && activeTab === 'script' ? { width: scriptDrawerWidth } : undefined}
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
                  {t('canvaSidebar.pagesHeaderTitle', { count: pages.length })}
                </h2>
                <p className='text-xs text-[var(--sb-muted)] mt-0.5'>
                  {t('canvaSidebar.pagesHeaderSubtitle')}
                </p>
              </div>

              {/* Nút thêm trang đồng bộ màu accent hệ thống */}
              {canEditPages && (
                <button
                  type='button'
                  onClick={onAddPage}
                  data-testid='canva-btn-add-page-header'
                  className='h-8 px-2.5 rounded-lg bg-[var(--sb-accent)] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' /> {t('canvaSidebar.addPageBtn')}
                </button>
              )}
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
                    placeholder={t('canvaSidebar.searchPagesPlaceholder')}
                    data-testid='canva-input-search-pages'
                    className='w-full h-8 bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-xs text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
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
              <div className='flex items-center gap-1 overflow-x-auto text-xs scrollbar-none'>
                {(['all', 'pencil', 'ink', 'lettering', 'completed'] as const).map((stage) => {
                  const labels: Record<string, string> = {
                    all: t('canvaSidebar.stageAll'),
                    pencil: t('canvaSidebar.stagePencil'),
                    ink: t('canvaSidebar.stageInk'),
                    lettering: t('canvaSidebar.stageLettering'),
                    completed: t('canvaSidebar.stageCompleted'),
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
                        <span className='text-xs font-mono font-bold text-neutral-600'>
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
                            {t('canvaSidebar.pageLabel', { page: page.pageNumber })}
                          </span>
                          <span className='text-xs px-1.5 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-medium'>
                            {page.stage}
                          </span>
                        </div>
                        <p className='text-xs text-[var(--sb-muted)] truncate mt-0.5'>
                          {page.title}
                        </p>
                      </div>

                      <div className='flex items-center justify-between text-xs text-[var(--sb-muted)]'>
                        <span>{t('canvaSidebar.panelsCount', { count: page.panelsCount })}</span>
                        <span>{page.format || t('canvaSidebar.standardFormatFallback')}</span>
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
                        title={
                          page.isVisible ? t('canvaSidebar.hidePage') : t('canvaSidebar.showPage')
                        }
                      >
                        {page.isVisible ? (
                          <Eye className='w-3.5 h-3.5 text-[var(--sb-accent)]' />
                        ) : (
                          <EyeOff className='w-3.5 h-3.5 opacity-50' />
                        )}
                      </button>
                      {canEditPages && (
                        <>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicatePage(page.id);
                            }}
                            className='p-1 text-[var(--sb-muted)] hover:text-[var(--sb-text)] rounded hover:bg-[var(--sb-hover)] cursor-pointer'
                            title={t('canvaSidebar.duplicatePage')}
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
                            title={t('canvaSidebar.deletePage')}
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer quản lý trang */}
            <div className='p-2.5 border-t border-[var(--sb-border)] bg-[var(--sb-surface)] flex items-center justify-between text-xs text-[var(--sb-muted)] shrink-0'>
              <span>
                {t('canvaSidebar.selectedPageFooter', { page: selectedPage?.pageNumber || 1 })}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  disabled={!selectedPage || selectedPageIndex === 0}
                  onClick={() => selectedPage && onMovePage(selectedPage.id, 'up')}
                  className='p-1.5 rounded-lg hover:bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] disabled:opacity-30 cursor-pointer'
                  title={t('canvaSidebar.movePageUp')}
                >
                  <ChevronUp className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  disabled={!selectedPage || selectedPageIndex === pages.length - 1}
                  onClick={() => selectedPage && onMovePage(selectedPage.id, 'down')}
                  className='p-1.5 rounded-lg hover:bg-[var(--sb-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] disabled:opacity-30 cursor-pointer'
                  title={t('canvaSidebar.movePageDown')}
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
          <ArtistScriptReader
            scriptLines={scriptLines}
            chapterPanels={chapterPanels}
            activePageNumber={activePageNumber}
            chapterTitle={chapterTitle}
            chapters={chapters}
            selectedChapterId={selectedChapterId}
            onSelectChapter={onSelectChapter}
            isLoading={isLoadingScript}
            bibleEntities={bibleEntities}
            selectedPanelId={selectedPanelId}
            selectedPanelNumber={selectedPanelNumber}
            artworkPanelKeys={artworkPanelKeys}
            onSelectPanel={onSelectPanel}
            width={scriptDrawerWidth}
            onWidthChange={updateScriptDrawerWidth}
          />
        )}

        {activeTab === 'bible' && (
          <div data-testid='canva-drawer-bible' className='flex flex-col h-full overflow-hidden'>
            {/* Header Drawer Hồ sơ */}
            <div className='p-3.5 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] shrink-0'>
              <div className='flex items-center justify-between mb-1'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-xs uppercase px-2 py-0.5 rounded-full bg-[var(--sb-surface-hover)] text-[var(--sb-accent)] border border-[var(--sb-border)] font-bold'>
                    {t('canvaSidebar.bibleBadge')}
                  </span>
                  {isLoadingBible && (
                    <span className='text-xs text-[var(--sb-muted)] animate-pulse'>
                      {t('canvaSidebar.loading')}
                    </span>
                  )}
                </div>
                <span className='text-xs text-[var(--sb-muted)] truncate max-w-[130px]'>
                  {seriesTitle}
                </span>
              </div>
              <h2 className='text-xs font-bold text-[var(--sb-text)] tracking-tight'>
                {t('canvaSidebar.bibleTitle')}
              </h2>
            </div>

            {/* Model sheet theo khung, ẩn mặc định để drawer vẫn gọn */}
            {selectedPanelId && (
              <details
                className='group border-b border-[var(--sb-border)] bg-[var(--sb-surface-hover)]'
                data-testid='canva-drawer-selected-panel-model-sheet'
              >
                <summary className='focus-ring flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--sb-text)] [&::-webkit-details-marker]:hidden'>
                  <ChevronRight
                    className='h-4 w-4 text-[var(--sb-accent)] transition-transform group-open:rotate-90'
                    aria-hidden='true'
                  />
                  {t('canvaSidebar.panelModelSheetReference', {
                    panel: selectedPanelNumber ?? '',
                  })}
                </summary>
                <div className='border-t border-[var(--sb-border)] p-3'>
                  <PanelModelSheetBlock
                    panelId={selectedPanelId}
                    panelNumber={selectedPanelNumber}
                  />
                </div>
              </details>
            )}

            {/* Thanh lọc phân loại Bible */}
            <div className='p-3 border-b border-[var(--sb-border)] flex flex-col gap-2 shrink-0'>
              <div className='relative'>
                <Search className='w-3.5 h-3.5 text-[var(--sb-muted)] absolute left-2.5 top-2.5' />
                <input
                  type='text'
                  value={bibleSearchQuery}
                  onChange={(e) => setBibleSearchQuery(e.target.value)}
                  placeholder={t('canvaSidebar.searchBiblePlaceholder')}
                  data-testid='canva-input-search-bible'
                  className='w-full h-8 bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-lg pl-8 pr-3 text-xs text-[var(--sb-text)] placeholder-[var(--sb-muted)] focus:outline-none focus:border-[var(--sb-accent)]'
                />
              </div>

              <div className='flex items-center gap-1 text-xs'>
                {[
                  { id: 'all', label: t('canvaSidebar.bibleCatAll') },
                  { id: 'character', label: t('canvaSidebar.bibleCatCharacter') },
                  { id: 'location', label: t('canvaSidebar.bibleCatLocation') },
                  { id: 'lore', label: t('canvaSidebar.bibleCatLore') },
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

            {/* Danh sách tra cứu gọn, ưu tiên thực thể trong khung/trang hiện tại */}
            <div className='flex-1 overflow-y-auto p-3 custom-scrollbar'>
              {filteredBible.length === 0 ? (
                <div className='py-12 px-3 text-center text-[var(--sb-muted)] text-xs italic'>
                  {bibleEntities.length === 0 && !isLoadingBible
                    ? t('canvaSidebar.bibleEmpty')
                    : t('canvaSidebar.bibleNoMatch')}
                </div>
              ) : (
                <div className='space-y-4'>
                  {contextualBible.length > 0 && (
                    <section aria-labelledby='bible-context-heading' className='space-y-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <h3
                          id='bible-context-heading'
                          className='text-xs font-bold text-[var(--sb-text)]'
                        >
                          {selectedPanelId || selectedPanelNumber != null
                            ? t('canvaSidebar.bibleContextPanel', {
                                panel: selectedPanelNumber ?? '',
                              })
                            : t('canvaSidebar.bibleContextPage', { page: activePageNumber })}
                        </h3>
                        <span className='text-xs text-[var(--sb-muted)]'>
                          {t('canvaSidebar.bibleEntryCount', { count: contextualBible.length })}
                        </span>
                      </div>
                      <div className='space-y-2'>{contextualBible.map(renderBibleEntity)}</div>
                    </section>
                  )}

                  {otherBible.length > 0 && (
                    <section aria-labelledby='bible-other-heading' className='space-y-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <h3
                          id='bible-other-heading'
                          className='text-xs font-bold text-[var(--sb-text)]'
                        >
                          {contextualBible.length > 0
                            ? t('canvaSidebar.bibleOtherReferences')
                            : t('canvaSidebar.bibleAllReferences')}
                        </h3>
                        <span className='text-xs text-[var(--sb-muted)]'>
                          {t('canvaSidebar.bibleEntryCount', { count: otherBible.length })}
                        </span>
                      </div>
                      <div className='space-y-2'>{otherBible.map(renderBibleEntity)}</div>
                    </section>
                  )}
                </div>
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
            className='flex flex-col h-full overflow-hidden bg-white'
          >
            {/* Header Drawer Templates */}
            <div className='p-3.5 border-b border-[#E7E5E4] bg-white shrink-0 flex flex-col gap-2.5'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-1.5'>
                  <span className='font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-[#E7E5E4] tracking-wider'>
                    {t('canvaSidebar.templatesBadge')}
                  </span>
                  {isLoadingTemplates && (
                    <span className='text-xs text-stone-500 animate-pulse'>
                      {t('canvaSidebar.templatesLoading')}
                    </span>
                  )}
                  {isApplyingTemplate && (
                    <span className='text-xs text-[#EA580C] animate-pulse font-medium'>
                      {t('canvaSidebar.templatesApplying')}
                    </span>
                  )}
                </div>
                <span className='text-xs font-semibold text-[#EA580C]'>
                  {t('canvaSidebar.pageLabel', { page: activePageNumber })}
                </span>
              </div>

              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <h2 className='text-[14px] font-semibold text-stone-900 leading-tight'>
                    {t('canvaSidebar.templatesTitle')}
                  </h2>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t('canvaSidebar.templatesSubtitle', { page: activePageNumber })}
                  </p>
                </div>

                {(hasPagePanels || activeTemplateId) && onClearTemplate && !layoutLocked && (
                  <button
                    type='button'
                    onClick={onClearTemplate}
                    data-testid='canva-btn-clear-template'
                    title={t('canvaSidebar.clearTemplateTitle')}
                    className='shrink-0 inline-flex items-center gap-1 border border-[#E7E5E4] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium px-2 py-1 rounded transition-colors cursor-pointer'
                  >
                    <RotateCcw className='w-3.5 h-3.5' />
                    <span>{t('canvaSidebar.resetBtn')}</span>
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className='relative'>
                <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
                <input
                  type='text'
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder={t('canvaSidebar.searchTemplatesPlaceholder')}
                  data-testid='canva-input-search-templates'
                  className='w-full text-xs pl-8 pr-2.5 py-1.5 bg-[#FAF9F5] border border-[#E7E5E4] rounded text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] focus:border-[#EA580C]'
                />
              </div>

              {/* 1. Bộ lọc Nhóm Mục đích Kể chuyện */}
              <div className='flex items-center gap-1 overflow-x-auto pb-0.5'>
                {[
                  { id: 'all', label: t('canvaSidebar.tplCatAll') },
                  { id: 'narrative', label: t('canvaSidebar.tplCatNarrative') },
                  { id: 'action', label: t('canvaSidebar.tplCatAction') },
                  { id: 'cinematic', label: t('canvaSidebar.tplCatCinematic') },
                  { id: 'webtoon', label: t('canvaSidebar.tplCatWebtoon') },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type='button'
                    onClick={() => setTemplateCategoryFilter(cat.id as any)}
                    className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      templateCategoryFilter === cat.id
                        ? 'bg-[#EA580C] text-white font-semibold'
                        : 'bg-[#FAF9F5] text-stone-600 hover:text-stone-900 border border-[#E7E5E4] font-medium'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* 2. Bộ lọc số lượng khung */}
              <div className='flex items-center gap-1.5'>
                {[
                  { id: 'all', label: t('canvaSidebar.tplCountAll') },
                  { id: '1-2', label: t('canvaSidebar.tplCount12') },
                  { id: '3', label: t('canvaSidebar.tplCount3') },
                  { id: '4+', label: t('canvaSidebar.tplCount4Plus') },
                ].map((f) => (
                  <button
                    key={f.id}
                    type='button'
                    onClick={() => setTemplateCountFilter(f.id as any)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      templateCountFilter === f.id
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {templateError && (
                <div className='px-2.5 py-1.5 rounded bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs text-rose-700'>
                  <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                  <span className='truncate'>{templateError}</span>
                </div>
              )}
            </div>

            {/* Lưới thẻ mẫu khung */}
            <div className='flex-1 overflow-y-auto p-3 custom-scrollbar'>
              {filteredTemplates.length === 0 ? (
                <div className='py-12 px-3 text-center text-stone-500 text-xs italic'>
                  {t('canvaSidebar.templatesEmpty')}
                </div>
              ) : (
                <div className='grid grid-cols-2 gap-2.5 content-start'>
                  {filteredTemplates.map((tpl) => {
                    const isSelected = tpl.id === activeTemplateId;
                    const catBadge =
                      tpl.category === 'action'
                        ? {
                            label: t('canvaSidebar.tplCatAction'),
                            cls: 'bg-rose-50 text-rose-700',
                          }
                        : tpl.category === 'cinematic'
                          ? {
                              label: t('canvaSidebar.tplCatCinematic'),
                              cls: 'bg-stone-100 text-stone-700',
                            }
                          : tpl.category === 'webtoon'
                            ? {
                                label: t('canvaSidebar.tplCatWebtoon'),
                                cls: 'bg-emerald-50 text-emerald-700',
                              }
                            : {
                                label: t('canvaSidebar.tplCatNarrative'),
                                cls: 'bg-blue-50 text-blue-700',
                              };

                    return (
                      <button
                        key={tpl.id}
                        type='button'
                        disabled={isApplyingTemplate || layoutLocked}
                        onClick={() => {
                          if (!layoutLocked) onSelectTemplate?.(tpl);
                        }}
                        data-testid={`canva-template-card-${tpl.id}`}
                        title={tpl.description || tpl.name}
                        className={`group text-left rounded-lg p-2 flex flex-col gap-1.5 relative transition-colors ${
                          isSelected
                            ? 'bg-orange-50/60 border-2 border-[#EA580C] cursor-pointer'
                            : 'bg-white border border-[#E7E5E4] hover:border-stone-400 cursor-pointer'
                        }`}
                      >
                        {/* Wireframe Preview tỷ lệ B5 / Spread */}
                        <div className='w-full h-28 bg-stone-100 rounded flex items-center justify-center p-2 relative overflow-hidden'>
                          <div
                            className={`${
                              tpl.layoutFormat === 'SpreadDouble'
                                ? 'aspect-[3/2] w-full max-h-full'
                                : 'aspect-[2/3] h-full'
                            } bg-white border ${
                              isSelected ? 'border-[#EA580C]/40' : 'border-stone-300'
                            } relative overflow-hidden`}
                          >
                            {(tpl.slots || []).map((s, idx) => {
                              const isInsetChild = tpl.code === 'TPL-MANGA-06' && idx > 0;
                              const hasCorners = Boolean(s.corners && s.corners.length >= 3);
                              return (
                                <div
                                  key={idx}
                                  className={`absolute flex items-center justify-center font-mono text-xs font-semibold transition-colors ${
                                    hasCorners
                                      ? ''
                                      : s.borderless
                                        ? 'border border-dashed border-[#EA580C]'
                                        : isSelected
                                          ? 'border border-[#EA580C]'
                                          : 'border border-stone-800'
                                  } ${
                                    isInsetChild
                                      ? 'bg-white z-10 text-stone-700 border border-stone-800'
                                      : isSelected
                                        ? 'bg-white text-[#EA580C]'
                                        : 'bg-white text-stone-700'
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
                                        fill='#ffffff'
                                        stroke={isSelected ? '#EA580C' : '#292524'}
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
                            <div className='absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#EA580C] text-white flex items-center justify-center'>
                              <Check className='w-3 h-3' />
                            </div>
                          )}
                        </div>

                        {/* Tên & Phân loại + số lượng khung */}
                        <div
                          className='text-xs font-semibold text-stone-900 truncate w-full'
                          title={tpl.name}
                        >
                          {tpl.name}
                        </div>
                        <div className='flex items-center justify-between w-full'>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${catBadge.cls}`}
                          >
                            {catBadge.label}
                          </span>
                          <span
                            className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 ${
                              isSelected
                                ? 'bg-[#EA580C] text-white font-semibold'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {t('canvaSidebar.templatePanelCount', {
                              count: tpl.panelCount || (tpl.slots?.length ?? 0),
                            })}
                          </span>
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
          <div
            data-testid='canva-drawer-changes'
            className='flex flex-col h-full overflow-hidden bg-white'
          >
            {/* Header Drawer */}
            <div className='p-4 pb-3 border-b border-[#E7E5E4] shrink-0 space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-1.5 text-stone-900 font-semibold text-sm'>
                  <AlertCircle className='w-4 h-4 text-[#EA580C] shrink-0' />
                  <h3>{t('canvaSidebar.changesTitle')}</h3>
                </div>
                {openChangeRequestsCount > 0 && (
                  <span className='px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 shrink-0'>
                    {changeRequests.length > 0
                      ? t('canvaSidebar.changesRemainingRatio', {
                          open: openChangeRequestsCount,
                          total: changeRequests.length,
                        })
                      : t('canvaSidebar.changesOpenCount', { count: openChangeRequestsCount })}
                  </span>
                )}
              </div>

              <p className='text-xs text-stone-500 leading-relaxed'>
                {t('canvaSidebar.changesSubtitle')}
              </p>
            </div>

            {/* Danh sách Yêu cầu chỉnh sửa */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
              {isLoadingChangeRequests ? (
                <div className='flex flex-col items-center justify-center py-12 gap-2 text-stone-500'>
                  <Loader2 className='w-5 h-5 animate-spin text-[#EA580C]' />
                  <span className='text-xs'>{t('canvaSidebar.changesLoading')}</span>
                </div>
              ) : changeRequests.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center p-4 space-y-2'>
                  <div className='w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center'>
                    <CheckCircle2 className='w-5 h-5' />
                  </div>
                  <div className='text-xs font-semibold text-stone-900'>
                    {t('canvaSidebar.changesEmptyTitle')}
                  </div>
                  <div className='text-xs text-stone-500 max-w-[220px]'>
                    {t('canvaSidebar.changesEmptyAll')}
                  </div>
                </div>
              ) : (
                changeRequests.map((cr) => {
                  const statusStr = String(cr.status).toLowerCase();
                  const isOpen = statusStr === 'open' || statusStr === '0' || cr.status === 0;
                  const isResolved =
                    statusStr === 'resolved' || statusStr === '1' || cr.status === 1;
                  const isVerified =
                    statusStr === 'verified' || statusStr === '2' || cr.status === 2;
                  const crAny = cr as ChangeRequestDto & {
                    pageNumber?: number;
                    panelNumber?: number;
                    priority?: string;
                  };
                  const locationText =
                    crAny.pageNumber && crAny.panelNumber
                      ? `${t('canvaSidebar.pageLabel', { page: crAny.pageNumber })} · ${t('scriptRefSidebar.panelCardTitle', { panelNum: crAny.panelNumber })}`
                      : crAny.pageNumber
                        ? t('canvaSidebar.pageLabel', { page: crAny.pageNumber })
                        : null;
                  const isUrgent = isOpen && String(crAny.priority || '').toLowerCase() === 'high';
                  const feedbackText = cr.reviewerComment || cr.description;
                  const showSeparateDescription =
                    Boolean(cr.description) &&
                    Boolean(cr.reviewerComment) &&
                    cr.description.trim() !== cr.reviewerComment?.trim();

                  const markNumber = markNumberById[cr.id];

                  return (
                    <div
                      key={cr.id}
                      data-testid={`change-request-card-${cr.id}`}
                      className='bg-white border border-[#E7E5E4] rounded-lg p-3 flex flex-col gap-2.5 shadow-2xs'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-1.5 min-w-0'>
                          {markNumber !== undefined && (
                            <span
                              data-testid={`cr-mark-number-${cr.id}`}
                              className='w-5 h-5 min-w-5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shrink-0'
                            >
                              {markNumber}
                            </span>
                          )}
                          {locationText ? (
                            <span
                              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${
                                isUrgent
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : isOpen
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-stone-100 border-[#E7E5E4] text-stone-700'
                              }`}
                            >
                              {locationText}
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                                isOpen
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : isResolved
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : isVerified
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-stone-100 border-[#E7E5E4] text-stone-700'
                              }`}
                            >
                              {isOpen
                                ? t('canvaSidebar.crStatusOpen')
                                : isResolved
                                  ? t('canvaSidebar.crStatusResolved')
                                  : isVerified
                                    ? t('canvaSidebar.crStatusVerified')
                                    : t('canvaSidebar.crStatusClosed')}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-xs font-medium flex items-center gap-1 shrink-0 ${
                            isUrgent
                              ? 'text-rose-600'
                              : isOpen
                                ? 'text-amber-600'
                                : isVerified
                                  ? 'text-emerald-600'
                                  : 'text-stone-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isUrgent
                                ? 'bg-rose-600'
                                : isOpen
                                  ? 'bg-amber-500'
                                  : isVerified
                                    ? 'bg-emerald-600'
                                    : 'bg-stone-400'
                            }`}
                          />
                          {isUrgent
                            ? t('canvaSidebar.crUrgentStatus')
                            : isOpen
                              ? t('canvaSidebar.crStatusOpen')
                              : isResolved
                                ? t('canvaSidebar.crStatusResolved')
                                : isVerified
                                  ? t('canvaSidebar.crStatusVerified')
                                  : t('canvaSidebar.crStatusClosed')}
                        </span>
                      </div>

                      {showSeparateDescription && (
                        <p className='text-xs text-stone-900 font-medium leading-relaxed whitespace-pre-wrap'>
                          {cr.description}
                        </p>
                      )}

                      {feedbackText && (
                        <div>
                          <span className='text-xs uppercase text-stone-500 block font-semibold'>
                            {t('canvaSidebar.crReviewerCommentLabel')}
                          </span>
                          <p className='text-xs text-stone-800 mt-1 bg-[#FAF9F5] border border-[#E7E5E4] p-2 rounded leading-relaxed whitespace-pre-wrap'>
                            &ldquo;{feedbackText}&rdquo;
                          </p>
                        </div>
                      )}

                      {cr.resolutionNote && !isOpen && (
                        <div>
                          <span className='text-xs uppercase text-stone-500 block font-semibold'>
                            {t('canvaSidebar.crResolutionNoteLabel')}
                          </span>
                          <p className='text-xs text-emerald-800 mt-1 bg-emerald-50/70 border border-emerald-200 p-2 rounded leading-relaxed'>
                            {cr.resolutionNote}
                          </p>
                        </div>
                      )}

                      {isOpen && onResolveChangeRequest && (
                        <div>
                          <label
                            htmlFor={`cr-note-${cr.id}`}
                            className='text-xs uppercase text-stone-500 block mb-1 font-semibold'
                          >
                            {t('canvaSidebar.crResolutionNoteLabel')}
                          </label>
                          <textarea
                            id={`cr-note-${cr.id}`}
                            rows={2}
                            value={resolveNoteByCrId[cr.id] || ''}
                            onChange={(e) =>
                              setResolveNoteByCrId((prev) => ({ ...prev, [cr.id]: e.target.value }))
                            }
                            placeholder={t('canvaSidebar.crResolutionPlaceholder')}
                            className='w-full text-xs p-2 bg-[#FAF9F5] border border-[#E7E5E4] rounded text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#EA580C] focus:border-[#EA580C] resize-none placeholder:text-stone-400'
                          />
                        </div>
                      )}

                      {cr.dueDate && (
                        <div className='text-xs text-stone-500 flex items-center gap-1'>
                          <Clock className='w-3 h-3' />
                          <span>
                            {t('canvaSidebar.crDueDate', {
                              date: new Date(cr.dueDate).toLocaleDateString(
                                lang === 'en' ? 'en-US' : 'vi-VN',
                              ),
                            })}
                          </span>
                        </div>
                      )}

                      <div className='flex items-center justify-end gap-2 pt-0.5'>
                        {onNavigateToChangeRequestTarget && hasChangeRequestLocation(cr) && (
                          <button
                            type='button'
                            onClick={() => onNavigateToChangeRequestTarget(cr)}
                            data-testid={`btn-navigate-cr-${cr.id}`}
                            className='border border-[#E7E5E4] bg-white hover:bg-stone-50 text-stone-700 text-xs px-2.5 py-1 rounded transition-colors cursor-pointer'
                          >
                            {t('canvaSidebar.crViewLocationBtn')}
                          </button>
                        )}

                        {isOpen && onResolveChangeRequest && (
                          <button
                            type='button'
                            disabled={isResolvingChangeRequest}
                            onClick={() => {
                              onResolveChangeRequest?.(cr.id, resolveNoteByCrId[cr.id]);
                            }}
                            data-testid={`btn-resolve-cr-${cr.id}`}
                            className='border border-[#EA580C] text-[#EA580C] bg-white hover:bg-orange-50 text-xs px-2.5 py-1 rounded transition-colors font-medium cursor-pointer disabled:opacity-50'
                          >
                            {t('canvaSidebar.crReportResolvedBtn')}
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
                    {t('canvaSidebar.historyTitle')}
                  </h3>
                </div>
                {onRefreshHistory && (
                  <button
                    type='button'
                    onClick={onRefreshHistory}
                    data-testid='btn-refresh-history'
                    title={t('canvaSidebar.historyRefreshTitle')}
                    className='w-6 h-6 rounded-md hover:bg-[var(--sb-surface-hover)] text-[var(--sb-muted)] hover:text-[var(--sb-text)] flex items-center justify-center transition-colors cursor-pointer'
                  >
                    <RotateCcw className='w-3.5 h-3.5' />
                  </button>
                )}
              </div>

              <div className='flex items-center justify-between text-xs text-[var(--sb-muted)]'>
                <span>
                  {t('canvaSidebar.pageLabel', {
                    page: selectedPage?.pageNumber || activePageNumber,
                  })}
                </span>
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
                  <span className='text-xs'>{t('canvaSidebar.historyLoading')}</span>
                </div>
              ) : !pageHistory || !pageHistory.items || pageHistory.items.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-center space-y-2 text-[var(--sb-muted)]'>
                  <Clock className='w-6 h-6 text-stone-400' />
                  <div className='text-xs font-semibold text-[var(--sb-text)]'>
                    {t('canvaSidebar.historyInitialTitle')}
                  </div>
                  <div className='text-xs leading-relaxed max-w-[200px]'>
                    {t('canvaSidebar.historyInitialDesc')}
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
                          return t('canvaSidebar.eventPageCreated');
                        case 'ElementAdded':
                          return t('canvaSidebar.eventElementAdded');
                        case 'ElementMoved':
                          return t('canvaSidebar.eventElementMoved');
                        case 'ElementRemoved':
                          return t('canvaSidebar.eventElementRemoved');
                        case 'ElementRestored':
                          return t('canvaSidebar.eventElementRestored');
                        case 'CanvasUpdated':
                          return t('canvaSidebar.eventCanvasUpdated');
                        case 'VersionRestored':
                          return t('canvaSidebar.eventVersionRestored');
                        default:
                          return entry.eventType || t('canvaSidebar.eventDefault');
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
                            <span className='px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20'>
                              {t('canvaSidebar.historyCurrentBadge')}
                            </span>
                          )}
                        </div>

                        <div className='text-xs text-[var(--sb-muted)]'>{eventLabel}</div>

                        {!isCurrent && onRestoreVersion && (
                          <div className='pt-1'>
                            {isConfirming ? (
                              <div className='p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in duration-150'>
                                <div className='text-xs text-amber-700 dark:text-amber-300 font-semibold'>
                                  {t('canvaSidebar.historyRestoreConfirmTitle', {
                                    version: entry.version,
                                  })}
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
                                    className='flex-1 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-colors'
                                  >
                                    {isRestoringVersion
                                      ? t('canvaSidebar.historyRestoring')
                                      : t('canvaSidebar.confirmBtn')}
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => setConfirmRestoreVersion(null)}
                                    className='px-2 py-1.5 rounded text-xs text-[var(--sb-muted)] hover:bg-[var(--sb-surface-hover)] cursor-pointer'
                                  >
                                    {t('canvaSidebar.cancelBtn')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type='button'
                                onClick={() => setConfirmRestoreVersion(entry.version)}
                                data-testid={`btn-restore-v${entry.version}`}
                                className='text-xs font-semibold text-[var(--sb-accent)] hover:underline flex items-center gap-1 cursor-pointer'
                              >
                                <RotateCcw className='w-3 h-3' />
                                <span>{t('canvaSidebar.historyRestoreBtn')}</span>
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
          <LetteringScriptPanel
            chapterTitle={chapterTitle}
            scriptLines={scriptLines}
            chapterPanels={chapterPanels}
            activePageNumber={activePageNumber}
            pageId={selectedPageId}
            elements={letteringElements}
            selectedElementId={selectedElementId}
            pendingElementIds={pendingElementIds}
            onSelectElementId={onSelectElementId}
            onAddElement={onAddLetteringElement}
            onUpdateElementTranslation={
              onUpdateElementTranslation
                ? async (_pId, elemId, _lang, text) => {
                    await onUpdateElementTranslation(elemId, text);
                  }
                : undefined
            }
            linkedScriptLineIds={linkedScriptLineIds}
            headerSlot={letteringHeaderSlot}
            activeLang={activeLang}
            originalLang={originalLang}
            translationReadOnly={translationReadOnly}
            readOnly={letteringReadOnly}
          />
        )}
      </aside>
    </div>
  );
};

export default ArtistCanvaSidebar;
