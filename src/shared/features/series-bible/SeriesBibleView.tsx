import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  GitCommit,
  Image as ImageIcon,
  AlertCircle,
  FileText,
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

// --- Types & Interfaces ---

export type VersionStatus = 'LOCKED' | 'DRAFT';
export type EntityCategory = 'Characters' | 'Locations' | 'Props' | 'Terminology' | 'Style Rules' | 'Plot Facts';

export interface EntityVersion {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  effectiveFromChapter: number;
  
  // Data Fields
  name: string;
  personality?: string;
  speechStyle?: string;
  drawingStyle?: string;
  colorMode?: 'Black & White' | 'Full Color';
  
  // Provenance
  createdAt: string;
  createdBy: string;
  lockedAt?: string;
  lockedBy?: string;
  aiUsageCount: number;
}

export interface BibleEntityExtended {
  id: string;
  category: EntityCategory;
  baseName: string;
  versions: EntityVersion[];
}

export interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  onShowToast?: (title: string, desc: string) => void;
}

// --- Mock Data ---

const INITIAL_ENTITIES: BibleEntityExtended[] = [
  {
    id: 'ent-1',
    category: 'Characters',
    baseName: 'Akira Tanaka',
    versions: [
      {
        id: 'v-1-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 1,
        name: 'Akira Tanaka',
        personality: 'Stoic, determined, fiercely loyal.',
        speechStyle: 'Short, direct sentences.',
        drawingStyle: 'Sharp angles, heavy inking around eyes.',
        colorMode: 'Black & White',
        createdAt: '2026-09-15T10:00:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-16T10:00:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 42,
      },
      {
        id: 'v-1-2',
        versionNumber: 2,
        status: 'DRAFT',
        effectiveFromChapter: 5,
        name: 'Akira Tanaka (Awakened)',
        personality: 'More open, slightly unhinged in battle.',
        speechStyle: 'More expressive, uses sarcasm.',
        drawingStyle: 'Softer facial features with glowing aura.',
        colorMode: 'Black & White',
        createdAt: '2026-10-01T14:30:00Z',
        createdBy: 'Artist User',
        aiUsageCount: 0,
      },
    ],
  },
  {
    id: 'ent-2',
    category: 'Characters',
    baseName: 'Elena Rostova',
    versions: [
      {
        id: 'v-2-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 2,
        name: 'Elena Rostova',
        personality: 'Calculated, elegant, secretly compassionate.',
        speechStyle: 'Highly formal, complex vocabulary.',
        drawingStyle: 'Smooth curves, detailed shading.',
        colorMode: 'Full Color',
        createdAt: '2026-09-20T09:15:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-22T09:15:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 15,
      },
    ],
  },
  {
    id: 'ent-3',
    category: 'Locations',
    baseName: 'Neo-Tokyo Slums',
    versions: [
      {
        id: 'v-3-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 1,
        name: 'Sector 4 Undercity',
        personality: 'Gritty, neon-lit, oppressive atmosphere.',
        drawingStyle: 'High contrast, dense screentones.',
        createdAt: '2026-09-10T10:00:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-11T10:00:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 89,
      }
    ]
  }
];

const CATEGORIES: EntityCategory[] = ['Characters', 'Locations', 'Props', 'Terminology', 'Style Rules', 'Plot Facts'];

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

