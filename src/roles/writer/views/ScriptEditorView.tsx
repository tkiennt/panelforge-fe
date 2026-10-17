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
import { chapterService, ChapterDto } from '@/services/chapter.service';
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
import { BibleCharactersDrawer } from '../components/script/BibleCharactersDrawer';

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
  const trimmed = title.trim();
  const prefixRegex = new RegExp(`^chương\\s+${chapterNumber}\\s*[:\\-–—]?\\s*`, 'i');
  if (prefixRegex.test(trimmed)) {
    const clean = trimmed.replace(prefixRegex, '').trim();
    return clean ? `Chương ${chapterNumber}: ${clean}` : `Chương ${chapterNumber}`;
  }
  return `Chương ${chapterNumber}: ${trimmed}`;
};

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  const sceneIdFromUrl = searchParams.get('sceneId');

  // Phân quyền: Producer và Writer được ghi kịch bản
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const canEditScript = !normRole || normRole === 'PRODUCER' || normRole === 'WRITER';

  // Dữ liệu kịch bản
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterDto | null>(null);
  const [characters, setCharacters] = useState<BibleEntryDto[]>([]);
  const [allBibleEntries, setAllBibleEntries] = useState<BibleEntryDto[]>([]);

  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneDetailDto | null>(null);

  // Trạng thái tải & lỗi
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Banner xung đột phiên bản (409 CONFLICT)
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);

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
        setChapters(chapRes.items);

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

        if (chapRes.items.length > 0) {
          const matched = chapRes.items.find((c) => c.id === chapterIdFromUrl);
          const activeChap = matched || chapRes.items[0];
          setCurrentChapter(activeChap);
          setOutlineInput(activeChap.outline || '');
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
  const loadScenes = useCallback(async () => {
    if (!currentChapter?.id) {
      setScenes([]);
      setSelectedScene(null);
      return;
    }
    setLoadingScenes(true);
    try {
      const list = await scriptLineService.getScenesByChapter(currentChapter.id);
      setScenes(list);

      if (list.length > 0) {
        const matched = list.find((s) => s.id === sceneIdFromUrl);
        const targetScene = matched || list[0];
        loadSceneDetail(targetScene.id);
      } else {
        setSelectedScene(null);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách phân cảnh:', err);
      notify('Lỗi tải kịch bản', err.message || 'Không thể tải danh sách phân cảnh');
    } finally {
      setLoadingScenes(false);
    }
  }, [currentChapter, sceneIdFromUrl, loadSceneDetail, notify]);

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

  // Chọn Chapter từ dropdown (bảo vệ thay đổi chưa lưu)
  const handleSelectChapter = (chapId: string) => {
    if (hasUnsavedChanges) {
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

  // --- STORY ARC (SERIES) & OUTLINE (CHAPTER) ---
  const handleSaveStoryArc = async () => {
    if (!seriesId || !canEditScript) return;
    setSavingStoryArc(true);
    setConcurrencyError(null);
    try {
      const res = await seriesService.updateStoryArc(seriesId, storyArcInput.trim() || null);
      setStoryArcInput(res.value || '');
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
      notify('Lỗi thao tác phân cảnh', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScene = async () => {
    if (!selectedScene) return;
    if (!confirm(`Bạn có chắc chắn muốn xoá Phân cảnh ${selectedScene.sceneNumber}?`)) return;
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
      notify('Lỗi xoá phân cảnh', err.message);
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
    if (!confirm(`Bạn có chắc muốn xoá dòng kịch bản #${line.lineOrder}?`)) return;

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

  // Helper tìm tên nhân vật từ ID
  const getSpeakerName = (speakerId?: string | null) => {
    if (!speakerId) return null;
    const found = characters.find((c) => c.id === speakerId);
    return found ? found.name : 'Nhân vật (Chưa rõ)';
  };

  const isChapterLocked =
    currentChapter?.status === 'Approved' || currentChapter?.status === 'Published';

  const aiReadingDirection =
    seriesDetail?.readingDirection === 1 || seriesDetail?.readingDirection === 'RightToLeft'
      ? 'RightToLeft'
      : 'LeftToRight';

  const handleAiReload = async () => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    await refreshChapterDetail(currentChapter.id);
    await loadSceneDetail(selectedScene.id);
  };

  const aiNameById = Object.fromEntries(allBibleEntries.map((e) => [e.id, e.name]));

  // Số lượng vấn đề nhất quán
  const openFindingsCount = findings.filter(
    (f) => f.status === 'Open' || f.status === 'NeedsClarification',
  ).length;
  const totalFindingsCount = findings.length;

  const outlineWordCount = outlineInput.trim()
    ? outlineInput.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // Lọc danh sách phân cảnh
  const filteredScenes = scenes.filter((s) => {
    if (!sceneSearchQuery.trim()) return true;
    const q = sceneSearchQuery.toLowerCase();
    return (
      (s.heading && s.heading.toLowerCase().includes(q)) ||
      (s.summary && s.summary.toLowerCase().includes(q)) ||
      String(s.sceneNumber).includes(q)
    );
  });

  return (
    <div className='flex-1 flex flex-col bg-[#FAF8F5] h-[calc(100vh-64px)] overflow-hidden text-[#171717]'>
      {/* 1. Gọn gàng Header Toolbar */}
      <header className='shrink-0 bg-white border-b border-[#E7E2D9] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-30'>
        {/* Left: Tên trang, Chương, Trạng thái & Phiên bản */}
        <div className='flex items-center gap-3 flex-wrap'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0'>
              <FileText className='w-4 h-4' />
            </div>
            <div>
              <div className='flex items-center gap-1.5'>
                <span className='px-2 py-0.5 rounded-full bg-orange-600 text-white font-mono text-xs font-bold uppercase tracking-wider'>
                  Kịch bản
                </span>
                {currentChapter && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      currentChapter.status === 'Approved'
                        ? 'badge-status-approved'
                        : currentChapter.status === 'Published'
                          ? 'badge-status-published'
                          : currentChapter.status === 'Locked'
                            ? 'badge-status-locked'
                            : 'badge-status-inproduction'
                    }`}
                  >
                    {currentChapter.status === 'Approved'
                      ? 'Đã duyệt'
                      : currentChapter.status === 'Published'
                        ? 'Đã phát hành'
                        : currentChapter.status === 'Locked'
                          ? 'Đã khóa'
                          : 'Đang sản xuất'}
                  </span>
                )}
                {currentChapter && (
                  <span className='text-xs font-mono font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md'>
                    v{currentChapter.versionVector}
                  </span>
                )}
              </div>
              <h1 className='text-sm md:text-base font-bold font-serif tracking-tight text-zinc-900'>
                Biên Soạn Kịch Bản Phân Cảnh (Script Editor)
              </h1>
            </div>
          </div>

          {/* Bộ chọn chương không lặp "Chương 1: Chương 1" */}
          {chapters.length > 0 && (
            <div className='flex items-center gap-1.5 bg-[#F8F6F0] px-3 py-1.5 rounded-xl border border-[#E7E2D9] shadow-2xs'>
              <BookOpen className='w-4 h-4 text-orange-600 shrink-0' />
              <label
                htmlFor='script-chapter-select'
                className='text-xs font-semibold text-zinc-600'
              >
                Chương:
              </label>
              <select
                id='script-chapter-select'
                value={currentChapter?.id || ''}
                onChange={(e) => handleSelectChapter(e.target.value)}
                className='bg-transparent text-xs font-bold text-zinc-900 outline-none cursor-pointer max-w-[260px] truncate pr-1'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatChapterOption(c.chapterNumber, c.title)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trạng thái lưu dữ liệu */}
          <div className='hidden lg:flex items-center text-xs'>
            {savingStoryArc || savingOutline || submitting ? (
              <span className='flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg'>
                <RefreshCw className='w-3.5 h-3.5 animate-spin' />
                <span>Đang lưu...</span>
              </span>
            ) : hasUnsavedChanges ? (
              <span className='flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg'>
                <span className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
                <span>Chưa lưu thay đổi</span>
              </span>
            ) : (
              <span className='flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg'>
                <Check className='w-3.5 h-3.5 text-emerald-600' />
                <span>Đã lưu</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Hành động chính & Mở panel phụ */}
        <div className='flex items-center gap-2 flex-wrap'>
          {/* Nút Đề cương & Bối cảnh (mở drawer) */}
          <button
            type='button'
            data-testid='toggle-narrative-context-btn'
            onClick={() =>
              setActiveSideDrawer((prev) => (prev === 'narrative' ? null : 'narrative'))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
              activeSideDrawer === 'narrative'
                ? 'bg-orange-100 text-orange-900 border-orange-300 font-bold'
                : 'bg-[#F8F6F0] text-zinc-700 hover:bg-[#EAE6DF] border-[#E7E2D9]'
            }`}
            title='Định hướng cốt truyện & đề cương phân cảnh'
          >
            <Compass className='w-3.5 h-3.5 text-orange-600' />
            <span className='hidden sm:inline'>Đề cương & Bối cảnh</span>
            <span className='sm:hidden'>Đề cương</span>
            {outlineWordCount > 0 && (
              <span className='text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-600'>
                {outlineWordCount} từ
              </span>
            )}
            {hasUnsavedChanges && (
              <span className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
            )}
          </button>

          {/* Nút Kiểm tra nhất quán (thống nhất số lượng đếm) */}
          <button
            type='button'
            data-testid='run-consistency-check-btn'
            onClick={handleRunConsistencyCheck}
            disabled={loadingConsistency || !currentChapter?.id}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-soft-sm disabled:opacity-50 ${
              activeSideDrawer === 'consistency'
                ? 'bg-[#7c3aed] text-white border-transparent shadow-glow-violet font-bold'
                : 'text-violet-900 bg-violet-50 hover:bg-violet-100 border-violet-200'
            }`}
            title={`Kiểm tra nhất quán (${openFindingsCount} cần xử lý / ${totalFindingsCount} tổng số)`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${activeSideDrawer === 'consistency' ? 'text-white' : 'text-violet-600'} ${loadingConsistency ? 'animate-spin' : ''}`}
            />
            <span className='hidden sm:inline'>
              {loadingConsistency ? 'Đang kiểm tra...' : 'Kiểm tra nhất quán'}
            </span>
            <span className='sm:hidden'>Nhất quán</span>
            {openFindingsCount > 0 ? (
              <span className='px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-mono font-bold shadow-xs'>
                {openFindingsCount}
              </span>
            ) : totalFindingsCount > 0 ? (
              <span className='px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 text-xs font-mono font-bold'>
                {totalFindingsCount}
              </span>
            ) : null}
          </button>

          {/* Nút mở danh mục Nhân vật Series Bible */}
          <button
            type='button'
            onClick={() =>
              setActiveSideDrawer((prev) => (prev === 'characters' ? null : 'characters'))
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-soft-sm ${
              activeSideDrawer === 'characters'
                ? 'bg-purple-700 text-white border-transparent font-bold'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-purple-200'
            }`}
            title='Xem danh sách nhân vật Canon từ Series Bible'
          >
            <User className={`w-3.5 h-3.5 ${activeSideDrawer === 'characters' ? 'text-white' : 'text-purple-600'}`} />
            <span className='hidden sm:inline'>Nhân vật Bible ({characters.length})</span>
            <span className='sm:hidden'>Bible</span>
          </button>

          {/* Nút Làm mới */}
          <button
            type='button'
            onClick={() => {
              if (currentChapter?.id) {
                refreshChapterDetail(currentChapter.id);
                loadScenes();
              }
            }}
            disabled={loadingScenes || loadingDetail}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E2D9] rounded-xl transition-all cursor-pointer shadow-2xs'
            title='Làm mới kịch bản'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingScenes || loadingDetail ? 'animate-spin' : ''}`}
            />
            <span className='hidden sm:inline'>Làm mới</span>
          </button>
        </div>
      </header>

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

          {isChapterLocked && (
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
          className={`shrink-0 border-r border-[#E5DFD7] bg-white flex flex-col transition-all duration-200 z-10 ${
            isSceneNavOpen ? 'w-[260px] md:w-[280px]' : 'w-12'
          }`}
        >
          {/* Header thanh phân cảnh */}
          <div className='p-3 border-b border-[#E5DFD7] bg-[#FAF8F5] flex items-center justify-between gap-2'>
            {isSceneNavOpen ? (
              <>
                <div className='flex items-center gap-2 min-w-0'>
                  <Clapperboard className='w-4 h-4 text-orange-600 shrink-0' />
                  <h2 className='text-xs font-bold text-zinc-900 truncate'>
                    Phân cảnh ({scenes.length})
                  </h2>
                </div>
                <div className='flex items-center gap-1'>
                  {canEditScript && !isChapterLocked && (
                    <button
                      type='button'
                      onClick={handleOpenCreateScene}
                      className='p-1 text-orange-700 hover:bg-orange-100 rounded-lg cursor-pointer transition-colors'
                      title='Thêm phân cảnh mới'
                    >
                      <Plus className='w-4 h-4' />
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={() => setIsSceneNavOpen(false)}
                    className='p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg cursor-pointer transition-colors'
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
                className='w-full flex items-center justify-center p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer'
                title='Mở rộng danh sách cảnh'
              >
                <PanelLeft className='w-4 h-4 text-orange-600' />
              </button>
            )}
          </div>

          {/* Nội dung danh sách phân cảnh */}
          {isSceneNavOpen ? (
            <>
              {/* Search cảnh nếu có nhiều hơn 3 cảnh */}
              {scenes.length > 3 && (
                <div className='p-2 border-b border-zinc-100 bg-zinc-50/50'>
                  <div className='relative'>
                    <Search className='w-3 h-3 text-zinc-400 absolute left-2.5 top-2' />
                    <input
                      type='text'
                      value={sceneSearchQuery}
                      onChange={(e) => setSceneSearchQuery(e.target.value)}
                      placeholder='Tìm phân cảnh...'
                      className='w-full pl-7 pr-2 py-1 text-xs border border-zinc-200 rounded-lg outline-none focus:border-orange-500 bg-white'
                    />
                  </div>
                </div>
              )}

              <div className='flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar'>
                {scenes.length === 0 ? (
                  <div className='text-center py-10 px-3 text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200'>
                    Chương này chưa có phân cảnh nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        type='button'
                        onClick={handleOpenCreateScene}
                        className='block mx-auto mt-2 text-orange-600 font-bold hover:underline cursor-pointer'
                      >
                        + Tạo cảnh đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  filteredScenes.map((s) => {
                    const isSelected = selectedScene?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectScene(s)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/70 shadow-2xs border-l-4 border-l-orange-600'
                            : 'border-[#E7E2D9] bg-white hover:bg-[#FAF8F5] hover:border-zinc-300'
                        }`}
                      >
                        <div className='flex items-center justify-between text-xs font-bold mb-0.5'>
                          <span
                            className={isSelected ? 'text-orange-950 font-bold' : 'text-zinc-900'}
                          >
                            Cảnh {s.sceneNumber}
                          </span>
                          <span className='font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md'>
                            {s.scriptLinesCount} dòng
                          </span>
                        </div>
                        <div className='text-xs text-zinc-800 font-medium truncate'>
                          {s.heading || 'Chưa đặt tiêu đề'}
                        </div>
                        {s.summary && (
                          <p className='text-xs text-zinc-500 line-clamp-1 mt-0.5'>
                            {s.summary}
                          </p>
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
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100'
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
        <div className='flex-1 flex flex-col overflow-hidden min-w-0 bg-[#FAF8F5]'>
          {selectedScene ? (
            <>
              {/* Scene Header & Actions */}
              <div className='shrink-0 bg-white border-b border-[#E5DFD7] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='px-2.5 py-0.5 rounded-md bg-zinc-900 text-white font-mono text-xs font-bold tracking-wider'>
                      CẢNH {selectedScene.sceneNumber}
                    </span>
                    <span className='text-xs font-mono text-zinc-500'>
                      ID: {selectedScene.id.substring(0, 8)}...
                    </span>
                    {selectedScene.defaultNarrationMode &&
                      selectedScene.defaultNarrationMode !== 'Present' && (
                        <span className='text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full'>
                          Mặc định: {selectedScene.defaultNarrationMode}
                        </span>
                      )}
                  </div>
                  <h3 className='text-base md:text-lg font-bold font-serif text-zinc-900 mt-1 truncate'>
                    {selectedScene.heading || 'Phân cảnh chưa đặt tiêu đề'}
                  </h3>
                  {selectedScene.summary && (
                    <p className='text-xs text-zinc-500 italic mt-0.5 truncate'>
                      &ldquo;{selectedScene.summary}&rdquo;
                    </p>
                  )}
                </div>

                {/* Toolbar cho phân cảnh */}
                <div className='flex items-center gap-2 flex-wrap shrink-0'>
                  {canEditScript && !isChapterLocked && (
                    <div className='flex items-center gap-1 border-r border-zinc-200 pr-2 mr-1'>
                      <button
                        type='button'
                        onClick={handleOpenEditScene}
                        className='p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors'
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
                    data-testid='open-script-history-btn'
                    onClick={() => setHistoryOpen(true)}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-[#E5DFD7] rounded-full transition-all cursor-pointer shadow-soft-sm'
                  >
                    <History className='w-3.5 h-3.5 text-zinc-500' />
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

                  {canEditScript && !isChapterLocked && (
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
                  <div className='flex items-center justify-center py-20 text-zinc-400 text-xs'>
                    <RefreshCw className='w-5 h-5 animate-spin mr-2 text-orange-600' />
                    <span>Đang nạp chi tiết phân cảnh...</span>
                  </div>
                ) : !selectedScene.scriptLines || selectedScene.scriptLines.length === 0 ? (
                  <div className='text-center py-16 border border-dashed border-[#E5DFD7] rounded-2xl text-zinc-400 text-xs bg-white'>
                    <MessageSquare className='w-8 h-8 text-zinc-300 mx-auto mb-2' />
                    Phân cảnh này chưa có dòng kịch bản nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        type='button'
                        onClick={handleOpenAddLine}
                        className='block mx-auto mt-3 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl cursor-pointer shadow-xs'
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
          ) : (
            // Trạng thái chưa chọn cảnh
            <div className='flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-400'>
              <div className='p-3.5 bg-zinc-100 rounded-2xl mb-3 text-zinc-400'>
                <Clapperboard className='w-8 h-8' />
              </div>
              <h3 className='text-sm font-bold text-zinc-700'>Chưa chọn Phân cảnh</h3>
              <p className='text-xs mt-1 max-w-sm text-zinc-500'>
                Vui lòng chọn một phân cảnh ở thanh bên trái hoặc tạo phân cảnh mới để bắt đầu soạn
                thảo kịch bản.
              </p>
              {canEditScript && !isChapterLocked && (
                <button
                  type='button'
                  onClick={handleOpenCreateScene}
                  className='mt-4 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl cursor-pointer shadow-xs'
                >
                  + Tạo phân cảnh mới
                </button>
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
          <div className='bg-white rounded-2xl max-w-md w-full border border-[#E7E7E7] shadow-2xl p-6'>
            <div className='flex items-center justify-between pb-3 border-b border-[#E7E7E7] mb-4'>
              <h3 className='text-sm md:text-base font-bold text-zinc-900'>
                {isEditingScene ? 'Sửa Phân Cảnh' : 'Tạo Phân Cảnh Mới'}
              </h3>
              <button
                type='button'
                onClick={() => setSceneModalOpen(false)}
                className='text-zinc-400 hover:text-zinc-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmitScene} className='space-y-4'>
              {!isEditingScene && (
                <div>
                  <label className='block text-xs font-semibold text-zinc-700 mb-1'>
                    Số thứ tự cảnh (Scene Number)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={sceneNumberInput}
                    onChange={(e) => setSceneNumberInput(parseInt(e.target.value, 10) || 1)}
                    className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500'
                    required
                  />
                </div>
              )}

              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1'>
                  Tiêu đề phân cảnh (Heading)
                </label>
                <input
                  type='text'
                  placeholder='Ví dụ: Cảnh 1: Neo Tokyo - Đêm tuyết rơi'
                  value={sceneHeadingInput}
                  onChange={(e) => setSceneHeadingInput(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1'>
                  Tóm tắt phân cảnh (Summary)
                </label>
                <textarea
                  rows={3}
                  placeholder='Mô tả ngắn gọn bối cảnh và diễn biến trong cảnh này...'
                  value={sceneSummaryInput}
                  onChange={(e) => setSceneSummaryInput(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 resize-none'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5'>
                  <Compass className='w-3.5 h-3.5 text-orange-600' />
                  <span>Chế độ kể chuyện mặc định (Default Narration Mode)</span>
                </label>
                <select
                  data-testid='scene-default-narration-mode-select'
                  value={sceneDefaultNarrationMode}
                  onChange={(e) => setSceneDefaultNarrationMode(e.target.value as NarrationMode)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 bg-white'
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
                <p className='text-xs text-zinc-500 mt-1'>
                  Các dòng kịch bản mới thêm vào phân cảnh này sẽ tự động kế thừa chế độ kể chuyện
                  tương ứng.
                </p>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setSceneModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer'
                >
                  Huỷ
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer'
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
          <div className='bg-white rounded-2xl max-w-lg w-full border border-[#E7E7E7] shadow-2xl p-6'>
            <div className='flex items-center justify-between pb-3 border-b border-[#E7E7E7] mb-4'>
              <div>
                <h3 className='text-sm md:text-base font-bold text-zinc-900'>
                  {editingLine
                    ? `Sửa Dòng Kịch Bản #${editingLine.lineOrder}`
                    : 'Thêm Dòng Kịch Bản Mới (UC-06)'}
                </h3>
                <p className='text-xs text-zinc-500'>
                  Phiên bản chương hiện tại: <strong>v{currentChapter?.versionVector}</strong>
                </p>
              </div>
              <button
                type='button'
                onClick={() => setLineModalOpen(false)}
                className='text-zinc-400 hover:text-zinc-700 cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmitLine} className='space-y-4'>
              {/* Chọn Người nói (Speaker) - Không ép buộc người nói */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5'>
                  <User className='w-3.5 h-3.5 text-orange-600' />
                  <span>Nhân vật nói (Speaker Character)</span>
                </label>
                <select
                  value={lineSpeakerId}
                  onChange={(e) => setLineSpeakerId(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 bg-white cursor-pointer'
                >
                  <option value=''>-- Không có người nói (Lời dẫn ngoài / Hành động) --</option>
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} {char.subtitle ? `(${char.subtitle})` : ''}
                    </option>
                  ))}
                </select>
                <p className='text-xs text-zinc-500 mt-1'>
                  * Nhân vật được lấy từ Series Bible. Gắn đúng nhân vật giúp Letterer sinh balloon
                  tương ứng.
                </p>
              </div>

              {/* Lời thoại (Dialogue) */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5'>
                  <MessageSquare className='w-3.5 h-3.5 text-blue-600' />
                  <span>Lời thoại (Dialogue Text)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder='Nhập lời thoại của nhân vật...'
                  value={lineDialogue}
                  onChange={(e) => setLineDialogue(e.target.value)}
                  maxLength={4000}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 resize-none font-serif leading-relaxed'
                />
              </div>

              {/* Chỉ dẫn cảnh (Stage Direction) */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5'>
                  <Clapperboard className='w-3.5 h-3.5 text-zinc-600' />
                  <span>Chỉ dẫn cảnh / Hành động (Stage Direction)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder='Ví dụ: (Akira quay đầu lại nhìn với vẻ kinh ngạc, tay nắm chặt thanh kiếm...)'
                  value={lineStageDirection}
                  onChange={(e) => setLineStageDirection(e.target.value)}
                  maxLength={4000}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 resize-none italic'
                />
              </div>

              {/* Liên kết Series Bible (UC-06) */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <BookOpen className='w-3.5 h-3.5 text-purple-600' />
                    <span>Liên kết Series Bible (Địa điểm, Đạo cụ, Nhân vật, Thuật ngữ...)</span>
                  </div>
                  <span className='text-xs text-zinc-500 font-normal'>
                    Đã chọn {lineBibleEntryIds.length}/20 mục
                  </span>
                </label>
                <div className='max-h-28 overflow-y-auto border border-[#E7E7E7] rounded-xl p-2.5 bg-zinc-50/50 custom-scrollbar'>
                  {allBibleEntries.length === 0 ? (
                    <p className='text-xs text-zinc-400 italic'>
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
                            <span>{entry.name}</span>
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

              {/* Ngoại lệ trần thuật (Narration Mode) */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <Compass className='w-3.5 h-3.5 text-purple-600' />
                    <span>Ngoại lệ trần thuật (Narration Mode)</span>
                  </div>
                  <span className='text-xs text-zinc-500 font-normal'>Bỏ qua báo sai</span>
                </label>
                <select
                  data-testid='line-narration-mode-select'
                  value={lineNarrationMode}
                  onChange={(e) => setLineNarrationMode(e.target.value as NarrationMode)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-purple-500 bg-white cursor-pointer'
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
                <p className='text-xs text-zinc-500 mt-1'>
                  * Chọn ngoại lệ có chủ ý để hệ thống Kiểm tra Nhất quán không báo lỗi sai (False
                  Positives).
                </p>
              </div>

              {/* Vị trí chèn nếu tạo mới */}
              {!editingLine && (
                <div>
                  <label className='block text-xs font-semibold text-zinc-700 mb-1'>
                    Thứ tự dòng (Line Order)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={lineOrderInput}
                    onChange={(e) => setLineOrderInput(parseInt(e.target.value, 10) || 1)}
                    className='w-32 px-3 py-1.5 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500'
                  />
                  <span className='text-xs text-zinc-500 ml-2'>
                    Trùng số sẽ tự động chèn và dịch các dòng sau xuống.
                  </span>
                </div>
              )}

              <div className='flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setLineModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer'
                >
                  Huỷ
                </button>
                <button
                  data-testid='submit-line-btn'
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer'
                >
                  {submitting ? 'Đang lưu...' : editingLine ? 'Lưu Thay Đổi' : 'Thêm Dòng Kịch Bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
