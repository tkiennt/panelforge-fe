import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit2,
  FileText,
  Globe,
  History,
  Layers,
  LayoutGrid,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Share2,
  ShieldAlert,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ChapterDto,
  type ChapterLockGateDto,
  type ChapterReadinessDto,
  type ChapterReviewDto,
  type CreateChapterRequest,
  type UpdateChapterRequest,
} from '@/services/chapter.service';
import { chapterCastService, type ChapterCastDto } from '@/services/chapterCast.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { pageService, type PageDto } from '@/services/page.service';
import { StartProductionModal } from '@/shared/modals/StartProductionModal';
import { RefreezeScriptModal } from '@/shared/modals/RefreezeScriptModal';
import { ChapterAssignmentsModal } from '../modals/ChapterAssignmentsModal';
import { ChapterEditionsModal } from '../modals/ChapterEditionsModal';
import { PreviewLinksModal } from '../modals/PreviewLinksModal';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { ReasonForm } from '@/shared/components/ReasonForm';
import { TypeToConfirmModal } from '@/shared/components/lucian';
import { Modal } from '@/shared/ui';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import {
  buildReadinessResolutionUrl,
  computeChapterLifecycleSteps,
  notifyChapterHubChanged,
  useChapterReadiness,
} from '@/shared/features/production-workspace/useChapterProductionHub';
import {
  buildBibleUrl,
  buildChapterReaderUrl,
  buildEditorDeskUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
} from '@/app/routePaths';

export interface ProducerChapterManagementViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  Character: 'Nhân vật',
  Location: 'Bối cảnh',
  Prop: 'Đạo cụ',
  Costume: 'Trang phục',
  Term: 'Thuật ngữ',
  Rule: 'Quy tắc',
  Event: 'Sự kiện',
};

