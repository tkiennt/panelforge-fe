import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Layers,
  Eye,
  Edit3,
  X,
  History,
  GitCommit,
  Clock,
  CheckCircle2,
  Check,
  AlertCircle,
  AlertTriangle,
  Lock,
  Upload,
  Loader2,
  LayoutGrid,
  List,
  RotateCcw,
  Palette,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { BibleEntity, MangaProject, normalizeWorkspaceRole } from '@/types';
import {
  bibleService,
  BibleEntryRevisionDto,
  BibleEntryDto,
  BibleDesignQueueItemDto,
} from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { AddEntityModal } from './AddEntityModal';
import {
  BibleEntityDetailModal,
  groupRevisionsIntoStages,
  type CharacterEraStage,
} from './BibleEntityDetailModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { createPortal } from 'react-dom';
import { EmptyFolderState, LucianConfirmModal } from '@/shared/components/lucian';
import { useConfirm } from '@/shared/context/ConfirmContext';

interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  entities?: BibleEntity[];
  onAddEntity?: (entity: BibleEntity) => void;
  onEditEntity?: (entity: BibleEntity) => void;
  onSelectSeries?: (project: MangaProject) => void;
  onShowToast: (title: string, desc: string) => void;
}

import {
  CATEGORIES,
  mapCategoryToTab,
  getCategoryLabel,
  getCategoryIcon,
  isVisualDesignCategory,
} from './bibleCategory';
import { AddRevisionModal } from './AddRevisionModal';
import { ReworkModal } from './ReworkModal';

