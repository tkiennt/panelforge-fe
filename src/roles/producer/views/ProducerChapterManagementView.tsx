import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Globe,
  History,
  Layers,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Unlock,
  UserCheck,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ChapterDto,
  type ChapterLockGateDto,
  type CreateChapterRequest,
  type ScriptCommentDto,
  type ScriptStatus,
  type ScriptVersionDetailDto,
  type UpdateChapterRequest,
} from '@/services/chapter.service';
import {
  chapterCastService,
  type ChapterCastBlockerDto,
  type ChapterCastDto,
  type ChapterCastItemDto,
} from '@/services/chapterCast.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { pageService, type PageDto } from '@/services/page.service';
import { StartProductionModal } from '@/shared/modals/StartProductionModal';
import { ChapterAssignmentsModal } from '../modals/ChapterAssignmentsModal';
import { ChapterEditionsModal } from '../modals/ChapterEditionsModal';
import { PreviewLinksModal } from '../modals/PreviewLinksModal';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { ReasonForm } from '@/shared/components/ReasonForm';
import { TypeToConfirmModal } from '@/shared/components/lucian';
import { Modal } from '@/shared/ui';
import {
  DEFAULT_ROW_LABELS,
  renderRow,
  shortHash,
} from '@/shared/features/script-versions/versionDiff';

export interface ProducerChapterManagementViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

type InspectorTab = 'bible' | 'checklist' | 'comments' | 'tools';

