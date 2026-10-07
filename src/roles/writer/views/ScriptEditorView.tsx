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
  ShieldAlert,
  Info,
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
} from '@/services/scriptLine.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { normalizeWorkspaceRole } from '@/types/auth';

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

  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SceneScriptLineSummaryDto | null>(null);
  const [lineSpeakerId, setLineSpeakerId] = useState<string>('');
  const [lineDialogue, setLineDialogue] = useState<string>('');
  const [lineStageDirection, setLineStageDirection] = useState<string>('');
  const [lineOrderInput, setLineOrderInput] = useState<number>(1);

  // Banner lỗi xung đột / cập nhật
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);

  const notify = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) {
        onShowToast(title, desc);
      }
    },
    [onShowToast],
  );

  // 1. Tải danh sách Chapters và Series Bible Characters
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);

    Promise.all([
      chapterService.getChaptersBySeries(seriesId, 1, 50),
      bibleService.getSeriesBible(seriesId).catch(() => null),
    ])
      .then(([chapRes, bibleRes]) => {
        if (!isMounted) return;
        setChapters(chapRes.items);

        if (bibleRes && bibleRes.entries) {
          // Lọc nhân vật (category === 0)
          const charList = bibleRes.entries.filter((e) => e.category === 0);
          setCharacters(charList);
        }

        if (chapRes.items.length > 0) {
          const matched = chapRes.items.find((c) => c.id === chapterIdFromUrl);
          const activeChap = matched || chapRes.items[0];
          setCurrentChapter(activeChap);
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
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('chapterId', chapId);
        p.delete('sceneId');
        return p;
      });
    }
  };

  // --- CRUD SCENE ---
  const handleOpenCreateScene = () => {
    setIsEditingScene(false);
    setSceneNumberInput(scenes.length + 1);
    setSceneHeadingInput('');
    setSceneSummaryInput('');
    setSceneModalOpen(true);
  };

  const handleOpenEditScene = () => {
    if (!selectedScene) return;
    setIsEditingScene(true);
    setSceneNumberInput(selectedScene.sceneNumber);
    setSceneHeadingInput(selectedScene.heading || '');
    setSceneSummaryInput(selectedScene.summary || '');
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
        // Thêm dòng mới (POST)
        const req: CreateScriptLineRequest = {
          dialogueText: lineDialogue.trim() || null,
          stageDirection: lineStageDirection.trim() || null,
          speakerCharacterId: lineSpeakerId || null,
          lineOrder: lineOrderInput,
          expectedChapterVersion: expectedVersion,
        };
        const res = await scriptLineService.createScriptLine(
          currentChapter.id,
          selectedScene.id,
          req,
        );
        notify('Thêm thành công', `Đã tạo dòng kịch bản #${res.lineOrder}`);

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

  // Helper tìm tên nhân vật từ ID
  const getSpeakerName = (speakerId?: string | null) => {
    if (!speakerId) return null;
    const found = characters.find((c) => c.id === speakerId);
    return found ? found.name : 'Nhân vật (Chưa rõ)';
  };

  const isChapterLocked =
    currentChapter?.status === 'Approved' || currentChapter?.status === 'Published';

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
              <span className='px-2 py-0.5 rounded bg-orange-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider'>
                UC-06 // Writer Script
              </span>
              {currentChapter && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
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
                <span className='text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded'>
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
          className='mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in'
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
          className='mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800'
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
          className='mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800'
        >
          <Info className='w-4 h-4 text-blue-600 shrink-0' />
          <span>
            Chế độ xem: Bạn đang xem kịch bản với quyền tham khảo. Chỉ vai trò{' '}
            <strong>Producer</strong> hoặc <strong>Writer</strong> mới có quyền thêm, sửa và xoá
            phân cảnh hoặc dòng kịch bản.
          </span>
        </div>
      )}

      {/* Main Grid: Left Scenes Navigation | Center Script Lines | Right Characters Reference */}
      <div className='flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* LEFT: Scenes Sidebar (3 cols) */}
        <div className='lg:col-span-3 bg-white border border-[#E7E7E7] rounded-2xl p-4 shadow-xs flex flex-col space-y-4'>
          <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
            <div className='flex items-center gap-2'>
              <Clapperboard className='w-4 h-4 text-orange-600' />
              <h2 className='text-xs font-bold uppercase tracking-wider text-[#171717]'>
                Phân cảnh ({scenes.length})
              </h2>
            </div>
            {canEditScript && !isChapterLocked && (
              <button
                onClick={handleOpenCreateScene}
                className='p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer'
                title='Thêm phân cảnh mới'
              >
                <Plus className='w-4 h-4' />
              </button>
            )}
          </div>

          <div className='space-y-2 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar'>
            {scenes.length === 0 ? (
              <div className='text-center py-8 text-xs text-zinc-400'>
                Chương này chưa có phân cảnh nào.
                {canEditScript && !isChapterLocked && (
                  <button
                    onClick={handleOpenCreateScene}
                    className='block mx-auto mt-2 text-[#F97316] font-semibold underline'
                  >
                    Tạo cảnh đầu tiên
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-1 ring-orange-500/20'
                        : 'border-[#E7E7E7] hover:bg-[#F8F6F0] hover:border-zinc-300'
                    }`}
                  >
                    <div className='flex items-center justify-between text-xs font-bold mb-1'>
                      <span className={isSelected ? 'text-orange-950 font-bold' : 'text-[#171717]'}>
                        Cảnh {s.sceneNumber}
                      </span>
                      <span className='font-mono text-[10px] text-zinc-500'>
                        {s.scriptLinesCount} dòng
                      </span>
                    </div>
                    <div className='text-xs text-[#555555] font-medium line-clamp-1'>
                      {s.heading || 'Không có tiêu đề'}
                    </div>
                    {s.summary && (
                      <p className='text-[11px] text-[#888888] line-clamp-2 mt-1 leading-snug'>
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
        <div className='lg:col-span-6 bg-white border border-[#E7E7E7] rounded-2xl p-6 shadow-xs flex flex-col space-y-5 min-h-[500px]'>
          {selectedScene ? (
            <>
              {/* Scene Heading & Actions */}
              <div className='flex items-start justify-between border-b border-[#E7E7E7] pb-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10px] font-bold'>
                      CẢNH {selectedScene.sceneNumber}
                    </span>
                    <span className='text-xs font-mono text-zinc-400'>
                      ID: {selectedScene.id.substring(0, 8)}...
                    </span>
                  </div>
                  <h3 className='text-lg font-bold font-serif text-[#171717] mt-1'>
                    {selectedScene.heading || 'Phân cảnh chưa đặt tiêu đề'}
                  </h3>
                  {selectedScene.summary && (
                    <p className='text-xs text-[#666666] mt-1 italic'>
                      &ldquo;{selectedScene.summary}&rdquo;
                    </p>
                  )}
                </div>

                {canEditScript && !isChapterLocked && (
                  <div className='flex items-center gap-1.5'>
                    <button
                      onClick={handleOpenEditScene}
                      className='p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer'
                      title='Sửa tiêu đề phân cảnh'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={handleDeleteScene}
                      className='p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer'
                      title='Xoá phân cảnh'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Toolbar for Script Lines */}
              <div className='flex items-center justify-between bg-[#F8F6F0] p-3 rounded-xl border border-[#E7E7E7]'>
                <div className='flex items-center gap-2'>
                  <MessageSquare className='w-4 h-4 text-orange-600' />
                  <span className='text-xs font-bold text-[#171717]'>
                    Dòng Kịch Bản ({selectedScene.scriptLines?.length || 0})
                  </span>
                </div>
                {canEditScript && !isChapterLocked && (
                  <button
                    data-testid='open-add-line-btn'
                    onClick={handleOpenAddLine}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-all cursor-pointer'
                  >
                    <Plus className='w-3.5 h-3.5' />
                    <span>Thêm Dòng Kịch Bản</span>
                  </button>
                )}
              </div>

              {/* Script Lines List */}
              <div className='space-y-3 flex-1 overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar'>
                {!selectedScene.scriptLines || selectedScene.scriptLines.length === 0 ? (
                  <div className='text-center py-12 border border-dashed border-[#E7E7E7] rounded-xl text-zinc-400 text-xs'>
                    Phân cảnh này chưa có dòng kịch bản nào.
                    {canEditScript && !isChapterLocked && (
                      <button
                        onClick={handleOpenAddLine}
                        className='block mx-auto mt-2 text-[#F97316] font-semibold underline'
                      >
                        Thêm dòng kịch bản đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  selectedScene.scriptLines.map((line) => {
                    const speakerName = getSpeakerName(line.speakerCharacterId);
                    return (
                      <div
                        key={line.id}
                        className='p-4 rounded-xl border border-[#E7E7E7] bg-white hover:border-orange-300 transition-all shadow-2xs group relative'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded'>
                              #{line.lineOrder}
                            </span>
                            {speakerName && (
                              <span className='inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full'>
                                <User className='w-3 h-3' />
                                <span>{speakerName}</span>
                              </span>
                            )}
                            {line.panelId && (
                              <span className='text-[9px] font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1'>
                                <Layers className='w-2.5 h-2.5' />
                                <span>Panel</span>
                              </span>
                            )}
                          </div>

                          {canEditScript && !isChapterLocked && (
                            <div className='flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity'>
                              <button
                                onClick={() => handleOpenEditLine(line)}
                                className='p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded cursor-pointer'
                                title='Sửa dòng kịch bản'
                              >
                                <Edit2 className='w-3.5 h-3.5' />
                              </button>
                              <button
                                onClick={() => handleDeleteLine(line)}
                                className='p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer'
                                title='Xoá dòng'
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stage Direction */}
                        {line.stageDirection && (
                          <div className='mt-2 text-xs italic text-[#666666] bg-zinc-50 p-2 rounded-lg border-l-2 border-zinc-400'>
                            [Chỉ dẫn]: {line.stageDirection}
                          </div>
                        )}

                        {/* Dialogue */}
                        {line.dialogueText && (
                          <div className='mt-2 text-sm text-[#171717] font-serif leading-relaxed'>
                            &ldquo;{line.dialogueText}&rdquo;
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
              <Clapperboard className='w-12 h-12 text-zinc-300 mb-3' />
              <h3 className='text-sm font-bold text-zinc-700'>Chưa chọn Phân cảnh</h3>
              <p className='text-xs mt-1 max-w-sm'>
                Vui lòng chọn một phân cảnh ở cột bên trái hoặc tạo phân cảnh mới để bắt đầu viết
                kịch bản.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Series Bible Characters Reference (3 cols) */}
        <div className='lg:col-span-3 bg-white border border-[#E7E7E7] rounded-2xl p-4 shadow-xs flex flex-col space-y-4'>
          <div className='flex items-center gap-2 border-b border-[#E7E7E7] pb-3'>
            <User className='w-4 h-4 text-orange-600' />
            <h2 className='text-xs font-bold uppercase tracking-wider text-[#171717]'>
              Nhân vật Series Bible ({characters.length})
            </h2>
          </div>

          <p className='text-[11px] text-[#737373]'>
            Danh sách nhân vật chính thức (Canon) từ Series Bible. Khi thêm thoại, hãy gắn đúng nhân
            vật để Letterer liên kết balloon thoại và AI kiểm tra tính nhất quán.
          </p>

          <div className='space-y-2.5 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar'>
            {characters.length === 0 ? (
              <div className='text-center py-8 text-xs text-zinc-400'>
                Chưa có nhân vật nào trong Series Bible.
              </div>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className='p-3 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] hover:bg-white transition-all text-left flex items-start gap-2.5'
                >
                  <div className='w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0'>
                    {char.name.charAt(0).toUpperCase()}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-xs font-bold text-[#171717] truncate'>{char.name}</div>
                    {char.subtitle && (
                      <div className='text-[10px] text-orange-600 font-mono truncate'>
                        {char.subtitle}
                      </div>
                    )}
                    {char.description && (
                      <p className='text-[11px] text-[#737373] line-clamp-2 mt-1'>
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
                <p className='text-[11px] text-zinc-500'>
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
                <p className='text-[10px] text-zinc-400 mt-1'>
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
                  <span className='text-[10px] text-zinc-400 ml-2'>
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