const mapEntryToBibleEntity = (entry: BibleEntryDto): BibleEntity => {
  let gallery: Array<{ url: string; label?: string; sha256?: string }> = [];
  let attributes: Record<string, any> = {};
  try {
    const details = JSON.parse(entry.detailsJson || '{}');
    if (Array.isArray(details.turnaroundGallery)) {
      gallery = details.turnaroundGallery;
    }
    if (details.attributes && typeof details.attributes === 'object') {
      attributes = details.attributes;
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
    isVisualDesign: isVisualDesignCategory(entry.category),
    isLocked: entry.effectiveRevision?.isLocked ?? false,
    lockedAt: entry.effectiveRevision?.lockedAt ?? null,
    gallery,
    attributes,
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
  const confirm = useConfirm();
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

  // Spec V2.6 §5.1: khoá Canon & /supersede chỉ Producer của Workspace (Admin ❌). UI chỉ là UX, BE kiểm tra lại.
  const isProducer = useMemo(() => {
    try {
      const rawWs = localStorage.getItem('activeWorkspace');
      const ws = rawWs ? JSON.parse(rawWs) : null;
      return Boolean(ws?.isOwner) || currentUserRole === 'PRODUCER';
    } catch {
      return false;
    }
  }, [currentUserRole]);

  const isArtist = currentUserRole === 'ARTIST';
  const canCreateDraft = isProducer || currentUserRole === 'WRITER';
  // §5.1: xác nhận WriterEndorsed = Writer, Editor. Yêu cầu vẽ lại: người thẩm định + Producer (thay vì khoá).
  const canEndorse = currentUserRole === 'WRITER' || currentUserRole === 'EDITOR';
  const canRequestRework = canEndorse || isProducer;

  const handleLockRevision = async (rev: BibleEntryRevisionDto, entity?: BibleEntity) => {
    const targetEntity = entity || historyEntity || selectedEntity || null;
    if (!effectiveSeries?.id || !targetEntity) return;

    if (!targetEntity.isVisualDesign) {
      onShowToast(
        'Chỉ áp dụng cho mục có thiết kế hình',
        'Chỉ khoá Canon được Nhân vật, Bối cảnh và Đạo cụ; Thuật ngữ/Quy tắc có hiệu lực ngay.',
      );
      return;
    }

    if (rev.reviewStatus !== 'WriterEndorsed' && rev.reviewStatus !== 4) {
      onShowToast(
        'Chưa thể khoá Canon (BR-01)',
        'Chỉ có thể khoá Canon phiên bản đã được Writer/Editor xác nhận (WriterEndorsed).',
      );
      return;
    }

    const confirmed = await confirm({
      title: `Duyệt & Khóa phiên bản v${rev.versionNumber}?`,
      description: `Cố định phiên bản này của nhân vật "${targetEntity.name}" làm tham chiếu chuẩn (Canon) cho toàn bộ đội ngũ sáng tác và sản xuất.`,
      confirmText: 'Duyệt & Khóa Canon',
      cancelText: 'Hủy',
      variant: 'warning',
    });
    if (!confirmed) return;

    setLockingRevisionId(rev.id);
    try {
      const updatedRev = await bibleService.lockRevision(
        effectiveSeries.id,
        targetEntity.id,
        rev.id,
      );
      onShowToast(
        'Đã duyệt & khoá Character Sheet',
        `Phiên bản v${rev.versionNumber} của "${targetEntity.name}" đã được khoá làm tham chiếu chuẩn thành công.`,
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

  // Bible Design Queue State
  const [designQueue, setDesignQueue] = useState<BibleDesignQueueItemDto[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // 2-tier Review: Rework Modal State
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [reworkTargetRev, setReworkTargetRev] = useState<BibleEntryRevisionDto | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [submittingRework, setSubmittingRework] = useState(false);
  const [endorsingRevId, setEndorsingRevId] = useState<string | null>(null);

  const handleEndorseRevision = async (rev: BibleEntryRevisionDto, entity?: BibleEntity) => {
    const targetEntity = entity || historyEntity || selectedEntity || null;
    if (!effectiveSeries?.id || !targetEntity) return;

    setEndorsingRevId(rev.id);
    try {
      const updatedRev = await bibleService.endorseRevision(
        effectiveSeries.id,
        targetEntity.id,
        rev.id,
      );
      onShowToast(
        'Đã xác nhận thiết kế',
        `Phiên bản v${rev.versionNumber} của "${targetEntity.name}" đã được xác nhận (Writer Endorsed).`,
      );
      setHistoryRevisions((prev) =>
        prev.map((r) =>
          r.id === rev.id ? { ...r, ...updatedRev, reviewStatus: 'WriterEndorsed' } : r,
        ),
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi xác nhận thiết kế', err.message || 'Không thể xác nhận phiên bản này.');
    } finally {
      setEndorsingRevId(null);
    }
  };

  const handleOpenReworkModal = (rev: BibleEntryRevisionDto, entity?: BibleEntity) => {
    if (entity) {
      setHistoryEntity(entity);
      setHistoryEntityName(entity.name);
    }
    setReworkTargetRev(rev);
    setReworkReason('');
    setReworkModalOpen(true);
  };

  const handleSubmitRework = async (reason: string) => {
    const targetEntity = historyEntity || selectedEntity || null;
    if (!effectiveSeries?.id || !targetEntity || !reworkTargetRev || !reason.trim()) return;

    setSubmittingRework(true);
    try {
      const updatedRev = await bibleService.requestReworkRevision(
        effectiveSeries.id,
        targetEntity.id,
        reworkTargetRev.id,
        { reworkReason: reason.trim() },
      );
      onShowToast(
        'Đã gửi yêu cầu vẽ lại',
        `Đã tạo nhận xét yêu cầu vẽ lại cho phiên bản v${reworkTargetRev.versionNumber} của "${targetEntity.name}".`,
      );
      setHistoryRevisions((prev) =>
        prev.map((r) =>
          r.id === reworkTargetRev.id
            ? {
                ...r,
                ...updatedRev,
                reviewStatus: 'ReworkRequired',
                reworkFeedback: reason.trim(),
              }
            : r,
        ),
      );
      // Đóng modal rework nhưng giữ nguyên selectedEntity để Workbench không bị đóng
      setReworkModalOpen(false);
      if (selectedEntity && selectedEntity.id === targetEntity.id) {
        setSelectedEntity({
          ...selectedEntity,
          status: 'ReworkRequired',
        });
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi gửi yêu cầu vẽ lại', err.message || 'Không thể gửi yêu cầu vẽ lại.');
    } finally {
      setSubmittingRework(false);
    }
  };

  // Add Revision Modal State
  const [addRevModalOpen, setAddRevModalOpen] = useState(false);
  const [isNewEraRequested, setIsNewEraRequested] = useState(false);
  const [targetEntityStages, setTargetEntityStages] = useState<CharacterEraStage[]>([]);
  const [isArtistConceptSubmit, setIsArtistConceptSubmit] = useState(false);
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
  const [revisionReworkFeedback, setRevisionReworkFeedback] = useState<string | null>(null);
  const [isArtistResubmit, setIsArtistResubmit] = useState(false);
  const [confirmSubmitModalOpen, setConfirmSubmitModalOpen] = useState(false);
  const [pendingSubmissionContent, setPendingSubmissionContent] = useState<any>(null);
  const [uploadingRevImage, setUploadingRevImage] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenAddRevision = async (
    entity: BibleEntity,
    supersede: BibleEntryRevisionDto | null = null,
    fromQueue: boolean = false,
    queueEffectiveChapter?: number,
    reworkFeedback?: string,
    isResubmit: boolean = false,
    isNewEra: boolean = false,
  ) => {
    const snapshot = supersede ? readSnapshot(supersede.snapshotJson) : {};
    setRevisionTarget(entity);
    setSupersedeTarget(supersede);
    setRevisionReworkFeedback(reworkFeedback || null);
    setIsArtistResubmit(isResubmit);
    setIsNewEraRequested(isNewEra);
    setTargetEntityStages([]);
    setRevisionSummary(
      isResubmit
        ? 'Artist cập nhật lại Concept Art (nộp lại bản vẽ)'
        : reworkFeedback
          ? 'Artist nộp bản vẽ sửa đổi theo nhận xét'
          : fromQueue
            ? 'Nộp bản vẽ Concept Art'
            : isNewEra
              ? 'Khởi tạo thời kỳ (Era) mới cho nhân vật'
              : '',
    );
    setRevisionName(snapshot.Name ?? entity.name);
    setRevisionSubtitle(snapshot.Subtitle ?? entity.subtitle ?? '');
    setRevisionDescription(snapshot.Description ?? entity.description ?? '');
    setRevisionReferenceImageUrl(snapshot.ReferenceImageUrl ?? entity.imageUrl ?? '');
    setRevisionStageName(isNewEra ? '' : supersede?.stageName || '');
    setRevisionEffectiveChapter(
      supersede
        ? supersede.effectiveFromChapterNumber
        : typeof queueEffectiveChapter === 'number'
          ? queueEffectiveChapter
          : typeof effectiveChapter === 'number'
            ? effectiveChapter
            : effectiveSeries?.chapter || 1,
    );
    setRevisionEffectiveToChapter(isNewEra ? '' : (supersede?.effectiveToChapterNumber ?? ''));
    setExpectedVersionNumber(1);
    setLockedChapterNumbers([]);
    setIsArtistConceptSubmit(fromQueue);

    if (effectiveSeries?.id) {
      setFetchingBaseVersion(true);
      try {
        const history = await bibleService.getEntryHistory(effectiveSeries.id, entity.id);
        if (history && history.length > 0) {
          const stages = groupRevisionsIntoStages(history);
          setTargetEntityStages(stages);
          const maxVer = Math.max(...history.map((h) => h.versionNumber));
          setExpectedVersionNumber(maxVer);
          const lockedChs = history
            .filter((h) => h.isLocked)
            .map((h) => h.effectiveFromChapterNumber);
          setLockedChapterNumbers(lockedChs);

          // Nếu mở để tạo Era mới, tự động đề xuất số chương tiếp theo
          if (isNewEra) {
            const maxFrom = Math.max(...stages.map((s) => s.effectiveFromChapterNumber || 1));
            setRevisionEffectiveChapter(maxFrom + 1);
            setRevisionStageName('');
            setRevisionEffectiveToChapter('');
          }

          // Tự động đồng bộ lại thực thể được chọn nếu đang xem trong Workbench
          setSelectedEntity((current) =>
            current && current.id === entity.id ? { ...current, ...entity } : current,
          );
        }
      } catch (err) {
        console.warn('Cannot fetch history for version tracking:', err);
      } finally {
        setFetchingBaseVersion(false);
      }
    }
    setAddRevModalOpen(true);
  };

  const executeSaveRevision = async (submittedContent?: {
    expectedVersionNumber?: number;
    name: string;
    subtitle: string;
    description: string;
    referenceImageUrl?: string;
    stageName?: string;
    effectiveFromChapterNumber: number;
    effectiveToChapterNumber?: number;
    summary: string;
    detailsJson?: string;
    attributes?: Record<string, any>;
  }) => {
    if (!revisionTarget) return;
    setSavingRevision(true);
    try {
      if (effectiveSeries?.id) {
        const content = submittedContent || {
          expectedVersionNumber: expectedVersionNumber ?? undefined,
          name: revisionName.trim() || revisionTarget.name,
          subtitle: revisionSubtitle.trim() || revisionTarget.subtitle,
          description: revisionDescription.trim() || revisionTarget.description,
          referenceImageUrl: revisionReferenceImageUrl || undefined,
          stageName: revisionStageName.trim() || undefined,
          detailsJson: submittedContent?.detailsJson,
          effectiveToChapterNumber:
            revisionEffectiveToChapter !== '' ? Number(revisionEffectiveToChapter) : undefined,
        };
        const summaryText = submittedContent ? submittedContent.summary : revisionSummary.trim();
        const effectiveFromCh = submittedContent
          ? submittedContent.effectiveFromChapterNumber
          : revisionEffectiveChapter;

        if (supersedeTarget) {
          await bibleService.supersedeRevision(
            effectiveSeries.id,
            revisionTarget.id,
            supersedeTarget.id,
            { ...content, reason: summaryText, detailsJson: submittedContent?.detailsJson },
          );
        } else if (isArtistConceptSubmit && isArtist) {
          await bibleService.submitConceptArt(effectiveSeries.id, revisionTarget.id, {
            ...content,
            summary: summaryText,
            effectiveToChapterNumber: content.effectiveToChapterNumber,
            detailsJson: submittedContent?.detailsJson,
          });
        } else {
          await bibleService.addRevision(effectiveSeries.id, revisionTarget.id, {
            ...content,
            summary: summaryText,
            effectiveFromChapterNumber: effectiveFromCh,
            detailsJson: submittedContent?.detailsJson,
          });
        }
      }
      const displayName = submittedContent?.name || revisionName || revisionTarget.name;
      const displayEffectiveCh =
        submittedContent?.effectiveFromChapterNumber || revisionEffectiveChapter;

      onShowToast(
        supersedeTarget
          ? 'Đã thay thế bản khoá'
          : isArtistConceptSubmit && isArtist
            ? isArtistResubmit
              ? 'Đã nộp lại bản vẽ Concept Art thành công'
              : 'Đã nộp bản vẽ Concept Art'
            : isProducer
              ? 'Tạo phiên bản mới thành công'
              : 'Đã tạo bản nháp mới',
        supersedeTarget
          ? `Bản mới của ${displayName} đã được khoá ở Chương ${displayEffectiveCh}.`
          : isArtistConceptSubmit && isArtist
            ? `Đã gửi bản vẽ Concept Art cho ${displayName} – chờ Writer/Editor duyệt.`
            : isProducer
              ? `Đã ghi nhận phiên bản mới cho ${displayName} có hiệu lực từ Chương ${displayEffectiveCh}.`
              : `Đã gửi bản nháp mới cho ${displayName} – chờ Writer/Editor xác nhận.`,
      );
      setRefreshTrigger((prev) => prev + 1);
      setAddRevModalOpen(false);
      setConfirmSubmitModalOpen(false);
      // Giữ người dùng ở lại không gian làm việc (Workbench) của thực thể, cập nhật dữ liệu mới
      if (revisionTarget) {
        setSelectedEntity({
          ...revisionTarget,
          name: submittedContent?.name || revisionName.trim() || revisionTarget.name,
          subtitle:
            submittedContent?.subtitle || revisionSubtitle.trim() || revisionTarget.subtitle,
          description:
            submittedContent?.description ||
            revisionDescription.trim() ||
            revisionTarget.description,
          imageUrl:
            submittedContent?.referenceImageUrl ||
            revisionReferenceImageUrl ||
            revisionTarget.imageUrl,
          attributes: submittedContent?.attributes || revisionTarget.attributes,
        });
      }
    } catch (err: any) {
      if (err.code === 'CONFLICT' || err.status === 409) {
        const isLockedConflict =
          typeof err.message === 'string' &&
          (err.message.toLowerCase().includes('khoá') ||
            err.message.toLowerCase().includes('khoa') ||
            err.message.toLowerCase().includes('locked') ||
            err.message.toLowerCase().includes('canon') ||
            err.message.toLowerCase().includes('supersede') ||
            err.message.toLowerCase().includes('thay thế'));

        onShowToast(
          isLockedConflict ? 'Phiên bản đã khoá Canon (409)' : 'Xung đột phiên bản (409 CONFLICT)',
          isLockedConflict
            ? err.message ||
                'Phiên bản hiện tại đã khoá Canon. Cần sử dụng thao tác Thay thế bản khóa (Supersede) để kích hoạt phiên bản sửa đổi v(N+1).'
            : 'Đã có người khác sửa đổi mục này hoặc mốc chương bị trùng! Đang mở Lịch sử để bạn đối chiếu.',
        );
        setAddRevModalOpen(false);
        setConfirmSubmitModalOpen(false);
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
        const mappedEntities = bibleData.entries.map(mapEntryToBibleEntity);
        setLocalEntities(mappedEntities);

        // Giữ đồng bộ selectedEntity nếu đang xem trong Workbench, tránh bị reset state
        setSelectedEntity((current) => {
          if (!current) return null;
          const updated = mappedEntities.find((e) => e.id === current.id);
          return updated ? { ...current, ...updated } : current;
        });
      } else {
        setLocalEntities([]);
        setRawEntries({});
      }
    } catch (err: any) {
      console.warn('Không thể tải Series Bible từ backend:', err);
      setLoadError(err.message || 'Không thể tải dữ liệu Series Bible từ máy chủ.');
      // Không wipe sạch localEntities để tránh giật giao diện và đóng Workbench của người dùng khi mạng chập chờn
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDesignQueue = async () => {
    if (!effectiveSeries?.id) {
      setDesignQueue([]);
      return;
    }
    setLoadingQueue(true);
    try {
      const queue = await bibleService.getBibleDesignQueue(effectiveSeries.id);
      setDesignQueue(queue || []);
    } catch {
      setDesignQueue([]);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    void fetchBible();
    void fetchDesignQueue();
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
        attributes: newEntity.attributes || {},
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
      // Mở ngay bàn làm việc (Character Workbench) cho mục vừa tạo, không đẩy người dùng ra màn ngoài
      setSelectedEntity(mapped);
      setAddEntityOpen(false);
      onShowToast(
        isProducer ? 'Đã tạo mục Series Bible thành công' : 'Đã tạo bản nháp thành công',
        isProducer
          ? `Đã lưu "${created.name}" (${created.code}) vào cơ sở tri thức của bộ truyện.`
          : `Đã gửi bản nháp "${created.name}" (${created.code}) – chờ Writer/Editor xác nhận.`,
      );
    } catch (err: any) {
      onShowToast('Lỗi thêm mục Bible', err.message || 'Không thể tạo bản ghi Series Bible.');
    }
  };

  const handleDeleteRevision = async (entity: BibleEntity, rev: BibleEntryRevisionDto) => {
    if (!effectiveSeries?.id) return;
    try {
      await bibleService.deleteRevision(effectiveSeries.id, entity.id, rev.id);
      onShowToast('Thành công', `Đã xóa phiên bản v${rev.versionNumber} của ${entity.name}.`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi xóa phiên bản', err.message || 'Không thể xóa phiên bản này.');
      throw err;
    }
  };

  const handleDeleteEra = async (entity: BibleEntity, stage: CharacterEraStage) => {
    if (!effectiveSeries?.id) return;
    try {
      await bibleService.deleteEra(
        effectiveSeries.id,
        entity.id,
        stage.effectiveFromChapterNumber,
        stage.stageName,
      );
      onShowToast(
        'Thành công',
        `Đã xóa thời kỳ "${stage.stageName}" (Chương ${stage.effectiveFromChapterNumber}) của ${entity.name}.`,
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast('Lỗi xóa thời kỳ', err.message || 'Không thể xóa thời kỳ này.');
      throw err;
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

  // KPI ở header: đếm theo trạng thái phiên bản hiệu lực (spec V2.6 §5.2)
  const bibleStats = useMemo(() => {
    const statusOf = (id: string) => {
      const st = rawEntries[id]?.effectiveRevision?.reviewStatus as string | number | undefined;
      return st === 2 ? 'ConceptSubmitted' : st === 3 ? 'ReworkRequired' : st;
    };
    const pending = localEntities.filter(
      (e) => !e.isLocked && statusOf(e.id) === 'ConceptSubmitted',
    ).length;
    const rework = localEntities.filter(
      (e) => !e.isLocked && statusOf(e.id) === 'ReworkRequired',
    ).length;
    const locked = localEntities.filter((e) => e.isLocked).length;
    return [
      {
        key: 'pending',
        label: 'Chờ duyệt',
        value: pending,
        icon: Clock,
        tone: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
        iconTone: 'bg-amber-100/80 text-amber-800',
      },
      {
        key: 'rework',
        label: 'Cần vẽ lại',
        value: rework,
        icon: AlertTriangle,
        tone: 'bg-rose-50/70 border-rose-200/80 text-rose-900',
        iconTone: 'bg-rose-100/80 text-rose-800',
      },
      {
        key: 'locked',
        label: 'Đã khoá Canon',
        value: locked,
        icon: Lock,
        tone: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900',
        iconTone: 'bg-emerald-100/80 text-emerald-800',
      },
    ];
  }, [localEntities, rawEntries]);

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

      {/* Header: cùng mẫu hero card với Script Hub / Dashboard (breadcrumb đã có ở AppShell) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5'>
        <div className='min-w-0 space-y-1.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1'>
              <BookOpen className='w-3.5 h-3.5' />
              <span>Canon Hub</span>
            </span>
            {availableSeries.length > 1 ? (
              <select
                value={effectiveSeries?.id || ''}
                onChange={(e) => {
                  const found = availableSeries.find((x) => x.id === e.target.value);
                  if (found) {
                    setSelectedSeriesId(found.id);
                    if (onSelectSeries) onSelectSeries(found);
                  }
                }}
                aria-label='Chọn Series'
                className='px-2.5 py-1 bg-white border border-[#D8D2C5] rounded-full font-semibold text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C] cursor-pointer'
              >
                {availableSeries.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className='text-xs font-semibold text-[#57534E] truncate'>
                {effectiveSeries?.title || 'PanelForge Series'}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-2xl font-bold font-serif text-[#1C1917] tracking-tight'>
              Series Bible
            </h1>
            <span className='px-2.5 py-0.5 rounded-full bg-[#F3F0E9] text-[#57534E] text-xs font-semibold font-mono border border-[#D8D2C5]'>
              {localEntities.length} mục tri thức
            </span>
          </div>
          <p className='text-sm text-[#57534E] leading-relaxed max-w-2xl'>
            Kho tham chiếu chuẩn cho nhân vật, bối cảnh, đạo cụ, thuật ngữ và quy tắc mỹ thuật. Bản
            đã khoá Canon là chuẩn duy nhất cho họa sĩ và kiểm tra nhất quán.
          </p>
        </div>

        <div className='flex items-center gap-3 flex-wrap shrink-0'>
          {bibleStats.map((stat) => (
            <div
              key={stat.key}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border shadow-2xs ${stat.tone}`}
              data-testid={`bible-stat-${stat.key}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconTone}`}
              >
                <stat.icon className='w-4 h-4' />
              </div>
              <div>
                <div className='text-xs font-semibold uppercase tracking-wide opacity-80'>
                  {stat.label}
                </div>
                <div className='text-sm font-bold font-mono'>{stat.value}</div>
              </div>
            </div>
          ))}
          {canCreateDraft ? (
            <button
              type='button'
              onClick={() => setAddEntityOpen(true)}
              className='px-4 py-2 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98]'
              data-testid='add-bible-entry-btn'
            >
              <Plus className='w-4 h-4' />
              <span>{isProducer ? 'Thêm mục mới' : 'Tạo mục nháp'}</span>
            </button>
          ) : (
            <span
              className='px-3 py-1.5 rounded-full bg-[#F3F0E9] border border-[#D8D2C5] text-[#57534E] text-xs font-medium flex items-center gap-1.5'
              title='Chỉ Biên kịch (Writer) hoặc Producer mới có quyền tạo mục trong Series Bible'
              data-testid='bible-readonly-badge'
            >
              <Lock className='w-3.5 h-3.5 text-[#78716C]' />
              <span>Chế độ chỉ xem</span>
            </span>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-[248px_minmax(0,1fr)] items-start'>
        {/* Sidebar: danh mục + quy trình duyệt (DESIGN_RULES §3.4, cột trái) */}
        <aside
          className='lg:sticky lg:top-4 space-y-4'
          aria-label='Danh mục Series Bible'
          data-testid='bible-sidebar'
        >
          <nav className='bg-white border border-stone-200/80 rounded-xl shadow-xs p-2'>
            <p className='px-2.5 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500'>
              Danh mục
            </p>
            <div className='flex lg:flex-col gap-1 overflow-x-auto'>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = categoryCounts[cat.key] || 0;
                const isActive = activeTab === cat.key;
                return (
                  <button
                    key={cat.key}
                    type='button'
                    onClick={() => setActiveTab(cat.key)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`lg:w-full shrink-0 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-2.5 border-l-4 ${
                      isActive
                        ? 'bg-orange-50 text-orange-800 border-orange-500 font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 border-transparent'
                    }`}
                    data-testid={`tab-category-${cat.key}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-stone-500'}`}
                    />
                    <span className='flex-1 text-left'>{cat.label}</span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Spec V2.6 §5.2: vòng đời một phiên bản thiết kế */}
          <div className='hidden lg:block bg-white border border-stone-200/80 rounded-xl shadow-xs p-4 space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wider text-stone-500'>
              Quy trình khoá Canon
            </p>
            <ol className='space-y-2.5'>
              {[
                { label: 'Bản nháp', who: 'Writer tạo mục', dot: 'bg-stone-400' },
                { label: 'Đã nộp Concept', who: 'Artist tải Model Sheet', dot: 'bg-amber-500' },
                { label: 'Đã xác nhận', who: 'Writer / Editor duyệt', dot: 'bg-blue-500' },
                { label: 'Canon Locked', who: 'Producer khoá', dot: 'bg-emerald-600' },
              ].map((step, i) => (
                <li key={step.label} className='flex items-start gap-2.5'>
                  <span className='mt-1.5 flex flex-col items-center'>
                    <span className={`w-2 h-2 rounded-full ${step.dot}`} />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-sm font-semibold text-stone-800'>
                      {i + 1}. {step.label}
                    </span>
                    <span className='block text-xs text-stone-500'>{step.who}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className='text-xs text-stone-500 leading-normal border-t border-stone-100 pt-2.5'>
              Bản đã khoá không sửa được; thay đổi ở chương sau tạo phiên bản mới (BR-01, BR-15).
            </p>
          </div>
        </aside>

        <div className='min-w-0 space-y-4'>
          {/* V2.5: Bible Design Queue cho Artist & Writer */}
          {designQueue.length > 0 && (
            <div
              className='bg-amber-50/60 border border-amber-200/90 rounded-xl p-4 shadow-xs'
              data-testid='bible-design-queue-widget'
            >
              <div className='flex items-center justify-between gap-2 mb-2.5'>
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-lg bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700'>
                    <Palette className='w-3.5 h-3.5' />
                  </div>
                  <h2 className='text-xs sm:text-sm font-bold text-amber-950 font-serif'>
                    Hàng đợi vẽ thiết kế Concept Art ({designQueue.length} mục chờ xử lý)
                  </h2>
                </div>
                <span className='text-xs text-amber-800 font-medium hidden sm:inline'>
                  Artist &amp; Writer phối hợp thiết kế trước khi đưa vào sản xuất chương
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5'>
                {designQueue.map((item) => {
                  const matchedEntity = localEntities.find((e) => e.id === item.entryId);
                  return (
                    <div
                      key={item.entryId}
                      className='bg-white/95 rounded-lg border border-amber-200 p-2.5 flex items-center justify-between gap-2 hover:border-orange-400 transition-colors shadow-2xs'
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <span className='font-mono font-bold text-xs px-1.5 py-0.5 bg-stone-100 text-stone-800 rounded'>
                            {item.code}
                          </span>
                          <span className='font-semibold text-xs text-stone-900 truncate'>
                            {item.name}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 mt-1'>
                          {item.reviewStatus === 'ReworkRequired' ||
                          (item as any).status === 'ReworkRequired' ||
                          item.reviewStatus === 3 ||
                          (item as any).status === 3 ? (
                            <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold whitespace-nowrap'>
                              Yêu cầu vẽ lại
                            </span>
                          ) : item.reviewStatus === 'ConceptSubmitted' ||
                            (item as any).status === 'ConceptSubmitted' ||
                            item.reviewStatus === 2 ||
                            (item as any).status === 2 ? (
                            <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold whitespace-nowrap'>
                              Đã nộp (Chờ duyệt)
                            </span>
                          ) : (
                            <span className='px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold whitespace-nowrap'>
                              Chờ nộp Concept Art
                            </span>
                          )}
                          <span className='text-xs text-stone-500 font-mono'>
                            Ch.{item.effectiveFromChapterNumber}
                          </span>
                        </div>
                        {item.reworkFeedback && (
                          <p className='text-xs text-rose-800 truncate mt-0.5 italic'>
                            &quot;{item.reworkFeedback}&quot;
                          </p>
                        )}
                      </div>

                      {isArtist ? (
                        item.reviewStatus === 'ConceptSubmitted' ||
                        (item as any).status === 'ConceptSubmitted' ||
                        item.reviewStatus === 2 ||
                        (item as any).status === 2 ? (
                          <button
                            type='button'
                            onClick={() => {
                              if (matchedEntity) {
                                void handleOpenAddRevision(
                                  matchedEntity,
                                  null,
                                  true,
                                  item.effectiveFromChapterNumber,
                                  undefined,
                                  true,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            title='Nộp lại nếu bạn lỡ tải nhầm file ảnh trước khi duyệt'
                            data-testid={`resubmit-concept-${item.entryId}`}
                          >
                            <RotateCcw className='w-3 h-3' />
                            <span>Nộp lại</span>
                          </button>
                        ) : item.reviewStatus === 'ReworkRequired' ||
                          (item as any).status === 'ReworkRequired' ||
                          item.reviewStatus === 3 ||
                          (item as any).status === 3 ? (
                          <button
                            type='button'
                            onClick={() => {
                              if (matchedEntity) {
                                void handleOpenAddRevision(
                                  matchedEntity,
                                  null,
                                  true,
                                  item.effectiveFromChapterNumber,
                                  item.reworkFeedback || undefined,
                                  false,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            title='Nộp lại bản vẽ sau khi đã sửa theo góp ý'
                            data-testid={`rework-concept-${item.entryId}`}
                          >
                            <Palette className='w-3 h-3' />
                            <span>Sửa lại</span>
                          </button>
                        ) : (
                          <button
                            type='button'
                            onClick={() => {
                              if (matchedEntity) {
                                void handleOpenAddRevision(
                                  matchedEntity,
                                  null,
                                  true,
                                  item.effectiveFromChapterNumber,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            data-testid={`upload-concept-${item.entryId}`}
                          >
                            <Upload className='w-3 h-3' />
                            <span>Tải ảnh</span>
                          </button>
                        )
                      ) : (
                        <button
                          type='button'
                          onClick={() => {
                            if (matchedEntity) {
                              void handleOpenHistory(matchedEntity);
                            }
                          }}
                          className='px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors border border-stone-300 flex items-center gap-1'
                          title='Chỉ Họa sĩ (Artist) mới có quyền tải ảnh Concept Art'
                          data-testid={`view-concept-history-${item.entryId}`}
                        >
                          <Eye className='w-3 h-3' />
                          <span>Xem chi tiết</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thanh công cụ tra cứu tích hợp (Category Tabs + Search + Chapter + Filters + View Mode) */}
          <div className='bg-white border border-stone-200/80 rounded-xl p-3 shadow-xs space-y-3'>
            {/* Unified Search, Chapter Selector, Status Filter & View Mode */}
            <div className='flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-2.5'>
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
                  <span className='text-[#57534E] font-medium text-xs whitespace-nowrap'>
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
                  Tìm thấy <strong>{filteredEntities.length}</strong> / {localEntities.length} mục
                  phù hợp
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
            localEntities.length === 0 ? (
              <EmptyFolderState
                title='Series Bible chưa có mục nào'
                subtitle='Thêm các nhân vật, địa điểm, đạo cụ hoặc quy tắc mỹ thuật để hỗ trợ họa sĩ và hệ thống kiểm tra nhất quán.'
                actionText={
                  canCreateDraft
                    ? isProducer
                      ? 'Tạo mục đầu tiên'
                      : 'Tạo bản nháp đầu tiên'
                    : undefined
                }
                onAction={canCreateDraft ? () => setAddEntityOpen(true) : undefined}
              />
            ) : (
              <div className='bg-[#FCFBF8] border border-dashed border-[#D8D2C5] rounded-xl p-10 text-center space-y-3'>
                <div className='w-12 h-12 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316] mx-auto'>
                  <BookOpen className='w-6 h-6' />
                </div>
                <h3 className='font-bold font-serif text-base text-[#1C1917]'>
                  Không tìm thấy mục phù hợp
                </h3>
                <p className='text-xs text-[#57534E] max-w-md mx-auto'>
                  Không có mục tri thức nào khớp với điều kiện lọc hiện tại. Thử đổi từ khóa hoặc
                  xóa bộ lọc.
                </p>
                <button
                  type='button'
                  onClick={handleResetFilters}
                  className='px-3.5 py-1.5 bg-[#F3F0E9] hover:bg-[#E7E2D6] text-[#1C1917] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer'
                >
                  <RotateCcw className='w-3.5 h-3.5' />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )
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
                        <div className='relative w-full h-36 bg-stone-950 overflow-hidden flex items-center justify-center border-b border-[#D8D2C5]'>
                          <AuthenticatedImage
                            src={entity.imageUrl}
                            alt={entity.name}
                            className='w-full h-full object-cover group-hover:scale-103 transition-transform duration-300'
                          />
                          <div className='absolute top-2 left-2 flex items-center gap-1.5 flex-wrap'>
                            <span className='px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-xs font-mono font-bold'>
                              {entity.code}
                            </span>
                            {entity.isLocked ? (
                              <span
                                className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1 shadow-2xs'
                                title='Character Sheet đã khóa chuẩn (Canon Locked) theo BR-15'
                              >
                                <Lock className='w-3.5 h-3.5 text-emerald-600' />
                                Đã khoá Canon
                              </span>
                            ) : effRev?.reviewStatus === 'WriterEndorsed' ? (
                              <span
                                className='px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs'
                                title='Writer đã duyệt thiết kế (Chờ Producer duyệt & khóa)'
                              >
                                <Check className='w-2.5 h-2.5' />
                                Writer duyệt
                              </span>
                            ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                              <span
                                className='px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs'
                                title='Artist đã nộp concept (Chờ kiểm duyệt)'
                              >
                                <Palette className='w-2.5 h-2.5' />
                                Concept đã nộp
                              </span>
                            ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                              <span
                                className='px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs'
                                title='Yêu cầu Artist vẽ lại theo nhận xét'
                              >
                                <AlertTriangle className='w-2.5 h-2.5' />
                                Cần vẽ lại
                              </span>
                            ) : null}
                          </div>
                          <div className='absolute bottom-2 right-2'>
                            <span className='px-1.5 py-0.5 rounded bg-[#FCFBF8]/95 backdrop-blur-xs text-[#57534E] text-xs font-semibold border border-[#D8D2C5] shadow-xs'>
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
                                className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1'
                                title='Character Sheet đã khóa chuẩn (Canon Locked) theo BR-15'
                              >
                                <Lock className='w-3.5 h-3.5 text-emerald-600' />
                                Đã khoá Canon
                              </span>
                            ) : effRev?.reviewStatus === 'WriterEndorsed' ? (
                              <span className='px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1'>
                                <Check className='w-2.5 h-2.5' /> Writer duyệt
                              </span>
                            ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                              <span className='px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1'>
                                <Palette className='w-2.5 h-2.5' /> Concept đã nộp
                              </span>
                            ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                              <span className='px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-medium flex items-center gap-1'>
                                <AlertTriangle className='w-2.5 h-2.5' /> Cần vẽ lại
                              </span>
                            ) : (
                              <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-xs font-medium'>
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
                              <span className='font-sans font-medium text-[#57534E]'>
                                {' '}
                                · {effRev.stageName}
                              </span>
                            ) : null}
                          </h3>
                          {entity.subtitle && (
                            <p className='text-xs text-[#57534E] font-medium line-clamp-1 mt-0.5'>
                              {entity.subtitle}
                            </p>
                          )}
                        </div>

                        {effRev?.reviewStatus === 'ReworkRequired' && effRev.reworkFeedback && (
                          <div className='p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs leading-tight flex items-start gap-1.5'>
                            <AlertTriangle className='w-3 h-3 text-rose-500 shrink-0 mt-0.5' />
                            <span className='line-clamp-2'>
                              <strong>Cần sửa:</strong> &quot;{effRev.reworkFeedback}&quot;
                            </span>
                          </div>
                        )}

                        <p
                          className='text-xs text-[#57534E] leading-relaxed line-clamp-2'
                          title={entity.description}
                        >
                          {entity.description || 'Chưa có mô tả chi tiết cho mục này.'}
                        </p>

                        {/* Stage & Chapter Range info */}
                        <div className='pt-2 border-t border-[#D8D2C5]/60 flex items-center justify-between text-xs text-[#57534E]'>
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
                    <div className='p-2.5 bg-[#F8F6F0] border-t border-[#D8D2C5] flex items-center justify-between gap-1.5 flex-wrap'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
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

                        {/* Quick review actions for Writer/Editor when concept is submitted */}
                        {canRequestRework &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ConceptSubmitted' && (
                            <div className='flex items-center gap-1'>
                              {canEndorse && (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleEndorseRevision(effRev, entity);
                                  }}
                                  className='px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                  title='Writer/Editor duyệt concept art này'
                                >
                                  <Check className='w-3 h-3' />
                                  <span>Duyệt</span>
                                </button>
                              )}
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReworkModal(effRev, entity);
                                }}
                                className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                title='Yêu cầu Artist vẽ lại concept'
                              >
                                <MessageSquare className='w-3 h-3' />
                                <span>Sửa lại</span>
                              </button>
                            </div>
                          )}

                        {/* Artist actions: Resubmit if mistakenly submitted, or rework */}
                        {isArtist &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ConceptSubmitted' && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenAddRevision(
                                  entity,
                                  null,
                                  true,
                                  effRev.effectiveFromChapterNumber,
                                  undefined,
                                  true,
                                );
                              }}
                              className='px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title='Nộp lại bản vẽ thay thế nếu nộp nhầm file'
                              data-testid={`artist-resubmit-btn-${entity.id}`}
                            >
                              <RotateCcw className='w-3 h-3 text-amber-600' />
                              <span>Nộp lại</span>
                            </button>
                          )}
                        {isArtist &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ReworkRequired' && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenAddRevision(
                                  entity,
                                  effRev,
                                  true,
                                  effRev.effectiveFromChapterNumber,
                                  effRev.reworkFeedback || undefined,
                                  false,
                                );
                              }}
                              className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title='Nộp bản vẽ sửa đổi theo nhận xét của Writer/Editor'
                              data-testid={`artist-rework-btn-${entity.id}`}
                            >
                              <Palette className='w-3 h-3 text-rose-600' />
                              <span>Sửa lại</span>
                            </button>
                          )}
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
                                : 'Tạo bản nháp mới – chờ Writer/Editor xác nhận'
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
                              <span className='font-sans font-medium text-[#57534E]'>
                                {' '}
                                · {effRev.stageName}
                              </span>
                            ) : null}
                          </h3>
                          <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-xs font-medium'>
                            {getCategoryLabel(entity.category)}
                          </span>
                          {entity.isLocked ? (
                            <span
                              className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1'
                              title='Character Sheet đã khóa chuẩn (Canon Locked) theo BR-15'
                            >
                              <Lock className='w-3.5 h-3.5 text-emerald-600' />
                              Đã khoá Canon
                            </span>
                          ) : effRev?.reviewStatus === 'WriterEndorsed' ? (
                            <span className='px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1'>
                              <Check className='w-2.5 h-2.5' /> Writer duyệt
                            </span>
                          ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                            <span className='px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1'>
                              <Palette className='w-2.5 h-2.5' /> Concept đã nộp
                            </span>
                          ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                            <span className='px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-medium flex items-center gap-1'>
                              <AlertTriangle className='w-2.5 h-2.5' /> Cần vẽ lại
                            </span>
                          ) : null}
                        </div>
                        {entity.subtitle && (
                          <p className='text-xs text-[#C2410C] font-medium truncate'>
                            {entity.subtitle}
                          </p>
                        )}
                        {effRev?.reviewStatus === 'ReworkRequired' && effRev.reworkFeedback && (
                          <p className='text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 line-clamp-1 italic'>
                            Cần sửa: &quot;{effRev.reworkFeedback}&quot;
                          </p>
                        )}
                        <p className='text-xs text-[#57534E] line-clamp-1'>
                          {entity.description || 'Chưa có mô tả cho mục này.'}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8D2C5]/60'>
                      <div className='text-right text-xs text-[#57534E] hidden md:block'>
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

                      <div className='flex items-center gap-1.5 flex-wrap'>
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

                        {canRequestRework &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ConceptSubmitted' && (
                            <>
                              {canEndorse && (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleEndorseRevision(effRev, entity);
                                  }}
                                  className='px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                  title='Writer/Editor duyệt concept art này'
                                >
                                  <Check className='w-3 h-3' />
                                  <span className='hidden sm:inline'>Duyệt</span>
                                </button>
                              )}
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReworkModal(effRev, entity);
                                }}
                                className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                title='Yêu cầu Artist vẽ lại concept'
                              >
                                <MessageSquare className='w-3 h-3' />
                                <span className='hidden sm:inline'>Sửa lại</span>
                              </button>
                            </>
                          )}
                        {isArtist &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ConceptSubmitted' && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenAddRevision(
                                  entity,
                                  null,
                                  true,
                                  effRev.effectiveFromChapterNumber,
                                  undefined,
                                  true,
                                );
                              }}
                              className='px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title='Nộp lại bản vẽ thay thế nếu nộp nhầm file'
                              data-testid={`artist-resubmit-btn-${entity.id}`}
                            >
                              <RotateCcw className='w-3 h-3 text-amber-600' />
                              <span className='hidden sm:inline'>Nộp lại</span>
                            </button>
                          )}
                        {isArtist &&
                          !entity.isLocked &&
                          effRev?.reviewStatus === 'ReworkRequired' && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenAddRevision(
                                  entity,
                                  effRev,
                                  true,
                                  effRev.effectiveFromChapterNumber,
                                  effRev.reworkFeedback || undefined,
                                  false,
                                );
                              }}
                              className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title='Nộp bản vẽ sửa đổi theo nhận xét của Writer/Editor'
                              data-testid={`artist-rework-btn-${entity.id}`}
                            >
                              <Palette className='w-3 h-3 text-rose-600' />
                              <span className='hidden sm:inline'>Sửa lại</span>
                            </button>
                          )}
                        {canCreateDraft && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenAddRevision(entity);
                            }}
                            className='px-2 py-1 bg-[#FCFBF8] hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs'
                            title={
                              isProducer
                                ? 'Tạo phiên bản mới'
                                : 'Tạo bản nháp mới – chờ Writer/Editor xác nhận'
                            }
                            data-testid={`add-revision-btn-${entity.id}`}
                          >
                            <GitCommit className='w-3 h-3' />
                            <span className='hidden sm:inline'>
                              {isProducer ? '+ Bản' : '+ Nháp'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedEntity && (
        <BibleEntityDetailModal
          entity={selectedEntity}
          rawEntry={rawEntries[selectedEntity.id]}
          isProducer={isProducer}
          isArtist={isArtist}
          canCreateDraft={canCreateDraft}
          canEndorse={canEndorse}
          canRequestRework={canRequestRework}
          seriesId={effectiveSeries?.id}
          onClose={() => setSelectedEntity(null)}
          onOpenHistory={(e) => {
            void handleOpenHistory(e);
          }}
          onOpenAddRevision={(
            e,
            supersede,
            fromQueue,
            queueEffectiveChapter,
            reworkFeedback,
            isResubmit,
            isNewEra,
          ) => {
            void handleOpenAddRevision(
              e,
              supersede,
              fromQueue,
              queueEffectiveChapter,
              reworkFeedback,
              isResubmit,
              isNewEra,
            );
          }}
          onEndorseRevision={(ent, rev) => handleEndorseRevision(rev, ent)}
          onRequestRework={(ent, rev) => handleOpenReworkModal(rev, ent)}
          onLockRevision={(rev) => handleLockRevision(rev, selectedEntity)}
          onShowToast={onShowToast}
          onZoomImage={(img) => setSelectedImageZoom(img)}
          onDeleteRevision={(ent, rev) => handleDeleteRevision(ent, rev)}
          onDeleteEra={(ent, stg) => handleDeleteEra(ent, stg)}
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
              <div className='max-h-[82vh] overflow-hidden rounded-xl border border-white/20 bg-stone-950 flex items-center justify-center'>
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
            className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-4'
            role='dialog'
            aria-modal='true'
            data-child-modal='true'
            aria-labelledby='bible-history-modal-title'
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setHistoryModalOpen(false);
              }
            }}
          >
            <div
              className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
                <div className='flex items-center gap-2'>
                  <History className='w-4 h-4 text-[#F97316]' />
                  <h3
                    id='bible-history-modal-title'
                    className='text-sm font-bold font-sans text-stone-900'
                  >
                    Lịch sử phiên bản: {historyEntityName}
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={() => setHistoryModalOpen(false)}
                  aria-label='Đóng'
                  className='w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-stone-400 hover:text-stone-700'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              <div className='p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar'>
                <div className='text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed'>
                  Toàn bộ lịch sử chỉnh sửa thiết kế được lưu giữ đầy đủ theo từng mốc chương, đảm
                  bảo tính nhất quán và bảo toàn tiến trình sáng tác.
                </div>

                {loadingHistory ? (
                  <div className='py-8 text-center text-xs text-stone-500 flex flex-col items-center gap-2'>
                    <Loader2 className='w-5 h-5 animate-spin text-[#F97316]' />
                    <span>Đang tải lịch sử phiên bản...</span>
                  </div>
                ) : historyRevisions.length === 0 ? (
                  <div className='py-8 text-center text-xs text-stone-500'>
                    Chưa có phiên bản nào được ghi nhận.
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {/* Visual Stage Progression Timeline */}
                    <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3 space-y-1.5'>
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-stone-700'>
                        <Layers className='w-3.5 h-3.5 text-[#F97316]' />
                        <span>Tiến trình các giai đoạn ({historyEntityName}):</span>
                      </div>
                      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar flex-wrap'>
                        {(() => {
                          const eraMap = new Map<number, BibleEntryRevisionDto[]>();
                          for (const r of historyRevisions) {
                            const ch = r.effectiveFromChapterNumber || 1;
                            if (!eraMap.has(ch)) eraMap.set(ch, []);
                            eraMap.get(ch)!.push(r);
                          }
                          const distinctEras = Array.from(eraMap.entries())
                            .sort(([a], [b]) => a - b)
                            .map(([ch, rList]) => {
                              const sorted = [...rList].sort(
                                (a, b) => b.versionNumber - a.versionNumber,
                              );
                              const latest = sorted[0];
                              const isLocked = sorted.some((r) => r.isLocked);
                              const named = sorted.find((r) => r.stageName?.trim());
                              const title =
                                named?.stageName?.trim() ||
                                (ch === 1 ? 'Giai đoạn chuẩn' : `Chương ${ch}`);
                              const toStr = latest.effectiveToChapterNumber
                                ? `Ch.${ch}–${latest.effectiveToChapterNumber}`
                                : `Ch.${ch} → hết`;
                              return { ch, title, toStr, isLocked };
                            });

                          return distinctEras.map((era, idx, arr) => (
                            <React.Fragment key={era.ch}>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                                  era.isLocked
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                    : 'bg-white border-stone-200 text-stone-700'
                                }`}
                              >
                                {era.isLocked && <Lock className='w-2.5 h-2.5 text-amber-600' />}
                                <span>
                                  {era.title} ({era.toStr})
                                </span>
                              </span>
                              {idx < arr.length - 1 && (
                                <span className='text-stone-400 font-bold'>→</span>
                              )}
                            </React.Fragment>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className='relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200'>
                      {historyRevisions.map((rev) => (
                        <div key={rev.id} className='relative group'>
                          <div className='absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#F97316]'></div>
                          <div className='bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E7E7] space-y-2'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <span className='px-2 py-0.5 rounded bg-stone-900 text-white font-mono text-xs font-bold'>
                                  {rev.stageName ? rev.stageName : `VERSION ${rev.versionNumber}`}
                                  {rev.isInitialVersion ? ' (Khởi tạo)' : ''}
                                </span>
                                {rev.isLocked || rev.reviewStatus === 'CanonLocked' ? (
                                  <span className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-xs font-mono font-bold flex items-center gap-1 shadow-2xs'>
                                    <Lock className='w-2.5 h-2.5 text-amber-600' />
                                    ĐÃ KHOÁ CANON
                                  </span>
                                ) : rev.reviewStatus === 'WriterEndorsed' ? (
                                  <span className='px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold'>
                                    ✓ Writer Endorsed
                                  </span>
                                ) : rev.reviewStatus === 'ConceptSubmitted' ? (
                                  <span className='px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold'>
                                    Concept Submitted
                                  </span>
                                ) : rev.reviewStatus === 'ReworkRequired' ? (
                                  <span className='px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold'>
                                    Cần vẽ lại
                                  </span>
                                ) : (
                                  <span className='px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 text-xs font-medium'>
                                    Bản nháp
                                  </span>
                                )}
                              </div>
                              <span className='text-xs font-mono text-stone-500 flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                {new Date(rev.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className='flex items-start gap-3'>
                              {(rev.conceptImageUrl || rev.referenceImageUrl) && (
                                <AuthenticatedImage
                                  src={rev.conceptImageUrl || rev.referenceImageUrl!}
                                  alt={rev.summary || `v${rev.versionNumber}`}
                                  className='w-14 h-14 object-cover rounded-lg border border-stone-200 shrink-0 shadow-2xs cursor-pointer hover:scale-105 transition'
                                  onClick={() =>
                                    setSelectedImageZoom({
                                      url: rev.conceptImageUrl || rev.referenceImageUrl!,
                                      title: rev.summary || `Phiên bản v${rev.versionNumber}`,
                                    })
                                  }
                                />
                              )}
                              <div className='min-w-0 flex-1 space-y-1.5'>
                                <div className='text-xs font-semibold text-stone-900'>
                                  {rev.summary}
                                </div>
                                {rev.reworkFeedback && (
                                  <div className='p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs'>
                                    <strong>Nhận xét yêu cầu sửa:</strong> {rev.reworkFeedback}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Chronological Event Timeline for Revision */}
                            {rev.events && rev.events.length > 0 && (
                              <div className='mt-2 pt-2 border-t border-stone-200/60 space-y-1.5'>
                                <div className='text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5'>
                                  <Clock className='w-3 h-3 text-[#F97316]' />
                                  <span>Dòng thời gian sự kiện duyệt ({rev.events.length})</span>
                                </div>
                                <div className='space-y-1.5 pl-2 border-l-2 border-orange-200'>
                                  {rev.events.map((evt) => {
                                    let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
                                    let label: string = evt.type;
                                    if (evt.type === 'Created') {
                                      badgeColor = 'bg-stone-100 text-stone-800 border-stone-200';
                                      label = 'Khởi tạo';
                                    } else if (evt.type === 'ConceptSubmitted') {
                                      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                                      label = 'Nộp Concept';
                                    } else if (evt.type === 'ReworkRequested') {
                                      badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                                      label = 'Yêu cầu sửa';
                                    } else if (evt.type === 'Endorsed') {
                                      badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                                      label = 'Đã xác nhận';
                                    } else if (evt.type === 'Locked') {
                                      badgeColor =
                                        'bg-emerald-50 text-emerald-800 border-emerald-200';
                                      label = 'Khoá Canon';
                                    } else if (evt.type === 'Superseded') {
                                      badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
                                      label = 'Bị thay thế';
                                    }

                                    return (
                                      <div
                                        key={evt.id}
                                        className='text-xs space-y-1 bg-white/70 p-2 rounded-lg border border-stone-100'
                                      >
                                        <div className='flex items-center gap-2 flex-wrap text-xs'>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}
                                          >
                                            {label}
                                          </span>
                                          <span className='text-xs text-stone-400 font-mono'>
                                            {new Date(evt.createdAt).toLocaleString('vi-VN')}
                                          </span>
                                          {evt.eventHash && (
                                            <span
                                              className='text-xs text-emerald-600 font-medium flex items-center gap-0.5'
                                              title='Phiên bản đã được lưu vết an toàn'
                                            >
                                              <ShieldCheck className='w-3 h-3' />
                                              Đã chứng thực
                                            </span>
                                          )}
                                        </div>
                                        {evt.comment && (
                                          <p className='text-xs text-stone-600 italic bg-stone-50 p-1.5 rounded border border-stone-200/60'>
                                            "{evt.comment}"
                                          </p>
                                        )}
                                        {evt.imageUrl && (
                                          <div className='mt-1 flex items-center gap-2'>
                                            <AuthenticatedImage
                                              src={evt.imageUrl}
                                              alt={label}
                                              className='w-12 h-12 object-cover rounded border border-stone-200 shadow-2xs hover:scale-105 transition cursor-pointer'
                                              onClick={() =>
                                                setSelectedImageZoom({
                                                  url: evt.imageUrl!,
                                                  title: `${label} - ${rev.summary || ''}`,
                                                })
                                              }
                                              title='Nhấp để mở ảnh cỡ lớn'
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/70'>
                              <div className='flex items-center gap-2'>
                                <span className='px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold'>
                                  {rev.effectiveToChapterNumber
                                    ? `Chương ${rev.effectiveFromChapterNumber} – ${rev.effectiveToChapterNumber}`
                                    : `Hiệu lực từ Chương ${rev.effectiveFromChapterNumber} → hết`}
                                </span>
                                <span
                                  className='text-xs font-mono text-stone-400 truncate max-w-[120px]'
                                  title={rev.contentHash}
                                >
                                  Hash: {rev.contentHash.substring(0, 8)}...
                                </span>
                              </div>

                              <div className='flex items-center gap-1.5 flex-wrap'>
                                {canRequestRework && !rev.isLocked && (
                                  <>
                                    {canEndorse && (
                                      <button
                                        type='button'
                                        disabled={endorsingRevId === rev.id}
                                        onClick={() => void handleEndorseRevision(rev)}
                                        className='px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                                        title='Writer / Editor xác nhận thiết kế đạt chuẩn'
                                      >
                                        <CheckCircle2 className='w-3 h-3' />
                                        <span>
                                          {endorsingRevId === rev.id
                                            ? 'Đang duyệt...'
                                            : 'Duyệt thiết kế'}
                                        </span>
                                      </button>
                                    )}
                                    <button
                                      type='button'
                                      onClick={() => handleOpenReworkModal(rev)}
                                      className='px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                                      title='Yêu cầu Artist vẽ lại theo nhận xét'
                                    >
                                      <MessageSquare className='w-3 h-3' />
                                      <span>Yêu cầu sửa</span>
                                    </button>
                                  </>
                                )}

                                {!rev.isLocked && historyEntity?.isVisualDesign && isProducer && (
                                  <button
                                    type='button'
                                    disabled={
                                      lockingRevisionId === rev.id ||
                                      (rev.reviewStatus !== 'WriterEndorsed' &&
                                        rev.reviewStatus !== 4)
                                    }
                                    onClick={() => void handleLockRevision(rev)}
                                    className='px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer'
                                    title={
                                      rev.reviewStatus !== 'WriterEndorsed' &&
                                      rev.reviewStatus !== 4
                                        ? 'Chỉ có thể khoá Canon phiên bản đã được Writer/Editor xác nhận (WriterEndorsed) (BR-01)'
                                        : 'Producer phê duyệt và khoá phiên bản này làm tham chiếu chuẩn Canon'
                                    }
                                    data-testid={`btn-lock-canon-${rev.id}`}
                                  >
                                    <Lock className='w-3 h-3' />
                                    <span>
                                      {lockingRevisionId === rev.id
                                        ? 'Đang khoá...'
                                        : 'Duyệt & Khoá Canon'}
                                    </span>
                                  </button>
                                )}
                                {rev.isLocked && historyEntity?.isVisualDesign && isProducer && (
                                  <button
                                    type='button'
                                    onClick={() => {
                                      if (!historyEntity) return;
                                      setHistoryModalOpen(false);
                                      void handleOpenAddRevision(historyEntity, rev);
                                    }}
                                    className='px-2.5 py-1 rounded-lg bg-stone-600 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                                    title='Tạo bản mới cùng chương thay cho bản khoá này'
                                  >
                                    <Lock className='w-3 h-3' />
                                    <span>Thay thế bản khoá</span>
                                  </button>
                                )}
                              </div>
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
      <AddRevisionModal
        isOpen={addRevModalOpen}
        revisionTarget={revisionTarget}
        supersedeTarget={supersedeTarget}
        isNewEraInitial={isNewEraRequested}
        existingStages={targetEntityStages}
        isArtistConceptSubmit={isArtistConceptSubmit}
        isArtistResubmit={isArtistResubmit}
        isArtist={isArtist}
        isProducer={isProducer}
        revisionReworkFeedback={revisionReworkFeedback}
        initialStageName={revisionStageName}
        initialEffectiveChapter={revisionEffectiveChapter}
        initialEffectiveToChapter={revisionEffectiveToChapter}
        initialName={revisionName}
        initialSubtitle={revisionSubtitle}
        initialSummary={revisionSummary}
        initialDescription={revisionDescription}
        initialReferenceImageUrl={revisionReferenceImageUrl}
        expectedVersionNumber={expectedVersionNumber}
        lockedChapterNumbers={lockedChapterNumbers}
        savingRevision={savingRevision}
        uploadingRevImage={uploadingRevImage}
        onUploadImage={async (file) => {
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
            return res.url;
          } catch (err: any) {
            onShowToast(
              'Lỗi tải ảnh tham chiếu',
              err.message || 'Không thể tải ảnh reference sheet.',
            );
          } finally {
            setUploadingRevImage(false);
          }
        }}
        onClose={() => setAddRevModalOpen(false)}
        onSubmit={executeSaveRevision}
        onConfirmArtistSubmit={(content) => {
          setPendingSubmissionContent(content);
          setConfirmSubmitModalOpen(true);
        }}
      />

      {/* REWORK MODAL PORTAL */}
      <ReworkModal
        isOpen={reworkModalOpen}
        targetRev={reworkTargetRev}
        entityName={historyEntity?.name || selectedEntity?.name || ''}
        isSubmitting={submittingRework}
        onClose={() => setReworkModalOpen(false)}
        onSubmit={handleSubmitRework}
      />

      {/* CONFIRM CONCEPT SUBMISSION MODAL (ARTIST) */}
      <LucianConfirmModal
        isOpen={confirmSubmitModalOpen}
        onCancel={() => {
          setConfirmSubmitModalOpen(false);
          setPendingSubmissionContent(null);
        }}
        onConfirm={() => {
          const contentToSubmit = pendingSubmissionContent;
          setConfirmSubmitModalOpen(false);
          setPendingSubmissionContent(null);
          void executeSaveRevision(contentToSubmit);
        }}
        title={isArtistResubmit ? 'Nộp lại Concept Art' : 'Nộp duyệt Concept Art'}
        confirmText={isArtistResubmit ? 'Nộp lại bản' : 'Nộp duyệt'}
        cancelText='Kiểm tra lại'
        variant='info'
        description={
          isArtistResubmit
            ? `Bạn có chắc chắn muốn nộp lại bản vẽ thay thế cho "${revisionName || revisionTarget?.name}" không? Bản nộp mới này sẽ thay thế bản vẽ đang chờ duyệt.`
            : `Bạn có chắc chắn muốn nộp bản vẽ Concept Art cho "${revisionName || revisionTarget?.name}" không? Writer hoặc Editor sẽ duyệt bản vẽ, sau đó Producer khoá canon.`
        }
      />

      {/* Add Entity Modal */}
      <AddEntityModal
        isOpen={addEntityOpen}
        isProducer={isProducer}
        isArtist={isArtist}
        onClose={() => setAddEntityOpen(false)}
        onAdd={handleCreateEntity}
        onShowToast={onShowToast}
        seriesId={effectiveSeries?.id}
      />
    </PageContainer>
  );
};
