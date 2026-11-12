import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  BookOpen,
  User,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Clapperboard,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldCheck,
  Compass,
  Save,
  Info,
  GripVertical,
  History,
  ArrowRight,
  Search,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  Check,
  Lock,
  LayoutTemplate,
  Film,
  AlertCircle,
  Send,
  ClipboardList,
} from 'lucide-react';
import {
  scriptLineService,
  SceneDto,
  SceneDetailDto,
  SceneScriptLineSummaryDto,
  CreateScriptLineRequest,
  UpdateScriptLineRequest,
  CreateSceneRequest,
  UpdateSceneRequest,
  NarrationMode,
} from '@/services/scriptLine.service';
import { chapterService, ChapterDto, ChapterBibleGateResultDto, CreateChapterRequest } from '@/services/chapter.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { PanelDto } from '@/types/pipeline';
import { generateTempCode, saveTempBibleCode } from '../components/script/flow/tempBibleCodes';
import { ChapterSelectionView } from '../components/script/chapter-selection';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import {
  assignmentService,
  AssignmentDto,
  ChangeRequestDto,
  ConsistencyFindingDto,
  ConsistencyCheckResultDto,
} from '@/services/assignment.service';
import { crStatus } from '@/roles/editor/views/script-review/scriptReviewModel';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import { normalizeWorkspaceRole } from '@/types/auth';
import { AiAssistPanel } from '@/shared/features/ai-agents/AiAssistPanel';
import { ScriptHistoryModal } from '../components/script/ScriptHistoryModal';
import { ScriptLineItem } from '../components/script/ScriptLineItem';
import { NarrativeContextDrawer } from '../components/script/NarrativeContextDrawer';
import { ConsistencyFindingsDrawer } from '../components/script/ConsistencyFindingsDrawer';
import { ScreenplayFlowEditor } from '../components/script/flow/ScreenplayFlowEditor';
import { ExtractedScriptLinePayload } from '../components/script/flow/scriptFlowAdapter';
import { BibleCharactersDrawer } from '../components/script/BibleCharactersDrawer';
import { WriterChangeRequestsDrawer } from '../components/script/WriterChangeRequestsDrawer';
import { ScriptStudioRail, type ScriptRailItem } from '../components/script/ScriptStudioRail';
import { ScriptScenesDrawer } from '../components/script/ScriptScenesDrawer';
import { useFocusHeaderContext } from '@/app/FocusWorkspaceLayout';
import { FileInput } from 'lucide-react';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { saveDraft, clearDraft, readRestorableDraft, type LocalDraft } from '@/lib/localDraft';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';
import { UnsavedChangesBar, LucianConfirmModal, TypeToConfirmModal } from '@/shared/components/lucian';
import { useTranslation } from '@/lib/i18n';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useComicStudioStore } from '../components/script/thumbnail-studio/store/useComicStudioStore';
import { scenesToComicScriptText } from '../components/script/thumbnail-studio/lib/comicScriptParser';

interface ScriptEditorViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
  currentUserId?: string | null;
}

import { formatChapterOption } from '../utils/chapterFormat';

/**
 * Trả về tên kèm giai đoạn (stageName) hoặc phụ đề (subtitle) để phân biệt các phiên bản nhân vật.
 */
