import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Users,
  User,
  MapPin,
  Wrench,
  ChevronRight,
  Download,
  ZoomIn,
  FileText,
  PenTool,
  Maximize2,
  Box,
  Lightbulb,
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
  DefineStubModal,
  getRevisionVariantLabel,
  groupRevisionsIntoVariants,
  type CharacterVariant,
} from './BibleEntityDetailModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { EmptyFolderState } from '@/shared/components/lucian';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useTranslation } from '@/lib/i18n';
import { CollapsibleSidebar, Modal, SidebarSection } from '@/shared/ui';
import {
  CATEGORIES,
  mapCategoryToTab,
  getCategoryLabel,
  getCategoryIcon,
  isVisualDesignCategory,
} from './bibleCategory';
import { AddRevisionModal } from './AddRevisionModal';
import { ReworkModal } from './ReworkModal';

interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  entities?: BibleEntity[];
  onAddEntity?: (entity: BibleEntity) => void;
  onEditEntity?: (entity: BibleEntity) => void;
  onSelectSeries?: (project: MangaProject) => void;
  onShowToast: (title: string, desc: string) => void;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [localEntities, setLocalEntities] = useState<BibleEntity[]>(entities);
  const [rawEntries, setRawEntries] = useState<Record<string, BibleEntryDto>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'review') return 'review';
    if (tabParam && ['characters', 'locations', 'terminology', 'style', 'all'].includes(tabParam)) {
      return tabParam;
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') ?? '');
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
  const [defineTarget, setDefineTarget] = useState<BibleEntity | null>(null);

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

  // Sync search query from URL parameter
  const urlSearchParam = searchParams.get('search');
  useEffect(() => {
    if (urlSearchParam !== null) {
      setSearchQuery(urlSearchParam);
    }
  }, [urlSearchParam]);

  const clearUrlSearchParam = () => {
    if (searchParams.has('search')) {
      const next = new URLSearchParams(searchParams);
      next.delete('search');
      setSearchParams(next, { replace: true });
    }
  };

  // Sync tab & entityId from query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'review') {
      setActiveTab('review');
    } else if (
      tabParam &&
      ['all', 'characters', 'locations', 'terminology', 'style'].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
    const entityId = searchParams.get('entityId');
    if (entityId && localEntities.length > 0) {
      const found = localEntities.find((e) => e.id === entityId);
      if (found) setSelectedEntity(found);
    }
  }, [searchParams, localEntities]);

  const effectiveSeries = useMemo(() => {
    if (activeProject && (!selectedSeriesId || activeProject.id === selectedSeriesId)) {
      return activeProject;
    }
    return availableSeries.find((s) => s.id === selectedSeriesId) || activeProject;
  }, [activeProject, selectedSeriesId, availableSeries]);

  // Revision History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRevisions, setHistoryRevisions] = useState<BibleEntryRevisionDto[]>([]);
  const [historyEntity, setHistoryEntity] = useState<BibleEntity | null>(null);
  const [historyEntityName, setHistoryEntityName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lockingRevisionId, setLockingRevisionId] = useState<string | null>(null);

  // User & Role checks
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

  // Crowd toggle
  const [togglingCrowdId, setTogglingCrowdId] = useState<string | null>(null);
  const handleToggleCrowd = async (entity: BibleEntity) => {
    const seriesId = selectedSeriesId || activeProject?.id;
    if (!seriesId) return;
    setTogglingCrowdId(entity.id);
    const nextCrowd = !entity.isCrowd;
    try {
      await bibleService.setBibleEntryCrowd(seriesId, entity.id, nextCrowd);
      setLocalEntities((prev) =>
        prev.map((e) => (e.id === entity.id ? { ...e, isCrowd: nextCrowd } : e)),
      );
      if (selectedEntity?.id === entity.id) {
        setSelectedEntity((prev) => (prev ? { ...prev, isCrowd: nextCrowd } : null));
      }
      onShowToast(
        nextCrowd
          ? t('production.cast.crowdSetSuccess', 'Đã gắn cờ Quần chúng')
          : t('production.cast.crowdRemovedSuccess', 'Đã bỏ cờ Quần chúng'),
        nextCrowd
          ? t(
              'production.cast.crowdUnblockNotice',
              'Thực thể này không còn chặn Gửi duyệt hay Bắt đầu sản xuất.',
            )
          : `${entity.name} đã được chuyển về thực thể tiêu chuẩn.`,
      );
    } catch (err: any) {
      onShowToast(
        t('production.cast.crowdUpdateFailed', 'Cập nhật cờ Quần chúng thất bại'),
        err?.message || 'Không thể cập nhật cờ Quần chúng.',
      );
    } finally {
      setTogglingCrowdId(null);
    }
  };

  // Bible Design Queue
  const [designQueue, setDesignQueue] = useState<BibleDesignQueueItemDto[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Rework Modal State
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
    if (entity.isStub) {
      if (canCreateDraft) {
        setDefineTarget(entity);
      }
      return;
    }
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
        : supersede
          ? getRevisionVariantLabel(supersede)
          : rawEntries[entity.id]?.effectiveRevision
            ? getRevisionVariantLabel(rawEntries[entity.id]?.effectiveRevision)
            : '',
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
        t('bible.view.selectSeriesFirstDesc', 'Chọn Series trước khi thêm mục.'),
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
      review: 0,
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
      const st = rawEntries[item.id]?.effectiveRevision?.reviewStatus;
      if (st === 'ConceptSubmitted' || st === 'ReworkRequired') {
        counts.review++;
      }
    });
    return counts;
  }, [localEntities, rawEntries]);

  // KPI calculations
  const bibleStats = useMemo(() => {
    const statusOf = (id: string) => rawEntries[id]?.effectiveRevision?.reviewStatus;
    const pending = localEntities.filter((e) => statusOf(e.id) === 'ConceptSubmitted').length;
    const rework = localEntities.filter((e) => statusOf(e.id) === 'ReworkRequired').length;
    const locked = localEntities.filter((e) => statusOf(e.id) === 'CanonLocked').length;
    const drafts = localEntities.filter((e) => {
      const st = statusOf(e.id);
      return !st || st === 'Draft';
    }).length;

    return { pending, rework, locked, drafts, total: localEntities.length };
  }, [localEntities, rawEntries]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    return localEntities.filter((item) => {
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'review'
            ? rawEntries[item.id]?.effectiveRevision?.reviewStatus === 'ConceptSubmitted' ||
              rawEntries[item.id]?.effectiveRevision?.reviewStatus === 'ReworkRequired'
            : item.category === activeTab;
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

  // Automatically select first entity if none selected
  useEffect(() => {
    if (!selectedEntity || !filteredEntities.some((e) => e.id === selectedEntity.id)) {
      if (filteredEntities.length > 0) {
        setSelectedEntity(filteredEntities[0]);
      }
    }
  }, [filteredEntities, selectedEntity]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== 'ALL' || activeTab !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    clearUrlSearchParam();
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

  // Helper for status pill presentation
  const renderStatusPill = (status?: string | null) => {
    switch (status) {
      case 'CanonLocked':
        return (
          <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold whitespace-nowrap flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
            {t('bible.view.cardCanonLocked', 'Đã khóa')}
          </span>
        );
      case 'ConceptSubmitted':
        return (
          <span className='px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold whitespace-nowrap flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-blue-500'></span>
            {t('bible.view.cardConceptSubmitted', 'Chờ nét in')}
          </span>
        );
      case 'WriterEndorsed':
        return (
          <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold whitespace-nowrap flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500'></span>
            {t('bible.detailModal.stepWriterEndorse', 'Chờ khóa')}
          </span>
        );
      case 'ReworkRequired':
        return (
          <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold whitespace-nowrap flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-rose-500'></span>
            {t('bible.view.cardReworkRequired', 'Cần sửa')}
          </span>
        );
      default:
        return (
          <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold whitespace-nowrap flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-rose-500'></span>
            {t('bible.view.cardDraft', 'Draft')}
          </span>
        );
    }
  };

  const activeEntityRaw = selectedEntity ? rawEntries[selectedEntity.id] : null;
  const activeEffRev = activeEntityRaw?.effectiveRevision;

  return (
    <PageContainer className='space-y-6 pb-12 pt-2 font-sans'>
      {/* Series selection hint if not configured */}
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

      {/* TOP FILTER & CATEGORY BAR (Stitch view-bible Card Header) */}
      <div className='p-4 rounded-xl bg-white border border-stone-200/80 shadow-xs space-y-3 select-none'>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/80'>
              <BookOpen className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='sr-only'>{t('bible.view.canonHub', 'Canon Hub')}</span>
                <h1
                  className='text-base font-bold text-stone-900 leading-tight'
                  aria-label={t('bible.view.seriesBible', 'Series Bible')}
                >
                  {t('bible.view.pageTitle', 'Hồ sơ thiết kế & Model Sheets')}
                </h1>
                <span className='text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600'>
                  {t(
                    'bible.view.knowledgeEntries',
                    { count: localEntities.length },
                    `${localEntities.length} mục tri thức`,
                  )}
                </span>
              </div>
              <p className='text-xs text-stone-500 mt-0.5'>
                {t(
                  'bible.view.pageSubtitle',
                  'Kho quy chuẩn tạo hình, tính cách và bối cảnh chuẩn cho toàn bộ họa sĩ xưởng.',
                )}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            {availableSeries.length > 1 && (
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
                className='px-2.5 py-1.5 bg-stone-50 border border-stone-200/80 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none focus:border-orange-500 cursor-pointer'
              >
                {availableSeries.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
            )}

            {canCreateDraft ? (
              <button
                type='button'
                onClick={() => setAddEntityOpen(true)}
                className='px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer'
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
                className='px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-600 text-xs font-medium flex items-center gap-1.5'
                data-testid='bible-readonly-badge'
              >
                <Lock className='w-3.5 h-3.5 text-stone-500' />
                <span>{t('bible.view.readOnlyBadge', 'Chế độ chỉ xem')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Category segmented tabs, search and status filter */}
        <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-stone-100'>
          {/* Segmented Tabs (acts as sidebar for test assertions) */}
          <div
            className='inline-flex p-1 rounded-lg bg-stone-100 border border-stone-200/80 text-xs flex-wrap gap-0.5'
            data-testid='bible-sidebar'
          >
            <button
              type='button'
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white font-semibold text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              data-testid='tab-category-all'
            >
              <LayoutGrid
                className={`w-3.5 h-3.5 ${activeTab === 'all' ? 'text-orange-600' : 'text-stone-500'}`}
              />
              <span>
                {t('bible.view.tabAll', 'Tất cả')} ({categoryCounts.all})
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('characters')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-white font-semibold text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              data-testid='tab-category-characters'
            >
              <User
                className={`w-3.5 h-3.5 ${activeTab === 'characters' ? 'text-orange-600' : 'text-stone-500'}`}
              />
              <span>
                {t('bible.view.tabCharacters', 'Nhân vật')} ({categoryCounts.characters})
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'locations'
                  ? 'bg-white font-semibold text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              data-testid='tab-category-locations'
            >
              <MapPin
                className={`w-3.5 h-3.5 ${activeTab === 'locations' ? 'text-orange-600' : 'text-stone-500'}`}
              />
              <span>
                {t('bible.view.tabLocations', 'Địa điểm')} ({categoryCounts.locations})
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('terminology')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'terminology'
                  ? 'bg-white font-semibold text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              data-testid='tab-category-terminology'
            >
              <Wrench
                className={`w-3.5 h-3.5 ${activeTab === 'terminology' ? 'text-orange-600' : 'text-stone-500'}`}
              />
              <span>
                {t('bible.view.tabProps', 'Đạo cụ')} ({categoryCounts.terminology})
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('style')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'style'
                  ? 'bg-white font-semibold text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              data-testid='tab-category-style'
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${activeTab === 'style' ? 'text-orange-600' : 'text-stone-500'}`}
              />
              <span>
                {t('bible.view.tabRules', 'Quy tắc')} ({categoryCounts.style})
              </span>
            </button>
          </div>

          {/* Search, Filter & View Controls */}
          <div className='flex items-center gap-2.5 flex-1 md:max-w-md'>
            <div className='relative flex-1'>
              <Search className='w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className='w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-orange-500'
              />
            </div>

            <select
              data-testid='bible-status-filter'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className='px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-xs text-stone-700 font-medium focus:outline-none focus:border-orange-500 cursor-pointer'
            >
              <option value='ALL'>{t('bible.view.statusAll', 'Tất cả trạng thái')}</option>
              <option value='ConceptSubmitted'>
                {t('bible.view.statusPending', 'Chờ khóa chuẩn')}
              </option>
              <option value='CanonLocked'>{t('bible.view.statusLocked', 'Đã khóa chuẩn')}</option>
              <option value='ReworkRequired'>
                {t('bible.view.statusFilterRework', 'Cần vẽ lại')}
              </option>
              <option value='Draft'>{t('bible.view.statusFilterDraft', 'Bản thảo')}</option>
            </select>

            {hasActiveFilters && (
              <button
                type='button'
                onClick={handleResetFilters}
                className='px-2 py-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer'
              >
                {t('bible.view.resetFilters', 'Xóa bộ lọc')}
              </button>
            )}

            <div className='hidden sm:inline-flex p-0.5 rounded-lg bg-stone-100 border border-stone-200/80 text-xs'>
              <button
                type='button'
                onClick={() => handleToggleViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
                aria-label={t('bible.view.gridViewAria', 'Xem dạng lưới')}
              >
                <LayoutGrid className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={() => handleToggleViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
                aria-label={t('bible.view.listViewAria', 'Xem dạng danh sách')}
              >
                <List className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWING QUEUE BANNER IF ACTIVE */}
      {designQueue.length > 0 && (
        <div className='rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <PenTool className='w-4 h-4 text-amber-700' />
              <h3 className='text-xs font-bold uppercase tracking-wider text-amber-900'>
                {t(
                  'bible.view.queueHeading',
                  { count: designQueue.length },
                  `Hàng đợi vẽ thiết kế Concept Art (${designQueue.length} mục chờ xử lý)`,
                )}
              </h3>
            </div>
            <span className='text-xs text-amber-700 font-medium'>
              {t(
                'bible.view.queueSubheading',
                'Artist & Writer phối hợp thiết kế trước khi đưa vào sản xuất chương',
              )}
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {designQueue.map((item) => {
              const matchedEntity = localEntities.find((e) => e.id === item.entryId);
              const queueKey = item.revisionId || item.entryId;
              return (
                <div
                  key={queueKey}
                  className='bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between gap-2 shadow-xs'
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
                      {item.waitingChapterNumbers && item.waitingChapterNumbers.length > 0 && (
                        <span
                          className='px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-semibold'
                          data-testid={`waiting-chapters-${queueKey}`}
                        >
                          {t(
                            'bible.view.queueWaitingChapters',
                            { chapters: item.waitingChapterNumbers.join(', ') },
                            'Chương đang chờ: Ch.{chapters}',
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {isArtist && (
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
                      className='px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs flex items-center gap-1'
                      data-testid={`resubmit-concept-${item.entryId}`}
                    >
                      <RotateCcw className='w-3 h-3' />
                      <span>{t('bible.view.resubmitBtn', 'Nộp lại')}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW PANEL: TWO-COLUMN MANGA PAPER & INK WORKSPACE */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-start font-sans'>
        {/* CỘT TRÁI (35% - lg:col-span-4): Danh sách thực thể */}
        <div className='lg:col-span-4 space-y-2.5'>
          <div className='flex items-center justify-between text-xs px-1'>
            <span className='font-bold uppercase tracking-wider text-stone-500'>
              {activeTab === 'characters'
                ? t('bible.view.listLabelCharacters', 'DANH SÁCH THỰC THỂ')
                : activeTab === 'locations'
                  ? t('bible.view.listLabelLocations', 'DANH SÁCH ĐỊA ĐIỂM')
                  : activeTab === 'terminology'
                    ? t('bible.view.listLabelProps', 'DANH SÁCH ĐẠO CỤ & VŨ KHÍ')
                    : activeTab === 'style'
                      ? t('bible.view.listLabelRules', 'DANH SÁCH QUY TẮC')
                      : t('bible.view.listLabelAll', 'TẤT CẢ THỰC THỂ')}
            </span>
            <span className='text-stone-400 font-mono'>
              {t(
                'bible.view.itemsShown',
                { count: filteredEntities.length },
                `${filteredEntities.length} mục hiển thị`,
              )}
            </span>
          </div>

          <div className='space-y-2.5' id='master-entities-list'>
            {filteredEntities.length === 0 ? (
              <div className='bg-white border border-stone-200/80 rounded-xl p-6 text-center text-xs text-stone-500'>
                {t('bible.view.emptyTitle', 'Không tìm thấy mục tri thức nào')}
              </div>
            ) : (
              filteredEntities.map((entity) => {
                const raw = rawEntries[entity.id];
                const effRev = raw?.effectiveRevision;
                const isSelected = selectedEntity?.id === entity.id;

                // Initials or icon
                const initials = entity.name
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={entity.id}
                    onClick={() => setSelectedEntity(entity)}
                    className={`rounded-xl p-3 shadow-xs cursor-pointer space-y-2 transition-all ${
                      isSelected
                        ? 'bg-white border-2 border-orange-500'
                        : 'bg-white border border-stone-200/80 hover:border-orange-300'
                    }`}
                    data-testid={`bible-card-${entity.id}`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <div className='w-10 h-10 rounded-lg bg-stone-900 text-orange-500 font-bold flex items-center justify-center text-xs shrink-0 border border-stone-800'>
                          {activeTab === 'characters' ? (
                            <span>{initials}</span>
                          ) : activeTab === 'locations' ? (
                            <MapPin className='w-5 h-5' />
                          ) : activeTab === 'terminology' ? (
                            <Wrench className='w-5 h-5' />
                          ) : (
                            <ShieldCheck className='w-5 h-5' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <h3 className='font-bold text-stone-900 text-sm truncate flex items-center gap-1.5'>
                            <span>{entity.name}</span>
                            {effRev?.variantLabel && (
                              <span className='text-xs font-normal text-stone-500'>
                                · {effRev.variantLabel}
                              </span>
                            )}
                          </h3>
                          <p className='text-xs text-stone-500 font-mono truncate'>
                            {entity.code} {entity.subtitle ? `• ${entity.subtitle}` : ''}
                          </p>
                        </div>
                      </div>

                      {renderStatusPill(effRev?.reviewStatus)}
                    </div>

                    {/* Pending Draft badge */}
                    {entity.latestDraftVersionNumber && (
                      <div className='pt-1'>
                        <span
                          className='px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-mono font-semibold'
                          data-testid={`pending-draft-badge-${entity.id}`}
                        >
                          Có bản nháp v{entity.latestDraftVersionNumber}
                        </span>
                      </div>
                    )}

                    {/* Timeline Variants if Character */}
                    {activeTab === 'characters' && isSelected && (
                      <div className='pt-2 border-t border-stone-100 space-y-1.5'>
                        <div className='flex items-center justify-between text-xs font-semibold text-stone-600 px-0.5'>
                          <div className='flex items-center gap-1 text-orange-700'>
                            <GitCommit className='w-3.5 h-3.5' />
                            <span className='uppercase tracking-wider font-bold'>
                              {t('bible.view.timelineTitle', 'THỜI KỲ')}
                            </span>
                          </div>
                        </div>
                        <div className='space-y-1 pt-0.5'>
                          <div className='p-1.5 rounded-lg bg-orange-50/70 border border-orange-200/60 flex items-center justify-between text-xs'>
                            <div className='flex items-center gap-1.5 min-w-0'>
                              <span className='w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0'></span>
                              <span className='truncate font-semibold text-stone-900 text-xs'>
                                {effRev?.variantLabel || 'Mặc định'}
                              </span>
                            </div>
                            <span className='text-xs font-mono px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold shrink-0'>
                              v{effRev?.versionNumber || 1}{' '}
                              {effRev?.reviewStatus === 'CanonLocked' ? 'Canon' : 'Đang áp dụng'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Info & Selection Indicator */}
                    <div className='flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500'>
                      <span className='truncate'>
                        {entity.imageUrl ? (
                          <span className='inline-flex items-center gap-1 text-emerald-700 font-medium'>
                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
                            {t('bible.view.artworkUploaded')}
                          </span>
                        ) : (
                          <span>{entity.subtitle || 'Tiêu chuẩn'}</span>
                        )}
                      </span>
                      {isSelected ? (
                        <span className='font-medium text-orange-600 flex items-center gap-0.5'>
                          {t('bible.view.selectedBadge', 'Đang chọn')}
                          <ChevronRight className='w-3.5 h-3.5' />
                        </span>
                      ) : (
                        <ChevronRight className='w-3.5 h-3.5 text-stone-400' />
                      )}
                    </div>

                    {/* Action buttons on card for test compatibility */}
                    <div className='flex items-center gap-1.5 pt-1.5 border-t border-stone-100 flex-wrap'>
                      {isArtist && effRev?.reviewStatus === 'ConceptSubmitted' && (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenAddRevision(entity, null, true, undefined, true);
                          }}
                          className='px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold'
                          data-testid={`artist-resubmit-btn-${entity.id}`}
                        >
                          {t('bible.view.resubmitBtn', 'Nộp lại')}
                        </button>
                      )}

                      {canCreateDraft && (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenAddRevision(entity);
                          }}
                          className='px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium'
                          data-testid={`add-revision-btn-${entity.id}`}
                        >
                          + Bản
                        </button>
                      )}

                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleCrowd(entity);
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                          entity.isCrowd
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                        data-testid={`crowd-badge-${entity.id}`}
                      >
                        {entity.isCrowd ? 'Quần chúng' : 'Đặt Quần chúng'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI (65% - lg:col-span-8): Chi tiết Inspector Pane */}
        <div className='lg:col-span-8'>
          {!selectedEntity ? (
            <div className='bg-white border border-stone-200/80 rounded-xl p-12 text-center text-stone-500 shadow-xs'>
              <p className='text-sm'>
                {t('bible.drawer.selectToView', 'Chọn một mục để xem chi tiết.')}
              </p>
            </div>
          ) : (
            <div className='bg-white border border-stone-200/80 rounded-xl p-6 shadow-xs space-y-6'>
              {/* Header Chi tiết */}
              <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-200/80'>
                <div className='flex items-start gap-4'>
                  <div className='w-14 h-14 rounded-xl bg-stone-900 text-orange-500 font-bold text-lg flex items-center justify-center shrink-0 border border-stone-800 shadow-xs'>
                    {activeTab === 'characters' ? (
                      <span>
                        {selectedEntity.name
                          .split(' ')
                          .map((s) => s[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </span>
                    ) : activeTab === 'locations' ? (
                      <MapPin className='w-6 h-6' />
                    ) : activeTab === 'terminology' ? (
                      <Wrench className='w-6 h-6' />
                    ) : (
                      <ShieldCheck className='w-6 h-6' />
                    )}
                  </div>

                  <div>
                    <div className='flex items-center gap-2.5 flex-wrap'>
                      <h2 className='text-xl font-bold text-stone-900 leading-tight'>
                        {selectedEntity.name}{' '}
                        {selectedEntity.subtitle && (
                          <span className='text-sm font-semibold text-stone-500 font-mono'>
                            ({selectedEntity.subtitle})
                          </span>
                        )}
                      </h2>

                      {renderStatusPill(activeEffRev?.reviewStatus)}

                      <span className='text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700'>
                        v{activeEffRev?.versionNumber || 1}{' '}
                        {activeEffRev?.reviewStatus === 'CanonLocked' ? 'Canon' : 'Revision'}
                      </span>

                      {selectedEntity.latestDraftVersionNumber && (
                        <span
                          className='px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-semibold'
                          data-testid='pending-draft-badge-detail'
                        >
                          Có bản nháp v{selectedEntity.latestDraftVersionNumber}
                        </span>
                      )}
                    </div>

                    <div className='flex items-center gap-3 text-xs text-stone-500 mt-1.5 flex-wrap'>
                      <span className='font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200'>
                        {activeTab === 'characters'
                          ? t('bible.view.protagonist', 'Nhân vật chính (Protagonist)')
                          : activeTab === 'locations'
                            ? t('bible.view.primarySet', 'Bối cảnh chính (Primary Set)')
                            : t('bible.view.signatureWeapon', 'Vũ khí chính (Signature Weapon)')}
                      </span>
                      <span>•</span>
                      <span className='font-mono'>
                        Mã: <strong className='text-stone-800'>{selectedEntity.code}</strong>
                      </span>
                      <span>•</span>
                      <span className='text-emerald-700 font-medium flex items-center gap-1'>
                        <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                        <span>
                          {activeEffRev?.reviewStatus === 'CanonLocked'
                            ? t('bible.view.verifiedByEditor', 'Editor đã duyệt bản vẽ')
                            : t('bible.view.writerApprovedMechanism', 'Writer chuẩn thuận cơ chế')}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top-Right Action Buttons */}
                <div className='flex flex-wrap items-center gap-2 shrink-0'>
                  <button
                    type='button'
                    onClick={() => {
                      if (selectedEntity.imageUrl) {
                        setSelectedImageZoom({
                          url: selectedEntity.imageUrl,
                          title: selectedEntity.name,
                        });
                      } else {
                        onShowToast(
                          t('bible.view.downloadConcept', 'Tải Concept Art'),
                          'Chưa có tệp tải về',
                        );
                      }
                    }}
                    className='px-3 py-1.5 rounded-lg bg-white border border-stone-200/80 hover:bg-stone-50 text-stone-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer'
                  >
                    <Download className='w-3.5 h-3.5' />
                    <span>
                      {activeTab === 'characters'
                        ? t('bible.view.exportModelSheet', 'Xuất Model Sheet (PDF/ZIP)')
                        : t('bible.view.downloadConcept', 'Tải Concept Art')}
                    </span>
                  </button>

                  <button
                    type='button'
                    onClick={() => void handleOpenHistory(selectedEntity)}
                    className='px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer'
                    data-testid='history-modal-btn'
                  >
                    <History className='w-3.5 h-3.5' />
                    <span>{t('bible.view.actionFeedback', 'Góp ý')}</span>
                  </button>

                  {canCreateDraft && (
                    <button
                      type='button'
                      onClick={() =>
                        void handleOpenAddRevision(
                          selectedEntity,
                          null,
                          false,
                          undefined,
                          false,
                          true,
                        )
                      }
                      className='px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer'
                      data-testid='add-new-variant-btn'
                    >
                      <Plus className='w-3.5 h-3.5' />
                      <span>+ Biến thể</span>
                    </button>
                  )}

                  {canEndorse && activeEffRev?.reviewStatus === 'ConceptSubmitted' && (
                    <button
                      type='button'
                      onClick={() => void handleConfirmCanon(activeEffRev, selectedEntity)}
                      className='px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer'
                      data-testid={`btn-lock-canon-${activeEffRev.id}`}
                    >
                      <Lock className='w-3.5 h-3.5' />
                      <span>
                        {activeTab === 'locations'
                          ? t('bible.view.actionLockLocation', 'Khóa bối cảnh')
                          : t('bible.view.actionLockCanon', 'Khóa chuẩn (Lock Canon)')}
                      </span>
                    </button>
                  )}

                  {activeEffRev?.reviewStatus === 'CanonLocked' && (isWriter || isProducer) && (
                    <button
                      type='button'
                      onClick={() => void handleOpenAddRevision(selectedEntity, activeEffRev)}
                      className='px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer'
                    >
                      <Lock className='w-3.5 h-3.5' />
                      <span>{t('bible.canonLock.supersedeAction', 'Thay thế bản khoá')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2-Column Detail Layout: Artwork Frame Left (xl:col-span-7) & Specs/Guidance Right (xl:col-span-5) */}
              <div className='grid grid-cols-1 xl:grid-cols-12 gap-5 items-start'>
                {/* Cột trái (7 cols): Artwork Frame */}
                <div className='xl:col-span-7 space-y-3'>
                  {/* Artwork Container */}
                  <div className='rounded-xl border border-stone-200/80 bg-stone-50 overflow-hidden shadow-xs'>
                    {/* Main Image Frame */}
                    <div className='relative w-full bg-stone-900/5 p-2 overflow-hidden flex items-center justify-center min-h-[300px]'>
                      {selectedEntity.imageUrl ? (
                        <div className='relative w-full rounded-lg overflow-hidden border border-stone-200/80 bg-white shadow-xs group'>
                          <AuthenticatedImage
                            src={selectedEntity.imageUrl}
                            alt={selectedEntity.name}
                            className='w-full h-80 object-cover object-center cursor-pointer group-hover:scale-102 transition-transform'
                            onClick={() =>
                              setSelectedImageZoom({
                                url: selectedEntity.imageUrl,
                                title: selectedEntity.name,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div className='text-center p-8 text-stone-400 space-y-2'>
                          <Box className='w-12 h-12 mx-auto text-stone-300' />
                          <p className='text-xs'>
                            {t(
                              'bible.detailModal.noReferenceImage',
                              'Chưa có ảnh Reference Sheet cho mục này',
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notes line bottom */}
                    <div className='px-3.5 py-2 bg-white border-t border-stone-200/80 text-xs text-stone-600 flex items-center justify-between'>
                      <div>
                        <span className='font-semibold text-stone-800'>
                          {t('bible.view.notesLabel', 'Ghi chú:')}{' '}
                        </span>
                        <span>{selectedEntity.description || '—'}</span>
                      </div>
                      <div className='text-stone-500 font-mono'>
                        {selectedEntity.lockedAt
                          ? `Duyệt: ${new Date(selectedEntity.lockedAt).toLocaleDateString()}`
                          : 'Chưa duyệt'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột phải (5 cols): Specs & Guidance Cards */}
                <div className='xl:col-span-5 space-y-4 text-xs'>
                  {/* Character Specs */}
                  {activeTab === 'characters' && (
                    <div className='p-5 rounded-xl bg-white border border-stone-200/80 shadow-xs space-y-4 text-xs'>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                          <div className='flex items-center gap-2'>
                            <User className='w-4 h-4 text-orange-600' />
                            <h3 className='text-xs font-bold text-stone-900 uppercase tracking-wider'>
                              {t('bible.view.generalInfoTitle', 'THÔNG TIN CHUNG')}
                            </h3>
                          </div>
                          {canCreateDraft && (
                            <button
                              type='button'
                              onClick={() => void handleOpenAddRevision(selectedEntity)}
                              className='text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer'
                            >
                              {t('bible.view.editSpecsAction', 'Chỉnh sửa')}
                            </button>
                          )}
                        </div>

                        <div className='space-y-2.5 pt-1'>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-stone-600 font-normal'>
                              Độ tuổi &amp; Ngày sinh:
                            </span>
                            <span className='font-bold text-stone-900 text-right'>
                              {selectedEntity.attributes?.age
                                ? `${selectedEntity.attributes.age}${selectedEntity.attributes.birthDate ? ` (${selectedEntity.attributes.birthDate})` : ''}`
                                : '—'}
                            </span>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-stone-600 font-normal'>
                              Chiều cao &amp; Cân nặng:
                            </span>
                            <span className='font-bold text-stone-900 text-right'>
                              {selectedEntity.attributes?.height
                                ? `${selectedEntity.attributes.height}${selectedEntity.attributes.weight ? ` / ${selectedEntity.attributes.weight}` : ''}`
                                : '—'}
                            </span>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-stone-600 font-normal'>
                              Thể trạng &amp; Tỷ lệ:
                            </span>
                            <span className='font-bold text-stone-900 text-right'>
                              {selectedEntity.attributes?.build || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-3 pt-2 border-t border-stone-200/80'>
                        <div className='flex items-center gap-2'>
                          <Edit3 className='w-4 h-4 text-orange-600' />
                          <h3 className='text-xs font-bold text-stone-700 uppercase tracking-wider'>
                            {t('bible.view.traitsTitle', 'ĐẶC ĐIỂM')}
                          </h3>
                        </div>
                        <div className='p-3.5 rounded-lg bg-orange-50/40 border border-orange-200/60 text-xs leading-relaxed space-y-2.5 text-stone-700'>
                          <p>
                            Màu tóc: {selectedEntity.attributes?.hair || '—'}. Mắt:{' '}
                            {selectedEntity.attributes?.eyes || '—'}.
                          </p>
                          <p>
                            <span className='font-bold text-orange-600'>Vết sẹo nhận diện: </span>
                            {selectedEntity.attributes?.marks || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Specs */}
                  {activeTab === 'locations' && (
                    <div className='p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-3'>
                      <div className='flex items-center gap-2 text-stone-900 font-bold uppercase tracking-wider text-xs pb-2 border-b border-stone-200/80'>
                        <FileText className='w-4 h-4 text-blue-600' />
                        <span>{t('bible.view.guidanceTitle', 'QUY CHUẨN & CHỈ DẪN HỌA SĨ')}</span>
                      </div>
                      <div className='space-y-2 text-xs'>
                        <p className='text-stone-700 leading-relaxed'>
                          {selectedEntity.description ||
                            'Ngã tư Shibuya trung tâm bị phá hủy sau thảm họa lò phản ứng. Toàn bộ cao ốc đổ nghiêng theo phối cảnh 3 điểm tụ, dây cáp viễn thông chằng chịt và mặt đường nứt toác để lộ hệ thống năng lượng ngầm.'}
                        </p>
                        <div className='p-2.5 rounded-lg bg-orange-50/80 border border-orange-200 text-stone-700 space-y-1'>
                          <div className='font-semibold text-orange-800 flex items-center gap-1'>
                            <Lightbulb className='w-3.5 h-3.5 text-orange-700' />
                            <span>
                              {t('bible.view.artistTipLocation', 'Lưu ý cho Trame Artist:')}
                            </span>
                          </div>
                          <div className='text-xs leading-relaxed'>
                            Khi dán trame mưa đêm, sử dụng nét gạch xiên song song 65 độ, không để
                            mảng đen che lấp vết nứt lò phản ứng dưới lòng đường.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prop / Weapon Specs */}
                  {activeTab === 'terminology' && (
                    <div className='space-y-4'>
                      <div className='p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-3'>
                        <div className='flex items-center gap-2 text-stone-900 font-bold uppercase tracking-wider text-xs pb-2 border-b border-stone-200/80'>
                          <Wrench className='w-4 h-4 text-orange-600' />
                          <span>
                            {t('bible.view.propSpecsTitle', 'Thông số cơ khí & Vũ trang')}
                          </span>
                        </div>
                        <div className='divide-y divide-stone-200/80 text-xs'>
                          <div className='py-2 flex items-center justify-between gap-4'>
                            <span className='text-stone-500 font-medium shrink-0'>
                              Kích thước tổng thể
                            </span>
                            <span className='font-semibold text-stone-800 text-right'>
                              Tổng dài 140 cm (Chuôi 28 cm, Lưỡi 112 cm)
                            </span>
                          </div>
                          <div className='py-2 flex items-center justify-between gap-4'>
                            <span className='text-stone-500 font-medium shrink-0'>
                              Trọng lượng khi rút kiếm
                            </span>
                            <span className='font-semibold text-stone-800 text-right'>
                              1.85 kg (Vỏ hợp kim siêu nhẹ)
                            </span>
                          </div>
                          <div className='py-2 flex items-center justify-between gap-4'>
                            <span className='text-stone-500 font-medium shrink-0'>
                              Hiệu ứng tia sáng trame
                            </span>
                            <span className='font-semibold text-stone-800 text-right'>
                              Radial Gradient 85L / 15% tia sét
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className='p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-3'>
                        <div className='flex items-center gap-2 text-stone-900 font-bold uppercase tracking-wider text-xs pb-2 border-b border-stone-200/80'>
                          <FileText className='w-4 h-4 text-blue-600' />
                          <span>
                            {t('bible.view.propPrincipleTitle', 'Nguyên lý hoạt động & Lưu ý vẽ')}
                          </span>
                        </div>
                        <div className='space-y-2 text-xs'>
                          <p className='text-stone-700 leading-relaxed'>
                            {selectedEntity.description ||
                              'Lưỡi kiếm plasma dạng năng lượng nén, chuôi kiếm bọc hợp kim siêu dẫn. Cơ chế kích hoạt luồng điện quang cực đại khi Akira phóng thích toàn bộ ấn lôi quang.'}
                          </p>
                          <div className='p-2.5 rounded-lg bg-orange-50/80 border border-orange-200 text-stone-700 space-y-1'>
                            <div className='font-semibold text-orange-800 flex items-center gap-1'>
                              <PenTool className='w-3.5 h-3.5 text-orange-700' />
                              <span>
                                {t('bible.view.artistTipProp', 'Lưu ý cho Inker & Colorist:')}
                              </span>
                            </div>
                            <div className='text-xs leading-relaxed'>
                              Khi chém vào vật thể kim loại, viền nét kiếm không để đứt đoạn mà dùng
                              nét brush xòe kết hợp tia lửa điện văng 4 góc.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Style / Rules Specs */}
                  {activeTab === 'style' && (
                    <div className='p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-3'>
                      <div className='flex items-center gap-2 text-stone-900 font-bold uppercase tracking-wider text-xs pb-2 border-b border-stone-200/80'>
                        <ShieldCheck className='w-4 h-4 text-stone-700' />
                        <span>Quy chuẩn mỹ thuật &amp; Thiết lập thế giới</span>
                      </div>
                      <div className='space-y-2 text-xs text-stone-700 leading-relaxed'>
                        <p>
                          {selectedEntity.description ||
                            'Quy chuẩn cố định cho toàn bộ họa sĩ sản xuất.'}
                        </p>
                        <div className='p-2.5 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700'>
                          <span className='font-semibold'>Ràng buộc bất biến: </span>
                          {selectedEntity.attributes?.forbidden ||
                            'Bản đã khoá Canon không sửa trực tiếp. Muốn thay đổi cần tạo bản sửa đổi mới qua thao tác Thay thế (Supersede).'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL CHO PHÓNG TO ẢNH */}
      {selectedImageZoom && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label={t('bible.view.closeLightboxAria', 'Đóng xem ảnh')}
          className='fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4'
          onClick={() => setSelectedImageZoom(null)}
        >
          <div
            className='relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between p-3 border-b border-stone-200/80'>
              <h3 className='font-bold text-stone-900 text-sm'>{selectedImageZoom.title}</h3>
              <button
                type='button'
                onClick={() => setSelectedImageZoom(null)}
                className='p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='p-2 max-h-[75vh] overflow-auto flex items-center justify-center'>
              <AuthenticatedImage
                src={selectedImageZoom.url}
                alt={selectedImageZoom.title}
                className='max-w-full max-h-[70vh] object-contain rounded-lg'
              />
            </div>
          </div>
        </div>
      )}

      {/* DEFINE STUB MODAL */}
      {defineTarget && (
        <DefineStubModal
          isOpen={Boolean(defineTarget)}
          entity={defineTarget}
          seriesId={effectiveSeries?.id || ''}
          isWriter={isWriter}
          onClose={() => setDefineTarget(null)}
          onDefined={() => {
            setDefineTarget(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
          onShowToast={onShowToast}
        />
      )}

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
        onUploadImage={async (file: File) => {
          if (!effectiveSeries?.id || !revisionTarget) return;
          setUploadingRevImage(true);
          try {
            const uploaded = await bibleService.uploadReferenceImage(effectiveSeries.id, file);
            setRevisionReferenceImageUrl(uploaded.url);
            onShowToast(
              t('bible.view.revisionImageUploadedTitle', 'Đã tải ảnh reference sheet mới'),
              file.name,
            );
            return uploaded.url;
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
          const isResubmit = isArtistResubmit;
          const confirmed = await confirm({
            title: isResubmit
              ? t('bible.view.confirmResubmitConceptArtistTitle', 'Nộp lại Concept Art')
              : t('bible.view.confirmSubmitConceptArtistTitle', 'Nộp duyệt Concept Art'),
            description: isResubmit
              ? t(
                  'bible.view.confirmResubmitConceptArtistDesc',
                  { name: revisionTarget?.name || '' },
                  'Bạn có chắc chắn muốn nộp lại bản vẽ thay thế cho "{name}" không? Bản nộp mới này sẽ thay thế bản vẽ đang chờ duyệt.',
                )
              : t(
                  'bible.view.confirmSubmitConceptArtistDesc',
                  { name: revisionTarget?.name || '' },
                  'Bạn có chắc chắn muốn nộp bản vẽ Concept Art cho "{name}" không? Editor sẽ duyệt và khoá Canon.',
                ),
            confirmText: isResubmit
              ? t('bible.view.confirmResubmitConceptArtistBtn', 'Nộp lại bản')
              : t('bible.view.confirmSubmitConceptArtistBtn', 'Nộp duyệt'),
            cancelText: t('bible.view.confirmSubmitConceptArtistCancel', 'Kiểm tra lại'),
            variant: 'info',
          });
          if (confirmed) {
            await executeSaveRevision(content);
          }
        }}
      />

      {/* REWORK MODAL */}
      <ReworkModal
        isOpen={reworkModalOpen}
        targetRev={reworkTargetRev}
        entityName={historyEntityName}
        isSubmitting={submittingRework}
        onClose={() => setReworkModalOpen(false)}
        onSubmit={handleSubmitRework}
      />

      {/* ADD ENTITY MODAL */}
      <AddEntityModal
        isOpen={addEntityOpen}
        onClose={() => setAddEntityOpen(false)}
        onAdd={handleCreateEntity}
        onShowToast={onShowToast}
        seriesId={effectiveSeries?.id}
        isProducer={isProducer}
        isArtist={isArtist}
      />

      {/* HISTORY MODAL */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        size='lg'
        closeLabel={t('bible.view.closeHistoryAria', 'Đóng')}
        title={t(
          'bible.view.historyModalTitle',
          { name: historyEntityName },
          `Lịch sử phiên bản: ${historyEntityName}`,
        )}
        description={t(
          'bible.view.historyNotice',
          'Toàn bộ lịch sử chỉnh sửa thiết kế được lưu giữ đầy đủ, đảm bảo tính nhất quán và bảo toàn tiến trình sáng tác.',
        )}
      >
        <div className='p-4 space-y-4 max-h-[70vh] overflow-y-auto text-xs'>
          {loadingHistory ? (
            <div className='py-8 text-center text-stone-500 flex items-center justify-center gap-2'>
              <Loader2 className='w-4 h-4 animate-spin' />
              <span>{t('bible.view.loadingHistory', 'Đang tải lịch sử phiên bản...')}</span>
            </div>
          ) : historyRevisions.length === 0 ? (
            <p className='py-6 text-center text-stone-500'>
              {t('bible.view.noHistory', 'Chưa có phiên bản nào được ghi nhận.')}
            </p>
          ) : (
            <div className='space-y-3'>
              {historyRevisions.map((rev) => (
                <div
                  key={rev.id}
                  className='p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-2'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-stone-200/80'>
                        v{rev.versionNumber}
                      </span>
                      <span className='font-semibold text-stone-900'>
                        {rev.variantLabel || 'Mặc định'}
                      </span>
                      {rev.reviewStatus === 'CanonLocked' ? (
                        <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                          Đã khóa Canon
                        </span>
                      ) : rev.reviewStatus === 'ConceptSubmitted' ? (
                        <span className='px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold'>
                          Chờ nét in
                        </span>
                      ) : rev.reviewStatus === 'ReworkRequired' ? (
                        <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold'>
                          Cần sửa
                        </span>
                      ) : null}
                    </div>
                    <span className='text-xs text-stone-400 font-mono'>
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {rev.summary && <p className='text-xs text-stone-700'>{rev.summary}</p>}

                  {rev.reworkFeedback && (
                    <div className='p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800'>
                      <span className='font-semibold'>Nhận xét sửa: </span>
                      {rev.reworkFeedback}
                    </div>
                  )}

                  <div className='flex items-center justify-between pt-2 border-t border-stone-200/60'>
                    <span className='text-xs font-mono text-stone-400'>
                      Hash: {rev.contentHash ? rev.contentHash.substring(0, 8) : '—'}
                    </span>
                    <div className='flex items-center gap-1.5'>
                      {canEndorse && rev.reviewStatus === 'ConceptSubmitted' && (
                        <button
                          type='button'
                          onClick={() => void handleConfirmCanon(rev)}
                          className='px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold'
                          data-testid={`btn-lock-canon-${rev.id}`}
                        >
                          Khóa chuẩn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};