export const ProducerChapterManagementView: React.FC<ProducerChapterManagementViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { t } = useTranslation('production');
  const navigate = useNavigate();
  const { workspaceId = '', seriesId = '' } = useParams<{
    workspaceId: string;
    seriesId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChapterId = searchParams.get('chapterId') || '';

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(urlChapterId);

  // Selected Chapter Supporting Data
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [cast, setCast] = useState<ChapterCastDto | null>(null);
  const [lockGate, setLockGate] = useState<ChapterLockGateDto | null>(null);
  const [reviews, setReviews] = useState<ChapterReviewDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);

  // Authoritative Readiness Hook (GET /api/chapters/{chapterId}/readiness)
  const {
    readiness: serverReadiness,
    loading: loadingReadiness,
    refetch: refetchReadiness,
  } = useChapterReadiness(selectedChapterId || null);

  // UI & Modal States
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [startProductionOpen, setStartProductionOpen] = useState(false);
  const [showUnfreezeDialog, setShowUnfreezeDialog] = useState(false);
  const [unfreezeBusy, setUnfreezeBusy] = useState(false);
  const [createChapterOpen, setCreateChapterOpen] = useState(false);
  const [editChapterOpen, setEditChapterOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [editionsOpen, setEditionsOpen] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [previewLinksOpen, setPreviewLinksOpen] = useState(false);
  const [deleteTargetChapter, setDeleteTargetChapter] = useState<ChapterDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit Chapter Form
  const [formChapterNumber, setFormChapterNumber] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formTargetReleaseDate, setFormTargetReleaseDate] = useState('');
  const [formOutline, setFormOutline] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const isProducer = !workspaceRole || workspaceRole.toUpperCase() === 'PRODUCER' || workspaceRole.toUpperCase() === 'OWNER';

  // ── Load Series & Chapters List ──
  const loadSeriesAndChapters = useCallback(async () => {
    if (!seriesId) return;
    try {
      setLoading(true);
      setError(null);
      const [seriesRes, chaptersRes, stagesRes] = await Promise.all([
        seriesService.getSeriesById(seriesId).catch(() => null),
        chapterService
          .getChaptersBySeries(seriesId, 1, 100)
          .catch(() => ({ items: [], totalCount: 0 })),
        pipelineService.getPipelineStages(seriesId).catch(() => []),
      ]);

      if (seriesRes) setSeries(seriesRes);
      if (stagesRes) setStages(stagesRes);

      const items = Array.isArray(chaptersRes) ? chaptersRes : chaptersRes?.items || [];
      const sorted = [...items].sort((a, b) => a.chapterNumber - b.chapterNumber);
      setChapters(sorted);

      if (sorted.length > 0) {
        const matching = sorted.find((c) => c.id === urlChapterId);
        const targetId = matching ? matching.id : sorted[0].id;
        setSelectedChapterId(targetId);
        if (targetId !== urlChapterId) {
          setSearchParams({ chapterId: targetId }, { replace: true });
        }
      } else {
        setSelectedChapterId('');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách chương.');
    } finally {
      setLoading(false);
    }
  }, [seriesId, urlChapterId, setSearchParams]);

  useEffect(() => {
    void loadSeriesAndChapters();
  }, [loadSeriesAndChapters]);

  // ── Load Supporting Chapter Detail Data ──
  const loadChapterDetails = useCallback(
    async (cId: string) => {
      if (!cId) return;
      const listMatch = chapters.find((c) => c.id === cId) || null;
      if (listMatch) setChapter(listMatch);

      const [detailRes, castRes, gateRes, pagesRes, reviewsRes] = await Promise.all([
        typeof chapterService.getChapterById === 'function'
          ? chapterService.getChapterById(cId).catch(() => null)
          : Promise.resolve(null),
        typeof chapterCastService.getChapterCast === 'function'
          ? chapterCastService.getChapterCast(cId).catch(() => null)
          : Promise.resolve(null),
        typeof chapterService.getChapterLockGate === 'function'
          ? chapterService.getChapterLockGate(cId).catch(() => null)
          : Promise.resolve(null),
        typeof pageService.getPagesByChapter === 'function'
          ? pageService.getPagesByChapter(cId).catch(() => [])
          : Promise.resolve([]),
        typeof chapterService.getChapterReviews === 'function'
          ? chapterService.getChapterReviews(cId).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (detailRes) setChapter(detailRes as ChapterDto);
      if (castRes) setCast(castRes);
      if (gateRes) setLockGate(gateRes);
      if (Array.isArray(pagesRes)) setPages(pagesRes);
      if (Array.isArray(reviewsRes)) setReviews(reviewsRes);
    },
    [chapters],
  );

  useEffect(() => {
    if (selectedChapterId) {
      void loadChapterDetails(selectedChapterId);
    }
  }, [selectedChapterId, loadChapterDetails]);

  const refreshAll = useCallback(async () => {
    await loadSeriesAndChapters();
    if (selectedChapterId) {
      await loadChapterDetails(selectedChapterId);
      refetchReadiness();
      notifyChapterHubChanged({ seriesId, chapterId: selectedChapterId });
    }
  }, [loadSeriesAndChapters, loadChapterDetails, selectedChapterId, refetchReadiness, seriesId]);

  const handleSelectChapter = (nextId: string) => {
    setSelectedChapterId(nextId);
    setSearchParams({ chapterId: nextId }, { replace: true });
  };

  // Fallback readiness synthesizer (only used when server /readiness hasn't loaded or in legacy mocked unit tests)
  const readiness: ChapterReadinessDto | null = useMemo(() => {
    if (serverReadiness) return serverReadiness;
    if (!chapter) return null;

    const entities = cast?.entities ?? [];
    const required = entities.filter((e) => !e.isCrowd);
    const ready = required.filter(
      (e) => e.isCanonLocked || e.boundRevision?.isCanonLocked || e.bibleStatus === 'CanonLocked',
    );
    const isStarted = chapter.status && chapter.status !== 'PreProduction';
    const scriptSubmitted = Boolean(
      isStarted || chapter.scriptStatus === 'InReview' || chapter.scriptStatus === 'Frozen',
    );
    const bibleReady = cast?.gate?.canStart ?? true;
    const hasPages = (pages.length || chapter.pagesCount || 0) > 0;

    const blockers: ChapterReadinessDto['blockers'] = [];
    if (!isStarted && !scriptSubmitted) {
      blockers.push({
        code: 'SCRIPT_NOT_SUBMITTED',
        severity: 'BLOCKING',
        message: 'Kịch bản đang ở trạng thái Draft, chưa được Writer gửi duyệt.',
        resourceType: 'script',
        resourceId: chapter.id,
        resolutionTarget: { workspace: 'pre-production', section: 'script', resourceId: chapter.id },
      });
    }
    if (!isStarted && !bibleReady) {
      (cast?.gate?.blockers ?? []).forEach((b) =>
        blockers.push({
          code: 'BIBLE_REFERENCE_BLOCKED',
          severity: 'BLOCKING',
          message: `${b.entryName}: ${b.reason}`,
          resourceType: 'bible_entry',
          resourceId: b.bibleEntryId,
          versionId: b.revisionId ?? undefined,
          resolutionTarget: {
            workspace: 'pre-production',
            section: 'entities',
            resourceId: b.bibleEntryId,
          },
        }),
      );
    }

    const checks: ChapterReadinessDto['checks'] = [
      {
        code: 'SCRIPT_SUBMITTED',
        group: 'SCRIPT',
        label: 'Kịch bản đã gửi duyệt',
        passed: scriptSubmitted,
        mandatory: true,
        statusText: scriptSubmitted ? 'Đã gửi duyệt' : 'Đang soạn (Draft)',
        resolutionTarget: { workspace: 'pre-production', section: 'script', resourceId: chapter.id },
      },
      {
        code: 'BIBLE_CANON_LOCKED',
        group: 'BIBLE',
        label: 'Tài liệu tham khảo bắt buộc đã khóa chuẩn',
        passed: bibleReady,
        mandatory: true,
        statusText:
          required.length === 0 ? 'Không có thực thể bắt buộc' : `${ready.length}/${required.length} đã sẵn sàng`,
        resolutionTarget: { workspace: 'pre-production', section: 'entities', resourceId: chapter.id },
      },
      {
        code: 'CHAPTER_PAGES_READY',
        group: 'SETUP',
        label: 'Cấu trúc trang của chương',
        passed: hasPages,
        mandatory: true,
        statusText: `${pages.length || chapter.pagesCount || 0} trang`,
        resolutionTarget: { workspace: 'pre-production', section: 'script', resourceId: chapter.id },
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const canStart = !isStarted && blockers.length === 0 && passedCount === checks.length;

    return {
      chapterId: chapter.id,
      seriesId: chapter.seriesId,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.title || '',
      chapterStatus: chapter.status || 'PreProduction',
      targetReleaseDate: chapter.targetReleaseDate,
      isHandedOff: Boolean(chapter.isHandedOff),
      evaluatedScriptVersionId: chapter.frozenScriptVersionId ?? chapter.lastSubmittedVersionId ?? null,
      status: isStarted ? 'STARTED' : canStart ? 'READY' : 'NOT_READY',
      canStartProduction: canStart,
      checks,
      blockers,
      warnings: [],
      summary: {
        required: checks.length,
        passed: passedCount,
        remaining: checks.length - passedCount,
      },
      script: {
        latestVersionId: chapter.lastSubmittedVersionId ?? null,
        latestVersionNumber: null,
        approvedVersionId: chapter.lastSubmittedVersionId ?? null,
        approvedVersionNumber: null,
        productionVersionId: chapter.frozenScriptVersionId ?? null,
        productionVersionNumber: null,
        scriptStatus: chapter.scriptStatus || 'Draft',
        isScriptFrozen: Boolean(chapter.isScriptFrozen),
        hasUnpushedDraftChanges: false,
        sceneCount: chapter.scenesCount ?? 0,
        pageCount: pages.length || chapter.pagesCount || 0,
        panelCount: 0,
        lineCount: 0,
        unresolvedCommentsCount: 0,
        openFindingsCount: 0,
        lastUpdatedAt: chapter.updatedAt || chapter.createdAt,
      },
      bible: {
        requiredTotal: required.length,
        readyCount: ready.length,
        missingDefinitionCount: required.filter((e) => e.bibleStatus === 'WaitingForDefinition').length,
        missingArtCount: required.filter((e) => e.bibleStatus === 'WaitingForArtist').length,
        pendingApprovalCount: required.filter((e) => e.bibleStatus === 'WaitingForConfirmation').length,
        reworkCount: required.filter((e) => e.bibleStatus === 'ReworkRequired').length,
        crowdOptionalCount: entities.filter((e) => e.isCrowd).length,
        nonVisualReadyCount: 0,
        byCategory: [],
      },
      production: {
        totalTasks: 0,
        approvedTasks: 0,
        submittedTasks: 0,
        inProgressTasks: 0,
        reworkTasks: 0,
        unassignedTasks: 0,
        overdueTasks: 0,
        taskProgressPercent: 0,
        totalPages: pages.length || chapter.pagesCount || 0,
        completedPages: 0,
        pageProgressPercent: 0,
        totalPanels: 0,
        approvedPanels: 0,
        panelProgressPercent: 0,
        stages: [],
      },
      evaluatedAt: new Date().toISOString(),
    };
  }, [serverReadiness, chapter, cast, pages]);

  const chapterStatus = String(readiness?.chapterStatus || chapter?.status || 'PreProduction');
  const isPreProduction = chapterStatus === 'PreProduction';
  const isInProduction = chapterStatus === 'InProduction';
  const isApproved = chapterStatus === 'ChapterApproved' || chapterStatus === 'Approved';
  const isDelivered = chapterStatus === 'HandedOffAndPublished' || chapterStatus === 'Published' || Boolean(readiness?.isHandedOff);
  const canStartProduction = Boolean(readiness?.canStartProduction);

  const { steps: lifecycleSteps } = useMemo(
    () => computeChapterLifecycleSteps(chapter, readiness),
    [chapter, readiness],
  );

  // Missing chapter-scoped Bible entities for quick deep-link resolution
  const missingBibleEntities = useMemo(() => {
    return (cast?.entities ?? []).filter(
      (e) =>
        !e.isCrowd &&
        !(e.isCanonLocked || e.boundRevision?.isCanonLocked || e.bibleStatus === 'CanonLocked'),
    );
  }, [cast]);

  // ── Chapter CRUD & Lifecycle Handlers ──
  const openCreateModal = () => {
    const nextNum =
      chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterNumber)) + 1 : 1;
    setFormChapterNumber(nextNum);
    setFormTitle('');
    setFormTargetReleaseDate('');
    setFormOutline('');
    setCreateChapterOpen(true);
  };

  const openEditModal = () => {
    if (!chapter) return;
    setFormChapterNumber(chapter.chapterNumber);
    setFormTitle(chapter.title || '');
    setFormTargetReleaseDate(chapter.targetReleaseDate || '');
    setFormOutline(chapter.outline || '');
    setEditChapterOpen(true);
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || actionBusy) return;
    try {
      setActionBusy(true);
      const payload: CreateChapterRequest = {
        chapterNumber: formChapterNumber,
        title: formTitle.trim() || undefined,
        targetReleaseDate: formTargetReleaseDate || undefined,
        outline: formOutline.trim() || undefined,
      };
      const created = await chapterService.createChapter(seriesId, payload);
      setCreateChapterOpen(false);
      onShowToast?.('Đã tạo chương mới', `Chương ${created.chapterNumber} đã sẵn sàng.`);
      await loadSeriesAndChapters();
      handleSelectChapter(created.id);
    } catch (err: any) {
      onShowToast?.('Lỗi tạo chương', err?.message || 'Không thể tạo chương.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapter || actionBusy) return;
    try {
      setActionBusy(true);
      const payload: UpdateChapterRequest = {
        title: formTitle.trim() || undefined,
        targetReleaseDate: formTargetReleaseDate || undefined,
        outline: formOutline.trim() || undefined,
        expectedChapterVersion: chapter.versionVector,
      };
      await chapterService.updateChapter(chapter.id, payload);
      setEditChapterOpen(false);
      onShowToast?.('Đã cập nhật chương', 'Thông tin chương đã được lưu.');
      await refreshAll();
    } catch (err: any) {
      onShowToast?.('Lỗi cập nhật', err?.message || 'Không thể cập nhật chương.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!deleteTargetChapter || isDeleting) return;
    try {
      setIsDeleting(true);
      await chapterService.deleteChapter(deleteTargetChapter.id);
      setDeleteTargetChapter(null);
      onShowToast?.('Đã xóa chương', `Chương ${deleteTargetChapter.chapterNumber} đã được xóa.`);
      await loadSeriesAndChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi xóa chương', err?.message || 'Không thể xóa chương.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnfreezeScript = async (reason: string) => {
    if (!chapter || unfreezeBusy) return;
    try {
      setUnfreezeBusy(true);
      await chapterService.unfreezeScript(chapter.id, reason);
      setShowUnfreezeDialog(false);
      onShowToast?.('Đã mở khóa kịch bản', 'Writer có thể chỉnh sửa kịch bản; cần Refreeze sau khi xong.');
      await refreshAll();
    } catch (err: any) {
      onShowToast?.('Lỗi mở khóa kịch bản', err?.message || 'Không thể mở khóa kịch bản.');
    } finally {
      setUnfreezeBusy(false);
    }
  };

  // Single lifecycle-driven Primary CTA for the Shared Chapter Header
  const headerPrimaryAction = useMemo(() => {
    if (!chapter || !workspaceId || !seriesId) return null;

    if (isDelivered) {
      return (
        <button
          type='button'
          data-testid='hub-primary-action'
          onClick={() => navigate(buildSeriesExportUrl(workspaceId, seriesId, chapter.id))}
          className='px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
        >
          <Globe className='w-3.5 h-3.5' />
          <span>Xem bàn giao & Xuất bản</span>
        </button>
      );
    }

    if (isApproved) {
      return (
        <button
          type='button'
          data-testid='hub-primary-action'
          onClick={() => navigate(buildSeriesExportUrl(workspaceId, seriesId, chapter.id))}
          className='px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
        >
          <Share2 className='w-3.5 h-3.5' />
          <span>Bàn giao chương</span>
        </button>
      );
    }

    if (isInProduction) {
      if (!readiness?.script?.isScriptFrozen && isProducer) {
        return (
          <button
            type='button'
            data-testid='hub-primary-action'
            onClick={() => setStartProductionOpen(true)}
            className='px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
          >
            <Lock className='w-3.5 h-3.5' />
            <span>Khóa lại kịch bản (Refreeze)</span>
          </button>
        );
      }
      return (
        <button
          type='button'
          data-testid='hub-primary-action'
          onClick={() =>
            navigate(
              buildProductionWorkspaceUrl(workspaceId, seriesId, {
                chapterId: chapter.id,
                tab: 'progress',
              }),
            )
          }
          className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
        >
          <LayoutGrid className='w-3.5 h-3.5' />
          <span>Mở Bảng sản xuất</span>
        </button>
      );
    }

    // PreProduction
    if (canStartProduction && isProducer) {
      return (
        <button
          type='button'
          data-testid='hub-primary-action'
          onClick={() => setStartProductionOpen(true)}
          className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
        >
          <Rocket className='w-3.5 h-3.5' />
          <span>Bắt đầu sản xuất</span>
        </button>
      );
    }

    const firstBlocker = readiness?.blockers?.[0];
    return (
      <button
        type='button'
        data-testid='hub-primary-action'
        onClick={() =>
          navigate(
            buildReadinessResolutionUrl(
              workspaceId,
              seriesId,
              chapter.id,
              firstBlocker?.resolutionTarget,
            ),
          )
        }
        className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer'
      >
        <AlertCircle className='w-3.5 h-3.5' />
        <span>
          {firstBlocker ? `Xử lý ${readiness?.blockers.length} điểm chặn` : 'Tiếp tục Tiền sản xuất'}
        </span>
      </button>
    );
  }, [chapter, workspaceId, seriesId, isDelivered, isApproved, isInProduction, canStartProduction, isProducer, readiness, navigate]);

  if (loading && chapters.length === 0) {
    return (
      <div className='p-8 max-w-[1640px] mx-auto'>
        <div className='animate-pulse space-y-4'>
          <div className='h-14 bg-stone-200/70 rounded-xl' />
          <div className='h-20 bg-stone-200/50 rounded-xl' />
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <div className='h-48 bg-stone-200/50 rounded-xl' />
            <div className='h-48 bg-stone-200/50 rounded-xl' />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8 max-w-3xl mx-auto'>
        <div className='rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 space-y-3'>
          <div className='flex items-center gap-2 font-semibold'>
            <AlertCircle className='w-5 h-5' />
            <span>{error}</span>
          </div>
          <button
            type='button'
            onClick={() => void loadSeriesAndChapters()}
            className='px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer'
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className='p-8 max-w-3xl mx-auto text-center space-y-4'>
        <div className='rounded-2xl border border-stone-200 bg-white p-10 shadow-xs space-y-3'>
          <BookOpen className='w-10 h-10 text-orange-600 mx-auto' />
          <h2 className='text-lg font-bold text-stone-900'>Chưa có chương nào trong bộ truyện</h2>
          <p className='text-sm text-stone-500'>
            Tạo chương đầu tiên để bắt đầu quy trình Tiền sản xuất, Kịch bản và Series Bible.
          </p>
          {isProducer && (
            <button
              type='button'
              onClick={openCreateModal}
              data-testid='create-first-chapter-btn'
              className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
            >
              <Plus className='w-4 h-4' />
              <span>Tạo chương đầu tiên</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const readinessPercent =
    readiness && readiness.summary.required > 0
      ? Math.round((readiness.summary.passed / readiness.summary.required) * 100)
      : 0;

  // Reusable Production Progress Section (placed high when InProduction, lower when PreProduction)
  const productionProgressSection = (
    <section
      data-testid='overview-production-progress'
      className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
            <LayoutGrid className='w-4 h-4 text-orange-600' />
            <span>{isPreProduction ? 'Phạm vi sản xuất dự kiến' : 'Tiến độ sản xuất'}</span>
          </h3>
          <p className='text-xs text-stone-500 mt-0.5'>
            {isPreProduction
              ? 'Khối lượng trang, khung và quy trình công đoạn sẽ khởi tạo khi Bắt đầu sản xuất.'
              : 'Tách biệt rõ Tiến độ Ô công việc (Task), Trang hoàn tất (Page) và Khung tranh (Panel).'}
          </p>
        </div>
        {chapter && (
          <button
            type='button'
            onClick={() =>
              navigate(
                buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: chapter.id,
                  tab: 'progress',
                }),
              )
            }
            className='text-xs font-semibold text-orange-700 hover:text-orange-800 inline-flex items-center gap-1 cursor-pointer'
          >
            <span>Mở Bảng sản xuất</span>
            <ArrowRight className='w-3.5 h-3.5' />
          </button>
        )}
      </div>

      {isPreProduction ? (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5'>
            <div className='text-xs text-stone-500'>Số trang dự kiến</div>
            <div className='text-xl font-bold text-stone-900 mt-1'>
              {readiness?.script.pageCount ?? 0}
            </div>
          </div>
          <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5'>
            <div className='text-xs text-stone-500'>Số khung (Panel)</div>
            <div className='text-xl font-bold text-stone-900 mt-1'>
              {readiness?.script.panelCount ?? 0}
            </div>
          </div>
          <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5'>
            <div className='text-xs text-stone-500'>Quy trình Pipeline</div>
            <div className='text-sm font-semibold text-stone-900 mt-1.5 truncate'>
              {readiness?.production.stages.map((s) => s.stageName).join(' → ') ||
                stages
                  .filter((s) => s.isEnabled !== false)
                  .map((s) => s.name)
                  .join(' → ') ||
                'Chưa cấu hình'}
            </div>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          {/* 3 Strictly Separated Progress Metrics */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div
              data-testid='metric-task-progress'
              className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5 space-y-2'
            >
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-stone-700'>Ô công việc đã duyệt (Task)</span>
                <span className='font-mono font-bold text-stone-900'>
                  {readiness?.production.approvedTasks ?? 0}/{readiness?.production.totalTasks ?? 0} (
                  {readiness?.production.taskProgressPercent ?? 0}%)
                </span>
              </div>
              <div className='h-2 rounded-full bg-stone-200 overflow-hidden'>
                <div
                  className='h-full bg-orange-600 rounded-full transition-all'
                  style={{ width: `${readiness?.production.taskProgressPercent ?? 0}%` }}
                />
              </div>
              <div className='flex flex-wrap gap-2 text-[11px] text-stone-500'>
                <span>Chờ duyệt: {readiness?.production.submittedTasks ?? 0}</span>
                <span>•</span>
                <span>Đang làm: {readiness?.production.inProgressTasks ?? 0}</span>
                {(readiness?.production.reworkTasks ?? 0) > 0 && (
                  <>
                    <span>•</span>
                    <span className='text-rose-600 font-semibold'>
                      Sửa lại: {readiness?.production.reworkTasks}
                    </span>
                  </>
                )}
                {(readiness?.production.overdueTasks ?? 0) > 0 && (
                  <>
                    <span>•</span>
                    <span className='text-rose-600 font-semibold'>
                      Trễ hạn: {readiness?.production.overdueTasks}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div
              data-testid='metric-page-progress'
              className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5 space-y-2'
            >
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-stone-700'>Trang hoàn tất (Page)</span>
                <span className='font-mono font-bold text-stone-900'>
                  {readiness?.production.completedPages ?? 0}/{readiness?.production.totalPages ?? 0}{' '}
                  ({readiness?.production.pageProgressPercent ?? 0}%)
                </span>
              </div>
              <div className='h-2 rounded-full bg-stone-200 overflow-hidden'>
                <div
                  className='h-full bg-emerald-600 rounded-full transition-all'
                  style={{ width: `${readiness?.production.pageProgressPercent ?? 0}%` }}
                />
              </div>
              <div className='text-[11px] text-stone-500'>
                Tính trang khi tất cả công đoạn của trang đều đã được duyệt.
              </div>
            </div>

            <div
              data-testid='metric-panel-progress'
              className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5 space-y-2'
            >
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-stone-700'>Khung tranh công đoạn cuối (Panel)</span>
                <span className='font-mono font-bold text-stone-900'>
                  {readiness?.production.approvedPanels ?? 0}/{readiness?.production.totalPanels ?? 0}{' '}
                  ({readiness?.production.panelProgressPercent ?? 0}%)
                </span>
              </div>
              <div className='h-2 rounded-full bg-stone-200 overflow-hidden'>
                <div
                  className='h-full bg-indigo-600 rounded-full transition-all'
                  style={{ width: `${readiness?.production.panelProgressPercent ?? 0}%` }}
                />
              </div>
              <div className='text-[11px] text-stone-500'>
                Số panel đã đạt duyệt tại công đoạn cuối cùng của pipeline.
              </div>
            </div>
          </div>

          {/* Per-stage breakdown */}
          {(readiness?.production.stages?.length ?? 0) > 0 && (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1'>
              {readiness!.production.stages.map((st) => {
                const pct = st.totalTasks > 0 ? Math.round((st.approvedTasks / st.totalTasks) * 100) : 0;
                return (
                  <div
                    key={st.stageId}
                    className='rounded-lg border border-stone-200/80 bg-white px-3 py-2.5 text-xs space-y-1.5'
                  >
                    <div className='flex items-center justify-between font-semibold text-stone-800'>
                      <span className='truncate'>{st.stageName}</span>
                      <span className='font-mono text-[11px] text-stone-600'>
                        {st.approvedTasks}/{st.totalTasks}
                      </span>
                    </div>
                    <div className='h-1.5 rounded-full bg-stone-100 overflow-hidden'>
                      <div
                        className='h-full bg-orange-500 rounded-full'
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {st.submittedTasks > 0 && (
                      <div className='text-[11px] text-amber-700 font-medium'>
                        {st.submittedTasks} chờ duyệt
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );

  // Reusable Pre-production Readiness Center
  const readinessCenterSection = (
    <section
      data-testid='overview-readiness-center'
      className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-4'
    >
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <ShieldAlert
              className={`w-4 h-4 ${canStartProduction ? 'text-emerald-600' : 'text-orange-600'}`}
            />
            <h3 className='text-sm font-bold text-stone-900'>
              Trung tâm Sẵn sàng Tiền sản xuất (Production Gate)
            </h3>
            <span
              data-testid='readiness-status-badge'
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isPreProduction
                  ? canStartProduction
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {!isPreProduction
                ? 'Đã bắt đầu sản xuất'
                : canStartProduction
                  ? 'Sẵn sàng sản xuất'
                  : `Còn ${readiness?.summary.remaining ?? 0} điều kiện bắt buộc`}
            </span>
          </div>
          <p className='text-xs text-stone-500'>
            Đánh giá tự động từ dữ liệu thật của Kịch bản, Series Bible phạm vi chương và Pipeline.
          </p>
        </div>

        {/* Authoritative Start Production Action + Explicit Disabled Reason */}
        {isPreProduction && isProducer && (
          <div className='flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0'>
            {!canStartProduction && (
              <span
                data-testid='start-production-disabled-reason'
                className='text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5'
              >
                {readiness?.blockers?.[0]?.message || 'Chưa đủ điều kiện bắt buộc để bắt đầu sản xuất.'}
              </span>
            )}
            <button
              type='button'
              data-testid='overview-start-production-btn'
              disabled={!canStartProduction}
              onClick={() => setStartProductionOpen(true)}
              className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap'
            >
              <Rocket className='w-3.5 h-3.5' />
              <span>Bắt đầu sản xuất</span>
            </button>
          </div>
        )}
      </div>

      {/* Overall Readiness Progress Bar */}
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between text-xs'>
          <span className='font-semibold text-stone-700'>
            Điều kiện bắt buộc đã đạt: {readiness?.summary.passed ?? 0}/{readiness?.summary.required ?? 0}
          </span>
          <span className='font-mono font-bold text-stone-800'>{readinessPercent}%</span>
        </div>
        <div className='h-2 rounded-full bg-stone-100 overflow-hidden'>
          <div
            className={`h-full rounded-full transition-all ${
              canStartProduction || !isPreProduction ? 'bg-emerald-600' : 'bg-orange-500'
            }`}
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
      </div>

      {/* Mandatory Checks List */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2.5'>
        {(readiness?.checks ?? []).map((chk) => (
          <div
            key={chk.code}
            data-testid={`readiness-check-${chk.code}`}
            className={`rounded-lg border px-3.5 py-2.5 flex items-start justify-between gap-3 ${
              chk.passed
                ? 'border-emerald-200/70 bg-emerald-50/30'
                : 'border-amber-200/80 bg-amber-50/30'
            }`}
          >
            <div className='flex items-start gap-2.5 min-w-0'>
              {chk.passed ? (
                <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
              ) : (
                <AlertCircle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
              )}
              <div className='min-w-0'>
                <div className='text-xs font-semibold text-stone-900'>{chk.label}</div>
                <div className='text-[11px] text-stone-600 mt-0.5'>
                  {chk.statusText}
                  {chk.reason ? ` — ${chk.reason}` : ''}
                </div>
              </div>
            </div>
            {!chk.passed && chapter && (
              <button
                type='button'
                onClick={() =>
                  navigate(
                    buildReadinessResolutionUrl(
                      workspaceId,
                      seriesId,
                      chapter.id,
                      chk.resolutionTarget,
                    ),
                  )
                }
                className='text-[11px] font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap shrink-0 cursor-pointer'
              >
                Xử lý →
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  // Action Center (Blockers + Warnings, deduplicated)
  const actionCenterSection = (
    <section
      data-testid='overview-action-center'
      className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-3'
    >
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
          <AlertTriangle className='w-4 h-4 text-orange-600' />
          <span>Điểm chặn & Việc cần xử lý (Action Center)</span>
        </h3>
        <div className='flex items-center gap-2 text-xs'>
          <span className='px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold'>
            {readiness?.blockers.length ?? 0} điểm chặn
          </span>
          <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold'>
            {readiness?.warnings.length ?? 0} cảnh báo
          </span>
        </div>
      </div>

      {(readiness?.blockers.length ?? 0) === 0 && (readiness?.warnings.length ?? 0) === 0 ? (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2'>
          <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
          <span>
            {isPreProduction
              ? 'Không còn điểm chặn nào. Chương đã sẵn sàng để Bắt đầu sản xuất.'
              : 'Không có cảnh báo hoặc điểm chặn cần Producer can thiệp ngay.'}
          </span>
        </div>
      ) : (
        <div className='space-y-2'>
          {(readiness?.blockers ?? []).map((issue, idx) => (
            <div
              key={`${issue.code}-${issue.resourceId || idx}`}
              data-testid={`action-blocker-${issue.code}`}
              className='rounded-lg border border-rose-200/80 bg-rose-50/40 px-3.5 py-2.5 flex items-center justify-between gap-3'
            >
              <div className='flex items-start gap-2.5 min-w-0'>
                <span className='px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase shrink-0 mt-0.5'>
                  Chặn
                </span>
                <p className='text-xs text-stone-800'>{issue.message}</p>
              </div>
              {chapter && (
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildReadinessResolutionUrl(
                        workspaceId,
                        seriesId,
                        chapter.id,
                        issue.resolutionTarget,
                      ),
                    )
                  }
                  className='px-2.5 py-1 rounded-md bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700 whitespace-nowrap shrink-0 cursor-pointer'
                >
                  Mở xử lý →
                </button>
              )}
            </div>
          ))}

          {(readiness?.warnings ?? []).map((issue, idx) => (
            <div
              key={`${issue.code}-${issue.resourceId || idx}`}
              data-testid={`action-warning-${issue.code}`}
              className='rounded-lg border border-amber-200/80 bg-amber-50/40 px-3.5 py-2.5 flex items-center justify-between gap-3'
            >
              <div className='flex items-start gap-2.5 min-w-0'>
                <span className='px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase shrink-0 mt-0.5'>
                  Cảnh báo
                </span>
                <p className='text-xs text-stone-800'>{issue.message}</p>
              </div>
              {chapter && (
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildReadinessResolutionUrl(
                        workspaceId,
                        seriesId,
                        chapter.id,
                        issue.resolutionTarget,
                      ),
                    )
                  }
                  className='px-2.5 py-1 rounded-md bg-white border border-amber-200 hover:bg-amber-50 text-xs font-semibold text-amber-800 whitespace-nowrap shrink-0 cursor-pointer'
                >
                  Xem chi tiết →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div
      data-testid='producer-chapter-overview-hub'
      className='min-h-full bg-[#FAF9F5] text-stone-900 pb-10'
    >
      {/* 1. SHARED CHAPTER HEADER */}
      <ProducerSharedHeader
        workspaceId={workspaceId}
        seriesId={seriesId}
        currentChapterId={selectedChapterId}
        chapters={chapters}
        seriesTitle={series?.title}
        currentChapter={chapter}
        readiness={readiness}
        onChapterChange={handleSelectChapter}
        actionCta={
          <div className='flex items-center gap-2'>
            {headerPrimaryAction}
            {isProducer && (
              <div className='relative'>
                <button
                  type='button'
                  data-testid='chapter-tools-menu-btn'
                  onClick={() => setToolsMenuOpen((v) => !v)}
                  aria-label='Tác vụ chương'
                  className='p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer'
                >
                  <MoreHorizontal className='w-4 h-4' />
                </button>
                {toolsMenuOpen && (
                  <div
                    data-testid='chapter-tools-menu'
                    className='absolute right-0 mt-1.5 w-56 rounded-xl border border-stone-200 bg-white shadow-lg py-1.5 z-40 text-xs'
                  >
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        openCreateModal();
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-stone-700 cursor-pointer'
                    >
                      <Plus className='w-3.5 h-3.5 text-orange-600' />
                      <span>Tạo chương mới</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        openEditModal();
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-stone-700 cursor-pointer'
                    >
                      <Edit2 className='w-3.5 h-3.5 text-stone-500' />
                      <span>Sửa thông tin chương</span>
                    </button>
                    {isInProduction && readiness?.script?.isScriptFrozen && (
                      <button
                        type='button'
                        onClick={() => {
                          setToolsMenuOpen(false);
                          setShowUnfreezeDialog(true);
                        }}
                        className='w-full px-3.5 py-2 text-left hover:bg-amber-50 flex items-center gap-2 text-amber-800 cursor-pointer'
                      >
                        <Unlock className='w-3.5 h-3.5' />
                        <span>Mở khóa kịch bản (Unfreeze)</span>
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setEditionsOpen(true);
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-stone-700 cursor-pointer'
                    >
                      <Globe className='w-3.5 h-3.5 text-stone-500' />
                      <span>Ấn bản ngôn ngữ</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setProvenanceOpen(true);
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-stone-700 cursor-pointer'
                    >
                      <History className='w-3.5 h-3.5 text-stone-500' />
                      <span>Lịch sử bản chụp & Provenance</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setPreviewLinksOpen(true);
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-stone-700 cursor-pointer'
                    >
                      <Share2 className='w-3.5 h-3.5 text-stone-500' />
                      <span>Link xem thử (Preview)</span>
                    </button>
                    <div className='my-1 border-t border-stone-100' />
                    <button
                      type='button'
                      onClick={() => {
                        setToolsMenuOpen(false);
                        if (chapter) setDeleteTargetChapter(chapter);
                      }}
                      className='w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-700 cursor-pointer'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                      <span>Xóa chương</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* MAIN FULL-WIDTH DESKTOP OVERVIEW BODY */}
      <div className='max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5'>
        {/* 2. LIFECYCLE TRACKER */}
        <section
          data-testid='overview-lifecycle-tracker'
          className='rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-xs'
        >
          <div className='flex items-center justify-between gap-2 mb-2.5'>
            <span className='text-xs font-bold uppercase tracking-wider text-stone-500'>
              Vòng đời chương (Chapter Lifecycle)
            </span>
            <button
              type='button'
              onClick={() => void refreshAll()}
              disabled={loadingReadiness}
              className='inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReadiness ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
          <ol className='flex items-center gap-1.5 overflow-x-auto pb-0.5'>
            {lifecycleSteps.map((step, idx) => (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <ChevronRight className='w-3.5 h-3.5 text-stone-300 shrink-0' aria-hidden='true' />
                )}
                <li
                  data-testid={`lifecycle-step-${step.id}`}
                  data-step-state={step.state}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    step.state === 'current'
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : step.state === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {step.state === 'completed' && <CheckCircle2 className='w-3.5 h-3.5 shrink-0' />}
                  <span>{step.label}</span>
                </li>
              </React.Fragment>
            ))}
          </ol>
        </section>

        {/* 3. ADAPTIVE PRIMARY ZONE: Pre-production prioritizes Readiness; InProduction prioritizes Progress */}
        {isPreProduction ? (
          <>
            {readinessCenterSection}
            {actionCenterSection}
          </>
        ) : (
          <>
            {productionProgressSection}
            {actionCenterSection}
          </>
        )}

        {/* 4. TWO-COLUMN SUMMARY: SCRIPT SUMMARY + CHAPTER SERIES BIBLE SUMMARY */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {/* SCRIPT SUMMARY CARD (NO FULL SCRIPT CONTENT!) */}
          <section
            data-testid='overview-script-summary'
            className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4'
          >
            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
                  <FileText className='w-4 h-4 text-orange-600' />
                  <span>Tóm tắt Kịch bản (Script Summary)</span>
                </h3>
                <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200'>
                  {readiness?.script.scriptStatus || chapter?.scriptStatus || 'Draft'}
                </span>
              </div>

              {/* Version Context: Latest vs Approved vs Production */}
              <div className='grid grid-cols-3 gap-2.5'>
                <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3'>
                  <div className='text-[11px] text-stone-500'>Bản mới nhất</div>
                  <div className='text-sm font-bold font-mono text-stone-900 mt-0.5'>
                    {readiness?.script.latestVersionNumber
                      ? `v${readiness.script.latestVersionNumber}`
                      : 'Chưa lưu'}
                  </div>
                </div>
                <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3'>
                  <div className='text-[11px] text-stone-500'>Bản gửi duyệt</div>
                  <div className='text-sm font-bold font-mono text-stone-900 mt-0.5'>
                    {readiness?.script.approvedVersionNumber
                      ? `v${readiness.script.approvedVersionNumber}`
                      : '—'}
                  </div>
                </div>
                <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3'>
                  <div className='text-[11px] text-stone-500'>Bản đang sản xuất</div>
                  <div className='text-sm font-bold font-mono text-orange-700 mt-0.5'>
                    {readiness?.script.productionVersionNumber
                      ? `v${readiness.script.productionVersionNumber}`
                      : 'Chưa khóa'}
                  </div>
                </div>
              </div>

              {/* Structural & Review Counters */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
                <div className='rounded-lg bg-stone-50 px-3 py-2 border border-stone-100'>
                  <div className='text-stone-500 text-[11px]'>Cảnh</div>
                  <div className='font-bold text-stone-900'>{readiness?.script.sceneCount ?? 0}</div>
                </div>
                <div className='rounded-lg bg-stone-50 px-3 py-2 border border-stone-100'>
                  <div className='text-stone-500 text-[11px]'>Trang / Khung</div>
                  <div className='font-bold text-stone-900'>
                    {readiness?.script.pageCount ?? 0} / {readiness?.script.panelCount ?? 0}
                  </div>
                </div>
                <div className='rounded-lg bg-stone-50 px-3 py-2 border border-stone-100'>
                  <div className='text-stone-500 text-[11px]'>Góp ý mở</div>
                  <div className='font-bold text-stone-900 flex items-center gap-1'>
                    <MessageSquare className='w-3 h-3 text-stone-400' />
                    {readiness?.script.unresolvedCommentsCount ?? 0}
                  </div>
                </div>
                <div className='rounded-lg bg-stone-50 px-3 py-2 border border-stone-100'>
                  <div className='text-stone-500 text-[11px]'>Cảnh báo nhất quán</div>
                  <div className='font-bold text-stone-900'>
                    {readiness?.script.openFindingsCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className='pt-3 border-t border-stone-100 flex items-center justify-between gap-2'>
              <span className='text-[11px] text-stone-500'>
                {readiness?.script.lastUpdatedAt
                  ? `Cập nhật: ${new Date(readiness.script.lastUpdatedAt).toLocaleString()}`
                  : ''}
              </span>
              {chapter && (
                <button
                  type='button'
                  data-testid='open-script-workspace-btn'
                  onClick={() => navigate(buildScriptReviewUrl(workspaceId, seriesId, chapter.id))}
                  className='px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
                >
                  <span>Mở Không gian Kịch bản</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </button>
              )}
            </div>
          </section>

          {/* CHAPTER-SCOPED SERIES BIBLE SUMMARY CARD */}
          <section
            data-testid='overview-bible-summary'
            className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4'
          >
            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
                  <Palette className='w-4 h-4 text-orange-600' />
                  <span>Tài liệu tham khảo chương (Chapter Bible)</span>
                </h3>
                <span className='text-xs font-mono font-bold text-stone-800'>
                  {readiness?.bible.readyCount ?? 0}/{readiness?.bible.requiredTotal ?? 0} bắt buộc
                </span>
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
                <div className='rounded-lg bg-emerald-50/60 px-3 py-2 border border-emerald-100'>
                  <div className='text-emerald-700 text-[11px]'>Đã khóa chuẩn</div>
                  <div className='font-bold text-emerald-900'>{readiness?.bible.readyCount ?? 0}</div>
                </div>
                <div className='rounded-lg bg-amber-50/60 px-3 py-2 border border-amber-100'>
                  <div className='text-amber-800 text-[11px]'>Thiếu bản vẽ / ĐN</div>
                  <div className='font-bold text-amber-900'>
                    {(readiness?.bible.missingArtCount ?? 0) +
                      (readiness?.bible.missingDefinitionCount ?? 0)}
                  </div>
                </div>
                <div className='rounded-lg bg-sky-50/60 px-3 py-2 border border-sky-100'>
                  <div className='text-sky-800 text-[11px]'>Chờ duyệt</div>
                  <div className='font-bold text-sky-900'>
                    {readiness?.bible.pendingApprovalCount ?? 0}
                  </div>
                </div>
                <div className='rounded-lg bg-stone-50 px-3 py-2 border border-stone-200/70'>
                  <div className='text-stone-600 text-[11px]'>Quần chúng (tùy chọn)</div>
                  <div className='font-bold text-stone-800'>
                    {readiness?.bible.crowdOptionalCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Category breakdown pills */}
              {(readiness?.bible.byCategory?.length ?? 0) > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                  {readiness!.bible.byCategory.map((cat) => (
                    <span
                      key={cat.category}
                      className='text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200/80'
                    >
                      {CATEGORY_LABELS[cat.category] || cat.category}: {cat.ready}/{cat.required}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick contextual links for missing required references */}
              {missingBibleEntities.length > 0 && chapter && (
                <div className='space-y-1.5 pt-1'>
                  <div className='text-[11px] font-semibold text-stone-500 uppercase tracking-wide'>
                    Cần bổ sung / khóa chuẩn
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {missingBibleEntities.slice(0, 6).map((ent) => (
                      <button
                        key={ent.bibleEntryId}
                        type='button'
                        onClick={() =>
                          navigate(
                            `${buildScriptReviewUrl(workspaceId, seriesId, chapter.id)}?tab=entities&entityId=${encodeURIComponent(ent.bibleEntryId)}`,
                          )
                        }
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 hover:bg-rose-100 cursor-pointer'
                      >
                        <span>{ent.name}</span>
                        <ArrowRight className='w-3 h-3' />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
              <button
                type='button'
                onClick={() => navigate(buildBibleUrl(workspaceId, seriesId))}
                className='text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer'
              >
                Mở Thư viện Series Bible →
              </button>
              {chapter && (
                <button
                  type='button'
                  data-testid='open-chapter-references-btn'
                  onClick={() =>
                    navigate(`${buildScriptReviewUrl(workspaceId, seriesId, chapter.id)}?tab=entities`)
                  }
                  className='px-3.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
                >
                  <span>Kiểm tra tài liệu chương</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </button>
              )}
            </div>
          </section>
        </div>

        {/* 5. SECONDARY ZONE: Production Scope (when PreProduction) or Gate Summary (when InProduction) */}
        {isPreProduction ? productionProgressSection : readinessCenterSection}

        {/* 6. QUICK SHORTCUTS & RECENT ACTIVITY */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-5'>
          <section className='rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-3'>
            <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
              <Layers className='w-4 h-4 text-orange-600' />
              <span>Lối tắt điều hành</span>
            </h3>
            <div className='grid grid-cols-1 gap-2 text-xs'>
              {chapter && (
                <>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        buildProductionWorkspaceUrl(workspaceId, seriesId, {
                          chapterId: chapter.id,
                          tab: 'crew',
                        }),
                      )
                    }
                    className='w-full px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between text-stone-800 font-medium cursor-pointer'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <Users className='w-3.5 h-3.5 text-stone-500' />
                      Quản lý Ê-kíp & Tải công việc
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400' />
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate(buildChapterReaderUrl(workspaceId, seriesId, chapter.id))}
                    className='w-full px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between text-stone-800 font-medium cursor-pointer'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <Play className='w-3.5 h-3.5 text-stone-500' />
                      Đọc thử & Soát trang (Reader)
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400' />
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate(buildEditorDeskUrl(workspaceId, seriesId, { chapterId: chapter.id }))}
                    className='w-full px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between text-stone-800 font-medium cursor-pointer'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <ClipboardCheck className='w-3.5 h-3.5 text-stone-500' />
                      Hàng đợi Kiểm duyệt & Hiệu đính
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400' />
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate(buildSeriesExportUrl(workspaceId, seriesId, chapter.id))}
                    className='w-full px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between text-stone-800 font-medium cursor-pointer'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <Share2 className='w-3.5 h-3.5 text-stone-500' />
                      Xuất file & Bàn giao xuất bản
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400' />
                  </button>
                </>
              )}
            </div>
          </section>

          <section
            data-testid='overview-recent-activity'
            className='lg:col-span-2 rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-3'
          >
            <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
              <Clock className='w-4 h-4 text-orange-600' />
              <span>Hoạt động & Kiểm duyệt gần đây</span>
            </h3>
            {reviews.length === 0 ? (
              <p className='text-xs text-stone-500'>
                Chưa có bản ghi kiểm duyệt hoặc bàn giao cấp chương nào cho chương này.
              </p>
            ) : (
              <ul className='divide-y divide-stone-100 text-xs'>
                {reviews.slice(0, 6).map((rev) => (
                  <li key={rev.id} className='py-2.5 flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <span className='font-semibold text-stone-900'>
                        {rev.action}
                      </span>
                      {rev.comment && (
                        <p className='text-stone-600 mt-0.5 truncate'>{rev.comment}</p>
                      )}
                    </div>
                    <span className='text-[11px] text-stone-400 whitespace-nowrap shrink-0'>
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ── MODALS ── */}
      {startProductionOpen &&
        chapter &&
        (isPreProduction ? (
          <StartProductionModal
            isOpen
            workspaceId={workspaceId}
            seriesId={seriesId}
            chapterId={chapter.id}
            chapterNumber={chapter.chapterNumber}
            chapterTitle={chapter.title || undefined}
            onClose={() => setStartProductionOpen(false)}
            onSuccess={() => {
              setStartProductionOpen(false);
              onShowToast?.(
                'Đã bắt đầu sản xuất',
                'Kịch bản đã khóa và bảng công việc đã khởi tạo.',
              );
              void refreshAll();
            }}
            onShowToast={onShowToast}
          />
        ) : (
          <RefreezeScriptModal
            isOpen
            workspaceId={workspaceId}
            seriesId={seriesId}
            chapterId={chapter.id}
            chapterNumber={chapter.chapterNumber}
            chapterTitle={chapter.title || undefined}
            onClose={() => setStartProductionOpen(false)}
            onSuccess={() => {
              setStartProductionOpen(false);
              onShowToast?.(
                'Đã khóa lại kịch bản',
                'Bản kịch bản mới đã được đồng bộ vào sản xuất.',
              );
              void refreshAll();
            }}
            onShowToast={onShowToast}
          />
        ))}

      {showUnfreezeDialog && (
        <Modal
          isOpen={showUnfreezeDialog}
          onClose={() => setShowUnfreezeDialog(false)}
          title='Mở khóa kịch bản (Unfreeze)'
          closeLabel='Đóng'
        >
          <ReasonForm
            label='Lý do mở khóa kịch bản'
            confirmLabel='Xác nhận mở khóa'
            busy={unfreezeBusy}
            onConfirm={(reason) => void handleUnfreezeScript(reason)}
            onCancel={() => setShowUnfreezeDialog(false)}
          />
        </Modal>
      )}

      {createChapterOpen && (
        <Modal
          isOpen={createChapterOpen}
          onClose={() => setCreateChapterOpen(false)}
          title={t('chapterManagement.createTitle', 'Tạo chương mới')}
          closeLabel='Đóng'
        >
          <form onSubmit={handleCreateChapter} className='space-y-3 text-xs'>
            <div>
              <label className='block font-semibold text-stone-700 mb-1'>Số chương</label>
              <input
                type='number'
                min={1}
                required
                value={formChapterNumber}
                onChange={(e) => setFormChapterNumber(Number(e.target.value))}
                className='w-full px-3 py-2 rounded-lg border border-stone-200'
              />
            </div>
            <div>
              <label className='block font-semibold text-stone-700 mb-1'>Tên chương</label>
              <input
                type='text'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder='VD: Khởi đầu mới'
                className='w-full px-3 py-2 rounded-lg border border-stone-200'
              />
            </div>
            <div>
              <label className='block font-semibold text-stone-700 mb-1'>Hạn phát hành dự kiến</label>
              <input
                type='date'
                value={formTargetReleaseDate}
                onChange={(e) => setFormTargetReleaseDate(e.target.value)}
                className='w-full px-3 py-2 rounded-lg border border-stone-200'
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setCreateChapterOpen(false)}
                className='px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={actionBusy}
                className='px-4 py-1.5 rounded-lg bg-orange-600 text-white font-semibold cursor-pointer disabled:opacity-50'
              >
                {actionBusy ? 'Đang tạo...' : 'Tạo chương'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editChapterOpen && chapter && (
        <Modal
          isOpen={editChapterOpen}
          onClose={() => setEditChapterOpen(false)}
          title='Cập nhật thông tin chương'
          closeLabel='Đóng'
        >
          <form onSubmit={handleUpdateChapter} className='space-y-3 text-xs'>
            <div>
              <label className='block font-semibold text-stone-700 mb-1'>Tên chương</label>
              <input
                type='text'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className='w-full px-3 py-2 rounded-lg border border-stone-200'
              />
            </div>
            <div>
              <label className='block font-semibold text-stone-700 mb-1'>Hạn phát hành dự kiến</label>
              <input
                type='date'
                value={formTargetReleaseDate}
                onChange={(e) => setFormTargetReleaseDate(e.target.value)}
                className='w-full px-3 py-2 rounded-lg border border-stone-200'
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setEditChapterOpen(false)}
                className='px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={actionBusy}
                className='px-4 py-1.5 rounded-lg bg-orange-600 text-white font-semibold cursor-pointer disabled:opacity-50'
              >
                {actionBusy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {chapter && (
        <>
          {assignmentsOpen && (
            <ChapterAssignmentsModal
              isOpen
              chapterId={chapter.id}
              chapterNumber={chapter.chapterNumber}
              chapterTitle={chapter.title || undefined}
              seriesId={seriesId}
              workspaceId={workspaceId}
              onClose={() => setAssignmentsOpen(false)}
              onShowToast={onShowToast}
            />
          )}
          {editionsOpen && (
            <ChapterEditionsModal
              isOpen
              chapter={chapter}
              onClose={() => setEditionsOpen(false)}
              onShowToast={onShowToast}
            />
          )}
          {previewLinksOpen && (
            <PreviewLinksModal
              isOpen
              chapterId={chapter.id}
              chapterNumber={chapter.chapterNumber}
              chapterTitle={chapter.title}
              chapterStatus={chapter.status}
              workspaceRole={workspaceRole as any}
              onClose={() => setPreviewLinksOpen(false)}
            />
          )}
          {provenanceOpen && (
            <ChapterProvenanceModal
              seriesId={seriesId}
              chapterId={chapter.id}
              chapterNumber={chapter.chapterNumber}
              chapterTitle={chapter.title}
              viewerRole={workspaceRole}
              onClose={() => setProvenanceOpen(false)}
            />
          )}
        </>
      )}

      {deleteTargetChapter && (
        <TypeToConfirmModal
          isOpen
          onCancel={() => setDeleteTargetChapter(null)}
          onConfirm={handleDeleteChapter}
          title='Xóa chương'
          description={`Nhập "DELETE" để xác nhận xóa Chương ${deleteTargetChapter.chapterNumber}.`}
          targetName='DELETE'
          confirmButtonText='Xác nhận xóa'
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
