import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw,
  BookOpen,
  MessageSquare,
  History,
  Save,
  Clapperboard,
  Compass,
  PanelLeft,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { ChapterCastDto, chapterCastService } from '@/services/chapterCast.service';
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
  type NextLineKind,
  type NextLineSuggestion,
} from '@/services/aiAgents.service';
import {
  AiAssistPanel,
  type AiScriptDraftContext,
} from '@/shared/features/ai-agents/AiAssistPanel';
import { toAiReadingDirection } from '@/shared/features/ai-agents/aiViewUtils';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { PanelDto } from '@/types/pipeline';
import { generateTempCode, saveTempBibleCode } from '@/shared/utils/tempBibleCodes';
import { ChapterSelectionView } from '../components/script/chapter-selection';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { mapCategoryToTab } from '@/shared/features/series-bible/bibleCategory';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { assignmentService } from '@/services/assignment.service';
import { normalizeWorkspaceRole } from '@/types/auth';
import { SuggestionCard } from '@/shared/features/ai-agents/SuggestionCard';
import { ScriptDiffPreview } from '../components/script/flow/ScriptDiffPreview';
import { ScreenplayFlowEditor } from '../components/script/flow/ScreenplayFlowEditor';
import { ScriptReviewSidePanel } from '@/shared/features/script-review/ScriptReviewSidePanel';
import {
  type ScriptDocSnapshot,
  type ChapterScriptBody,
  type ScriptTreePage,
  isValidGuid,
  docToScriptTree,
} from '../components/script/flow/scriptFlowAdapter';
import { ScriptRightBiblePanel } from '../components/script/ScriptRightBiblePanel';
import { ScriptVersionsDrawer } from '../components/script/versions/ScriptVersionsDrawer';
import { ScriptScenesDrawer } from '../components/script/ScriptScenesDrawer';
import { parseScenePanelRange, formatSceneSummaryWithPanels } from '../utils/sceneUtils';
import {
  useScriptDrawers,
  type LeftDrawer,
  type RightDrawer,
} from '../components/script/useScriptDrawers';
import { useFocusHeaderContext } from '@/app/FocusWorkspaceLayout';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';
import { TypeToConfirmModal } from '@/shared/components/lucian';
import { useTranslation } from '@/lib/i18n';
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
  const [isScriptDirty, setIsScriptDirty] = useState(false);
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

  const hasOpenComments = openScriptComments.length > 0;
  useEffect(() => {
    if (hasOpenComments) {
      setActiveRightDrawer((prev) => prev ?? 'comments');
    }
  }, [currentChapter?.id, hasOpenComments]);
  const [characters, setCharacters] = useState<BibleEntryDto[]>([]);
  const [allBibleEntries, setAllBibleEntries] = useState<BibleEntryDto[]>([]);
  const [bibleLoaded, setBibleLoaded] = useState(false);
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

  // Series Detail
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);

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
        setConflictErrorMsg(detail.message || t('writer.scriptEditor.offlineConflictFallback'));
        setConflictModalOpen(true);
      }
    };
    window.addEventListener('panelforge:offline_conflict', handleOfflineConflict);
    return () => {
      window.removeEventListener('panelforge:offline_conflict', handleOfflineConflict);
    };
  }, []);

  // Side Drawers (Left & Right Drawers Hook)
  // Scene outline column is open by default on desktop (≥1280px) per Stitch design
  const {
    activeLeftDrawer,
    activeRightDrawer,
    setActiveLeftDrawer,
    setActiveRightDrawer,
    toggleLeftDrawer,
    toggleRightDrawer,
  } = useScriptDrawers({
    initialLeftDrawer: typeof window !== 'undefined' && window.innerWidth >= 1280 ? 'scenes' : null,
  });
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
        setBibleLoaded(true);
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

  const notify = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) {
        onShowToast(title, desc);
      }
    },
    [onShowToast],
  );

  // 1. Tải danh sách Chapters, Series Bible và Series Details
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);
    setLoadError(null);
    setBibleLoaded(false);

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
        }

        if (bibleRes && bibleRes.entries) {
          setAllBibleEntries(bibleRes.entries);
          setBibleLoaded(true);
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
        if (isMounted)
          setLoadError(err.message || t('writer.scriptEditor.loadChapterErrorFallback'));
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
      } else {
        setCurrentChapter(null);
      }
    }
  }, [chapterIdFromUrl, chapters, currentChapter?.id]);

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
        notify(
          t('writer.scriptEditor.loadSceneErrorTitle'),
          err.message || t('writer.scriptEditor.loadSceneErrorFallback'),
        );
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
            setBibleLoaded(true);
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
          const conflictMsg = t('scriptStudio.save.conflict');
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
        t('writer.scriptEditor.sceneDeletedTitle'),
        t('writer.scriptEditor.sceneDeletedDesc', { number: sceneToDelete.sceneNumber }),
      );
      if (selectedScene?.id === sceneToDelete.id) {
        setSelectedScene(null);
      }
      setSceneToDelete(null);
      await loadScenes();
    } catch (err: any) {
      notify(
        t('writer.scriptEditor.sceneDeleteErrorTitle'),
        err?.message || t('writer.scriptEditor.systemErrorFallback'),
      );
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
        t('writer.scriptEditor.chapterDeletedTitle'),
        t('writer.scriptEditor.chapterDeletedDesc', { number: chapterToDelete.chapterNumber }),
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
      notify(
        t('writer.scriptEditor.chapterDeleteErrorTitle'),
        err.message || t('writer.scriptEditor.systemErrorFallback'),
      );
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
          description: t('writer.scriptEditor.stubAutoDesc'),
          priority: 'Standard',
          variantLabel: t('writer.scriptEditor.defaultVariantLabel'),
        });
        setAllBibleEntries((prev) => [...prev, created]);
        setCharacters((prev) => [...prev, created]);
        notify(
          t('writer.scriptEditor.stubCreatedTitle'),
          t('writer.scriptEditor.stubCreatedDesc', { name }),
        );
      } catch (err: any) {
        console.error('Lỗi tự sinh Stub Entity:', err);
      }
    },
    [seriesId, notify, t],
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
            heading: t('writer.scriptEditor.defaultSceneHeading'),
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
      notify(
        t('writer.scriptEditor.loadScriptErrorTitle'),
        err.message || t('writer.scriptEditor.loadScenesErrorFallback'),
      );
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
  };

  // Chọn Chapter từ dropdown hoặc danh sách chọn chương
  const handleSelectChapter = async (chapId: string) => {
    if (chapId === '__all__' || !chapId) {
      handleBackToChapterSelection();
      return;
    }

    const matched = chapters.find((c) => c.id.toLowerCase() === chapId.toLowerCase());
    if (matched) {
      userDeletedSceneRef.current = false;
      setCurrentChapter(matched);
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
        t('writer.scriptEditor.permissionDeniedTitle'),
        t('writer.scriptEditor.onlyProducerCanCreateChapter'),
      );
      return;
    }
    const created = await chapterService.createChapter(seriesId, data);
    setChapters((prev) => [...prev, created]);
    setCurrentChapter(created);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('chapterId', created.id);
      p.delete('sceneId');
      return p;
    });
  };

  // Nút "Xem dòng" an toàn, không làm mất dữ liệu nhập và báo rõ nếu dòng không tồn tại
  const handleScrollToLine = async (scriptLineId?: string | null) => {
    if (!scriptLineId) {
      notify(t('writer.scriptEditor.noticeTitle'), t('writer.scriptEditor.issueNoLineAttached'));
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
          t('writer.scriptEditor.lineNotFoundTitle'),
          t('writer.scriptEditor.lineNotFoundDesc'),
        );
        return;
      }
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      notify(t('writer.scriptEditor.lineNotFoundTitle'), t('writer.scriptEditor.lineNotFoundDesc'));
      return;
    }
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
        notify(
          t('writer.scriptEditor.successTitle'),
          t('writer.scriptEditor.sceneUpdatedDesc', { number: updated.sceneNumber }),
        );
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
        notify(
          t('writer.scriptEditor.successTitle'),
          t('writer.scriptEditor.sceneCreatedDesc', { number: created.sceneNumber }),
        );
        setScenes((prev) => [...prev, created]);
        handleSelectScene(created);
      }
      setSceneModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'CONFLICT' && isEditingScene && selectedScene) {
        // BR-11: người khác vừa sửa phân cảnh → nạp lại bản mới (kèm version mới), giữ form mở; KHÔNG tự gửi lại.
        // Người dùng xem bản mới rồi quyết định lưu lại nội dung của mình hay không.
        setConflictEntityId(selectedScene.id);
        setConflictErrorMsg(err.message || t('writer.scriptEditor.sceneConflictFallback'));
        setConflictModalOpen(true);
        notify(
          t('writer.scriptEditor.sceneConflictTitle'),
          t('writer.scriptEditor.sceneConflictDesc', { message: err.message }),
        );
        await loadSceneDetail(selectedScene.id);
      } else if (err?.status === 403) {
        notify(t('writer.scriptEditor.noPermission403Title'), err.message);
      } else {
        notify(t('writer.scriptEditor.sceneActionErrorTitle'), err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // D12 — áp trạng thái chương máy chủ trả về rồi nạp lại chi tiết
  const applyChapterUpdate = async (updated: ChapterDto | null | undefined) => {
    if (updated) setCurrentChapter((prev) => (prev ? { ...prev, ...updated } : prev));
    if (currentChapter?.id) await refreshChapterDetail(currentChapter.id);
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
        const conflictMsg = t('scriptStudio.save.conflict');
        setConcurrencyError(conflictMsg);
        notify(conflictMsg, '');
        return;
      }
      notify(t('scriptStudio.lifecycle.submitFailed'), err?.message ?? '');
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
        setConcurrencyError(t('scriptStudio.save.conflict'));
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

  // Copilot viết lại 1 dòng thoại (writer.rewrite) hoặc gợi ý dòng tiếp theo (writer.next_line)
  const [rewritingLineId, setRewritingLineId] = useState<string | null>(null);
  const [runningNextLineKind, setRunningNextLineKind] = useState<NextLineKind | null>(null);
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
    setRunningNextLineKind(null);
  }, [currentChapter?.id]);

  const handleRewriteLineById = async (lineId: string, revisionOfSuggestionId?: string) => {
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
        ...(revisionOfSuggestionId ? { revisionOfSuggestionId } : {}),
      });
      setLineCopilotSuggestions((prev) => ({ ...prev, [lineId]: sug }));
    } catch (err: any) {
      const msg = err?.message || t('writer.scriptEditor.aiCopilotFallback');
      setLineCopilotErrors((prev) => ({ ...prev, [lineId]: msg }));
      notify(t('writer.scriptEditor.aiCopilotErrorTitle'), msg);
      if (err?.status === 409) {
        setConcurrencyError(msg);
        await handleAiReload();
      }
    } finally {
      setRewritingLineId((cur) => (cur === lineId ? null : cur));
    }
  };

  const handleRunNextLine = async ({
    sceneId,
    kind,
    afterLineId,
    speaker,
    revisionOfSuggestionId,
  }: {
    sceneId: string;
    kind: NextLineKind;
    afterLineId: string | null;
    speaker?: string | null;
    revisionOfSuggestionId?: string;
  }) => {
    const effectiveSeriesId = seriesId || currentChapter?.seriesId;
    if (!effectiveSeriesId || !sceneId) return;
    const slotKey = afterLineId || `scene-end:${sceneId}`;
    setRunningNextLineKind(kind);
    setActiveCopilotLineId(slotKey);
    setLineCopilotErrors((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    try {
      const sug = await aiAgentsService.runNextLine(effectiveSeriesId, {
        sceneId,
        kind,
        afterLineId,
        ...(speaker ? { speaker } : {}),
        ...(revisionOfSuggestionId ? { revisionOfSuggestionId } : {}),
      });
      setLineCopilotSuggestions((prev) => ({ ...prev, [slotKey]: sug }));
    } catch (err: any) {
      const msg = err?.message || t('writer.scriptEditor.aiCopilotFallback');
      setLineCopilotErrors((prev) => ({ ...prev, [slotKey]: msg }));
      notify(t('writer.scriptEditor.aiCopilotErrorTitle'), msg);
      if (err?.status === 409) {
        setConcurrencyError(msg);
        await handleAiReload();
      }
    } finally {
      setRunningNextLineKind(null);
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
        await handleAiReload(suggestion.kind);
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
        // "Yêu cầu sửa": chạy lại AI với lý do của người duyệt (BE ghép lý do vào đầu vào, BR-02)
        if (decision === 'request-changes') {
          if (suggestion.kind === 'LineRewrite') {
            await handleRewriteLineById(lineId, suggestion.id);
          } else if (suggestion.kind === 'ScriptLineInsert') {
            const p = suggestion.payload as unknown as NextLineSuggestion;
            await handleRunNextLine({
              sceneId: p.sceneId,
              kind: p.kind as NextLineKind,
              afterLineId: p.afterLineId ?? null,
              speaker: p.speaker ?? null,
              revisionOfSuggestionId: suggestion.id,
            });
          }
        }
      }
    } catch (err: any) {
      const msg = err?.message || t('writer.scriptEditor.aiDecisionFallback');
      setLineCopilotErrors((prev) => ({ ...prev, [lineId]: msg }));
      notify(t('writer.scriptEditor.aiDecisionErrorTitle'), msg);
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
    scriptPreviewSuggestion?.sceneId
      ? s.id === scriptPreviewSuggestion.sceneId
      : s.scriptLines?.some((l) => l.id === activeCopilotLineId),
  );

  const aiReadingDirection = toAiReadingDirection(seriesDetail?.readingDirection);
  const aiNameById = Object.fromEntries(
    allBibleEntries.map((e) => [e.id, getBibleEntryNameWithStage(e)]),
  );
  const scriptAiContext = useMemo<AiScriptDraftContext | undefined>(() => {
    if (!selectedScene) return undefined;
    const parsedSummary = parseScenePanelRange(selectedScene.summary);
    const sceneLines = Array.isArray(selectedScene.scriptLines) ? selectedScene.scriptLines : null;
    return {
      sceneTitle:
        selectedScene.heading || t('scriptStudio.scenes.scene', { n: selectedScene.sceneNumber }),
      sceneSummary: parsedSummary.cleanSummary || selectedScene.summary?.trim() || null,
      onOpenScenes: () => setActiveLeftDrawer('scenes'),
      hasStoryArc: seriesDetail ? Boolean(seriesDetail.storyArc?.trim()) : undefined,
      hasChapterOutline: currentChapter ? Boolean(currentChapter.outline?.trim()) : undefined,
      chapterOutline: currentChapter?.outline?.trim() || '',
      bibleEntryCount: allBibleEntries.filter((e) => e.isActive !== false).length,
      sceneLineCount: sceneLines ? sceneLines.length : undefined,
      linkedPanelLineCount: sceneLines
        ? sceneLines.filter((l) => l.panelId != null && l.panelId !== '').length
        : undefined,
      bibleCharacters: characters
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: c.id, name: getBibleEntryNameWithStage(c) })),
      onOpenBible: () => setActiveRightDrawer('bible'),
      onOpenStoryboard: () => setActiveRightDrawer('ai-storyboard'),
    };
  }, [
    selectedScene,
    t,
    setActiveLeftDrawer,
    seriesDetail,
    currentChapter,
    allBibleEntries,
    characters,
    setActiveRightDrawer,
  ]);

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
    scriptAction !== null && (scriptAction !== 'resubmit' || hasUnpushedChanges);
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
    () =>
      chapters.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        title: c.title
          ? `${c.title} ${t('navigation.breadcrumbs.scriptSuffix')}`
          : t('navigation.breadcrumbs.scriptSuffix'),
      })),
    [chapters],
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
      stages: [],
      isStageFlowCompleted: isScriptFrozen,
      isSubmittingStage: submittingToEditor,
      onSubmitStage: canSubmitScript ? () => submitScriptRef.current() : undefined,
      submitButtonLabel:
        scriptAction === 'resubmit'
          ? t('scriptStudio.submit.resubmit', 'Gửi lại kịch bản')
          : t('scriptStudio.submit.writer', 'Gửi duyệt kịch bản'),
    });
  }, [
    focusHeader,
    currentChapter,
    seriesDetail?.title,
    workspaceId,
    seriesId,
    headerChapters,
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

  return (
    <div className='flex-1 flex flex-col bg-[#F3F0E9] h-[calc(100vh-64px)] overflow-hidden text-[#1C1917]'>
      <h1 className='sr-only'>{t('writer.scriptEditor.srHeading')}</h1>

      {concurrencyError && (
        <div
          data-testid='concurrency-error-banner'
          role='alert'
          className='w-full bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between gap-3 text-xs text-amber-900 shrink-0'
        >
          <span>{concurrencyError}</span>
          <div className='flex items-center gap-2 shrink-0'>
            <button
              type='button'
              onClick={() => void handleReloadLatestWorkingCopy()}
              className='font-semibold underline hover:text-amber-950 cursor-pointer'
            >
              {t('scriptStudio.gn.reloadLatest', 'Tải lại bản mới nhất')}
            </button>
            <button
              type='button'
              onClick={() => setConcurrencyError(null)}
              className='text-amber-700 hover:text-amber-950 cursor-pointer'
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Toolbar row full-width: Chuẩn Stitch Writer Studio (Phân cảnh toggle + Series Bible / Góp ý / Version + Ctrl+S + Lưu) */}
      <div className='w-full bg-[#FBF9F4] border-b border-[#E8E3DA] px-4 py-2 flex items-center justify-between text-[13px] select-none shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'>
        {/* Left: Phân cảnh toggle */}
        <div className='flex items-center gap-2 shrink-0'>
          <button
            type='button'
            id='btn-toggle-scene-drawer'
            data-testid='rail-scenes-btn'
            onClick={() => toggleLeftDrawer('scenes')}
            title={t('collaboration.writerStudio.sceneOutline', 'Phân cảnh')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors shadow-2xs mr-1 cursor-pointer text-xs font-semibold ${
              activeLeftDrawer === 'scenes'
                ? 'border-primary/40 bg-orange-50 text-primary'
                : 'border-stone-200/80 hover:border-primary/40 bg-white text-stone-900'
            }`}
          >
            <Clapperboard className='w-4 h-4 text-[#EA580C]' />
            <span>{t('collaboration.writerStudio.sceneOutline', 'Phân cảnh')}</span>
            <span className='px-1.5 py-0.2 rounded-full text-xs font-bold bg-[#EA580C]/10 text-[#EA580C] font-mono'>
              {filteredScenes.length}
            </span>
          </button>
        </div>

        {/* Center space */}
        <div className='flex-1 flex items-center justify-center' />

        {/* Right: Drawer tabs (Series Bible, Góp ý, Version) + Ctrl+S + Lưu */}
        <div className='flex items-center gap-2 shrink-0 text-stone-600 text-xs'>
          <div
            className='flex items-center gap-1 bg-[#FAF9F5] p-0.5 rounded-lg border border-stone-200/80 shadow-2xs mr-1 select-none'
            id='toolbar-drawer-tabs'
          >
            <button
              type='button'
              id='right-tab-btn-bible'
              data-testid='rail-characters-btn'
              onClick={() => toggleRightDrawer('bible')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeRightDrawer === 'bible'
                  ? 'bg-[#EA580C] text-white shadow-xs font-semibold'
                  : 'text-stone-600 hover:bg-stone-200/60 font-medium'
              }`}
            >
              <BookOpen className='w-3.5 h-3.5' />
              <span>Series Bible</span>
            </button>

            <button
              type='button'
              id='right-tab-btn-feedback'
              data-testid='rail-comments-btn'
              onClick={() => toggleRightDrawer('comments')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeRightDrawer === 'comments'
                  ? 'bg-[#EA580C] text-white shadow-xs font-semibold'
                  : 'text-stone-600 hover:bg-stone-200/60 font-medium'
              }`}
            >
              <MessageSquare className='w-3.5 h-3.5' />
              <span>
                {tReview('scriptReview.comments.tab', { count: openScriptComments.length })}
              </span>
            </button>

            <button
              type='button'
              id='right-tab-btn-history'
              data-testid='open-script-history-btn'
              onClick={() => toggleRightDrawer('versions')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeRightDrawer === 'versions'
                  ? 'bg-[#EA580C] text-white shadow-xs font-semibold'
                  : 'text-stone-600 hover:bg-stone-200/60 font-medium'
              }`}
            >
              <History className='w-3.5 h-3.5' />
              <span>Version</span>
            </button>
          </div>

          <div className='h-4 w-px bg-stone-300 mx-1' />

          <span className='font-mono text-stone-400 text-xs hidden sm:inline'>Ctrl+S</span>

          {isScriptDirty && (
            <span
              data-testid='unsaved-badge'
              className='px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium'
            >
              {t('writer.statusDrawer.unsaved', 'Chưa lưu')}
            </span>
          )}

          {canEditScript && !isChapterLocked && (
            <button
              type='button'
              id='btn-save'
              data-testid='save-script-btn'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (editorSaveRef.current) {
                  void editorSaveRef.current();
                } else {
                  void handleSaveScript(
                    editorGetPayloadRef.current
                      ? editorGetPayloadRef.current()
                      : buildFallbackScriptTree(),
                  );
                }
              }}
              title='Ctrl + S'
              className='inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-stone-600 hover:text-primary'
            >
              <Save className='w-3.5 h-3.5' />
              <span>{t('scriptStudio.gn.save', 'Lưu')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Kịch bản đã chốt (Gate 1): giải thích vì sao editor chỉ đọc */}
      {isScriptFrozen && (
        <div
          data-testid='script-frozen-banner'
          role='status'
          className='shrink-0 border-b border-stone-300 bg-stone-100 px-4 py-2 text-xs text-stone-800 flex items-start gap-2'
        >
          <Lock className='w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-600' aria-hidden='true' />
          <div className='min-w-0'>
            <span className='font-bold'>{t('writer.statusDrawer.frozenBadge')}</span>
            {currentChapter?.scriptContentHash && (
              <span
                className='ml-2 font-mono text-[11px] text-stone-600'
                title={`SHA-256: ${currentChapter.scriptContentHash}`}
              >
                #{currentChapter.scriptContentHash.slice(0, 8)}
              </span>
            )}
            <span className='ml-2'>{t('writer.statusDrawer.frozenHandoffDesc')}</span>{' '}
            <span className='text-stone-600'>{t('writer.statusDrawer.frozenReadOnlyDesc')}</span>
          </div>
        </div>
      )}

      {/* Gate 1 bị chặn: còn biến thể Bible chưa khoá Canon (F#24) */}
      {isStartBlocked && (chapterCast?.gate?.blockers?.length ?? 0) > 0 && (
        <div
          data-testid='start-blocked-banner'
          role='status'
          className='shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900 flex flex-wrap items-center gap-x-3 gap-y-1'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 text-rose-600' aria-hidden='true' />
          <span>
            <strong>
              {t('scriptStudio.cast.startBlockedBanner', 'Chưa thể bắt đầu sản xuất')}:
            </strong>{' '}
            {t('writer.statusDrawer.startBlockedCount', {
              count: chapterCast?.gate?.blockers?.length ?? 0,
            })}
          </span>
          {workspaceId && seriesId && (
            <Link
              to={`/workspaces/${workspaceId}/series/${seriesId}/bible`}
              className='font-semibold text-rose-700 hover:text-rose-900 underline'
            >
              {t('writer.statusDrawer.openBibleForCanon')}
            </Link>
          )}
        </div>
      )}

      {/* 3. Bàn viết: ngăn kéo phân cảnh (trái) | editor surface (giữa) | drawers (phải) */}
      <div className='flex-1 flex overflow-hidden relative'>
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

        {activeLeftDrawer !== 'scenes' && (
          <div
            id='scene-collapsed-tab'
            data-testid='scene-collapsed-tab'
            onClick={() => toggleLeftDrawer('scenes')}
            title={t('scriptStudio.scenes.openListTitle')}
            className='w-11 bg-[#FBF9F4] border-r border-[#E8E3DA] flex flex-col items-center py-3 gap-3 shrink-0 cursor-pointer hover:bg-stone-100 transition-colors select-none'
          >
            <button
              type='button'
              className='w-7 h-7 rounded flex items-center justify-center text-[#EA580C] bg-[#EA580C]/10 border border-[#EA580C]/20 hover:bg-[#EA580C] hover:text-white transition-colors cursor-pointer'
            >
              <PanelLeft className='w-4 h-4' />
            </button>
            <span className='px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#EA580C] text-white font-mono'>
              {filteredScenes.length}
            </span>
            <div className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-900 uppercase py-3 [writing-mode:vertical-rl] rotate-180 flex-1 flex justify-center'>
              <Clapperboard className='w-3.5 h-3.5 text-[#EA580C] rotate-90' />
              <span>{t('scriptStudio.scenes.title', 'Phân cảnh')}</span>
            </div>
          </div>
        )}

        <div className='flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F4EFE8]/70'>
          {(loadingScenes || loadingChapters || loadingDetail) &&
          chapterScenesDetail.length === 0 &&
          !selectedScene ? (
            <div className='flex-1 flex flex-col items-center justify-center text-center p-12 text-stone-500'>
              <RefreshCw className='w-6 h-6 animate-spin text-[#C2410C] mb-3' />
              <p className='font-serif text-base text-stone-800'>
                {t('writer.scriptEditor.loadingScript')}
              </p>
            </div>
          ) : (
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
              onSave={handleSaveScript}
              syncRevision={workingCopySyncTick}
              onDirtyChange={(dirty) => {
                flowDirtyRef.current = dirty;
                setIsScriptDirty(dirty);
              }}
              registerSave={registerEditorSave}
              registerGetPayload={(fn) => {
                editorGetPayloadRef.current = fn;
              }}
              onShowToast={onShowToast}
              manuscriptTitle={formatChapterOption(
                currentChapter.chapterNumber,
                currentChapter.title,
              )}
              selectedSceneId={selectedScene?.id}
              selectedSceneHeading={selectedScene?.heading}
              onCaretSceneChange={handleCaretSceneChange}
              onRunNextLine={canEditScript && !isChapterLocked ? handleRunNextLine : undefined}
              runningNextLineKind={runningNextLineKind}
              onOpenAiPromptModal={
                canEditScript && !isChapterLocked
                  ? () => setActiveRightDrawer('ai-draft')
                  : undefined
              }
              onOpenAiDraft={
                canEditScript && !isChapterLocked
                  ? () => setActiveRightDrawer('ai-draft')
                  : undefined
              }
              onOpenAiStoryboard={
                canEditScript && !isChapterLocked
                  ? () => setActiveRightDrawer('ai-storyboard')
                  : undefined
              }
              sceneCount={filteredScenes.length}
              onToggleSceneOutline={() => toggleLeftDrawer('scenes')}
              isSceneOutlineOpen={activeLeftDrawer === 'scenes'}
              activeRightDrawer={activeRightDrawer}
              onToggleRightDrawer={toggleRightDrawer}
            />
          )}
        </div>

        {/* Right Drawers: Series Bible, Góp ý, Version */}
        {activeRightDrawer === 'bible' && (
          <aside
            id='script-right-drawer'
            className='w-80 border-l border-stone-200/80 flex flex-col shrink-0 h-full z-20'
          >
            <ScriptRightBiblePanel
              characters={characters}
              chapterCast={chapterCast}
              allBibleEntries={allBibleEntries}
              seriesId={seriesId || currentChapter?.seriesId}
              workspaceId={workspaceId}
              onClose={() => setActiveRightDrawer(null)}
            />
          </aside>
        )}

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
          />
        )}

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
      </div>

      {activeRightDrawer === 'ai-draft' &&
        (seriesId || currentChapter?.seriesId) &&
        currentChapter?.id &&
        selectedScene?.id && (
          <AiAssistPanel
            key={selectedScene.id}
            seriesId={(seriesId || currentChapter.seriesId)!}
            chapterId={currentChapter.id}
            sceneId={selectedScene.id}
            workflowType='Script'
            suggestionKind='Script'
            title={t('writer.scriptEditor.aiDraftTitle')}
            briefLabel={t('writer.scriptEditor.aiDraftBriefLabel')}
            briefPlaceholder={t('writer.scriptEditor.aiDraftBriefPlaceholder')}
            runLabel={t('writer.scriptEditor.aiDraftRunLabel')}
            readingDirection={aiReadingDirection}
            chapterVersion={currentChapter.versionVector}
            nameById={aiNameById}
            scriptContext={scriptAiContext}
            onClose={() => setActiveRightDrawer(null)}
            onReload={handleAiReload}
            onScriptPreview={setAiScriptPreview}
          />
        )}

      {activeRightDrawer === 'ai-storyboard' &&
        (seriesId || currentChapter?.seriesId) &&
        currentChapter?.id &&
        selectedScene?.id && (
          <AiAssistPanel
            key={`storyboard-${selectedScene.id}`}
            seriesId={(seriesId || currentChapter.seriesId)!}
            chapterId={currentChapter.id}
            sceneId={selectedScene.id}
            workflowType='Storyboard'
            suggestionKind='Layout'
            title={t('writer.scriptEditor.aiStoryboardTitle')}
            briefLabel={t('writer.scriptEditor.aiStoryboardBriefLabel')}
            briefPlaceholder={t('writer.scriptEditor.aiStoryboardBriefPlaceholder')}
            runLabel={t('writer.scriptEditor.aiStoryboardRunLabel')}
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
        closeLabel={t('writer.scriptEditor.close')}
        title={
          isEditingScene
            ? t('writer.scriptEditor.editSceneModalTitle')
            : t('writer.scriptEditor.createSceneModalTitle')
        }
      >
        <form onSubmit={handleSubmitScene} className='space-y-4'>
          <div className='p-2.5 bg-orange-50/80 border border-orange-200/70 rounded-xl text-xs text-orange-950'>
            {t('writer.scriptEditor.sceneNoteHint')}
          </div>

          <div>
            <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
              {t('writer.scriptEditor.sceneHeadingLabel')}
            </label>
            <input
              type='text'
              placeholder={t('writer.scriptEditor.sceneHeadingPlaceholder')}
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
                {t('writer.scriptEditor.fromPanelLabel')}
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
                {t('writer.scriptEditor.toPanelLabel')}
              </label>
              <input
                type='number'
                min={fromPanelInput || 1}
                value={toPanelInput}
                onChange={(e) =>
                  setToPanelInput(parseInt(e.target.value, 10) || fromPanelInput || 1)
                }
                className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                required
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-[#1C1917] mb-1'>
              {t('writer.scriptEditor.sceneNoteLabel')}
            </label>
            <textarea
              rows={3}
              placeholder={t('writer.scriptEditor.sceneNotePlaceholder')}
              value={sceneSummaryInput}
              onChange={(e) => setSceneSummaryInput(e.target.value)}
              className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] resize-none'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5'>
              <Compass className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('writer.scriptEditor.defaultNarrationModeLabel')}</span>
            </label>
            <select
              data-testid='scene-default-narration-mode-select'
              value={sceneDefaultNarrationMode}
              onChange={(e) => setSceneDefaultNarrationMode(e.target.value as NarrationMode)}
              className='w-full px-3 py-2 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917] cursor-pointer'
            >
              <option value='Present'>{t('writer.scriptEditor.narrationPresent')}</option>
              <option value='Flashback'>{t('writer.scriptEditor.narrationFlashback')}</option>
              <option value='Dream'>{t('writer.scriptEditor.narrationDream')}</option>
              <option value='Imagination'>{t('writer.scriptEditor.narrationImagination')}</option>
              <option value='Lie'>{t('writer.scriptEditor.narrationLie')}</option>
              <option value='Rumor'>{t('writer.scriptEditor.narrationRumor')}</option>
              <option value='UnreliableNarrator'>
                {t('writer.scriptEditor.narrationUnreliable')}
              </option>
            </select>
          </div>

          <div className='flex justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
            <button
              type='button'
              onClick={() => setSceneModalOpen(false)}
              className='px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] rounded-xl cursor-pointer'
            >
              {t('writer.scriptEditor.cancel')}
            </button>
            <button
              type='submit'
              disabled={submitting}
              className='px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer'
            >
              {submitting
                ? t('writer.scriptEditor.saving')
                : isEditingScene
                  ? t('writer.scriptEditor.updateSceneBtn')
                  : t('writer.scriptEditor.createSceneBtn')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Concurrency Conflict Modal (BR-11 / NFR-09) */}
      <ElementConflictModal
        isOpen={conflictModalOpen}
        title={t('writer.scriptEditor.conflictModalTitle')}
        subtitle='Optimistic Concurrency Control — SCRIPT_VERSION_CONFLICT'
        entityType={t('writer.scriptEditor.conflictEntityType')}
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
          targetName={t('writer.scriptEditor.deleteChapterTarget', {
            number: chapterToDelete.chapterNumber,
          })}
          title={t('writer.scriptEditor.deleteChapterTitle', {
            number: chapterToDelete.chapterNumber,
          })}
          description={t('writer.scriptEditor.deleteChapterDesc', {
            number: chapterToDelete.chapterNumber,
          })}
          confirmButtonText={
            isDeletingChapter
              ? t('writer.scriptEditor.deleting')
              : t('writer.scriptEditor.deleteChapterBtn')
          }
          cancelButtonText={t('writer.scriptEditor.cancel')}
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
          title={t('writer.scriptEditor.deleteSceneTitle', { number: sceneToDelete.sceneNumber })}
          size='sm'
          closeLabel={t('writer.scriptEditor.close')}
        >
          <div className='space-y-3 text-xs text-stone-700'>
            <p>
              {t('writer.scriptEditor.deleteSceneConfirmPrefix')}{' '}
              <strong>
                {sceneToDelete.heading ||
                  t('scriptStudio.scenes.scene', { n: sceneToDelete.sceneNumber })}
              </strong>
              ?
            </p>
            <p className='text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80'>
              {t('writer.scriptEditor.deleteSceneNote')}
            </p>
            <div className='flex justify-end gap-2 pt-2 border-t border-stone-200'>
              <button
                type='button'
                onClick={() => setSceneToDelete(null)}
                className='px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer'
              >
                {t('writer.scriptEditor.cancel')}
              </button>
              <button
                type='button'
                data-testid='confirm-delete-scene-btn'
                disabled={isDeletingScene}
                onClick={handleConfirmDeleteScene}
                className='px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer'
              >
                {isDeletingScene
                  ? t('writer.scriptEditor.deleting')
                  : t('writer.scriptEditor.deleteSceneBtn')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScriptEditorView;
