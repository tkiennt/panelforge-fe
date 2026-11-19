import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
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
  Bell,
  CheckCircle2,
  Clock,
  Eye,
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
  Users,
} from 'lucide-react';
import { ChapterCastDto, chapterCastService } from '@/services/chapterCast.service';
import { SetPanelStageModal } from '../components/script/SetPanelStageModal';
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
  ScriptLineKind,
  SCRIPT_WORKING_COPY_CHANGED_EVENT,
  type ScriptWorkingCopyChangedDetail,
  type RestoreScriptRevisionResult,
} from '@/services/scriptLine.service';
import {
  chapterService,
  ChapterDto,
  CreateChapterRequest,
  ScriptStatus,
  ScriptCommentDto,
  ScriptVersionDetailDto,
  type ScriptWorkingCopyDto,
} from '@/services/chapter.service';
import {
  aiAgentsService,
  createsScriptVersionOnAccept,
  type AiSuggestionDto,
  type AiSuggestionKind,
} from '@/services/aiAgents.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { PanelDto } from '@/types/pipeline';
import { generateTempCode, saveTempBibleCode } from '@/shared/utils/tempBibleCodes';
import { ChapterSelectionView } from '../components/script/chapter-selection';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { mapCategoryToTab } from '@/shared/features/series-bible/bibleCategory';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import {
  assignmentService,
  ConsistencyFindingDto,
  ConsistencyCheckResultDto,
} from '@/services/assignment.service';
import { normalizeWorkspaceRole } from '@/types/auth';
import { AiAssistPanel } from '@/shared/features/ai-agents/AiAssistPanel';
import { SuggestionCard } from '@/shared/features/ai-agents/SuggestionCard';
import { toAiReadingDirection } from '@/shared/features/ai-agents/aiViewUtils';
import { ScriptDiffPreview } from '../components/script/flow/ScriptDiffPreview';
import { ScriptLineItem } from '../components/script/ScriptLineItem';
import { NarrativeContextDrawer } from '../components/script/NarrativeContextDrawer';
import { ConsistencyFindingsDrawer } from '../components/script/ConsistencyFindingsDrawer';
import { ScreenplayFlowEditor } from '../components/script/flow/ScreenplayFlowEditor';
import { ScriptReviewSidePanel } from '@/shared/features/script-review/ScriptReviewSidePanel';
import {
  type ScriptDocSnapshot,
  type ChapterScriptBody,
  type ScriptTreePage,
  isValidGuid,
  docToScriptTree,
} from '../components/script/flow/scriptFlowAdapter';
import { BibleCharactersDrawer } from '../components/script/BibleCharactersDrawer';
import { ScriptVersionsDrawer } from '../components/script/versions/ScriptVersionsDrawer';
import { ScriptStudioRail, type ScriptRailItem } from '../components/script/ScriptStudioRail';
import { ScriptScenesDrawer } from '../components/script/ScriptScenesDrawer';
import { parseScenePanelRange, formatSceneSummaryWithPanels } from '../utils/sceneUtils';
import { ScriptChaptersDrawer } from '../components/script/ScriptChaptersDrawer';
import { ScriptStatusDrawer } from '../components/script/ScriptStatusDrawer';
import {
  useScriptDrawers,
  isTestEnvironment,
  type LeftDrawer,
  type RightDrawer,
} from '../components/script/useScriptDrawers';
import { ScriptStatusBar } from '../components/script/ScriptStatusBar';
import { ScriptHeader } from '../components/script/ScriptHeader';
import { useFocusHeaderContext } from '@/app/FocusWorkspaceLayout';
import { FileInput } from 'lucide-react';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { saveDraft, clearDraft, readRestorableDraft, type LocalDraft } from '@/lib/localDraft';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';
import {
  UnsavedChangesBar,
  LucianConfirmModal,
  TypeToConfirmModal,
} from '@/shared/components/lucian';
import { useTranslation } from '@/lib/i18n';
import { ReasonForm } from '@/shared/components/ReasonForm';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { Modal } from '@/shared/ui';

interface ScriptEditorViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
  currentUserId?: string | null;
}

import { formatChapterOption } from '../utils/chapterFormat';

/**
 * Trả về tên kèm nhãn biến thể hoặc phụ đề để phân biệt các phiên bản nhân vật.
 */
const getBibleEntryNameWithStage = (entry?: BibleEntryDto | null): string => {
  if (!entry) return '';
  const variant = entry.effectiveRevision?.variantLabel?.trim() || entry.subtitle?.trim();
  return variant ? `${entry.name} (${variant})` : entry.name;
};

