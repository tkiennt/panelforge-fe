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
  BibleReviewStatus,
} from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { AddEntityModal } from './AddEntityModal';
import {
  BibleEntityDetailModal,
  groupRevisionsIntoVariants,
  type CharacterVariant,
} from './BibleEntityDetailModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { EmptyFolderState } from '@/shared/components/lucian';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useTranslation } from '@/lib/i18n';
import { CollapsibleSidebar, Modal, SidebarSection } from '@/shared/ui';

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
    isLocked: entry.effectiveRevision?.reviewStatus === 'CanonLocked',
    lockedAt: entry.effectiveRevision?.lockedAt ?? null,
    latestDraftVersionNumber: entry.latestDraftVersionNumber ?? null,
    isCrowd: entry.isCrowd ?? false,
    isStub: entry.isStub ?? false,
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
  const { t } = useTranslation();
  const [localEntities, setLocalEntities] = useState<BibleEntity[]>(entities);
  const [rawEntries, setRawEntries] = useState<Record<string, BibleEntryDto>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BibleReviewStatus>('ALL');
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
            lastUpdated: s.updatedAt || s.createdAt || t('bible.view.timeJustNow', 'Vừa xong'),
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
  }, [workspaceId, activeProject?.id, onSelectSeries, t]);

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
      return (
        normalizeWorkspaceRole(ws?.currentUserRole || ws?.role || ws?.userRole) ||
        normalizeWorkspaceRole(localStorage.getItem('workspaceRole'))
      );
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
  const isEditor = currentUserRole === 'EDITOR';
  const isWriter = currentUserRole === 'WRITER';
  const canCreateDraft = isWriter;
  // V2.6 (Q20/Q22): Xác nhận = khoá Canon chỉ dành cho Editor; Yêu cầu vẽ lại cho Writer + Editor + Producer. Producer không thấy nút xác nhận/khoá.
  const canEndorse = isEditor;
  const canRequestRework = isWriter || isEditor || isProducer;

  const handleConfirmCanon = async (rev: BibleEntryRevisionDto, entity?: BibleEntity) => {
    const targetEntity = entity || historyEntity || selectedEntity || null;
    if (!effectiveSeries?.id || !targetEntity) return;

    if (!targetEntity.isVisualDesign) {
      onShowToast(
        t('bible.view.lockCanonVisualDesignOnly', 'Chỉ áp dụng cho mục có thiết kế hình'),
        t(
          'bible.view.lockCanonVisualDesignOnlyDesc',
          'Chỉ khoá Canon được Nhân vật, Bối cảnh và Đạo cụ; Thuật ngữ/Quy tắc có hiệu lực ngay.',
        ),
      );
      return;
    }

    if (rev.reviewStatus !== 'ConceptSubmitted') {
      onShowToast(
        t('bible.view.lockCanonConceptSubmittedOnly', 'Chưa thể khoá Canon'),
        t(
          'bible.view.lockCanonConceptSubmittedOnlyDesc',
          'Chỉ có thể xác nhận & khoá Canon phiên bản đang nộp concept (ConceptSubmitted).',
        ),
      );
      return;
    }

    const confirmed = await confirm({
      title: t(
        'bible.view.confirmLockCanonTitle',
        'Xác nhận & Khóa Canon phiên bản v{version}?',
      ).replace('{version}', String(rev.versionNumber)),
      description: t(
        'bible.view.confirmLockCanonDesc',
        'Editor xác nhận bản vẽ và cố định phiên bản này của "{name}" làm tham chiếu chuẩn (Canon).',
      ).replace('{name}', targetEntity.name),
      confirmText: t('bible.view.confirmLockCanonSubmit', 'Xác nhận & Khóa Canon'),
      cancelText: t('bible.view.confirmLockCanonCancel', 'Hủy'),
      variant: 'warning',
    });
    if (!confirmed) return;

    setLockingRevisionId(rev.id);
    try {
      const updatedRev = await bibleService.confirmRevision(
        effectiveSeries.id,
        targetEntity.id,
        rev.id,
        { conceptEventId: rev.currentConceptEventId || undefined },
      );
      onShowToast(
        t('bible.view.lockCanonSuccessTitle', 'Đã xác nhận & khoá Canon'),
        t(
          'bible.view.lockCanonSuccessDesc',
          { version: rev.versionNumber, name: targetEntity.name },
          'Phiên bản v{version} của "{name}" đã được khoá làm tham chiếu chuẩn thành công.',
        ),
      );
      setHistoryRevisions((prev) =>
        prev.map((r) =>
          r.id === rev.id ? { ...r, ...updatedRev, reviewStatus: 'CanonLocked' } : r,
        ),
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast(
        t('bible.view.lockCanonErrorTitle', 'Lỗi khoá phiên bản'),
        err.message || t('bible.view.lockCanonErrorDesc', 'Không thể khoá phiên bản này.'),
      );
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
        t('bible.view.reworkSuccessTitle', 'Đã gửi yêu cầu vẽ lại'),
        t(
          'bible.view.reworkSuccessDesc',
          { version: reworkTargetRev.versionNumber, name: targetEntity.name },
          'Đã tạo nhận xét yêu cầu vẽ lại cho phiên bản v{version} của "{name}".',
        ),
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
      onShowToast(
        t('bible.view.reworkErrorTitle', 'Lỗi gửi yêu cầu vẽ lại'),
        err.message || t('bible.view.reworkErrorDesc', 'Không thể gửi yêu cầu vẽ lại.'),
      );
    } finally {
      setSubmittingRework(false);
    }
  };

  // Add Revision Modal State
  const [addRevModalOpen, setAddRevModalOpen] = useState(false);
  const [isNewVariantRequested, setIsNewVariantRequested] = useState(false);
  const [targetEntityVariants, setTargetEntityVariants] = useState<CharacterVariant[]>([]);
  const [isArtistConceptSubmit, setIsArtistConceptSubmit] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<BibleEntity | null>(null);
  const [supersedeTarget, setSupersedeTarget] = useState<BibleEntryRevisionDto | null>(null);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [revisionName, setRevisionName] = useState('');
  const [revisionSubtitle, setRevisionSubtitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionVariantLabel, setRevisionVariantLabel] = useState('');
  const [expectedVersionNumber, setExpectedVersionNumber] = useState<number | null>(null);
  const [fetchingBaseVersion, setFetchingBaseVersion] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const [revisionReferenceImageUrl, setRevisionReferenceImageUrl] = useState('');
  const [revisionReworkFeedback, setRevisionReworkFeedback] = useState<string | null>(null);
  const [isArtistResubmit, setIsArtistResubmit] = useState(false);
  const [uploadingRevImage, setUploadingRevImage] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [targetQueueRevisionId, setTargetQueueRevisionId] = useState<string | null>(null);

  const handleOpenAddRevision = async (
    entity: BibleEntity,
    supersede: BibleEntryRevisionDto | null = null,
    fromQueue: boolean = false,
    reworkFeedback?: string,
    isResubmit: boolean = false,
    isNewVariant: boolean = false,
    queueRevisionId?: string,
  ) => {
    setTargetQueueRevisionId(queueRevisionId || null);
    const snapshot = supersede ? readSnapshot(supersede.snapshotJson) : {};
    setRevisionTarget(entity);
    setSupersedeTarget(supersede);
    setRevisionReworkFeedback(reworkFeedback || null);
    setIsArtistResubmit(isResubmit);
    setIsNewVariantRequested(isNewVariant);
    setTargetEntityVariants([]);
    setRevisionSummary(
      isResubmit
        ? t(
            'bible.view.revisionSummaryResubmit',
            'Artist cập nhật lại Concept Art (nộp lại bản vẽ)',
          )
        : reworkFeedback
          ? t('bible.view.revisionSummaryRework', 'Artist nộp bản vẽ sửa đổi theo nhận xét')
          : fromQueue
            ? t('bible.view.revisionSummarySubmit', 'Nộp bản vẽ Concept Art')
            : isNewVariant
              ? t('bible.view.revisionSummaryVariant', 'Tạo biến thể thiết kế mới')
              : '',
    );
    setRevisionName(entity.name);
    setRevisionSubtitle(snapshot.Subtitle ?? entity.subtitle ?? '');
    setRevisionDescription(snapshot.Description ?? entity.description ?? '');
    setRevisionReferenceImageUrl(snapshot.ReferenceImageUrl ?? entity.imageUrl ?? '');
    setRevisionVariantLabel(
      isNewVariant
        ? ''
        : supersede?.variantLabel || rawEntries[entity.id]?.effectiveRevision?.variantLabel || '',
    );
    setExpectedVersionNumber(1);
    setIsArtistConceptSubmit(fromQueue);

    if (effectiveSeries?.id) {
      setFetchingBaseVersion(true);
      try {
        const history = await bibleService.getEntryHistory(effectiveSeries.id, entity.id);
        if (history && history.length > 0) {
          const variants = groupRevisionsIntoVariants(history);
          setTargetEntityVariants(variants);
          const maxVer = Math.max(...history.map((h) => h.versionNumber));
          setExpectedVersionNumber(maxVer);
          if (isNewVariant) {
            setRevisionVariantLabel('');
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
    variantLabel: string;
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
          name: revisionTarget.name,
          subtitle: revisionSubtitle.trim() || revisionTarget.subtitle,
          description: revisionDescription.trim() || revisionTarget.description,
          referenceImageUrl: revisionReferenceImageUrl || undefined,
          variantLabel: revisionVariantLabel.trim(),
          detailsJson: submittedContent?.detailsJson,
        };
        const summaryText = submittedContent ? submittedContent.summary : revisionSummary.trim();

        if (supersedeTarget) {
          await bibleService.supersedeRevision(
            effectiveSeries.id,
            revisionTarget.id,
            supersedeTarget.id,
            {
              expectedVersionNumber: content.expectedVersionNumber,
              name: content.name,
              subtitle: content.subtitle,
              description: content.description,
              referenceImageUrl: content.referenceImageUrl,
              detailsJson: submittedContent?.detailsJson,
              reason: summaryText,
            },
          );
        } else if (isArtistConceptSubmit && isArtist) {
          await bibleService.submitConceptArt(effectiveSeries.id, revisionTarget.id, {
            ...content,
            summary: summaryText,
            detailsJson: submittedContent?.detailsJson,
            revisionId: targetQueueRevisionId || undefined,
          });
        } else {
          await bibleService.addRevision(effectiveSeries.id, revisionTarget.id, {
            ...content,
            summary: summaryText,
            detailsJson: submittedContent?.detailsJson,
          });
        }
      }
      const displayName = revisionTarget.name;
      onShowToast(
        supersedeTarget
          ? t('bible.view.saveRevisionSuccessSupersede', 'Đã thay thế bản khoá')
          : isArtistConceptSubmit && isArtist
            ? isArtistResubmit
              ? t(
                  'bible.view.saveRevisionSuccessResubmit',
                  'Đã nộp lại bản vẽ Concept Art thành công',
                )
              : t('bible.view.saveRevisionSuccessConcept', 'Đã nộp bản vẽ Concept Art')
            : isProducer
              ? t('bible.view.saveRevisionSuccessProducer', 'Tạo phiên bản mới thành công')
              : t('bible.view.saveRevisionSuccessDraft', 'Đã tạo bản nháp mới'),
        supersedeTarget
          ? t(
              'bible.view.saveRevisionDescSupersede',
              { name: displayName },
              'Đã tạo biến thể thiết kế mới cho {name}.',
            )
          : isArtistConceptSubmit && isArtist
            ? t(
                'bible.view.saveRevisionDescConcept',
                { name: displayName },
                'Đã gửi bản vẽ Concept Art cho {name} – chờ Writer/Editor duyệt.',
              )
            : isProducer
              ? t(
                  'bible.view.saveRevisionDescProducer',
                  { name: displayName },
                  'Đã ghi nhận phiên bản mới cho {name}.',
                )
              : t(
                  'bible.view.saveRevisionDescDraft',
                  { name: displayName },
                  'Đã gửi bản nháp mới cho {name} – chờ Writer/Editor xác nhận.',
                ),
      );
      setRefreshTrigger((prev) => prev + 1);
      setAddRevModalOpen(false);
      // Giữ người dùng ở lại không gian làm việc (Workbench) của thực thể, cập nhật dữ liệu mới
      if (revisionTarget) {
        setSelectedEntity({
          ...revisionTarget,
          name: revisionTarget.name,
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
          isLockedConflict
            ? t('bible.view.conflictTitleLocked', 'Phiên bản đã khoá Canon (409)')
            : t('bible.view.conflictTitleGeneric', 'Xung đột phiên bản (409 CONFLICT)'),
          isLockedConflict
            ? err.message ||
                t(
                  'bible.view.conflictDescLocked',
                  'Phiên bản hiện tại đã khoá Canon. Cần sử dụng thao tác Thay thế bản khóa (Supersede) để kích hoạt phiên bản sửa đổi v(N+1).',
                )
            : err.message ||
                t(
                  'bible.view.conflictDescGeneric',
                  'Nhãn biến thể đã tồn tại hoặc mục này vừa được người khác cập nhật. Hãy chọn nhãn khác rồi thử lại.',
                ),
        );
        if (isLockedConflict) {
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
        }
      } else {
        onShowToast(t('bible.view.saveRevisionErrorTitle', 'Lỗi tạo phiên bản'), err.message);
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
      const bibleData = await bibleService.getSeriesBible(effectiveSeries.id);

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
      setLoadError(
        err.message ||
          t('bible.view.loadErrorDesc', 'Không thể tải dữ liệu Series Bible từ máy chủ.'),
      );
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
  }, [effectiveSeries?.id, refreshTrigger]);

  const handleCreateEntity = async (newEntity: any) => {
    if (!effectiveSeries?.id) {
      onShowToast(
        t('bible.view.selectSeriesFirstTitle', 'Chưa chọn Series'),
        t('bible.view.selectSeriesFirstDesc', 'Vui lòng chọn một Series trước khi thêm mục.'),
      );
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
        variantLabel: newEntity.variantLabel.trim(),
        isCrowd: newEntity.isCrowd,
      });

      setRefreshTrigger((prev) => prev + 1);
      const mapped = mapEntryToBibleEntity(created);
      if (onAddEntity) onAddEntity(mapped);
      // Mở ngay bàn làm việc (Character Workbench) cho mục vừa tạo, không đẩy người dùng ra màn ngoài
      setSelectedEntity(mapped);
      setAddEntityOpen(false);
      onShowToast(
        isProducer
          ? t('bible.view.createEntitySuccessProducer', 'Đã tạo mục Series Bible thành công')
          : t('bible.view.createEntitySuccessDraft', 'Đã tạo bản nháp thành công'),
        isProducer
          ? t(
              'bible.view.createEntityDescProducer',
              { name: created.name, code: created.code },
              'Đã lưu "{name}" ({code}) vào cơ sở tri thức của bộ truyện.',
            )
          : t(
              'bible.view.createEntityDescDraft',
              { name: created.name, code: created.code },
              'Đã gửi bản nháp "{name}" ({code}) – chờ Writer/Editor xác nhận.',
            ),
      );
    } catch (err: any) {
      onShowToast(
        t('bible.view.createEntityErrorTitle', 'Lỗi thêm mục Bible'),
        err.message || t('bible.view.createEntityErrorDesc', 'Không thể tạo bản ghi Series Bible.'),
      );
    }
  };

  const handleDeleteRevision = async (entity: BibleEntity, rev: BibleEntryRevisionDto) => {
    if (!effectiveSeries?.id) return;
    try {
      await bibleService.deleteRevision(effectiveSeries.id, entity.id, rev.id);
      onShowToast(
        t('common.success', 'Thành công'),
        t(
          'bible.view.deleteRevisionSuccess',
          { version: rev.versionNumber, name: entity.name },
          'Đã xóa phiên bản v{version} của {name}.',
        ),
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      onShowToast(
        t('bible.view.deleteRevisionError', 'Lỗi xóa phiên bản'),
        err.message || t('bible.view.deleteRevisionErrorDesc', 'Không thể xóa phiên bản này.'),
      );
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
    const statusOf = (id: string) => rawEntries[id]?.effectiveRevision?.reviewStatus;
    const pending = localEntities.filter((e) => statusOf(e.id) === 'ConceptSubmitted').length;
    const rework = localEntities.filter((e) => statusOf(e.id) === 'ReworkRequired').length;
    const locked = localEntities.filter((e) => statusOf(e.id) === 'CanonLocked').length;
    return [
      {
        key: 'pending',
        label: t('bible.view.kpiConceptSubmitted', 'Chờ duyệt'),
        value: pending,
        icon: Clock,
        tone: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
        iconTone: 'bg-amber-100/80 text-amber-800',
      },
      {
        key: 'rework',
        label: t('bible.view.kpiReworkRequired', 'Cần vẽ lại'),
        value: rework,
        icon: AlertTriangle,
        tone: 'bg-rose-50/70 border-rose-200/80 text-rose-900',
        iconTone: 'bg-rose-100/80 text-rose-800',
      },
      {
        key: 'locked',
        label: t('bible.view.kpiCanonLocked', 'Đã khoá Canon'),
        value: locked,
        icon: Lock,
        tone: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900',
        iconTone: 'bg-emerald-100/80 text-emerald-800',
      },
    ];
  }, [localEntities, rawEntries, t]);

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
        rawEntries[item.id]?.effectiveRevision?.reviewStatus === statusFilter;

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [localEntities, rawEntries, activeTab, searchQuery, statusFilter]);

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
        return t('bible.view.searchPlaceholderCharacters', 'Tìm tên, mã hoặc mô tả nhân vật...');
      case 'locations':
        return t('bible.view.searchPlaceholderLocations', 'Tìm tên, mã hoặc mô tả địa điểm...');
      case 'terminology':
        return t('bible.view.searchPlaceholderTerminology', 'Tìm thuật ngữ, đạo cụ, cốt truyện...');
      case 'style':
        return t('bible.view.searchPlaceholderStyle', 'Tìm quy tắc mỹ thuật, phong cách...');
      default:
        return t(
          'bible.view.searchPlaceholderDefault',
          'Tìm tên, mã hoặc mô tả trong Series Bible...',
        );
    }
  };

  return (
    <PageContainer className='space-y-4 pb-12 pt-1 font-sans'>
      {!effectiveSeries && (
        <div className='p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center gap-2.5 text-xs'>
          <AlertCircle className='w-4 h-4 text-amber-600 shrink-0' />
          <span>
            {t(
              'bible.view.selectSeriesPlaceholder',
              'Chưa chọn Series nào trong Workspace. Hãy chọn một Series để xem và quản lý Series Bible.',
            )}
          </span>
        </div>
      )}

      {/* Header: cùng mẫu hero card với Script Hub / Dashboard (breadcrumb đã có ở AppShell) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5'>
        <div className='min-w-0 space-y-1.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1'>
              <BookOpen className='w-3.5 h-3.5' />
              <span>{t('bible.view.canonHub', 'Canon Hub')}</span>
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
                aria-label={t('bible.view.selectSeriesAria', 'Chọn Series')}
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
              {t('bible.view.seriesBible', 'Series Bible')}
            </h1>
            <span className='px-2.5 py-0.5 rounded-full bg-[#F3F0E9] text-[#57534E] text-xs font-semibold font-mono border border-[#D8D2C5]'>
              {t(
                'bible.view.knowledgeEntries',
                { count: localEntities.length },
                `${localEntities.length} mục tri thức`,
              )}
            </span>
          </div>
          <p className='text-sm text-[#57534E] leading-relaxed max-w-2xl'>
            {t(
              'bible.view.heroDesc',
              'Kho tham chiếu chuẩn cho nhân vật, bối cảnh, đạo cụ, thuật ngữ và quy tắc mỹ thuật. Bản đã khoá Canon là chuẩn duy nhất cho họa sĩ và kiểm tra nhất quán.',
            )}
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
              <span>
                {isProducer
                  ? t('bible.view.addEntityBtn', 'Thêm mục mới')
                  : t('bible.view.createDraftBtn', 'Tạo mục nháp')}
              </span>
            </button>
          ) : (
            <span
              className='px-3 py-1.5 rounded-full bg-[#F3F0E9] border border-[#D8D2C5] text-[#57534E] text-xs font-medium flex items-center gap-1.5'
              title={t(
                'bible.view.readOnlyTitle',
                'Chỉ Biên kịch (Writer) hoặc Producer mới có quyền tạo mục trong Series Bible',
              )}
              data-testid='bible-readonly-badge'
            >
              <Lock className='w-3.5 h-3.5 text-[#78716C]' />
              <span>{t('bible.view.readOnlyBadge', 'Chế độ chỉ xem')}</span>
            </span>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-[248px_minmax(0,1fr)] items-start'>
        {/* Sidebar: danh mục + quy trình duyệt (DESIGN_RULES §3.4, cột trái) */}
        <CollapsibleSidebar
          collapsed={false}
          label={t('bible.view.sidebarCategoryTitle', 'Danh mục Series Bible')}
          className='lg:sticky lg:top-4 space-y-4'
          data-testid='bible-sidebar'
        >
          <nav className='bg-white border border-stone-200/80 rounded-xl shadow-xs p-2'>
            <p className='px-2.5 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500'>
              {t('bible.view.sidebarCategoryTitle', 'Danh mục')}
            </p>
            <SidebarSection className='flex lg:flex-col gap-1 overflow-x-auto'>
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
            </SidebarSection>
          </nav>

          {/* Spec V2.6 §5.2: vòng đời một phiên bản thiết kế */}
          <div className='hidden lg:block bg-white border border-stone-200/80 rounded-xl shadow-xs p-4 space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wider text-stone-500'>
              {t('bible.view.canonWorkflowTitle', 'Quy trình khoá Canon')}
            </p>
            <ol className='space-y-2.5'>
              {[
                {
                  label: t('bible.view.workflowDraft', 'Bản nháp'),
                  who: t('bible.view.workflowDraftWho', 'Writer tạo mục'),
                  dot: 'bg-stone-400',
                },
                {
                  label: t('bible.view.workflowSubmitted', 'Đã nộp Concept'),
                  who: t('bible.view.workflowSubmittedWho', 'Artist tải Model Sheet'),
                  dot: 'bg-amber-500',
                },
                {
                  label: t('bible.view.workflowLocked', 'Canon Locked'),
                  who: t('bible.view.workflowLockedWho', 'Editor xác nhận'),
                  dot: 'bg-emerald-600',
                },
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
              {t(
                'bible.view.workflowNotice',
                'Bản đã khoá không sửa được; thay đổi ở chương sau tạo phiên bản mới (BR-01, BR-15).',
              )}
            </p>
          </div>
        </CollapsibleSidebar>

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
                    {t(
                      'bible.view.queueHeading',
                      { count: designQueue.length },
                      `Hàng đợi vẽ thiết kế Concept Art (${designQueue.length} mục chờ xử lý)`,
                    )}
                  </h2>
                </div>
                <span className='text-xs text-amber-800 font-medium hidden sm:inline'>
                  {t(
                    'bible.view.queueSubheading',
                    'Artist & Writer phối hợp thiết kế trước khi đưa vào sản xuất chương',
                  )}
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5'>
                {designQueue.map((item) => {
                  const matchedEntity = localEntities.find((e) => e.id === item.entryId);
                  const queueKey = item.revisionId || item.entryId;
                  return (
                    <div
                      key={queueKey}
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
                        <div className='flex items-center gap-1 mt-1 flex-wrap'>
                          {item.reviewStatus === 'ReworkRequired' ? (
                            <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold whitespace-nowrap'>
                              {t('bible.view.queueStatusRework', 'Yêu cầu vẽ lại')}
                            </span>
                          ) : item.reviewStatus === 'ConceptSubmitted' ? (
                            <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold whitespace-nowrap'>
                              {t('bible.view.queueStatusPending', 'Đã nộp (Chờ duyệt)')}
                            </span>
                          ) : (
                            <span className='px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold whitespace-nowrap'>
                              {t('bible.view.queueStatusWaiting', 'Chờ nộp Concept Art')}
                            </span>
                          )}
                          {item.variantLabel ? (
                            <span className='text-xs text-stone-600 font-medium'>
                              · {item.variantLabel}
                            </span>
                          ) : null}
                        </div>
                        {item.waitingChapterNumbers && item.waitingChapterNumbers.length > 0 && (
                          <div
                            className='flex items-center gap-1 mt-1 text-xs'
                            data-testid={`waiting-chapters-${queueKey}`}
                          >
                            <span className='px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-semibold'>
                              {t(
                                'bible.view.queueWaitingChapters',
                                { chapters: item.waitingChapterNumbers.join(', ') },
                                'Chương đang chờ: Ch.{chapters}',
                              )}
                            </span>
                          </div>
                        )}
                        {item.reworkFeedback && (
                          <p className='text-xs text-rose-800 truncate mt-0.5 italic'>
                            &quot;{item.reworkFeedback}&quot;
                          </p>
                        )}
                      </div>

                      {isArtist ? (
                        item.reviewStatus === 'ConceptSubmitted' ? (
                          <button
                            type='button'
                            onClick={() => {
                              if (matchedEntity) {
                                void handleOpenAddRevision(
                                  matchedEntity,
                                  null,
                                  true,
                                  undefined,
                                  true,
                                  false,
                                  item.revisionId,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            title={t(
                              'bible.view.queueResubmitTitle',
                              'Nộp lại nếu bạn lỡ tải nhầm file ảnh trước khi duyệt',
                            )}
                            data-testid={`resubmit-concept-${item.entryId}`}
                          >
                            <RotateCcw className='w-3 h-3' />
                            <span>{t('bible.view.resubmitBtn', 'Nộp lại')}</span>
                          </button>
                        ) : item.reviewStatus === 'ReworkRequired' ? (
                          <button
                            type='button'
                            onClick={() => {
                              if (matchedEntity) {
                                void handleOpenAddRevision(
                                  matchedEntity,
                                  null,
                                  true,
                                  item.reworkFeedback || undefined,
                                  false,
                                  false,
                                  item.revisionId,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            title={t(
                              'bible.view.queueReworkTitle',
                              'Nộp lại bản vẽ sau khi đã sửa theo góp ý',
                            )}
                            data-testid={`rework-concept-${item.entryId}`}
                          >
                            <Palette className='w-3 h-3' />
                            <span>{t('bible.view.reworkBtn', 'Sửa lại')}</span>
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
                                  undefined,
                                  false,
                                  false,
                                  item.revisionId,
                                );
                              }
                            }}
                            className='px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1'
                            data-testid={`upload-concept-${item.entryId}`}
                          >
                            <Upload className='w-3 h-3' />
                            <span>{t('bible.view.uploadBtn', 'Tải ảnh')}</span>
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
                          title={t(
                            'bible.view.artistOnlyNotice',
                            'Chỉ Họa sĩ (Artist) mới có quyền tải ảnh Concept Art',
                          )}
                          data-testid={`view-concept-history-${item.entryId}`}
                        >
                          <Eye className='w-3 h-3' />
                          <span>{t('bible.view.cardViewDetail', 'Xem chi tiết')}</span>
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
            {/* Unified Search, Status Filter & View Mode */}
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
                    aria-label={t('bible.view.clearSearchAria', 'Xóa từ khóa tìm kiếm')}
                    className='w-5 h-5 rounded-full hover:bg-[#E7E2D6] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer'
                  >
                    <X className='w-3 h-3' />
                  </button>
                )}
              </div>

              {/* Controls: Trạng thái & Chế độ xem */}
              <div className='flex items-center gap-2 flex-wrap'>
                {/* Bộ lọc trạng thái khóa Canon */}
                <div className='flex items-center gap-1.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded-lg px-2.5 py-1 text-xs'>
                  <Lock className='w-3.5 h-3.5 text-[#78716C] shrink-0' />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | BibleReviewStatus)}
                    className='bg-transparent font-medium text-xs text-[#1C1917] focus:outline-none cursor-pointer pr-1'
                    data-testid='bible-status-filter'
                    aria-label={t('bible.view.statusFilterAria', 'Lọc trạng thái khóa Canon')}
                  >
                    <option value='ALL'>
                      {t('bible.view.statusFilterAll', 'Tất cả trạng thái')}
                    </option>
                    <option value='Draft'>{t('bible.view.statusFilterDraft', 'Bản thảo')}</option>
                    <option value='ConceptSubmitted'>
                      {t('bible.view.statusFilterConceptSubmitted', 'Concept đã nộp')}
                    </option>
                    <option value='ReworkRequired'>
                      {t('bible.view.statusFilterReworkRequired', 'Yêu cầu vẽ lại')}
                    </option>
                    <option value='CanonLocked'>
                      {t('bible.view.statusFilterCanonLocked', 'Đã khoá Canon')}
                    </option>
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
                    title={t('bible.view.gridViewTitle', 'Chế độ xem dạng lưới')}
                    aria-label={t('bible.view.gridViewAria', 'Xem dạng lưới')}
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
                    title={t('bible.view.listViewTitle', 'Chế độ xem danh sách')}
                    aria-label={t('bible.view.listViewAria', 'Xem dạng danh sách')}
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
                  {t(
                    'bible.view.resultsCount',
                    { count: filteredEntities.length, total: localEntities.length },
                    'Tìm thấy {count} / {total} mục phù hợp',
                  )}
                  {searchQuery && (
                    <>{` ${t('bible.view.resultsWithKeyword', { query: searchQuery }, 'với từ khóa "{query}"')}`}</>
                  )}
                </span>
                <button
                  type='button'
                  onClick={handleResetFilters}
                  className='text-[#C2410C] hover:underline font-semibold flex items-center gap-1 cursor-pointer'
                >
                  <RotateCcw className='w-3 h-3' />
                  <span>{t('bible.view.clearFilters', 'Xóa bộ lọc')}</span>
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
                  {t('bible.view.loadErrorTitle', 'Không thể tải dữ liệu Series Bible')}
                </h3>
                <p className='text-xs text-red-700 mt-0.5'>{loadError}</p>
              </div>
              <button
                type='button'
                onClick={() => void fetchBible()}
                className='px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer'
              >
                {t('bible.view.retryLoad', 'Thử tải lại')}
              </button>
            </div>
          ) : filteredEntities.length === 0 ? (
            localEntities.length === 0 ? (
              <EmptyFolderState
                title={t('bible.view.emptyFolderTitle', 'Series Bible chưa có mục nào')}
                subtitle={t(
                  'bible.view.emptyFolderSubtitle',
                  'Thêm các nhân vật, địa điểm, đạo cụ hoặc quy tắc mỹ thuật để hỗ trợ họa sĩ và hệ thống kiểm tra nhất quán.',
                )}
                actionText={
                  canCreateDraft
                    ? t('bible.view.emptyFolderCreateDraft', 'Tạo bản nháp đầu tiên')
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
                  {t('bible.view.emptyFilteredTitle', 'Không tìm thấy mục phù hợp')}
                </h3>
                <p className='text-xs text-[#57534E] max-w-md mx-auto'>
                  {t(
                    'bible.view.emptyFilteredSubtitle',
                    'Không có mục tri thức nào khớp với điều kiện lọc hiện tại. Thử đổi từ khóa hoặc xóa bộ lọc.',
                  )}
                </p>
                <button
                  type='button'
                  onClick={handleResetFilters}
                  className='px-3.5 py-1.5 bg-[#F3F0E9] hover:bg-[#E7E2D6] text-[#1C1917] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer'
                >
                  <RotateCcw className='w-3.5 h-3.5' />
                  <span>{t('bible.view.clearFilters', 'Xóa bộ lọc')}</span>
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
                            {effRev?.reviewStatus === 'CanonLocked' ? (
                              <span
                                className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1 shadow-2xs'
                                title={t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                              >
                                <Lock className='w-3.5 h-3.5 text-emerald-600' />
                                {t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                              </span>
                            ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                              <span
                                className='px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs'
                                title={t('bible.view.cardConceptSubmitted', 'Concept đã nộp')}
                              >
                                <Palette className='w-2.5 h-2.5' />
                                {t('bible.view.cardConceptSubmitted', 'Concept đã nộp')}
                              </span>
                            ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                              <span
                                className='px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs'
                                title={t('bible.view.cardReworkRequired', 'Cần vẽ lại')}
                              >
                                <AlertTriangle className='w-2.5 h-2.5' />
                                {t('bible.view.cardReworkRequired', 'Cần vẽ lại')}
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
                            {effRev?.reviewStatus === 'CanonLocked' ? (
                              <span
                                className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1'
                                title={t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                              >
                                <Lock className='w-3.5 h-3.5 text-emerald-600' />
                                {t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                              </span>
                            ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                              <span className='px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1'>
                                <Palette className='w-2.5 h-2.5' />
                                {t('bible.view.cardConceptSubmitted', 'Concept đã nộp')}
                              </span>
                            ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                              <span className='px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-medium flex items-center gap-1'>
                                <AlertTriangle className='w-2.5 h-2.5' />
                                {t('bible.view.cardReworkRequired', 'Cần vẽ lại')}
                              </span>
                            ) : (
                              <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-xs font-medium'>
                                {t('bible.view.cardDraft', 'Bản thảo')}
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
                            {effRev?.variantLabel ? (
                              <span className='font-sans font-medium text-[#57534E]'>
                                {' '}
                                · {effRev.variantLabel}
                              </span>
                            ) : null}
                          </h3>
                          {entity.latestDraftVersionNumber != null && (
                            <span
                              className='inline-flex mt-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium'
                              data-testid={`pending-draft-badge-${entity.id}`}
                            >
                              {t('bible.view.pendingDraftBadge', {
                                n: entity.latestDraftVersionNumber,
                              })}
                            </span>
                          )}
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
                              <strong>{t('bible.view.reworkPrefix', 'Cần sửa:')}</strong> &quot;
                              {effRev.reworkFeedback}&quot;
                            </span>
                          </div>
                        )}

                        <p
                          className='text-xs text-[#57534E] leading-relaxed line-clamp-2'
                          title={entity.description}
                        >
                          {entity.description ||
                            t('bible.view.noDescription', 'Chưa có mô tả chi tiết cho mục này.')}
                        </p>

                        <div className='pt-2 border-t border-[#D8D2C5]/60 text-xs text-[#57534E]'>
                          <span
                            className='font-medium text-[#1C1917] truncate max-w-[150px]'
                            title={
                              effRev?.variantLabel || t('bible.view.defaultVariant', 'Mặc định')
                            }
                          >
                            {effRev?.variantLabel || t('bible.view.defaultVariant', 'Mặc định')}
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
                          <span>{t('bible.view.cardViewDetail', 'Xem chi tiết')}</span>
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenHistory(entity);
                          }}
                          className='px-2 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-medium text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer'
                          title={t('bible.view.cardHistory', 'Xem lịch sử phiên bản')}
                        >
                          <History className='w-3 h-3 text-[#78716C]' />
                          <span>{t('bible.view.cardHistory', 'Lịch sử')}</span>
                        </button>

                        {/* Quick review actions for Writer/Editor when concept is submitted */}
                        {canRequestRework && effRev?.reviewStatus === 'ConceptSubmitted' && (
                          <div className='flex items-center gap-1'>
                            {canEndorse && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleConfirmCanon(effRev, entity);
                                }}
                                className='px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                title={t(
                                  'bible.view.approveBtnTitle',
                                  'Writer/Editor duyệt concept art này',
                                )}
                              >
                                <Check className='w-3 h-3' />
                                <span>{t('bible.view.approveBtn', 'Duyệt')}</span>
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReworkModal(effRev, entity);
                              }}
                              className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title={t(
                                'bible.view.reworkBtnTitle',
                                'Yêu cầu Artist vẽ lại concept',
                              )}
                            >
                              <MessageSquare className='w-3 h-3' />
                              <span>{t('bible.view.reworkBtn', 'Sửa lại')}</span>
                            </button>
                          </div>
                        )}

                        {/* Artist actions: Resubmit if mistakenly submitted, or rework */}
                        {isArtist && effRev?.reviewStatus === 'ConceptSubmitted' && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenAddRevision(entity, null, true, undefined, true);
                            }}
                            className='px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                            title={t(
                              'bible.view.resubmitBtnTitle',
                              'Nộp lại bản vẽ thay thế nếu nộp nhầm file',
                            )}
                            data-testid={`artist-resubmit-btn-${entity.id}`}
                          >
                            <RotateCcw className='w-3 h-3 text-amber-600' />
                            <span>{t('bible.view.resubmitBtn', 'Nộp lại')}</span>
                          </button>
                        )}
                        {isArtist && effRev?.reviewStatus === 'ReworkRequired' && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenAddRevision(
                                entity,
                                effRev,
                                true,
                                effRev.reworkFeedback || undefined,
                                false,
                              );
                            }}
                            className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                            title={t(
                              'bible.view.artistReworkBtnTitle',
                              'Nộp bản vẽ sửa đổi theo nhận xét của Writer/Editor',
                            )}
                            data-testid={`artist-rework-btn-${entity.id}`}
                          >
                            <Palette className='w-3 h-3 text-rose-600' />
                            <span>{t('bible.view.reworkBtn', 'Sửa lại')}</span>
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
                                ? t('bible.view.addRevisionBtnTitleProducer', 'Tạo phiên bản mới')
                                : t(
                                    'bible.view.addRevisionBtnTitleWriter',
                                    'Tạo bản nháp mới – chờ Writer/Editor xác nhận',
                                  )
                            }
                            data-testid={`add-revision-btn-${entity.id}`}
                          >
                            <GitCommit className='w-3 h-3' />
                            <span>
                              {isProducer
                                ? t('bible.view.addRevisionBtn', '+ Bản')
                                : t('bible.view.addDraftBtn', '+ Nháp')}
                            </span>
                          </button>
                          {isProducer && onEditEntity && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEntity(entity);
                              }}
                              className='p-1 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#FCFBF8] border border-transparent hover:border-[#D8D2C5] transition-colors cursor-pointer'
                              title={t('bible.view.quickEdit', 'Chỉnh sửa nhanh')}
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
                            {effRev?.variantLabel ? (
                              <span className='font-sans font-medium text-[#57534E]'>
                                {' '}
                                · {effRev.variantLabel}
                              </span>
                            ) : null}
                          </h3>
                          {entity.latestDraftVersionNumber != null && (
                            <span
                              className='px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium whitespace-nowrap'
                              data-testid={`pending-draft-badge-${entity.id}`}
                            >
                              {t('bible.view.pendingDraftBadge', {
                                n: entity.latestDraftVersionNumber,
                              })}
                            </span>
                          )}
                          <span className='px-1.5 py-0.5 rounded bg-[#F3F0E9] text-[#57534E] text-xs font-medium'>
                            {getCategoryLabel(entity.category)}
                          </span>
                          {effRev?.reviewStatus === 'CanonLocked' ? (
                            <span
                              className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap flex items-center gap-1'
                              title={t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                            >
                              <Lock className='w-3.5 h-3.5 text-emerald-600' />
                              {t('bible.view.cardCanonLocked', 'Đã khoá Canon')}
                            </span>
                          ) : effRev?.reviewStatus === 'ConceptSubmitted' ? (
                            <span className='px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1'>
                              <Palette className='w-2.5 h-2.5' />
                              {t('bible.view.cardConceptSubmitted', 'Concept đã nộp')}
                            </span>
                          ) : effRev?.reviewStatus === 'ReworkRequired' ? (
                            <span className='px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-medium flex items-center gap-1'>
                              <AlertTriangle className='w-2.5 h-2.5' />
                              {t('bible.view.cardReworkRequired', 'Cần vẽ lại')}
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
                            {t('bible.view.reworkPrefix', 'Cần sửa:')} &quot;{effRev.reworkFeedback}
                            &quot;
                          </p>
                        )}
                        <p className='text-xs text-[#57534E] line-clamp-1'>
                          {entity.description ||
                            t('bible.view.noDescriptionShort', 'Chưa có mô tả cho mục này.')}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8D2C5]/60'>
                      <div className='text-right text-xs text-[#57534E] hidden md:block'>
                        <div className='font-semibold text-[#1C1917] truncate max-w-[140px]'>
                          {effRev?.variantLabel || t('bible.view.defaultVariant', 'Mặc định')}
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
                          <span>{t('bible.view.viewShort', 'Xem')}</span>
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenHistory(entity);
                          }}
                          className='px-2 py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg text-xs font-medium text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 transition-colors cursor-pointer'
                          title={t('bible.view.cardHistory', 'Lịch sử')}
                        >
                          <History className='w-3 h-3 text-[#78716C]' />
                        </button>

                        {canRequestRework && effRev?.reviewStatus === 'ConceptSubmitted' && (
                          <>
                            {canEndorse && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleConfirmCanon(effRev, entity);
                                }}
                                className='px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                                title={t(
                                  'bible.view.approveBtnTitle',
                                  'Writer/Editor duyệt concept art này',
                                )}
                              >
                                <Check className='w-3 h-3' />
                                <span className='hidden sm:inline'>
                                  {t('bible.view.approveBtn', 'Duyệt')}
                                </span>
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReworkModal(effRev, entity);
                              }}
                              className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                              title={t(
                                'bible.view.reworkBtnTitle',
                                'Yêu cầu Artist vẽ lại concept',
                              )}
                            >
                              <MessageSquare className='w-3 h-3' />
                              <span className='hidden sm:inline'>
                                {t('bible.view.reworkBtn', 'Sửa lại')}
                              </span>
                            </button>
                          </>
                        )}
                        {isArtist && effRev?.reviewStatus === 'ConceptSubmitted' && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenAddRevision(entity, null, true, undefined, true);
                            }}
                            className='px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                            title={t(
                              'bible.view.resubmitBtnTitle',
                              'Nộp lại bản vẽ thay thế nếu nộp nhầm file',
                            )}
                            data-testid={`artist-resubmit-btn-${entity.id}`}
                          >
                            <RotateCcw className='w-3 h-3 text-amber-600' />
                            <span className='hidden sm:inline'>
                              {t('bible.view.resubmitBtn', 'Nộp lại')}
                            </span>
                          </button>
                        )}
                        {isArtist && effRev?.reviewStatus === 'ReworkRequired' && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenAddRevision(
                                entity,
                                effRev,
                                true,
                                effRev.reworkFeedback || undefined,
                                false,
                              );
                            }}
                            className='px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer'
                            title={t(
                              'bible.view.artistReworkBtnTitle',
                              'Nộp bản vẽ sửa đổi theo nhận xét của Writer/Editor',
                            )}
                            data-testid={`artist-rework-btn-${entity.id}`}
                          >
                            <Palette className='w-3 h-3 text-rose-600' />
                            <span className='hidden sm:inline'>
                              {t('bible.view.reworkBtn', 'Sửa lại')}
                            </span>
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
                                ? t('bible.view.addRevisionBtnTitleProducer', 'Tạo phiên bản mới')
                                : t(
                                    'bible.view.addRevisionBtnTitleWriter',
                                    'Tạo bản nháp mới – chờ Writer/Editor xác nhận',
                                  )
                            }
                            data-testid={`add-revision-btn-${entity.id}`}
                          >
                            <GitCommit className='w-3 h-3' />
                            <span className='hidden sm:inline'>
                              {isProducer
                                ? t('bible.view.addRevisionBtn', '+ Bản')
                                : t('bible.view.addDraftBtn', '+ Nháp')}
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
      {/* DETAIL WORKBENCH (toàn trang) */}
      {selectedEntity && (
        <BibleEntityDetailModal
          key={selectedEntity.id}
          entity={selectedEntity}
          entities={localEntities}
          onSelectEntity={setSelectedEntity}
          rawEntry={rawEntries[selectedEntity.id]}
          isProducer={isProducer}
          isArtist={isArtist}
          isWriter={isWriter}
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
            reworkFeedback,
            isResubmit,
            isNewVariant,
          ) => {
            void handleOpenAddRevision(
              e,
              supersede,
              fromQueue,
              reworkFeedback,
              isResubmit,
              isNewVariant,
            );
          }}
          onRequestRework={(ent, rev) => handleOpenReworkModal(rev, ent)}
          onConfirmCanon={(rev) => handleConfirmCanon(rev, selectedEntity)}
          onShowToast={onShowToast}
          onZoomImage={(img) => setSelectedImageZoom(img)}
          onDeleteRevision={(ent, rev) => handleDeleteRevision(ent, rev)}
        />
      )}

      {/* ZOOM IMAGE LIGHTBOX MODAL */}
      <Modal
        isOpen={!!selectedImageZoom}
        onClose={() => setSelectedImageZoom(null)}
        size='xl'
        closeLabel={t('bible.view.closeLightboxAria', 'Đóng xem ảnh')}
        title={t(
          'bible.view.referenceSheetTitle',
          { title: selectedImageZoom?.title ?? '' },
          '{title} — Reference Sheet',
        )}
      >
        {selectedImageZoom && (
          <div className='flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-stone-950'>
            <AuthenticatedImage
              src={selectedImageZoom.url}
              alt={selectedImageZoom.title}
              className='max-h-[75vh] w-auto object-contain'
            />
          </div>
        )}
      </Modal>

      {/* REVISION HISTORY MODAL */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        size='md'
        closeLabel={t('bible.view.closeHistoryAria', 'Đóng')}
        data-child-modal='true'
        title={
          <span className='flex items-center gap-2'>
            <History className='size-4 text-[#F97316]' aria-hidden='true' />
            {t(
              'bible.view.historyModalTitle',
              { name: historyEntityName },
              'Lịch sử phiên bản: {name}',
            )}
          </span>
        }
      >
        <div className='p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar'>
          <div className='text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed'>
            {t(
              'bible.view.historyNotice',
              'Toàn bộ lịch sử chỉnh sửa thiết kế được lưu giữ đầy đủ, đảm bảo tính nhất quán và bảo toàn tiến trình sáng tác.',
            )}
          </div>

          {loadingHistory ? (
            <div className='py-8 text-center text-xs text-stone-500 flex flex-col items-center gap-2'>
              <Loader2 className='w-5 h-5 animate-spin text-[#F97316]' />
              <span>{t('bible.view.loadingHistory', 'Đang tải lịch sử phiên bản...')}</span>
            </div>
          ) : historyRevisions.length === 0 ? (
            <div className='py-8 text-center text-xs text-stone-500'>
              {t('bible.view.noHistory', 'Chưa có phiên bản nào được ghi nhận.')}
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Visual variant progression timeline */}
              <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3 space-y-1.5'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-stone-700'>
                  <Layers className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>
                    {t(
                      'bible.view.variantProgressTitle',
                      { name: historyEntityName },
                      'Tiến trình các biến thể ({name}):',
                    )}
                  </span>
                </div>
                <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar flex-wrap'>
                  {(() => {
                    const variants = groupRevisionsIntoVariants(historyRevisions);
                    return variants.map((variant, idx) => (
                      <React.Fragment key={variant.variantKey}>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                            variant.isLocked
                              ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}
                        >
                          {variant.isLocked && <Lock className='w-2.5 h-2.5 text-amber-600' />}
                          <span>{variant.variantLabel}</span>
                        </span>
                        {idx < variants.length - 1 && (
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
                            {rev.variantLabel || `VERSION ${rev.versionNumber}`}
                            {rev.isInitialVersion
                              ? t('bible.view.versionInitial', ' (Khởi tạo)')
                              : ''}
                          </span>
                          {rev.reviewStatus === 'CanonLocked' ? (
                            <span className='px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-xs font-mono font-bold flex items-center gap-1 shadow-2xs'>
                              <Lock className='w-2.5 h-2.5 text-amber-600' />
                              {t('bible.view.canonLockedBadgeUpper', 'ĐÃ KHOÁ CANON')}
                            </span>
                          ) : rev.reviewStatus === 'ConceptSubmitted' ? (
                            <span className='px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold'>
                              Concept Submitted
                            </span>
                          ) : rev.reviewStatus === 'ReworkRequired' ? (
                            <span className='px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold'>
                              {t('bible.view.cardReworkRequired', 'Cần vẽ lại')}
                            </span>
                          ) : (
                            <span className='px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 text-xs font-medium'>
                              {t('bible.view.cardDraft', 'Bản nháp')}
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
                                title:
                                  rev.summary ||
                                  t(
                                    'bible.view.versionLabel',
                                    { version: rev.versionNumber },
                                    'Phiên bản v{version}',
                                  ),
                              })
                            }
                          />
                        )}
                        <div className='min-w-0 flex-1 space-y-1.5'>
                          <div className='text-xs font-semibold text-stone-900'>{rev.summary}</div>
                          {rev.reworkFeedback && (
                            <div className='p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs'>
                              <strong>
                                {t('bible.view.reworkFeedbackLabel', 'Nhận xét yêu cầu sửa:')}
                              </strong>{' '}
                              {rev.reworkFeedback}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chronological Event Timeline for Revision */}
                      {rev.events && rev.events.length > 0 && (
                        <div className='mt-2 pt-2 border-t border-stone-200/60 space-y-1.5'>
                          <div className='text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5'>
                            <Clock className='w-3 h-3 text-[#F97316]' />
                            <span>
                              {t(
                                'bible.view.eventTimelineTitle',
                                { count: rev.events.length },
                                `Dòng thời gian sự kiện duyệt (${rev.events.length})`,
                              )}
                            </span>
                          </div>
                          <div className='space-y-1.5 pl-2 border-l-2 border-orange-200'>
                            {rev.events.map((evt) => {
                              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
                              let label: string = evt.type;
                              if (evt.type === 'Created') {
                                badgeColor = 'bg-stone-100 text-stone-800 border-stone-200';
                                label = t('bible.view.eventCreated', 'Khởi tạo');
                              } else if (evt.type === 'ConceptSubmitted') {
                                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                                label = t('bible.view.eventConceptSubmitted', 'Nộp Concept');
                              } else if (evt.type === 'ReworkRequested') {
                                badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                                label = t('bible.view.eventReworkRequested', 'Yêu cầu sửa');
                              } else if (evt.type === 'Endorsed') {
                                badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                                label = t('bible.view.eventEndorsed', 'Đã xác nhận');
                              } else if (evt.type === 'Locked') {
                                badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                                label = t('bible.view.eventLocked', 'Khoá Canon');
                              } else if (evt.type === 'Superseded') {
                                badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
                                label = t('bible.view.eventSuperseded', 'Bị thay thế');
                              } else if (evt.type === 'DraftOverwritten') {
                                badgeColor = 'bg-stone-100 text-stone-800 border-stone-200';
                                label = t('bible.view.eventDraftOverwritten', 'Định nghĩa lại');
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
                                        title={t(
                                          'bible.view.verifiedTooltip',
                                          'Phiên bản đã được lưu vết an toàn',
                                        )}
                                      >
                                        <ShieldCheck className='w-3 h-3' />
                                        {t('bible.view.eventVerified', 'Đã chứng thực')}
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
                                        title={t(
                                          'bible.view.clickToEnlarge',
                                          'Nhấp để mở ảnh cỡ lớn',
                                        )}
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
                          <span
                            className='text-xs font-mono text-stone-400 truncate max-w-[120px]'
                            title={rev.contentHash}
                          >
                            Hash: {rev.contentHash.substring(0, 8)}...
                          </span>
                        </div>

                        <div className='flex items-center gap-1.5 flex-wrap'>
                          {canRequestRework && rev.reviewStatus === 'ConceptSubmitted' && (
                            <button
                              type='button'
                              onClick={() => handleOpenReworkModal(rev)}
                              className='px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                              title={t(
                                'bible.view.reworkBtnTitle',
                                'Yêu cầu Artist vẽ lại theo nhận xét',
                              )}
                            >
                              <MessageSquare className='w-3 h-3' />
                              <span>{t('bible.view.eventReworkRequested', 'Yêu cầu sửa')}</span>
                            </button>
                          )}

                          {rev.reviewStatus !== 'CanonLocked' &&
                            historyEntity?.isVisualDesign &&
                            isEditor && (
                              <button
                                type='button'
                                disabled={
                                  lockingRevisionId === rev.id ||
                                  rev.reviewStatus !== 'ConceptSubmitted'
                                }
                                onClick={() => void handleConfirmCanon(rev)}
                                className='px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer'
                                title={
                                  rev.reviewStatus !== 'ConceptSubmitted'
                                    ? t(
                                        'bible.view.lockCanonConceptSubmittedOnlyDesc',
                                        'Chỉ có thể xác nhận & khoá Canon phiên bản đang nộp concept (ConceptSubmitted)',
                                      )
                                    : t(
                                        'bible.view.confirmAndLockHistoryTitle',
                                        'Editor xác nhận và khoá phiên bản này làm tham chiếu chuẩn Canon',
                                      )
                                }
                                data-testid={`btn-lock-canon-${rev.id}`}
                              >
                                <Lock className='w-3 h-3' />
                                <span>
                                  {lockingRevisionId === rev.id
                                    ? t('bible.view.confirmingLock', 'Đang khoá...')
                                    : t(
                                        'bible.view.confirmLockCanonSubmit',
                                        'Xác nhận & Khoá Canon',
                                      )}
                                </span>
                              </button>
                            )}
                          {rev.reviewStatus === 'CanonLocked' &&
                            historyEntity?.isVisualDesign &&
                            (isWriter || isProducer) && (
                              <button
                                type='button'
                                onClick={() => {
                                  if (!historyEntity) return;
                                  setHistoryModalOpen(false);
                                  void handleOpenAddRevision(historyEntity, rev);
                                }}
                                className='px-2.5 py-1 rounded-lg bg-stone-600 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer'
                                title={t(
                                  'bible.view.supersedeLockedHistoryTitle',
                                  'Tạo bản mới thay cho bản khoá này',
                                )}
                              >
                                <Lock className='w-3 h-3' />
                                <span>
                                  {t('bible.view.supersedeLockedHistoryBtn', 'Thay thế bản khoá')}
                                </span>
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
              <span>
                {isProducer
                  ? t('bible.view.addNewRevisionBtn', '+ Tạo phiên bản mới')
                  : t('bible.view.addNewDraftBtn', '+ Tạo bản nháp mới')}
              </span>
            </button>
          )}
          <button
            type='button'
            onClick={() => setHistoryModalOpen(false)}
            className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg ml-auto'
          >
            {t('bible.view.closeBtn', 'Đóng')}
          </button>
        </div>
      </Modal>

      {/* ADD REVISION MODAL */}
      <AddRevisionModal
        isOpen={addRevModalOpen}
        revisionTarget={revisionTarget}
        supersedeTarget={supersedeTarget}
        isNewVariantInitial={isNewVariantRequested}
        existingVariants={targetEntityVariants}
        isArtistConceptSubmit={isArtistConceptSubmit}
        isArtistResubmit={isArtistResubmit}
        isArtist={isArtist}
        isProducer={isProducer}
        revisionReworkFeedback={revisionReworkFeedback}
        initialVariantLabel={revisionVariantLabel}
        initialName={revisionName}
        initialSubtitle={revisionSubtitle}
        initialSummary={revisionSummary}
        initialDescription={revisionDescription}
        initialReferenceImageUrl={revisionReferenceImageUrl}
        expectedVersionNumber={expectedVersionNumber}
        savingRevision={savingRevision}
        uploadingRevImage={uploadingRevImage}
        onUploadImage={async (file) => {
          if (!file || !effectiveSeries?.id) return;
          const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
          if (!validTypes.includes(file.type)) {
            onShowToast(
              t('bible.view.revisionImageInvalidTitle', 'Định dạng ảnh không hợp lệ'),
              t(
                'bible.view.revisionImageInvalidDesc',
                'Hệ thống chỉ nhận ảnh PNG, JPEG hoặc WebP.',
              ),
            );
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            onShowToast(
              t('bible.view.revisionImageSizeExceededTitle', 'Dung lượng ảnh vượt giới hạn'),
              t('bible.view.revisionImageSizeExceededDesc', 'Ảnh tối đa 10 MB.'),
            );
            return;
          }
          setUploadingRevImage(true);
          try {
            const res = await bibleService.uploadReferenceImage(effectiveSeries.id, file);
            setRevisionReferenceImageUrl(res.url);
            onShowToast(
              t('bible.view.revisionImageUploadedTitle', 'Đã tải ảnh reference sheet mới'),
              `${file.name} (${Math.round(res.sizeBytes / 1024)} KB)`,
            );
            return res.url;
          } catch (err: any) {
            onShowToast(
              t('bible.view.revisionImageUploadErrorTitle', 'Lỗi tải ảnh tham chiếu'),
              err.message ||
                t('bible.view.revisionImageUploadErrorDesc', 'Không thể tải ảnh reference sheet.'),
            );
          } finally {
            setUploadingRevImage(false);
          }
        }}
        onClose={() => setAddRevModalOpen(false)}
        onSubmit={executeSaveRevision}
        onConfirmArtistSubmit={async (content) => {
          const confirmed = await confirm({
            variant: 'default',
            title: isArtistResubmit
              ? t('bible.view.confirmResubmitConceptArtistTitle', 'Nộp lại Concept Art')
              : t('bible.view.confirmSubmitConceptArtistTitle', 'Nộp duyệt Concept Art'),
            description: isArtistResubmit
              ? t(
                  'bible.view.confirmResubmitConceptArtistDesc',
                  { name: revisionName || revisionTarget?.name || '' },
                  'Bạn có chắc chắn muốn nộp lại bản vẽ thay thế cho "{name}" không? Bản nộp mới này sẽ thay thế bản vẽ đang chờ duyệt.',
                )
              : t(
                  'bible.view.confirmSubmitConceptArtistDesc',
                  { name: revisionName || revisionTarget?.name || '' },
                  'Bạn có chắc chắn muốn nộp bản vẽ Concept Art cho "{name}" không? Writer hoặc Editor sẽ duyệt bản vẽ, sau đó Producer khoá canon.',
                ),
            confirmLabel: isArtistResubmit
              ? t('bible.view.confirmResubmitConceptArtistBtn', 'Nộp lại bản')
              : t('bible.view.confirmSubmitConceptArtistBtn', 'Nộp duyệt'),
            cancelLabel: t('bible.view.confirmSubmitConceptArtistCancel', 'Kiểm tra lại'),
          });
          if (confirmed) void executeSaveRevision(content);
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