export const SeriesBibleView: React.FC<SeriesBibleViewProps> = ({ activeProject, onShowToast }) => {
  const [entities, setEntities] = useState<BibleEntityExtended[]>(INITIAL_ENTITIES);
  const { addLockedCharacter } = useWorkspace();
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entities[0].id);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ Characters: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'DRAFT'>('ALL');

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

  const activeVersion = selectedEntity?.versions.find((v) => v.id === selectedVersionId);
  const isLocked = activeVersion?.status === 'LOCKED';

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

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUpdateField = (field: keyof EntityVersion, value: any) => {
    if (!selectedEntity || !activeVersion || isLocked) return;

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: ent.versions.map((ver) => {
            if (ver.id !== activeVersion.id) return ver;
            return { ...ver, [field]: value };
          }),
        };
      })
    );
  };

  const handleLockVersion = () => {
    if (!selectedEntity || !activeVersion || isLocked) return;

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: ent.versions.map((ver) => {
            if (ver.id !== activeVersion.id) return ver;
            
            // Add to Global State when locked
            addLockedCharacter({
              id: activeVersion.id,
              name: activeVersion.name,
              version: `v${activeVersion.versionNumber}`,
              colorMode: activeVersion.colorMode || 'Black & White'
            });

            return { 
              ...ver, 
              status: 'LOCKED', 
              lockedAt: new Date().toISOString(),
              lockedBy: 'Current User' // Mocked user
            };
          }),
        };
      })
    );
    if (onShowToast) onShowToast("Version Locked", "This version is now read-only.");
  };

  const handleCreateSupersedingVersion = () => {
    if (!selectedEntity || !activeVersion) return;

    const hasDraft = selectedEntity.versions.some((v) => v.status === 'DRAFT');
    if (hasDraft) {
      if (onShowToast) onShowToast("Draft Exists", "Please lock or delete the existing draft first.");
      return;
    }

    const newVersionNumber = Math.max(...selectedEntity.versions.map((v) => v.versionNumber)) + 1;
    const newVersionId = `v-${selectedEntity.id}-${newVersionNumber}-${Date.now()}`;

    const newVersion: EntityVersion = {
      ...activeVersion,
      id: newVersionId,
      versionNumber: newVersionNumber,
      status: 'DRAFT',
      effectiveFromChapter: activeVersion.effectiveFromChapter + 1,
      createdAt: new Date().toISOString(),
      createdBy: 'Current User',
      lockedAt: undefined,
      lockedBy: undefined,
      aiUsageCount: 0,
    };

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: [...ent.versions, newVersion],
        };
      })
    );
    setSelectedVersionId(newVersionId);
    if (onShowToast) onShowToast("Draft Created", "A new superseding draft has been created.");
  };

  const filteredEntities = entities.filter(ent => {
    if (searchQuery && !ent.baseName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'ALL') {
      const latestVer = ent.versions[ent.versions.length - 1];
      if (latestVer.status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen w-full bg-[#FAF8F5] text-zinc-800 font-sans">
      
      {/* ========================================================= */}
      {/* ZONE 1: Sidebar Navigation (Entity Explorer)              */}
      {/* ========================================================= */}
      <div className="w-80 shrink-0 bg-white border-r border-zinc-200 flex flex-col z-10">
        <div className="p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            Series Bible
          </h2>
          
          {/* Search & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex bg-[#FAF8F5] rounded-lg p-1 border border-zinc-200">
              {['ALL', 'LOCKED', 'DRAFT'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${
                    statusFilter === status ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {CATEGORIES.map(category => {
            const categoryEntities = filteredEntities.filter(e => e.category === category);
            if (categoryEntities.length === 0) return null;
            
            const isExpanded = expandedCategories[category];
            
            return (
              <div key={category} className="mb-2">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors uppercase tracking-wider"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {category} ({categoryEntities.length})
                </button>
                
                {isExpanded && (
                  <div className="pl-4 pr-2 mt-1 space-y-1">
                    {categoryEntities.map(ent => {
                      const isSelected = ent.id === selectedEntityId;
                      const latestVersion = ent.versions[ent.versions.length - 1];
                      return (
                        <button
                          key={ent.id}
                          onClick={() => handleSelectEntity(ent.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                            isSelected 
                              ? 'bg-zinc-100 text-orange-500 shadow-sm border border-orange-500/30' 
                              : 'text-zinc-700 hover:bg-zinc-50 border border-transparent'
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{ent.baseName}</span>
                          {latestVersion.status === 'LOCKED' ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
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

      {/* Main Content & Right Sidebar Container */}
      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!selectedEntity || !activeVersion ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              Select an entity to view its Canon Spec Sheet.
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* ZONE 2: Version Timeline & Control                        */}
              {/* ========================================================= */}
              <div className="shrink-0 bg-white border-b border-zinc-200 px-6 py-4 flex flex-col justify-center z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
                    <GitCommit className="w-5 h-5 text-orange-600" />
                    {selectedEntity.baseName}
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    {/* Chapter Metadata Tag */}
                    <div className="flex items-center gap-2 bg-[#FAF8F5] border border-zinc-200 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-500">Effective from Ch.</span>
                      <span className="text-orange-600 font-bold">{activeVersion.effectiveFromChapter}</span>
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
                <img
                  src={selectedEntity.imageUrl}
                  alt={selectedEntity.name}
                  className='w-full h-full object-cover'
                />
                <div className='absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-mono'>
                  Vector Model: {selectedEntity.modelVersion} • Weight {selectedEntity.loraWeight}
                </div>
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
                        <Plus className="w-4 h-4" /> Create Superseding Version
                      </button>
                    ) : (
                      <button
                        onClick={handleLockVersion}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-4 h-4" /> Lock Version
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
                  {selectedEntity.versions.map((ver, idx) => {
                    const isSelected = ver.id === selectedVersionId;
                    const isNodeLocked = ver.status === 'LOCKED';
                    
                    return (
                      <div key={ver.id} className="flex items-center shrink-0">
                        <button
                          onClick={() => setSelectedVersionId(ver.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono border transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-zinc-100 border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                              : 'bg-[#FAF8F5] border-zinc-200 text-zinc-500 hover:border-zinc-400'
                          }`}
                        >
                          {isNodeLocked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-amber-500" />
                          )}
                          <span>v{ver.versionNumber}</span>
                        </button>
                        
                        {idx < selectedEntity.versions.length - 1 && (
                          <div className="w-8 h-px bg-slate-700 mx-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ========================================================= */}
              {/* ZONE 3: Character Sheet Area (Structured Data)            */}
              {/* ========================================================= */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  
                  {isLocked ? (
                    <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                      <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-400">Locked Version (Read-Only)</h4>
                        <p className="text-xs text-emerald-500/80 mt-1">
                          This entity version is finalized and serves as immutable ground truth for AI Generation. Form fields are disabled.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">Draft Version (Editable)</h4>
                        <p className="text-xs text-amber-500/80 mt-1">
                          You are editing a draft version. AI generation will NOT use this version until it is explicitly Locked.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* Left Column: Text Fields */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2">Text Properties</h4>
                      
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={activeVersion.name}
                          onChange={(e) => handleUpdateField('name', e.target.value)}
                          disabled={isLocked}
                          className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all"
                        />
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

                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* ZONE 4: Provenance & Audit Panel                          */}
        {/* ========================================================= */}
        <div className="w-80 shrink-0 bg-white border-l border-zinc-200 flex flex-col z-10">
          <div className="p-4 border-b border-zinc-200">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Provenance & Audit
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeVersion ? (
              <>
                {/* AI Consistency Metric */}
                <div className="bg-[#FAF8F5] border border-zinc-200 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">AI Metric</h5>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-sm">{activeVersion.aiUsageCount}</span>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-800 font-medium">Consistency Checks</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Used as evidence in finding resolution</p>
                    </div>
                  </div>
                </div>

                {/* Audit Log */}
                <div>
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Audit Log
                  </h5>
                  
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-zinc-100 ml-1">
                    
                    <div className="relative pl-6">
                      <div className="absolute w-2 h-2 rounded-full bg-orange-500 left-1 top-1.5 -ml-px ring-4 ring-white"></div>
                      <p className="text-[11px] font-mono text-zinc-400">{new Date(activeVersion.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-zinc-700 mt-1">Draft Created by <span className="font-semibold text-zinc-800">{activeVersion.createdBy}</span></p>
                    </div>

                    {activeVersion.lockedAt && (
                      <div className="relative pl-6">
                        <div className="absolute w-2 h-2 rounded-full bg-emerald-500 left-1 top-1.5 -ml-px ring-4 ring-white"></div>
                        <p className="text-[11px] font-mono text-zinc-400">{new Date(activeVersion.lockedAt).toLocaleString()}</p>
                        <p className="text-xs text-zinc-700 mt-1">Version Locked by <span className="font-semibold text-zinc-800">{activeVersion.lockedBy}</span></p>
                      </div>
                    )}
                    
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-400 text-center py-10">
                No version selected.
              </div>
            )}
          </div>
        </div>

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
