import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  CheckCircle,
  ExternalLink,
  Tag,
  Eye,
  Edit,
  ShieldCheck,
  Cpu,
  FileText,
  X,
  History,
  GitCommit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { BibleEntity, BibleCategory, MangaProject, normalizeWorkspaceRole } from '@/types';
import { bibleService, BibleEntryRevisionDto, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { AddEntityModal } from './AddEntityModal';
import { VectorStatusModal } from '@/shared/modals/VectorStatusModal';

interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  entities?: BibleEntity[];
  onAddEntity?: (entity: BibleEntity) => void;
  onEditEntity?: (entity: BibleEntity) => void;
  onSelectSeries?: (project: MangaProject) => void;
  onShowToast: (title: string, desc: string) => void;
}

const CATEGORIES: { key: BibleCategory; label: string }[] = [
  { key: 'characters', label: 'Characters' },
  { key: 'locations', label: 'Locations' },
  { key: 'terminology', label: 'Terminology & Lore' },
  { key: 'style', label: 'Style Rules' },
];

const mapCategoryToTab = (cat: number): BibleCategory => {
  switch (cat) {
    case 0:
      return 'characters';
    case 1:
      return 'locations';
    case 2:
    case 3:
    case 5:
      return 'terminology';
    case 4:
      return 'style';
    default:
      return 'characters';
  }
};