function mergeWorkingCopyIntoState(
  chapterId: string,
  workingCopy: ScriptWorkingCopyDto,
  basePages: PageDto[],
  basePanels: PanelDto[],
  baseScenesDetail: SceneDetailDto[],
  fallbackSceneId?: string | null,
): {
  pages: PageDto[];
  panels: PanelDto[];
  scenesDetail: SceneDetailDto[];
} {
  const rows = workingCopy.rows ?? [];
  const pageNumbers = new Set<number>(basePages.map((p) => p.pageNumber));
  for (const r of rows) {
    if (r.type === 'page' && r.page > 0) pageNumbers.add(r.page);
    if (r.page > 0) pageNumbers.add(r.page);
  }

  const pageByNum = new Map<number, PageDto>();
  for (const p of basePages) pageByNum.set(p.pageNumber, p);
  for (const num of Array.from(pageNumbers).sort((a, b) => a - b)) {
    if (!pageByNum.has(num)) {
      pageByNum.set(num, {
        id: `wc-page-${chapterId}-${num}`,
        chapterId,
        pageNumber: num,
        layoutFormat: 'Default',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 300,
        elementsCount: 0,
      });
    }
  }
  const pages = Array.from(pageByNum.values()).sort((a, b) => a.pageNumber - b.pageNumber);

  const panelRowsByKey = new Map<string, (typeof rows)[number]>();
  const neededPanels = new Set<string>();
  for (const r of rows) {
    if (r.type === 'panel' && r.page > 0 && r.panel > 0) {
      const k = `${r.page}.${r.panel}`;
      panelRowsByKey.set(k, r);
      neededPanels.add(k);
    } else if (r.page > 0 && r.panel > 0) {
      neededPanels.add(`${r.page}.${r.panel}`);
    }
  }

  const pageNumById = new Map<string, number>(pages.map((p) => [p.id, p.pageNumber]));
  const panelByKey = new Map<string, PanelDto>();
  for (const pan of basePanels) {
    const pNo = (pan as any).pageNumber ?? pageNumById.get(pan.pageId);
    if (!pNo) continue;
    const k = `${pNo}.${pan.panelNumber}`;
    const pRow = panelRowsByKey.get(k);
    const nextPan: PanelDto = pRow
      ? ({
          ...pan,
          direction: pRow.text || null,
          ...(pRow.castRevisions?.length
            ? {
                castRevisions: pRow.castRevisions.map((c) => ({
                  bibleEntryId: c.entryId,
                  entryId: c.entryId,
                  revisionId: c.revisionId,
                })),
              }
            : {}),
        } as PanelDto)
      : pan;
    (nextPan as any).pageNumber = pNo;
    panelByKey.set(k, nextPan);
  }

  for (const k of neededPanels) {
    if (panelByKey.has(k)) continue;
    const [pStr, panStr] = k.split('.');
    const pNo = Number(pStr);
    const panNo = Number(panStr);
    const pageObj = pageByNum.get(pNo);
    if (!pageObj) continue;
    const pRow = panelRowsByKey.get(k);
    const synth: any = {
      id: `wc-panel-${chapterId}-${pNo}-${panNo}`,
      pageId: pageObj.id,
      pageNumber: pNo,
      panelNumber: panNo,
      direction: pRow?.text || null,
      boundingBox: '{}',
      readingOrder: panNo,
      createdAt: '',
    };
    if (pRow?.castRevisions?.length) {
      synth.castRevisions = pRow.castRevisions.map((c) => ({
        bibleEntryId: c.entryId,
        entryId: c.entryId,
        revisionId: c.revisionId,
      }));
    }
    panelByKey.set(k, synth as PanelDto);
  }

  const panels = Array.from(panelByKey.values());

  const existingById = new Map<string, { line: SceneScriptLineSummaryDto; sceneId: string }>();
  for (const sc of baseScenesDetail) {
    for (const l of sc.scriptLines ?? []) {
      existingById.set(l.id, { line: l, sceneId: sc.id });
    }
  }

  const defaultSceneId = fallbackSceneId || baseScenesDetail[0]?.id || 'wc-scene';
  const linesByScene = new Map<string, SceneScriptLineSummaryDto[]>();
  for (const sc of baseScenesDetail) {
    linesByScene.set(sc.id, []);
  }

  for (const r of rows) {
    if (!r.key.startsWith('line:')) continue;
    const lineId = r.key.slice(5);
    const prev = existingById.get(lineId);
    const isDialogueOrThought = r.type === 'Dialogue' || r.type === 'Thought';
    const matchedPanel =
      r.page > 0 && r.panel > 0 ? panelByKey.get(`${r.page}.${r.panel}`) : undefined;
    const targetScene = prev?.sceneId ?? defaultSceneId;
    const list = linesByScene.get(targetScene) ?? [];
    const lineDto: any = {
      id: lineId,
      lineOrder: list.length + 1,
      kind: r.type,
      speakerLabel: r.label ?? null,
      text: r.text,
      dialogueText: isDialogueOrThought ? r.text : null,
      stageDirection: !isDialogueOrThought ? r.text : null,
      panelId: r.page > 0 && r.panel > 0 ? (matchedPanel?.id ?? prev?.line.panelId ?? null) : null,
      narrationMode: prev?.line.narrationMode ?? 'Present',
    };
    if (r.refs?.length) {
      lineDto.refs = r.refs.map((ref) => ({
        bibleEntryId: ref.entryId,
        surfaceText: ref.surfaceText,
      }));
    } else if (prev?.line && (prev.line as any).refs) {
      lineDto.refs = (prev.line as any).refs;
    }
    list.push(lineDto);
    linesByScene.set(targetScene, list);
  }

  const scenesDetail: SceneDetailDto[] =
    baseScenesDetail.length > 0
      ? baseScenesDetail.map((sc) => ({
          ...sc,
          scriptLines: linesByScene.get(sc.id) ?? [],
        }))
      : [
          {
            id: defaultSceneId,
            chapterId,
            sceneNumber: 1,
            heading: null,
            summary: null,
            createdAt: '',
            scriptLines: linesByScene.get(defaultSceneId) ?? [],
          },
        ];

  return { pages, panels, scenesDetail };
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  onShowToast,
  workspaceRole,
  currentUserId,
}) => {
  const { t } = useTranslation('production');
  const { t: tReview } = useTranslation('review');
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
  const effectiveRole =
    normRole ||
    (typeof window !== 'undefined'
      ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole'))
      : null);
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
  // D12: Draft ↔ InReview → Frozen. Lưu = commit, Gửi duyệt = push: Editor đọc bản đã gửi,
  // nên khi InReview Writer vẫn sửa và lưu tiếp; chỉ Frozen (và chương đã duyệt/xuất bản) khoá sửa.
  const scriptStatus: ScriptStatus =
    currentChapter?.scriptStatus ?? (currentChapter?.isScriptFrozen ? 'Frozen' : 'Draft');
  const isScriptFrozen = scriptStatus === 'Frozen';
  const isScriptInReview = scriptStatus === 'InReview';
  const isChapterContentLocked =
    currentChapter?.status === 'ChapterApproved' ||
    currentChapter?.status === 'HandedOffAndPublished';
  const isChapterLocked = isScriptFrozen || isChapterContentLocked;

  // Phiên bản mới nhất và bản đang gửi duyệt: khác mã băm = có thay đổi chưa gửi duyệt lại
  const [versionsTick, setVersionsTick] = useState(0);
  const [drawerRefreshTick, setDrawerRefreshTick] = useState(0);
  const [workingCopySyncTick, setWorkingCopySyncTick] = useState(0);
  const flowDirtyRef = useRef(false);
  const reloadInFlightRef = useRef<{ chapterId: string; promise: Promise<void> } | null>(null);
  const [hasUnpushedChanges, setHasUnpushedChanges] = useState(false);
  const [expectedRevisionId, setExpectedRevisionId] = useState<string | null>(null);
  const expectedRevisionIdRef = useRef<string | null>(null);
  useEffect(() => {
    expectedRevisionIdRef.current = expectedRevisionId;
  }, [expectedRevisionId]);

  const editorGetPayloadRef = useRef<(() => ChapterScriptBody) | null>(null);

  useEffect(() => {
    const id = currentChapter?.id;
    if (!id) {
      setExpectedRevisionId(null);
      expectedRevisionIdRef.current = null;
      setHasUnpushedChanges(false);
      return;
    }
    let cancelled = false;
    chapterService
      .getScriptVersions(id)
      .then((list) => {
        if (cancelled) return;
        const latestId = list[0]?.id ?? null;
        setExpectedRevisionId(latestId);
        expectedRevisionIdRef.current = latestId;

        const pushedId = currentChapter?.lastSubmittedVersionId;
        if (pushedId) {
          const pushed = list.find((v) => v.id === pushedId);
          setHasUnpushedChanges(
            !!pushed && !!list[0] && list[0].contentHash !== pushed.contentHash,
          );
        } else {
          setHasUnpushedChanges(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExpectedRevisionId(null);
          expectedRevisionIdRef.current = null;
          setHasUnpushedChanges(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id, currentChapter?.lastSubmittedVersionId, versionsTick]);

  // Hàm lưu của bàn viết, để lưu chữ chưa lưu trước khi gửi duyệt
  const editorSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerEditorSave = useCallback((save: (() => Promise<boolean>) | null) => {
    editorSaveRef.current = save;
  }, []);

  // D12: góp ý theo dòng của Editor / Producer — Writer đọc để tự quyết định có hủy gửi duyệt hay không
  const [scriptComments, setScriptComments] = useState<ScriptCommentDto[]>([]);
  const openScriptComments = scriptComments.filter((c) => !c.resolvedAt);
  useEffect(() => {
    const id = currentChapter?.id;
    if (!id) {
      setScriptComments([]);
      return;
    }
    let cancelled = false;
    if (typeof chapterService.getScriptComments === 'function') {
      chapterService
        .getScriptComments(id)
        .then((list) => !cancelled && setScriptComments(list ?? []))
        .catch(() => !cancelled && setScriptComments([]));
    } else {
      setScriptComments([]);
    }
    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id, currentChapter?.scriptStatus]);

  const [activeCommentLineId, setActiveCommentLineId] = useState<string | null>(null);
  const [pushedVersion, setPushedVersion] = useState<ScriptVersionDetailDto | null>(null);

  useEffect(() => {
    if (!currentChapter?.id || !currentChapter.lastSubmittedVersionId) {
      setPushedVersion(null);
      return;
    }
    let cancelled = false;
    chapterService
      .getScriptVersion(currentChapter.id, currentChapter.lastSubmittedVersionId)
      .then((ver) => {
        if (!cancelled) setPushedVersion(ver);
      })
      .catch(() => {
        if (!cancelled) setPushedVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id, currentChapter?.lastSubmittedVersionId, versionsTick]);

  useEffect(() => {
    if (openScriptComments.length > 0) {
      setActiveRightDrawer((prev) => prev ?? 'comments');
    }
  }, [currentChapter?.id, openScriptComments.length > 0]);
  const [characters, setCharacters] = useState<BibleEntryDto[]>([]);
  const [allBibleEntries, setAllBibleEntries] = useState<BibleEntryDto[]>([]);
  const [submittingToEditor, setSubmittingToEditor] = useState(false);

  // SCR-11 & BIB-16: canEditScript must not fail open when role is unknown; only Writer edits.
  const canEditScript = effectiveRole === 'WRITER';

  // BIB-16: Thực thể chương (Chapter Cast) & Giai đoạn Panel
  const [chapterCast, setChapterCast] = useState<ChapterCastDto | null>(null);
  const [loadingCast, setLoadingCast] = useState(false);
  const [isPanelStageModalOpen, setIsPanelStageModalOpen] = useState(false);
  const [activePanelJump, setActivePanelJump] = useState<{
    pageNumber?: number | null;
    panelNumber?: number | null;
  } | null>(null);
  const setPanelStageRef = useRef<
    ((pageNumber: number, panelNumber: number, castRevisions: any) => void) | null
  >(null);

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
  const userDeletedSceneRef = useRef(false);
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
  const [fromPanelInput, setFromPanelInput] = useState<number>(1);
  const [toPanelInput, setToPanelInput] = useState<number>(1);
  const [sceneSummaryInput, setSceneSummaryInput] = useState<string>('');
  const [sceneDefaultNarrationMode, setSceneDefaultNarrationMode] =
    useState<NarrationMode>('Present');

  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SceneScriptLineSummaryDto | null>(null);
  const [lineSpeakerId, setLineSpeakerId] = useState<string>('');
  const [lineDialogue, setLineDialogue] = useState<string>('');
  const [lineStageDirection, setLineStageDirection] = useState<string>('');
  const [lineOrderInput, setLineOrderInput] = useState<number>(1);
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
  // Side Drawers (Left & Right Drawers Hook)
  const {
    activeLeftDrawer,
    activeRightDrawer,
    setActiveLeftDrawer,
    setActiveRightDrawer,
    toggleLeftDrawer,
    toggleRightDrawer,
  } = useScriptDrawers();
  const [importRequestKey, setImportRequestKey] = useState(0);

  // BIB-16: Nạp danh sách thực thể chương (Chapter Cast)
  const loadChapterCast = useCallback(
    async (chapId?: string) => {
      const id = chapId || currentChapter?.id;
      if (!id) return;
      setLoadingCast(true);
      try {
        const cast = await chapterCastService.getChapterCast(id);
        setChapterCast(cast);
      } catch (err) {
        console.warn('Lỗi nạp thực thể chương (cast):', err);
      } finally {
        setLoadingCast(false);
      }
    },
    [currentChapter?.id],
  );

  const refreshBible = useCallback(async () => {
    if (!seriesId) return;
    try {
      const bibleRes = await bibleService.getSeriesBible(seriesId);
      if (bibleRes && bibleRes.entries) {
        setAllBibleEntries(bibleRes.entries);
        const charList = bibleRes.entries.filter(
          (e) => String(e.category) === 'Character' || e.category === 0,
        );
        setCharacters(charList);
      }
    } catch (err) {
      console.warn('Lỗi tải lại Series Bible:', err);
    }
  }, [seriesId]);

  useEffect(() => {
    if (currentChapter?.id) {
      void loadChapterCast(currentChapter.id);
    } else {
      setChapterCast(null);
    }
  }, [currentChapter?.id, loadChapterCast]);

  // Phím tắt bàn phím: Alt+C (mở chương), Alt+1 (chế độ Giấy), Alt+2 (chế độ Thẻ)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setActiveLeftDrawer((prev) => (prev === 'chapters' ? null : 'chapters'));
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        setEditorMode('flow');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setEditorMode('cards');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // V2.5: Script Freeze Gate
  const [freezingScript, setFreezingScript] = useState(false);
  const [unfreezeReasonOpen, setUnfreezeReasonOpen] = useState(false);

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
        const chapterList = Array.isArray(chapRes) ? chapRes : chapRes?.items || [];
        setChapters(chapterList);

        if (seriesRes) {
          setSeriesDetail(seriesRes);
          setStoryArcInput(seriesRes.storyArc || '');
        }

        if (bibleRes && bibleRes.entries) {
          setAllBibleEntries(bibleRes.entries);
          const charList = bibleRes.entries.filter(
            (entry) => mapCategoryToTab(entry.category) === 'characters',
          );
          setCharacters(charList);
        }

        if (chapterList.length > 0) {
          const matched = chapterList.find((c) =>
            chapterIdFromUrl ? c.id.toLowerCase() === chapterIdFromUrl.toLowerCase() : false,
          );
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
    if (!currentChapter || currentChapter.id.toLowerCase() !== chapterIdFromUrl.toLowerCase()) {
      const found = chapters.find((c) => c.id.toLowerCase() === chapterIdFromUrl.toLowerCase());
      if (found) {
        setCurrentChapter(found);
        setOutlineInput(found.outline || '');
      } else {
        setCurrentChapter(null);
      }
    }
  }, [chapterIdFromUrl, chapters, currentChapter?.id]);

  // Đồng bộ Outline và findings nhất quán khi currentChapter thay đổi
  useEffect(() => {
    if (!currentChapter?.id) {
      setOutlineInput('');
      setFindings([]);
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
  }, [currentChapter?.id, currentChapter?.outline]);

  // 2. Nạp chi tiết Chapter (cập nhật versionVector)
  const refreshChapterDetail = useCallback(async (chapId: string) => {
    try {
      const detail = await chapterService.getChapterById(chapId);
      setCurrentChapter((prev) => (prev ? { ...prev, ...detail } : detail));
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
  const loadPagesAndPanels = useCallback(async (chapId: string): Promise<PanelDto[]> => {
    try {
      const pages = await pageService.getPagesByChapter(chapId);
      setChapterPages(pages || []);
      if (!pages || pages.length === 0) {
        setChapterPanels([]);
        return [];
      }
      const panelsByPages = await Promise.all(
        pages.map((page) => panelService.getPanelsByPage(page.id).catch(() => [])),
      );
      const allPanels: PanelDto[] = [];
      panelsByPages.forEach((list, idx) => {
        list.forEach((p) => {
          (p as any).pageNumber = pages[idx].pageNumber;
          allPanels.push(p);
        });
      });
      setChapterPanels(allPanels);
      return allPanels;
    } catch {
      setChapterPages([]);
      setChapterPanels([]);
      return [];
    }
  }, []);

  const buildFallbackScriptTree = useCallback((): ChapterScriptBody => {
    const linesByPanel = new Map<string, any[]>();
    for (const sc of chapterScenesDetail) {
      for (const line of sc.scriptLines ?? []) {
        if (line.panelId) {
          const list = linesByPanel.get(line.panelId) ?? [];
          list.push(line);
          linesByPanel.set(line.panelId, list);
        }
      }
    }

    const pages: ScriptTreePage[] = chapterPages
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => {
        const panels = chapterPanels
          .filter((panel) => panel.pageId === p.id)
          .sort((a, b) => a.panelNumber - b.panelNumber)
          .map((panel) => {
            const pLines = (linesByPanel.get(panel.id) ?? []).map((l) => ({
              id: isValidGuid(l.id) ? l.id : null,
              kind: l.kind ?? ScriptLineKind.Action,
              speakerLabel: l.speakerLabel ?? null,
              text: l.text ?? l.dialogueText ?? l.stageDirection ?? '',
              refs: (l as any).refs ?? null,
            }));
            const rawCast = (panel as any).castRevisions as
              Array<{ entryId?: string; bibleEntryId?: string; revisionId: string }> | undefined;
            const castRevisions =
              rawCast && rawCast.length > 0
                ? rawCast
                    .map((c) => ({
                      entryId: c.entryId || c.bibleEntryId || '',
                      revisionId: c.revisionId,
                    }))
                    .filter((c) => !!c.entryId && !!c.revisionId)
                : null;
            return {
              id: isValidGuid(panel.id) ? panel.id : null,
              number: panel.panelNumber,
              direction: panel.direction ?? null,
              ...(castRevisions && castRevisions.length > 0 ? { castRevisions } : {}),
              lines: pLines,
            };
          });
        return {
          id: isValidGuid(p.id) ? p.id : null,
          number: p.pageNumber,
          panels,
        };
      });

    return {
      expectedRevisionId: expectedRevisionIdRef.current,
      pages,
    };
  }, [chapterPages, chapterPanels, chapterScenesDetail]);

  /**
   * SCR-14: Lưu toàn bộ kịch bản của chương trong một request duy nhất (PUT /api/chapters/{id}/script).
   */
  const handleSaveScript = useCallback(
    async (snapshotOrBody: ScriptDocSnapshot | ChapterScriptBody) => {
      if (!currentChapter) return;
      const chapterId = currentChapter.id;

      const body: ChapterScriptBody =
        'pages' in snapshotOrBody && !('lines' in snapshotOrBody)
          ? (snapshotOrBody as ChapterScriptBody)
          : ((snapshotOrBody as ScriptDocSnapshot).tree ??
            (editorGetPayloadRef.current
              ? editorGetPayloadRef.current()
              : buildFallbackScriptTree()));
      body.expectedRevisionId = expectedRevisionIdRef.current;

      try {
        const res = await chapterService.saveChapterScript(chapterId, body);
        setConcurrencyError(null);
        setExpectedRevisionId(res.revisionId);
        expectedRevisionIdRef.current = res.revisionId;

        if (res.warnings && res.warnings.length > 0) {
          res.warnings.forEach((warning) => {
            notify(t('scriptStudio.save.lostRefsWarning', 'Cảnh báo kịch bản'), warning);
          });
        }

        setVersionsTick((n) => n + 1);

        // Nạp lại dữ liệu sau khi lưu
        await loadPagesAndPanels(chapterId);
        try {
          const freshScenes = await scriptLineService.getScenesByChapter(chapterId);
          freshScenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
          setScenes(freshScenes);
          const details = (
            await Promise.all(
              freshScenes.map((s) => scriptLineService.getSceneById(s.id).catch(() => null)),
            )
          ).filter((d): d is SceneDetailDto => d !== null);
          details.sort((a, b) => a.sceneNumber - b.sceneNumber);
          setChapterScenesDetail(details);
          if (selectedScene) {
            setSelectedScene(details.find((d) => d.id === selectedScene.id) ?? details[0] ?? null);
          }
          if (seriesId) {
            const freshBible = await bibleService.getSeriesBible(seriesId);
            setAllBibleEntries(freshBible.entries);
            setCharacters(
              freshBible.entries.filter(
                (entry) => mapCategoryToTab(entry.category) === 'characters',
              ),
            );
          }
          void loadChapterCast(chapterId);
        } catch (refreshErr) {
          console.error('Lỗi làm mới kịch bản sau khi lưu:', refreshErr);
        }
        return true;
      } catch (err: any) {
        // 409 do kịch bản bỏ bớt trang còn việc / ô lưới: hiện đúng lý do của BE, không phải lỗi sửa đồng thời.
        if (err?.message?.startsWith('Không thể xoá')) {
          notify(t('scriptStudio.save.deleteBlocked', 'Không xoá được trang'), err.message);
          return false;
        }
        if (
          err?.status === 409 ||
          err?.code === 'CONFLICT' ||
          err?.message?.includes('409') ||
          err?.message?.includes('phiên bản khác')
        ) {
          const conflictMsg = t(
            'scriptStudio.save.conflict',
            'Kịch bản vừa được thay đổi (khôi phục / AI / người khác). Tải lại để xem bản mới nhất.',
          );
          setConcurrencyError(conflictMsg);
          notify(conflictMsg, '');
          return false;
        }
        notify(t('scriptStudio.gn.saveFailed', 'Chưa lưu được kịch bản'), err?.message ?? '');
        throw err;
      }
    },
    [
      currentChapter,
      buildFallbackScriptTree,
      loadPagesAndPanels,
      selectedScene,
      seriesId,
      loadChapterCast,
      notify,
      t,
    ],
  );

  useEffect(() => {
    const handleSaveKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!canEditScript || isChapterLocked) return;
        if (editorSaveRef.current) {
          void editorSaveRef.current();
        } else {
          void handleSaveScript(
            editorGetPayloadRef.current ? editorGetPayloadRef.current() : buildFallbackScriptTree(),
          );
        }
      }
    };
    window.addEventListener('keydown', handleSaveKeyDown);
    return () => window.removeEventListener('keydown', handleSaveKeyDown);
  }, [canEditScript, isChapterLocked, handleSaveScript, buildFallbackScriptTree]);

  // Xử lý Xoá Phân Cảnh (Delete Scene - Lucian #269 TypeToConfirmModal)
  const handleConfirmDeleteScene = async () => {
    if (!sceneToDelete || !currentChapter) return;
    setIsDeletingScene(true);
    try {
      userDeletedSceneRef.current = true;
      await scriptLineService.deleteScene(sceneToDelete.id);
      notify(
        'Đã xoá phân cảnh',
        `Cảnh ${sceneToDelete.sceneNumber} đã được xoá an toàn. Kịch bản và các panel vẫn được giữ nguyên.`,
      );
      if (selectedScene?.id === sceneToDelete.id) {
        setSelectedScene(null);
      }
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
        `Chương ${chapterToDelete.chapterNumber} đã được xoá an toàn khỏi chuỗi sản xuất.`,
      );
      setChapterToDelete(null);
      if (seriesId) {
        const chapRes = await chapterService.getChaptersBySeries(seriesId, 1, 50);
        const remainingChapters = Array.isArray(chapRes) ? chapRes : chapRes?.items || [];
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
          variantLabel: 'Mặc định',
        });
        setAllBibleEntries((prev) => [...prev, created]);
        setCharacters((prev) => [...prev, created]);
        notify(
          'Đã tạo thực thể tạm',
          `Đã lưu tạm "${name}" vào Series Bible để biên kịch tiếp tục.`,
        );
      } catch (err: any) {
        console.error('Lỗi tự sinh Stub Entity:', err);
      }
    },
    [seriesId, notify],
  );

  const handleOpenInBible = useCallback(
    (codeOrId: string) => {
      if (workspaceId && seriesId) {
        navigate(
          `/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(codeOrId)}`,
        );
      }
    },
    [workspaceId, seriesId, navigate],
  );

  const handleOpenInArtistDesk = useCallback(
    (pageNumber?: number) => {
      if (workspaceId && seriesId && currentChapter?.id) {
        navigate(
          `/workspaces/${workspaceId}/series/${seriesId}/artist/desk?chapterId=${currentChapter.id}${pageNumber ? `&page=${pageNumber}` : ''}`,
        );
      }
    },
    [workspaceId, seriesId, currentChapter, navigate],
  );

  const handleCreateInBible = useCallback(
    (tempCode: string) => {
      if (workspaceId && seriesId) {
        navigate(
          `/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(tempCode)}`,
        );
      }
    },
    [workspaceId, seriesId, navigate],
  );

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
          list.map((s) => scriptLineService.getSceneById(s.id).catch(() => null)),
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
      } else if (canEditScript && !isChapterLocked && !userDeletedSceneRef.current) {
        // Tự động khởi tạo phân cảnh đầu tiên để Writer vào thẳng trình soạn thảo
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
          document.querySelectorAll('.script-block[data-block-type="scene_heading"]'),
        );
        const targetEl =
          sceneHeadings.find((el) => el.getAttribute('data-scene-id') === scene.id) ||
          sceneHeadings.find(
            (el) =>
              el.textContent?.includes(`CẢNH ${scene.sceneNumber}`) ||
              el.textContent?.includes(`SCENE ${scene.sceneNumber}`),
          );
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Chọn Chapter từ dropdown hoặc danh sách chọn chương (bảo vệ thay đổi chưa lưu)
  const handleSelectChapter = async (chapId: string) => {
    if (chapId === '__all__' || !chapId) {
      handleBackToChapterSelection();
      return;
    }

    if (hasUnsavedChanges) {
      setBarWarn(true);
      setTimeout(() => setBarWarn(false), 800);
      const confirmSwitch = await confirm({
        title: t('scriptStudio.narrative.discardTitle', 'Bỏ qua thay đổi chưa lưu?'),
        description: t(
          'scriptStudio.narrative.discardSwitchDesc',
          'Bạn có thay đổi đề cương hoặc Story Arc chưa lưu. Bạn có muốn bỏ qua các thay đổi này để chuyển chương không?',
        ),
        confirmLabel: t('scriptStudio.narrative.discardAndSwitch', 'Bỏ qua và chuyển chương'),
        cancelLabel: t('scriptStudio.narrative.stay', 'Ở lại'),
      });
      if (!confirmSwitch) return;
    }

    // Xoá kết quả kiểm tra nhất quán của chương cũ ngay lập tức
    setFindings([]);
    setConsistencyResult(null);

    const matched = chapters.find((c) => c.id.toLowerCase() === chapId.toLowerCase());
    if (matched) {
      userDeletedSceneRef.current = false;
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
  const handleBackToChapterSelection = async () => {
    if (hasUnsavedChanges) {
      setBarWarn(true);
      setTimeout(() => setBarWarn(false), 800);
      const confirmSwitch = await confirm({
        title: t('scriptStudio.narrative.discardTitle', 'Bỏ qua thay đổi chưa lưu?'),
        description: t(
          'scriptStudio.narrative.discardBackDesc',
          'Bạn có thay đổi đề cương hoặc Story Arc chưa lưu. Bạn có muốn bỏ qua các thay đổi này để quay lại danh sách chọn chương không?',
        ),
        confirmLabel: t('scriptStudio.narrative.discardAndBack', 'Bỏ qua và quay lại'),
        cancelLabel: t('scriptStudio.narrative.stay', 'Ở lại'),
      });
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
      notify(
        'Quyền hạn bị từ chối',
        'Chỉ có Producer mới có quyền khởi tạo chương mới cho series.',
      );
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
      notify(
        t('common.success', 'Thành công'),
        t('scriptStudio.narrative.updateSuccess', 'Đã cập nhật Story Arc của Series.'),
      );
    } catch (err: any) {
      notify(t('scriptStudio.narrative.updateError', 'Lỗi cập nhật Story Arc'), err.message);
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
        currentChapter.versionVector,
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
      setActiveRightDrawer('consistency');
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

  // --- CRUD SCENE (Note phân cảnh, không ảnh hưởng logic hay luồng) ---
  const handleOpenCreateScene = () => {
    setIsEditingScene(false);
    setSceneNumberInput(scenes.length + 1);
    setSceneHeadingInput('');
    setFromPanelInput(1);
    setToPanelInput(chapterPanels.length > 0 ? chapterPanels.length : 1);
    setSceneSummaryInput('');
    setSceneDefaultNarrationMode('Present');
    setSceneModalOpen(true);
  };

  const handleOpenEditScene = () => {
    if (!selectedScene) return;
    setIsEditingScene(true);
    setSceneNumberInput(selectedScene.sceneNumber);
    setSceneHeadingInput(selectedScene.heading || '');
    const rangeInfo = parseScenePanelRange(selectedScene.summary);
    setFromPanelInput(rangeInfo.fromPanel || 1);
    setToPanelInput(rangeInfo.toPanel || (chapterPanels.length > 0 ? chapterPanels.length : 1));
    setSceneSummaryInput(rangeInfo.cleanSummary);
    setSceneDefaultNarrationMode(selectedScene.defaultNarrationMode || 'Present');
    setSceneModalOpen(true);
  };

  const handleSubmitScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChapter?.id) return;
    setSubmitting(true);
    try {
      const formattedSummary = formatSceneSummaryWithPanels(
        fromPanelInput,
        toPanelInput,
        sceneSummaryInput,
      );

      if (isEditingScene && selectedScene) {
        const req: UpdateSceneRequest = {
          heading: sceneHeadingInput.trim() || null,
          summary: formattedSummary,
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
              ? {
                  ...s,
                  heading: updated.heading,
                  summary: updated.summary,
                  version: updated.version,
                }
              : s,
          ),
        );
      } else {
        const req: CreateSceneRequest = {
          sceneNumber: sceneNumberInput,
          heading: sceneHeadingInput.trim() || null,
          summary: formattedSummary,
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

  // --- CRUD SCRIPT LINE (UC-06) ---
  const handleOpenAddLine = () => {
    setEditingLine(null);
    setLineSpeakerId('');
    setLineDialogue('');
    setLineStageDirection('');
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
    setLineSpeakerId(line.speakerLabel || '');
    setLineDialogue(line.dialogueText || '');
    setLineStageDirection(line.stageDirection || '');
    setLineNarrationMode(line.narrationMode || selectedScene?.defaultNarrationMode || 'Present');
    setLineOrderInput(line.lineOrder);
    setLineModalOpen(true);
  };

  const handleSubmitLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChapter?.id || !selectedScene?.id) return;

    if (!lineDialogue.trim() && !lineStageDirection.trim()) {
      notify('Thiếu nội dung', 'Nhập lời thoại hoặc chỉ dẫn cảnh.');
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
          expectedChapterVersion: expectedVersion,
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
          lineOrder: lineOrderInput,
          expectedChapterVersion: expectedVersion,
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

  // Helper tìm tên nhân vật từ nhãn/tên có kèm giai đoạn
  const getSpeakerName = (speakerLabel?: string | null) => {
    if (!speakerLabel) return null;
    const found =
      characters.find((c) => c.name === speakerLabel || c.id === speakerLabel) ||
      allBibleEntries.find((c) => c.name === speakerLabel || c.id === speakerLabel);
    return found ? getBibleEntryNameWithStage(found) : speakerLabel;
  };

  // D12 — áp trạng thái chương máy chủ trả về rồi nạp lại chi tiết
  const applyChapterUpdate = async (updated: ChapterDto | null | undefined) => {
    if (updated) setCurrentChapter((prev) => (prev ? { ...prev, ...updated } : prev));
    if (currentChapter?.id) await refreshChapterDetail(currentChapter.id);
  };

  // BR-18: lý do mở lại là bắt buộc, Backend ghi vào Audit Log (Frozen → Draft)
  const handleUnfreezeScript = async (reason: string) => {
    if (!currentChapter?.id) return;
    setUnfreezeReasonOpen(false);
    setFreezingScript(true);
    try {
      const updated = await chapterService.unfreezeScript(currentChapter.id, reason);
      notify(
        'Đã mở lại kịch bản',
        `Kịch bản Chương ${currentChapter.chapterNumber} đã được mở lại cho Writer chỉnh sửa.`,
      );
      await applyChapterUpdate(updated);
    } catch (err: any) {
      notify('Không thể mở lại kịch bản', err.message);
    } finally {
      setFreezingScript(false);
    }
  };

  /**
   * SCR-14: Writer gửi duyệt kịch bản qua POST /api/chapters/{id}/script/submit.
   * Gửi cùng payload cây kịch bản, lưu và chuyển trạng thái InReview trong cùng một transaction.
   */
  const handleSubmitScript = async () => {
    if (!currentChapter?.id) return;

    // Cho phép nộp kịch bản trước khi hoàn thành series bible (submitGate ghi nhận cảnh báo nếu có, không chặn)
    if (chapterCast?.submitGate && !chapterCast.submitGate.canSubmit) {
      console.warn(
        'Series Bible chưa hoàn thành trước khi nộp kịch bản:',
        chapterCast.submitGate.blockers.map((b) => `${b.entryName}: ${b.reason}`).join('; '),
      );
    }

    const n = currentChapter.chapterNumber;
    const confirmed = await confirm({
      title: isScriptInReview
        ? t('scriptStudio.lifecycle.resubmitConfirmTitle', { n })
        : t('scriptStudio.lifecycle.submitConfirmTitle', { n }),
      description: t('scriptStudio.lifecycle.submitConfirmBody'),
      confirmText: t('scriptStudio.submit.writer'),
      cancelText: t('scriptStudio.lifecycle.cancel'),
      variant: 'info',
    });
    if (!confirmed) return;

    const body: ChapterScriptBody = editorGetPayloadRef.current
      ? editorGetPayloadRef.current()
      : buildFallbackScriptTree();
    body.expectedRevisionId = expectedRevisionIdRef.current;

    setSubmittingToEditor(true);
    try {
      const res = await chapterService.submitChapterScript(currentChapter.id, body);
      setExpectedRevisionId(res.revisionId);
      expectedRevisionIdRef.current = res.revisionId;

      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((warning) => {
          notify(t('scriptStudio.save.lostRefsWarning', 'Cảnh báo kịch bản'), warning);
        });
      }

      notify(
        t('scriptStudio.lifecycle.submitted'),
        t('scriptStudio.lifecycle.submittedBody', { n }),
      );
      await applyChapterUpdate(res.chapter);
      setVersionsTick((v) => v + 1);

      await loadPagesAndPanels(currentChapter.id);
      try {
        const freshScenes = await scriptLineService.getScenesByChapter(currentChapter.id);
        freshScenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
        setScenes(freshScenes);
        const details = (
          await Promise.all(
            freshScenes.map((s) => scriptLineService.getSceneById(s.id).catch(() => null)),
          )
        ).filter((d): d is SceneDetailDto => d !== null);
        details.sort((a, b) => a.sceneNumber - b.sceneNumber);
        setChapterScenesDetail(details);
        if (selectedScene) {
          setSelectedScene(details.find((d) => d.id === selectedScene.id) ?? details[0] ?? null);
        }
        void loadChapterCast(currentChapter.id);
      } catch (refreshErr) {
        console.error('Lỗi làm mới kịch bản sau khi submit:', refreshErr);
      }
    } catch (err: any) {
      if (
        err?.status === 409 ||
        err?.code === 'CONFLICT' ||
        err?.message?.includes('409') ||
        err?.message?.includes('phiên bản khác')
      ) {
        const conflictMsg = t(
          'scriptStudio.save.conflict',
          'Kịch bản vừa được thay đổi (khôi phục / AI / người khác). Tải lại để xem bản mới nhất.',
        );
        setConcurrencyError(conflictMsg);
        notify(conflictMsg, '');
        return;
      }
      notify(t('scriptStudio.lifecycle.submitFailed'), err?.message ?? '');
    } finally {
      setSubmittingToEditor(false);
    }
  };

  /** D12 / F#27: chỉ Writer rút kịch bản về sửa (InReview → Draft), yêu cầu xác nhận via ConfirmDialog. */
  const handleRecallScript = async () => {
    if (!currentChapter?.id) return;

    const confirmed = await confirm({
      title: t('scriptStudio.lifecycle.recallConfirmTitle', {
        n: currentChapter.chapterNumber,
        defaultValue: `Rút kịch bản Chương ${currentChapter.chapterNumber} về sửa?`,
      }),
      description: t(
        'scriptStudio.lifecycle.recallConfirmBody',
        'Kịch bản sẽ chuyển về trạng thái Bản thảo (Draft). Các góp ý và ghi chú đánh giá của Editor vẫn được lưu giữ.',
      ),
      confirmText: t('scriptStudio.submit.recall', 'Rút về sửa'),
      cancelText: t('scriptStudio.lifecycle.cancel', 'Hủy'),
      variant: 'warning',
    });
    if (!confirmed) return;

    setSubmittingToEditor(true);
    try {
      const updated = await chapterService.recallScript(currentChapter.id);
      notify(t('scriptStudio.lifecycle.recalled'), '');
      await applyChapterUpdate(updated);
    } catch (err: any) {
      notify(t('scriptStudio.lifecycle.recallFailed'), err.message);
    } finally {
      setSubmittingToEditor(false);
    }
  };

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      if (!currentChapter?.id) return;
      try {
        const updated = await chapterService.resolveScriptComment(currentChapter.id, commentId);
        setScriptComments((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      } catch (err: any) {
        notify(t('scriptStudio.comments.resolveFailed'), err?.message ?? '');
      }
    },
    [currentChapter?.id, notify, t],
  );

  const aiReadingDirection = toAiReadingDirection(seriesDetail?.readingDirection);

  const reloadScriptWorkingCopy = useCallback(
    (
      chapId: string,
      options?: { forceEditorSync?: boolean; targetSceneId?: string | null },
    ): Promise<void> => {
      if (!chapId) return Promise.resolve();
      if (reloadInFlightRef.current?.chapterId === chapId) {
        return reloadInFlightRef.current.promise;
      }

      const shouldSync = options?.forceEditorSync ?? !flowDirtyRef.current;
      const run = (async () => {
        const [workingCopy, versions] = await Promise.all([
          typeof chapterService.getScriptWorkingCopy === 'function'
            ? Promise.resolve(chapterService.getScriptWorkingCopy(chapId)).catch(() => null)
            : Promise.resolve(null),
          Promise.resolve(chapterService.getScriptVersions(chapId)).catch(() => null),
          refreshChapterDetail(chapId),
        ]);

        if (shouldSync && versions) {
          const latestId = versions[0]?.id ?? null;
          setExpectedRevisionId(latestId);
          expectedRevisionIdRef.current = latestId;
          const pushedId = currentChapter?.lastSubmittedVersionId;
          if (pushedId) {
            const pushed = versions.find((v) => v.id === pushedId);
            setHasUnpushedChanges(
              !!pushed && !!versions[0] && versions[0].contentHash !== pushed.contentHash,
            );
          } else {
            setHasUnpushedChanges(false);
          }
        }
        setDrawerRefreshTick((n) => n + 1);

        if (!shouldSync) return;

        setConcurrencyError(null);

        let loadedPages: PageDto[] = [];
        let loadedPanels: PanelDto[] = [];
        try {
          const pList = (await pageService.getPagesByChapter(chapId)) || [];
          loadedPages = pList;
          if (pList.length > 0) {
            const panelsByPages = await Promise.all(
              pList.map((page) => panelService.getPanelsByPage(page.id).catch(() => [])),
            );
            panelsByPages.forEach((list, idx) => {
              list.forEach((p) => {
                (p as any).pageNumber = pList[idx].pageNumber;
                loadedPanels.push(p);
              });
            });
          }
        } catch {
          loadedPages = [];
          loadedPanels = [];
        }

        let loadedScenesDetail: SceneDetailDto[] = [];
        try {
          const freshScenes = await scriptLineService.getScenesByChapter(chapId);
          freshScenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
          setScenes(freshScenes);
          loadedScenesDetail = (
            await Promise.all(
              freshScenes.map((s) => scriptLineService.getSceneById(s.id).catch(() => null)),
            )
          ).filter((d): d is SceneDetailDto => d !== null);
          loadedScenesDetail.sort((a, b) => a.sceneNumber - b.sceneNumber);
        } catch {
          loadedScenesDetail = [];
        }

        if (workingCopy && Array.isArray(workingCopy.rows)) {
          const applied = mergeWorkingCopyIntoState(
            chapId,
            workingCopy,
            loadedPages,
            loadedPanels,
            loadedScenesDetail,
            options?.targetSceneId ?? selectedScene?.id,
          );
          setChapterPages(applied.pages);
          setChapterPanels(applied.panels);
          setChapterScenesDetail(applied.scenesDetail);
          setSelectedScene((prev) => {
            const targetId = options?.targetSceneId ?? prev?.id;
            return (
              (targetId ? applied.scenesDetail.find((s) => s.id === targetId) : undefined) ??
              applied.scenesDetail[0] ??
              prev
            );
          });
        } else {
          setChapterPages(loadedPages);
          setChapterPanels(loadedPanels);
          setChapterScenesDetail(loadedScenesDetail);
          setSelectedScene((prev) => {
            const targetId = options?.targetSceneId ?? prev?.id;
            return (
              (targetId ? loadedScenesDetail.find((s) => s.id === targetId) : undefined) ??
              loadedScenesDetail[0] ??
              prev
            );
          });
        }

        flowDirtyRef.current = false;
        setWorkingCopySyncTick((n) => n + 1);
        void loadChapterCast(chapId);
      })().finally(() => {
        if (reloadInFlightRef.current?.chapterId === chapId) {
          reloadInFlightRef.current = null;
        }
      });

      reloadInFlightRef.current = { chapterId: chapId, promise: run };
      return run;
    },
    [
      currentChapter?.lastSubmittedVersionId,
      refreshChapterDetail,
      selectedScene?.id,
      loadChapterCast,
    ],
  );

  // Khôi phục / chấp nhận AI vừa tạo ScriptVersion mới. Đang có chữ chưa lưu thì KHÔNG đè (quy tắc 9): giữ nguyên editor
  // và expectedRevisionId cũ, hiện banner 409 để người dùng tự bấm "Tải lại bản mới nhất" (có hỏi xác nhận).
  const reloadAfterExternalChange = useCallback(
    async (chapId: string, targetSceneId?: string | null) => {
      const dirty = flowDirtyRef.current;
      // Báo trước khi tải: dù tải lại lỗi, người dùng vẫn biết bản trên server đã đổi
      if (dirty) {
        setConcurrencyError(
          t(
            'scriptStudio.save.conflict',
            'Kịch bản vừa được thay đổi (khôi phục / AI / người khác). Tải lại để xem bản mới nhất.',
          ),
        );
      }
      await reloadScriptWorkingCopy(chapId, { forceEditorSync: !dirty, targetSceneId });
    },
    [reloadScriptWorkingCopy, t],
  );

  useEffect(() => {
    const chapId = currentChapter?.id;
    if (!chapId) return;
    const onWorkingCopyChanged = (e: Event) => {
      const detail = (e as CustomEvent<ScriptWorkingCopyChangedDetail>).detail;
      if (!detail || detail.chapterId !== chapId) return;
      void reloadAfterExternalChange(chapId, detail.sceneId ?? selectedScene?.id);
    };
    window.addEventListener(SCRIPT_WORKING_COPY_CHANGED_EVENT, onWorkingCopyChanged);
    return () => {
      window.removeEventListener(SCRIPT_WORKING_COPY_CHANGED_EVENT, onWorkingCopyChanged);
    };
  }, [currentChapter?.id, selectedScene?.id, reloadAfterExternalChange]);

  const handleScriptRestored = useCallback(
    async (res: RestoreScriptRevisionResult) => {
      if (!currentChapter?.id) return;
      setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : null));
      await reloadAfterExternalChange(currentChapter.id, selectedScene?.id);
      notify(
        t('scriptStudio.versions.restoredToastTitle'),
        t('scriptStudio.versions.restoredToastBody', {
          from: res.restoredFromVersionNumber,
          to: res.versionNumber,
        }),
      );
    },
    [currentChapter?.id, selectedScene?.id, reloadAfterExternalChange, notify, t],
  );

  const handleReloadLatestWorkingCopy = useCallback(async () => {
    if (!currentChapter?.id) return;
    if (flowDirtyRef.current) {
      const accepted = await confirm({
        title: t('scriptStudio.save.reloadConfirmTitle'),
        description: t('scriptStudio.save.reloadConfirmBody'),
        confirmText: t('scriptStudio.save.reloadConfirmBtn'),
        cancelText: t('scriptStudio.save.keepEditingBtn'),
        variant: 'warning',
      });
      if (!accepted) return;
    }
    await reloadScriptWorkingCopy(currentChapter.id, {
      forceEditorSync: true,
      targetSceneId: selectedScene?.id,
    });
  }, [currentChapter?.id, selectedScene?.id, confirm, reloadScriptWorkingCopy, t]);

  const handleAiReload = async (acceptedKind?: AiSuggestionKind) => {
    if (!currentChapter?.id) return;
    if (createsScriptVersionOnAccept(acceptedKind)) {
      await reloadAfterExternalChange(currentChapter.id, selectedScene?.id);
      return;
    }
    await reloadScriptWorkingCopy(currentChapter.id, {
      forceEditorSync: !flowDirtyRef.current,
      targetSceneId: selectedScene?.id,
    });
  };

  // Copilot viết lại 1 dòng thoại (task: writer.rewrite)
  const [rewritingLineId, setRewritingLineId] = useState<string | null>(null);
  const [decidingLineId, setDecidingLineId] = useState<string | null>(null);
  const [activeCopilotLineId, setActiveCopilotLineId] = useState<string | null>(null);
  const [lineCopilotSuggestions, setLineCopilotSuggestions] = useState<
    Record<string, AiSuggestionDto>
  >({});
  const [lineCopilotErrors, setLineCopilotErrors] = useState<Record<string, string>>({});
  const [aiScriptPreview, setAiScriptPreview] = useState<AiSuggestionDto | null>(null);

  useEffect(() => {
    setLineCopilotSuggestions({});
    setLineCopilotErrors({});
    setActiveCopilotLineId(null);
  }, [currentChapter?.id]);

  const handleRewriteLineById = async (lineId: string) => {
    const effectiveSeriesId = seriesId || currentChapter?.seriesId;
    if (!effectiveSeriesId || !lineId) return;
    setRewritingLineId(lineId);
    setActiveCopilotLineId(lineId);
    setLineCopilotErrors((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
    try {
      const sug = await aiAgentsService.runCopilot(effectiveSeriesId, {
        task: 'writer.rewrite',
        lineId,
      });
      setLineCopilotSuggestions((prev) => ({ ...prev, [lineId]: sug }));
    } catch (err: any) {
      const msg = err?.message || 'Không thể chạy AI Copilot.';
      setLineCopilotErrors((prev) => ({ ...prev, [lineId]: msg }));
      notify('Lỗi AI Copilot', msg);
      if (err?.status === 409) {
        setConcurrencyError(msg);
        await handleAiReload();
      }
    } finally {
      setRewritingLineId((cur) => (cur === lineId ? null : cur));
    }
  };

  const handleDecideLineCopilot = async (
    lineId: string,
    suggestion: AiSuggestionDto,
    decision: 'accept' | 'reject' | 'request-changes',
    reason?: string,
  ) => {
    const effectiveSeriesId = seriesId || currentChapter?.seriesId;
    if (!effectiveSeriesId || !currentChapter) return;
    setDecidingLineId(lineId);
    setLineCopilotErrors((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
    try {
      const res = await aiAgentsService.review(effectiveSeriesId, suggestion.id, decision, {
        ...(reason ? { reason } : {}),
        chapterVersion: currentChapter.versionVector,
      });
      if (decision === 'accept') {
        setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : prev));
        setLineCopilotSuggestions((prev) => {
          const next = { ...prev };
          delete next[lineId];
          return next;
        });
        await handleAiReload('LineRewrite');
      } else {
        setLineCopilotSuggestions((prev) => ({
          ...prev,
          [lineId]: {
            ...suggestion,
            status: res.status,
            canDecide: false,
            canAccept: false,
          },
        }));
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể ghi quyết định.';
      setLineCopilotErrors((prev) => ({ ...prev, [lineId]: msg }));
      notify('Lỗi quyết định đề xuất AI', msg);
      if (err?.status === 409) {
        setConcurrencyError(msg);
        await handleAiReload();
      }
    } finally {
      setDecidingLineId((cur) => (cur === lineId ? null : cur));
    }
  };

  const currentSceneDto = useMemo(
    () => scenes.find((s) => s.id === selectedScene?.id),
    [scenes, selectedScene?.id],
  );
  const sceneHasPanels = useMemo(() => {
    if (!selectedScene) return false;
    return (
      (selectedScene.scriptLines && selectedScene.scriptLines.some((l) => !!l.panelId)) ||
      (currentSceneDto?.pagesCount ?? 0) > 0
    );
  }, [selectedScene, currentSceneDto]);

  const previewScenes =
    chapterScenesDetail.length > 0 ? chapterScenesDetail : selectedScene ? [selectedScene] : [];
  const pendingLineRewrite = activeCopilotLineId
    ? lineCopilotSuggestions[activeCopilotLineId]
    : null;
  const scriptPreviewSuggestion =
    aiScriptPreview ?? (pendingLineRewrite?.status === 'Pending' ? pendingLineRewrite : null);
  const scriptPreviewScene = previewScenes.find((s) =>
    aiScriptPreview
      ? s.id === aiScriptPreview.sceneId
      : s.scriptLines?.some((l) => l.id === activeCopilotLineId),
  );

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
  const filteredScenes = scenes
    .filter((s): s is SceneDto => Boolean(s && s.id))
    .filter((s) => {
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
  // D12 / F#20: Writer gửi duyệt (Draft) / gửi lại khi đã sửa sau lần gửi (InReview).
  // Producer Start Production nằm ở ScriptReviewView và SeriesChaptersModal; màn Writer header giữ trạng thái read-only.
  const scriptAction: 'submit' | 'resubmit' | null =
    !currentChapter || isChapterContentLocked
      ? null
      : isWriterRole && scriptStatus === 'Draft'
        ? 'submit'
        : isWriterRole && isScriptInReview
          ? 'resubmit'
          : null;
  // Cho phép nộp kịch bản trước khi hoàn thành series bible (submitGate không chặn nộp kịch bản)
  const isSubmitBlocked = false;
  const isStartBlocked = !isScriptFrozen && chapterCast?.gate?.canStart === false;

  // Gửi lại chỉ khi đã lưu thay đổi sau lần gửi duyệt gần nhất
  const canSubmitScript =
    scriptAction !== null &&
    (scriptAction !== 'resubmit' || hasUnpushedChanges);
  const scriptStageIndex = isScriptFrozen ? 2 : isScriptInReview ? 1 : 0;

  const submitScriptRef = React.useRef<() => void>(() => {});
  const selectChapterRef = React.useRef(handleSelectChapter);
  useEffect(() => {
    submitScriptRef.current = () => {
      if (scriptAction === 'submit' || scriptAction === 'resubmit') void handleSubmitScript();
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
      seriesPath:
        workspaceId && seriesId
          ? `/workspaces/${workspaceId}/series/${seriesId}/script`
          : undefined,
      chapters: headerChapters,
      currentChapterId: currentChapter.id,
      onSelectChapter: (id: string) => selectChapterRef.current(id),
      stages: scriptStages,
      currentStageIndex: scriptStageIndex,
      isStageFlowCompleted: isScriptFrozen,
      isSubmittingStage: submittingToEditor,
      onSubmitStage: canSubmitScript ? () => submitScriptRef.current() : undefined,
      submitButtonLabel:
        scriptAction === 'resubmit'
          ? t('scriptStudio.submit.resubmit')
          : t('scriptStudio.submit.writer'),
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
    canSubmitScript,
    scriptAction,
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

  const activeNoticeCount =
    (concurrencyError ? 1 : 0) +
    (loadError ? 1 : 0) +
    (isScriptFrozen ? 1 : 0) +
    (isScriptInReview ? 1 : 0) +
    (isSubmitBlocked ? 1 : 0) +
    (isStartBlocked ? 1 : 0) +
    (isChapterContentLocked && !isScriptFrozen ? 1 : 0) +
    (!canEditScript && !isChapterLocked ? 1 : 0) +
    (restorable.storyArc && storyArcDraftKey ? 1 : 0) +
    (restorable.outline && outlineDraftKey ? 1 : 0);

  const railItems: ScriptRailItem[] = [
    {
      id: 'chapters',
      label: t('scriptStudio.rail.chapters', 'Chương'),
      tooltip: t('scriptStudio.railTooltip.chapters', 'Danh sách chương trong bộ truyện'),
      icon: BookOpen,
      active: activeLeftDrawer === 'chapters',
      testId: 'rail-chapters-btn',
      onClick: () => toggleLeftDrawer('chapters'),
    },
    {
      id: 'scenes',
      label: t('scriptStudio.rail.scenes', 'Phân cảnh'),
      tooltip: t('scriptStudio.railTooltip.scenes', 'Danh sách phân cảnh trong chương'),
      icon: Clapperboard,
      active: activeLeftDrawer === 'scenes',
      testId: 'rail-scenes-btn',
      onClick: () => toggleLeftDrawer('scenes'),
    },
    {
      id: 'outline',
      label: t('scriptStudio.rail.outline'),
      tooltip: t('scriptStudio.railTooltip.outline', 'Đề cương & Ngữ cảnh cốt truyện'),
      icon: Compass,
      active: activeRightDrawer === 'narrative',
      testId: 'toggle-narrative-context-btn',
      onClick: () => toggleRightDrawer('narrative'),
    },
    {
      id: 'characters',
      label: t('scriptStudio.rail.characters'),
      tooltip: t('scriptStudio.railTooltip.characters', 'Nhân vật Bible & Phân vai chương'),
      icon: Users,
      active: activeRightDrawer === 'characters',
      badge: chapterCast?.entities?.length,
      tone: isSubmitBlocked || isStartBlocked ? 'warn' : 'default',
      testId: 'rail-characters-btn',
      onClick: () => toggleRightDrawer('characters'),
    },
    {
      id: 'consistency',
      label: t('scriptStudio.rail.consistency'),
      tooltip: t('scriptStudio.railTooltip.consistency', 'Kiểm tra nhất quán cốt truyện'),
      icon: ShieldCheck,
      active: activeRightDrawer === 'consistency',
      badge: openFindingsCount,
      busy: loadingConsistency,
      disabled: !currentChapter?.id,
      testId: 'rail-consistency-btn',
      onClick: () => toggleRightDrawer('consistency'),
    },
    {
      id: 'comments',
      label: t('scriptStudio.rail.comments', 'Góp ý'),
      tooltip: t('scriptStudio.railTooltip.comments', 'Góp ý và phản hồi kịch bản'),
      icon: MessageSquare,
      active: activeRightDrawer === 'comments',
      badge: openScriptComments.length > 0 ? openScriptComments.length : undefined,
      testId: 'rail-comments-btn',
      onClick: () => toggleRightDrawer('comments'),
    },
    {
      id: 'status',
      label: t('scriptStudio.rail.status', 'Thông báo'),
      tooltip: t('scriptStudio.railTooltip.status', 'Thông báo và trạng thái kịch bản'),
      icon: Bell,
      active: activeRightDrawer === 'status',
      badge: activeNoticeCount > 0 ? activeNoticeCount : undefined,
      tone: concurrencyError || isSubmitBlocked || isStartBlocked ? 'warn' : 'default',
      testId: 'rail-status-btn',
      onClick: () => toggleRightDrawer('status'),
    },
    {
      id: 'import',
      label: t('scriptStudio.rail.import'),
      tooltip: !canEditScript
        ? t('scriptStudio.railTooltip.importDisabledRole', 'Chỉ xem - không có quyền nhập kịch bản')
        : isChapterLocked
          ? t(
              'scriptStudio.railTooltip.importDisabledLocked',
              'Chương đã đóng băng - không thể nhập kịch bản',
            )
          : t('scriptStudio.railTooltip.import', 'Nhập kịch bản từ tệp bên ngoài'),
      icon: FileInput,
      disabled: !canEditScript || isChapterLocked,
      testId: 'rail-import-btn',
      onClick: () => {
        setEditorMode('flow');
        setImportRequestKey((k) => k + 1);
      },
    },
    {
      id: 'ai',
      label: t('scriptStudio.rail.ai'),
      tooltip: !canEditScript
        ? t('scriptStudio.railTooltip.aiDisabledRole', 'Chỉ xem - không có quyền dùng Trợ lý AI')
        : isChapterLocked
          ? t(
              'scriptStudio.railTooltip.aiDisabledLocked',
              'Chương đã đóng băng - không thể dùng Trợ lý AI',
            )
          : t('scriptStudio.railTooltip.ai', 'Trợ lý AI viết nháp và phân khung'),
      icon: Sparkles,
      active: activeRightDrawer === 'ai-draft' || activeRightDrawer === 'ai-storyboard',
      tone: 'ai',
      disabled: !canEditScript || isChapterLocked,
      testId: 'rail-ai-btn',
      menu:
        !canEditScript || isChapterLocked
          ? undefined
          : [
              {
                id: 'draft',
                label: t('scriptStudio.ai.draft'),
                hint: selectedScene ? undefined : t('scriptStudio.ai.needScene'),
                disabled: !selectedScene,
                testId: 'open-ai-draft-btn',
                onSelect: () => setActiveRightDrawer('ai-draft'),
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
                onSelect: () => setActiveRightDrawer('ai-storyboard'),
              },
            ],
    },
    {
      id: 'history',
      label: t('scriptStudio.rail.history'),
      tooltip: t('scriptStudio.railTooltip.history', 'Lịch sử các phiên bản kịch bản'),
      icon: History,
      active: activeRightDrawer === 'versions',
      tone: hasUnpushedChanges ? 'warn' : 'default',
      testId: 'open-script-history-btn',
      onClick: () => toggleRightDrawer('versions'),
    },
  ];

  const railFooterItems: ScriptRailItem[] = [];

  const viewSwitcher = <ScriptHeader editorMode={editorMode} onSetEditorMode={setEditorMode} />;

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
      {/* Thanh chỉ báo gom gọn tối đa 1 dòng trên header (Status chip, Blockers, Concurrency) */}
      <ScriptStatusBar
        concurrencyError={concurrencyError}
        onClearConcurrencyError={() => setConcurrencyError(null)}
        onReloadWorkingCopy={() => void handleReloadLatestWorkingCopy()}
        isScriptFrozen={isScriptFrozen}
        isScriptInReview={isScriptInReview}
        isChapterLocked={isChapterLocked}
        canEditScript={canEditScript}
        isSubmitBlocked={isSubmitBlocked}
        isStartBlocked={isStartBlocked}
        onOpenStatusDrawer={() => setActiveRightDrawer('status')}
        onOpenCharactersDrawer={() => setActiveRightDrawer('characters')}
      />

      <h1 className='sr-only'>Biên Soạn Kịch Bản Phân Cảnh (Script Editor)</h1>

      {/* 3. Bàn viết: thanh biểu tượng (trái) | ngăn kéo phân cảnh | trang giấy (giữa) | drawers (phải) */}
      <div className='flex-1 flex overflow-hidden relative'>
        <ScriptStudioRail
          ariaLabel={t('scriptStudio.rail.label')}
          items={railItems}
          footerItems={railFooterItems}
        />

        {activeLeftDrawer === 'chapters' && (
          <ScriptChaptersDrawer
            chapters={chapters}
            selectedChapterId={currentChapter?.id}
            onSelectChapter={(chapId) => {
              handleSelectChapter(chapId);
            }}
            onBackToSelection={handleBackToChapterSelection}
            onClose={() => setActiveLeftDrawer(null)}
            scenes={filteredScenes}
            selectedSceneId={selectedScene?.id}
            canEdit={canEditScript && !isChapterLocked}
            onSelectScene={handleSelectScene}
            onAddScene={handleOpenCreateScene}
            onRenameSelectedScene={handleOpenEditScene}
            onDeleteScene={(s) => setSceneToDelete(s)}
            onDeleteChapter={
              isProducer && currentChapter && !isChapterLocked
                ? () => setChapterToDelete(currentChapter)
                : undefined
            }
          />
        )}

        {activeLeftDrawer === 'scenes' && (
          <ScriptScenesDrawer
            scenes={filteredScenes}
            selectedSceneId={selectedScene?.id}
            canEdit={canEditScript && !isChapterLocked}
            onSelect={handleSelectScene}
            onAdd={handleOpenCreateScene}
            onRenameSelected={handleOpenEditScene}
            onDelete={(s) => setSceneToDelete(s)}
            onClose={() => setActiveLeftDrawer(null)}
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
              scenes={
                chapterScenesDetail.length > 0
                  ? chapterScenesDetail
                  : selectedScene
                    ? [selectedScene]
                    : []
              }
              pages={chapterPages}
              panels={chapterPanels}
              canEditScript={canEditScript}
              isChapterLocked={isChapterLocked}
              comments={openScriptComments}
              canResolveComment={isWriterRole}
              onResolveComment={handleResolveComment}
              isCommentsSidePanelOpen={activeRightDrawer === 'comments'}
              onToggleCommentsSidePanel={() => toggleRightDrawer('comments')}
              activeLineId={activeCommentLineId}
              activePanel={activePanelJump}
              allBibleEntries={allBibleEntries}
              onRewriteLineId={
                canEditScript && !isChapterLocked ? handleRewriteLineById : undefined
              }
              rewritingLineId={rewritingLineId}
              diffPreview={
                scriptPreviewSuggestion && scriptPreviewScene ? (
                  <ScriptDiffPreview
                    suggestion={scriptPreviewSuggestion}
                    scene={scriptPreviewScene}
                    nameById={aiNameById}
                  />
                ) : undefined
              }
              flowAiSlot={
                activeCopilotLineId &&
                (lineCopilotErrors[activeCopilotLineId] ||
                  (canEditScript &&
                    !isChapterLocked &&
                    lineCopilotSuggestions[activeCopilotLineId])) ? (
                  <div className='space-y-2'>
                    {lineCopilotErrors[activeCopilotLineId] && (
                      <div
                        role='alert'
                        className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800'
                      >
                        {lineCopilotErrors[activeCopilotLineId]}
                      </div>
                    )}
                    {canEditScript &&
                      !isChapterLocked &&
                      lineCopilotSuggestions[activeCopilotLineId] && (
                        <SuggestionCard
                          suggestion={lineCopilotSuggestions[activeCopilotLineId]}
                          seriesId={seriesId || currentChapter?.seriesId}
                          busy={decidingLineId === activeCopilotLineId}
                          nameById={aiNameById}
                          onDecide={(decision, reason) =>
                            void handleDecideLineCopilot(
                              activeCopilotLineId,
                              lineCopilotSuggestions[activeCopilotLineId],
                              decision,
                              reason,
                            )
                          }
                        />
                      )}
                  </div>
                ) : undefined
              }
              registerSetPanelStage={(fn) => {
                setPanelStageRef.current = fn;
              }}
              onSave={handleSaveScript}
              syncRevision={workingCopySyncTick}
              onDirtyChange={(dirty) => {
                flowDirtyRef.current = dirty;
              }}
              registerSave={registerEditorSave}
              registerGetPayload={(fn) => {
                editorGetPayloadRef.current = fn;
              }}
              onShowToast={onShowToast}
              dockLeading={viewSwitcher}
              manuscriptTitle={formatChapterOption(
                currentChapter.chapterNumber,
                currentChapter.title,
              )}
            />
          ) : (
            <div className='flex-1 min-h-0 flex flex-col'>
              <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar'>
                {!selectedScene ? (
                  <div className='flex flex-col items-center justify-center py-20 text-center text-stone-500'>
                    <p className='text-sm font-medium text-stone-700'>
                      {scenes.length === 0
                        ? 'Chương này chưa có phân cảnh kịch bản nào.'
                        : t('scriptStudio.ai.needScene')}
                    </p>
                    {scenes.length === 0 && !canEditScript && (
                      <p className='text-xs text-stone-400 mt-1 max-w-sm'>
                        Biên kịch chưa tạo phân cảnh hoặc kịch bản đang được chuẩn bị.
                      </p>
                    )}
                  </div>
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
                            speakerName={
                              getSpeakerName(line.speakerLabel) || line.speakerLabel || ''
                            }
                            character={characters.find(
                              (c) => c.name === line.speakerLabel || c.id === line.speakerLabel,
                            )}
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
                            onRewriteLine={
                              canEditScript && !isChapterLocked
                                ? (l) => void handleRewriteLineById(l.id)
                                : undefined
                            }
                            isRewriting={rewritingLineId === line.id}
                            copilotSuggestion={lineCopilotSuggestions[line.id] ?? null}
                            copilotBusy={decidingLineId === line.id}
                            copilotError={lineCopilotErrors[line.id] ?? null}
                            seriesId={seriesId || currentChapter?.seriesId}
                            aiNameById={aiNameById}
                            onDecideCopilot={(decision, reason) => {
                              const sug = lineCopilotSuggestions[line.id];
                              if (sug) void handleDecideLineCopilot(line.id, sug, decision, reason);
                            }}
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

        {/* Panel nhận xét / thay đổi / kiểm tra bên phải giống Editor */}
        {activeRightDrawer === 'comments' && (
          <ScriptReviewSidePanel
            chapter={currentChapter}
            comments={scriptComments}
            pushedVersion={pushedVersion}
            activeLineId={activeCommentLineId}
            canResolve={isWriterRole}
            onResolveComment={handleResolveComment}
            onSelectComment={(c) => {
              if (c.scriptLineId) {
                setActiveCommentLineId(c.scriptLineId);
                handleScrollToLine(c.scriptLineId);
              }
            }}
            onClose={() => setActiveRightDrawer(null)}
            findings={findings}
            onRunCheck={handleRunConsistencyCheck}
            loadingCheck={loadingConsistency}
          />
        )}

        {/* RIGHT: Secondary Panels (Drawers) - Chỉ đúng 1 panel bên phải hiển thị tại mọi thời điểm */}
        {/* 1. Drawer Đề Cương & Bối Cảnh */}
        {activeRightDrawer === 'narrative' && (
          <NarrativeContextDrawer
            isOpen={true}
            onClose={() => setActiveRightDrawer(null)}
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
        )}

        {/* 2. Drawer Kiểm Tra Nhất Quán */}
        {activeRightDrawer === 'consistency' && (
          <ConsistencyFindingsDrawer
            isOpen={true}
            onClose={() => setActiveRightDrawer(null)}
            findings={findings}
            loadingConsistency={loadingConsistency}
            onRunCheck={handleRunConsistencyCheck}
            onScrollToLine={handleScrollToLine}
            disabledCheck={!currentChapter?.id}
          />
        )}

        {/* 3. Drawer Danh Mục Nhân Vật & Phân Vai (Gộp Series Bible + Chapter Cast) */}
        {activeRightDrawer === 'characters' && (
          <BibleCharactersDrawer
            isOpen={true}
            onClose={() => setActiveRightDrawer(null)}
            characters={characters}
            chapterId={currentChapter?.id}
            seriesId={seriesId || currentChapter?.seriesId}
            workspaceId={workspaceId}
            canEditScript={canEditScript}
            chapterNumber={currentChapter?.chapterNumber}
            chapterTitle={currentChapter?.title}
            chapterCast={chapterCast}
            isLoadingCast={loadingCast}
            onRefreshCast={() => {
              if (currentChapter?.id) return loadChapterCast(currentChapter.id);
              return Promise.resolve();
            }}
            onRefreshBible={refreshBible}
            allBibleEntries={allBibleEntries}
            onJumpToLine={(lineId) => setActiveCommentLineId(lineId)}
            onJumpToPanel={(pageNo, panNo) =>
              setActivePanelJump({ pageNumber: pageNo, panelNumber: panNo })
            }
            onOpenPanelStageModal={() => setIsPanelStageModalOpen(true)}
            onShowToast={notify}
            t={t}
          />
        )}

        {/* 4. Lịch sử commit (Lưu = commit, Gửi duyệt = push) và so với bản đã gửi duyệt */}
        {activeRightDrawer === 'versions' && currentChapter?.id && (
          <ScriptVersionsDrawer
            chapterId={currentChapter.id}
            seriesId={seriesId || currentChapter.seriesId}
            sceneId={selectedScene?.id}
            chapterVersion={currentChapter.versionVector}
            canRestore={canEditScript && !isChapterLocked}
            pushedVersionId={currentChapter.lastSubmittedVersionId}
            refreshKey={versionsTick + drawerRefreshTick}
            onRestored={handleScriptRestored}
            onConflict={async (msg) => {
              setConcurrencyError(msg);
              notify(msg, '');
              await reloadScriptWorkingCopy(currentChapter.id, {
                forceEditorSync: !flowDirtyRef.current,
                targetSceneId: selectedScene?.id,
              });
            }}
            onClose={() => setActiveRightDrawer(null)}
          />
        )}

        {/* 6. Drawer Thông Báo & Trạng Thái */}
        {activeRightDrawer === 'status' && (
          <ScriptStatusDrawer
            isOpen={true}
            onClose={() => setActiveRightDrawer(null)}
            concurrencyError={concurrencyError}
            onClearConcurrencyError={() => setConcurrencyError(null)}
            onReloadWorkingCopy={() => void handleReloadLatestWorkingCopy()}
            loadError={loadError}
            onRetryLoadScenes={() => {
              if (currentChapter?.id) loadScenes();
            }}
            isScriptFrozen={isScriptFrozen}
            currentChapter={currentChapter}
            normRole={normRole}
            freezingScript={freezingScript}
            unfreezeReasonOpen={unfreezeReasonOpen}
            setUnfreezeReasonOpen={setUnfreezeReasonOpen}
            handleUnfreezeScript={handleUnfreezeScript}
            tReview={tReview}
            isScriptInReview={isScriptInReview}
            hasUnpushedChanges={hasUnpushedChanges}
            isWriterRole={isWriterRole}
            isChapterContentLocked={isChapterContentLocked}
            submittingToEditor={submittingToEditor}
            handleRecallScript={handleRecallScript}
            isSubmitBlocked={isSubmitBlocked}
            chapterCast={chapterCast}
            isStartBlocked={isStartBlocked}
            workspaceId={workspaceId}
            seriesId={seriesId || currentChapter?.seriesId}
            isChapterLocked={isChapterLocked}
            canEditScript={canEditScript}
            restorable={restorable}
            storyArcDraftKey={storyArcDraftKey}
            outlineDraftKey={outlineDraftKey}
            onRestoreDraft={(kind, text) => {
              (kind === 'storyArc' ? setStoryArcInput : setOutlineInput)(text);
              if (kind === 'outline') setActiveRightDrawer('narrative');
              setRestorable((p) => ({ ...p, [kind]: undefined }));
            }}
            onDiscardDraft={(kind) => {
              const key = kind === 'storyArc' ? storyArcDraftKey : outlineDraftKey;
              if (key) clearDraft(key);
              setRestorable((p) => ({ ...p, [kind]: undefined }));
            }}
            onOpenDrawer={(drawer) => setActiveRightDrawer(drawer)}
            t={t}
          />
        )}
      </div>

      {/* Trợ lý AI viết nháp kịch bản */}
      {activeRightDrawer === 'ai-draft' && seriesId && currentChapter?.id && selectedScene?.id && (
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
          onClose={() => setActiveRightDrawer(null)}
          onReload={handleAiReload}
          onScriptPreview={setAiScriptPreview}
        />
      )}

      {/* Trợ lý AI Phân khung Storyboard */}
      {activeRightDrawer === 'ai-storyboard' &&
        seriesId &&
        currentChapter?.id &&
        selectedScene?.id && (
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
            onClose={() => setActiveRightDrawer(null)}
            onReload={handleAiReload}
          />
        )}

      {/* MODAL: Tạo / Sửa Phân cảnh (Ghi chú phân đoạn từ panel đến panel) */}
      <Modal
        isOpen={sceneModalOpen}
        onClose={() => setSceneModalOpen(false)}
        size='sm'
        closeLabel='Đóng'
        title={isEditingScene ? 'Sửa Phân Cảnh (Ghi chú)' : 'Tạo Phân Cảnh Mới (Ghi chú)'}
      >
        <form onSubmit={handleSubmitScene} className='space-y-4'>
          <div className='p-2.5 bg-orange-50/80 border border-orange-200/70 rounded-xl text-xs text-orange-950'>
            💡 Cảnh là phần ghi chú phân đoạn, cho phép định nghĩa tên cảnh và phạm vi từ panel đến panel, không ảnh hưởng đến logic và luồng kịch bản.
          </div>

          <div>
            <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
              Tên cảnh / Tiêu đề phân cảnh *
            </label>
            <input
              type='text'
              placeholder='vd: Cảnh 1: Neo Tokyo - Đêm tuyết rơi'
              value={sceneHeadingInput}
              onChange={(e) => setSceneHeadingInput(e.target.value)}
              className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
              required
            />
          </div>

          {/* Phạm vi panel: Từ panel nào đến panel nào */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                Từ panel
              </label>
              <input
                type='number'
                min={1}
                value={fromPanelInput}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setFromPanelInput(val);
                  if (toPanelInput < val) {
                    setToPanelInput(val);
                  }
                }}
                className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                required
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
                Đến panel
              </label>
              <input
                type='number'
                min={fromPanelInput || 1}
                value={toPanelInput}
                onChange={(e) => setToPanelInput(parseInt(e.target.value, 10) || fromPanelInput || 1)}
                className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                required
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
              Ghi chú cảnh (Note)
            </label>
            <textarea
              rows={3}
              placeholder='Ghi chú bối cảnh, lưu ý góc máy, tâm lý nhân vật (tùy chọn)...'
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
      </Modal>

      {/* MODAL: Thêm / Sửa Dòng Kịch Bản (UC-06) */}
      <Modal
        isOpen={lineModalOpen}
        onClose={() => setLineModalOpen(false)}
        size='lg'
        closeLabel='Đóng'
        data-testid='line-modal'
        title={
          editingLine
            ? `Sửa Dòng Kịch Bản #${editingLine.lineOrder}`
            : 'Thêm Dòng Kịch Bản Mới (UC-06)'
        }
        description={
          <>
            Mốc kịch bản hiện tại: <strong>v{currentChapter?.versionVector}</strong>
          </>
        }
      >
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
                <p className='text-xs text-stone-500 mt-1'>
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
                  <option value='Present'>Hiện tại / Mặc định (Present - Kiểm tra toàn bộ)</option>
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
                <p className='text-xs text-stone-500 mt-1'>
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
                placeholder='vd: Chúng ta phải đi ngay!'
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
                <span>Chỉ dẫn cảnh / Hành động</span>
              </label>
              <textarea
                rows={2}
                placeholder='vd: Akira quay đầu nhìn, tay rút kiếm...'
                value={lineStageDirection}
                onChange={(e) => setLineStageDirection(e.target.value)}
                maxLength={4000}
                className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] resize-none italic'
              />
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
      </Modal>

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
          title={`Xoá Chương ${chapterToDelete.chapterNumber}`}
          description={`Toàn bộ phân cảnh và kịch bản Chương ${chapterToDelete.chapterNumber} sẽ bị xoá. Nhập để xác nhận:`}
          confirmButtonText={isDeletingChapter ? 'Đang xoá...' : 'Xoá chương'}
          cancelButtonText='Huỷ'
          isDeleting={isDeletingChapter}
          onConfirm={handleConfirmDeleteChapter}
          onCancel={() => setChapterToDelete(null)}
        />
      )}

      {/* Modal Xoá Phân Cảnh (Note phân cảnh, không ảnh hưởng logic kịch bản) */}
      {sceneToDelete && (
        <Modal
          isOpen={Boolean(sceneToDelete)}
          onClose={() => setSceneToDelete(null)}
          title={`Xoá Cảnh ${sceneToDelete.sceneNumber}`}
          size='sm'
          closeLabel='Đóng'
        >
          <div className='space-y-3 text-xs text-stone-700'>
            <p>
              Bạn có chắc muốn xoá <strong>{sceneToDelete.heading || `Cảnh ${sceneToDelete.sceneNumber}`}</strong>?
            </p>
            <p className='text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80'>
              💡 Cảnh chỉ là phần ghi chú phân đoạn. Việc xoá cảnh diễn ra an toàn và không làm thay đổi hay mất nội dung kịch bản và các panel.
            </p>
            <div className='flex justify-end gap-2 pt-2 border-t border-stone-200'>
              <button
                type='button'
                onClick={() => setSceneToDelete(null)}
                className='px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                data-testid='confirm-delete-scene-btn'
                disabled={isDeletingScene}
                onClick={handleConfirmDeleteScene}
                className='px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer'
              >
                {isDeletingScene ? 'Đang xoá...' : 'Xoá cảnh'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Đặt giai đoạn theo Panel (BIB-16 & 5, Q24) */}
      <SetPanelStageModal
        isOpen={isPanelStageModalOpen}
        onClose={() => setIsPanelStageModalOpen(false)}
        pages={chapterPages.map((p) => ({
          pageNumber: p.pageNumber,
          panels: chapterPanels
            .filter((pan) => pan.pageId === p.id)
            .map((pan) => ({ panelNumber: pan.panelNumber })),
        }))}
        entities={chapterCast?.entities || []}
        onApply={(pNo, panNo, castRevs) => {
          if (setPanelStageRef.current) {
            setPanelStageRef.current(pNo, panNo, castRevs);
          }
        }}
        t={t}
      />
    </div>
  );
};

export default ScriptEditorView;
