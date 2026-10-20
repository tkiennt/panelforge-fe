import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ChevronDown,
  Layers,
  Eye,
  Edit3,
  X,
  History,
  GitCommit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Trash2,
  Loader2,
  LayoutGrid,
  List,
  RotateCcw,
  User,
  MapPin,
  BookMarked,
  Palette,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { BibleEntity, BibleCategory, MangaProject, normalizeWorkspaceRole } from '@/types';
import { bibleService, BibleEntryRevisionDto, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { AddEntityModal } from './AddEntityModal';
import { BibleEntityDetailModal } from './BibleEntityDetailModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/lib/i18n';

interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  entities?: BibleEntity[];
  onAddEntity?: (entity: BibleEntity) => void;
  onEditEntity?: (entity: BibleEntity) => void;
  onSelectSeries?: (project: MangaProject) => void;
  onShowToast: (title: string, desc: string) => void;
}

const CATEGORIES: {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: 'all', label: 'Tất cả', icon: BookOpen },
  { key: 'characters', label: 'Nhân vật', icon: User },
  { key: 'locations', label: 'Địa điểm & Bối cảnh', icon: MapPin },
  { key: 'terminology', label: 'Thuật ngữ & Đạo cụ', icon: BookMarked },
  { key: 'style', label: 'Quy tắc mỹ thuật', icon: Palette },
];

const mapCategoryToTab = (cat: any): BibleCategory => {
  if (typeof cat === 'string') {
    const s = cat.toLowerCase();
    if (s.includes('char')) return 'characters';
    if (s.includes('loc')) return 'locations';
    if (s.includes('style') || s.includes('rule')) return 'style';
    if (s.includes('prop') || s.includes('term') || s.includes('plot') || s.includes('lore'))
      return 'terminology';
  }
  switch (Number(cat)) {
    case 0:
    case 1:
      return 'characters';
    case 2:
      return 'locations';
    case 3:
    case 4:
    case 6:
      return 'terminology';
    case 5:
      return 'style';
    default:
      return 'characters';
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'characters':
    case 'character':
      return 'Nhân vật';
    case 'locations':
    case 'location':
      return 'Địa điểm';
    case 'terminology':
    case 'prop':
      return 'Thuật ngữ & Đạo cụ';
    case 'style':
    case 'rule':
      return 'Quy tắc mỹ thuật';
    default:
      return 'Mục tri thức';
  }
};

