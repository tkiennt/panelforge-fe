import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { ChapterSelectionView } from '../components/script/chapter-selection';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import {
  assignmentService,
  ConsistencyFindingDto,
  ConsistencyCheckResultDto,
} from '@/services/assignment.service';
import { normalizeWorkspaceRole } from '@/types/auth';
import { AiAssistPanel } from '@/shared/features/ai-agents/AiAssistPanel';
import { ScriptHistoryModal } from '../components/script/ScriptHistoryModal';
import { ScriptLineItem } from '../components/script/ScriptLineItem';
import { NarrativeContextDrawer } from '../components/script/NarrativeContextDrawer';
import { ConsistencyFindingsDrawer } from '../components/script/ConsistencyFindingsDrawer';
import { ScreenplayFlowEditor } from '../components/script/flow/ScreenplayFlowEditor';
import { ScriptThumbnailStoryboardView } from '../components/script/storyboard';
import { ExtractedScriptLinePayload } from '../components/script/flow/scriptFlowAdapter';
import { BibleCharactersDrawer } from '../components/script/BibleCharactersDrawer';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { saveDraft, clearDraft, readRestorableDraft, type LocalDraft } from '@/lib/localDraft';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';
import { UnsavedChangesBar, LucianConfirmModal, TypeToConfirmModal } from '@/shared/components/lucian';
import { useTranslation } from '@/lib/i18n';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { ThumbnailDrawer } from '../components/script/thumbnail-studio/components/ThumbnailDrawer';
import { FloatingThumbnailPill } from '../components/script/thumbnail-studio/components/FloatingThumbnailPill';
import { ThumbnailStudioBoard } from '../components/script/thumbnail-studio/components/ThumbnailStudioBoard';
import { useComicStudioStore } from '../components/script/thumbnail-studio/store/useComicStudioStore';
import { scenesToComicScriptText } from '../components/script/thumbnail-studio/lib/comicScriptParser';

interface ScriptEditorViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

/**
 * Định dạng nhãn hiển thị chương trong dropdown để tránh lặp "Chương 1: Chương 1".
 */
// eslint-disable-next-line react-refresh/only-export-components
export const formatChapterOption = (chapterNumber: number, title?: string | null): string => {
  if (!title || !title.trim()) return `Chương ${chapterNumber}`;
  let clean = title.trim();

  // Xóa mọi tiền tố lặp như: "Chương 1:", "Chuong 1:", "Chapter 1 -", "Chap 1:"
  const prefixRegex = new RegExp(
    `^(?:chương|chuong|chapter|chap|c)\\s*#?${chapterNumber}\\s*[:\\-–—.]?\\s*`,
    'i'
  );
  if (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  } else {
    const genericPrefix = /^(?:chương|chuong|chapter|chap)\\s*[:\\-–—.]\\s*/i;
    if (genericPrefix.test(clean)) {
      clean = clean.replace(genericPrefix, '').trim();
    }
  }

  return clean ? `Chương ${chapterNumber}: ${clean}` : `Chương ${chapterNumber}`;
};

/**
 * Trả về tên kèm giai đoạn (stageName) hoặc phụ đề (subtitle) để phân biệt các phiên bản nhân vật.
 */