const getBibleEntryNameWithStage = (entry?: BibleEntryDto | null): string => {
  if (!entry) return '';
  const stage = entry.effectiveRevision?.stageName?.trim() || entry.subtitle?.trim();
  return stage ? `${entry.name} (${stage})` : entry.name;
};

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  onShowToast,
  workspaceRole,
  currentUserId,
}) => {
  const { t } = useTranslation('production');
  const confirm = useConfirm();
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const navigate = useNavigate();
  const [chapterPages, setChapterPages] = useState<PageDto[]>([]);
  const [chapterPanels, setChapterPanels] = useState<PanelDto[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  const sceneIdFromUrl = searchParams.get('sceneId');

  // Phân quyền Zero-Trust RBAC:
  // - Producer: Có toàn quyền quản lý chương (khởi tạo chương, xoá chương, đóng băng/mở lại) và viết kịch bản.
  // - Writer: Soạn thảo kịch bản, chỉnh sửa outline/story arc, nhưng TUYỆT ĐỐI KHÔNG ĐƯỢC tạo chương mới hoặc xoá chương.
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const effectiveRole = normRole || (typeof window !== 'undefined' ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole')) : null);
  const isProducer = effectiveRole === 'PRODUCER';
  const canCreateChapter = isProducer;

  // Xác định ID người dùng hiện tại (từ prop, localStorage hoặc JWT)
  const [selfUserId, setSelfUserId] = useState<string | null>(() => {
    if (currentUserId) return currentUserId;
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u?.id) return u.id;
        if (u?.userId) return u.userId;
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (currentUserId) setSelfUserId(currentUserId);
  }, [currentUserId]);

  const effectiveUserId = currentUserId || selfUserId;

  // Dữ liệu kịch bản
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterDto | null>(null);
  const isScriptFrozen = currentChapter?.isScriptFrozen === true;
  const isChapterLocked =
    isScriptFrozen ||
    currentChapter?.status === 'Approved' ||
    currentChapter?.status === 'Published';
  const [characters, setCharacters] = useState<BibleEntryDto[]>([]);
  const [allBibleEntries, setAllBibleEntries] = useState<BibleEntryDto[]>([]);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);

  // Phân quyền theo Assignment (Backend ScriptLineRules.cs):
  // - Producer luôn có quyền sửa kịch bản.
  // - Khi chương đã giao kịch bản cho Writer: chỉ người được giao mới sửa được; Writer khác nhận 403 / chỉ đọc.
  // - Khi chương chưa giao cho ai: Writer vẫn sửa tự do như cũ.
  // - Assignment đã huỷ (cancelReason != null) không tính.
  // - Các vai trò khác (Artist, Editor, Viewer...): chỉ đọc.

  const writerAssignments = useMemo(() => {
    return chapterAssignments.filter((a) => {
      const role = String(a.assignedRole || '').toUpperCase();
      const isWriter = role === 'WRITER';
      const isCancelled = !!(a as any).cancelReason;
      return isWriter && !isCancelled;
    });
  }, [chapterAssignments]);

  const hasWriterAssignment = writerAssignments.length > 0;

  const isAssignedWriter = useMemo(() => {
    if (!effectiveUserId || !hasWriterAssignment) return false;
    return writerAssignments.some(
      (a) => String(a.assigneeUserId).toLowerCase() === String(effectiveUserId).toLowerCase(),
    );
  }, [effectiveUserId, hasWriterAssignment, writerAssignments]);

  const isWriterBlockedByOther = useMemo(() => {
    if (effectiveRole !== 'WRITER') return false;
    if (!hasWriterAssignment) return false;
    return !isAssignedWriter;
  }, [effectiveRole, hasWriterAssignment, isAssignedWriter]);

  const assignedWriterNames = useMemo(() => {
    if (!writerAssignments.length) return '';
    const names = writerAssignments.map((a) => {
      const member = workspaceMembers.find(
        (m) => String(m.userId).toLowerCase() === String(a.assigneeUserId).toLowerCase(),
      );
      return member?.fullName || member?.email || 'Writer được giao';
    });
    return Array.from(new Set(names)).join(', ');
  }, [writerAssignments, workspaceMembers]);

  const myWriterAssignment = useMemo(() => {
    if (!writerAssignments.length) return null;
    if (effectiveUserId) {
      const match = writerAssignments.find(
        (a) => String(a.assigneeUserId).toLowerCase() === String(effectiveUserId).toLowerCase(),
      );
      if (match) return match;
    }
    return writerAssignments[0] || null;
  }, [writerAssignments, effectiveUserId]);

  // Yêu cầu sửa Editor gửi khi trả kịch bản; BE chặn nộp lại khi còn CR Open.
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [loadingChangeRequests, setLoadingChangeRequests] = useState(false);
  const autoOpenedCrForRef = useRef<string | null>(null);
  const writerAssignmentChapterId = myWriterAssignment?.chapterId;
  const writerAssignmentId = myWriterAssignment?.id;
  const writerAssignmentStatus = myWriterAssignment?.status;

  const loadChangeRequests = useCallback(async () => {
    if (!writerAssignmentChapterId || !writerAssignmentId) {
      setChangeRequests([]);
      return;
    }
    setLoadingChangeRequests(true);
    try {
      const res = await assignmentService.getChangeRequests(writerAssignmentChapterId, {
        assignmentId: writerAssignmentId,
      });
      setChangeRequests(res);
    } finally {
      setLoadingChangeRequests(false);
    }
  }, [writerAssignmentChapterId, writerAssignmentId]);

  useEffect(() => {
    void loadChangeRequests();
  }, [loadChangeRequests, writerAssignmentStatus]);

  const openChangeRequestCount = useMemo(
    () => changeRequests.filter((c) => crStatus(c.status) === 'Open').length,
    [changeRequests],
  );

  const [submittingToEditor, setSubmittingToEditor] = useState(false);

  const canEditScript = useMemo(() => {
    if (!effectiveRole) return !isWriterBlockedByOther;
    if (effectiveRole === 'PRODUCER') return true;
    if (effectiveRole === 'WRITER') {
      return !hasWriterAssignment || isAssignedWriter;
    }
    return false;
  }, [effectiveRole, hasWriterAssignment, isAssignedWriter, isWriterBlockedByOther]);

  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneDetailDto | null>(null);
  const [chapterScenesDetail, setChapterScenesDetail] = useState<SceneDetailDto[]>([]);

  // Trạng thái tải & lỗi
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Trạng thái xoá Phân cảnh & Chương (Lucian #269 Modals)
  const [sceneToDelete, setSceneToDelete] = useState<any>(null);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<ChapterDto | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  // Điều hướng phân cảnh (collapsible)
  const [isSceneNavOpen, setIsSceneNavOpen] = useState(true);
  const [sceneSearchQuery, setSceneSearchQuery] = useState('');

  // Modals
  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [isEditingScene, setIsEditingScene] = useState(false);
  const [sceneNumberInput, setSceneNumberInput] = useState<number>(1);
  const [sceneHeadingInput, setSceneHeadingInput] = useState<string>('');
  const [sceneSummaryInput, setSceneSummaryInput] = useState<string>('');
  const [sceneDefaultNarrationMode, setSceneDefaultNarrationMode] =
    useState<NarrationMode>('Present');

  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SceneScriptLineSummaryDto | null>(null);
  const [lineSpeakerId, setLineSpeakerId] = useState<string>('');
  const [lineDialogue, setLineDialogue] = useState<string>('');
  const [lineStageDirection, setLineStageDirection] = useState<string>('');
  const [lineOrderInput, setLineOrderInput] = useState<number>(1);
  const [lineBibleEntryIds, setLineBibleEntryIds] = useState<string[]>([]);
  const [lineNarrationMode, setLineNarrationMode] = useState<NarrationMode>('Present');

  // Story Arc (Series) & Outline (Chapter)
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [storyArcInput, setStoryArcInput] = useState<string>('');
  const [outlineInput, setOutlineInput] = useState<string>('');
  const [savingStoryArc, setSavingStoryArc] = useState<boolean>(false);
  const [savingOutline, setSavingOutline] = useState<boolean>(false);

  // Kiểm tra nhất quán (Consistency Check)
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [loadingConsistency, setLoadingConsistency] = useState<boolean>(false);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckResultDto | null>(
    null,
  );
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);

  // Banner & Modal xung đột phiên bản (BR-11 / 409 CONFLICT)
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictErrorMsg, setConflictErrorMsg] = useState<string | undefined>(undefined);
  const [conflictEntityId, setConflictEntityId] = useState<string | undefined>(undefined);

  // Lắng nghe sự kiện xung đột từ hàng đợi offline (BR-11 / NFR-09)
  useEffect(() => {
    const handleOfflineConflict = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setConflictEntityId(detail.item?.clientRefId);
        setConflictErrorMsg(
          detail.message || 'Xung đột phiên bản kịch bản khi đồng bộ ngoại tuyến (409 Conflict).',
        );
        setConflictModalOpen(true);
      }
    };
    window.addEventListener('panelforge:offline_conflict', handleOfflineConflict);
    return () => {
      window.removeEventListener('panelforge:offline_conflict', handleOfflineConflict);
    };
  }, []);

  // Side Drawer phụ (Đề cương, Nhất quán, Nhân vật Bible)
  const isTestEnvironment =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' ||
      typeof (globalThis as any).__vitest_worker__ !== 'undefined');

  // Mặc định mở side drawer phù hợp môi trường
  const [activeSideDrawer, setActiveSideDrawer] = useState<
    'scenes' | 'narrative' | 'consistency' | 'characters' | 'changeRequests' | null
  >(null);
  const [importRequestKey, setImportRequestKey] = useState(0);

  // Modals phụ trợ
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [storyboardPanelOpen, setStoryboardPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // V2.5: Chapter-Scoped Bible Gate & Script Freeze Gate
  const [bibleGateResult, setBibleGateResult] = useState<ChapterBibleGateResultDto | null>(null);
  const [loadingBibleGate, setLoadingBibleGate] = useState(false);
  const [freezingScript, setFreezingScript] = useState(false);
  const [bibleGateModalOpen, setBibleGateModalOpen] = useState(false);

  // V2.5: Chế độ soạn thảo kịch bản kép (Dual-Mode: Screenplay Flow làm mặc định + Card Mode làm tùy chọn xem cấu trúc)
  const [editorMode, setEditorMode] = useState<'flow' | 'cards'>(
    isTestEnvironment ? 'cards' : 'flow',
  );

  const notify = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) {
        onShowToast(title, desc);
      }
    },
    [onShowToast],
  );

  const checkChapterBibleGate = useCallback(async (chapId: string) => {
    setLoadingBibleGate(true);
    try {
      const res = await chapterService.checkBibleGate(chapId);
      setBibleGateResult(res);
    } catch {
      setBibleGateResult(null);
    } finally {
      setLoadingBibleGate(false);
    }
  }, []);

  // Theo dõi trạng thái chưa lưu (dirty checking)
  const isStoryArcDirty = useMemo(
    () => storyArcInput.trim() !== (seriesDetail?.storyArc || '').trim(),
    [storyArcInput, seriesDetail?.storyArc],
  );

  const isOutlineDirty = useMemo(
    () => outlineInput.trim() !== (currentChapter?.outline || '').trim(),
    [outlineInput, currentChapter?.outline],
  );

  const hasUnsavedChanges = isStoryArcDirty || isOutlineDirty;
  const [barWarn, setBarWarn] = useState(false);

  // Bản nháp cục bộ: lưu chữ đang gõ (debounce 1s) để không mất khi hết phiên / rớt mạng / đóng tab.
  const storyArcDraftKey = seriesId ? `storyArc.${seriesId}` : null;
  const outlineDraftKey = currentChapter?.id ? `outline.${currentChapter.id}` : null;
  const [restorable, setRestorable] = useState<{ storyArc?: LocalDraft; outline?: LocalDraft }>({});

  useEffect(() => {
    if (!storyArcDraftKey || !isStoryArcDirty) return;
    const t = setTimeout(() => {
      saveDraft(storyArcDraftKey, storyArcInput);
      setRestorable((p) => ({ ...p, storyArc: undefined }));
    }, 1000);
    return () => clearTimeout(t);
  }, [storyArcDraftKey, isStoryArcDirty, storyArcInput]);

  useEffect(() => {
    // Cleanup huỷ timer khi đổi chương, nên chữ của chương cũ không bị ghi vào khoá chương mới.
    if (!outlineDraftKey || !isOutlineDirty) return;
    const t = setTimeout(() => {
      saveDraft(outlineDraftKey, outlineInput);
      setRestorable((p) => ({ ...p, outline: undefined }));
    }, 1000);
    return () => clearTimeout(t);
  }, [outlineDraftKey, isOutlineDirty, outlineInput]);

  // Khi dữ liệu server đã tải: nếu còn bản nháp khác bản đã lưu thì đề nghị khôi phục.
  const seriesLoaded = !!seriesDetail;
  useEffect(() => {
    if (!storyArcDraftKey || !seriesLoaded || !canEditScript) return;
    const d = readRestorableDraft(storyArcDraftKey, seriesDetail?.storyArc);
    setRestorable((p) => ({ ...p, storyArc: d ?? undefined }));
  }, [storyArcDraftKey, seriesLoaded, seriesDetail?.storyArc, canEditScript]);

  useEffect(() => {
    if (!outlineDraftKey || !canEditScript) return;
    const d = readRestorableDraft(outlineDraftKey, currentChapter?.outline);
    setRestorable((p) => ({ ...p, outline: d ?? undefined }));
  }, [outlineDraftKey, currentChapter?.outline, canEditScript]);

  // Bảo vệ thay đổi chưa lưu khi đóng hoặc tải lại trang
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 1. Tải danh sách Chapters, Series Bible và Series Details
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);
    setLoadError(null);

    Promise.all([
      chapterService.getChaptersBySeries(seriesId, 1, 50),
      bibleService.getSeriesBible(seriesId).catch(() => null),
      seriesService.getSeriesById(seriesId).catch(() => null),
    ])
      .then(([chapRes, bibleRes, seriesRes]) => {
        if (!isMounted) return;
        const chapterList = Array.isArray(chapRes) ? chapRes : (chapRes?.items || []);
        setChapters(chapterList);

        if (seriesRes) {
          setSeriesDetail(seriesRes);
          setStoryArcInput(seriesRes.storyArc || '');
        }

        if (bibleRes && bibleRes.entries) {
          setAllBibleEntries(bibleRes.entries);
          const charList = bibleRes.entries.filter(
            (e) => String(e.category) === 'Character' || e.category === 0,
          );
          setCharacters(charList);
        }

        if (chapterList.length > 0) {
          const matched = chapterList.find((c) => c.id === chapterIdFromUrl);
          if (matched) {
            setCurrentChapter(matched);
            setOutlineInput(matched.outline || '');
          } else {
            // Không có chapterId trong URL -> Hiển thị màn hình chọn chương để Writer/Producer chọn
            setCurrentChapter(null);
          }
        } else {
          // Chưa có chương nào -> Hiển thị màn hình chọn chương (Producer tạo hoặc Writer chờ)
          setCurrentChapter(null);
        }
      })
      .catch((err) => {
        console.error('Lỗi nạp thông tin chương và Bible:', err);
        if (isMounted) setLoadError(err.message || 'Không thể nạp thông tin chương.');
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [seriesId, chapterIdFromUrl]);

  // Đảm bảo lấy đúng chương khi URL query chapterId thay đổi
  useEffect(() => {
    if (!chapters || chapters.length === 0) return;
    if (!chapterIdFromUrl) {
      if (currentChapter !== null) {
        setCurrentChapter(null);
      }
      return;
    }
    if (currentChapter?.id !== chapterIdFromUrl) {
      const found = chapters.find((c) => c.id === chapterIdFromUrl);
      if (found) {
        setCurrentChapter(found);
        setOutlineInput(found.outline || '');
      } else {
        setCurrentChapter(null);
      }
    }
  }, [chapterIdFromUrl, chapters, currentChapter?.id]);

  // Tải danh sách thành viên workspace để hiển thị tên Writer được phân công (nếu có)
  const effectiveWsId = workspaceId || seriesDetail?.workspaceId;
  useEffect(() => {
    if (!effectiveWsId) return;
    workspaceService
      .getMembers(effectiveWsId)
      .then((mems) => setWorkspaceMembers(mems || []))
      .catch(() => setWorkspaceMembers([]));
  }, [effectiveWsId]);

  // Đồng bộ Outline, findings nhất quán và danh sách Assignment khi currentChapter thay đổi
  useEffect(() => {
    if (!currentChapter?.id) {
      setOutlineInput('');
      setFindings([]);
      setChapterAssignments([]);
      return;
    }
    // Xoá ngay findings cũ để tránh hiển thị kết quả của chương trước khi chuyển chương
    setFindings([]);
    setOutlineInput(currentChapter.outline || '');

    assignmentService
      .getConsistencyFindings(currentChapter.id)
      .then((res) => {
        setFindings(res || []);
      })
      .catch(() => {
        setFindings([]);
      });

    assignmentService
      .getAssignments(currentChapter.id)
      .then((res) => {
        setChapterAssignments(res || []);
      })
      .catch(() => {
        setChapterAssignments([]);
      });

    void checkChapterBibleGate(currentChapter.id);
  }, [currentChapter?.id, currentChapter?.outline, checkChapterBibleGate]);

  // 2. Nạp chi tiết Chapter (cập nhật versionVector) & cập nhật lại phân công
  const refreshChapterDetail = useCallback(async (chapId: string) => {
    try {
      const detail = await chapterService.getChapterById(chapId);
      setCurrentChapter((prev) => (prev ? { ...prev, ...detail } : detail));
      const assignments = await assignmentService.getAssignments(chapId);
      setChapterAssignments(assignments || []);
    } catch (err) {
      console.error('Lỗi refresh chi tiết chương:', err);
    }
  }, []);

  // 3. Tải chi tiết Scene kèm danh sách dòng kịch bản
  const loadSceneDetail = useCallback(
    async (sceneId: string) => {
      setLoadingDetail(true);
      try {
        const detail = await scriptLineService.getSceneById(sceneId);
        setSelectedScene(detail);
        setChapterScenesDetail((prev) => {
          const idx = prev.findIndex((s) => s.id === detail.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = detail;
            return next;
          }
          return [...prev, detail];
        });
      } catch (err: any) {
        console.error('Lỗi nạp chi tiết phân cảnh:', err);
        notify('Lỗi nạp phân cảnh', err.message || 'Không thể nạp chi tiết phân cảnh');
      } finally {
        setLoadingDetail(false);
      }
    },
    [notify],
  );

  // 4. Tải danh sách Scenes khi currentChapter thay đổi
  // V2.5: Đồng bộ kịch bản từ Screenplay Flow Editor (TipTap) lên Backend khi bấm Lưu (Explicit Commit)
  const handleSaveFlowLines = useCallback(
    async (extractedLines: ExtractedScriptLinePayload[]) => {
      if (!currentChapter) return;

      // 1. Xác định ngữ cảnh phân cảnh
      const allScenes =
        chapterScenesDetail.length > 0 ? chapterScenesDetail : selectedScene ? [selectedScene] : [];
      let activeScene = selectedScene || allScenes[0] || null;

      if (!activeScene) {
        if (scenes.length > 0) {
          try {
            activeScene = await scriptLineService.getSceneById(scenes[0].id);
          } catch {
            activeScene = null;
          }
        } else if (canEditScript && !isChapterLocked) {
          try {
            const created = await scriptLineService.createScene(currentChapter.id, {
              sceneNumber: 1,
              heading: 'CẢNH 1: MỞ ĐẦU',
              summary: null,
              defaultNarrationMode: 'Present',
            });
            setScenes([created]);
            activeScene = await scriptLineService.getSceneById(created.id);
          } catch {
            activeScene = null;
          }
        }
      }

      if (!activeScene) return;

      // 2. Theo dõi version tuần tự (Sequential Concurrency Tracker) để tránh bẫy 409 Conflict
      let currentVersion = currentChapter.versionVector ?? 0;
      let hasChanges = false;

      // 1b. Nhận diện, cập nhật hoặc tự động tạo mới các Phân cảnh (Auto-Extract Multi-Scenes from Continuous Doc)
      const headingBlocks = extractedLines.filter((l) => l.blockType === 'scene_heading');
      const sceneIdMap = new Map<string, string>(); // Ánh xạ từ ID tạm (scene_num_X) sang Backend GUID
      let currentScenesList = [...scenes];

      // Nếu không có khối scene_heading nào nhưng có activeScene, map mặc định
      if (headingBlocks.length === 0 && activeScene) {
        sceneIdMap.set(activeScene.id, activeScene.id);
      }

      for (let i = 0; i < headingBlocks.length; i++) {
        const hb = headingBlocks[i];
        const rawHeadingText = hb.stageDirection?.trim() || '';

        // Phân tích số cảnh: "CẢNH 2: TIÊU ĐỀ", "SCENE 2: TIÊU ĐỀ", "#cảnh 2", v.v.
        const numMatch = rawHeadingText.match(/(?:CẢNH|SCENE)\s*(\d+)/i);
        const parsedSceneNum = numMatch ? parseInt(numMatch[1], 10) : i + 1;

        // Phân tích tiêu đề cảnh
        const headingMatch = rawHeadingText.match(/^(?:CẢNH|SCENE)\s*\d+\s*[:\-–—]\s*(.*)$/i);
        const parsedHeading = headingMatch
          ? headingMatch[1].trim()
          : rawHeadingText.replace(/^(?:CẢNH|SCENE)\s*\d+\s*/i, '').trim() || `Cảnh ${parsedSceneNum}`;

        // Tìm cảnh hiện có theo sceneNumber hoặc theo id
        let targetScene =
          currentScenesList.find((s) => s.sceneNumber === parsedSceneNum) ||
          currentScenesList.find((s) => s.id === hb.sceneId);

        if (targetScene) {
          sceneIdMap.set(hb.sceneId, targetScene.id);
          if (hb.sceneId !== targetScene.id) {
            sceneIdMap.set(`scene_num_${parsedSceneNum}`, targetScene.id);
          }
          // Cập nhật tiêu đề phân cảnh nếu có thay đổi
          if (parsedHeading && parsedHeading !== targetScene.heading) {
            try {
              const updated = await scriptLineService.updateScene(targetScene.id, {
                heading: parsedHeading,
                summary: targetScene.summary || null,
                defaultNarrationMode: targetScene.defaultNarrationMode || 'Present',
                expectedVersion: targetScene.version,
              });
              currentScenesList = currentScenesList.map((s) => (s.id === updated.id ? updated : s));
              hasChanges = true;
            } catch (sceneErr) {
              console.error('Lỗi cập nhật tiêu đề phân cảnh:', sceneErr);
            }
          }
        } else {
          // Tự động tạo phân cảnh mới trên máy chủ nếu Writer gõ cảnh mới trong văn bản
          try {
            const created = await scriptLineService.createScene(currentChapter.id, {
              sceneNumber: parsedSceneNum,
              heading: parsedHeading,
              summary: null,
              defaultNarrationMode: 'Present',
            });
            sceneIdMap.set(hb.sceneId, created.id);
            sceneIdMap.set(`scene_num_${parsedSceneNum}`, created.id);
            currentScenesList.push(created);
            hasChanges = true;
          } catch (createSceneErr) {
            console.error('Lỗi tự động tạo phân cảnh từ kịch bản:', createSceneErr);
          }
        }
      }

      // Lọc bỏ khối tiêu đề cảnh ra khỏi danh sách script lines để tránh lưu nhầm vào bảng ScriptLine
      const scriptLinesToProcess = extractedLines.filter((l) => l.blockType !== 'scene_heading');

      const isValidGuid = (id?: string | null) =>
        Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

      const createdLineIdMap = new Map<string, string>();

      // 3. Phân nhóm các dòng kịch bản theo Phân cảnh (Multi-Scene Persistence trên 1 trang giấy)
      const linesByScene = new Map<string, ExtractedScriptLinePayload[]>();
      for (const line of scriptLinesToProcess) {
        const hasValidText = Boolean(line.dialogueText?.trim() || line.stageDirection?.trim());
        if (!hasValidText) continue;
        const resolvedSceneId =
          sceneIdMap.get(line.sceneId) ||
          (isValidGuid(line.sceneId) ? line.sceneId : activeScene.id);
        if (!linesByScene.has(resolvedSceneId)) {
          linesByScene.set(resolvedSceneId, []);
        }
        linesByScene.get(resolvedSceneId)!.push(line);
      }

      // 3b. Tạo chuỗi văn bản kịch bản phân cảnh hoàn chỉnh (Screenplay Manuscript RawText)
      const continuousScriptRawText = extractedLines
        .map((l) => {
          if (l.blockType === 'scene_heading') return `\n[ ${l.stageDirection?.toUpperCase()} ]\n`;
          if (l.blockType === 'page_heading') return `\n=== ${l.stageDirection?.toUpperCase()} ===\n`;
          if (l.blockType === 'panel_heading') return `\n--- ${l.stageDirection?.toUpperCase()} ---\n`;
          if (l.dialogueText) return l.dialogueText;
          return l.stageDirection || '';
        })
        .filter(Boolean)
        .join('\n');

      // 4. Lưu đồng bộ hàng loạt (Batch Save) nguyên tử từng phân cảnh (Atomic 1-HTTP Roundtrip)
      for (const [targetSceneId, sceneLines] of linesByScene.entries()) {
        const batchPayload = sceneLines.map((line, idx) => ({
          id: isValidGuid(line.scriptLineId) ? line.scriptLineId : null,
          lineOrder: idx + 1,
          dialogueText: line.dialogueText || null,
          stageDirection: line.stageDirection || null,
          speakerCharacterId: isValidGuid(line.speakerCharacterId) ? line.speakerCharacterId : null,
          narrationMode: line.narrationMode,
          clientLineId: isValidGuid(line.scriptLineId) ? line.scriptLineId : null,
          panelId: isValidGuid(line.panelId) ? line.panelId : null,
        }));

        try {
          const res = await scriptLineService.batchSaveScriptLines(
            currentChapter.id,
            targetSceneId,
            {
              lines: batchPayload,
              expectedChapterVersion: currentVersion,
              summary: 'Lưu kịch bản từ trình soạn thảo',
              rawText: continuousScriptRawText,
            }
          );
          if (res?.chapterVersion !== undefined && res?.chapterVersion !== null) {
            currentVersion = res.chapterVersion;
            hasChanges = true;
          }
          if (res?.lines) {
            sceneLines.forEach((srcLine, idx) => {
              const savedLine = res.lines[idx];
              if (savedLine) {
                createdLineIdMap.set(srcLine.scriptLineId, savedLine.id);
              }
            });
          }
        } catch (batchErr: any) {
          console.error(`Lỗi lưu hàng loạt kịch bản cho Scene ${targetSceneId}:`, batchErr);
          if (
            batchErr?.status === 409 ||
            batchErr?.code === 'CONFLICT' ||
            batchErr?.message?.includes('Chapter đã đổi') ||
            batchErr?.message?.includes('version hiện tại')
          ) {
            await refreshChapterDetail(currentChapter.id);
          }
          throw batchErr;
        }
      }

      // 5. Xoá hoặc dọn sạch các phân cảnh nếu người dùng xoá cảnh đó trên giấy
      for (const sc of allScenes) {
        const hasLinesInDoc = linesByScene.has(sc.id);
        const headingInDoc = extractedLines.some(
          (l) => l.blockType === 'scene_heading' && (l.sceneId === sc.id || l.sceneId === `scene_num_${sc.sceneNumber}`)
        );
        if (!hasLinesInDoc && !headingInDoc && allScenes.length > 1) {
          try {
            await scriptLineService.deleteScene(sc.id);
            hasChanges = true;
          } catch (delErr) {
            console.warn(`Không thể xóa scene thừa ${sc.id}:`, delErr);
            try {
              const res = await scriptLineService.batchSaveScriptLines(
                currentChapter.id,
                sc.id,
                {
                  lines: [],
                  expectedChapterVersion: currentVersion,
                  summary: 'Xoá toàn bộ dòng của phân cảnh',
                }
              );
              if (res?.chapterVersion !== undefined && res?.chapterVersion !== null) {
                currentVersion = res.chapterVersion;
                hasChanges = true;
              }
            } catch {}
          }
        } else if (!hasLinesInDoc && sc.scriptLines && sc.scriptLines.length > 0) {
          try {
            const res = await scriptLineService.batchSaveScriptLines(
              currentChapter.id,
              sc.id,
              {
                lines: [],
                expectedChapterVersion: currentVersion,
                summary: 'Xoá toàn bộ dòng của phân cảnh',
              }
            );
            if (res?.chapterVersion !== undefined && res?.chapterVersion !== null) {
              currentVersion = res.chapterVersion;
              hasChanges = true;
            }
          } catch (cleanErr) {
            console.error(`Lỗi dọn sạch dòng kịch bản phân cảnh ${sc.id}:`, cleanErr);
          }
        }
      }

      // 5.5 Khung Trang → Panel → dòng: một request, một transaction phía server; không xoá trang nào
      if (currentChapter?.id) {
        const structure = new Map<number, Map<number, string[]>>();
        for (const line of extractedLines) {
          if (line.blockType === 'scene_heading' || !line.pageNumber || line.pageNumber <= 0) continue;
          const panelsOfPage = structure.get(line.pageNumber) ?? new Map<number, string[]>();
          structure.set(line.pageNumber, panelsOfPage);
          if (!line.panelNumber || line.panelNumber <= 0) continue;
          const ids = panelsOfPage.get(line.panelNumber) ?? [];
          panelsOfPage.set(line.panelNumber, ids);
          const savedId = createdLineIdMap.get(line.scriptLineId) || line.scriptLineId;
          if (isValidGuid(savedId)) ids.push(savedId);
        }
        const pagesPayload = Array.from(structure.entries())
          .sort(([a], [b]) => a - b)
          .map(([pageNumber, panelsOfPage]) => ({
            pageNumber,
            panels: Array.from(panelsOfPage.entries())
              .sort(([a], [b]) => a - b)
              .map(([panelNumber, scriptLineIds]) => ({ panelNumber, scriptLineIds })),
          }));

        try {
          const synced = await pageService.syncScriptStructure(currentChapter.id, pagesPayload);
          if (synced.unlistedPageNumbers.length > 0) {
            notify(
              t('scriptStudio.save.unlistedTitle'),
              t('scriptStudio.save.unlistedDesc', { pages: synced.unlistedPageNumbers.join(', ') }),
            );
          }
          await loadPagesAndPanels(currentChapter.id);
        } catch (structureErr: any) {
          // Dòng kịch bản đã lưu; chỉ khung Trang/Panel chưa đồng bộ nên báo rõ thay vì nuốt lỗi
          notify(t('scriptStudio.save.structureFailed'), structureErr?.message ?? '');
        }
      }

      // 6. Cập nhật version mới nhất vào React state
      setCurrentChapter((prev) => (prev ? { ...prev, versionVector: currentVersion } : null));

      // 7. Tự động đồng bộ và nạp lại danh sách phân cảnh cho Left Bar, giữ nguyên cảnh đang chọn
      try {
        const freshScenes = await scriptLineService.getScenesByChapter(currentChapter.id);
        freshScenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
        setScenes(freshScenes);

        const allDetails = await Promise.all(
          freshScenes.map((s) => scriptLineService.getSceneById(s.id).catch(() => null))
        );
        const validDetails = allDetails.filter((d): d is SceneDetailDto => d !== null);
        validDetails.sort((a, b) => a.sceneNumber - b.sceneNumber);
        setChapterScenesDetail(validDetails);

        // Giữ nguyên activeScene hiện tại, tuyệt đối không nhảy sang cảnh khác
        const currentActiveId = activeScene.id;
        const stillActive = validDetails.find((s) => s.id === currentActiveId);
        if (stillActive) {
          setSelectedScene(stillActive);
        } else if (validDetails.length > 0) {
          setSelectedScene(validDetails[0]);
        }
      } catch (refreshErr) {
        console.error('Lỗi làm mới danh sách phân cảnh sau khi lưu:', refreshErr);
      }
    },
    [currentChapter, chapterScenesDetail, selectedScene, scenes, canEditScript, isChapterLocked]
  );



  // Xử lý Xoá Phân Cảnh (Delete Scene - Lucian #269 TypeToConfirmModal)
  const handleConfirmDeleteScene = async () => {
    if (!sceneToDelete || !currentChapter) return;
    setIsDeletingScene(true);
    try {
      await scriptLineService.deleteScene(sceneToDelete.id);
      notify(
        'Đã xoá phân cảnh',
        `Cảnh ${sceneToDelete.sceneNumber} đã được xoá an toàn khỏi chuỗi sản xuất.`
      );
      setSceneToDelete(null);
      await loadScenes();
    } catch (err: any) {
      notify('Không thể xoá phân cảnh', err?.message || 'Lỗi hệ thống');
    } finally {
      setIsDeletingScene(false);
    }
  };

  // Xử lý Xoá Chương (Delete Chapter - Lucian #269 TypeToConfirmModal)
  const handleConfirmDeleteChapter = async () => {
    if (!chapterToDelete) return;
    setIsDeletingChapter(true);
    try {
      await chapterService.deleteChapter(chapterToDelete.id);
      notify(
        'Đã xoá chương',
        `Chương ${chapterToDelete.chapterNumber} đã được xoá an toàn khỏi chuỗi sản xuất.`
      );
      setChapterToDelete(null);
      if (seriesId) {
        const chapRes = await chapterService.getChaptersBySeries(seriesId, 1, 50);
        const remainingChapters = Array.isArray(chapRes) ? chapRes : (chapRes?.items || []);
        setChapters(remainingChapters);
        if (remainingChapters.length > 0) {
          handleSelectChapter(remainingChapters[0].id);
        } else {
          setCurrentChapter(null);
          setScenes([]);
          setSelectedScene(null);
        }
      }
    } catch (err: any) {
      notify('Không thể xoá chương', err.message || 'Lỗi hệ thống');
    } finally {
      setIsDeletingChapter(false);
    }
  };

  const handleCreateStubEntity = useCallback(
    async (name: string) => {
      if (!seriesId) return;
      try {
        const created = await bibleService.createBibleEntry(seriesId, {
          name,
          code: name.toUpperCase().replace(/\s+/g, '_').slice(0, 15),
          category: 'Character',
          description: `Tạo tự động từ kịch bản (Chờ cập nhật mô tả)`,
          priority: 'Standard',
        });
        setAllBibleEntries((prev) => [...prev, created]);
        setCharacters((prev) => [...prev, created]);
        notify('Đã tạo thực thể tạm', `Đã lưu tạm "${name}" vào Series Bible để biên kịch tiếp tục.`);
      } catch (err: any) {
        console.error('Lỗi tự sinh Stub Entity:', err);
      }
    },
    [seriesId, notify],
  );

  const loadPagesAndPanels = useCallback(async (chapId: string) => {
    try {
      const pages = await pageService.getPagesByChapter(chapId);
      setChapterPages(pages || []);
      if (pages && pages.length > 0) {
        const panelPromises = pages.map((page) =>
          panelService.getPanelsByPage(page.id).catch(() => [])
        );
        const panelsByPages = await Promise.all(panelPromises);
        const allPanels: PanelDto[] = [];
        panelsByPages.forEach((list, idx) => {
          list.forEach((p) => {
            (p as any).pageNumber = pages[idx].pageNumber;
            allPanels.push(p);
          });
        });
        setChapterPanels(allPanels);
      } else {
        setChapterPanels([]);
      }
    } catch {
      setChapterPages([]);
      setChapterPanels([]);
    }
  }, []);

  const handleOpenInBible = useCallback((codeOrId: string) => {
    if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(codeOrId)}`);
    }
  }, [workspaceId, seriesId, navigate]);

  const handleOpenInArtistDesk = useCallback((pageNumber?: number) => {
    if (workspaceId && seriesId && currentChapter?.id) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/artist?chapterId=${currentChapter.id}${pageNumber ? `&page=${pageNumber}` : ''}`);
    }
  }, [workspaceId, seriesId, currentChapter, navigate]);

  const handleCreateInBible = useCallback((tempCode: string) => {
    if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(tempCode)}`);
    }
  }, [workspaceId, seriesId, navigate]);

  const loadScenes = useCallback(async () => {
    if (!currentChapter?.id) {
      setScenes([]);
      setSelectedScene(null);
      setChapterScenesDetail([]);
      return;
    }
    setLoadingScenes(true);
    try {
      const list = await scriptLineService.getScenesByChapter(currentChapter.id);
      list.sort((a, b) => a.sceneNumber - b.sceneNumber);
      setScenes(list);

      if (list.length > 0) {
        // Tải chi tiết tất cả các phân cảnh để dựng không gian kịch bản liền mạch
        const allDetails = await Promise.all(
          list.map((s) => scriptLineService.getSceneById(s.id).catch(() => null))
        );
        const validDetails = allDetails.filter((d): d is SceneDetailDto => d !== null);
        validDetails.sort((a, b) => a.sceneNumber - b.sceneNumber);
        setChapterScenesDetail(validDetails);

        setSelectedScene((prev) => {
          if (prev && validDetails.some((s) => s.id === prev.id)) {
            return validDetails.find((s) => s.id === prev.id) || prev;
          }
          const matched = sceneIdFromUrl ? validDetails.find((s) => s.id === sceneIdFromUrl) : null;
          return matched || validDetails[0] || null;
        });
      } else if (canEditScript && !isChapterLocked) {
        // Tự động khởi tạo phân cảnh đầu tiên để Writer vào thẳng trình soạn thảo, bỏ qua bước chọn / tạo phân cảnh thủ công
        try {
          const defaultScene = await scriptLineService.createScene(currentChapter.id, {
            sceneNumber: 1,
            heading: 'CẢNH 1: MỞ ĐẦU',
            summary: null,
            defaultNarrationMode: 'Present',
          });
          if (defaultScene?.id) {
            setScenes([defaultScene]);
            const detail = await scriptLineService.getSceneById(defaultScene.id).catch(() => null);
            setChapterScenesDetail(detail ? [detail] : [defaultScene as any]);
            setSelectedScene(detail || (defaultScene as any));
          }
        } catch (createErr) {
          console.error('Không thể tự động tạo cảnh đầu:', createErr);
          setSelectedScene(null);
          setChapterScenesDetail([]);
        }
      } else {
        setSelectedScene(null);
        setChapterScenesDetail([]);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách phân cảnh:', err);
      notify('Lỗi tải kịch bản', err.message || 'Không thể tải danh sách phân cảnh');
    } finally {
      setLoadingScenes(false);
    }
  }, [currentChapter?.id, sceneIdFromUrl, notify, canEditScript, isChapterLocked]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Chọn Scene từ danh sách
  const handleSelectScene = (scene: SceneDto) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('sceneId', scene.id);
      return p;
    });

    const detail = chapterScenesDetail.find((s) => s.id === scene.id);
    if (detail) {
      setSelectedScene(detail);
    } else {
      loadSceneDetail(scene.id);
    }

    if (editorMode === 'flow') {
      setTimeout(() => {
        const sceneHeadings = Array.from(
          document.querySelectorAll('.script-block[data-block-type="scene_heading"]')
        );
        const targetEl =
          sceneHeadings.find((el) => el.getAttribute('data-scene-id') === scene.id) ||
          sceneHeadings.find(
            (el) =>
              el.textContent?.includes(`CẢNH ${scene.sceneNumber}`) ||
              el.textContent?.includes(`SCENE ${scene.sceneNumber}`)
          );
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Chọn Chapter từ dropdown hoặc danh sách chọn chương (bảo vệ thay đổi chưa lưu)
  const handleSelectChapter = (chapId: string) => {
    if (chapId === '__all__' || !chapId) {
      handleBackToChapterSelection();
      return;
    }

    if (hasUnsavedChanges) {
      setBarWarn(true);
      setTimeout(() => setBarWarn(false), 800);
      const confirmSwitch = window.confirm(
        'Bạn có thay đổi đề cương hoặc Story Arc chưa lưu. Bạn có muốn bỏ qua các thay đổi này để chuyển chương không?',
      );
      if (!confirmSwitch) return;
    }

    // Xoá kết quả kiểm tra nhất quán của chương cũ ngay lập tức
    setFindings([]);
    setConsistencyResult(null);

    const matched = chapters.find((c) => c.id === chapId);
    if (matched) {
      setCurrentChapter(matched);
      setOutlineInput(matched.outline || '');
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('chapterId', chapId);
        p.delete('sceneId');
        return p;
      });
    }
  };

  // Quay lại màn hình chọn chương
  const handleBackToChapterSelection = () => {
    if (hasUnsavedChanges) {
      setBarWarn(true);
      setTimeout(() => setBarWarn(false), 800);
      const confirmSwitch = window.confirm(
        'Bạn có thay đổi đề cương hoặc Story Arc chưa lưu. Bạn có muốn bỏ qua các thay đổi này để quay lại danh sách chọn chương không?',
      );
      if (!confirmSwitch) return;
    }

    setFindings([]);
    setConsistencyResult(null);
    setCurrentChapter(null);
    setSelectedScene(null);
    setScenes([]);
    setChapterScenesDetail([]);
    if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/script`);
      return;
    }
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('chapterId');
      p.delete('sceneId');
      return p;
    });
  };

  // Producer tạo chương mới (Chỉ Producer mới có quyền tạo chương)
  const handleCreateNewChapter = async (data: CreateChapterRequest) => {
    if (!seriesId) return;
    if (!canCreateChapter) {
      notify('Quyền hạn bị từ chối', 'Chỉ có Producer mới có quyền khởi tạo chương mới cho series.');
      return;
    }
    const created = await chapterService.createChapter(seriesId, data);
    setChapters((prev) => [...prev, created]);
    setFindings([]);
    setConsistencyResult(null);
    setCurrentChapter(created);
    setOutlineInput(created.outline || '');
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('chapterId', created.id);
      p.delete('sceneId');
      return p;
    });
  };

  // --- STORY ARC (SERIES) & OUTLINE (CHAPTER) ---
  const handleSaveStoryArc = async () => {
    if (!seriesId || !canEditScript) return;
    setSavingStoryArc(true);
    setConcurrencyError(null);
    try {
      const res = await seriesService.updateStoryArc(seriesId, storyArcInput.trim() || null);
      setStoryArcInput(res.value || '');
      clearDraft(`storyArc.${seriesId}`);
      setSeriesDetail((prev) => (prev ? { ...prev, storyArc: res.value } : null));
      notify('Thành công', 'Đã cập nhật Story Arc của Series.');
    } catch (err: any) {
      notify('Lỗi cập nhật Story Arc', err.message);
      if (err.message?.includes('409') || err.message?.includes('xung đột')) {
        setConcurrencyError(err.message);
      }
    } finally {
      setSavingStoryArc(false);
    }
  };

  const handleSaveOutline = async () => {
    if (!currentChapter?.id || !canEditScript) return;
    setSavingOutline(true);
    setConcurrencyError(null);
    try {
      const res = await chapterService.updateOutline(
        currentChapter.id,
        outlineInput.trim() || null,
      );
      setOutlineInput(res.value || '');
      clearDraft(`outline.${currentChapter.id}`);
      setCurrentChapter((prev) => (prev ? { ...prev, outline: res.value } : null));
      notify('Thành công', `Đã cập nhật đề cương Chương ${currentChapter.chapterNumber}.`);
    } catch (err: any) {
      notify('Lỗi cập nhật đề cương', err.message);
      if (
        err.message?.includes('409') ||
        err.message?.includes('khoá') ||
        err.message?.includes('xung đột')
      ) {
        setConcurrencyError(err.message);
      }
    } finally {
      setSavingOutline(false);
    }
  };

  // --- KIỂM TRA NHẤT QUÁN (CONSISTENCY CHECK) ---
  const handleRunConsistencyCheck = async () => {
    if (!currentChapter?.id) return;
    setLoadingConsistency(true);
    try {
      const res = await assignmentService.runConsistencyCheck(currentChapter.id);
      setConsistencyResult(res);
      setFindings(res.findings || []);
      setActiveSideDrawer('consistency');
      notify(
        'Kiểm tra nhất quán hoàn tất',
        `Phát hiện ${res.openCount} vấn đề (${res.blockingOpenCount} lỗi chặn).`,
      );
    } catch (err: any) {
      notify('Lỗi kiểm tra nhất quán', err.message);
    } finally {
      setLoadingConsistency(false);
    }
  };

  // Nút "Xem dòng" an toàn, không làm mất dữ liệu nhập và báo rõ nếu dòng không tồn tại
  const handleScrollToLine = async (scriptLineId?: string | null) => {
    if (!scriptLineId) {
      notify('Thông báo', 'Vấn đề này không gắn với dòng kịch bản cụ thể nào.');
      return;
    }

    // 1. Kiểm tra xem dòng đã có sẵn trên DOM của Scene hiện tại chưa
    const element = document.getElementById(`script-line-${scriptLineId}`);

    // 2. Nếu chưa có trên DOM, tìm kiếm xuyên suốt các phân cảnh trong chương
    if (!element && currentChapter?.id && scenes.length > 0) {
      let targetSceneFound = false;
      for (const sc of scenes) {
        if (sc.id === selectedScene?.id) continue;
        try {
          const detail = await scriptLineService.getSceneById(sc.id);
          if (detail.scriptLines?.some((l) => l.id === scriptLineId)) {
            targetSceneFound = true;
            setSelectedScene(detail);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('sceneId', sc.id);
              return next;
            });
            setTimeout(() => {
              const target = document.getElementById(`script-line-${scriptLineId}`);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedLineId(scriptLineId);
              }
            }, 300);
            break;
          }
        } catch {
          // Bỏ qua lỗi nạp detail của cảnh khác
        }
      }

      if (!targetSceneFound) {
        notify(
          'Không tìm thấy dòng',
          'Dòng kịch bản này không còn tồn tại hoặc đã bị xóa trong kịch bản hiện tại.',
        );
        return;
      }
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedLineId(scriptLineId);
    } else {
      notify(
        'Không tìm thấy dòng',
        'Dòng kịch bản này không còn tồn tại hoặc đã bị xóa trong kịch bản hiện tại.',
      );
      return;
    }

    // Giữ highlight 4.5 giây để người dùng dễ nhận biết dòng đang được nhắm tới
    setTimeout(() => {
      setHighlightedLineId((prev) => (prev === scriptLineId ? null : prev));
    }, 4500);
  };

  // Mở bảng yêu cầu sửa một lần cho mỗi lượt Editor trả kịch bản còn CR Open.
  useEffect(() => {
    if (!writerAssignmentId || writerAssignmentStatus !== 'ReworkRequired') return;
    if (openChangeRequestCount === 0 || autoOpenedCrForRef.current === writerAssignmentId) return;
    autoOpenedCrForRef.current = writerAssignmentId;
    setActiveSideDrawer('changeRequests');
  }, [writerAssignmentId, writerAssignmentStatus, openChangeRequestCount]);

  const handleResolveChangeRequest = async (changeRequestId: string, note: string) => {
    if (!writerAssignmentChapterId) return false;
    try {
      const updated = await assignmentService.resolveChangeRequest(
        writerAssignmentChapterId,
        changeRequestId,
        note || undefined,
      );
      setChangeRequests((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      notify(t('writerChangeRequests.resolvedToastTitle'), t('writerChangeRequests.resolvedToastDesc'));
      return true;
    } catch (err: any) {
      notify(t('writerChangeRequests.resolveFailed'), err?.message ?? '');
      return false;
    }
  };

  const handleJumpToChangeRequest = (cr: ChangeRequestDto) => {
    if (cr.scriptLineId) {
      void handleScrollToLine(cr.scriptLineId);
      return;
    }
    const scene = scenes.find((sc) => sc.id === cr.sceneId);
    if (scene) {
      handleSelectScene(scene);
    } else {
      notify(t('writerChangeRequests.sceneMissingTitle'), t('writerChangeRequests.sceneMissingDesc'));
    }
  };

  // --- CRUD SCENE ---
  const handleOpenCreateScene = () => {
    setIsEditingScene(false);
    setSceneNumberInput(scenes.length + 1);
    setSceneHeadingInput('');
    setSceneSummaryInput('');
    setSceneDefaultNarrationMode('Present');
    setSceneModalOpen(true);
  };

  const handleOpenEditScene = () => {
    if (!selectedScene) return;
    setIsEditingScene(true);
    setSceneNumberInput(selectedScene.sceneNumber);
    setSceneHeadingInput(selectedScene.heading || '');
    setSceneSummaryInput(selectedScene.summary || '');
    setSceneDefaultNarrationMode(selectedScene.defaultNarrationMode || 'Present');
    setSceneModalOpen(true);
  };

  const handleSubmitScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChapter?.id) return;
    setSubmitting(true);
    try {
      if (isEditingScene && selectedScene) {
        const req: UpdateSceneRequest = {
          heading: sceneHeadingInput.trim() || null,
          summary: sceneSummaryInput.trim() || null,
          defaultNarrationMode: sceneDefaultNarrationMode,
          expectedVersion: selectedScene.version,
        };
        const updated = await scriptLineService.updateScene(selectedScene.id, req);
        notify('Thành công', `Đã cập nhật Phân cảnh ${updated.sceneNumber}`);
        setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSelectedScene((prev) => (prev ? { ...prev, ...updated } : null));
        setChapterScenesDetail((prev) =>
          prev.map((s) =>
            s.id === updated.id
              ? { ...s, heading: updated.heading, summary: updated.summary, version: updated.version }
              : s
          )
        );
      } else {
        const req: CreateSceneRequest = {
          sceneNumber: sceneNumberInput,
          heading: sceneHeadingInput.trim() || null,
          summary: sceneSummaryInput.trim() || null,
          defaultNarrationMode: sceneDefaultNarrationMode,
        };
        const created = await scriptLineService.createScene(currentChapter.id, req);
        notify('Thành công', `Đã tạo Phân cảnh ${created.sceneNumber}`);
        setScenes((prev) => [...prev, created]);
        handleSelectScene(created);
      }
      setSceneModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'CONFLICT' && isEditingScene && selectedScene) {
        // BR-11: người khác vừa sửa phân cảnh → nạp lại bản mới (kèm version mới), giữ form mở; KHÔNG tự gửi lại.
        // Người dùng xem bản mới rồi quyết định lưu lại nội dung của mình hay không.
        setConflictEntityId(selectedScene.id);
        setConflictErrorMsg(err.message || 'Phân cảnh vừa được người khác chỉnh sửa trên máy chủ.');
        setConflictModalOpen(true);
        notify(
          'Phân cảnh vừa được người khác sửa',
          `${err.message} Đã nạp bản mới nhất, kiểm tra lại rồi lưu.`,
        );
        await loadSceneDetail(selectedScene.id);
      } else if (err?.status === 403) {
        notify('Không có quyền thao tác (403)', err.message);
      } else {
        notify('Lỗi thao tác phân cảnh', err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScene = () => {
    notify(
      'Không thể xoá phân cảnh',
      'Hệ thống không cho phép xoá phân cảnh để đảm bảo tính liên tục của mạch truyện. Bạn chỉ có thể sửa tiêu đề phân cảnh.'
    );
  };

  // --- CRUD SCRIPT LINE (UC-06) ---
  const handleOpenAddLine = () => {
    setEditingLine(null);
    setLineSpeakerId('');
    setLineDialogue('');
    setLineStageDirection('');
    setLineBibleEntryIds([]);
    setLineNarrationMode(selectedScene?.defaultNarrationMode || 'Present');
    const nextOrder =
      selectedScene && selectedScene.scriptLines && selectedScene.scriptLines.length > 0
        ? Math.max(...selectedScene.scriptLines.map((l) => l.lineOrder)) + 1
        : 1;
    setLineOrderInput(nextOrder);
    setLineModalOpen(true);
  };

  const handleOpenEditLine = (line: SceneScriptLineSummaryDto) => {
    setEditingLine(line);
    setLineSpeakerId(line.speakerCharacterId || '');
    setLineDialogue(line.dialogueText || '');
    setLineStageDirection(line.stageDirection || '');
    setLineBibleEntryIds(line.bibleEntryIds || []);
    setLineNarrationMode(line.narrationMode || selectedScene?.defaultNarrationMode || 'Present');
    setLineOrderInput(line.lineOrder);
    setLineModalOpen(true);
  };

  const handleSubmitLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChapter?.id || !selectedScene?.id) return;

    if (!lineDialogue.trim() && !lineStageDirection.trim()) {
      notify('Thiếu nội dung', 'Vui lòng nhập lời thoại hoặc chỉ dẫn cảnh (ít nhất một trường).');
      return;
    }

    setSubmitting(true);
    setConcurrencyError(null);

    const expectedVersion = currentChapter.versionVector;

    try {
      if (editingLine) {
        const req: UpdateScriptLineRequest = {
          dialogueText: lineDialogue.trim() || null,
          stageDirection: lineStageDirection.trim() || null,
          speakerCharacterId: lineSpeakerId || null,
          expectedChapterVersion: expectedVersion,
          bibleEntryIds: lineBibleEntryIds,
          narrationMode: lineNarrationMode,
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          offlineQueueService.enqueue({
            type: 'UPDATE_SCRIPT_LINE',
            endpoint: `/chapters/${currentChapter.id}/script-lines/${editingLine.id}`,
            method: 'PUT',
            payload: req,
            clientRefId: editingLine.id,
          });
          setSelectedScene((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              scriptLines: prev.scriptLines.map((l) =>
                l.id === editingLine.id
                  ? {
                      ...l,
                      dialogueText: lineDialogue.trim() || null,
                      stageDirection: lineStageDirection.trim() || null,
                      speakerCharacterId: lineSpeakerId || null,
                      bibleEntryIds: lineBibleEntryIds,
                      narrationMode: lineNarrationMode || undefined,
                    }
                  : l,
              ),
            };
          });
          notify(
            'Đã lưu ngoại tuyến (NFR-09)',
            `Thay đổi dòng kịch bản #${editingLine.lineOrder} đã được lưu vào hàng đợi và sẽ tự đồng bộ khi có mạng.`,
          );
          setLineModalOpen(false);
          return;
        }

        const res = await scriptLineService.updateScriptLine(
          currentChapter.id,
          editingLine.id,
          req,
        );
        notify('Cập nhật thành công', `Đã lưu dòng kịch bản #${res.lineOrder}`);
        setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : null));
        await loadSceneDetail(selectedScene.id);
        setLineModalOpen(false);
      } else {
        const clientLineId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '99999999-9999-4999-8999-' + Math.floor(Math.random() * 899999999999 + 100000000000);
        const req: CreateScriptLineRequest = {
          dialogueText: lineDialogue.trim() || null,
          stageDirection: lineStageDirection.trim() || null,
          speakerCharacterId: lineSpeakerId || null,
          lineOrder: lineOrderInput,
          expectedChapterVersion: expectedVersion,
          bibleEntryIds: lineBibleEntryIds.length > 0 ? lineBibleEntryIds : null,
          clientLineId,
          narrationMode: lineNarrationMode,
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          offlineQueueService.enqueue({
            type: 'CREATE_SCRIPT_LINE',
            endpoint: `/chapters/${currentChapter.id}/scenes/${selectedScene.id}/script-lines`,
            method: 'POST',
            payload: req,
            clientRefId: clientLineId,
          });
          setSelectedScene((prev) => {
            if (!prev) return null;
            const newLine: SceneScriptLineSummaryDto = {
              id: clientLineId,
              lineOrder: lineOrderInput,
              dialogueText: lineDialogue.trim() || null,
              stageDirection: lineStageDirection.trim() || null,
              speakerCharacterId: lineSpeakerId || null,
              bibleEntryIds: lineBibleEntryIds,
              narrationMode: lineNarrationMode || undefined,
            };
            return {
              ...prev,
              scriptLines: [...(prev.scriptLines || []), newLine],
            };
          });
          setScenes((prevScenes) =>
            prevScenes.map((s) =>
              s.id === selectedScene.id
                ? { ...s, scriptLinesCount: (s.scriptLinesCount || 0) + 1 }
                : s,
            ),
          );
          notify(
            'Đã lưu ngoại tuyến (NFR-09)',
            `Dòng kịch bản mới #${lineOrderInput} đã được lưu vào hàng đợi trên thiết bị và sẽ tự đồng bộ khi có kết nối mạng.`,
          );
          setLineModalOpen(false);
          return;
        }

        const res = await scriptLineService.createScriptLine(
          currentChapter.id,
          selectedScene.id,
          req,
        );
        notify(
          'Thêm thành công',
          res.replayed
            ? `Dòng kịch bản #${res.lineOrder} đã được nạp an toàn (Idempotent)`
            : `Đã tạo dòng kịch bản #${res.lineOrder}`,
        );
        setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : null));
        await loadSceneDetail(selectedScene.id);
        setLineModalOpen(false);
      }
    } catch (err: any) {
      if (err.code === 'CONFLICT' || err.status === 409) {
        const msg =
          err.message ||
          'Xung đột phiên bản: Kịch bản đã được chỉnh sửa ở tab/thiết bị khác. Đang nạp lại dữ liệu mới nhất...';
        setConcurrencyError(msg);
        setConflictEntityId(editingLine?.id || selectedScene.id);
        setConflictErrorMsg(msg);
        setConflictModalOpen(true);
        notify('Xung đột phiên bản (409 CONFLICT)', msg);
        await refreshChapterDetail(currentChapter.id);
        await loadSceneDetail(selectedScene.id);
      } else if (err.status === 403 || err.code === 'FORBIDDEN') {
        notify(
          'Không có quyền sửa kịch bản (403)',
          err.message ||
            'Kịch bản chương này đã được giao cho Writer khác. Chỉ người được giao hoặc Producer mới sửa được.',
        );
      } else {
        notify('Lỗi ghi kịch bản', err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLine = async (line: SceneScriptLineSummaryDto) => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    if (
      !(await confirm({
        title: `Xoá dòng kịch bản #${line.lineOrder}?`,
        description: line.dialogueText ? `"${line.dialogueText}"` : undefined,
        confirmText: 'Xoá dòng',
        cancelText: 'Giữ lại',
        variant: 'danger',
      }))
    )
      return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'DELETE_SCRIPT_LINE',
        endpoint: `/chapters/${currentChapter.id}/script-lines/${line.id}`,
        method: 'DELETE',
        payload: {
          expectedChapterVersion: currentChapter.versionVector,
        },
        clientRefId: line.id,
      });
      setSelectedScene((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          scriptLines: prev.scriptLines.filter((l) => l.id !== line.id),
        };
      });
      setScenes((prevScenes) =>
        prevScenes.map((s) =>
          s.id === selectedScene.id
            ? { ...s, scriptLinesCount: Math.max(0, (s.scriptLinesCount || 1) - 1) }
            : s,
        ),
      );
      notify(
        'Đã xoá ngoại tuyến (NFR-09)',
        `Dòng #${line.lineOrder} đã được đánh dấu xoá và sẽ đồng bộ khi có kết nối mạng.`,
      );
      return;
    }

    try {
      const res = await scriptLineService.deleteScriptLine(
        currentChapter.id,
        line.id,
        currentChapter.versionVector,
      );
      notify('Đã xoá dòng kịch bản', `Dòng #${line.lineOrder} đã được xoá.`);
      setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : null));
      await loadSceneDetail(selectedScene.id);
    } catch (err: any) {
      if (err.code === 'CONFLICT' || err.status === 409) {
        const msg = err.message || 'Xung đột phiên bản khi xoá dòng kịch bản.';
        setConcurrencyError(msg);
        setConflictEntityId(line.id);
        setConflictErrorMsg(msg);
        setConflictModalOpen(true);
        notify('Xung đột phiên bản', msg);
        await refreshChapterDetail(currentChapter.id);
        await loadSceneDetail(selectedScene.id);
      } else if (err.status === 403 || err.code === 'FORBIDDEN') {
        notify(
          'Không có quyền xoá dòng (403)',
          err.message ||
            'Kịch bản chương này đã được giao cho Writer khác. Chỉ người được giao hoặc Producer mới sửa được.',
        );
      } else {
        notify('Lỗi xoá dòng', err.message);
      }
    }
  };

  // Kéo thả & đổi thứ tự dòng kịch bản
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);
  const [dragOverLineIndex, setDragOverLineIndex] = useState<number | null>(null);
  const [isReorderingLines, setIsReorderingLines] = useState(false);

  const applyReorder = async (reorderedLines: SceneScriptLineSummaryDto[]) => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    setIsReorderingLines(true);
    const previousLines = selectedScene.scriptLines || [];
    const normalized = reorderedLines.map((l, idx) => ({ ...l, lineOrder: idx + 1 }));
    setSelectedScene((prev) => (prev ? { ...prev, scriptLines: normalized } : null));

    try {
      const payload = normalized.map((l) => ({ lineId: l.id, newOrder: l.lineOrder }));
      await scriptLineService.reorderScriptLines(
        currentChapter.id,
        selectedScene.id,
        payload,
        currentChapter.versionVector,
      );
      notify('Đã cập nhật thứ tự', 'Thứ tự các dòng kịch bản đã được lưu thành công.');
      await refreshChapterDetail(currentChapter.id);
    } catch (err: any) {
      setSelectedScene((prev) => (prev ? { ...prev, scriptLines: previousLines } : null));
      if (err.status === 403 || err.code === 'FORBIDDEN') {
        notify(
          'Không có quyền sắp xếp dòng (403)',
          err.message ||
            'Kịch bản chương này đã được giao cho Writer khác. Chỉ người được giao hoặc Producer mới sửa được.',
        );
      } else {
        notify('Lỗi sắp xếp dòng', err.message || 'Không thể cập nhật thứ tự dòng kịch bản.');
      }
      await loadSceneDetail(selectedScene.id);
    } finally {
      setIsReorderingLines(false);
      setDraggedLineIndex(null);
      setDragOverLineIndex(null);
    }
  };

  const handleMoveLine = (fromIndex: number, direction: 'up' | 'down') => {
    if (!selectedScene?.scriptLines || isReorderingLines) return;
    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= selectedScene.scriptLines.length) return;

    const items = [...selectedScene.scriptLines];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, moved);
    void applyReorder(items);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLineIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverLineIndex !== index) {
      setDragOverLineIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (
      draggedLineIndex === null ||
      draggedLineIndex === dropIndex ||
      !selectedScene?.scriptLines
    ) {
      setDraggedLineIndex(null);
      setDragOverLineIndex(null);
      return;
    }
    const items = [...selectedScene.scriptLines];
    const [moved] = items.splice(draggedLineIndex, 1);
    items.splice(dropIndex, 0, moved);
    void applyReorder(items);
  };

  // Helper tìm tên nhân vật từ ID có kèm giai đoạn
  const getSpeakerName = (speakerId?: string | null) => {
    if (!speakerId) return null;
    const found = characters.find((c) => c.id === speakerId) || allBibleEntries.find((c) => c.id === speakerId);
    return found ? getBibleEntryNameWithStage(found) : 'Nhân vật (Chưa rõ)';
  };


  const handleFreezeScript = async () => {
    if (!currentChapter?.id) return;
    const confirmed = await confirm({
      title: `Duyệt kịch bản & Đưa vào sản xuất Chương ${currentChapter.chapterNumber}?`,
      description:
        'Kịch bản sẽ được đóng băng (Frozen / Read-only) để bộ phận Artist bắt đầu dàn trang (Thumbnail & Layout). Bước giao việc Script trên Kanban sẽ tự động hoàn tất.',
      confirmText: 'Duyệt kịch bản & Đưa vào sản xuất',
      cancelText: 'Hủy',
      variant: 'info',
    });
    if (!confirmed) return;

    setFreezingScript(true);
    try {
      const updatedChapter = await chapterService.freezeScript(currentChapter.id);
      notify(
        'Đã duyệt kịch bản',
        `Kịch bản Chương ${currentChapter.chapterNumber} đã đóng băng và chuyển giao sang khâu sản xuất hình ảnh thành công.`,
      );
      setCurrentChapter((prev) => (prev ? { ...prev, isScriptFrozen: true, scriptContentHash: updatedChapter?.scriptContentHash ?? prev.scriptContentHash } : prev));
      await refreshChapterDetail(currentChapter.id);
      void checkChapterBibleGate(currentChapter.id);
    } catch (err: any) {
      notify('Không thể duyệt kịch bản', err.message);
    } finally {
      setFreezingScript(false);
    }
  };

  const handleUnfreezeScript = async () => {
    if (!currentChapter?.id) return;
    const confirmed = await confirm({
      title: `Mở lại kịch bản Chương ${currentChapter.chapterNumber}?`,
      description:
        'Mở lại kịch bản để Writer chỉnh sửa sẽ tạm dừng khâu vẽ Thumbnail của Artist cho đến khi kịch bản được duyệt lại.',
      confirmText: 'Mở lại kịch bản',
      cancelText: 'Hủy',
      variant: 'warning',
    });
    if (!confirmed) return;

    setFreezingScript(true);
    try {
      await chapterService.unfreezeScript(currentChapter.id);
      notify(
        'Đã mở lại kịch bản',
        `Kịch bản Chương ${currentChapter.chapterNumber} đã được mở lại cho Writer chỉnh sửa.`,
      );
      setCurrentChapter((prev) => (prev ? { ...prev, isScriptFrozen: false, scriptContentHash: null } : prev));
      await refreshChapterDetail(currentChapter.id);
      void checkChapterBibleGate(currentChapter.id);
    } catch (err: any) {
      notify('Không thể mở lại kịch bản', err.message);
    } finally {
      setFreezingScript(false);
    }
  };

  const handleSubmitScriptToEditor = async () => {
    if (!currentChapter?.id) return;
    if (!myWriterAssignment) {
      notify('Chưa có phân công việc', 'Chương này chưa có phân công kịch bản Writer trên Kanban để nộp duyệt.');
      return;
    }

    const confirmed = await confirm({
      title: `Gửi kịch bản Chương ${currentChapter.chapterNumber} cho Editor duyệt?`,
      description: `Kịch bản (Bản v${currentChapter.versionVector ?? 0}) sẽ được chuyển sang hàng đợi thẩm định của Editor. Nếu Editor yêu cầu chỉnh sửa lại, hệ thống sẽ tự động tăng số version của bản thảo.`,
      confirmText: 'Gửi duyệt kịch bản',
      cancelText: 'Hủy',
      variant: 'info',
    });
    if (!confirmed) return;

    setSubmittingToEditor(true);
    try {
      if (myWriterAssignment.status === 'Assigned') {
        await assignmentService.startAssignment(currentChapter.id, myWriterAssignment.id);
      }
      await assignmentService.submitAssignment(currentChapter.id, myWriterAssignment.id);
      notify(
        'Đã gửi kịch bản cho Editor duyệt',
        `Kịch bản Chương ${currentChapter.chapterNumber} (Bản v${currentChapter.versionVector ?? 0}) đã được chuyển cho Editor thẩm định thành công.`,
      );
      await refreshChapterDetail(currentChapter.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi gửi duyệt kịch bản';
      notify('Không thể gửi duyệt', msg);
    } finally {
      setSubmittingToEditor(false);
    }
  };

  const aiReadingDirection =
    seriesDetail?.readingDirection === 1 || seriesDetail?.readingDirection === 'RightToLeft'
      ? 'RightToLeft'
      : 'LeftToRight';

  const handleAiReload = async () => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    await refreshChapterDetail(currentChapter.id);
    await loadScenes();
    await loadSceneDetail(selectedScene.id);
  };

  const currentSceneDto = useMemo(
    () => scenes.find((s) => s.id === selectedScene?.id),
    [scenes, selectedScene?.id]
  );
  const sceneHasPanels = useMemo(() => {
    if (!selectedScene) return false;
    return (
      (selectedScene.scriptLines && selectedScene.scriptLines.some((l) => !!l.panelId)) ||
      (currentSceneDto?.pagesCount ?? 0) > 0
    );
  }, [selectedScene, currentSceneDto]);

  const aiNameById = Object.fromEntries(
    allBibleEntries.map((e) => [e.id, getBibleEntryNameWithStage(e)]),
  );

  // Số lượng vấn đề nhất quán
  const openFindingsCount = findings.filter(
    (f) => f.status === 'Open' || f.status === 'NeedsClarification',
  ).length;
  const totalFindingsCount = findings.length;

  const outlineWordCount = outlineInput.trim()
    ? outlineInput.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // Lọc danh sách phân cảnh
  const filteredScenes = scenes.filter((s): s is SceneDto => Boolean(s && s.id)).filter((s) => {
    if (!sceneSearchQuery.trim()) return true;
    const q = sceneSearchQuery.toLowerCase();
    return (
      (s.heading && s.heading.toLowerCase().includes(q)) ||
      (s.summary && s.summary.toLowerCase().includes(q)) ||
      String(s.sceneNumber).includes(q)
    );
  });

  // Đưa Bộ truyện / Chương, các công đoạn kịch bản và nút Gửi duyệt lên header chung (giống Bàn vẽ).
  // Handler đi qua ref vì chúng được tạo lại mỗi lần render; đưa trực tiếp vào deps sẽ gây vòng lặp setHeaderConfig.
  const focusHeader = useFocusHeaderContext();
  const isWriterRole = normRole === 'WRITER' || effectiveRole === 'WRITER';
  const writerStatus = myWriterAssignment?.status;
  const isAwaitingReview =
    writerStatus === 'Submitted' || writerStatus === 'UnderReview' || writerStatus === 'Approved';
  const canSubmitScript =
    Boolean(currentChapter) &&
    !isScriptFrozen &&
    (isProducer ||
      (isWriterRole && Boolean(myWriterAssignment) && !isAwaitingReview && openChangeRequestCount === 0));
  const scriptStageIndex = isScriptFrozen ? 2 : isAwaitingReview ? 1 : 0;

  const submitScriptRef = React.useRef<() => void>(() => {});
  const selectChapterRef = React.useRef(handleSelectChapter);
  useEffect(() => {
    submitScriptRef.current = () => {
      if (isProducer) {
        if (bibleGateResult && !bibleGateResult.isPassed) {
          setBibleGateModalOpen(true);
          return;
        }
        void handleFreezeScript();
        return;
      }
      void handleSubmitScriptToEditor();
    };
    selectChapterRef.current = handleSelectChapter;
  });

  const headerChapters = useMemo(
    () => chapters.map((c) => ({ id: c.id, chapterNumber: c.chapterNumber, title: c.title })),
    [chapters],
  );
  const scriptStages = useMemo(
    () => [
      { id: 'write', label: t('scriptStudio.stages.write') },
      { id: 'review', label: t('scriptStudio.stages.review') },
      { id: 'lock', label: t('scriptStudio.stages.lock') },
    ],
    [t],
  );

  useEffect(() => {
    if (!focusHeader?.isInsideFocusLayout || !currentChapter) return;
    focusHeader.setHeaderConfig({
      seriesTitle: seriesDetail?.title,
      seriesPath: workspaceId && seriesId ? `/workspaces/${workspaceId}/series/${seriesId}/script` : undefined,
      chapters: headerChapters,
      currentChapterId: currentChapter.id,
      onSelectChapter: (id: string) => selectChapterRef.current(id),
      stages: scriptStages,
      currentStageIndex: scriptStageIndex,
      isStageFlowCompleted: isScriptFrozen,
      isSubmittingStage: submittingToEditor || freezingScript,
      onSubmitStage: canSubmitScript ? () => submitScriptRef.current() : undefined,
      submitButtonLabel: isProducer ? t('scriptStudio.submit.producer') : t('scriptStudio.submit.writer'),
    });
  }, [
    focusHeader,
    currentChapter,
    seriesDetail?.title,
    workspaceId,
    seriesId,
    headerChapters,
    scriptStages,
    scriptStageIndex,
    isScriptFrozen,
    submittingToEditor,
    freezingScript,
    canSubmitScript,
    isProducer,
    t,
  ]);

  useEffect(() => {
    return () => {
      focusHeader?.setHeaderConfig(null);
    };
  }, [focusHeader]);

  // Nếu chưa chọn Chapter (hoặc vừa vào trang chưa có query chapterId): Hiển thị màn hình Chọn Chương
  if (!currentChapter) {
    return (
      <div className='w-full flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#FAF8F5] text-[#1C1917] custom-scrollbar'>
        <ChapterSelectionView
          chapters={chapters}
          seriesDetail={seriesDetail}
          canCreateChapter={canCreateChapter}
          loadingChapters={loadingChapters}
          onSelectChapter={(chap) => handleSelectChapter(chap.id)}
          onCreateChapter={canCreateChapter ? handleCreateNewChapter : undefined}
          onShowToast={notify}
        />
      </div>
    );
  }

  // Con trỏ sang cảnh khác: cập nhật cảnh đang làm việc (cho AI, Lịch sử) mà không đổi URL hay cuộn trang
  const handleCaretSceneChange = (sceneId: string) => {
    if (selectedScene?.id === sceneId) return;
    const detail = chapterScenesDetail.find((sc) => sc.id === sceneId);
    if (detail) setSelectedScene(detail);
  };

  const toggleDrawer = (drawer: NonNullable<typeof activeSideDrawer>) =>
    setActiveSideDrawer((prev) => (prev === drawer ? null : drawer));

  const railItems: ScriptRailItem[] = [
    {
      id: 'outline',
      label: t('scriptStudio.rail.outline'),
      icon: Compass,
      active: activeSideDrawer === 'narrative',
      testId: 'toggle-narrative-context-btn',
      onClick: () => toggleDrawer('narrative'),
    },
    {
      id: 'characters',
      label: t('scriptStudio.rail.characters'),
      icon: User,
      active: activeSideDrawer === 'characters',
      testId: 'rail-characters-btn',
      onClick: () => toggleDrawer('characters'),
    },
    {
      id: 'consistency',
      label: t('scriptStudio.rail.consistency'),
      icon: ShieldCheck,
      active: activeSideDrawer === 'consistency',
      badge: openFindingsCount,
      busy: loadingConsistency,
      disabled: loadingConsistency || !currentChapter?.id,
      testId: 'run-consistency-check-btn',
      onClick: handleRunConsistencyCheck,
    },
    ...(changeRequests.length > 0 || writerAssignmentStatus === 'ReworkRequired'
      ? [
          {
            id: 'change-requests',
            label: t('writerChangeRequests.toggle'),
            icon: ClipboardList,
            tone: openChangeRequestCount > 0 ? 'warn' : 'default',
            active: activeSideDrawer === 'changeRequests',
            badge: openChangeRequestCount,
            busy: loadingChangeRequests,
            testId: 'writer-change-requests-btn',
            onClick: () => toggleDrawer('changeRequests'),
          } satisfies ScriptRailItem,
        ]
      : []),
    ...(canEditScript && !isChapterLocked
      ? [
          {
            id: 'import',
            label: t('scriptStudio.rail.import'),
            icon: FileInput,
            testId: 'rail-import-btn',
            onClick: () => {
              setEditorMode('flow');
              setImportRequestKey((k) => k + 1);
            },
          } satisfies ScriptRailItem,
          {
            id: 'ai',
            label: t('scriptStudio.rail.ai'),
            icon: Sparkles,
            tone: 'ai',
            testId: 'rail-ai-btn',
            menu: [
              {
                id: 'draft',
                label: t('scriptStudio.ai.draft'),
                hint: selectedScene ? undefined : t('scriptStudio.ai.needScene'),
                disabled: !selectedScene,
                testId: 'open-ai-draft-btn',
                onSelect: () => setAiPanelOpen(true),
              },
              {
                id: 'storyboard',
                label: t('scriptStudio.ai.storyboard'),
                hint: !selectedScene
                  ? t('scriptStudio.ai.needScene')
                  : sceneHasPanels
                    ? t('scriptStudio.ai.storyboardLocked')
                    : undefined,
                disabled: !selectedScene,
                testId: 'open-ai-storyboard-btn',
                onSelect: () => setStoryboardPanelOpen(true),
              },
            ],
          } satisfies ScriptRailItem,
        ]
      : []),
    {
      id: 'history',
      label: t('scriptStudio.rail.history'),
      icon: History,
      disabled: !selectedScene,
      testId: 'open-script-history-btn',
      onClick: () => setHistoryOpen(true),
    },
  ];

  const railFooterItems: ScriptRailItem[] = [
    {
      id: 'scenes',
      label: t('scriptStudio.rail.scenes'),
      icon: Clapperboard,
      active: activeSideDrawer === 'scenes',
      testId: 'rail-scenes-btn',
      onClick: () => toggleDrawer('scenes'),
    },
    {
      id: 'bible-gate',
      label: t('scriptStudio.rail.bibleGate'),
      icon: ShieldCheck,
      tone: bibleGateResult ? (bibleGateResult.isPassed ? 'ok' : 'warn') : 'default',
      busy: loadingBibleGate,
      testId: 'chapter-bible-gate-btn',
      onClick: () => setBibleGateModalOpen(true),
    },
  ];

  const viewModes = [
    { mode: 'flow', icon: FileText, label: t('scriptStudio.views.paper'), testId: 'tab-flow' },
    { mode: 'cards', icon: Layers, label: t('scriptStudio.views.cards'), testId: 'tab-cards' },
  ] as const;

  const viewSwitcher = (
    <div
      role='group'
      aria-label={t('scriptStudio.views.label')}
      className='flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 shrink-0'
    >
      {viewModes.map(({ mode, icon: Icon, label, testId }) => {
        const isActive = editorMode === mode;
        return (
          <button
            key={mode}
            type='button'
            data-testid={testId}
            aria-pressed={isActive}
            title={label}
            onClick={() => setEditorMode(mode)}
            aria-label={label}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
              isActive ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Icon className='w-4 h-4' />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className='flex-1 flex flex-col bg-[#F3F0E9] h-[calc(100vh-64px)] overflow-hidden text-[#1C1917]'>
      <UnsavedChangesBar
        isDirty={hasUnsavedChanges}
        isWarn={barWarn}
        count={(isStoryArcDirty ? 1 : 0) + (isOutlineDirty ? 1 : 0)}
        onSave={async () => {
          if (isStoryArcDirty) await handleSaveStoryArc();
          if (isOutlineDirty) await handleSaveOutline();
        }}
        onDiscard={() => {
          setStoryArcInput(seriesDetail?.storyArc || '');
          setOutlineInput(currentChapter?.outline || '');
          if (storyArcDraftKey) clearDraft(storyArcDraftKey);
          if (outlineDraftKey) clearDraft(outlineDraftKey);
        }}
        isSaving={savingStoryArc || savingOutline}
      />
      {/* NFR-09: Thanh trạng thái kết nối & hàng đợi ngoại tuyến */}
      <OfflineStatusBanner className='px-4 py-2 border-b border-[#D8D2C5]' />

      {/* Khôi phục bản nháp cục bộ chưa lưu (sau khi hết phiên / rớt mạng / đóng tab) */}
      {(['storyArc', 'outline'] as const).map((kind) => {
        const draft = restorable[kind];
        const key = kind === 'storyArc' ? storyArcDraftKey : outlineDraftKey;
        if (!draft || !key) return null;
        const label =
          kind === 'storyArc'
            ? 'Story Arc'
            : `Đề cương Chương ${currentChapter?.chapterNumber ?? ''}`;
        return (
          <div
            key={kind}
            role='status'
            data-testid={`draft-restore-${kind}`}
            className='px-4 py-2 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center gap-2 text-xs text-amber-900'
          >
            <span className='font-medium'>
              Có bản nháp {label} chưa lưu lúc{' '}
              {new Date(draft.savedAt).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
              .
            </span>
            <button
              type='button'
              onClick={() => {
                (kind === 'storyArc' ? setStoryArcInput : setOutlineInput)(draft.text);
                if (kind === 'outline') setActiveSideDrawer('narrative');
                setRestorable((p) => ({ ...p, [kind]: undefined }));
              }}
              className='px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 cursor-pointer'
            >
              Khôi phục
            </button>
            <button
              type='button'
              onClick={() => {
                clearDraft(key);
                setRestorable((p) => ({ ...p, [kind]: undefined }));
              }}
              className='px-2.5 py-1 rounded-lg border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer'
            >
              Bỏ bản nháp
            </button>
          </div>
        );
      })}

      {/* 2. Thanh thông báo ngắn gọn gom thông báo chỉ đọc & xung đột */}
      {(concurrencyError || isChapterLocked || !canEditScript || loadError) && (
        <div className='px-4 py-2.5 bg-white border-b border-[#E7E2D9] shrink-0 text-xs space-y-2'>
          {concurrencyError && (
            <div
              data-testid='concurrency-error-banner'
              className='p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800'
            >
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
                <span className='text-xs font-medium'>{concurrencyError}</span>
              </div>
              <button
                type='button'
                onClick={() => setConcurrencyError(null)}
                className='text-rose-500 hover:text-rose-700 cursor-pointer p-0.5'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          )}

          {loadError && (
            <div className='p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
                <span className='text-xs font-medium'>{loadError}</span>
              </div>
              <button
                type='button'
                onClick={() => {
                  if (currentChapter?.id) loadScenes();
                }}
                className='text-xs font-bold text-rose-700 underline cursor-pointer'
              >
                Thử lại
              </button>
            </div>
          )}

          {isScriptFrozen && (
            <div
              data-testid='script-frozen-banner'
              className='p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-indigo-950 shadow-xs'
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <div className='w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700 shrink-0'>
                  <Lock className='w-4 h-4' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-xs uppercase tracking-wider bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded inline-flex items-center gap-1.5'>
                      <span>🔒 Kịch bản đã đóng băng (Frozen / Read-only)</span>
                      {currentChapter?.scriptContentHash && (
                        <span
                          className='font-mono font-semibold text-[10px] text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-300'
                          title={`SHA-256: ${currentChapter.scriptContentHash}`}
                          data-testid='frozen-script-hash-badge'
                        >
                          #{currentChapter.scriptContentHash.slice(0, 8)}
                        </span>
                      )}
                    </span>
                    <span className='text-[11px] text-indigo-700 font-medium'>
                      Đã chuyển giao cho Artist dựng Thumbnail &amp; Layout
                    </span>
                  </div>
                  <p className='text-[11px] text-indigo-800/80 mt-0.5'>
                    Writer không thể sửa trực tiếp kịch bản để tránh xung đột khung tranh của hoạ
                    sĩ. Thẻ xem nhanh vẫn dùng được qua hover hoặc Ctrl+.
                  </p>
                </div>
              </div>

              {normRole === 'PRODUCER' && (
                <button
                  type='button'
                  disabled={freezingScript}
                  onClick={() => void handleUnfreezeScript()}
                  className='px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5'
                >
                  <RefreshCw className='w-3.5 h-3.5' />
                  <span>Mở lại kịch bản (Unfreeze)</span>
                </button>
              )}
            </div>
          )}

          {isChapterLocked && !isScriptFrozen && (
            <div
              data-testid='chapter-locked-banner'
              className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-amber-900'
            >
              <div className='flex items-center gap-2'>
                <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0' />
                <span className='text-xs font-medium'>
                  Chương này đã ở trạng thái <strong>{currentChapter?.status}</strong> — Kịch bản ở
                  chế độ chỉ đọc để bảo vệ tính toàn vẹn sản xuất. Thẻ xem nhanh vẫn dùng được qua hover hoặc Ctrl+.
                </span>
              </div>
              <span className='text-xs font-bold uppercase tracking-wider bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-full shrink-0'>
                Chỉ đọc
              </span>
            </div>
          )}

          {isWriterBlockedByOther && !isChapterLocked ? (
            <div
              data-testid='writer-not-assigned-banner'
              className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-amber-900'
            >
              <div className='flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 text-amber-600 shrink-0' />
                <span className='text-xs font-medium'>
                  Chế độ chỉ đọc: Kịch bản chương này đã được giao cho Writer khác
                  {assignedWriterNames ? ` (${assignedWriterNames})` : ''}. Chỉ người được giao hoặc Producer mới có quyền chỉnh sửa.
                </span>
              </div>
              <span className='text-xs font-bold uppercase tracking-wider bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-full shrink-0'>
                Đã giao người khác
              </span>
            </div>
          ) : !canEditScript && !isChapterLocked ? (
            <div
              data-testid='role-view-only-banner'
              className='p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-blue-900'
            >
              <div className='flex items-center gap-2'>
                <Info className='w-4 h-4 text-blue-600 shrink-0' />
                <span className='text-xs font-medium'>
                  Chế độ xem: Bạn đang xem kịch bản với quyền tham khảo. Chỉ vai trò{' '}
                  <strong>Producer</strong> hoặc <strong>Writer</strong> được phân công mới có quyền tạo và chỉnh
                  sửa kịch bản.
                </span>
              </div>
              <span className='text-xs font-bold uppercase tracking-wider bg-blue-200/90 text-blue-900 px-2.5 py-0.5 rounded-full shrink-0'>
                Tham khảo
              </span>
            </div>
          ) : null}
        </div>
      )}

      <h1 className='sr-only'>Biên Soạn Kịch Bản Phân Cảnh (Script Editor)</h1>

      {/* 3. Bàn viết: thanh biểu tượng (trái) | ngăn kéo phân cảnh | trang giấy (giữa) | drawers (phải) */}
      <div className='flex-1 flex overflow-hidden relative'>
        <ScriptStudioRail
          ariaLabel={t('scriptStudio.rail.label')}
          items={railItems}
          footerItems={railFooterItems}
        />

        {activeSideDrawer === 'scenes' && (
          <ScriptScenesDrawer
            scenes={filteredScenes}
            selectedSceneId={selectedScene?.id}
            canEdit={canEditScript && !isChapterLocked}
            onSelect={handleSelectScene}
            onAdd={handleOpenCreateScene}
            onRenameSelected={handleOpenEditScene}
            onDelete={(s) => setSceneToDelete(s)}
            onClose={() => setActiveSideDrawer(null)}
            onDeleteChapter={
              isProducer && currentChapter && !isChapterLocked
                ? () => setChapterToDelete(currentChapter)
                : undefined
            }
          />
        )}

        <div className='flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F3F0E9]'>
          {(loadingScenes || loadingChapters || loadingDetail) &&
          chapterScenesDetail.length === 0 &&
          !selectedScene ? (
            <div className='flex-1 flex flex-col items-center justify-center text-center p-12 text-stone-500'>
              <RefreshCw className='w-6 h-6 animate-spin text-[#C2410C] mb-3' />
              <p className='font-serif text-base text-stone-800'>Đang nạp kịch bản…</p>
            </div>
          ) : editorMode === 'flow' ? (
            <ScreenplayFlowEditor
              key={currentChapter?.id || 'flow-editor'}
              chapterId={currentChapter?.id}
              chapterNumber={currentChapter?.chapterNumber}
              chapterVersion={currentChapter?.versionVector ?? 0}
              scenes={
                chapterScenesDetail.length > 0
                  ? chapterScenesDetail
                  : selectedScene
                    ? [selectedScene]
                    : []
              }
              allBibleEntries={allBibleEntries}
              consistencyFindings={findings}
              canEditScript={canEditScript}
              isChapterLocked={isChapterLocked}
              scriptContentHash={currentChapter?.scriptContentHash}
              getSpeakerName={getSpeakerName}
              onSaveLines={handleSaveFlowLines}
              onCreateStub={handleCreateStubEntity}
              onShowToast={onShowToast}
              importRequestKey={importRequestKey}
              onActiveSceneChange={handleCaretSceneChange}
              dockLeading={viewSwitcher}
              manuscriptTitle={formatChapterOption(currentChapter.chapterNumber, currentChapter.title)}
            />
          ) : (
            <div className='flex-1 min-h-0 flex flex-col'>
              <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar'>
                {!selectedScene ? (
                  <p className='text-center text-sm text-stone-500 py-20'>{t('scriptStudio.ai.needScene')}</p>
                ) : (
                  <div className='max-w-3xl mx-auto w-full px-4 py-8 space-y-3'>
                    <div className='flex items-center justify-between gap-3 pb-2'>
                      <div className='min-w-0'>
                        <p className='text-xs uppercase tracking-[0.14em] text-stone-500'>
                          {formatChapterOption(currentChapter.chapterNumber, currentChapter.title)}
                        </p>
                        <h2 className='font-serif text-xl text-stone-900 truncate'>
                          {selectedScene.heading ||
                            t('scriptStudio.scenes.scene', { n: selectedScene.sceneNumber })}
                        </h2>
                      </div>
                      {canEditScript && !isChapterLocked && (
                        <button
                          type='button'
                          data-testid='open-add-line-btn'
                          onClick={handleOpenAddLine}
                          className='btn-cta-primary shrink-0'
                        >
                          <Plus className='w-4 h-4' />
                          <span>Thêm dòng</span>
                        </button>
                      )}
                    </div>
                    {loadingDetail ? (
                      <div className='flex items-center justify-center py-16 text-stone-500 text-sm'>
                        <RefreshCw className='w-4 h-4 animate-spin mr-2 text-[#C2410C]' />
                        Đang nạp chi tiết phân cảnh…
                      </div>
                    ) : !selectedScene.scriptLines || selectedScene.scriptLines.length === 0 ? (
                      <p className='text-center py-16 text-sm text-stone-500'>
                        Phân cảnh này chưa có dòng kịch bản nào.
                      </p>
                    ) : (
                      selectedScene.scriptLines.map((line, index) => {
                        const lineFinding = findings.find(
                          (f) =>
                            f.scriptLineId === line.id &&
                            f.status !== 'Resolved' &&
                            f.status !== 'Rejected' &&
                            f.status !== 'Ignored' &&
                            f.status !== 'Stale',
                        );
                        return (
                          <ScriptLineItem
                            key={line.id}
                            line={line}
                            index={index}
                            speakerName={getSpeakerName(line.speakerCharacterId)}
                            character={characters.find((c) => c.id === line.speakerCharacterId)}
                            allBibleEntries={allBibleEntries}
                            isFirst={index === 0}
                            isLast={index === (selectedScene.scriptLines?.length || 0) - 1}
                            canEditScript={canEditScript}
                            isChapterLocked={isChapterLocked}
                            isReorderingLines={isReorderingLines}
                            isDragging={draggedLineIndex === index}
                            isDragOver={dragOverLineIndex === index && draggedLineIndex !== index}
                            isHighlighted={highlightedLineId === line.id}
                            lineFinding={lineFinding}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={() => {
                              setDraggedLineIndex(null);
                              setDragOverLineIndex(null);
                            }}
                            onDrop={handleDrop}
                            onMoveLine={handleMoveLine}
                            onEditLine={handleOpenEditLine}
                            onDeleteLine={handleDeleteLine}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <div className='shrink-0 border-t border-stone-200/80 bg-[#FCFBF8]/95 px-3 sm:px-5 py-2 flex items-center'>
                {viewSwitcher}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Secondary Panels (Drawers) */}
        {/* 1. Drawer Đề Cương & Bối Cảnh */}
        <NarrativeContextDrawer
          isOpen={activeSideDrawer === 'narrative'}
          onClose={() => setActiveSideDrawer(null)}
          storyArcInput={storyArcInput}
          setStoryArcInput={setStoryArcInput}
          outlineInput={outlineInput}
          setOutlineInput={setOutlineInput}
          currentChapter={currentChapter}
          canEditScript={canEditScript}
          isChapterLocked={isChapterLocked}
          savingStoryArc={savingStoryArc}
          savingOutline={savingOutline}
          onSaveStoryArc={handleSaveStoryArc}
          onSaveOutline={handleSaveOutline}
          isStoryArcDirty={isStoryArcDirty}
          isOutlineDirty={isOutlineDirty}
        />

        {/* 2. Drawer Kiểm Tra Nhất Quán */}
        <ConsistencyFindingsDrawer
          isOpen={activeSideDrawer === 'consistency'}
          onClose={() => setActiveSideDrawer(null)}
          findings={findings}
          loadingConsistency={loadingConsistency}
          onRunCheck={handleRunConsistencyCheck}
          onScrollToLine={handleScrollToLine}
          disabledCheck={!currentChapter?.id}
        />

        {/* 3. Drawer Danh Mục Nhân Vật Series Bible */}
        <BibleCharactersDrawer
          isOpen={activeSideDrawer === 'characters'}
          onClose={() => setActiveSideDrawer(null)}
          characters={characters}
        />

        <WriterChangeRequestsDrawer
          isOpen={activeSideDrawer === 'changeRequests'}
          onClose={() => setActiveSideDrawer(null)}
          changeRequests={changeRequests}
          loading={loadingChangeRequests}
          generalNote={myWriterAssignment?.lastFeedbackComment}
          canResolve={isAssignedWriter && !isScriptFrozen}
          onResolve={handleResolveChangeRequest}
          onJump={handleJumpToChangeRequest}
        />
      </div>

      {/* Trợ lý AI viết nháp kịch bản */}
      {aiPanelOpen && seriesId && currentChapter?.id && selectedScene?.id && (
        <AiAssistPanel
          key={selectedScene.id}
          seriesId={seriesId}
          chapterId={currentChapter.id}
          sceneId={selectedScene.id}
          workflowType='Script'
          suggestionKind='Script'
          title='Trợ lý AI · Viết nháp script'
          briefLabel='Brief cho bản nháp (tối đa 4000 ký tự)'
          briefPlaceholder='Mô tả diễn biến, giọng điệu, nhân vật cần xuất hiện trong cảnh này...'
          runLabel='Viết nháp'
          readingDirection={aiReadingDirection}
          chapterVersion={currentChapter.versionVector}
          nameById={aiNameById}
          onClose={() => setAiPanelOpen(false)}
          onReload={handleAiReload}
        />
      )}

      {/* Trợ lý AI Phân khung Storyboard */}
      {storyboardPanelOpen && seriesId && currentChapter?.id && selectedScene?.id && (
        <AiAssistPanel
          key={`storyboard-${selectedScene.id}`}
          seriesId={seriesId}
          chapterId={currentChapter.id}
          sceneId={selectedScene.id}
          workflowType='Storyboard'
          suggestionKind='Layout'
          title='Trợ lý AI · Phân khung Storyboard'
          briefLabel='Brief / Định hướng phân khung (tối đa 4000 ký tự)'
          briefPlaceholder='Mô tả định hướng phân khung: số khung mong muốn, nhịp điệu (nhanh/chậm), khung cao trào...'
          runLabel='Phân khung'
          readingDirection={aiReadingDirection}
          chapterVersion={currentChapter.versionVector}
          nameById={aiNameById}
          hasPanels={sceneHasPanels}
          onClose={() => setStoryboardPanelOpen(false)}
          onReload={handleAiReload}
        />
      )}

      {/* Lịch sử phiên bản kịch bản (UC-13) */}
      {historyOpen && seriesId && currentChapter?.id && selectedScene?.id && (
        <ScriptHistoryModal
          key={selectedScene.id}
          seriesId={seriesId}
          chapterId={currentChapter.id}
          sceneId={selectedScene.id}
          chapterVersion={currentChapter.versionVector}
          currentLines={selectedScene.scriptLines ?? []}
          canRestore={
            canEditScript && (!currentChapter.status || currentChapter.status === 'InProduction')
          }
          nameById={aiNameById}
          onClose={() => setHistoryOpen(false)}
          onRestored={async (res) => {
            setConcurrencyError(null);
            setCurrentChapter((prev) =>
              prev ? { ...prev, versionVector: res.chapterVersion } : null,
            );
            notify(
              'Đã khôi phục kịch bản',
              `Đã khôi phục về v${res.restoredFromVersionNumber}; tạo phiên bản mới v${res.versionNumber}.`,
            );
            await loadSceneDetail(selectedScene.id);
          }}
          onConflict={async (msg) => {
            notify('Xung đột phiên bản (409 CONFLICT)', msg);
            await handleAiReload();
          }}
        />
      )}

      {/* MODAL: Tạo / Sửa Phân cảnh */}
      {sceneModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in'>
          <div className='bg-[#FCFBF8] rounded-2xl max-w-md w-full border border-[#D8D2C5] shadow-2xl p-6'>
            <div className='flex items-center justify-between pb-3 border-b border-[#D8D2C5] mb-4'>
              <h3 className='text-sm md:text-base font-bold font-serif text-[#1C1917]'>
                {isEditingScene ? 'Sửa Phân Cảnh' : 'Tạo Phân Cảnh Mới'}
              </h3>
              <button
                type='button'
                onClick={() => setSceneModalOpen(false)}
                className='text-[#57534E] hover:text-[#1C1917] cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmitScene} className='space-y-4'>
              {!isEditingScene && (
                <div>
                  <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                    Số thứ tự cảnh (Scene Number)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={sceneNumberInput}
                    onChange={(e) => setSceneNumberInput(parseInt(e.target.value, 10) || 1)}
                    className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                    required
                  />
                </div>
              )}

              <div>
                <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                  Tiêu đề phân cảnh (Heading)
                </label>
                <input
                  type='text'
                  placeholder='Ví dụ: Cảnh 1: Neo Tokyo - Đêm tuyết rơi'
                  value={sceneHeadingInput}
                  onChange={(e) => setSceneHeadingInput(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                  Tóm tắt phân cảnh (Summary)
                </label>
                <textarea
                  rows={3}
                  placeholder='Mô tả ngắn gọn bối cảnh và diễn biến trong cảnh này...'
                  value={sceneSummaryInput}
                  onChange={(e) => setSceneSummaryInput(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] resize-none'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
                  <Compass className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Chế độ kể chuyện mặc định (Default Narration Mode)</span>
                </label>
                <select
                  data-testid='scene-default-narration-mode-select'
                  value={sceneDefaultNarrationMode}
                  onChange={(e) => setSceneDefaultNarrationMode(e.target.value as NarrationMode)}
                  className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] cursor-pointer'
                >
                  <option value='Present'>Hiện tại / Mặc định (Present)</option>
                  <option value='Flashback'>Hồi tưởng (Flashback)</option>
                  <option value='Dream'>Giấc mơ (Dream)</option>
                  <option value='Imagination'>Tưởng tượng (Imagination)</option>
                  <option value='Lie'>Lời nói dối (Lie)</option>
                  <option value='Rumor'>Tin đồn (Rumor)</option>
                  <option value='UnreliableNarrator'>
                    Người kể không đáng tin (Unreliable Narrator)
                  </option>
                </select>
                <p className='text-xs text-[#57534E] mt-1'>
                  Các dòng kịch bản mới thêm vào phân cảnh này sẽ tự động kế thừa chế độ kể chuyện
                  tương ứng.
                </p>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
                <button
                  type='button'
                  onClick={() => setSceneModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] rounded-xl cursor-pointer'
                >
                  Huỷ
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer'
                >
                  {submitting ? 'Đang lưu...' : isEditingScene ? 'Cập Nhật Cảnh' : 'Tạo Cảnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm / Sửa Dòng Kịch Bản (UC-06) */}
      {lineModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in'>
          <div
            data-testid='line-modal'
            className='bg-[#FCFBF8] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#D8D2C5] shadow-2xl overflow-hidden'
          >
            <div className='flex items-center justify-between px-5 py-3 border-b border-[#D8D2C5] shrink-0'>
              <div>
                <h3 className='text-sm md:text-base font-bold font-serif text-[#1C1917]'>
                  {editingLine
                    ? `Sửa Dòng Kịch Bản #${editingLine.lineOrder}`
                    : 'Thêm Dòng Kịch Bản Mới (UC-06)'}
                </h3>
                <p className='text-xs text-[#57534E]'>
                  Mốc kịch bản hiện tại: <strong>v{currentChapter?.versionVector}</strong>
                </p>
              </div>
              <button
                type='button'
                onClick={() => setLineModalOpen(false)}
                className='text-[#57534E] hover:text-[#1C1917] cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmitLine} className='flex flex-col min-h-0 flex-1'>
              <div className='px-5 py-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {/* Chọn Người nói (Speaker) - Không ép buộc người nói */}
                  <div>
                    <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
                      <User className='w-3.5 h-3.5 text-[#C2410C]' />
                      <span>Nhân vật nói (Speaker Character)</span>
                    </label>
                    <select
                      value={lineSpeakerId}
                      onChange={(e) => setLineSpeakerId(e.target.value)}
                      className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] cursor-pointer'
                    >
                      <option value=''>-- Không có người nói (Lời dẫn ngoài / Hành động) --</option>
                      {characters.map((char) => (
                        <option key={char.id} value={char.id}>
                          {getBibleEntryNameWithStage(char)}
                        </option>
                      ))}
                    </select>
                    <p className='text-[11px] text-[#57534E] mt-1'>
                      Lấy từ Series Bible, giúp Letterer đặt đúng bóng thoại.
                    </p>
                  </div>

                  {/* Ngoại lệ trần thuật (Narration Mode) */}
                  <div>
                    <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
                      <Compass className='w-3.5 h-3.5 text-purple-600' />
                      <span>Ngoại lệ trần thuật (Narration Mode)</span>
                    </label>
                    <select
                      data-testid='line-narration-mode-select'
                      value={lineNarrationMode}
                      onChange={(e) => setLineNarrationMode(e.target.value as NarrationMode)}
                      className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-purple-500 bg-[#FCFBF8] text-[#1C1917] cursor-pointer'
                    >
                      <option value='Present'>
                        Hiện tại / Mặc định (Present - Kiểm tra toàn bộ)
                      </option>
                      <option value='Flashback'>
                        Hồi tưởng (Flashback - Cho phép nhân vật đã mất phát biểu)
                      </option>
                      <option value='Dream'>
                        Giấc mơ (Dream - Cho phép phi thực tế, bỏ qua đạo cụ/bí mật)
                      </option>
                      <option value='Imagination'>
                        Tưởng tượng (Imagination - Bỏ qua ràng buộc canon)
                      </option>
                      <option value='Lie'>
                        Lời nói dối (Lie - Cho phép nói sai lệch bí mật chưa tiết lộ)
                      </option>
                      <option value='Rumor'>
                        Tin đồn (Rumor - Cho phép thông tin truyền miệng chưa xác nhận)
                      </option>
                      <option value='UnreliableNarrator'>
                        Người kể không đáng tin (Hạ cảnh báo xuống Warning)
                      </option>
                    </select>
                    <p className='text-[11px] text-[#57534E] mt-1'>
                      Ngoại lệ có chủ ý để Kiểm tra nhất quán không báo lỗi sai.
                    </p>
                  </div>
                </div>

                {/* Lời thoại (Dialogue) */}
                <div>
                  <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
                    <MessageSquare className='w-3.5 h-3.5 text-[#C2410C]' />
                    <span>Lời thoại (Dialogue Text)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder='Nhập lời thoại của nhân vật...'
                    value={lineDialogue}
                    onChange={(e) => setLineDialogue(e.target.value)}
                    maxLength={4000}
                    className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] resize-none font-serif leading-relaxed'
                  />
                </div>

                {/* Chỉ dẫn cảnh (Stage Direction) */}
                <div>
                  <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
                    <Clapperboard className='w-3.5 h-3.5 text-[#57534E]' />
                    <span>Chỉ dẫn cảnh / Hành động (Stage Direction)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder='Ví dụ: (Akira quay đầu lại nhìn với vẻ kinh ngạc, tay nắm chặt thanh kiếm...)'
                    value={lineStageDirection}
                    onChange={(e) => setLineStageDirection(e.target.value)}
                    maxLength={4000}
                    className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] resize-none italic'
                  />
                </div>

                {/* Liên kết Series Bible (UC-06) */}
                <div>
                  <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                      <BookOpen className='w-3.5 h-3.5 text-purple-600' />
                      <span>Liên kết Series Bible (Địa điểm, Đạo cụ, Nhân vật, Thuật ngữ...)</span>
                    </div>
                    <span className='text-xs text-[#57534E] font-normal'>
                      Đã chọn {lineBibleEntryIds.length}/20 mục
                    </span>
                  </label>
                  <div className='max-h-28 overflow-y-auto border border-[#D8D2C5] rounded-xl p-2.5 bg-[#F8F6F0] custom-scrollbar'>
                    {allBibleEntries.length === 0 ? (
                      <p className='text-xs text-[#57534E] italic'>
                        Series Bible chưa có mục nào hoặc đang tải.
                      </p>
                    ) : (
                      <div className='flex flex-wrap gap-1.5'>
                        {allBibleEntries.map((entry) => {
                          const isChecked = lineBibleEntryIds.includes(entry.id);
                          return (
                            <button
                              key={entry.id}
                              type='button'
                              onClick={() => {
                                setLineBibleEntryIds((prev) =>
                                  isChecked
                                    ? prev.filter((id) => id !== entry.id)
                                    : prev.length < 20
                                      ? [...prev, entry.id]
                                      : prev,
                                );
                              }}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-purple-100 border-purple-300 text-purple-800 font-semibold shadow-2xs'
                                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-purple-200 hover:bg-purple-50/30'
                              }`}
                            >
                              <span>{getBibleEntryNameWithStage(entry)}</span>
                              {isChecked ? (
                                <CheckCircle2 className='w-3.5 h-3.5 text-purple-700' />
                              ) : (
                                <Plus className='w-3.5 h-3.5 text-zinc-400' />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vị trí chèn nếu tạo mới */}
                {!editingLine && (
                  <div>
                    <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                      Thứ tự dòng (Line Order)
                    </label>
                    <input
                      type='number'
                      min={1}
                      value={lineOrderInput}
                      onChange={(e) => setLineOrderInput(parseInt(e.target.value, 10) || 1)}
                      className='w-32 px-3 py-1.5 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                    />
                    <span className='text-xs text-[#57534E] ml-2'>
                      Trùng số sẽ tự động chèn và dịch các dòng sau xuống.
                    </span>
                  </div>
                )}
              </div>

              {/* Nút luôn hiện ở đáy modal, không cuộn theo nội dung */}
              <div className='flex justify-end gap-2 px-5 py-3 border-t border-[#D8D2C5] bg-[#FCFBF8] shrink-0'>
                <button
                  type='button'
                  onClick={() => setLineModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] rounded-xl cursor-pointer'
                >
                  Huỷ
                </button>
                <button
                  data-testid='submit-line-btn'
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer'
                >
                  {submitting ? 'Đang lưu...' : editingLine ? 'Lưu Thay Đổi' : 'Thêm Dòng Kịch Bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Concurrency Conflict Modal (BR-11 / NFR-09) */}
      <ElementConflictModal
        isOpen={conflictModalOpen}
        title='Xung Đột Phiên Bản Kịch Bản (BR-11)'
        subtitle='Optimistic Concurrency Control — SCRIPT_VERSION_CONFLICT'
        entityType='Dòng kịch bản / Phân cảnh'
        elementId={conflictEntityId}
        errorMessage={conflictErrorMsg}
        onReload={async () => {
          if (currentChapter?.id) await refreshChapterDetail(currentChapter.id);
          if (selectedScene?.id) await loadSceneDetail(selectedScene.id);
          setConcurrencyError(null);
        }}
        onClose={() => setConflictModalOpen(false)}
      />


      {/* Lucian #269: Type-to-Confirm Modal Xoá Chương (Destructive Chapter Delete) */}
      {chapterToDelete && (
        <TypeToConfirmModal
          isOpen={Boolean(chapterToDelete)}
          targetName={`Chương ${chapterToDelete.chapterNumber}`}
          title={`Xoá vĩnh viễn Chương ${chapterToDelete.chapterNumber}?`}
          description={`Cảnh báo: Hành động này sẽ xoá mềm toàn bộ phân cảnh và kịch bản của Chương ${chapterToDelete.chapterNumber}. Để xác nhận, vui lòng nhập chính xác:`}
          confirmButtonText={isDeletingChapter ? 'Đang xoá...' : 'Xoá chương vĩnh viễn'}
          cancelButtonText='Huỷ bỏ'
          isDeleting={isDeletingChapter}
          onConfirm={handleConfirmDeleteChapter}
          onCancel={() => setChapterToDelete(null)}
        />
      )}

      {/* Lucian #269: Type-to-Confirm Modal Xoá Phân Cảnh (Destructive Scene Delete) */}
      {sceneToDelete && (
        <TypeToConfirmModal
          isOpen={Boolean(sceneToDelete)}
          targetName={`Cảnh ${sceneToDelete.sceneNumber}`}
          title={`Xoá Cảnh ${sceneToDelete.sceneNumber}?`}
          description={`Cảnh báo: Hành động này sẽ xoá Cảnh ${sceneToDelete.sceneNumber} (${sceneToDelete.heading || 'Chưa đặt tiêu đề'}) và toàn bộ dòng kịch bản thuộc phân cảnh này. Để xác nhận, vui lòng nhập chính xác:`}
          confirmButtonText={isDeletingScene ? 'Đang xoá...' : 'Xoá phân cảnh vĩnh viễn'}
          cancelButtonText='Huỷ bỏ'
          isDeleting={isDeletingScene}
          onConfirm={handleConfirmDeleteScene}
          onCancel={() => setSceneToDelete(null)}
        />
      )}

      {/* Chapter-Scoped Bible Gate Modal */}
      {bibleGateModalOpen && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'
        >
          <div className='bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between border-b border-zinc-100 pb-3'>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    bibleGateResult?.isPassed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <ShieldCheck className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='font-bold text-sm text-zinc-900'>
                    Rào chắn Series Bible — Chương {currentChapter?.chapterNumber}
                  </h3>
                  <p className='text-[11px] text-zinc-500'>
                    Kiểm tra các mục Bible xuất hiện trong kịch bản chương này
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setBibleGateModalOpen(false)}
                className='p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {loadingBibleGate ? (
              <div className='py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2'>
                <RefreshCw className='w-5 h-5 animate-spin text-[#F97316]' />
                <span>Đang quét các thực thể xuất hiện trong chương...</span>
              </div>
            ) : bibleGateResult ? (
              <div className='space-y-3'>
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    bibleGateResult.isPassed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div>
                    <span className='font-bold text-xs block'>
                      {bibleGateResult.isPassed
                        ? '✓ Đủ điều kiện đưa vào sản xuất'
                        : `⚠️ Chưa đạt: Còn ${bibleGateResult.pendingCount} mục chưa khóa`}
                    </span>
                    <span className='text-[11px] opacity-80'>
                      Đã khóa {bibleGateResult.lockedCount} /{' '}
                      {bibleGateResult.totalReferencedEntries} mục được thoại/gắn thẻ.
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      bibleGateResult.isPassed
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {bibleGateResult.isPassed ? 'PASSED' : 'BLOCKED'}
                  </span>
                </div>

                <div className='max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar'>
                  {bibleGateResult.items.map((item) => (
                    <div
                      key={item.bibleEntryId}
                      className='p-2.5 rounded-lg border border-zinc-100 bg-[#FAF8F5] flex items-center justify-between gap-2 text-xs'
                    >
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <span className='font-mono font-bold text-[10px] px-1.5 py-0.2 bg-zinc-200 rounded'>
                            {item.code}
                          </span>
                          <span className='font-semibold text-zinc-900 truncate'>{item.name}</span>
                        </div>
                        {item.warningMessage && (
                          <p className='text-[10px] text-rose-700 mt-0.5'>{item.warningMessage}</p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                          item.isLocked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.isLocked ? '🔒 Canon Locked' : 'Chờ khóa'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-xs text-zinc-500 py-4 text-center'>
                Chưa có dữ liệu kiểm tra Bible Gate cho chương này.
              </p>
            )}

            <div className='flex items-center justify-between pt-2 border-t border-zinc-100'>
              <button
                type='button'
                onClick={() => {
                  if (currentChapter?.id) void checkChapterBibleGate(currentChapter.id);
                }}
                className='text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1'
              >
                <RefreshCw className='w-3 h-3' />
                <span>Quét lại</span>
              </button>
              <button
                type='button'
                onClick={() => setBibleGateModalOpen(false)}
                className='px-4 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-semibold'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ScriptEditorView;

