import React, { useState, useEffect, useCallback } from 'react';
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

interface ScriptEditorViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  const sceneIdFromUrl = searchParams.get('sceneId');

  // Quyền: Chỉ Producer và Writer mới được ghi (tạo/sửa/xoá Scene và ScriptLine)
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const canEditScript = !normRole || normRole === 'PRODUCER' || normRole === 'WRITER';

  // State nạp dữ liệu
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterDto | null>(null);
  const [characters, setCharacters] = useState<BibleEntryDto[]>([]);
  const [allBibleEntries, setAllBibleEntries] = useState<BibleEntryDto[]>([]);

  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneDetailDto | null>(null);

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // State Story Arc (Series) & Outline (Chapter)
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [storyArcInput, setStoryArcInput] = useState<string>('');
  const [outlineInput, setOutlineInput] = useState<string>('');
  const isTestEnvironment =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' ||
      typeof (globalThis as any).__vitest_worker__ !== 'undefined');
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState<boolean>(() => !isTestEnvironment);
  const [savingStoryArc, setSavingStoryArc] = useState<boolean>(false);
  const [savingOutline, setSavingOutline] = useState<boolean>(false);
  const [narrativeTab, setNarrativeTab] = useState<'both' | 'storyArc' | 'outline'>('both');
  const [isNarrativeExpandedHeight, setIsNarrativeExpandedHeight] = useState<boolean>(false);
  const [bibleSearchQuery, setBibleSearchQuery] = useState<string>('');

  // State Kiểm tra nhất quán (Consistency Check)
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [loadingConsistency, setLoadingConsistency] = useState<boolean>(false);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckResultDto | null>(
    null,
  );
  const [isConsistencyExpanded, setIsConsistencyExpanded] = useState<boolean>(true);
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);

  // Banner lỗi xung đột / cập nhật
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);

  // Panel Trợ lý AI (Writer)
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Lịch sử phiên bản script (UC-13)
  const [historyOpen, setHistoryOpen] = useState(false);

  const notify = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) {
        onShowToast(title, desc);
      }
    },
    [onShowToast],
  );

  // 1. Tải danh sách Chapters, Series Bible Characters và Series Details
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);

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
          // Lọc nhân vật: BE trả enum dạng chuỗi ("Character"); giữ 0 cho dữ liệu cũ dạng số
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
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [seriesId, chapterIdFromUrl]);

  // Đồng bộ Outline và nạp findings nhất quán khi chapter thay đổi
  useEffect(() => {
    if (!currentChapter?.id) {
      setOutlineInput('');
      setFindings([]);
      return;
    }
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

  // 2. Nạp chi tiết Chapter (đặc biệt là versionVector mới nhất)
  const refreshChapterDetail = useCallback(async (chapId: string) => {
    try {
      const detail = await chapterService.getChapterById(chapId);
      setCurrentChapter((prev) => (prev ? { ...prev, ...detail } : detail));
    } catch (err) {
      console.error('Lỗi refresh chi tiết chương:', err);
    }
  }, []);

  // 3. Tải chi tiết một Scene kèm danh sách dòng
  const loadSceneDetail = useCallback(
    async (sceneId: string) => {
      setLoadingDetail(true);
      try {
        const detail = await scriptLineService.getSceneById(sceneId);
        setSelectedScene(detail);
      } catch (err: any) {
        console.error('Lỗi nạp chi tiết scene:', err);
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
        // Load chi tiết Scene
        loadSceneDetail(targetScene.id);
      } else {
        setSelectedScene(null);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách scenes:', err);
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

  // Chọn Chapter từ dropdown
  const handleSelectChapter = (chapId: string) => {
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

  // --- CONSISTENCY CHECK ---
  const handleRunConsistencyCheck = async () => {
    if (!currentChapter?.id) return;
    setLoadingConsistency(true);
    try {
      const res = await assignmentService.runConsistencyCheck(currentChapter.id);
      setConsistencyResult(res);
      setFindings(res.findings || []);
      setIsConsistencyExpanded(true);
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

  const handleScrollToLine = async (scriptLineId?: string | null) => {
    if (!scriptLineId) return;
    setHighlightedLineId(scriptLineId);

    // Kiểm tra xem dòng đã có sẵn trên DOM của Scene hiện tại chưa
    const element = document.getElementById(`script-line-${scriptLineId}`);

    // Nếu chưa có trên DOM và có danh sách phân cảnh, tìm xem thuộc cảnh nào để chuyển cảnh
    if (!element && currentChapter?.id && scenes.length > 0) {
      for (const sc of scenes) {
        if (sc.id === selectedScene?.id) continue;
        try {
          const detail = await scriptLineService.getSceneById(sc.id);
          if (detail.scriptLines?.some((l) => l.id === scriptLineId)) {
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
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        // Cập nhật local
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
        // Cập nhật dòng (PUT)
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

        // Tăng versionVector của chapter
        setCurrentChapter((prev) => (prev ? { ...prev, versionVector: res.chapterVersion } : null));

        // Reload scene để đồng bộ danh sách
        await loadSceneDetail(selectedScene.id);
        setLineModalOpen(false);
      } else {
        // Thêm dòng mới (POST) - Hỗ trợ clientLineId gửi lại an toàn NFR-09
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
        // Tự động tải lại version mới nhất của Chapter và Scene
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

  // Drag & drop and quick reorder state for script lines
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

  // Helper tìm thông tin mục Bible từ ID (UC-06)
  const getBibleEntry = (id?: string | null) => {
    if (!id) return null;
    return allBibleEntries.find((e) => e.id === id);
  };

  const isChapterLocked =
    currentChapter?.status === 'Approved' || currentChapter?.status === 'Published';

  // Series: 1 / 'RightToLeft' → RTL; còn lại LTR
  const aiReadingDirection =
    seriesDetail?.readingDirection === 1 || seriesDetail?.readingDirection === 'RightToLeft'
      ? 'RightToLeft'
      : 'LeftToRight';

  // Sau Accept (hoặc 409): nạp lại script của Scene và versionVector của Chapter
  const handleAiReload = async () => {
    if (!currentChapter?.id || !selectedScene?.id) return;
    await refreshChapterDetail(currentChapter.id);
    await loadSceneDetail(selectedScene.id);
  };

  const aiNameById = Object.fromEntries(allBibleEntries.map((e) => [e.id, e.name]));

  return (
    <div className='flex-1 flex flex-col bg-[#FAF8F5] min-h-screen text-[#171717]'>
      {/* Top Banner Toolbar */}
      <header className='bg-white border-b border-[#E7E7E7] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30 shadow-xs'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-orange-500/10 text-[#F97316] flex items-center justify-center font-bold'>
            <FileText className='w-5 h-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <span className='px-2 py-0.5 rounded bg-orange-600 text-white font-mono text-xs font-bold uppercase tracking-wider'>
                Kịch bản
              </span>
              {currentChapter && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    currentChapter.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentChapter.status === 'Published'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {currentChapter.status || 'InProduction'}
                </span>
              )}
              {currentChapter && (
                <span className='text-xs font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded'>
                  v{currentChapter.versionVector}
                </span>
              )}
            </div>
            <h1 className='text-xl font-bold font-serif tracking-tight text-[#171717] mt-0.5'>
              Biên Soạn Kịch Bản Phân Cảnh (Script Editor)
            </h1>
          </div>
        </div>

        {/* Chapter Selection & Actions */}
        <div className='flex items-center gap-3 flex-wrap'>
          {chapters.length > 0 && (
            <div className='flex items-center gap-1.5 bg-[#F8F6F0] px-3 py-1.5 rounded-xl border border-[#E7E7E7]'>
              <BookOpen className='w-4 h-4 text-orange-600' />
              <label
                htmlFor='script-chapter-select'
                className='text-xs font-semibold text-[#555555]'
              >
                Chương:
              </label>
              <select
                id='script-chapter-select'
                value={currentChapter?.id || ''}
                onChange={(e) => handleSelectChapter(e.target.value)}
                className='bg-transparent text-xs font-bold text-[#171717] outline-none cursor-pointer pr-1'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chương {c.chapterNumber}
                    {c.title ? `: ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type='button'
            data-testid='run-consistency-check-btn'
            onClick={handleRunConsistencyCheck}
            disabled={loadingConsistency || !currentChapter?.id}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all cursor-pointer disabled:opacity-50'
            title='Kiểm tra tính nhất quán kịch bản (phát hiện nhân vật chưa có trong Bible, thoại thiếu speaker...)'
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 text-orange-600 ${loadingConsistency ? 'animate-spin' : ''}`}
            />
            <span>{loadingConsistency ? 'Đang kiểm tra...' : 'Kiểm tra nhất quán'}</span>
            {findings.filter((f) => f.status === 'Open' || f.status === 'NeedsClarification')
              .length > 0 && (
              <span className='px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-mono font-bold'>
                {
                  findings.filter((f) => f.status === 'Open' || f.status === 'NeedsClarification')
                    .length
                }
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (currentChapter?.id) {
                refreshChapterDetail(currentChapter.id);
                loadScenes();
              }
            }}
            disabled={loadingScenes || loadingDetail}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingScenes || loadingDetail ? 'animate-spin' : ''}`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* Warnings & Security Banners */}
      {concurrencyError && (
        <div
          data-testid='concurrency-error-banner'
          className='mx-6 mt-4 shrink-0 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
            <span>{concurrencyError}</span>
          </div>
          <button
            onClick={() => setConcurrencyError(null)}
            className='text-rose-500 hover:text-rose-700'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      {isChapterLocked && (
        <div
          data-testid='chapter-locked-banner'
          className='mx-6 mt-4 shrink-0 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800'
        >
          <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0' />
          <span>
            Chương này đã ở trạng thái <strong>{currentChapter?.status}</strong>. Theo quy tắc{' '}
            <strong>BR-12</strong>, kịch bản đã được khóa hoàn toàn để bảo vệ tính toàn vẹn sản
            xuất. Bạn đang ở chế độ chỉ đọc.
          </span>
        </div>
      )}

      {!canEditScript && (
        <div
          data-testid='role-view-only-banner'
          className='mx-6 mt-4 shrink-0 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800'
        >
          <Info className='w-4 h-4 text-blue-600 shrink-0' />
          <span>
            Chế độ xem: Bạn đang xem kịch bản với quyền tham khảo. Chỉ vai trò{' '}
            <strong>Producer</strong> hoặc <strong>Writer</strong> mới có quyền thêm, sửa và xoá
            phân cảnh hoặc dòng kịch bản.
          </span>
        </div>
      )}

      {/* Story Arc & Chapter Outline Section (Collapsible & Expandable) */}
      <div
        data-testid='narrative-context-section'
        className='mx-6 mt-6 shrink-0 bg-white border border-[#f0efed] rounded-2xl shadow-soft-sm overflow-hidden transition-all'
      >
        <div className='w-full px-6 py-4 md:px-8 md:py-5 min-h-[80px] flex flex-wrap items-center justify-between gap-4 bg-[#fafafa] border-b border-[#f0efed]'>
          <button
            type='button'
            onClick={() => setIsNarrativeExpanded((prev) => !prev)}
            className='flex items-center gap-4 text-left cursor-pointer group flex-1 min-w-[280px]'
            data-testid='toggle-narrative-context-btn'
          >
            <div className='w-11 h-11 rounded-full bg-[#292524] text-white flex items-center justify-center shrink-0 shadow-soft-sm group-hover:scale-105 transition-transform'>
              <Compass className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-3 flex-wrap'>
                <span className='text-base md:text-lg font-serif font-light text-[#0c0a09] group-hover:text-[#292524] transition-colors'>
                  Định Hướng Cốt Truyện & Đề Cương (Story Arc & Chapter Outline)
                </span>
                {storyArcInput && (
                  <span className='text-xs font-mono px-3 py-1 rounded-full bg-[#f0efed] text-[#292524] font-medium border border-[#e7e5e4] shadow-soft-sm'>
                    Story Arc: {storyArcInput.trim().split(/\s+/).filter(Boolean).length} từ
                  </span>
                )}
                {outlineInput && (
                  <span className='text-xs font-mono px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-medium border border-blue-200 shadow-soft-sm'>
                    Outline Ch.{currentChapter?.chapterNumber || ''}:{' '}
                    {outlineInput.trim().split(/\s+/).filter(Boolean).length} từ
                  </span>
                )}
              </div>
              <p className='text-xs text-[#777169] mt-0.5'>
                Ngữ cảnh sáng tác dài hạn & nhịp phim phân cảnh cho Writer và AI Agent
              </p>
            </div>
          </button>

          <div className='flex items-center gap-3 shrink-0'>
            {isNarrativeExpanded && (
              <>
                {/* Tab switch: Song song / Chỉ Story Arc / Chỉ Outline */}
                <div className='flex items-center p-1 bg-[#f0efed] rounded-full text-xs font-medium border border-[#e7e5e4]'>
                  <button
                    type='button'
                    onClick={() => setNarrativeTab('both')}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      narrativeTab === 'both'
                        ? 'bg-[#292524] text-white shadow-soft-sm font-medium'
                        : 'text-[#4e4e4e] hover:text-[#0c0a09]'
                    }`}
                  >
                    Song song 2 cột
                  </button>
                  <button
                    type='button'
                    onClick={() => setNarrativeTab('storyArc')}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      narrativeTab === 'storyArc'
                        ? 'bg-[#292524] text-white shadow-soft-sm font-medium'
                        : 'text-[#4e4e4e] hover:text-[#0c0a09]'
                    }`}
                  >
                    Story Arc
                  </button>
                  <button
                    type='button'
                    onClick={() => setNarrativeTab('outline')}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      narrativeTab === 'outline'
                        ? 'bg-[#292524] text-white shadow-soft-sm font-medium'
                        : 'text-[#4e4e4e] hover:text-[#0c0a09]'
                    }`}
                  >
                    Đề Cương
                  </button>
                </div>

                {/* Toggle mở rộng chiều cao */}
                <button
                  type='button'
                  onClick={() => setIsNarrativeExpandedHeight((prev) => !prev)}
                  className='p-2 text-[#777169] hover:text-[#0c0a09] bg-white hover:bg-[#f0efed] border border-[#e7e5e4] rounded-full cursor-pointer transition-all shadow-soft-sm'
                  title={
                    isNarrativeExpandedHeight
                      ? 'Thu nhỏ khung soạn thảo'
                      : 'Phóng to khung soạn thảo tối đa'
                  }
                >
                  {isNarrativeExpandedHeight ? (
                    <Minimize2 className='w-4 h-4' />
                  ) : (
                    <Maximize2 className='w-4 h-4' />
                  )}
                </button>
              </>
            )}

            <button
              type='button'
              onClick={() => setIsNarrativeExpanded((prev) => !prev)}
              className='flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-[#292524] hover:bg-[#0c0a09] rounded-full shadow-soft-sm transition-all cursor-pointer'
            >
              <span>{isNarrativeExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
              {isNarrativeExpanded ? (
                <ChevronUp className='w-3.5 h-3.5' />
              ) : (
                <ChevronDown className='w-3.5 h-3.5' />
              )}
            </button>
          </div>
        </div>

        {isNarrativeExpanded && (
          <div
            className={`p-6 md:p-8 lg:p-10 gap-6 md:gap-8 bg-gradient-to-b from-[#FFFDF9] to-[#FAF8F5] transition-all grid ${
              narrativeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* Series Story Arc */}
            {(narrativeTab === 'both' || narrativeTab === 'storyArc') && (
              <div className='flex flex-col space-y-4 p-6 md:p-7 bg-white rounded-3xl border-2 border-[#E7E2D9] shadow-sm'>
                <div className='flex items-center justify-between pb-3.5 border-b border-zinc-100'>
                  <div className='flex items-center gap-3.5'>
                    <div className='p-3 bg-orange-100 text-orange-600 rounded-2xl shadow-2xs'>
                      <BookOpen className='w-6 h-6' />
                    </div>
                    <div>
                      <label className='text-base md:text-xl font-bold text-[#171717] block font-serif'>
                        Story Arc của Series
                      </label>
                      <span className='text-xs md:text-sm text-[#737373]'>
                        Cung truyện và định hướng dài hạn của toàn bộ Series
                      </span>
                    </div>
                  </div>
                  {canEditScript && (
                    <button
                      type='button'
                      onClick={handleSaveStoryArc}
                      disabled={savingStoryArc}
                      data-testid='save-story-arc-btn'
                      className='inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer'
                    >
                      <Save className='w-4 h-4' />
                      <span>{savingStoryArc ? 'Đang lưu...' : 'Lưu Story Arc'}</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={isNarrativeExpandedHeight ? 18 : 10}
                  value={storyArcInput}
                  onChange={(e) => setStoryArcInput(e.target.value)}
                  disabled={!canEditScript}
                  placeholder='Nhập tóm lược Story Arc của Series (ví dụ: Hành trình khám phá bí mật cổ xưa...)'
                  data-testid='story-arc-textarea'
                  className='w-full p-6 text-base md:text-lg leading-relaxed border-2 border-[#E4DFD7] rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 bg-white disabled:bg-zinc-100 disabled:cursor-not-allowed resize-y transition-all text-[#171717] font-sans min-h-[260px]'
                />

                <div className='flex items-center justify-between text-xs md:text-sm text-zinc-500 pt-1 font-medium'>
                  <span>
                    {storyArcInput.trim()
                      ? storyArcInput.trim().split(/\s+/).filter(Boolean).length
                      : 0}{' '}
                    từ · {storyArcInput.length} ký tự
                  </span>
                  <span className='text-zinc-400'>
                    Writer Agent sẽ dùng nội dung này làm bối cảnh chính
                  </span>
                </div>
              </div>
            )}

            {/* Chapter Outline */}
            {(narrativeTab === 'both' || narrativeTab === 'outline') && (
              <div className='flex flex-col space-y-4 p-6 md:p-7 bg-white rounded-3xl border-2 border-[#E7E2D9] shadow-sm'>
                <div className='flex items-center justify-between pb-3.5 border-b border-zinc-100'>
                  <div className='flex items-center gap-3.5'>
                    <div className='p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-2xs'>
                      <FileText className='w-6 h-6' />
                    </div>
                    <div>
                      <label className='text-base md:text-xl font-bold text-[#171717] block font-serif'>
                        Đề cương Chương {currentChapter?.chapterNumber || ''} (Outline)
                      </label>
                      <span className='text-xs md:text-sm text-[#737373]'>
                        Dàn ý và diễn biến then chốt của chương hiện tại
                      </span>
                    </div>
                  </div>
                  {canEditScript && !isChapterLocked && (
                    <button
                      type='button'
                      onClick={handleSaveOutline}
                      disabled={savingOutline}
                      data-testid='save-chapter-outline-btn'
                      className='inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer'
                    >
                      <Save className='w-4 h-4' />
                      <span>{savingOutline ? 'Đang lưu...' : 'Lưu Đề Cương'}</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={isNarrativeExpandedHeight ? 18 : 10}
                  value={outlineInput}
                  onChange={(e) => setOutlineInput(e.target.value)}
                  disabled={!canEditScript || isChapterLocked}
                  placeholder='Nhập đề cương phân cảnh / nhịp điệu của chương...'
                  data-testid='chapter-outline-textarea'
                  className='w-full p-6 text-base md:text-lg leading-relaxed border-2 border-[#E4DFD7] rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 bg-white disabled:bg-zinc-100 disabled:cursor-not-allowed resize-y transition-all text-[#171717] font-sans min-h-[260px]'
                />

                <div className='flex items-center justify-between text-xs md:text-sm text-zinc-500 pt-1 font-medium'>
                  <span>
                    {outlineInput.trim()
                      ? outlineInput.trim().split(/\s+/).filter(Boolean).length
                      : 0}{' '}
                    từ · {outlineInput.length} ký tự
                  </span>
                  <span className='text-zinc-400'>
                    Tự động đưa vào prompt khi viết kịch bản bằng AI
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consistency Findings Drawer / Collapsible Box */}
      {findings.length > 0 && (
        <div
          data-testid='consistency-findings-panel'
          className='mx-6 mt-6 shrink-0 bg-white border-2 border-[#E5DFD7] rounded-3xl shadow-sm overflow-hidden'
        >
          <div className='px-6 py-5 md:px-8 md:py-6 min-h-[92px] flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/20 border-b border-[#E5DFD7] transition-all'>
            {/* Left Title & Badge */}
            <button
              type='button'
              onClick={() => setIsConsistencyExpanded((prev) => !prev)}
              className='flex items-center gap-4 text-left cursor-pointer group flex-1 min-w-[280px]'
            >
              <div className='w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform'>
                <AlertTriangle className='w-7 h-7' />
              </div>
              <div>
                <div className='flex items-center gap-3 flex-wrap'>
                  <span className='text-base md:text-xl font-bold font-serif text-amber-950 uppercase tracking-wide group-hover:text-orange-950 transition-colors'>
                    Vấn Đề Nhất Quán Phát Hiện ({findings.length})
                  </span>
                  {findings.some((f) => f.severity === 'Blocking') && (
                    <span className='px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-mono text-xs font-bold shadow-sm animate-pulse'>
                      Có lỗi Blocking
                    </span>
                  )}
                </div>
                <p className='text-xs md:text-sm text-amber-900/80 font-medium mt-1'>
                  Phát hiện từ Series Bible & quy tắc kiểm tra kịch bản tự động
                </p>
              </div>
            </button>

            {/* Right Hint Text (Non-clickable static pill) & Explicit Toggle Button */}
            <div className='flex items-center gap-3 shrink-0'>
              {/* Hint badge: static text, stops click propagation so it NEVER collapses the box */}
              <div
                onClick={(e) => e.stopPropagation()}
                className='hidden lg:flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-amber-100/90 border border-amber-300 text-xs md:text-sm text-amber-950 font-semibold cursor-default select-none shadow-2xs'
              >
                <Info className='w-4 h-4 text-amber-700 shrink-0' />
                <span>Bấm vào một mục hoặc nút &ldquo;Xem dòng&rdquo; để nhảy tới vị trí lỗi</span>
              </div>

              {/* Dedicated Collapse/Expand Button */}
              <button
                type='button'
                onClick={() => setIsConsistencyExpanded((prev) => !prev)}
                className='flex items-center gap-2.5 px-6 py-3 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95'
                title={isConsistencyExpanded ? 'Thu nhỏ danh sách lỗi' : 'Mở rộng xem toàn bộ lỗi'}
              >
                <span>{isConsistencyExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                {isConsistencyExpanded ? (
                  <ChevronUp className='w-4 h-4' />
                ) : (
                  <ChevronDown className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>

          {isConsistencyExpanded && (
            <div className='p-6 md:p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar bg-[#FAF8F5]'>
              {findings.map((f) => (
                <div
                  key={f.id}
                  data-testid={`finding-card-${f.id}`}
                  onClick={() => handleScrollToLine(f.scriptLineId)}
                  className={`p-5 md:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs hover:shadow-md ${
                    f.severity === 'Blocking'
                      ? 'bg-rose-50/95 border-rose-300 hover:border-rose-400 text-rose-950'
                      : f.severity === 'Warning'
                        ? 'bg-amber-50/95 border-amber-300 hover:border-amber-400 text-amber-950'
                        : 'bg-blue-50/95 border-blue-300 hover:border-blue-400 text-blue-950'
                  }`}
                >
                  <div className='min-w-0 flex-1 text-xs md:text-sm'>
                    <div className='flex items-center gap-2.5 flex-wrap mb-1.5'>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold uppercase tracking-wider ${
                          f.severity === 'Blocking'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : f.severity === 'Warning'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-blue-600 text-white shadow-2xs'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className='font-mono font-bold px-2.5 py-1 rounded-lg bg-black/5 border border-black/10 text-xs'>
                        {f.ruleCode}
                      </span>
                      <span className='text-zinc-500 text-xs font-medium'>
                        Trạng thái: <strong>{f.status}</strong>
                      </span>
                    </div>
                    <p className='font-bold text-sm md:text-base text-zinc-900 leading-snug'>
                      {f.message}
                    </p>
                    {f.evidence && (
                      <p className='mt-2 font-mono text-xs md:text-sm bg-white/95 p-3 rounded-xl border border-black/5 text-zinc-800 leading-relaxed shadow-2xs'>
                        Bằng chứng: &ldquo;{f.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                  {f.scriptLineId && (
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScrollToLine(f.scriptLineId);
                      }}
                      className='inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 rounded-xl shadow-sm transition-all shrink-0 cursor-pointer border border-orange-700/20'
                      title='Bấm để nhảy tới và làm nổi bật dòng kịch bản này'
                    >
                      <span>Xem dòng →</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Left Scenes Navigation | Center Script Lines | Right Characters Reference */}
      <div className='flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* LEFT: Scenes Sidebar (3 cols) */}
        <div className='lg:col-span-3 bg-white border border-[#E5DFD7] rounded-2xl p-4 shadow-xs flex flex-col space-y-4'>
          <div className='flex items-center justify-between border-b border-[#E5DFD7] pb-3'>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 bg-orange-100 text-orange-600 rounded-lg'>
                <Clapperboard className='w-4 h-4' />
              </div>
              <h2 className='text-xs font-bold uppercase tracking-wider text-[#171717]'>
                Phân cảnh ({scenes.length})
              </h2>
            </div>
            {canEditScript && !isChapterLocked && (
              <button
                onClick={handleOpenCreateScene}
                className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all cursor-pointer'
                title='Thêm phân cảnh mới'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>Thêm cảnh</span>
              </button>
            )}
          </div>

          <div className='space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar'>
            {scenes.length === 0 ? (
              <div className='text-center py-10 text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200'>
                Chương này chưa có phân cảnh nào.
                {canEditScript && !isChapterLocked && (
                  <button
                    onClick={handleOpenCreateScene}
                    className='block mx-auto mt-2 text-orange-600 font-bold hover:underline cursor-pointer'
                  >
                    + Tạo cảnh đầu tiên
                  </button>
                )}
              </div>
            ) : (
              scenes.map((s) => {
                const isSelected = selectedScene?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectScene(s)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-orange-500 bg-gradient-to-r from-orange-50/90 to-amber-50/30 shadow-xs ring-2 ring-orange-500/20 border-l-4 border-l-orange-600'
                        : 'border-[#E7E2D9] bg-white hover:bg-[#FAF8F5] hover:border-zinc-300'
                    }`}
                  >
                    <div className='flex items-center justify-between text-xs font-bold mb-1'>
                      <span className={isSelected ? 'text-orange-950 font-bold' : 'text-[#171717]'}>
                        Cảnh {s.sceneNumber}
                      </span>
                      <span className='font-mono text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full'>
                        {s.scriptLinesCount} dòng
                      </span>
                    </div>
                    <div className='text-xs text-[#333333] font-semibold line-clamp-1'>
                      {s.heading || 'Chưa đặt tiêu đề'}
                    </div>
                    {s.summary && (
                      <p className='text-xs text-[#78716C] line-clamp-2 mt-1 leading-snug'>
                        {s.summary}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER: Script Lines Workbench (6 cols) */}
        <div className='lg:col-span-6 bg-white border border-[#E5DFD7] rounded-2xl p-6 shadow-xs flex flex-col space-y-5 min-h-[520px]'>
          {selectedScene ? (
            <>
              {/* Scene Heading & Actions */}
              <div className='flex items-start justify-between border-b border-[#E5DFD7] pb-4'>
                <div className='min-w-0 flex-1 pr-3'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='px-2.5 py-0.5 rounded-md bg-zinc-900 text-white font-mono text-xs font-bold tracking-wider'>
                      CẢNH {selectedScene.sceneNumber}
                    </span>
                    <span className='text-xs font-mono text-zinc-400'>
                      ID: {selectedScene.id.substring(0, 8)}...
                    </span>
                  </div>
                  <h3 className='text-xl md:text-2xl font-bold font-serif text-[#171717] mt-1 leading-snug'>
                    {selectedScene.heading || 'Phân cảnh chưa đặt tiêu đề'}
                  </h3>
                  {selectedScene.summary && (
                    <div className='mt-2 text-xs md:text-sm text-[#57534E] italic border-l-2 border-orange-400 pl-3 py-0.5 bg-orange-50/20 rounded-r-lg'>
                      &ldquo;{selectedScene.summary}&rdquo;
                    </div>
                  )}
                </div>

                {canEditScript && !isChapterLocked && (
                  <div className='flex items-center gap-1.5 shrink-0'>
                    <button
                      onClick={handleOpenEditScene}
                      className='p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl cursor-pointer transition-colors border border-zinc-200/60'
                      title='Sửa tiêu đề phân cảnh'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={handleDeleteScene}
                      className='p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors border border-rose-200/60'
                      title='Xoá phân cảnh'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Toolbar for Script Lines */}
              <div className='flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E5DFD7]'>
                <div className='flex items-center gap-2'>
                  <div className='p-1 bg-orange-100 text-orange-600 rounded-md'>
                    <MessageSquare className='w-4 h-4' />
                  </div>
                  <span className='text-xs md:text-sm font-bold text-[#171717]'>
                    Dòng Kịch Bản ({selectedScene.scriptLines?.length || 0})
                  </span>
                </div>
                <div className='flex items-center gap-2 flex-wrap'>
                  <button
                    type='button'
                    data-testid='open-script-history-btn'
                    onClick={() => setHistoryOpen(true)}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#555555] bg-white hover:bg-[#EAE6DF] border border-[#E5DFD7] rounded-xl transition-all cursor-pointer shadow-2xs'
                  >
                    <History className='w-3.5 h-3.5' />
                    <span>Lịch sử phiên bản</span>
                  </button>
                  {canEditScript && (
                    <>
                      <button
                        type='button'
                        data-testid='open-ai-draft-btn'
                        onClick={() => setAiPanelOpen(true)}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all cursor-pointer shadow-2xs'
                      >
                        <Sparkles className='w-3.5 h-3.5 text-orange-600' />
                        <span>Viết nháp bằng AI</span>
                      </button>
                      {!isChapterLocked && (
                        <button
                          data-testid='open-add-line-btn'
                          onClick={handleOpenAddLine}
                          className='inline-flex items-center gap-1.5 px-4 py-1.5 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer'
                        >
                          <Plus className='w-4 h-4' />
                          <span>Thêm Dòng Kịch Bản</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Script Lines List */}
              <div className='space-y-3.5 flex-1 overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar'>
                {!selectedScene.scriptLines || selectedScene.scriptLines.length === 0 ? (
                  <div className='text-center py-16 border border-dashed border-[#E5DFD7] rounded-2xl text-zinc-400 text-xs bg-[#FAF8F5]/50'>
                    <MessageSquare className='w-8 h-8 text-zinc-300 mx-auto mb-2' />
                    Phân cảnh này chưa có dòng kịch bản nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        onClick={handleOpenAddLine}
                        className='block mx-auto mt-3 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl cursor-pointer shadow-xs'
                      >
                        + Thêm dòng kịch bản đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  selectedScene.scriptLines.map((line, index) => {
                    const speakerName = getSpeakerName(line.speakerCharacterId);
                    const isFirst = index === 0;
                    const isLast = index === (selectedScene.scriptLines?.length || 0) - 1;
                    const isDragging = draggedLineIndex === index;
                    const isDragOver = dragOverLineIndex === index && draggedLineIndex !== index;
                    const isHighlighted = highlightedLineId === line.id;

                    return (
                      <div
                        key={line.id}
                        id={`script-line-${line.id}`}
                        data-testid={`script-line-${line.id}`}
                        draggable={canEditScript && !isChapterLocked && !isReorderingLines}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={() => {
                          setDraggedLineIndex(null);
                          setDragOverLineIndex(null);
                        }}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`p-4 md:p-5 rounded-2xl border transition-all group relative ${
                          isDragging
                            ? 'opacity-40 border-dashed border-orange-400 bg-orange-50/20'
                            : isDragOver
                              ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50/60 scale-[1.01]'
                              : isHighlighted
                                ? 'border-orange-500 ring-4 ring-orange-400/80 bg-orange-50/90 shadow-md scale-[1.01] duration-300'
                                : 'border-[#E7E2D9] bg-white hover:border-orange-300 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            {canEditScript && !isChapterLocked && (
                              <div
                                className='cursor-grab active:cursor-grabbing text-zinc-400 hover:text-orange-500 p-1 rounded-lg hover:bg-zinc-100 transition-colors'
                                title='Kéo thả để đổi thứ tự dòng'
                              >
                                <GripVertical className='w-4 h-4' />
                              </div>
                            )}
                            <span className='font-mono text-xs font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md'>
                              #{line.lineOrder}
                            </span>
                            {speakerName && (
                              <span className='inline-flex items-center gap-1.5 text-xs font-bold text-orange-900 bg-orange-100/90 border border-orange-200/80 px-2.5 py-0.5 rounded-full shadow-2xs'>
                                <User className='w-3 h-3 text-orange-600' />
                                <span>{speakerName}</span>
                              </span>
                            )}
                            {line.panelId && (
                              <span className='text-xs font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md flex items-center gap-1'>
                                <Layers className='w-2.5 h-2.5' />
                                <span>Panel</span>
                              </span>
                            )}
                            {line.narrationMode && line.narrationMode !== 'Present' && (
                              <span
                                data-testid={`narration-mode-badge-${line.id}`}
                                className='text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1'
                                title={`Ngoại lệ trần thuật: ${line.narrationMode}`}
                              >
                                {line.narrationMode === 'Flashback' && '⏪ Hồi tưởng'}
                                {line.narrationMode === 'Dream' && '💭 Giấc mơ'}
                                {line.narrationMode === 'Imagination' && '✨ Tưởng tượng'}
                                {line.narrationMode === 'Lie' && '🤥 Nói dối'}
                                {line.narrationMode === 'Rumor' && '🗣️ Tin đồn'}
                                {line.narrationMode === 'UnreliableNarrator' && '🎭 Không đáng tin'}
                              </span>
                            )}
                            {isHighlighted && (
                              <span className='text-xs font-bold text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full animate-pulse'>
                                Đang xem dòng này
                              </span>
                            )}
                          </div>

                          {canEditScript && !isChapterLocked && (
                            <div className='flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity'>
                              <button
                                onClick={() => handleMoveLine(index, 'up')}
                                disabled={isFirst || isReorderingLines}
                                className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                                title='Di chuyển lên trên'
                              >
                                <ChevronUp className='w-3.5 h-3.5' />
                              </button>
                              <button
                                onClick={() => handleMoveLine(index, 'down')}
                                disabled={isLast || isReorderingLines}
                                className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                                title='Di chuyển xuống dưới'
                              >
                                <ChevronDown className='w-3.5 h-3.5' />
                              </button>
                              <button
                                onClick={() => handleOpenEditLine(line)}
                                className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors'
                                title='Sửa dòng kịch bản'
                              >
                                <Edit2 className='w-3.5 h-3.5' />
                              </button>
                              <button
                                onClick={() => handleDeleteLine(line)}
                                className='p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors'
                                title='Xoá dòng'
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stage Direction */}
                        {line.stageDirection && (
                          <div className='mt-2.5 text-xs md:text-sm italic text-zinc-700 bg-amber-50/50 p-2.5 rounded-xl border-l-3 border-amber-400 font-sans leading-relaxed'>
                            <span className='font-semibold not-italic text-amber-800 mr-1'>
                              [Chỉ dẫn]:
                            </span>
                            {line.stageDirection}
                          </div>
                        )}

                        {/* Dialogue */}
                        {line.dialogueText && (
                          <div className='mt-3 text-[15px] md:text-base text-zinc-900 font-serif leading-relaxed tracking-wide'>
                            &ldquo;{line.dialogueText}&rdquo;
                          </div>
                        )}

                        {/* Line Consistency Finding Badge (Chỉ xem, không có triage) */}
                        {(() => {
                          const lineFinding = findings.find(
                            (f) =>
                              f.scriptLineId === line.id &&
                              f.status !== 'Resolved' &&
                              f.status !== 'Rejected' &&
                              f.status !== 'Ignored' &&
                              f.status !== 'Stale',
                          );
                          if (!lineFinding) return null;
                          return (
                            <div
                              data-testid={`line-finding-${line.id}`}
                              className={`mt-3 p-2.5 rounded-xl text-xs md:text-sm flex items-start gap-2.5 border ${
                                lineFinding.severity === 'Blocking'
                                  ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                                  : lineFinding.severity === 'Warning'
                                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                    : 'bg-blue-50/90 border-blue-200 text-blue-900'
                              }`}
                            >
                              <AlertTriangle
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  lineFinding.severity === 'Blocking'
                                    ? 'text-rose-600'
                                    : lineFinding.severity === 'Warning'
                                      ? 'text-amber-600'
                                      : 'text-blue-600'
                                }`}
                              />
                              <div className='flex-1 min-w-0'>
                                <div className='font-bold flex items-center gap-1.5'>
                                  <span>[{lineFinding.severity}]</span>
                                  <span className='font-mono font-bold'>
                                    {lineFinding.ruleCode}
                                  </span>
                                </div>
                                <p className='mt-0.5'>{lineFinding.message}</p>
                                {lineFinding.evidence && (
                                  <p className='mt-1 font-mono text-xs opacity-90 truncate bg-white/80 p-1.5 rounded'>
                                    Bằng chứng: &ldquo;{lineFinding.evidence}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Linked Series Bible Entries (UC-06) */}
                        {line.bibleEntryIds && line.bibleEntryIds.length > 0 && (
                          <div className='mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-zinc-100'>
                            <span className='text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1'>
                              <BookOpen className='w-3 h-3 text-purple-600' />
                              <span>Bible:</span>
                            </span>
                            {line.bibleEntryIds.map((bId) => {
                              const entry = getBibleEntry(bId);
                              return (
                                <span
                                  key={bId}
                                  className='inline-flex items-center gap-1 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full'
                                  title={entry?.description || entry?.name || 'Mục Series Bible'}
                                >
                                  <span>{entry?.name || bId.slice(0, 8)}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className='flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-400'>
              <div className='p-3 bg-zinc-100 rounded-2xl mb-3'>
                <Clapperboard className='w-10 h-10 text-zinc-400' />
              </div>
              <h3 className='text-base font-bold text-zinc-700'>Chưa chọn Phân cảnh</h3>
              <p className='text-xs mt-1 max-w-sm text-zinc-500'>
                Vui lòng chọn một phân cảnh ở cột bên trái hoặc tạo phân cảnh mới để bắt đầu viết
                kịch bản.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Series Bible Characters Reference (3 cols) */}
        <div className='lg:col-span-3 bg-white border border-[#E5DFD7] rounded-2xl p-4 shadow-xs flex flex-col space-y-4'>
          <div className='flex items-center gap-2 border-b border-[#E5DFD7] pb-3'>
            <div className='p-1.5 bg-orange-100 text-orange-600 rounded-lg'>
              <User className='w-4 h-4' />
            </div>
            <div>
              <h2 className='text-xs font-bold uppercase tracking-wider text-[#171717]'>
                Nhân vật Series Bible ({characters.length})
              </h2>
            </div>
          </div>

          <p className='text-xs text-[#78716C] leading-relaxed'>
            Danh sách nhân vật Canon từ Series Bible. Gắn đúng nhân vật khi soạn thoại để hệ thống
            Letterer và AI kiểm tra nhất quán.
          </p>

          {/* Quick search input */}
          {characters.length > 3 && (
            <div className='relative'>
              <Search className='w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5' />
              <input
                type='text'
                value={bibleSearchQuery}
                onChange={(e) => setBibleSearchQuery(e.target.value)}
                placeholder='Tìm kiếm nhân vật...'
                className='w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-xl outline-none focus:border-orange-500 bg-zinc-50/50'
              />
            </div>
          )}

          <div className='space-y-2.5 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar'>
            {characters.length === 0 ? (
              <div className='text-center py-8 text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200'>
                Chưa có nhân vật nào trong Series Bible.
              </div>
            ) : (
              characters
                .filter((c) =>
                  bibleSearchQuery
                    ? c.name.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
                      (c.subtitle &&
                        c.subtitle.toLowerCase().includes(bibleSearchQuery.toLowerCase())) ||
                      (c.description &&
                        c.description.toLowerCase().includes(bibleSearchQuery.toLowerCase()))
                    : true,
                )
                .map((char) => (
                  <div
                    key={char.id}
                    className='p-3.5 rounded-xl border border-[#E7E2D9] bg-[#FAF8F5] hover:bg-white transition-all text-left flex items-start gap-3 shadow-2xs hover:shadow-xs'
                  >
                    <div className='w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs'>
                      {char.name.charAt(0).toUpperCase()}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs md:text-sm font-bold text-[#171717] truncate'>
                        {char.name}
                      </div>
                      {char.subtitle && (
                        <div className='text-xs text-orange-600 font-mono truncate font-semibold'>
                          {char.subtitle}
                        </div>
                      )}
                      {char.description && (
                        <p className='text-xs text-[#737373] line-clamp-2 mt-1 leading-snug'>
                          {char.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Panel Trợ lý AI: viết nháp script cho Scene đang chọn */}
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

      {/* Lịch sử phiên bản script của Scene + khôi phục (UC-13 / BR-08) */}
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
              <h3 className='text-base font-bold text-[#171717]'>
                {isEditingScene ? 'Sửa Phân Cảnh' : 'Tạo Phân Cảnh Mới'}
              </h3>
              <button
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
                <p className='text-xs text-zinc-400 mt-1'>
                  Các dòng kịch bản mới thêm vào phân cảnh này sẽ tự động kế thừa chế độ kể chuyện
                  tương ứng.
                </p>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setSceneModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl'
                >
                  Huỷ
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs disabled:opacity-50'
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
                <h3 className='text-base font-bold text-[#171717]'>
                  {editingLine
                    ? `Sửa Dòng Kịch Bản #${editingLine.lineOrder}`
                    : 'Thêm Dòng Kịch Bản Mới (UC-06)'}
                </h3>
                <p className='text-xs text-zinc-500'>
                  Phiên bản chương hiện tại: <strong>v{currentChapter?.versionVector}</strong>
                </p>
              </div>
              <button
                onClick={() => setLineModalOpen(false)}
                className='text-zinc-400 hover:text-zinc-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmitLine} className='space-y-4'>
              {/* Chọn Nhân vật nói (Speaker) */}
              <div>
                <label className='block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5'>
                  <User className='w-3.5 h-3.5 text-orange-600' />
                  <span>Nhân vật nói (Speaker Character)</span>
                </label>
                <select
                  value={lineSpeakerId}
                  onChange={(e) => setLineSpeakerId(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-orange-500 bg-white'
                >
                  <option value=''>-- Không có nhân vật / Lời dẫn ngoài --</option>
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} {char.subtitle ? `(${char.subtitle})` : ''}
                    </option>
                  ))}
                </select>
                <p className='text-xs text-zinc-400 mt-1'>
                  * Nhân vật được lấy từ Series Bible. Gắn đúng nhân vật giúp Letterer sinh balloon
                  tương ứng.
                </p>
              </div>

              {/* Thoại (Dialogue) */}
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
                  <span className='text-xs text-zinc-400 font-normal'>
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
                              <CheckCircle2 className='w-3 h-3 text-purple-700' />
                            ) : (
                              <Plus className='w-3 h-3 text-zinc-400' />
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
                  <span className='text-xs text-zinc-400 font-normal'>Bỏ qua báo sai</span>
                </label>
                <select
                  data-testid='line-narration-mode-select'
                  value={lineNarrationMode}
                  onChange={(e) => setLineNarrationMode(e.target.value as NarrationMode)}
                  className='w-full px-3 py-2 text-xs border border-[#E7E7E7] rounded-xl outline-none focus:border-purple-500 bg-white'
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
                <p className='text-xs text-zinc-400 mt-1'>
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
                  <span className='text-xs text-zinc-400 ml-2'>
                    Trùng số sẽ tự động chèn và dịch các dòng sau xuống.
                  </span>
                </div>
              )}

              <div className='flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setLineModalOpen(false)}
                  className='px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl'
                >
                  Huỷ
                </button>
                <button
                  data-testid='submit-line-btn'
                  type='submit'
                  disabled={submitting}
                  className='px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs disabled:opacity-50'
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