export const getBibleEntryNameWithStage = (entry?: BibleEntryDto | null): string => {
  if (!entry) return '';
  const stage = entry.effectiveRevision?.stageName?.trim() || entry.subtitle?.trim();
  return stage ? `${entry.name} (${stage})` : entry.name;
};

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { t } = useTranslation('production');
  const confirm = useConfirm();
  const { seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  const sceneIdFromUrl = searchParams.get('sceneId');

  // Phân quyền Zero-Trust RBAC:
  // - Producer: Có toàn quyền quản lý chương (khởi tạo chương, xoá chương, đóng băng/mở lại) và viết kịch bản.
  // - Writer: Soạn thảo kịch bản, chỉnh sửa outline/story arc, nhưng TUYỆT ĐỐI KHÔNG ĐƯỢC tạo chương mới hoặc xoá chương.
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const effectiveRole = normRole || (typeof window !== 'undefined' ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole')) : null);
  const canEditScript = !effectiveRole || effectiveRole === 'PRODUCER' || effectiveRole === 'WRITER';
  const isProducer = effectiveRole === 'PRODUCER';
  const canCreateChapter = isProducer;

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
  const [sceneToDelete, setSceneToDelete] = useState<SceneDto | null>(null);
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
    'narrative' | 'consistency' | 'characters' | null
  >(null);

  // Modals phụ trợ
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // V2.5: Chapter-Scoped Bible Gate & Script Freeze Gate
  const [bibleGateResult, setBibleGateResult] = useState<ChapterBibleGateResultDto | null>(null);
  const [loadingBibleGate, setLoadingBibleGate] = useState(false);
  const [freezingScript, setFreezingScript] = useState(false);
  const [bibleGateModalOpen, setBibleGateModalOpen] = useState(false);

  // V2.5: Chế độ soạn thảo kịch bản kép (Dual-Mode: Screenplay Flow làm mặc định + Card Mode làm tùy chọn xem cấu trúc)
  const [editorMode, setEditorMode] = useState<'flow' | 'cards' | 'thumbnail' | 'storyboard'>(
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

  // Đồng bộ Outline và nạp findings nhất quán khi currentChapter thay đổi
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

    void checkChapterBibleGate(currentChapter.id);
  }, [currentChapter?.id, currentChapter?.outline, checkChapterBibleGate]);

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
      let currentVersion = currentChapter.versionVector || 1;
      let hasChanges = false;

      const currentLines = activeScene.scriptLines || [];
      const currentMap = new Map(currentLines.map((l) => [l.id, l]));

      // 3. Xoá dòng đã bị lược bỏ trong TipTap (Phantom Lines Deletion)
      const extractedIds = new Set(extractedLines.map((l) => l.scriptLineId));
      const linesToDelete = currentLines.filter((l) => !extractedIds.has(l.id));

      for (const line of linesToDelete) {
        hasChanges = true;
        try {
          const res = await scriptLineService.deleteScriptLine(
            currentChapter.id,
            line.id,
            currentVersion
          );
          if (res?.chapterVersion) {
            currentVersion = res.chapterVersion;
          }
        } catch (delErr: any) {
          console.error(`Lỗi xoá dòng kịch bản ${line.id}:`, delErr);
        }
      }

      // 4. Cập nhật hoặc thêm mới các dòng
      const createdLineIdMap = new Map<string, string>();

      for (const line of extractedLines) {
        // Domain Invariant: Dòng kịch bản phải có thoại hoặc chỉ dẫn sân khấu
        const hasValidText = Boolean(line.dialogueText?.trim() || line.stageDirection?.trim());
        if (!hasValidText) continue;

        const existing = currentMap.get(line.scriptLineId);
        if (existing) {
          const isChanged =
            existing.dialogueText !== line.dialogueText ||
            existing.stageDirection !== line.stageDirection ||
            existing.speakerCharacterId !== line.speakerCharacterId ||
            existing.narrationMode !== line.narrationMode;

          if (isChanged) {
            hasChanges = true;
            const req: UpdateScriptLineRequest = {
              dialogueText: line.dialogueText || null,
              stageDirection: line.stageDirection || null,
              speakerCharacterId: line.speakerCharacterId || null,
              expectedChapterVersion: currentVersion,
              narrationMode: line.narrationMode,
            };
            const res = await scriptLineService.updateScriptLine(
              currentChapter.id,
              line.scriptLineId,
              req
            );
            if (res?.chapterVersion) {
              currentVersion = res.chapterVersion;
            }
          }
        } else {
          hasChanges = true;
          const req: CreateScriptLineRequest = {
            dialogueText: line.dialogueText || null,
            stageDirection: line.stageDirection || null,
            speakerCharacterId: line.speakerCharacterId || null,
            lineOrder: line.lineOrder,
            expectedChapterVersion: currentVersion,
            clientLineId: line.scriptLineId,
            narrationMode: line.narrationMode,
          };
          const res = await scriptLineService.createScriptLine(
            currentChapter.id,
            line.sceneId || activeScene.id,
            req
          );
          if (res?.chapterVersion) {
            currentVersion = res.chapterVersion;
          }
          if (res?.id) {
            createdLineIdMap.set(line.scriptLineId, res.id);
          }
        }
      }

      // 5. Cập nhật thứ tự các dòng (Reorder)
      const targetSceneId = activeScene.id;
      const sceneExtractedLines = extractedLines.filter(
        (l) => !l.sceneId || l.sceneId === targetSceneId
      );
      if (sceneExtractedLines.length > 1) {
        const reorderPayload = sceneExtractedLines.map((l, idx) => ({
          lineId: createdLineIdMap.get(l.scriptLineId) || l.scriptLineId,
          newOrder: idx + 1,
        }));
        try {
          await scriptLineService.reorderScriptLines(
            currentChapter.id,
            targetSceneId,
            reorderPayload,
            currentVersion
          );
          currentVersion += 1;
          hasChanges = true;
        } catch {
          // Bỏ qua lỗi reorder nếu backend đã tự sắp xếp theo lineOrder
        }
      }

      // 6. Cập nhật version mới nhất vào React state
      setCurrentChapter((prev) => (prev ? { ...prev, versionVector: currentVersion } : null));

      // 7. Đồng bộ lại chi tiết phân cảnh
      if (hasChanges && activeScene) {
        await loadSceneDetail(activeScene.id);
      }
    },
    [currentChapter, chapterScenesDetail, selectedScene, scenes, canEditScript, isChapterLocked, loadSceneDetail]
  );

  // Tự sinh Stub Entity từ @-mention để không làm ngắt dòng cảm xúc của Writer
  // Xử lý Xoá Phân Cảnh (Delete Scene - LucianConfirmModal)
  const handleConfirmDeleteScene = async () => {
    if (!sceneToDelete) return;
    setIsDeletingScene(true);
    try {
      await scriptLineService.deleteScene(sceneToDelete.id);
      notify(
        'Đã xoá phân cảnh',
        `Cảnh ${sceneToDelete.sceneNumber} (${sceneToDelete.heading || 'Không tên'}) đã được xoá an toàn.`
      );
      if (selectedScene?.id === sceneToDelete.id) {
        setSelectedScene(null);
      }
      setSceneToDelete(null);
      await loadScenes();
    } catch (err: any) {
      notify('Không thể xoá phân cảnh', err.message || 'Lỗi hệ thống');
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
          description: `Thực thể tạm (Stub) tự sinh từ kịch bản lúc viết thoại.`,
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
      setScenes(list);

      if (list.length > 0) {
        // Tải chi tiết tất cả các phân cảnh để dựng không gian kịch bản liền mạch
        const allDetails = await Promise.all(
          list.map((s) => scriptLineService.getSceneById(s.id).catch(() => null))
        );
        const validDetails = allDetails.filter((d): d is SceneDetailDto => d !== null);
        setChapterScenesDetail(validDetails);
        const matched = validDetails.find((s) => s.id === sceneIdFromUrl);
        const targetScene = matched || validDetails[0] || null;
        setSelectedScene(targetScene);
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
  }, [currentChapter, sceneIdFromUrl, notify, canEditScript, isChapterLocked]);

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
    loadSceneDetail(scene.id);
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

  const handleDeleteScene = async () => {
    if (!selectedScene) return;
    if (
      !(await confirm({
        title: `Xoá Phân cảnh ${selectedScene.sceneNumber}?`,
        description: 'Tất cả các dòng kịch bản trong phân cảnh này sẽ bị xoá.',
        confirmText: 'Xoá phân cảnh',
        cancelText: 'Hủy',
        variant: 'danger',
      }))
    )
      return;
    try {
      await scriptLineService.deleteScene(selectedScene.id);
      notify('Đã xoá phân cảnh', `Phân cảnh ${selectedScene.sceneNumber} đã được xoá.`);
      const remaining = scenes.filter((s) => s.id !== selectedScene.id);
      setScenes(remaining);
      if (remaining.length > 0) {
        handleSelectScene(remaining[0]);
      } else {
        setSelectedScene(null);
      }
    } catch (err: any) {
      if (err?.status === 403) {
        notify('Không có quyền xoá phân cảnh (403)', err.message);
      } else {
        notify('Lỗi xoá phân cảnh', err.message);
      }
    }
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
      notify('Lỗi sắp xếp dòng', err.message || 'Không thể cập nhật thứ tự dòng kịch bản.');
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
    const found = characters.find((c) => c.id === speakerId);
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
      await chapterService.freezeScript(currentChapter.id);
      notify(
        'Đã duyệt kịch bản',
        `Kịch bản Chương ${currentChapter.chapterNumber} đã đóng băng và chuyển giao sang khâu sản xuất hình ảnh thành công.`,
      );
      setCurrentChapter((prev) => (prev ? { ...prev, isScriptFrozen: true } : prev));
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
      setCurrentChapter((prev) => (prev ? { ...prev, isScriptFrozen: false } : prev));
      await refreshChapterDetail(currentChapter.id);
      void checkChapterBibleGate(currentChapter.id);
    } catch (err: any) {
      notify('Không thể mở lại kịch bản', err.message);
    } finally {
      setFreezingScript(false);
    }
  };

  const aiReadingDirection =
    seriesDetail?.readingDirection === 1 || seriesDetail?.readingDirection === 'RightToLeft'
      ? 'RightToLeft'
      : 'LeftToRight';

  const handleAiReload = async () => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    await refreshChapterDetail(currentChapter.id);
    await loadSceneDetail(selectedScene.id);
  };

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

  // Nếu chưa chọn Chapter (hoặc vừa vào trang chưa có query chapterId): Hiển thị màn hình Chọn Chương
  if (!currentChapter) {
    return (
      <div className='flex-1 flex flex-col bg-[#F3F0E9] h-[calc(100vh-64px)] overflow-hidden text-[#1C1917]'>
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
      {/* LUCIAN UX/UI x CHECKLIST DESIGN: MINIMALIST EDITORIAL HEADER (44px) */}
      <header className='shrink-0 bg-[#FCFBF8] border-b border-[#EBE7DF] px-4 md:px-6 py-2 flex items-center justify-between gap-3 shadow-2xs z-30 min-h-[44px]'>
        <h1 className='sr-only'>Biên Soạn Kịch Bản Phân Cảnh (Script Editor)</h1>

        {/* 1. Trái: Context Chương (Breadcrumb-style) + Trạng thái lưu */}
        <div className='flex items-center gap-2.5 shrink-0 z-10'>
          {chapters.length > 0 && (
            <div className='flex items-center gap-2 bg-[#F3F0E9]/70 hover:bg-[#F3F0E9] px-3 py-1.5 rounded-xl border border-[#E5E0D8] transition-colors shadow-2xs shrink-0 group'>
              <BookOpen className='w-4 h-4 text-[#C2410C] shrink-0' />
              <label
                htmlFor='script-chapter-select'
                className='text-[11px] font-bold uppercase tracking-wider text-[#78716C]'
              >
                Chương:
              </label>
              <select
                id='script-chapter-select'
                value={currentChapter?.id || ''}
                onChange={(e) => handleSelectChapter(e.target.value)}
                className='bg-transparent text-xs font-bold text-[#1C1917] outline-none cursor-pointer max-w-[280px] truncate pr-1'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatChapterOption(c.chapterNumber, c.title)}
                  </option>
                ))}
                <option value='__all__'>← Chọn chương khác...</option>
              </select>
              {isProducer && currentChapter && !isChapterLocked && (
                <button
                  type='button'
                  data-testid='delete-current-chapter-btn'
                  onClick={() => setChapterToDelete(currentChapter)}
                  className='p-1 text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-colors cursor-pointer shrink-0 ml-0.5'
                  title={`Xoá Chương ${currentChapter.chapterNumber}`}
                  aria-label={`Xoá Chương ${currentChapter.chapterNumber}`}
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              )}
            </div>
          )}

          {/* Nút quay lại màn hình chọn chương */}
          <button
            type='button'
            data-testid='back-to-chapter-selection-btn'
            onClick={handleBackToChapterSelection}
            className='flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE7DF] rounded-xl transition-colors cursor-pointer shrink-0 border border-[#E5E0D8] bg-[#F3F0E9]/50 shadow-2xs'
            title='Quay lại màn hình danh sách chọn chương'
          >
            <ChevronLeft className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Đổi chương</span>
          </button>

          {/* Trạng thái lưu tinh gọn */}
          <div className='flex items-center text-xs font-mono'>
            {savingStoryArc || savingOutline || submitting ? (
              <span className='flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md'>
                <RefreshCw className='w-3 h-3 animate-spin text-amber-600' />
                <span className='hidden sm:inline'>Đang lưu...</span>
              </span>
            ) : hasUnsavedChanges ? (
              <span className='flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-300/60 px-2 py-0.5 rounded-md'>
                <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
                <span className='hidden sm:inline'>Chưa lưu</span>
              </span>
            ) : (
              <span className='flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2 py-0.5 rounded-md'>
                <Check className='w-3 h-3 text-emerald-600' />
                <span className='hidden sm:inline'>Đã lưu</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Giữa: Lucian #039 Sliding Pill Tabs (Segmented Control Chế độ xem) */}
        <div className='flex items-center bg-[#F3F0E9] p-0.5 rounded-xl border border-[#E5E0D8] shadow-2xs'>
          <button
            type='button'
            data-testid='tab-flow'
            onClick={() => setEditorMode('flow')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'flow'
                ? 'bg-white text-[#1C1917] shadow-2xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
            title='Soạn thảo kịch bản liên tục dạng văn bản'
          >
            <FileText className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Trang giấy</span>
          </button>
          <button
            type='button'
            data-testid='tab-cards'
            onClick={() => setEditorMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'cards'
                ? 'bg-white text-[#1C1917] shadow-2xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
            title='Xem cấu trúc theo thẻ phân cảnh'
          >
            <Layers className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Thẻ cảnh</span>
          </button>
          <button
            type='button'
            data-testid='tab-thumbnail'
            onClick={() => setEditorMode('thumbnail')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'thumbnail' || editorMode === 'storyboard'
                ? 'bg-white text-[#1C1917] shadow-2xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
            title='Không gian phân rã khung & vẽ phác thảo Thumbnail'
          >
            <Film className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Thumbnail</span>
          </button>
        </div>

        {/* 3. Phải: Nhóm công cụ phụ trợ tối giản (Checklist: High Proximity, Low Visual Noise) */}
        <div className='flex items-center gap-1.5'>
          {/* Đề cương & Bối cảnh */}
          <button
            type='button'
            data-testid='toggle-narrative-context-btn'
            onClick={() =>
              setActiveSideDrawer((prev) => (prev === 'narrative' ? null : 'narrative'))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              activeSideDrawer === 'narrative'
                ? 'bg-[#FFF2E6] text-[#C2410C] border-[#F97316] font-bold shadow-2xs'
                : 'bg-white/80 text-[#57534E] hover:bg-[#F3F0E9] border-[#E5E0D8]'
            }`}
            title='Đề cương & Bối cảnh phân cảnh'
          >
            <Compass className='w-3.5 h-3.5 text-[#C2410C]' />
            <span className='hidden lg:inline'>Đề cương</span>
            {outlineWordCount > 0 && (
              <span className='text-[10px] font-mono font-bold bg-[#F8F6F0] px-1 rounded text-[#1C1917]'>
                {outlineWordCount}
              </span>
            )}
          </button>

          {/* Kiểm tra nhất quán */}
          <button
            type='button'
            data-testid='run-consistency-check-btn'
            onClick={handleRunConsistencyCheck}
            disabled={loadingConsistency || !currentChapter?.id}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
              activeSideDrawer === 'consistency'
                ? 'bg-violet-700 text-white border-transparent shadow-2xs font-bold'
                : 'bg-white/80 text-violet-900 hover:bg-violet-50 border-[#E5E0D8]'
            }`}
            title={`Kiểm tra nhất quán (${openFindingsCount} cần xử lý)`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${activeSideDrawer === 'consistency' ? 'text-white' : 'text-violet-600'} ${loadingConsistency ? 'animate-spin' : ''}`}
            />
            <span className='hidden lg:inline'>Nhất quán</span>
            {openFindingsCount > 0 && (
              <span className='px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold'>
                {openFindingsCount}
              </span>
            )}
          </button>

          {/* Nhân vật Series Bible */}
          <button
            type='button'
            aria-label='Nhân vật Bible'
            onClick={() =>
              setActiveSideDrawer((prev) => (prev === 'characters' ? null : 'characters'))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              activeSideDrawer === 'characters'
                ? 'bg-purple-700 text-white border-transparent shadow-2xs font-bold'
                : 'bg-white/80 text-purple-900 hover:bg-purple-50 border-[#E5E0D8]'
            }`}
            title='Xem danh sách nhân vật Canon từ Series Bible'
          >
            <User
              className={`w-3.5 h-3.5 ${activeSideDrawer === 'characters' ? 'text-white' : 'text-purple-600'}`}
            />
            <span className='hidden lg:inline'>Nhân vật Bible ({characters.length})</span>
          </button>

          {/* Chapter-Scoped Bible Gate */}
          {currentChapter && (
            <button
              type='button'
              onClick={() => setBibleGateModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                bibleGateResult?.isPassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : bibleGateResult && !bibleGateResult.isPassed
                    ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    : 'bg-white/80 text-[#57534E] border-[#E5E0D8] hover:bg-[#F3F0E9]'
              }`}
              title='Rào chắn Bible theo Chương (Bible Gate)'
              data-testid='chapter-bible-gate-btn'
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  bibleGateResult?.isPassed
                    ? 'text-emerald-600'
                    : bibleGateResult && !bibleGateResult.isPassed
                      ? 'text-rose-600'
                      : 'text-gray-500'
                }`}
              />
              <span className='hidden xl:inline'>Bible Gate</span>
            </button>
          )}

          {/* Nút Làm mới */}
          <button
            type='button'
            onClick={() => {
              if (currentChapter?.id) {
                refreshChapterDetail(currentChapter.id);
                loadScenes();
                void checkChapterBibleGate(currentChapter.id);
              }
            }}
            disabled={loadingScenes || loadingDetail}
            className='p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-[#E5E0D8] rounded-xl transition-all cursor-pointer bg-white/80'
            title='Làm mới kịch bản'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingScenes || loadingDetail ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Producer Freeze Script Button */}
          {normRole === 'PRODUCER' && !isScriptFrozen && currentChapter && (
            <button
              type='button'
              disabled={freezingScript || (bibleGateResult !== null && !bibleGateResult.isPassed)}
              onClick={() => void handleFreezeScript()}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:bg-zinc-300 disabled:text-zinc-500 rounded-xl transition-all cursor-pointer shadow-2xs ml-1'
              title='Duyệt kịch bản và bắt đầu sản xuất hình ảnh'
              data-testid='freeze-script-btn'
            >
              <Sparkles className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Duyệt kịch bản</span>
            </button>
          )}
        </div>
      </header>

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
                    <span className='font-bold text-xs uppercase tracking-wider bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded'>
                      🔒 Kịch bản đã đóng băng (Frozen / Read-only)
                    </span>
                    <span className='text-[11px] text-indigo-700 font-medium'>
                      Đã chuyển giao cho Artist dựng Thumbnail &amp; Layout
                    </span>
                  </div>
                  <p className='text-[11px] text-indigo-800/80 mt-0.5'>
                    Writer không thể sửa trực tiếp kịch bản để tránh xung đột khung tranh của hoạ
                    sĩ.
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
                  chế độ chỉ đọc để bảo vệ tính toàn vẹn sản xuất.
                </span>
              </div>
              <span className='text-xs font-bold uppercase tracking-wider bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-full shrink-0'>
                Chỉ đọc
              </span>
            </div>
          )}

          {!canEditScript && !isChapterLocked && (
            <div
              data-testid='role-view-only-banner'
              className='p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-blue-900'
            >
              <div className='flex items-center gap-2'>
                <Info className='w-4 h-4 text-blue-600 shrink-0' />
                <span className='text-xs font-medium'>
                  Chế độ xem: Bạn đang xem kịch bản với quyền tham khảo. Chỉ vai trò{' '}
                  <strong>Producer</strong> hoặc <strong>Writer</strong> mới có quyền tạo và chỉnh
                  sửa kịch bản.
                </span>
              </div>
              <span className='text-xs font-bold uppercase tracking-wider bg-blue-200/90 text-blue-900 px-2.5 py-0.5 rounded-full shrink-0'>
                Tham khảo
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Khu vực làm việc chính: Phân cảnh (trái, có thể thu gọn) | Editor (trung tâm) | Drawers (phải) */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* LEFT: Điều hướng phân cảnh (Collapsible) */}
        <div
          className={`shrink-0 border-r border-[#D8D2C5] bg-[#FCFBF8] flex flex-col transition-all duration-200 z-10 ${
            isSceneNavOpen ? 'w-[260px] md:w-[280px]' : 'w-12'
          }`}
        >
          {/* Header thanh phân cảnh */}
          <div className='p-3 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center justify-between gap-2'>
            {isSceneNavOpen ? (
              <>
                <div className='flex items-center gap-2 min-w-0'>
                  <Clapperboard className='w-4 h-4 text-[#C2410C] shrink-0' />
                  <h2 className='text-xs font-bold text-[#1C1917] truncate'>
                    Phân cảnh ({scenes.length})
                  </h2>
                </div>
                <div className='flex items-center gap-1'>
                  {canEditScript && !isChapterLocked && (
                    <button
                      type='button'
                      onClick={handleOpenCreateScene}
                      className='p-1 text-[#C2410C] hover:bg-[#FFF2E6] rounded-lg cursor-pointer transition-colors'
                      title='Thêm phân cảnh mới'
                    >
                      <Plus className='w-4 h-4' />
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={() => setIsSceneNavOpen(false)}
                    className='p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
                    title='Thu gọn danh sách cảnh'
                  >
                    <PanelLeftClose className='w-4 h-4' />
                  </button>
                </div>
              </>
            ) : (
              <button
                type='button'
                onClick={() => setIsSceneNavOpen(true)}
                className='w-full flex items-center justify-center p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer'
                title='Mở rộng danh sách cảnh'
              >
                <PanelLeft className='w-4 h-4 text-[#C2410C]' />
              </button>
            )}
          </div>

          {/* Nội dung danh sách phân cảnh */}
          {isSceneNavOpen ? (
            <>
              {/* Search cảnh nếu có nhiều hơn 3 cảnh */}
              {scenes.length > 3 && (
                <div className='p-2 border-b border-[#D8D2C5] bg-[#F8F6F0]/60'>
                  <div className='relative'>
                    <Search className='w-3 h-3 text-[#57534E] absolute left-2.5 top-2' />
                    <input
                      type='text'
                      value={sceneSearchQuery}
                      onChange={(e) => setSceneSearchQuery(e.target.value)}
                      placeholder='Tìm phân cảnh...'
                      className='w-full pl-7 pr-2 py-1 text-xs border border-[#D8D2C5] rounded-lg outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
                    />
                  </div>
                </div>
              )}

              <div className='flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar'>
                {scenes.length === 0 ? (
                  <div className='text-center py-10 px-3 text-xs text-[#57534E] bg-[#FCFBF8] rounded-xl border border-dashed border-[#D8D2C5]'>
                    Chương này chưa có phân cảnh nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        type='button'
                        onClick={handleOpenCreateScene}
                        className='block mx-auto mt-2 text-[#C2410C] font-bold hover:underline cursor-pointer'
                      >
                        + Tạo cảnh đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  filteredScenes.map((s) => {
                    const isSelected = selectedScene?.id === s?.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectScene(s)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-[#F97316] bg-[#FFF2E6] shadow-2xs border-l-4 border-l-[#C2410C]'
                            : 'border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F8F6F0] hover:border-[#D8D2C5]'
                        }`}
                      >
                        <div className='flex items-center justify-between text-xs font-bold mb-0.5'>
                          <span
                            className={isSelected ? 'text-[#1C1917] font-bold' : 'text-[#1C1917]'}
                          >
                            Cảnh {s.sceneNumber}
                          </span>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-mono text-xs text-[#57534E] bg-[#F3F0E9] border border-[#D8D2C5] px-2 py-0.5 rounded-md'>
                              {s.scriptLinesCount} dòng
                            </span>
                            {canEditScript && !isChapterLocked && (
                              <button
                                type='button'
                                data-testid={`delete-scene-btn`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSceneToDelete(s);
                                }}
                                className='p-1 text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-colors cursor-pointer'
                                title={`Xoá Cảnh ${s.sceneNumber}`}
                                aria-label={`Xoá Cảnh ${s.sceneNumber}`}
                              >
                                <Trash2 className='w-3 h-3' />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className='text-xs text-[#1C1917] font-medium truncate'>
                          {s.heading || 'Chưa đặt tiêu đề'}
                        </div>
                        {s.summary && (
                          <p className='text-xs text-[#57534E] line-clamp-1 mt-0.5'>{s.summary}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            // Dạng thu gọn (Icon mini rail)
            <div className='flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar flex flex-col items-center'>
              {scenes.map((s) => {
                const isSelected = selectedScene?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type='button'
                    onClick={() => handleSelectScene(s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F97316] text-white shadow-xs'
                        : 'text-[#57534E] hover:bg-[#F3F0E9]'
                    }`}
                    title={`Cảnh ${s.sceneNumber}: ${s.heading || 'Chưa đặt tiêu đề'}`}
                  >
                    {s.sceneNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER: Bàn làm việc Kịch bản (Ưu tiên vùng nhìn đầu tiên, tràn chiều rộng) */}
        <div className='flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F3F0E9]'>


          {selectedScene ? (
            <>
              {/* Scene Header & Actions */}
              <div className='shrink-0 bg-[#FCFBF8] border-b border-[#D8D2C5] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs'>
                <div className='min-w-0 flex-1'>
                  <div>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='px-2.5 py-0.5 rounded-md bg-[#1C1917] text-[#FCFBF8] font-mono text-xs font-bold tracking-wider'>
                        CẢNH {selectedScene.sceneNumber}
                      </span>
                      <span className='text-xs font-mono text-[#57534E]'>
                        ID: {selectedScene.id ? `${selectedScene.id.substring(0, 8)}...` : 'N/A'}
                      </span>
                      {selectedScene.defaultNarrationMode &&
                        selectedScene.defaultNarrationMode !== 'Present' && (
                          <span className='text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full'>
                            Mặc định: {selectedScene.defaultNarrationMode}
                          </span>
                        )}
                    </div>
                    <h3 className='text-base md:text-lg font-bold font-serif text-[#1C1917] mt-1 truncate'>
                      {selectedScene.heading || 'Phân cảnh chưa đặt tiêu đề'}
                    </h3>
                    {selectedScene.summary && (
                      <p className='text-xs text-[#57534E] italic mt-0.5 truncate'>
                        &ldquo;{selectedScene.summary}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Toolbar cho phân cảnh */}
                <div className='flex items-center gap-2 flex-wrap shrink-0'>
                  {canEditScript && !isChapterLocked && editorMode === 'cards' && selectedScene && (
                    <div className='flex items-center gap-1 border-r border-[#D8D2C5] pr-2 mr-1'>
                      <button
                        type='button'
                        onClick={handleOpenEditScene}
                        className='p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
                        title='Sửa tiêu đề & tóm tắt phân cảnh'
                      >
                        <Edit2 className='w-4 h-4' />
                      </button>
                      <button
                        type='button'
                        onClick={handleDeleteScene}
                        className='p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors'
                        title='Xoá phân cảnh'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  )}



                  <button
                    type='button'
                    data-testid='toggle-thumbnail-drawer-btn'
                    onClick={() => setEditorMode('thumbnail')}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#C2410C] bg-[#FFF2E6] hover:bg-[#FFE5D0] border border-[#F97316]/40 rounded-full transition-all cursor-pointer shadow-xs'
                    title='Xem Storyboard & Thẻ phân cảnh Thumbnail (Phím tắt: Ctrl+B)'
                  >
                    <Film className='w-3.5 h-3.5 text-[#C2410C]' />
                    <span>🎞️ Storyboard / Thumbnails</span>
                  </button>

                  <button
                    type='button'
                    data-testid='open-script-history-btn'
                    onClick={() => setHistoryOpen(true)}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#57534E] bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] rounded-full transition-all cursor-pointer shadow-soft-sm'
                  >
                    <History className='w-3.5 h-3.5 text-[#57534E]' />
                    <span className='hidden sm:inline'>Lịch sử phiên bản</span>
                  </button>

                  {canEditScript && (
                    <button
                      type='button'
                      data-testid='open-ai-draft-btn'
                      onClick={() => setAiPanelOpen(true)}
                      className='inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-full transition-all cursor-pointer shadow-soft-sm'
                    >
                      <Sparkles className='w-3.5 h-3.5 text-violet-600' />
                      <span className='hidden sm:inline'>Viết nháp bằng AI</span>
                    </button>
                  )}

                  {canEditScript && !isChapterLocked && (editorMode === 'cards' || isTestEnvironment) && (
                    <button
                      type='button'
                      data-testid='open-add-line-btn'
                      onClick={handleOpenAddLine}
                      className='btn-cta-primary'
                    >
                      <Plus className='w-4 h-4' />
                      <span>Thêm Dòng Kịch Bản</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách Dòng Kịch Bản (Ưu tiên vùng nhìn đầu tiên) */}
              <div className='flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 custom-scrollbar'>
                {loadingDetail ? (
                  <div className='flex items-center justify-center py-20 text-[#57534E] text-xs'>
                    <RefreshCw className='w-5 h-5 animate-spin mr-2 text-[#C2410C]' />
                    <span>Đang nạp chi tiết phân cảnh...</span>
                  </div>
                ) : editorMode === 'thumbnail' || editorMode === 'storyboard' ? (
                  /* THUMBNAIL STUDIO & STORYBOARD BOARD */
                  <div className='flex-1 flex flex-col h-full -m-4 md:-m-6'>
                    <ThumbnailStudioBoard
                      scenes={chapterScenesDetail.length > 0 ? chapterScenesDetail : (selectedScene ? [selectedScene] : [])}
                      canEdit={canEditScript && !isChapterLocked}
                      getSpeakerName={getSpeakerName}
                      onShowToast={onShowToast}
                    />
                  </div>
                ) : editorMode === 'flow' ? (
                  /* TRANG GIẤY KỊCH BẢN (EDITORIAL SCRIPT PAPER) */
                  <div className='max-w-4xl mx-auto'>
                    <ScreenplayFlowEditor
                      key={selectedScene.id}
                      chapterId={currentChapter?.id}
                      scenes={[selectedScene]}
                      allBibleEntries={allBibleEntries}
                      consistencyFindings={findings}
                      canEditScript={canEditScript}
                      isChapterLocked={isChapterLocked}
                      getSpeakerName={getSpeakerName}
                      onSaveLines={handleSaveFlowLines}
                      onCreateStub={handleCreateStubEntity}
                      onShowToast={onShowToast}
                    />
                  </div>
                ) : !selectedScene.scriptLines || selectedScene.scriptLines.length === 0 ? (
                  <div className='text-center py-16 border border-dashed border-[#D8D2C5] rounded-2xl text-[#57534E] text-xs bg-[#FCFBF8]'>
                    <MessageSquare className='w-8 h-8 text-[#57534E]/50 mx-auto mb-2' />
                    Phân cảnh này chưa có dòng kịch bản nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        type='button'
                        onClick={handleOpenAddLine}
                        className='block mx-auto mt-3 px-3.5 py-1.5 text-xs font-bold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl cursor-pointer shadow-xs'
                      >
                        + Thêm dòng kịch bản đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  selectedScene.scriptLines.map((line, index) => {
                    const speakerName = getSpeakerName(line.speakerCharacterId);
                    const character = characters.find((c) => c.id === line.speakerCharacterId);
                    const isFirst = index === 0;
                    const isLast = index === (selectedScene.scriptLines?.length || 0) - 1;
                    const isDragging = draggedLineIndex === index;
                    const isDragOver = dragOverLineIndex === index && draggedLineIndex !== index;
                    const isHighlighted = highlightedLineId === line.id;

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
                        speakerName={speakerName}
                        character={character}
                        allBibleEntries={allBibleEntries}
                        isFirst={isFirst}
                        isLast={isLast}
                        canEditScript={canEditScript}
                        isChapterLocked={isChapterLocked}
                        isReorderingLines={isReorderingLines}
                        isDragging={isDragging}
                        isDragOver={isDragOver}
                        isHighlighted={isHighlighted}
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
            </>
          ) : loadingScenes || loadingChapters || loadingDetail ? (
            <div className='flex-1 flex flex-col items-center justify-center text-center p-12 text-[#57534E]'>
              <RefreshCw className='w-8 h-8 animate-spin text-[#C2410C] mb-3' />
              <h3 className='text-sm font-bold text-[#1C1917]'>Đang nạp kịch bản...</h3>
              <p className='text-xs mt-1 text-[#57534E]'>Chuẩn bị không gian soạn thảo kịch bản trực tiếp</p>
            </div>
          ) : (
            // Mở thẳng trình soạn thảo Screenplay Flow, loại bỏ hoàn toàn màn hình trung gian chọn phân cảnh
            <div className='flex-1 flex flex-col overflow-hidden'>
              {editorMode === 'thumbnail' || editorMode === 'storyboard' ? (
                <div className='flex-1 flex flex-col h-full'>
                  <ThumbnailStudioBoard
                    scenes={chapterScenesDetail.length > 0 ? chapterScenesDetail : []}
                    canEdit={canEditScript && !isChapterLocked}
                    getSpeakerName={getSpeakerName}
                    onShowToast={onShowToast}
                  />
                </div>
              ) : (
              <ScreenplayFlowEditor
                chapterId={currentChapter?.id}
                scenes={chapterScenesDetail.length > 0 ? chapterScenesDetail : []}
                allBibleEntries={allBibleEntries}
                consistencyFindings={findings}
                canEditScript={canEditScript}
                isChapterLocked={isChapterLocked}
                getSpeakerName={getSpeakerName}
                onSaveLines={handleSaveFlowLines}
                onCreateStub={handleCreateStubEntity}
                onShowToast={onShowToast}
              />
            )}
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
                  Phiên bản chương hiện tại: <strong>v{currentChapter?.versionVector}</strong>
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

      {/* Lucian #269 & #072: Modal Xoá Phân Cảnh (Delete Scene Confirmation) */}
      <LucianConfirmModal
        isOpen={Boolean(sceneToDelete)}
        title={`Xoá Cảnh ${sceneToDelete?.sceneNumber}: ${sceneToDelete?.heading || 'Chưa đặt tiêu đề'}?`}
        description='Toàn bộ các dòng kịch bản trong phân cảnh này sẽ bị xoá mềm. Các panel truyện gắn vào phân cảnh sẽ được gỡ liên kết an toàn.'
        confirmText={isDeletingScene ? 'Đang xoá...' : 'Xác nhận xoá'}
        cancelText='Huỷ bỏ'
        variant='danger'
        onConfirm={handleConfirmDeleteScene}
        onCancel={() => setSceneToDelete(null)}
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

      {/* Slide-over Thumbnail Drawer (On-demand Reactive Storyboard) */}
      <ThumbnailDrawer />

      {/* Persistent Floating Shortcut Pill (Page X | Panel Y) */}
      <FloatingThumbnailPill />
    </div>
  );
};