const mapEntryToBibleEntity = (entry: BibleEntryDto): BibleEntity => {
  return {
    id: entry.id,
    code: entry.code || `ENT-${entry.id.substring(0, 4)}`,
    name: entry.name,
    subtitle: entry.subtitle || 'Canon Spec Entity',
    category: mapCategoryToTab(entry.category),
    description: entry.description || '',
    tags: ['CANON', entry.code || 'BIBLE'],
    referencesCount: 1,
    loraWeight: 0.85,
    modelVersion: 'LoRA v4.2',
    continuityMatch: 99.2,
    imageUrl: entry.referenceImageUrl || '',
    status: entry.isActive ? 'Verified' : 'Draft',
    colors: ['#171717', '#F97316', '#FFFFFF'],
    isLocked: entry.effectiveRevision?.isLocked ?? false,
    lockedAt: entry.effectiveRevision?.lockedAt ?? null,
  };
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
  const [localEntities, setLocalEntities] = useState<BibleEntity[]>(entities);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BibleCategory>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState<BibleEntity | null>(null);

  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [vectorStatusOpen, setVectorStatusOpen] = useState(false);

  // Dynamic Workspace Series resolution
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
            lastUpdated: s.updatedAt || s.createdAt || 'Just now',
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
    // onSelectSeries do cha truyền vào (thường là hàm inline) — thêm vào deps sẽ gây tải lại liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, activeProject?.id]);

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

  // Producer Role check (UC / BR-15 Việc 5: chỉ Producer mới có quyền khoá Character Sheet)
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

  const handleLockRevision = async (rev: BibleEntryRevisionDto) => {
    if (!effectiveSeries?.id || !historyEntity) return;

    if (historyEntity.category !== 'characters') {
      onShowToast(
        'Chỉ áp dụng cho Nhân vật',
        'Theo quy tắc Việc 5 (BR-15 Canon), chỉ có thể khoá revision thuộc danh mục Character.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn DUYỆT & KHOÁ phiên bản v${rev.versionNumber} của nhân vật "${historyEntity.name}" làm tham chiếu duy nhất?\n\n` +
        'Lưu ý: Sau khi khoá, phiên bản này không thể chỉnh sửa trực tiếp hay mở khoá. ' +
        'Các thay đổi sau này bắt buộc phải tạo revision mới bắt đầu từ một chương khác.',
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
        `Phiên bản v${rev.versionNumber} của "${historyEntity.name}" đã được khoá làm tham chiếu duy nhất thành công!`,
      );
      // Cập nhật trực tiếp danh sách lịch sử
      setHistoryRevisions((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, ...updatedRev, isLocked: true } : r)),
      );
      // Tải lại Bible để cập nhật cờ isLocked trên entity
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi khoá phiên bản', err.message || 'Không thể khoá phiên bản này.');
    } finally {
      setLockingRevisionId(null);
    }
  };

  // BR-01 & BR-15 & UC-04: Add Revision Modal State with Concurrency Control & Locked Chapters tracking
  const [addRevModalOpen, setAddRevModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<BibleEntity | null>(null);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [revisionName, setRevisionName] = useState('');
  const [revisionSubtitle, setRevisionSubtitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionEffectiveChapter, setRevisionEffectiveChapter] = useState(
    effectiveSeries?.chapter || 1,
  );
  const [expectedVersionNumber, setExpectedVersionNumber] = useState<number | null>(null);
  const [lockedChapterNumbers, setLockedChapterNumbers] = useState<number[]>([]);
  const [fetchingBaseVersion, setFetchingBaseVersion] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenAddRevision = async (entity: BibleEntity) => {
    setRevisionTarget(entity);
    setRevisionSummary('');
    setRevisionName(entity.name);
    setRevisionSubtitle(entity.subtitle || '');
    setRevisionDescription(entity.description || '');
    setRevisionEffectiveChapter(
      typeof effectiveChapter === 'number' ? effectiveChapter : effectiveSeries?.chapter || 1,
    );
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

  // Fetch Series Bible from backend API on mount or when effectiveSeries / effectiveChapter changes (BR-15)
  useEffect(() => {
    let isMounted = true;
    const fetchBible = async () => {
      if (!effectiveSeries?.id) {
        setLocalEntities([]);
        return;
      }
      setIsLoading(true);
      try {
        const bibleData =
          effectiveChapter === 'all'
            ? await bibleService.getSeriesBible(effectiveSeries.id)
            : await bibleService.getSeriesBibleAtChapter(effectiveSeries.id, effectiveChapter);
        if (isMounted && bibleData?.entries) {
          setLocalEntities(bibleData.entries.map(mapEntryToBibleEntity));
        } else if (isMounted) {
          setLocalEntities([]);
        }
      } catch (err) {
        console.warn('Không thể tải Series Bible từ backend:', err);
        if (isMounted) {
          setLocalEntities([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBible();
    return () => {
      isMounted = false;
    };
  }, [effectiveSeries?.id, effectiveChapter, refreshTrigger]);

  const handleCreateEntity = async (newEntity: BibleEntity) => {
    if (!effectiveSeries?.id) {
      onShowToast('Chưa chọn Series', 'Vui lòng chọn một Series trước khi thêm thực thể.');
      return;
    }

    try {
      let catNum: any = 0;
      if (newEntity.category === 'locations') catNum = 1;
      else if (newEntity.category === 'prop') catNum = 2;
      else if (newEntity.category === 'terminology') catNum = 3;
      else if (newEntity.category === 'style') catNum = 4;

      const created = await bibleService.createBibleEntry(effectiveSeries.id, {
        category: catNum,
        code: newEntity.code,
        name: newEntity.name,
        subtitle: newEntity.subtitle,
        description: newEntity.description,
        referenceImageUrl: newEntity.imageUrl || undefined,
        priority: 1,
        strictCheck: true,
        effectiveFromChapterNumber:
          typeof effectiveChapter === 'number' ? effectiveChapter : effectiveSeries.chapter || 1,
      });

      setRefreshTrigger((prev) => prev + 1);
      const mapped = mapEntryToBibleEntity(created);
      if (onAddEntity) onAddEntity(mapped);
      onShowToast(
        'Đã lưu thực thể vào Database',
        `Đã tạo thành công "${created.name}" (${created.code}) trong bảng bible_entries & revision v1.`,
      );
    } catch (err: any) {
      onShowToast('Lỗi thêm thực thể Bible', err.message || 'Không thể tạo bản ghi Series Bible.');
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      characters: 0,
      locations: 0,
      terminology: 0,
      style: 0,
    };
    localEntities.forEach((item) => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return counts;
  }, [localEntities]);

  const filteredEntities = useMemo(() => {
    return localEntities.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ||
        (item.status && item.status.toLowerCase() === statusFilter.toLowerCase());

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [localEntities, activeTab, searchQuery, statusFilter]);

  return (
    <div className='max-w-7xl mx-auto space-y-6 pb-12'>
      {!effectiveSeries && (
        <div className='p-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-xl flex items-center justify-between text-xs'>
          <div className='flex items-center gap-2.5'>
            <AlertCircle className='w-4 h-4 text-[#D97706] shrink-0' />
            <span>
              Chưa có Series nào trong Workspace. Hãy vào <strong>Content Hub</strong> hoặc{' '}
              <strong>Producer Studio</strong> để tạo một Series trước khi quản lý Series Bible.
            </span>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Header Section */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[11px] font-mono text-[#888888] mb-1'>
              {availableSeries.length > 1 ? (
                <div className='flex items-center gap-1.5'>
                  <span className='font-semibold text-[#555555]'>SERIES:</span>
                  <select
                    value={effectiveSeries?.id || ''}
                    onChange={(e) => {
                      const found = availableSeries.find((s) => s.id === e.target.value);
                      if (found) {
                        setSelectedSeriesId(found.id);
                        if (onSelectSeries) onSelectSeries(found);
                      }
                    }}
                    className='px-2 py-0.5 bg-[#FAF8F4] border border-[#D4D4D4] rounded font-semibold text-xs text-[#171717] focus:outline-none focus:border-[#F97316] cursor-pointer'
                  >
                    {availableSeries.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className='font-semibold text-[#171717]'>
                  {(effectiveSeries?.title || 'PANELFORGE SERIES').toUpperCase()}
                </span>
              )}
              <span>/</span>
              <span className='text-[#F97316] font-semibold'>PRODUCTION ARCHIVE</span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-serif text-[#171717] tracking-tight'>
              Series Bible Repository
            </h1>
            <p className='text-xs text-[#555555] mt-1'>
              Canon rules, mechanical blueprints, costume turnarounds, and character sheets for AI
              continuity enforcement.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Vector Index Pill */}
            <button
              onClick={() => setVectorStatusOpen(true)}
              className='px-3 py-1.5 rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 text-[#059669] text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer hover:bg-[#10B981]/15 transition-colors'
              title='Click to view Vector Index status and embedding models'
            >
              <span className='w-2 h-2 rounded-full bg-[#10B981] animate-pulse'></span>
              <span>
                Vector Index:{' '}
                {localEntities.length > 0
                  ? `Đã đồng bộ (${localEntities.length} Nodes)`
                  : 'Sẵn sàng (0 Nodes)'}
              </span>
            </button>

            {/* Add Entity Button */}
            <button
              onClick={() => setAddEntityOpen(true)}
              className='px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>Add Entity</span>
            </button>
          </div>
        </div>

        {/* BR-15 Chapter-Versioned Bible Selector Banner */}
        <div className='mt-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-2'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              BR-15 // CHAPTER-VERSIONED
            </span>
            <span className='text-[#171717] font-semibold'>Phiên bản Bible có hiệu lực tại:</span>
            <span className='text-[#059669] font-mono font-bold'>
              {effectiveChapter === 'all'
                ? 'Tất cả các mục (Mới nhất)'
                : `Chương ${effectiveChapter}`}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-[#737373]'>Mốc chương kiểm tra:</span>
            <select
              value={effectiveChapter}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setEffectiveChapter(val);
                onShowToast(
                  'Chuyển đổi phiên bản chương (BR-15)',
                  `Đang hiển thị tri thức Series Bible có hiệu lực tại ${val === 'all' ? 'bản mới nhất' : `Chương ${val}`}`,
                );
              }}
              className='px-2.5 py-1 bg-white border border-[#D4D4D4] rounded-lg font-mono text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            >
              <option value='all'>Tất cả (Mới nhất)</option>
              {seriesChapters.map((ch) => (
                <option key={ch.id} value={ch.chapterNumber}>
                  Chương {ch.chapterNumber}
                  {ch.title ? ` - ${ch.title}` : ''}
                </option>
              ))}
              {seriesChapters.length === 0 && effectiveSeries?.chapter && (
                <option value={effectiveSeries.chapter}>
                  Chương {effectiveSeries.chapter} (Mặc định)
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className='mt-4 pt-4 border-t border-[#E7E7E7] flex flex-col md:flex-row md:items-center justify-between gap-4'>
          {/* Category Tabs */}
          <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === cat.key
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeTab === cat.key ? 'bg-white/20 text-white' : 'bg-[#EAE8E0] text-[#555555]'
                  }`}
                >
                  {categoryCounts[cat.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className='flex items-center gap-2.5'>
            <div className='relative'>
              <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                placeholder='Filter canon entities...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-8 pr-3 py-1.5 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316] w-48 sm:w-56 transition-all'
              />
            </div>

            <div className='relative'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='appearance-none bg-[#FAF8F4] border border-[#E7E7E7] pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#F97316] cursor-pointer'
              >
                <option value='ALL'>All Status</option>
                <option value='Verified'>Verified Canon</option>
                <option value='Draft'>Draft</option>
                <option value='Review'>In Review</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>
          </div>
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {filteredEntities.map((entity) => (
          <div
            key={entity.id}
            className='bg-white border border-[#E7E7E7] rounded-xl overflow-hidden shadow-xs hover:border-[#171717] transition-all flex flex-col justify-between group'
          >
            <div>
              {/* Card Image Banner */}
              <div
                className='relative w-full h-44 bg-[#171717] overflow-hidden cursor-pointer flex items-center justify-center'
                onClick={() => setSelectedEntity(entity)}
              >
                {entity.imageUrl && entity.imageUrl.trim() ? (
                  <img
                    src={entity.imageUrl}
                    alt={entity.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90'
                  />
                ) : (
                  <div className='w-full h-full flex flex-col items-center justify-center bg-[#262626] text-[#737373]'>
                    <BookOpen className='w-10 h-10 mb-2 opacity-50' />
                    <span className='text-[10px] font-mono uppercase tracking-wider text-[#A3A3A3]'>
                      Canon Spec Sheet
                    </span>
                  </div>
                )}
                <div className='absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5'>
                  {entity.tags.map((tag, i) => (
                    <span
                      key={i}
                      className='px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold uppercase tracking-wider'
                    >
                      {tag}
                    </span>
                  ))}
                  {entity.isLocked && (
                    <span className='px-2 py-0.5 rounded bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm'>
                      <Lock className='w-2.5 h-2.5' />
                      CANON LOCKED
                    </span>
                  )}
                </div>
                <div className='absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-mono font-bold flex items-center gap-1'>
                  <ShieldCheck className='w-3 h-3' />
                  {entity.status}
                </div>
              </div>

              {/* Card Content Info */}
              <div className='p-4 space-y-3'>
                <div>
                  <h3
                    className='text-base font-bold font-serif text-[#171717] group-hover:text-[#F97316] transition-colors cursor-pointer'
                    onClick={() => setSelectedEntity(entity)}
                  >
                    {entity.name}
                  </h3>
                  <div className='text-[11px] text-[#888888] font-mono'>{entity.subtitle}</div>
                </div>

                {entity.isLocked && (
                  <div className='px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-[10px] text-amber-800 flex items-center gap-1.5 font-medium'>
                    <Lock className='w-3 h-3 text-amber-600 shrink-0' />
                    <span>Character Sheet đã khoá tham chiếu (BR-15 Canon)</span>
                  </div>
                )}

                <p className='text-xs text-[#555555] leading-relaxed line-clamp-2'>
                  {entity.description}
                </p>

                {/* LoRA & Vector Specs */}
                <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] text-xs font-mono space-y-1.5'>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>Scene References</span>
                    <strong className='text-[#171717]'>{entity.referencesCount} Scenes</strong>
                  </div>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>LoRA Weight / Model</span>
                    <span className='font-semibold text-[#6D28D9]'>
                      {entity.loraWeight} ({entity.modelVersion})
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>AI Continuity Match</span>
                    <strong className='text-[#059669] flex items-center gap-1'>
                      <Sparkles className='w-3 h-3' />
                      {entity.continuityMatch}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className='p-3 bg-[#F8F6F0] border-t border-[#E7E7E7] flex flex-wrap items-center justify-between gap-2'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <button
                  onClick={() => setSelectedEntity(entity)}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#171717] flex items-center gap-1 transition-colors cursor-pointer'
                >
                  <Eye className='w-3 h-3 text-[#888888]' />
                  <span>Model Sheet</span>
                </button>
                <button
                  onClick={async () => {
                    setHistoryEntity(entity);
                    setHistoryEntityName(entity.name);
                    setHistoryModalOpen(true);
                    setLoadingHistory(true);
                    try {
                      if (effectiveSeries?.id) {
                        const history = await bibleService.getEntryHistory(
                          effectiveSeries.id,
                          entity.id,
                        );
                        setHistoryRevisions(history || []);
                      } else {
                        setHistoryRevisions([]);
                      }
                    } catch {
                      setHistoryRevisions([]);
                    } finally {
                      setLoadingHistory(false);
                    }
                  }}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#171717] flex items-center gap-1 transition-colors cursor-pointer'
                  title='Xem toàn bộ lịch sử các phiên bản (BR-18)'
                >
                  <History className='w-3 h-3 text-[#F97316]' />
                  <span>Lịch sử (BR-18)</span>
                </button>
                <button
                  onClick={() => handleOpenAddRevision(entity)}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#059669] flex items-center gap-1 transition-colors cursor-pointer'
                  title='Tạo phiên bản sửa đổi mới có hiệu lực từ một Chương (BR-15, UC-04 Concurrency)'
                >
                  <GitCommit className='w-3 h-3' />
                  <span>+ Version (BR-15)</span>
                </button>
              </div>

              <button
                onClick={() => onEditEntity(entity)}
                className='w-7 h-7 rounded flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-white border border-transparent hover:border-[#E7E7E7] transition-all cursor-pointer'
                title='Sửa nhanh mục'
              >
                <Edit className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEntities.length === 0 && (
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-12 text-center'>
          <BookOpen className='w-8 h-8 text-[#888888] mx-auto mb-2' />
          <h4 className='text-base font-bold text-[#171717]'>No Canon Entities Found</h4>
          <p className='text-xs text-[#555555] mt-1'>
            Try adjusting your search query or category filter.
          </p>
        </div>
      )}

      {/* Entity Model Sheet Modal / Drawer */}
      {selectedEntity && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            {/* Modal Header */}
            <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F4]'>
              <div className='flex items-center gap-2'>
                <span className='w-2.5 h-2.5 rounded-full bg-[#10B981]'></span>
                <h3 className='text-base font-bold font-serif text-[#171717]'>
                  Canon Spec Sheet: {selectedEntity.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 space-y-5'>
              {selectedEntity.isLocked && (
                <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900'>
                  <div className='flex items-center gap-2'>
                    <Lock className='w-4 h-4 text-amber-600 shrink-0' />
                    <div>
                      <span className='font-bold uppercase tracking-wide text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded mr-1.5'>
                        CANON LOCKED
                      </span>
                      <span>
                        Character Sheet đã được Producer phê duyệt &amp; khoá làm tham chiếu duy
                        nhất.
                      </span>
                    </div>
                  </div>
                  {selectedEntity.lockedAt && (
                    <span className='text-[10px] font-mono text-amber-700 hidden sm:inline'>
                      {new Date(selectedEntity.lockedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              )}

              <div className='relative w-full h-64 bg-[#171717] rounded-xl overflow-hidden border border-[#E7E7E7]'>
                {selectedEntity.imageUrl && selectedEntity.imageUrl.trim() ? (
                  <img
                    src={selectedEntity.imageUrl}
                    alt={selectedEntity.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex flex-col items-center justify-center bg-[#262626] text-[#737373]'>
                    <BookOpen className='w-12 h-12 mb-2 opacity-50' />
                    <span className='text-xs font-mono uppercase tracking-wider text-[#A3A3A3]'>
                      Chưa có hình ảnh minh họa
                    </span>
                  </div>
                )}
                {selectedEntity.modelVersion && (
                  <div className='absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-mono'>
                    Vector Model: {selectedEntity.modelVersion} • Weight {selectedEntity.loraWeight}
                  </div>
                )}
              </div>

              <div>
                <h4 className='text-lg font-bold font-serif text-[#171717]'>
                  {selectedEntity.name}
                </h4>
                <div className='text-xs font-mono text-[#F97316] font-semibold mt-0.5'>
                  {selectedEntity.subtitle}
                </div>
                <p className='text-xs text-[#555555] leading-relaxed mt-2'>
                  {selectedEntity.description}
                </p>
              </div>

              {/* Color Swatches */}
              {selectedEntity.colors && (
                <div>
                  <div className='text-[11px] font-mono text-[#888888] uppercase tracking-wider mb-2'>
                    Verified Ink &amp; Screentone Palette
                  </div>
                  <div className='flex items-center gap-2'>
                    {selectedEntity.colors.map((c, i) => (
                      <div
                        key={i}
                        className='flex items-center gap-1.5 bg-[#F8F6F0] px-2 py-1 rounded border border-[#E7E7E7] text-[10px] font-mono'
                      >
                        <span
                          className='w-3.5 h-3.5 rounded-full border border-black/20'
                          style={{ backgroundColor: c }}
                        ></span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vector Embedding Details */}
              <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] space-y-2 text-xs font-mono'>
                <div className='text-[11px] font-bold text-[#171717] flex items-center justify-between'>
                  <span>Neural Vector Anchor</span>
                  <span className='text-[#059669]'>100% Enforced</span>
                </div>
                <div className='text-[10px] text-[#555555] bg-white p-2 rounded border border-[#E7E7E7] break-all'>
                  SHA-256: 4a9f81bc7e2d9a334f55a12089b2184911dcae984f1807d9b042a9b
                </div>
                <div className='text-[11px] text-[#555555] flex items-center justify-between pt-1'>
                  <span>Embedding Latency: 1.2s</span>
                  <span>Active Clones: 32 Panels</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
              <button
                onClick={() => {
                  onShowToast(
                    'Synced to LoRA Matrix',
                    `Updated ${selectedEntity.name} vector lock.`,
                  );
                  setSelectedEntity(null);
                }}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer'
              >
                Sync with Chapter 5 LoRA
              </button>
              <button
                onClick={() => setSelectedEntity(null)}
                className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BR-18: Revision History Modal */}
      {historyModalOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F4]'>
              <div className='flex items-center gap-2'>
                <History className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm font-bold font-display text-[#171717]'>
                  Lịch Sử Phiên Bản &amp; Kiểm Toán (BR-18): {historyEntityName}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className='w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-6 overflow-y-auto space-y-4 flex-1'>
              <div className='text-xs text-[#737373]'>
                Dữ liệu lưu trữ bất biến (Append-only - BR-01). Mọi thay đổi đều sinh một version
                mới gắn với mốc chương có hiệu lực (BR-15) và lưu trữ vết kiểm toán (BR-18).
              </div>

              {loadingHistory ? (
                <div className='py-8 text-center text-xs text-[#888888]'>
                  Đang tải lịch sử phiên bản...
                </div>
              ) : historyRevisions.length === 0 ? (
                <div className='py-8 text-center text-xs text-[#888888]'>
                  Chưa có phiên bản nào được ghi nhận.
                </div>
              ) : (
                <div className='relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E7E7]'>
                  {historyRevisions.map((rev) => (
                    <div key={rev.id} className='relative group'>
                      <div className='absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#F97316] group-hover:scale-110 transition-transform'></div>
                      <div className='bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E7E7] space-y-2'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div className='flex items-center gap-2'>
                            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                              VERSION {rev.versionNumber} {rev.isInitialVersion ? '(Khởi tạo)' : ''}
                            </span>
                            {rev.isLocked && (
                              <span className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs'>
                                <Lock className='w-2.5 h-2.5 text-amber-600' />
                                ĐÃ KHOÁ THAM CHIẾU
                              </span>
                            )}
                          </div>
                          <span className='text-[10px] font-mono text-[#888888] flex items-center gap-1'>
                            <Clock className='w-3 h-3' />
                            {new Date(rev.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className='text-xs font-semibold text-[#171717]'>{rev.summary}</div>
                        <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E7E7E7]/60'>
                          <div className='flex items-center gap-2'>
                            <span className='px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#10B981]/30 text-[10px] font-mono font-semibold'>
                              Hiệu lực từ: Chương {rev.effectiveFromChapterNumber}
                            </span>
                            <span
                              className='text-[10px] font-mono text-[#888888] truncate max-w-[120px]'
                              title={rev.contentHash}
                            >
                              Hash: {rev.contentHash.substring(0, 10)}...
                            </span>
                          </div>

                          {!rev.isLocked &&
                            historyEntity?.category === 'characters' &&
                            isProducer && (
                              <button
                                type='button'
                                disabled={lockingRevisionId === rev.id}
                                onClick={() => handleLockRevision(rev)}
                                className='px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs disabled:opacity-50 cursor-pointer'
                                title='Producer phê duyệt và khoá phiên bản này làm tham chiếu duy nhất'
                              >
                                <Lock className='w-3 h-3' />
                                <span>
                                  {lockingRevisionId === rev.id
                                    ? 'Đang khoá...'
                                    : 'Duyệt & Khoá Character Sheet'}
                                </span>
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex justify-end'>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BR-01 & BR-15 & UC-04: Add Revision Modal */}
      {addRevModalOpen && revisionTarget && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <GitCommit className='w-4 h-4 text-[#059669]' />
                <h3 className='text-sm font-bold text-[#171717]'>
                  Tạo Phiên Bản Mới (BR-15): {revisionTarget.name}
                </h3>
              </div>
              <button
                onClick={() => setAddRevModalOpen(false)}
                className='w-6 h-6 rounded flex items-center justify-center text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* UC-04 Concurrency Notice */}
            <div className='flex items-center justify-between text-xs p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7]'>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                  UC-04 // CONCURRENCY LOCK
                </span>
                <span className='text-[#737373]'>Phiên bản cơ sở:</span>
              </div>
              <span className='font-mono font-bold text-[#059669] bg-[#ECFDF5] border border-[#10B981]/30 px-2 py-0.5 rounded text-[11px] flex items-center gap-1'>
                {fetchingBaseVersion ? (
                  <span className='animate-pulse text-[#888888]'>Đang kiểm tra...</span>
                ) : (
                  <>Version v{expectedVersionNumber ?? 1}</>
                )}
              </span>
            </div>

            <div className='text-xs text-[#737373] bg-[#FAF8F5] p-3 rounded-lg border border-[#E7E7E7] leading-relaxed'>
              <strong>Lưu ý nghiệp vụ (BR-01 &amp; UC-04):</strong> Phiên bản cũ được bảo toàn vĩnh
              viễn (Append-only). Hệ thống tự động phát hiện nếu có thành viên khác sửa đổi đồng
              thời và yêu cầu đối chiếu trước khi ghi đè.
            </div>

            {/* Locked Chapters Notice (BR-15 Việc 5) */}
            {lockedChapterNumbers.length > 0 && (
              <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1'>
                <div className='flex items-center gap-1.5 font-semibold'>
                  <Lock className='w-3.5 h-3.5 text-amber-600 shrink-0' />
                  <span>Các chương đã có phiên bản khoá tham chiếu:</span>
                </div>
                <div className='text-[11px] font-mono text-amber-700 pl-5'>
                  {lockedChapterNumbers.map((ch) => `Chương ${ch}`).join(', ')}
                </div>
                <div className='text-[10px] text-amber-700/90 pl-5'>
                  Quy tắc: Không thể tạo revision trùng chương bắt đầu của bản đã khoá. Muốn cập
                  nhật nội dung, bạn phải chọn một chương bắt đầu khác.
                </div>
              </div>
            )}

            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Có hiệu lực từ Chương số (Effective From Chapter) *
                </label>
                <input
                  type='number'
                  min={1}
                  value={revisionEffectiveChapter}
                  onChange={(e) =>
                    setRevisionEffectiveChapter(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className={`w-full px-3 py-2 bg-[#FAF8F5] border rounded-lg text-xs font-mono text-[#171717] focus:outline-none ${
                    lockedChapterNumbers.includes(revisionEffectiveChapter)
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-[#E7E7E7] focus:border-[#F97316]'
                  }`}
                />
                {lockedChapterNumbers.includes(revisionEffectiveChapter) && (
                  <p className='text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3 text-red-500 shrink-0' />
                    Chương {revisionEffectiveChapter} đã có phiên bản bị khoá tham chiếu! Vui lòng
                    chọn số chương khác.
                  </p>
                )}
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Tên mục (Entity Name) *
                </label>
                <input
                  type='text'
                  value={revisionName}
                  onChange={(e) => setRevisionName(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Phụ đề / Vai trò (Subtitle)
                </label>
                <input
                  type='text'
                  value={revisionSubtitle}
                  onChange={(e) => setRevisionSubtitle(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Lý do thay đổi / Tóm tắt phiên bản mới (Summary) *
                </label>
                <input
                  type='text'
                  placeholder='VD: Cập nhật trang phục chiến đấu mới từ Arc Neo-Tokyo'
                  value={revisionSummary}
                  onChange={(e) => setRevisionSummary(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Mô tả chi tiết phiên bản (Description)
                </label>
                <textarea
                  rows={3}
                  value={revisionDescription}
                  onChange={(e) => setRevisionDescription(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316] resize-none'
                />
              </div>
            </div>

            <div className='pt-3 border-t border-[#E7E7E7] flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => setAddRevModalOpen(false)}
                className='px-3 py-1.5 border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#555555] hover:bg-[#F3F1EB]'
              >
                Hủy
              </button>
              <button
                type='button'
                disabled={
                  !revisionSummary.trim() ||
                  savingRevision ||
                  lockedChapterNumbers.includes(revisionEffectiveChapter)
                }
                onClick={async () => {
                  setSavingRevision(true);
                  try {
                    if (effectiveSeries?.id) {
                      await bibleService.addRevision(effectiveSeries.id, revisionTarget.id, {
                        expectedVersionNumber: expectedVersionNumber ?? undefined,
                        summary: revisionSummary.trim(),
                        name: revisionName.trim() || revisionTarget.name,
                        subtitle: revisionSubtitle.trim() || revisionTarget.subtitle,
                        description: revisionDescription.trim() || revisionTarget.description,
                        effectiveFromChapterNumber: revisionEffectiveChapter,
                      });
                    }
                    onShowToast(
                      'Tạo phiên bản thành công (BR-15)',
                      `Đã ghi nhận phiên bản mới cho ${revisionName || revisionTarget.name} có hiệu lực từ Chương ${revisionEffectiveChapter}.`,
                    );
                    setRefreshTrigger((prev) => prev + 1);
                    setAddRevModalOpen(false);
                  } catch (err: any) {
                    if (err.code === 'CONFLICT' || err.status === 409) {
                      const msg = err.message || '';
                      const isLockedConflict =
                        msg.toLowerCase().includes('lock') ||
                        msg.toLowerCase().includes('khoá') ||
                        msg.toLowerCase().includes('khóa') ||
                        msg.toLowerCase().includes('chapter');
                      onShowToast(
                        'Xung đột phiên bản (409 CONFLICT)',
                        isLockedConflict
                          ? 'Chương đã có phiên bản khoá tham chiếu hoặc đã có người khác cập nhật cùng lúc! Đang mở Lịch sử để bạn đối chiếu.'
                          : 'Đã có người khác sửa đổi mục này cùng lúc! Hệ thống tự động mở Lịch sử để bạn đối chiếu phiên bản mới nhất.',
                      );
                      setAddRevModalOpen(false);
                      // Auto open history modal to compare
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
                className='px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5'
              >
                <CheckCircle2 className='w-3.5 h-3.5' />
                <span>{savingRevision ? 'Đang lưu...' : 'Lưu phiên bản (BR-15)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals local to SeriesBibleView */}
      <AddEntityModal
        isOpen={addEntityOpen}
        onClose={() => setAddEntityOpen(false)}
        onAdd={handleCreateEntity}
        onShowToast={onShowToast}
      />
      <VectorStatusModal
        isOpen={vectorStatusOpen}
        onClose={() => setVectorStatusOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