export const ProducerChapterManagementView: React.FC<ProducerChapterManagementViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { lang } = useTranslation('production');
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

  // Selected Chapter Detailed Data
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [pushedScript, setPushedScript] = useState<ScriptVersionDetailDto | null>(null);
  const [cast, setCast] = useState<ChapterCastDto | null>(null);
  const [lockGate, setLockGate] = useState<ChapterLockGateDto | null>(null);
  const [comments, setComments] = useState<ScriptCommentDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);

  // UI States
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('bible');
  const [scriptSearch, setScriptSearch] = useState('');
  const [bibleCategory, setBibleCategory] = useState<string>('all');
  const [bibleSearch, setBibleSearch] = useState('');
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  // Modals & Action States
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

  // Form states for Create / Edit Chapter
  const [formChapterNumber, setFormChapterNumber] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formTargetReleaseDate, setFormTargetReleaseDate] = useState('');
  const [formOutline, setFormOutline] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // ── Load Series & Chapters List ──
  const loadSeriesAndChapters = useCallback(async () => {
    if (!seriesId) return;
    try {
      setLoading(true);
      setError(null);
      const [seriesRes, chaptersRes, stagesRes] = await Promise.all([
        seriesService.getSeriesById(seriesId).catch(() => null),
        chapterService.getChaptersBySeries(seriesId, 1, 100).catch(() => ({ items: [], totalCount: 0 })),
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
      setError(err?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [seriesId, urlChapterId, setSearchParams]);

  useEffect(() => {
    loadSeriesAndChapters();
  }, [loadSeriesAndChapters]);

  // ── Load Chapter Detailed Context ──
  const loadChapterDetails = useCallback(async (cId: string) => {
    if (!cId) {
      setChapter(null);
      setPushedScript(null);
      setCast(null);
      setLockGate(null);
      setComments([]);
      setPages([]);
      return;
    }

    try {
      const [chapterData, castData, lockGateData, commentsData, pagesData] = await Promise.all([
        chapterService.getChapterById(cId).catch(() => null),
        chapterCastService.getChapterCast(cId).catch(() => null),
        chapterService.getChapterLockGate(cId).catch(() => null),
        chapterService.getScriptComments(cId).catch(() => []),
        pageService.getPagesByChapter(cId).catch(() => []),
      ]);

      setChapter(chapterData);
      setCast(castData);
      setLockGate(lockGateData);
      setComments(commentsData || []);
      setPages(pagesData || []);

      let scriptVersion: ScriptVersionDetailDto | null = null;
      if (chapterData?.lastSubmittedVersionId) {
        scriptVersion = await chapterService
          .getScriptVersion(cId, chapterData.lastSubmittedVersionId)
          .catch(() => null);
      }

      if (!scriptVersion) {
        try {
          const workingCopy = await chapterService.getScriptWorkingCopy(cId);
          if (workingCopy && workingCopy.rows && workingCopy.rows.length > 0) {
            scriptVersion = {
              version: {
                id: 'working-copy',
                versionNumber: 0,
                message: 'Bản thảo đang viết dở',
                authorUserId: '',
                authorName: '',
                createdAt: new Date().toISOString(),
                lineCount: workingCopy.lineCount || workingCopy.rows.length,
                contentHash: workingCopy.contentHash || '',
                submittedAt: null,
              },
              rows: workingCopy.rows,
            };
          }
        } catch {
          // Bỏ qua nếu không có working copy
        }
      }

      setPushedScript(scriptVersion);
    } catch (err: any) {
      onShowToast?.('Lỗi nạp chương', err?.message || 'Không thể nạp dữ liệu chi tiết.');
    }
  }, [onShowToast]);

  useEffect(() => {
    if (selectedChapterId) {
      loadChapterDetails(selectedChapterId);
    }
  }, [selectedChapterId, loadChapterDetails]);

  const handleSelectChapter = (newId: string) => {
    setSelectedChapterId(newId);
    setSearchParams({ chapterId: newId });
  };

  // ── Actions ──
  const handleOpenCreateChapter = () => {
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterNumber)) + 1 : 1;
    setFormChapterNumber(nextNum);
    setFormTitle('');
    setFormTargetReleaseDate('');
    setFormOutline('');
    setCreateChapterOpen(true);
  };

  const handleCreateChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId) return;
    setActionBusy(true);
    try {
      const payload: CreateChapterRequest = {
        chapterNumber: Number(formChapterNumber),
        title: formTitle.trim() || undefined,
        targetReleaseDate: formTargetReleaseDate || undefined,
        outline: formOutline.trim() || undefined,
      };
      const created = await chapterService.createChapter(seriesId, payload);
      onShowToast?.('Đã tạo chương', `Chương ${created.chapterNumber}: "${created.title || ''}"`);
      setCreateChapterOpen(false);
      await loadSeriesAndChapters();
      setSelectedChapterId(created.id);
      setSearchParams({ chapterId: created.id });
    } catch (err: any) {
      onShowToast?.('Lỗi tạo chương', err?.message || 'Không thể tạo chương mới.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenEditChapter = () => {
    if (!chapter) return;
    setFormTitle(chapter.title || '');
    setFormTargetReleaseDate(chapter.targetReleaseDate ? chapter.targetReleaseDate.slice(0, 10) : '');
    setFormOutline(chapter.outline || '');
    setEditChapterOpen(true);
  };

  const handleEditChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    setActionBusy(true);
    try {
      const payload: UpdateChapterRequest = {
        title: formTitle.trim() || undefined,
        targetReleaseDate: formTargetReleaseDate || undefined,
        outline: formOutline.trim() || undefined,
        expectedChapterVersion: chapter.versionVector,
      };
      await chapterService.updateChapter(chapter.id, payload);
      onShowToast?.('Đã lưu thay đổi', `Chương ${chapter.chapterNumber}`);
      setEditChapterOpen(false);
      await loadChapterDetails(chapter.id);
      await loadSeriesAndChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi lưu chương', err?.message || 'Không thể cập nhật chương.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnfreezeScript = async (reason: string) => {
    if (!chapter) return;
    setUnfreezeBusy(true);
    try {
      await chapterService.unfreezeScript(chapter.id, reason);
      onShowToast?.('Đã mở lại kịch bản', `Chương ${chapter.chapterNumber} (Draft)`);
      setShowUnfreezeDialog(false);
      await loadChapterDetails(chapter.id);
      await loadSeriesAndChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi mở lại', err?.message || 'Không thể mở lại kịch bản.');
    } finally {
      setUnfreezeBusy(false);
    }
  };

  const handleDeleteOrArchiveChapter = async () => {
    if (!deleteTargetChapter) return;
    setIsDeleting(true);
    try {
      await chapterService.deleteChapter(deleteTargetChapter.id);
      onShowToast?.(
        deleteTargetChapter.status === 'PreProduction' && (!deleteTargetChapter.pagesCount || deleteTargetChapter.pagesCount === 0)
          ? 'Đã xóa vĩnh viễn'
          : 'Đã lưu trữ chương',
        `Chương ${deleteTargetChapter.chapterNumber}`,
      );
      setDeleteTargetChapter(null);
      await loadSeriesAndChapters();
    } catch (err: any) {
      onShowToast?.('Thao tác thất bại', err?.message || 'Không thể xử lý chương.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Derived Properties & Fast Metrics ──
  const scriptStatus: ScriptStatus =
    chapter?.scriptStatus ?? (chapter?.isScriptFrozen ? 'Frozen' : 'Draft');
  const isScriptFrozen = chapter?.isScriptFrozen === true || scriptStatus === 'Frozen';
  const isInReview = scriptStatus === 'InReview';
  const isGatePassed = cast?.gate?.canStart ?? false;
  const blockers: ChapterCastBlockerDto[] = cast?.gate?.blockers ?? [];
  const openCommentsCount = comments.filter((c) => !c.resolvedAt).length;

  const totalEntities = cast?.entities?.length ?? 0;
  const canonLockedEntities = (cast?.entities ?? []).filter(
    (e) => e.isCanonLocked || e.boundRevision?.isCanonLocked,
  ).length;

  // Filtered rows in Script
  const filteredScriptRows = useMemo(() => {
    const rows = pushedScript?.rows ?? [];
    if (!scriptSearch.trim() && !selectedEntityName) return rows;
    return rows.filter((r) => {
      const txt = (r.text ?? '').toLowerCase();
      const lbl = (r.label ?? '').toLowerCase();
      if (selectedEntityName) {
        const entName = selectedEntityName.toLowerCase();
        const matchesEntity = lbl.includes(entName) || txt.includes(entName);
        if (!matchesEntity) return false;
      }
      if (scriptSearch.trim()) {
        const q = scriptSearch.toLowerCase().trim();
        return txt.includes(q) || lbl.includes(q);
      }
      return true;
    });
  }, [pushedScript, scriptSearch, selectedEntityName]);

  // Filtered Cast Entities
  const filteredCastEntities = useMemo(() => {
    const list = cast?.entities ?? [];
    return list.filter((e) => {
      if (bibleCategory !== 'all') {
        const catStr = String(e.category).toLowerCase();
        if (!catStr.includes(bibleCategory.toLowerCase())) return false;
      }
      if (bibleSearch.trim()) {
        const q = bibleSearch.toLowerCase().trim();
        return e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cast, bibleCategory, bibleSearch]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '–';
    try {
      return new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB');
    } catch {
      return iso;
    }
  };

  // ── Loading & Error Fallbacks ──
  if (loading && chapters.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center bg-[#FAF9F5] p-12 font-sans'>
        <RotateCcw className='h-6 w-6 animate-spin text-[#EA580C]' aria-hidden='true' />
        <span className='ml-2.5 text-xs font-semibold text-stone-600'>Đang nạp dữ liệu chương...</span>
      </div>
    );
  }

  if (error && chapters.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center bg-[#FAF9F5] p-6 font-sans'>
        <div className='max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs'>
          <AlertCircle className='mx-auto h-8 w-8 text-rose-600' />
          <h2 className='mt-2 font-serif text-base font-bold text-stone-900'>Lỗi nạp dữ liệu</h2>
          <p className='mt-1 text-xs text-stone-600'>{error}</p>
          <div className='mt-4 flex justify-center gap-2'>
            <button
              type='button'
              onClick={loadSeriesAndChapters}
              className='rounded-xl bg-[#EA580C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C]'
            >
              Thử lại
            </button>
            <button
              type='button'
              onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/dashboard`)}
              className='rounded-xl border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50'
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      {/* ── TOP COMPACT COCKPIT BAR ── */}
      <header className='sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {/* Chapter Breadcrumb & Selector */}
          <div className='flex items-center gap-2.5 min-w-0'>
            <button
              type='button'
              onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/dashboard`)}
              className='flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
              title='Dashboard'
            >
              <ArrowLeft className='h-3.5 w-3.5' />
            </button>

            <span className='font-serif text-xs font-bold text-stone-500 uppercase tracking-wide truncate max-w-32 hidden sm:inline'>
              {series?.title || 'Series'}
            </span>
            <span className='text-xs text-stone-300 hidden sm:inline'>/</span>

            {/* Chapter Selector Dropdown */}
            <div className='relative'>
              <select
                value={selectedChapterId}
                onChange={(e) => handleSelectChapter(e.target.value)}
                aria-label='Chọn chương'
                className='h-8 rounded-lg border border-stone-200 bg-stone-50 pl-2.5 pr-7 text-xs font-bold text-stone-900 focus:border-orange-500 focus:bg-white focus:outline-none cursor-pointer'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chương {c.chapterNumber}: {c.title || 'Không tiêu đề'}
                  </option>
                ))}
              </select>
            </div>

            {/* Badges */}
            {chapter && (
              <div className='flex items-center gap-1.5'>
                <span
                  data-testid='chapter-status-badge'
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    chapter.status === 'InProduction'
                      ? 'border-sky-300 bg-sky-50 text-sky-800'
                      : chapter.status === 'ChapterApproved'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : chapter.status === 'Archived'
                          ? 'border-stone-300 bg-stone-100 text-stone-600'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                  }`}
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-current' />
                  {chapter.status === 'InProduction'
                    ? 'Đang sản xuất'
                    : chapter.status === 'ChapterApproved'
                      ? 'Đã duyệt'
                      : chapter.status === 'Archived'
                        ? 'Đã lưu trữ'
                        : 'Tiền kỳ'}
                </span>

                <span
                  data-testid='script-frozen-badge'
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    isScriptFrozen
                      ? 'border-purple-300 bg-purple-50 text-purple-800'
                      : isInReview
                        ? 'border-orange-300 bg-orange-50 text-orange-800'
                        : 'border-stone-200 bg-stone-100 text-stone-600'
                  }`}
                >
                  {isScriptFrozen ? (
                    <Lock className='h-2.5 w-2.5 text-purple-700' />
                  ) : (
                    <FileText className='h-2.5 w-2.5 text-stone-500' />
                  )}
                  {isScriptFrozen
                    ? 'Đóng băng (Frozen)'
                    : isInReview
                      ? 'Chờ duyệt (InReview)'
                      : 'Bản thảo (Draft)'}
                </span>
              </div>
            )}
          </div>

          {/* Quick Action CTAs */}
          <div className='flex items-center gap-2'>
            {/* Gate 1 Start Production Primary Decision CTA */}
            {!isScriptFrozen && chapter && (
              <button
                type='button'
                onClick={() => setStartProductionOpen(true)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                  isGatePassed
                    ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]'
                    : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
                title='Duyệt kịch bản, gán họa sĩ và chuyển sang sản xuất'
              >
                <Play className='h-3 w-3 fill-current' />
                <span>Chốt duyệt & Bắt đầu</span>
                {blockers.length > 0 && (
                  <span className='ml-1 rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] text-white font-mono'>
                    {blockers.length} chặn
                  </span>
                )}
              </button>
            )}

            {/* In-Production Shortcuts */}
            {isScriptFrozen && chapter && (
              <>
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${chapter.id}`,
                    )
                  }
                  className='inline-flex h-8 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-800'
                >
                  <Layers className='h-3 w-3 text-orange-400' />
                  <span>Bảng sản xuất</span>
                </button>

                <button
                  type='button'
                  onClick={() => setShowUnfreezeDialog(true)}
                  className='inline-flex h-8 items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 text-xs font-semibold text-purple-900 hover:bg-purple-100'
                  title='Mở lại kịch bản về Draft kèm lý do'
                >
                  <Unlock className='h-3 w-3 text-purple-700' />
                  <span>Mở lại</span>
                </button>
              </>
            )}

            {/* Sửa thông tin */}
            <button
              type='button'
              onClick={handleOpenEditChapter}
              className='inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50'
              title='Sửa tiêu đề & hạn chót'
            >
              <Edit2 className='h-3 w-3 text-stone-500' />
              <span>Sửa</span>
            </button>

            {/* Tạo chương mới */}
            <button
              type='button'
              onClick={handleOpenCreateChapter}
              className='inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50'
            >
              <Plus className='h-3 w-3 text-orange-600' />
              <span className='hidden sm:inline'>Thêm chương</span>
            </button>

            {/* Menu công cụ bổ sung */}
            <div className='relative'>
              <button
                type='button'
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                className='flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                title='Công cụ & Lưu trữ'
              >
                <MoreHorizontal className='h-4 w-4' />
              </button>

              {toolsMenuOpen && chapter && (
                <div
                  className='absolute right-0 top-9 z-30 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg text-xs font-medium'
                  onMouseLeave={() => setToolsMenuOpen(false)}
                >
                  <button
                    type='button'
                    onClick={() => {
                      setAssignmentsOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-stone-100'
                  >
                    <UserCheck className='h-3.5 w-3.5 text-orange-600' />
                    <span>Giao việc (Task Grid)</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setEditionsOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-stone-100'
                  >
                    <Globe className='h-3.5 w-3.5 text-purple-600' />
                    <span>Ấn bản ngôn ngữ</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setProvenanceOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-stone-100'
                  >
                    <History className='h-3.5 w-3.5 text-sky-600' />
                    <span>Bản chụp & Xuất xứ</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setPreviewLinksOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-stone-100'
                  >
                    <Share2 className='h-3.5 w-3.5 text-emerald-600' />
                    <span>Link xem thử</span>
                  </button>
                  <div className='my-1 border-t border-stone-100' />
                  <button
                    type='button'
                    onClick={() => {
                      setDeleteTargetChapter(chapter);
                      setToolsMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-700 hover:bg-rose-50'
                  >
                    <Archive className='h-3.5 w-3.5' />
                    <span>Lưu trữ / Xóa</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 1-LINE GLANCE STRIP (Dải đối chiếu nhanh) ── */}
        {chapter && (
          <div className='mt-2.5 flex items-center justify-between gap-4 border-t border-stone-100 pt-2 text-[11px] text-stone-600 overflow-x-auto whitespace-nowrap'>
            <div className='flex items-center gap-4'>
              <span className='flex items-center gap-1 font-medium'>
                <FileText className='h-3 w-3 text-stone-400' />
                Kịch bản: <strong>{pushedScript ? `v${pushedScript.version.versionNumber}` : 'Bản thảo'}</strong>
                {pushedScript && ` (${pushedScript.rows.length} dòng)`}
              </span>

              <span className='flex items-center gap-1 font-medium'>
                <Palette className='h-3 w-3 text-stone-400' />
                Art Bible:{' '}
                <strong className={isGatePassed ? 'text-emerald-700' : 'text-rose-700'}>
                  {canonLockedEntities}/{totalEntities} locked
                </strong>
                {blockers.length > 0 && <span className='text-rose-600 font-bold'>({blockers.length} chặn)</span>}
              </span>

              <span className='flex items-center gap-1 font-medium'>
                <MessageSquare className='h-3 w-3 text-stone-400' />
                Góp ý:{' '}
                <strong className={openCommentsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {openCommentsCount} mở
                </strong>
              </span>

              {chapter.targetReleaseDate && (
                <span className='flex items-center gap-1 text-stone-500'>
                  <Calendar className='h-3 w-3 text-stone-400' />
                  Hạn: {formatDate(chapter.targetReleaseDate)}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2 font-mono text-[10px] text-stone-400 shrink-0'>
              {pushedScript?.version.contentHash && <span>#{shortHash(pushedScript.version.contentHash)}</span>}
            </div>
          </div>
        )}
      </header>

      {/* ── UNFREEZE SCRIPT DIALOG ── */}
      {showUnfreezeDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs'>
          <div className='w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl'>
            <div className='flex items-center gap-2 text-purple-800 font-bold text-sm'>
              <Unlock className='h-4 w-4' />
              <span>Mở lại kịch bản (Draft)</span>
            </div>
            <p className='mt-1 text-xs text-stone-600'>
              Kịch bản sẽ được mở khóa để Writer sửa. Nhập lý do vào Audit Log:
            </p>
            <ReasonForm
              label=''
              confirmLabel='Mở lại'
              busy={unfreezeBusy}
              tone='neutral'
              onConfirm={handleUnfreezeScript}
              onCancel={() => setShowUnfreezeDialog(false)}
            />
          </div>
        </div>
      )}

      {/* ── DUAL-PANE COCKPIT WORKBENCH (SCRIPT + ART BIBLE REFERENCE) ── */}
      <main className='flex-1 max-w-7xl mx-auto w-full p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'>
        {/* LEFT COLUMN (COL 7/12): SCRIPT VIEWER */}
        <section
          aria-label='Nội dung kịch bản'
          className='lg:col-span-7 flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden'
        >
          {/* Script Pane Header */}
          <div className='flex items-center justify-between border-b border-stone-100 bg-[#FCFBF8] px-4 py-2.5'>
            <div className='flex items-center gap-2'>
              <FileText className='h-4 w-4 text-orange-600' />
              <h3 className='font-serif text-xs font-bold text-stone-900'>
                Kịch bản chương ({filteredScriptRows.length} dòng)
              </h3>
              {selectedEntityName && (
                <span className='inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800'>
                  Lọc: {selectedEntityName}
                  <button
                    type='button'
                    onClick={() => setSelectedEntityName(null)}
                    className='text-orange-600 hover:text-orange-900'
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className='relative w-44'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400' />
              <input
                type='text'
                value={scriptSearch}
                onChange={(e) => setScriptSearch(e.target.value)}
                placeholder='Tìm kịch bản...'
                className='h-7 w-full rounded-lg border border-stone-200 bg-white pl-7 pr-2 text-xs text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none'
              />
            </div>
          </div>

          {/* Script Content List */}
          <div className='p-4 max-h-[calc(100vh-160px)] overflow-y-auto space-y-2 font-mono text-xs leading-relaxed'>
            {filteredScriptRows.length === 0 ? (
              <div className='py-12 text-center text-stone-400 text-xs'>
                <FileText className='mx-auto h-8 w-8 opacity-40 mb-2' />
                <span>Không có dòng kịch bản nào.</span>
              </div>
            ) : (
              filteredScriptRows.map((row, idx) => {
                if (row.type === 'page') {
                  return (
                    <div
                      key={row.key || `p-${idx}`}
                      className='mt-3 mb-1 border-b border-stone-800 pb-0.5 font-sans text-xs font-bold text-stone-900 uppercase tracking-widest'
                    >
                      {renderRow(row, DEFAULT_ROW_LABELS)}
                    </div>
                  );
                }

                if (row.type === 'panel') {
                  return (
                    <div
                      key={row.key || `pan-${idx}`}
                      className='mt-2 rounded bg-stone-100 px-2 py-0.5 font-sans text-[11px] font-bold text-stone-700'
                    >
                      {renderRow(row, DEFAULT_ROW_LABELS)}
                    </div>
                  );
                }

                if (row.type === 'Dialogue' || row.type === 'Thought') {
                  const isThought = row.type === 'Thought';
                  const isSpeakerSelected =
                    selectedEntityName && (row.label || '').toLowerCase().includes(selectedEntityName.toLowerCase());

                  return (
                    <div
                      key={row.key || `d-${idx}`}
                      className={`pl-5 pr-2 py-0.5 flex items-start gap-1.5 rounded transition-colors ${
                        isSpeakerSelected ? 'bg-orange-50/80 ring-1 ring-orange-200' : 'hover:bg-stone-50'
                      }`}
                    >
                      <button
                        type='button'
                        onClick={() => setSelectedEntityName(row.label || null)}
                        className='font-sans text-[11px] font-bold text-orange-800 shrink-0 uppercase tracking-wide hover:underline cursor-pointer'
                        title='Nhấp để lọc theo nhân vật này'
                      >
                        [{row.label || 'NHÂN VẬT'}
                        {isThought ? ' (nghĩ)' : ''}]:
                      </button>
                      <span className={`text-stone-900 ${isThought ? 'italic text-stone-700' : ''}`}>
                        {row.text}
                      </span>
                    </div>
                  );
                }

                if (row.type === 'Narration') {
                  return (
                    <div
                      key={row.key || `n-${idx}`}
                      className='my-1 border-l-2 border-amber-400 bg-amber-50/40 px-2.5 py-1 text-[11px] font-sans text-amber-950 italic'
                    >
                      <span className='font-bold not-italic mr-1.5 uppercase'>[DẪN]:</span>
                      {row.text}
                    </div>
                  );
                }

                if (row.type === 'Sfx') {
                  return (
                    <div
                      key={row.key || `sfx-${idx}`}
                      className='pl-4 py-0.5 text-[11px] font-sans font-bold text-rose-700'
                    >
                      ⚡ SFX: {row.text}
                    </div>
                  );
                }

                return (
                  <div key={row.key || `a-${idx}`} className='pl-3 text-[11px] font-sans text-stone-600'>
                    {row.text}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT COLUMN (COL 5/12): INSPECTOR & REFERENCE (ART BIBLE / CHECKLIST / COMMENTS) */}
        <section
          aria-label='Bảng đối chiếu và kiểm soát'
          className='lg:col-span-5 flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden sticky top-28'
        >
          {/* Inspector Tabs */}
          <div className='flex border-b border-stone-200 bg-[#FCFBF8] px-2'>
            <button
              type='button'
              onClick={() => setInspectorTab('bible')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                inspectorTab === 'bible'
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <Palette className='h-3.5 w-3.5' />
              <span>Art Bible ({totalEntities})</span>
            </button>

            <button
              type='button'
              onClick={() => setInspectorTab('checklist')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                inspectorTab === 'checklist'
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <CheckCircle2 className='h-3.5 w-3.5' />
              <span>Chốt Cổng (Gate 1 & 3)</span>
            </button>

            <button
              type='button'
              onClick={() => setInspectorTab('comments')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                inspectorTab === 'comments'
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <MessageSquare className='h-3.5 w-3.5' />
              <span>Góp ý ({openCommentsCount})</span>
            </button>

            <button
              type='button'
              onClick={() => setInspectorTab('tools')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                inspectorTab === 'tools'
                  ? 'border-[#EA580C] text-[#EA580C]'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <Layers className='h-3.5 w-3.5' />
              <span>Tiện ích</span>
            </button>
          </div>

          {/* INSPECTOR TAB 1: ART SERIES BIBLE CARDS */}
          {inspectorTab === 'bible' && (
            <div className='p-3 space-y-3 max-h-[calc(100vh-170px)] overflow-y-auto'>
              {/* Blocker alert if any */}
              {blockers.length > 0 && (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900 space-y-1.5'>
                  <div className='flex items-center gap-1.5 font-bold text-rose-800'>
                    <AlertTriangle className='h-4 w-4 shrink-0' />
                    <span>{blockers.length} thực thể chưa khoá Canon (Chặn Gate 1)</span>
                  </div>
                  <ul className='space-y-1 text-[11px] pl-5 list-disc'>
                    {blockers.map((b) => (
                      <li key={b.bibleEntryId}>
                        <strong>{b.entryName}</strong>: {b.reason || 'Chưa khoá Canon bản vẽ.'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bible Search & Filter */}
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1 text-[11px] font-bold'>
                  {['all', 'character', 'location'].map((c) => (
                    <button
                      key={c}
                      type='button'
                      onClick={() => setBibleCategory(c)}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        bibleCategory === c ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      {c === 'all' ? 'Tất cả' : c === 'character' ? 'Nhân vật' : 'Bối cảnh'}
                    </button>
                  ))}
                </div>

                <div className='relative flex-1'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400' />
                  <input
                    type='text'
                    value={bibleSearch}
                    onChange={(e) => setBibleSearch(e.target.value)}
                    placeholder='Tìm nhân vật...'
                    className='h-7 w-full rounded-lg border border-stone-200 bg-stone-50 pl-7 pr-2 text-xs focus:bg-white focus:outline-none'
                  />
                </div>
              </div>

              {/* Entity Cards */}
              {filteredCastEntities.length === 0 ? (
                <div className='py-8 text-center text-xs text-stone-400'>
                  Không có thực thể Bible nào khớp bộ lọc.
                </div>
              ) : (
                <div className='space-y-2'>
                  {filteredCastEntities.map((ent) => {
                    const isLocked = ent.isCanonLocked || ent.boundRevision?.isCanonLocked;
                    const isCrowd = Boolean(ent.isCrowd);
                    const isBlocker = blockers.some((b) => b.bibleEntryId === ent.bibleEntryId);
                    const isSelected = selectedEntityName === ent.name;

                    return (
                      <div
                        key={ent.bibleEntryId}
                        onClick={() => setSelectedEntityName(isSelected ? null : ent.name)}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-400 bg-orange-50/50 shadow-xs ring-1 ring-orange-300'
                            : isBlocker
                              ? 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/60'
                              : isLocked
                                ? 'border-stone-200 bg-white hover:bg-stone-50'
                                : 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/40'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className='h-12 w-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-100'>
                          {ent.boundRevision?.referenceImageUrl ? (
                            <AuthenticatedImage
                              src={ent.boundRevision.referenceImageUrl}
                              alt={ent.name}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='h-full w-full flex items-center justify-center text-stone-400'>
                              <Palette className='h-5 w-5 opacity-40' />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between gap-1'>
                            <span className='font-bold text-xs text-stone-900 truncate'>{ent.name}</span>
                            <span className='font-mono text-[9px] text-stone-400'>{ent.code}</span>
                          </div>

                          <div className='flex items-center gap-1.5 mt-0.5 text-[10px] text-stone-500'>
                            <span>{ent.boundRevision?.variantLabel || 'Bản vẽ mẫu'}</span>
                            <span>· {ent.mentions?.length || 0} lần</span>
                          </div>
                        </div>

                        {/* Status Tag */}
                        <div className='shrink-0'>
                          {isLocked ? (
                            <span className='inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200'>
                              <CheckCircle2 className='h-2.5 w-2.5' /> Locked
                            </span>
                          ) : isCrowd ? (
                            <span className='rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600'>
                              Quần chúng
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200'>
                              Chưa khóa
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INSPECTOR TAB 2: GATE 1 & GATE 3 CHECKLIST */}
          {inspectorTab === 'checklist' && (
            <div className='p-3 space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto text-xs'>
              {/* Gate 1 Card */}
              <div className='rounded-xl border border-stone-200 bg-white p-3 space-y-2.5 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-stone-900 flex items-center gap-1.5'>
                    <Play className='h-3.5 w-3.5 text-orange-600' /> Gate 1: Bắt đầu sản xuất
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                      isScriptFrozen
                        ? 'bg-purple-100 text-purple-800'
                        : isGatePassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isScriptFrozen ? 'ĐÃ QUA CỔNG' : isGatePassed ? 'SẴN SÀNG' : 'CHƯA ĐẠT'}
                  </span>
                </div>

                <div className='space-y-1.5 text-[11px] divide-y divide-stone-100'>
                  <div className='pt-1 flex items-center justify-between'>
                    <span>1. Writer đã nộp kịch bản</span>
                    <span className={isInReview || isScriptFrozen ? 'text-emerald-700 font-bold' : 'text-stone-400'}>
                      {isInReview || isScriptFrozen ? '✓ Đã nộp' : 'Chưa nộp'}
                    </span>
                  </div>
                  <div className='pt-1 flex items-center justify-between'>
                    <span>2. Tất cả Bible đã khoá Canon</span>
                    <span className={isGatePassed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {isGatePassed ? `✓ ${totalEntities} mục đạt` : `Chặn (${blockers.length})`}
                    </span>
                  </div>
                  <div className='pt-1 flex items-center justify-between'>
                    <span>3. Góp ý kịch bản</span>
                    <span className={openCommentsCount === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {openCommentsCount === 0 ? '✓ Sạch góp ý' : `Còn ${openCommentsCount}`}
                    </span>
                  </div>
                </div>

                {!isScriptFrozen && (
                  <button
                    type='button'
                    onClick={() => setStartProductionOpen(true)}
                    className='w-full rounded-lg bg-[#EA580C] py-2 text-xs font-bold text-white hover:bg-[#C2410C]'
                  >
                    Chốt duyệt & Bắt đầu sản xuất
                  </button>
                )}
              </div>

              {/* Gate 3 Card */}
              <div className='rounded-xl border border-stone-200 bg-white p-3 space-y-2.5 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-stone-900 flex items-center gap-1.5'>
                    <Lock className='h-3.5 w-3.5 text-emerald-600' /> Gate 3: Khóa duyệt chương
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                      lockGate?.canApprove ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {lockGate?.canApprove ? 'ĐỦ ĐIỀU KIỆN' : 'CHƯA ĐẠT'}
                  </span>
                </div>

                {!lockGate ? (
                  <p className='text-stone-400 text-center py-2'>Đang nạp Lock Gate...</p>
                ) : (
                  <div className='space-y-1.5 text-[11px] divide-y divide-stone-100'>
                    {lockGate.items.map((it, idx) => (
                      <div key={idx} className='pt-1 flex items-center justify-between gap-2'>
                        <span className='truncate'>{it.message}</span>
                        {it.blocking ? (
                          <span className='text-rose-700 font-bold shrink-0'>Chặn ({it.count})</span>
                        ) : (
                          <span className='text-emerald-700 font-bold shrink-0'>✓ Đạt</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {lockGate?.canApprove && chapter?.status === 'InProduction' && (
                  <button
                    type='button'
                    onClick={async () => {
                      try {
                        await chapterService.approveChapter(chapter.id);
                        onShowToast?.('Đã duyệt Gate 3', `Chương ${chapter.chapterNumber}`);
                        await loadChapterDetails(chapter.id);
                        await loadSeriesAndChapters();
                      } catch (err: any) {
                        onShowToast?.('Lỗi duyệt', err?.message || 'Không thể duyệt chương.');
                      }
                    }}
                    className='w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700'
                  >
                    Duyệt Hoàn Tất Chương
                  </button>
                )}
              </div>
            </div>
          )}

          {/* INSPECTOR TAB 3: COMMENTS */}
          {inspectorTab === 'comments' && (
            <div className='p-3 space-y-2.5 max-h-[calc(100vh-170px)] overflow-y-auto text-xs'>
              {comments.length === 0 ? (
                <div className='py-8 text-center text-stone-400 text-xs'>
                  Chưa có góp ý nào cho kịch bản.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-2.5 space-y-1 ${
                      c.resolvedAt ? 'border-stone-200 bg-stone-50 opacity-70' : 'border-orange-200 bg-orange-50/30'
                    }`}
                  >
                    <div className='flex items-center justify-between text-[10px] text-stone-500'>
                      <span className='font-bold text-stone-700'>{c.authorName || 'Biên tập viên'}</span>
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    {c.quotedText && (
                      <blockquote className='border-l-2 border-stone-300 pl-2 text-[10px] italic text-stone-600 line-clamp-2'>
                        &quot;{c.quotedText}&quot;
                      </blockquote>
                    )}
                    <p className='text-stone-800 leading-snug'>{c.body}</p>
                    <div className='flex items-center justify-between pt-1 text-[10px]'>
                      <span className={c.resolvedAt ? 'text-emerald-700 font-bold' : 'text-orange-700 font-bold'}>
                        {c.resolvedAt ? '✓ Đã xong' : '● Chưa xử lý'}
                      </span>
                      {!c.resolvedAt && (
                        <button
                          type='button'
                          onClick={async () => {
                            try {
                              await chapterService.resolveScriptComment(chapter?.id || '', c.id);
                              setComments((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, resolvedAt: new Date().toISOString() } : x)),
                              );
                              onShowToast?.('Góp ý', 'Đã đánh dấu xong.');
                            } catch (err: any) {
                              onShowToast?.('Lỗi', err?.message || 'Không thể cập nhật.');
                            }
                          }}
                          className='font-bold text-orange-700 hover:underline'
                        >
                          Xong
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* INSPECTOR TAB 4: TOOLS & EXTENSIONS */}
          {inspectorTab === 'tools' && (
            <div className='p-3 space-y-2 max-h-[calc(100vh-170px)] overflow-y-auto text-xs'>
              <button
                type='button'
                onClick={() => setAssignmentsOpen(true)}
                className='flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-3 hover:bg-stone-50 text-left'
              >
                <div className='flex items-center gap-2'>
                  <UserCheck className='h-4 w-4 text-orange-600' />
                  <span className='font-bold text-stone-800'>Lưới Giao Việc V3</span>
                </div>
                <span className='text-stone-400'>↗</span>
              </button>

              <button
                type='button'
                onClick={() => setEditionsOpen(true)}
                className='flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-3 hover:bg-stone-50 text-left'
              >
                <div className='flex items-center gap-2'>
                  <Globe className='h-4 w-4 text-purple-600' />
                  <span className='font-bold text-stone-800'>Ấn Bản Ngôn Ngữ</span>
                </div>
                <span className='text-stone-400'>↗</span>
              </button>

              <button
                type='button'
                onClick={() => setProvenanceOpen(true)}
                className='flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-3 hover:bg-stone-50 text-left'
              >
                <div className='flex items-center gap-2'>
                  <History className='h-4 w-4 text-sky-600' />
                  <span className='font-bold text-stone-800'>Bản Chụp & Xuất Xứ</span>
                </div>
                <span className='text-stone-400'>↗</span>
              </button>

              <button
                type='button'
                onClick={() => setPreviewLinksOpen(true)}
                className='flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-3 hover:bg-stone-50 text-left'
              >
                <div className='flex items-center gap-2'>
                  <Share2 className='h-4 w-4 text-emerald-600' />
                  <span className='font-bold text-stone-800'>Link Xem Thử</span>
                </div>
                <span className='text-stone-400'>↗</span>
              </button>

              {/* Upload cover */}
              <div className='rounded-xl border border-stone-200 bg-white p-3 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-stone-800'>Ảnh bìa chương</span>
                  {chapter?.coverUrl && <span className='text-[10px] text-emerald-700 font-bold'>Đã có bìa</span>}
                </div>
                <label className='block w-full cursor-pointer rounded-lg border border-stone-200 bg-stone-50 py-1.5 text-center text-[11px] font-bold text-stone-700 hover:bg-stone-100'>
                  <span>Đổi ảnh bìa</span>
                  <input
                    type='file'
                    accept='image/png,image/jpeg,image/webp'
                    className='hidden'
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !chapter) return;
                      try {
                        const newUrl = await chapterService.uploadChapterCover(chapter.id, file);
                        setChapter((prev) => (prev ? { ...prev, coverUrl: newUrl } : null));
                        onShowToast?.('Thành công', 'Đã cập nhật ảnh bìa.');
                      } catch (err: any) {
                        onShowToast?.('Lỗi tải bìa', err?.message || 'Không thể tải ảnh bìa.');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── CREATE CHAPTER MODAL ── */}
      {createChapterOpen && (
        <Modal isOpen title='Tạo Chương Mới' onClose={() => setCreateChapterOpen(false)}>
          <form onSubmit={handleCreateChapterSubmit} className='space-y-3 text-xs'>
            <div>
              <label className='block font-bold text-stone-700'>Số chương *</label>
              <input
                type='number'
                step='0.1'
                required
                value={formChapterNumber}
                onChange={(e) => setFormChapterNumber(parseFloat(e.target.value) || 1)}
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 font-bold text-stone-900 focus:outline-none'
              />
            </div>

            <div>
              <label className='block font-bold text-stone-700'>Tiêu đề (Tùy chọn)</label>
              <input
                type='text'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder='vd: Khởi đầu mới'
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div>
              <label className='block font-bold text-stone-700'>Ngày phát hành mục tiêu</label>
              <input
                type='date'
                value={formTargetReleaseDate}
                onChange={(e) => setFormTargetReleaseDate(e.target.value)}
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div>
              <label className='block font-bold text-stone-700'>Đề cương tóm tắt</label>
              <textarea
                value={formOutline}
                onChange={(e) => setFormOutline(e.target.value)}
                rows={3}
                placeholder='Tóm tắt ngắn gọn cốt truyện...'
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setCreateChapterOpen(false)}
                className='rounded-lg border border-stone-200 px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={actionBusy}
                className='rounded-lg bg-[#EA580C] px-4 py-1.5 font-bold text-white hover:bg-[#C2410C] disabled:opacity-50'
              >
                {actionBusy ? 'Đang tạo...' : 'Tạo Chương'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── EDIT CHAPTER MODAL ── */}
      {editChapterOpen && chapter && (
        <Modal
          isOpen
          title={`Sửa Chương ${chapter.chapterNumber}`}
          onClose={() => setEditChapterOpen(false)}
        >
          <form onSubmit={handleEditChapterSubmit} className='space-y-3 text-xs'>
            <div>
              <label className='block font-bold text-stone-700'>Tiêu đề</label>
              <input
                type='text'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div>
              <label className='block font-bold text-stone-700'>Ngày phát hành mục tiêu</label>
              <input
                type='date'
                value={formTargetReleaseDate}
                onChange={(e) => setFormTargetReleaseDate(e.target.value)}
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div>
              <label className='block font-bold text-stone-700'>Đề cương tóm tắt</label>
              <textarea
                value={formOutline}
                onChange={(e) => setFormOutline(e.target.value)}
                rows={3}
                className='mt-1 w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-900 focus:outline-none'
              />
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setEditChapterOpen(false)}
                className='rounded-lg border border-stone-200 px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={actionBusy}
                className='rounded-lg bg-[#EA580C] px-4 py-1.5 font-bold text-white hover:bg-[#C2410C] disabled:opacity-50'
              >
                {actionBusy ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── GATE 1 START PRODUCTION MODAL ── */}
      {startProductionOpen && chapter && (
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
              'Gate 1 thành công',
              `Chương ${chapter.chapterNumber} đã bước vào InProduction. Kịch bản đã đóng băng.`,
            );
            void loadChapterDetails(chapter.id);
            void loadSeriesAndChapters();
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* ── SATELLITE MODALS ── */}
      {assignmentsOpen && chapter && (
        <ChapterAssignmentsModal
          isOpen
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={chapter.id}
          chapterNumber={chapter.chapterNumber}
          chapterTitle={chapter.title || undefined}
          onClose={() => setAssignmentsOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {editionsOpen && chapter && (
        <ChapterEditionsModal
          isOpen
          chapter={chapter}
          onClose={() => setEditionsOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {provenanceOpen && chapter && (
        <ChapterProvenanceModal
          seriesId={seriesId}
          chapterId={chapter.id}
          chapterNumber={chapter.chapterNumber}
          chapterTitle={chapter.title}
          viewerRole={workspaceRole}
          onClose={() => setProvenanceOpen(false)}
        />
      )}

      {previewLinksOpen && chapter && (
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

      {/* Delete / Archive Confirmation Modal (V2.6 D3) */}
      {deleteTargetChapter && (
        <TypeToConfirmModal
          isOpen
          title={
            deleteTargetChapter.status === 'PreProduction' &&
            (!deleteTargetChapter.pagesCount || deleteTargetChapter.pagesCount === 0)
              ? `Xóa Chương ${deleteTargetChapter.chapterNumber}`
              : `Lưu Trữ Chương ${deleteTargetChapter.chapterNumber}`
          }
          message={
            deleteTargetChapter.status === 'PreProduction' &&
            (!deleteTargetChapter.pagesCount || deleteTargetChapter.pagesCount === 0)
              ? `Chương rỗng. Nhập "DELETE" để xóa vĩnh viễn:`
              : `Chương đã có dữ liệu. Nhập "DELETE" để lưu trữ (Archive):`
          }
          expectedInput='DELETE'
          confirmLabel={
            deleteTargetChapter.status === 'PreProduction' &&
            (!deleteTargetChapter.pagesCount || deleteTargetChapter.pagesCount === 0)
              ? 'Xóa'
              : 'Lưu trữ'
          }
          onConfirm={handleDeleteOrArchiveChapter}
          onCancel={() => setDeleteTargetChapter(null)}
          loading={isDeleting}
        />
      )}
    </div>
  );
};

export default ProducerChapterManagementView;