const getCategoryIcon = (category: string, className = 'w-4 h-4') => {
  switch (category) {
    case 'characters':
    case 'character':
      return <User className={className} />;
    case 'locations':
    case 'location':
      return <MapPin className={className} />;
    case 'terminology':
    case 'prop':
      return <BookMarked className={className} />;
    case 'style':
    case 'rule':
      return <Palette className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

const mapEntryToBibleEntity = (entry: BibleEntryDto): BibleEntity => {
  let gallery: Array<{ url: string; label?: string; sha256?: string }> = [];
  try {
    const details = JSON.parse(entry.detailsJson || '{}');
    if (Array.isArray(details.turnaroundGallery)) {
      gallery = details.turnaroundGallery;
    }
  } catch {
    // ignore
  }

  return {
    id: entry.id,
    code: entry.code || `ENT-${entry.id.substring(0, 4)}`,
    name: entry.name,
    subtitle: entry.subtitle || '',
    category: mapCategoryToTab(entry.category),
    description: entry.description || '',
    tags: [entry.code || 'BIBLE'],
    imageUrl: entry.referenceImageUrl || '',
    status: entry.isActive ? 'Active' : 'Draft',
    isLocked: entry.effectiveRevision?.isLocked ?? false,
    lockedAt: entry.effectiveRevision?.lockedAt ?? null,
    gallery,
  };
};

/** Đọc snapshot JSON an toàn */
const readSnapshot = (
  json?: string,
): {
  Name?: string;
  Subtitle?: string | null;
  Description?: string;
  ReferenceImageUrl?: string | null;
} => {
  try {
    return JSON.parse(json || '{}') ?? {};
  } catch {
    return {};
  }
};

export const SeriesBibleView: React.FC<SeriesBibleViewProps> = ({
  activeProject,
  workspaceId,
  entities = [],
  onAddEntity,
  onEditEntity,
  onSelectSeries,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [localEntities, setLocalEntities] = useState<BibleEntity[]>(entities);
  const [rawEntries, setRawEntries] = useState<Record<string, BibleEntryDto>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('panelforge_bible_view_mode') as 'grid' | 'list') || 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('panelforge_bible_view_mode', mode);
  };

  // Modals & Details
  const [selectedEntity, setSelectedEntity] = useState<BibleEntity | null>(null);
  const [selectedImageZoom, setSelectedImageZoom] = useState<{ url: string; title: string } | null>(
    null,
  );
  const [addEntityOpen, setAddEntityOpen] = useState(false);

  // Dynamic Series resolution
  const [availableSeries, setAvailableSeries] = useState<MangaProject[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(activeProject?.id || '');

  useEffect(() => {
    const loadSeries = async () => {
      try {
        const rawWs = localStorage.getItem('activeWorkspace');
        const ws = rawWs ? JSON.parse(rawWs) : null;
        const targetWsId = workspaceId || ws?.id;
        if (targetWsId) {
          const list = await seriesService.getSeriesList(targetWsId);
          const mapped: MangaProject[] = list.map((s) => ({
            id: s.id,
            title: s.title,
            subtitle: s.synopsis || 'Studio Production Serial',
            arc: 'Arc 01',
            chapter: s.chaptersCount || 1,
            format: s.format || 'B5 Tankōbon',
            status: 'In Production',
            progressPercent: 0,
            completedPages: 0,
            totalPages: 32,
            dueDate: 'Dec 2026',
            daysLeft: 12,
            genres: s.genre ? s.genre.split(',').map((g) => g.trim()) : ['Manga'],
            coverStyle: 'halftone-cyber',
            coverText: s.title.toUpperCase(),
            tagline: s.synopsis || '',
            lastUpdated: s.updatedAt || s.createdAt || 'Vừa xong',
          }));
          setAvailableSeries(mapped);
          if (!activeProject?.id && mapped.length > 0) {
            setSelectedSeriesId(mapped[0].id);
            if (onSelectSeries) onSelectSeries(mapped[0]);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách Series cho Bible:', err);
      }
    };
    loadSeries();
  }, [workspaceId, activeProject?.id, onSelectSeries]);

  useEffect(() => {
    if (activeProject?.id) {
      setSelectedSeriesId(activeProject.id);
    }
  }, [activeProject?.id]);

  const effectiveSeries = useMemo(() => {
    if (activeProject && (!selectedSeriesId || activeProject.id === selectedSeriesId)) {
      return activeProject;
    }
    return availableSeries.find((s) => s.id === selectedSeriesId) || activeProject;
  }, [activeProject, selectedSeriesId, availableSeries]);

  // BR-15: Chapter-Versioned State
  const [effectiveChapter, setEffectiveChapter] = useState<number | 'all'>('all');
  const [seriesChapters, setSeriesChapters] = useState<ChapterDto[]>([]);

  useEffect(() => {
    if (!effectiveSeries?.id) {
      setSeriesChapters([]);
      return;
    }
    const loadChapters = async () => {
      try {
        const res = await chapterService.getChaptersBySeries(effectiveSeries.id, 1, 100);
        setSeriesChapters(res.items || []);
      } catch (err) {
        console.warn('Lỗi tải Chapters cho Series Bible:', err);
        setSeriesChapters([]);
      }
    };
    loadChapters();
  }, [effectiveSeries?.id]);

  // BR-18: Revision History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRevisions, setHistoryRevisions] = useState<BibleEntryRevisionDto[]>([]);
  const [historyEntity, setHistoryEntity] = useState<BibleEntity | null>(null);
  const [historyEntityName, setHistoryEntityName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lockingRevisionId, setLockingRevisionId] = useState<string | null>(null);

  // User & Producer Role check (Direction B: Producer, Writer, Artist can create drafts)
  const currentUserRole = useMemo(() => {
    try {
      const rawWs = localStorage.getItem('activeWorkspace');
      const ws = rawWs ? JSON.parse(rawWs) : null;
      return normalizeWorkspaceRole(ws?.currentUserRole);
    } catch {
      return null;
    }
  }, []);

  const isProducer = useMemo(() => {
    try {
      const rawWs = localStorage.getItem('activeWorkspace');
      const ws = rawWs ? JSON.parse(rawWs) : null;
      const role = normalizeWorkspaceRole(ws?.currentUserRole);
      if (ws?.isOwner || role === 'PRODUCER') return true;

      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      if (
        user?.role === 'ADMINISTRATOR' ||
        user?.systemRole === 'ADMINISTRATOR' ||
        user?.canCreateStudio
      ) {
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  }, []);

  const canCreateDraft = useMemo(() => {
    if (isProducer) return true;
    return currentUserRole === 'WRITER' || currentUserRole === 'ARTIST';
  }, [isProducer, currentUserRole]);

  const handleLockRevision = async (rev: BibleEntryRevisionDto) => {
    if (!effectiveSeries?.id || !historyEntity) return;

    if (historyEntity.category !== 'characters') {
      onShowToast(
        'Chỉ áp dụng cho Nhân vật',
        'Theo quy tắc chuẩn Canon, chỉ có thể duyệt & khoá phiên bản thuộc nhóm Nhân vật.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn DUYỆT & KHOÁ phiên bản v${rev.versionNumber} của nhân vật "${historyEntity.name}" làm tham chiếu chuẩn?\n\n` +
        'Lưu ý: Sau khi khoá, phiên bản này được cố định để Artist và AI đối chiếu. ' +
        'Muốn đổi, Producer có thể tạo revision mới từ một chương khác, hoặc dùng tính năng Thay thế bản khoá.',
    );
    if (!confirmed) return;

    setLockingRevisionId(rev.id);
    try {
      const updatedRev = await bibleService.lockRevision(
        effectiveSeries.id,
        historyEntity.id,
        rev.id,
      );
      onShowToast(
        'Đã duyệt & khoá Character Sheet',
        `Phiên bản v${rev.versionNumber} của "${historyEntity.name}" đã được khoá làm tham chiếu chuẩn thành công.`,
      );
      setHistoryRevisions((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, ...updatedRev, isLocked: true } : r)),
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi khoá phiên bản', err.message || 'Không thể khoá phiên bản này.');
    } finally {
      setLockingRevisionId(null);
    }
  };

  // Add Revision Modal State
  const [addRevModalOpen, setAddRevModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<BibleEntity | null>(null);
  const [supersedeTarget, setSupersedeTarget] = useState<BibleEntryRevisionDto | null>(null);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [revisionName, setRevisionName] = useState('');
  const [revisionSubtitle, setRevisionSubtitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionStageName, setRevisionStageName] = useState('');
  const [revisionEffectiveChapter, setRevisionEffectiveChapter] = useState(
    effectiveSeries?.chapter || 1,
  );
  const [revisionEffectiveToChapter, setRevisionEffectiveToChapter] = useState<number | ''>('');
  const [expectedVersionNumber, setExpectedVersionNumber] = useState<number | null>(null);
  const [lockedChapterNumbers, setLockedChapterNumbers] = useState<number[]>([]);
  const [fetchingBaseVersion, setFetchingBaseVersion] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const [revisionReferenceImageUrl, setRevisionReferenceImageUrl] = useState('');
  const [uploadingRevImage, setUploadingRevImage] = useState(false);
  const revFileInputRef = useRef<HTMLInputElement>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRevFileUpload = async (file: File) => {
    if (!file || !effectiveSeries?.id) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onShowToast('Định dạng ảnh không hợp lệ', 'Hệ thống chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Dung lượng ảnh vượt giới hạn', 'Ảnh tối đa 10 MB.');
      return;
    }
    setUploadingRevImage(true);
    try {
      const res = await bibleService.uploadReferenceImage(effectiveSeries.id, file);
      setRevisionReferenceImageUrl(res.url);
      onShowToast(
        'Đã tải ảnh reference sheet mới',
        `${file.name} (${Math.round(res.sizeBytes / 1024)} KB)`,
      );
    } catch (err: any) {
      onShowToast('Lỗi tải ảnh tham chiếu', err.message || 'Không thể tải ảnh reference sheet.');
    } finally {
      setUploadingRevImage(false);
    }
  };

  const handleOpenAddRevision = async (
    entity: BibleEntity,
    supersede: BibleEntryRevisionDto | null = null,
  ) => {
    const snapshot = supersede ? readSnapshot(supersede.snapshotJson) : {};
    setRevisionTarget(entity);
    setSupersedeTarget(supersede);
    setRevisionSummary('');
    setRevisionName(snapshot.Name ?? entity.name);
    setRevisionSubtitle(snapshot.Subtitle ?? entity.subtitle ?? '');
    setRevisionDescription(snapshot.Description ?? entity.description ?? '');
    setRevisionReferenceImageUrl(snapshot.ReferenceImageUrl ?? entity.imageUrl ?? '');
    setRevisionStageName(supersede?.stageName || '');
    setRevisionEffectiveChapter(
      supersede
        ? supersede.effectiveFromChapterNumber
        : typeof effectiveChapter === 'number'
          ? effectiveChapter
          : effectiveSeries?.chapter || 1,
    );
    setRevisionEffectiveToChapter(supersede?.effectiveToChapterNumber ?? '');
    setExpectedVersionNumber(1);
    setLockedChapterNumbers([]);
    setAddRevModalOpen(true);

    if (effectiveSeries?.id) {
      setFetchingBaseVersion(true);
      try {
        const history = await bibleService.getEntryHistory(effectiveSeries.id, entity.id);
        if (history && history.length > 0) {
          const maxVer = Math.max(...history.map((h) => h.versionNumber));
          setExpectedVersionNumber(maxVer);
          const lockedChs = history
            .filter((h) => h.isLocked)
            .map((h) => h.effectiveFromChapterNumber);
          setLockedChapterNumbers(lockedChs);
        }
      } catch (err) {
        console.warn('Cannot fetch history for version tracking:', err);
      } finally {
        setFetchingBaseVersion(false);
      }
    }
  };

  // Fetch Series Bible from backend API
  const fetchBible = async () => {
    if (!effectiveSeries?.id) {
      setLocalEntities([]);
      setRawEntries({});
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const bibleData =
        effectiveChapter === 'all'
          ? await bibleService.getSeriesBible(effectiveSeries.id)
          : await bibleService.getSeriesBibleAtChapter(effectiveSeries.id, effectiveChapter);

      if (bibleData?.entries) {
        const rawMap: Record<string, BibleEntryDto> = {};
        bibleData.entries.forEach((e) => {
          rawMap[e.id] = e;
        });
        setRawEntries(rawMap);
        setLocalEntities(bibleData.entries.map(mapEntryToBibleEntity));
      } else {
        setLocalEntities([]);
        setRawEntries({});
      }
    } catch (err: any) {
      console.warn('Không thể tải Series Bible từ backend:', err);
      setLoadError(err.message || 'Không thể tải dữ liệu Series Bible từ máy chủ.');
      setLocalEntities([]);
      setRawEntries({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSeries?.id, effectiveChapter, refreshTrigger]);

  const handleCreateEntity = async (newEntity: any) => {
    if (!effectiveSeries?.id) {
      onShowToast('Chưa chọn Series', 'Vui lòng chọn một Series trước khi thêm mục.');
      return;
    }

    try {
      let catPayload: any = 'Character';
      if (newEntity.category === 'locations' || newEntity.category === 'location')
        catPayload = 'Location';
      else if (newEntity.category === 'prop') catPayload = 'Prop';
      else if (newEntity.category === 'terminology') catPayload = 'Terminology';
      else if (newEntity.category === 'style' || newEntity.category === 'rule')
        catPayload = 'StyleRule';

      const detailsPayload = JSON.stringify({
        turnaroundGallery: newEntity.gallery || [],
      });

      const created = await bibleService.createBibleEntry(effectiveSeries.id, {
        category: catPayload,
        code: newEntity.code,
        name: newEntity.name,
        subtitle: newEntity.subtitle,
        description: newEntity.description,
        detailsJson: detailsPayload,
        referenceImageUrl: newEntity.imageUrl || undefined,
        priority: 'Standard',
        strictCheck: true,
        stageName: newEntity.stageName?.trim() || undefined,
        effectiveFromChapterNumber:
          typeof newEntity.effectiveFromChapterNumber === 'number'
            ? newEntity.effectiveFromChapterNumber
            : typeof effectiveChapter === 'number'
              ? effectiveChapter
              : effectiveSeries.chapter || 1,
        effectiveToChapterNumber:
          typeof newEntity.effectiveToChapterNumber === 'number'
            ? newEntity.effectiveToChapterNumber
            : undefined,
      });

      setRefreshTrigger((prev) => prev + 1);
      const mapped = mapEntryToBibleEntity(created);
      if (onAddEntity) onAddEntity(mapped);
      onShowToast(
        isProducer ? 'Đã tạo mục Series Bible thành công' : 'Đã tạo bản nháp thành công',
        isProducer
          ? `Đã lưu "${created.name}" (${created.code}) vào cơ sở tri thức của bộ truyện.`
          : `Đã gửi bản nháp "${created.name}" (${created.code}) – chờ Producer duyệt.`,
      );
    } catch (err: any) {
      onShowToast('Lỗi thêm mục Bible', err.message || 'Không thể tạo bản ghi Series Bible.');
    }
  };

  const handleOpenHistory = async (entity: BibleEntity) => {
    setHistoryEntity(entity);
    setHistoryEntityName(entity.name);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      if (effectiveSeries?.id) {
        const history = await bibleService.getEntryHistory(effectiveSeries.id, entity.id);
        setHistoryRevisions(history || []);
      } else {
        setHistoryRevisions([]);
      }
    } catch {
      setHistoryRevisions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: localEntities.length,
      characters: 0,
      locations: 0,
      terminology: 0,
      style: 0,
    };
    localEntities.forEach((item) => {
      const cat = String(item.category);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [localEntities]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    return localEntities.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'LOCKED' && item.isLocked) ||
        (statusFilter === 'UNLOCKED' && !item.isLocked);

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [localEntities, activeTab, searchQuery, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== 'ALL' || activeTab !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setActiveTab('all');
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'characters':
        return 'Tìm tên, mã hoặc mô tả nhân vật...';
      case 'locations':
        return 'Tìm tên, mã hoặc mô tả địa điểm...';
      case 'terminology':
        return 'Tìm thuật ngữ, đạo cụ, cốt truyện...';
      case 'style':
        return 'Tìm quy tắc mỹ thuật, phong cách...';
      default:
        return 'Tìm tên, mã hoặc mô tả trong Series Bible...';
    }
  };

  return (
    <PageContainer className='space-y-4 pb-12 pt-1 font-sans'>
      {!effectiveSeries && (
        <div className='p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center gap-2.5 text-xs'>
          <AlertCircle className='w-4 h-4 text-amber-600 shrink-0' />
          <span>
            Chưa chọn Series nào trong Workspace. Hãy chọn một Series để xem và quản lý Series
            Bible.
          </span>
        </div>
      )}

      {/* Header gọn gàng: Breadcrumb, Tiêu đề, Mô tả, Chọn Series & Nút Thêm */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-4 sm:p-5 shadow-xs'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3.5'>
          <div className='min-w-0'>
            {/* Breadcrumb */}
            <div className='flex items-center gap-1.5 text-xs text-[#57534E] mb-1 flex-wrap font-medium'>
              <span>Trang chủ</span>
              <span>/</span>
              {availableSeries.length > 1 ? (
                <div className='inline-flex items-center gap-1'>
                  <span className='text-[#57534E] font-semibold'>Series:</span>
                  <select
                    value={effectiveSeries?.id || ''}
                    onChange={(e) => {
                      const found = availableSeries.find((s) => s.id === e.target.value);
                      if (found) {
                        setSelectedSeriesId(found.id);
                        if (onSelectSeries) onSelectSeries(found);
                      }
                    }}
                    className='px-2 py-0.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded font-semibold text-xs text-[#1C1917] focus:outline-none focus:border-[#F97316] cursor-pointer'
                  >
                    {availableSeries.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className='font-semibold text-[#1C1917]'>
                  {effectiveSeries?.title || 'PanelForge Series'}
                </span>
              )}
              <span>/</span>
              <span className='text-[#C2410C] font-semibold'>Series Bible</span>
            </div>

            {/* Title & Description */}
            <div className='flex items-center gap-2.5 flex-wrap'>
              <h1 className='text-xl sm:text-2xl font-bold font-serif text-[#1C1917] tracking-tight'>
                Series Bible
              </h1>
              <span className='px-2 py-0.5 rounded-full bg-[#F3F0E9] text-[#57534E] text-xs font-semibold font-mono border border-[#D8D2C5]'>
                {localEntities.length} mục tri thức
              </span>
            </div>
            <p className='text-xs text-[#57534E] mt-1 max-w-2xl'>
              {t('bible.subtitle')}
            </p>
          </div>

          {/* Action Button: Thêm mục / Bản nháp hoặc Badge Chỉ đọc */}
          <div className='flex items-center gap-2 shrink-0'>
            {canCreateDraft ? (
              <button
                type='button'
                onClick={() => setAddEntityOpen(true)}
                className='px-4 py-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95'
                data-testid='add-bible-entry-btn'
              >
                <Plus className='w-4 h-4' />
                <span>{isProducer ? 'Thêm mục mới' : 'Tạo mục nháp'}</span>
              </button>
            ) : (
              <span
                className='px-3 py-1.5 rounded-xl bg-[#F3F0E9] border border-[#D8D2C5] text-[#57534E] text-xs font-medium flex items-center gap-1.5'
                title='Chỉ Producer, Writer hoặc Artist mới có quyền thêm mục hoặc bản nháp trong Series Bible'
                data-testid='bible-readonly-badge'
              >
                <Lock className='w-3.5 h-3.5 text-[#78716C]' />
                <span>Chế độ chỉ xem</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thanh công cụ tra cứu tích hợp (Category Tabs + Search + Chapter + Filters + View Mode) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-3 sm:p-4 shadow-xs space-y-3'>
        {/* Category Tabs */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar border-b border-[#D8D2C5]/60'>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.key] || 0;
            const isActive = activeTab === cat.key;
            const getTabLabel = () => {
              switch (cat.key) {
                case 'all': return t('bible.categories.all');
                case 'characters': return t('bible.categories.character');
                case 'locations': return t('bible.categories.location');
                case 'terminology': return t('bible.categories.item');
                case 'style': return t('bible.categories.lore');
                default: return cat.label;
              }
            };
            return (
              <button
                key={cat.key}
                type='button'
                onClick={() => setActiveTab(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C]'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-transparent'
                }`}
                data-testid={`tab-category-${cat.key}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C2410C]' : 'text-[#78716C]'}`} />
                <span>{getTabLabel()}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#F97316]/20 text-[#C2410C] font-semibold' : 'bg-[#F3F0E9] text-[#78716C]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unified Search, Chapter Selector, Status Filter & View Mode */}
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-2.5'>
          {/* Search Input */}
          <div className='relative flex-1 min-w-[220px]'>
            <Search className='w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-9 pr-8 py-2 bg-[#F8F6F0] focus:bg-[#FCFBF8] rounded-lg border border-[#D8D2C5] text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#F97316] transition-colors'
              data-testid='bible-search-input'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                aria-label='Xóa từ khóa tìm kiếm'
                className='w-5 h-5 rounded-full hover:bg-[#E7E2D6] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer'
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>

          {/* Controls: Mốc chương, Trạng thái & Chế độ xem */}
          <div className='flex items-center gap-2 flex-wrap'>
            {/* Bộ chọn mốc chương */}
            <div className='flex items-center gap-1.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded-lg px-2.5 py-1 text-xs'>
              <Layers className='w-3.5 h-3.5 text-[#78716C] shrink-0' />
              <span className='text-[#57534E] font-medium text-[11px] whitespace-nowrap'>
                Hiệu lực tại:
              </span>
              <select
                value={effectiveChapter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  setEffectiveChapter(val);
                }}
                className='bg-transparent font-medium text-xs text-[#1C1917] focus:outline-none cursor-pointer pr-1'
                data-testid='bible-chapter-select'
                aria-label='Phiên bản hiệu lực theo chương'
                title='Chọn chương để xem phiên bản Bible có hiệu lực tại mốc chương đó'
              >
                <option value='all'>Đang xem: Phiên bản mới nhất</option>
                {seriesChapters.map((ch) => (
                  <option key={ch.id} value={ch.chapterNumber}>
                    Chương {ch.chapterNumber}
                    {ch.title ? ` - ${ch.title}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Bộ lọc trạng thái khóa Canon */}
            <div className='flex items-center gap-1.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded-lg px-2.5 py-1 text-xs'>
              <Lock className='w-3.5 h-3.5 text-[#78716C] shrink-0' />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className='bg-transparent font-medium text-xs text-[#1C1917] focus:outline-none cursor-pointer pr-1'
                data-testid='bible-status-filter'
                aria-label='Lọc trạng thái khóa Canon'
              >
                <option value='ALL'>Tất cả trạng thái</option>
                <option value='LOCKED'>Đã khoá Canon</option>
                <option value='UNLOCKED'>Chưa khoá / Bản thảo</option>
              </select>
            </div>

            {/* Chế độ xem Lưới / Danh sách */}
            <div className='flex items-center bg-[#F3F0E9] p-0.5 rounded-lg border border-[#D8D2C5]'>
              <button
                type='button'
                onClick={() => handleToggleViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#FCFBF8] text-[#1C1917] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title='Chế độ xem dạng lưới'
                aria-label='Xem dạng lưới'
              >
                <LayoutGrid className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={() => handleToggleViewMode('list')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#FCFBF8] text-[#1C1917] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title='Chế độ xem danh sách'
                aria-label='Xem dạng danh sách'
              >
                <List className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh kết quả lọc & Xóa bộ lọc */}
        {hasActiveFilters && (
          <div className='pt-2 border-t border-[#D8D2C5]/60 flex items-center justify-between text-xs text-[#57534E]'>
            <span>
              Tìm thấy <strong>{filteredEntities.length}</strong> / {localEntities.length} mục phù
              hợp
              {searchQuery && (
                <>
                  {' '}
                  với từ khóa &quot;<strong>{searchQuery}</strong>&quot;
                </>
              )}
            </span>
            <button
              type='button'
              onClick={handleResetFilters}
              className='text-[#C2410C] hover:underline font-semibold flex items-center gap-1 cursor-pointer'
            >
              <RotateCcw className='w-3 h-3' />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Loading, Error, Grid or List Cards */}
      {isLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-4 space-y-3 animate-pulse'
            >
              <div className='h-28 bg-[#F3F0E9] rounded-lg'></div>
              <div className='h-4 bg-[#E7E2D6] rounded w-2/3'></div>
              <div className='h-3 bg-[#F3F0E9] rounded w-1/2'></div>
              <div className='h-12 bg-[#F8F6F0] rounded'></div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className='bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3'>
          <AlertCircle className='w-8 h-8 text-red-500 mx-auto' />
          <div>
            <h3 className='font-bold font-serif text-sm text-red-900'>
              Không thể tải dữ liệu Series Bible
            </h3>
            <p className='text-xs text-red-700 mt-0.5'>{loadError}</p>
          </div>
          <button
            type='button'
            onClick={() => void fetchBible()}
            className='px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer'
          >
            Thử tải lại
          </button>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className='bg-[#FCFBF8] border border-dashed border-[#D8D2C5] rounded-xl p-10 text-center space-y-3'>
          <div className='w-12 h-12 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316] mx-auto'>
            <BookOpen className='w-6 h-6' />
          </div>
          {localEntities.length === 0 ? (
            <>
              <h3 className='font-bold font-serif text-base text-[#1C1917]'>
                Series Bible chưa có mục nào
              </h3>
              <p className='text-xs text-[#57534E] max-w-md mx-auto'>
                Thêm các nhân vật, địa điểm, đạo cụ hoặc quy tắc mỹ thuật để hỗ trợ họa sĩ và hệ
                thống kiểm tra nhất quán.
              </p>
              {canCreateDraft && (
                <button
                  type='button'
                  onClick={() => setAddEntityOpen(true)}
                  className='px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer'
                >
                  <Plus className='w-4 h-4' />
                  <span>{isProducer ? 'Tạo mục đầu tiên' : 'Tạo bản nháp đầu tiên'}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <h3 className='font-bold font-serif text-base text-[#1C1917]'>
                Không tìm thấy mục phù hợp
              </h3>
              <p className='text-xs text-[#57534E] max-w-md mx-auto'>
                Không có mục tri thức nào khớp với điều kiện lọc hiện tại. Thử đổi từ khóa hoặc xóa
                bộ lọc.
              </p>
              <button
                type='button'
                onClick={handleResetFilters}
                className='px-3.5 py-1.5 bg-[#F3F0E9] hover:bg-[#E7E2D6] text-[#1C1917] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer'
              >
                <RotateCcw className='w-3.5 h-3.5' />
                <span>Xóa bộ lọc</span>
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4'>
          {filteredEntities.map((entity) => {
            const raw = rawEntries[entity.id];
            const effRev = raw?.effectiveRevision;

            return (
              <div
                key={entity.id}
                onClick={() => setSelectedEntity(entity)}
                className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl overflow-hidden shadow-xs hover:border-[#F97316] hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer'
                data-testid={`bible-card-${entity.id}`}
              >
                <div>
                  {/* Top Thumbnail / Visual Header: Không để khoảng đen khổng lồ khi không có ảnh */}
                  {entity.imageUrl ? (
                    <div className='relative w-full h-36 bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-[#D8D2C5]'>
                      <AuthenticatedImage
                        src={entity.imageUrl}
                        alt={entity.name}
                        className='w-full h-full object-cover group-hover:scale-103 transition-transform duration-300'
                      />
                      <div className='absolute top-2 left-2 flex items-center gap-1.5 flex-wrap'>
                        <span className='px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold'>
                          {entity.code}
                        </span>
                        {entity.isLocked && (
                          <span
                            className='px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-medium flex items-center gap-1 shadow-2xs'
                            title='Character Sheet đã được Producer duyệt & khoá tham chiếu'
                          >
                            <Lock className='w-2.5 h-2.5' />
                            Đã khoá Canon
                          </span>
                        )}
                      </div>
                      <div className='absolute bottom-2 right-2'>
                        <span className='px-1.5 py-0.5 rounded bg-[#FCFBF8]/95 backdrop-blur-xs text-[#57534E] text-[10px] font-semibold border border-[#D8D2C5] shadow-xs'>
                          {getCategoryLabel(entity.category)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className='p-3 bg-[#F8F6F0] border-b border-[#D8D2C5] flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='w-7 h-7 rounded-lg bg-[#FCFBF8] border border-[#D8D2C5] flex items-center justify-center text-[#F97316] shadow-xs'>
                          {getCategoryIcon(entity.category, 'w-3.5 h-3.5')}
                        </div>
                        <span className='font-mono text-xs font-bold text-[#1C1917] bg-[#FCFBF8] px-1.5 py-0.5 rounded border border-[#D8D2C5]'>
                          {entity.code}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        {entity.isLocked ? (
                          <span
                            className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-medium flex items-center gap-1'
                            title='Character Sheet đã được Producer duyệt & khoá tham chiếu'
                          >
                            <Lock className='w-2.5 h-2.5 text-amber-600' />
                            Đã khoá Canon
                          </span>
                        ) : (
                          <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-[10px] font-medium'>
                            Bản thảo
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className='p-3.5 space-y-2'>
                    <div>
                      <h3 className='font-bold font-serif text-sm sm:text-base text-[#1C1917] group-hover:text-[#F97316] transition-colors line-clamp-1'>
                        {entity.name}
                        {effRev?.stageName ? (
                          <span className='font-sans font-medium text-[#57534E]'> · {effRev.stageName}</span>
                        ) : null}
                      </h3>
                      {entity.subtitle && (
                        <p className='text-xs text-[#57534E] font-medium line-clamp-1 mt-0.5'>
                          {entity.subtitle}
                        </p>
                      )}
                    </div>

                    <p
                      className='text-xs text-[#57534E] leading-relaxed line-clamp-2'
                      title={entity.description}
                    >
                      {entity.description || 'Chưa có mô tả chi tiết cho mục này.'}
                    </p>

                    {/* Stage & Chapter Range info */}
                    <div className='pt-2 border-t border-[#D8D2C5]/60 flex items-center justify-between text-[11px] text-[#57534E]'>
                      <span
                        className='font-medium text-[#1C1917] truncate max-w-[150px]'
                        title={effRev?.stageName || 'Giai đoạn chuẩn'}
                      >
                        {effRev?.stageName ? effRev.stageName : 'Giai đoạn chuẩn'}
                      </span>
                      <span className='text-[#C2410C] font-semibold font-mono'>
                        {effRev
                          ? effRev.effectiveToChapterNumber
                            ? `Ch.${effRev.effectiveFromChapterNumber}–${effRev.effectiveToChapterNumber}`
                            : `Ch.${effRev.effectiveFromChapterNumber} → hết`
                          : 'Ch.1 → hết'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className='p-2.5 bg-[#F8F6F0] border-t border-[#D8D2C5] flex items-center justify-between gap-1.5'>
                  <div className='flex items-center gap-1.5'>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity(entity);
                      }}
                      className='px-2.5 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-semibold text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer shadow-xs'
                    >
                      <Eye className='w-3 h-3 text-[#F97316]' />
                      <span>Xem chi tiết</span>
                    </button>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleOpenHistory(entity);
                      }}
                      className='px-2 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-medium text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer'
                      title='Xem lịch sử phiên bản'
                    >
                      <History className='w-3 h-3 text-[#78716C]' />
                      <span>Lịch sử</span>
                    </button>
                  </div>

                  {canCreateDraft && (
                    <div className='flex items-center gap-1'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenAddRevision(entity);
                        }}
                        className='px-2 py-1 bg-[#FCFBF8] hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs'
                        title={
                          isProducer
                            ? 'Tạo phiên bản mới có hiệu lực từ một chương'
                            : 'Tạo bản nháp mới – chờ Producer duyệt'
                        }
                        data-testid={`add-revision-btn-${entity.id}`}
                      >
                        <GitCommit className='w-3 h-3' />
                        <span>+ Bản</span>
                      </button>
                      {isProducer && onEditEntity && (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEntity(entity);
                          }}
                          className='p-1 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#FCFBF8] border border-transparent hover:border-[#D8D2C5] transition-colors cursor-pointer'
                          title='Chỉnh sửa nhanh'
                          data-testid={`edit-entity-btn-${entity.id}`}
                        >
                          <Edit3 className='w-3.5 h-3.5' />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className='space-y-2.5'>
          {filteredEntities.map((entity) => {
            const raw = rawEntries[entity.id];
            const effRev = raw?.effectiveRevision;

            return (
              <div
                key={entity.id}
                onClick={() => setSelectedEntity(entity)}
                className='bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] hover:border-[#F97316] p-3 sm:p-4 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer group'
                data-testid={`bible-list-item-${entity.id}`}
              >
                <div className='flex items-start sm:items-center gap-3.5 min-w-0 flex-1'>
                  {/* Thumbnail / Category Icon */}
                  <div className='w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#F8F6F0] overflow-hidden shrink-0 border border-[#D8D2C5] flex items-center justify-center'>
                    {entity.imageUrl ? (
                      <AuthenticatedImage
                        src={entity.imageUrl}
                        alt={entity.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full bg-[#F3F0E9] flex items-center justify-center text-[#F97316]'>
                        {getCategoryIcon(entity.category, 'w-5 h-5')}
                      </div>
                    )}
                  </div>

                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#1C1917] border border-[#D8D2C5]'>
                        {entity.code}
                      </span>
                      <h3 className='font-bold font-serif text-sm sm:text-base text-[#1C1917] group-hover:text-[#F97316] transition-colors truncate'>
                        {entity.name}
                        {effRev?.stageName ? (
                          <span className='font-sans font-medium text-[#57534E]'> · {effRev.stageName}</span>
                        ) : null}
                      </h3>
                      <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-[10px] font-medium'>
                        {getCategoryLabel(entity.category)}
                      </span>
                      {entity.isLocked && (
                        <span
                          className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-medium flex items-center gap-1'
                          title='Character Sheet đã được Producer duyệt & khoá tham chiếu'
                        >
                          <Lock className='w-2.5 h-2.5 text-amber-600' />
                          Đã khoá Canon
                        </span>
                      )}
                    </div>
                    {entity.subtitle && (
                      <p className='text-xs text-[#C2410C] font-medium truncate'>
                        {entity.subtitle}
                      </p>
                    )}
                    <p className='text-xs text-[#57534E] line-clamp-1'>
                      {entity.description || 'Chưa có mô tả cho mục này.'}
                    </p>
                  </div>
                </div>

                <div className='flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8D2C5]/60'>
                  <div className='text-right text-[11px] text-[#57534E] hidden md:block'>
                    <div className='font-semibold text-[#1C1917] truncate max-w-[140px]'>
                      {effRev?.stageName || 'Giai đoạn chuẩn'}
                    </div>
                    <div className='text-[#C2410C] font-mono font-medium'>
                      {effRev
                        ? effRev.effectiveToChapterNumber
                          ? `Ch.${effRev.effectiveFromChapterNumber}–${effRev.effectiveToChapterNumber}`
                          : `Ch.${effRev.effectiveFromChapterNumber} → hết`
                        : 'Ch.1 → hết'}
                    </div>
                  </div>

                  <div className='flex items-center gap-1.5'>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity(entity);
                      }}
                      className='px-2.5 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-semibold text-[#1C1917] flex items-center gap-1 cursor-pointer transition-colors shadow-xs'
                    >
                      <Eye className='w-3 h-3 text-[#F97316]' />
                      <span>Xem</span>
                    </button>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleOpenHistory(entity);
                      }}
                      className='px-2 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-medium text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer'
                      title='Lịch sử'
                    >
                      <History className='w-3 h-3 text-[#78716C]' />
                    </button>
                    {canCreateDraft && (
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenAddRevision(entity);
                        }}
                        className='px-2 py-1 bg-[#FCFBF8] hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs'
                        title={
                          isProducer ? 'Tạo phiên bản mới' : 'Tạo bản nháp mới – chờ Producer duyệt'
                        }
                        data-testid={`add-revision-btn-${entity.id}`}
                      >
                        <GitCommit className='w-3 h-3' />
                        <span className='hidden sm:inline'>{isProducer ? '+ Bản' : '+ Nháp'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedEntity && (
        <BibleEntityDetailModal
          entity={selectedEntity}
          rawEntry={rawEntries[selectedEntity.id]}
          isProducer={isProducer}
          canCreateDraft={canCreateDraft}
          onClose={() => setSelectedEntity(null)}
          onOpenHistory={(e) => {
            setSelectedEntity(null);
            void handleOpenHistory(e);
          }}
          onOpenAddRevision={(e) => {
            setSelectedEntity(null);
            void handleOpenAddRevision(e);
          }}
          onShowToast={onShowToast}
          onZoomImage={(img) => setSelectedImageZoom(img)}
        />
      )}

      {/* ZOOM IMAGE LIGHTBOX MODAL */}
      {selectedImageZoom &&
        createPortal(
          <div
            className='fixed inset-0 z-[1100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150'
            onClick={() => setSelectedImageZoom(null)}
            role='dialog'
            aria-modal='true'
          >
            <div
              className='relative max-w-4xl max-h-[90vh] flex flex-col items-center'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='w-full flex items-center justify-between pb-2.5 text-white text-xs'>
                <span className='font-bold font-mono'>
                  {selectedImageZoom.title} — Reference Sheet
                </span>
                <button
                  type='button'
                  onClick={() => setSelectedImageZoom(null)}
                  aria-label='Đóng xem ảnh'
                  className='p-1 rounded hover:bg-white/20 text-white transition-colors cursor-pointer'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='max-h-[82vh] overflow-hidden rounded-xl border border-white/20 bg-zinc-950 flex items-center justify-center'>
                <AuthenticatedImage
                  src={selectedImageZoom.url}
                  alt={selectedImageZoom.title}
                  className='max-h-[80vh] w-auto object-contain'
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* REVISION HISTORY MODAL */}
      {historyModalOpen &&
        createPortal(
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4'
            role='dialog'
            aria-modal='true'
            aria-labelledby='bible-history-modal-title'
          >
            <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
              <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
                <div className='flex items-center gap-2'>
                  <History className='w-4 h-4 text-[#F97316]' />
                  <h3
                    id='bible-history-modal-title'
                    className='text-sm font-bold font-sans text-zinc-900'
                  >
                    Lịch sử phiên bản: {historyEntityName}
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={() => setHistoryModalOpen(false)}
                  aria-label='Đóng'
                  className='w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-700'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              <div className='p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar'>
                <div className='text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 leading-relaxed'>
                  Dữ liệu lưu trữ bất biến (Append-only). Mỗi thay đổi tạo một phiên bản gắn với mốc
                  chương có hiệu lực và mã băm toàn vẹn dữ liệu.
                </div>

                {loadingHistory ? (
                  <div className='py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2'>
                    <Loader2 className='w-5 h-5 animate-spin text-[#F97316]' />
                    <span>Đang tải lịch sử phiên bản...</span>
                  </div>
                ) : historyRevisions.length === 0 ? (
                  <div className='py-8 text-center text-xs text-zinc-500'>
                    Chưa có phiên bản nào được ghi nhận.
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {/* Visual Stage Progression Timeline */}
                    <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3 space-y-1.5'>
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-zinc-700'>
                        <Layers className='w-3.5 h-3.5 text-[#F97316]' />
                        <span>Tiến trình các giai đoạn ({historyEntityName}):</span>
                      </div>
                      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar flex-wrap'>
                        {[...historyRevisions]
                          .sort(
                            (a, b) => a.effectiveFromChapterNumber - b.effectiveFromChapterNumber,
                          )
                          .map((r, idx, arr) => {
                            const stageTitle = r.stageName?.trim() || `Bản v${r.versionNumber}`;
                            const toStr = r.effectiveToChapterNumber
                              ? `Ch.${r.effectiveFromChapterNumber}–${r.effectiveToChapterNumber}`
                              : `Ch.${r.effectiveFromChapterNumber} → hết`;
                            return (
                              <React.Fragment key={r.id}>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                                    r.isLocked
                                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                      : 'bg-white border-zinc-200 text-zinc-700'
                                  }`}
                                >
                                  {r.isLocked && <Lock className='w-2.5 h-2.5 text-amber-600' />}
                                  <span>
                                    {stageTitle} ({toStr})
                                  </span>
                                </span>
                                {idx < arr.length - 1 && (
                                  <span className='text-zinc-400 font-bold'>→</span>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </div>
                    </div>

                    <div className='relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200'>
                      {historyRevisions.map((rev) => (
                        <div key={rev.id} className='relative group'>
                          <div className='absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#F97316]'></div>
                          <div className='bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E7E7] space-y-2'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <span className='px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10px] font-bold'>
                                  {rev.stageName ? rev.stageName : `VERSION ${rev.versionNumber}`}
                                  {rev.isInitialVersion ? ' (Khởi tạo)' : ''}
                                </span>
                                {rev.isLocked ? (
                                  <span className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-2xs'>
                                    <Lock className='w-2.5 h-2.5 text-amber-600' />
                                    ĐÃ KHOÁ CANON
                                  </span>
                                ) : (
                                  <span className='px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-medium'>
                                    Bản nháp – chờ Producer duyệt
                                  </span>
                                )}
                              </div>
                              <span className='text-[10px] font-mono text-zinc-500 flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                {new Date(rev.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className='text-xs font-semibold text-zinc-900'>{rev.summary}</div>

                            <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/70'>
                              <div className='flex items-center gap-2'>
                                <span className='px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold'>
                                  {rev.effectiveToChapterNumber
                                    ? `Chương ${rev.effectiveFromChapterNumber} – ${rev.effectiveToChapterNumber}`
                                    : `Hiệu lực từ Chương ${rev.effectiveFromChapterNumber} → hết`}
                                </span>
                                <span
                                  className='text-[10px] font-mono text-zinc-400 truncate max-w-[120px]'
                                  title={rev.contentHash}
                                >
                                  Hash: {rev.contentHash.substring(0, 8)}...
                                </span>
                              </div>

                              {!rev.isLocked &&
                                historyEntity?.category === 'characters' &&
                                isProducer && (
                                  <button
                                    type='button'
                                    disabled={lockingRevisionId === rev.id}
                                    onClick={() => void handleLockRevision(rev)}
                                    className='px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer'
                                    title='Producer phê duyệt và khoá phiên bản này làm tham chiếu chuẩn'
                                  >
                                    <Lock className='w-3 h-3' />
                                    <span>
                                      {lockingRevisionId === rev.id
                                        ? 'Đang khoá...'
                                        : 'Duyệt & Khoá Character Sheet'}
                                    </span>
                                  </button>
                                )}
                              {rev.isLocked &&
                                historyEntity?.category === 'characters' &&
                                isProducer && (
                                  <button
                                    type='button'
                                    onClick={() => {
                                      if (!historyEntity) return;
                                      setHistoryModalOpen(false);
                                      void handleOpenAddRevision(historyEntity, rev);
                                    }}
                                    className='px-2.5 py-1 rounded-lg bg-zinc-600 hover:bg-zinc-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                                    title='Tạo bản mới cùng chương thay cho bản khoá này'
                                  >
                                    <Lock className='w-3 h-3' />
                                    <span>Thay thế bản khoá</span>
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] flex items-center justify-between'>
                {canCreateDraft && historyEntity && (
                  <button
                    type='button'
                    onClick={() => {
                      setHistoryModalOpen(false);
                      void handleOpenAddRevision(historyEntity);
                    }}
                    className='px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer'
                  >
                    <GitCommit className='w-3.5 h-3.5' />
                    <span>{isProducer ? '+ Tạo phiên bản mới' : '+ Tạo bản nháp mới'}</span>
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => setHistoryModalOpen(false)}
                  className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg ml-auto'
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ADD REVISION MODAL */}
      {addRevModalOpen &&
        revisionTarget &&
        createPortal(
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4'
            role='dialog'
            aria-modal='true'
          >
            <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 custom-scrollbar'>
              <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
                <div className='flex items-center gap-2'>
                  <GitCommit className='w-4 h-4 text-[#059669]' />
                  <h3 className='text-sm font-bold font-sans text-zinc-900'>
                    {supersedeTarget
                      ? `Thay thế bản khoá v${supersedeTarget.versionNumber}: ${revisionTarget.name}`
                      : isProducer
                        ? `Tạo phiên bản mới: ${revisionTarget.name}`
                        : `Tạo bản nháp mới: ${revisionTarget.name}`}
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={() => setAddRevModalOpen(false)}
                  aria-label='Đóng'
                  className='w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              {/* Writer/Artist Draft Banner */}
              {!isProducer && (
                <div className='p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2'>
                  <AlertCircle className='w-4 h-4 text-blue-600 shrink-0 mt-0.5' />
                  <div>
                    <span className='font-semibold'>Bản nháp – chờ Producer duyệt:</span> Phiên bản
                    bạn tạo sẽ ở trạng thái bản thảo (Draft) cho tới khi Producer duyệt &amp; khoá
                    Canon.
                  </div>
                </div>
              )}

              {/* Locked Chapters Notice */}
              {!supersedeTarget && lockedChapterNumbers.length > 0 && (
                <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1'>
                  <div className='flex items-center gap-1.5 font-semibold'>
                    <Lock className='w-3.5 h-3.5 text-amber-600 shrink-0' />
                    <span>Các chương đã có phiên bản khoá tham chiếu:</span>
                  </div>
                  <div className='text-[11px] font-mono text-amber-700 pl-5'>
                    {lockedChapterNumbers.map((ch) => `Chương ${ch}`).join(', ')}
                  </div>
                  <div className='text-[10px] text-amber-700/90 pl-5'>
                    Không thể tạo revision trùng chương bắt đầu của bản đã khoá. Muốn cập nhật nội
                    dung, hãy chọn số chương khác hoặc dùng nút &quot;Thay thế bản khoá&quot; trong
                    Lịch sử.
                  </div>
                </div>
              )}

              <div className='space-y-3'>
                {/* Stage Name */}
                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Giai đoạn nhân vật / bối cảnh (Tùy chọn)
                  </label>
                  <input
                    type='text'
                    maxLength={100}
                    placeholder='Ví dụ: Lúc nhỏ, Siêu Saiyan cấp 1, Trưởng thành, Arc Neo-Tokyo...'
                    value={revisionStageName}
                    onChange={(e) => setRevisionStageName(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                    data-testid='revision-stage-name-input'
                  />
                  <p className='text-[10px] text-zinc-500 mt-0.5'>
                    Đặt tên giai đoạn giúp nhận biết bối cảnh thay đổi của nhân vật (ví dụ: Lúc nhỏ,
                    Trưởng thành).
                  </p>
                </div>

                {/* Chapter Range: From & To */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                      Có hiệu lực từ Chương *
                    </label>
                    <input
                      type='number'
                      min={1}
                      value={revisionEffectiveChapter}
                      disabled={!!supersedeTarget}
                      onChange={(e) =>
                        setRevisionEffectiveChapter(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className={`w-full px-3 py-2 bg-[#FAF8F5] border rounded-lg text-xs font-mono text-zinc-900 focus:outline-none disabled:opacity-60 ${
                        !supersedeTarget && lockedChapterNumbers.includes(revisionEffectiveChapter)
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-[#E7E7E7] focus:border-[#F97316]'
                      }`}
                    />
                    {!supersedeTarget &&
                      lockedChapterNumbers.includes(revisionEffectiveChapter) && (
                        <p className='text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1'>
                          <AlertCircle className='w-3 h-3 text-red-500 shrink-0' />
                          Chương {revisionEffectiveChapter} đã có phiên bản bị khoá!
                        </p>
                      )}
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                      Đến Chương (Tùy chọn)
                    </label>
                    <input
                      type='number'
                      min={revisionEffectiveChapter}
                      placeholder='Để trống = Đến hết truyện'
                      value={revisionEffectiveToChapter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRevisionEffectiveToChapter(val === '' ? '' : parseInt(val, 10));
                      }}
                      className={`w-full px-3 py-2 bg-[#FAF8F5] border rounded-lg text-xs font-mono text-zinc-900 focus:outline-none ${
                        revisionEffectiveToChapter !== '' &&
                        Number(revisionEffectiveToChapter) < revisionEffectiveChapter
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-[#E7E7E7] focus:border-[#F97316]'
                      }`}
                    />
                    {revisionEffectiveToChapter !== '' &&
                      Number(revisionEffectiveToChapter) < revisionEffectiveChapter && (
                        <p className='text-[11px] text-red-600 mt-1 font-medium'>
                          Chương kết thúc phải ≥ chương bắt đầu ({revisionEffectiveChapter}).
                        </p>
                      )}
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Tên mục *
                  </label>
                  <input
                    type='text'
                    value={revisionName}
                    onChange={(e) => setRevisionName(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Phụ đề / Vai trò
                  </label>
                  <input
                    type='text'
                    value={revisionSubtitle}
                    onChange={(e) => setRevisionSubtitle(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    {supersedeTarget
                      ? 'Lý do thay thế bản đã khoá *'
                      : 'Lý do thay đổi / Tóm tắt phiên bản mới *'}
                  </label>
                  <input
                    type='text'
                    maxLength={supersedeTarget ? 400 : undefined}
                    placeholder='Ví dụ: Cập nhật trang phục chiến đấu mới từ Arc Neo-Tokyo'
                    value={revisionSummary}
                    onChange={(e) => setRevisionSummary(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Mô tả chi tiết phiên bản
                  </label>
                  <textarea
                    rows={3}
                    value={revisionDescription}
                    onChange={(e) => setRevisionDescription(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316] resize-none'
                  />
                </div>

                {/* Upload reference sheet image */}
                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Ảnh Reference Sheet của phiên bản (Tùy chọn)
                  </label>
                  <input
                    type='file'
                    ref={revFileInputRef}
                    accept='image/png,image/jpeg,image/webp'
                    className='hidden'
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        void handleRevFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  {revisionReferenceImageUrl ? (
                    <div className='p-2.5 bg-[#FAF8F4] border border-[#E7E7E7] rounded-xl flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <div className='w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-900 shrink-0 relative'>
                          <AuthenticatedImage
                            src={revisionReferenceImageUrl}
                            alt={revisionName || 'Reference Sheet'}
                            className='w-full h-full object-cover'
                          />
                        </div>
                        <div className='min-w-0'>
                          <span className='text-[10px] text-zinc-500 font-mono truncate block max-w-[200px]'>
                            {revisionReferenceImageUrl}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-1 shrink-0'>
                        <button
                          type='button'
                          onClick={() => revFileInputRef.current?.click()}
                          className='px-2 py-1 text-[11px] font-semibold rounded bg-white border border-[#E7E7E7] hover:bg-zinc-50 text-zinc-700'
                        >
                          Đổi ảnh
                        </button>
                        <button
                          type='button'
                          onClick={() => setRevisionReferenceImageUrl('')}
                          className='p-1 text-red-600 hover:bg-red-50 rounded'
                          title='Gỡ ảnh'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => revFileInputRef.current?.click()}
                      disabled={uploadingRevImage}
                      className='w-full p-3 rounded-xl border border-dashed border-zinc-300 hover:border-[#F97316] bg-[#FAF8F5] text-center text-xs text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-2 cursor-pointer transition-colors'
                    >
                      {uploadingRevImage ? (
                        <>
                          <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' />
                          <span>Đang tải ảnh lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className='w-3.5 h-3.5 text-[#F97316]' />
                          <span>Tải ảnh Reference Sheet mới (PNG, JPEG, WebP ≤ 10MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className='pt-3 border-t border-[#E7E7E7] flex items-center justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setAddRevModalOpen(false)}
                  className='px-3.5 py-1.5 border border-[#E7E7E7] rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50'
                >
                  Hủy
                </button>
                <button
                  type='button'
                  disabled={
                    !revisionSummary.trim() ||
                    savingRevision ||
                    (!supersedeTarget && lockedChapterNumbers.includes(revisionEffectiveChapter)) ||
                    (revisionEffectiveToChapter !== '' &&
                      Number(revisionEffectiveToChapter) < revisionEffectiveChapter)
                  }
                  onClick={async () => {
                    setSavingRevision(true);
                    try {
                      if (effectiveSeries?.id) {
                        const content = {
                          expectedVersionNumber: expectedVersionNumber ?? undefined,
                          name: revisionName.trim() || revisionTarget.name,
                          subtitle: revisionSubtitle.trim() || revisionTarget.subtitle,
                          description: revisionDescription.trim() || revisionTarget.description,
                          referenceImageUrl: revisionReferenceImageUrl || undefined,
                          stageName: revisionStageName.trim() || undefined,
                          effectiveToChapterNumber:
                            revisionEffectiveToChapter !== ''
                              ? Number(revisionEffectiveToChapter)
                              : undefined,
                        };
                        if (supersedeTarget) {
                          await bibleService.supersedeRevision(
                            effectiveSeries.id,
                            revisionTarget.id,
                            supersedeTarget.id,
                            { ...content, reason: revisionSummary.trim() },
                          );
                        } else {
                          await bibleService.addRevision(effectiveSeries.id, revisionTarget.id, {
                            ...content,
                            summary: revisionSummary.trim(),
                            effectiveFromChapterNumber: revisionEffectiveChapter,
                          });
                        }
                      }
                      onShowToast(
                        supersedeTarget
                          ? 'Đã thay thế bản khoá'
                          : isProducer
                            ? 'Tạo phiên bản mới thành công'
                            : 'Đã tạo bản nháp mới',
                        supersedeTarget
                          ? `Bản mới của ${revisionName || revisionTarget.name} đã được khoá ở Chương ${revisionEffectiveChapter}.`
                          : isProducer
                            ? `Đã ghi nhận phiên bản mới cho ${revisionName || revisionTarget.name} có hiệu lực từ Chương ${revisionEffectiveChapter}.`
                            : `Đã gửi bản nháp mới cho ${revisionName || revisionTarget.name} – chờ Producer duyệt.`,
                      );
                      setRefreshTrigger((prev) => prev + 1);
                      setAddRevModalOpen(false);
                    } catch (err: any) {
                      if (err.code === 'CONFLICT' || err.status === 409) {
                        onShowToast(
                          'Xung đột phiên bản (409 CONFLICT)',
                          'Đã có người khác sửa đổi mục này hoặc mốc chương bị trùng! Đang mở Lịch sử để bạn đối chiếu.',
                        );
                        setAddRevModalOpen(false);
                        setHistoryEntity(revisionTarget);
                        setHistoryEntityName(revisionTarget.name);
                        setHistoryModalOpen(true);
                        setLoadingHistory(true);
                        try {
                          if (effectiveSeries?.id) {
                            const history = await bibleService.getEntryHistory(
                              effectiveSeries.id,
                              revisionTarget.id,
                            );
                            setHistoryRevisions(history);
                          }
                        } catch (hErr) {
                          console.error('Failed to load history on conflict:', hErr);
                        } finally {
                          setLoadingHistory(false);
                          setRefreshTrigger((prev) => prev + 1);
                        }
                      } else {
                        onShowToast('Lỗi tạo phiên bản', err.message);
                      }
                    } finally {
                      setSavingRevision(false);
                    }
                  }}
                  className='px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-2xs'
                >
                  <CheckCircle2 className='w-3.5 h-3.5' />
                  <span>
                    {savingRevision ? 'Đang lưu...' : isProducer ? 'Lưu phiên bản' : 'Gửi bản nháp'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Add Entity Modal */}
      <AddEntityModal
        isOpen={addEntityOpen}
        isProducer={isProducer}
        onClose={() => setAddEntityOpen(false)}
        onAdd={handleCreateEntity}
        onShowToast={onShowToast}
        seriesId={effectiveSeries?.id}
      />
    </PageContainer>
  );
};
