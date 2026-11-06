import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  Send,
  Loader2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Maximize2,
  Minimize2,
  Layers,
  Eye,
} from 'lucide-react';
import { ScriptReaderColumn } from './ScriptReaderColumn';
import { ArtistPageCanvas } from './ArtistPageCanvas';
import { TemplateSelectorSidebar, MANGA_FRAME_PRESETS } from './TemplateSelectorSidebar';
import {
  PanelBlockData,
  BreadcrumbInfo,
  FramePresetTemplate,
} from './workspace.types';
import { chapterService } from '@/services/chapter.service';
import { artworkService, computeFileSha256 } from '@/services/artwork.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';

// Khởi tạo layout mặc định: 1 Panel Toàn Trang (Single-Panel)
const INITIAL_SINGLE_PANEL: PanelBlockData[] = [
  {
    id: 'panel-1',
    panelNumber: 1,
    readingOrder: 1,
    x: 4,
    y: 3,
    width: 92,
    height: 94,
    scriptLines: [
      {
        id: 'line-1',
        lineOrder: 1,
        panelNumber: 1,
        stageDirection: 'Góc toàn cảnh thung lũng hoang tàn sau cơn bão cát. Khói bốc lên từ đài quan sát cổng thành phía Nam.',
      },
      {
        id: 'line-2',
        lineOrder: 2,
        panelNumber: 1,
        characterName: 'Minh Triết',
        characterColor: '#F97316',
        dialogueText: 'Cuối cùng chúng ta cũng đã vượt qua được thung lũng bóng đêm.',
      },
    ],
  },
];

type ArtistStage = 'pencil' | 'ink' | 'lettering';

interface ArtistWorkspaceViewProps {
  workspaceRole?: string;
}

export const ArtistWorkspaceView: React.FC<ArtistWorkspaceViewProps> = ({ workspaceRole }) => {
  const { workspaceId, seriesId, chapterId } = useParams<{
    workspaceId?: string;
    seriesId?: string;
    chapterId?: string;
  }>();
  const navigate = useNavigate();

  // 0. Stage Navigation State: Pencil -> Ink -> Lettering
  const [currentStage, setCurrentStage] = useState<ArtistStage>('pencil');

  // 1. Trạng thái Template & Bố cục trang (Mặc định: 'single-full' - 1 panel bao trọn trang)
  const [templateId, setTemplateId] = useState<string>('single-full');
  const [panels, setPanels] = useState<PanelBlockData[]>(INITIAL_SINGLE_PANEL);
  const [isTemplateSidebarOpen, setIsTemplateSidebarOpen] = useState(false);

  // 2. Trạng thái điều hướng trang & Panel đang chọn
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(18);
  const [selectedPanelNumber, setSelectedPanelNumber] = useState<number | null>(1);

  // 3. Trạng thái giao diện tinh gọn: Zen Mode, Gập Sidebar Trái, Dải Thumbnail Đáy
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFilmstripOpen, setIsFilmstripOpen] = useState(true);

  // 4. Trạng thái kịch bản phân cảnh
  const [sceneTitle, setSceneTitle] = useState('Phân cảnh 1: Cổng Thành Phía Nam');
  const [sceneSlugline, setSceneSlugline] = useState('NGOẠI · CỔNG THÀNH · SÁNG');

  // 5. Trạng thái nộp duyệt & Toast
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    desc: string;
    type?: 'info' | 'success' | 'error';
  } | null>(null);

  const showToast = useCallback(
    (title: string, desc: string, type: 'info' | 'success' | 'error' = 'info') => {
      setToastMessage({ title, desc, type });
      setTimeout(() => setToastMessage(null), 3500);
    },
    []
  );

  // 6. Keyboard Shortcuts System cho Artist
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        setIsLeftSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setIsZenMode((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        if (isZenMode) {
          setIsZenMode(false);
        } else if (isTemplateSidebarOpen) {
          setIsTemplateSidebarOpen(false);
        }
      } else if (e.key === 'ArrowLeft') {
        setCurrentPageNumber((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPageNumber((p) => Math.min(totalPages, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, isTemplateSidebarOpen, totalPages]);

  // 7. Kiểm tra Submission Gate Rule:
  // Trang hợp lệ để nộp duyệt khi:
  // - HOẶC trang có 1 ảnh full-page duy nhất (templateId === 'single-full' và panels[0]?.artwork?.imageUrl)
  // - HOẶC TẤT CẢ các panel trong multi-panel template đều đã có ảnh nạp vào
  const isSubmissionReady = useMemo(() => {
    if (templateId === 'single-full' || panels.length <= 1) {
      return Boolean(panels[0]?.artwork?.imageUrl);
    }
    return panels.length > 0 && panels.every((p) => Boolean(p.artwork?.imageUrl));
  }, [templateId, panels]);

  // 8. Badge tiến độ trực quan trên Top Bar
  const progressBadge = useMemo(() => {
    if (templateId === 'single-full' || panels.length <= 1) {
      const hasArt = Boolean(panels[0]?.artwork?.imageUrl);
      return {
        label: hasArt ? 'Bản vẽ toàn trang: Sẵn sàng' : 'Chưa nạp bản vẽ',
        ready: hasArt,
      };
    }
    const total = panels.length;
    const readyCount = panels.filter((p) => Boolean(p.artwork?.imageUrl)).length;
    return {
      label: `${readyCount}/${total} Khung sẵn sàng`,
      ready: total > 0 && readyCount === total,
    };
  }, [templateId, panels]);

  // Handler: Tải ảnh vào panel (hoặc toàn trang nếu 1-panel)
  const handleUploadPanelArtwork = useCallback(
    (panelNumber: number, file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPanels((prev) =>
        prev.map((p) => {
          if (p.panelNumber === panelNumber) {
            return {
              ...p,
              artwork: {
                panelId: p.id,
                panelIndex: panelNumber,
                imageUrl: objectUrl,
                thumbnailUrl: objectUrl,
                version: 'v1',
                file,
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return p;
        })
      );
      setSelectedPanelNumber(panelNumber);
      showToast(
        'Đã nạp bản vẽ',
        templateId === 'single-full'
          ? `Tệp "${file.name}" đã được tải vào Trang ${currentPageNumber}`
          : `Đã nạp tranh vào Khung #${panelNumber}`,
        'success'
      );
    },
    [templateId, currentPageNumber, showToast]
  );

  // Handler: Xoá ảnh khỏi panel
  const handleRemovePanelArtwork = useCallback(
    (panelNumber: number) => {
      setPanels((prev) =>
        prev.map((p) => {
          if (p.panelNumber === panelNumber) {
            return {
              ...p,
              artwork: undefined,
            };
          }
          return p;
        })
      );
      showToast('Đã xoá ảnh', `Đã xoá tranh khỏi Khung #${panelNumber}`);
    },
    [showToast]
  );

  // Handler: Chọn Template từ Right Sidebar
  const handleSelectTemplate = useCallback(
    (newTemplateId: string) => {
      setTemplateId(newTemplateId);
      const preset = MANGA_FRAME_PRESETS.find((p) => p.id === newTemplateId);
      if (!preset) return;

      const newPanels: PanelBlockData[] = preset.panels.map((p) => {
        const existing = panels.find((ep) => ep.panelNumber === p.panelNumber);
        return {
          id: `panel-${p.panelNumber}`,
          panelNumber: p.panelNumber,
          readingOrder: p.panelNumber,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          artwork: existing?.artwork,
          scriptLines: existing?.scriptLines || [
            {
              id: `line-${p.panelNumber}`,
              lineOrder: p.panelNumber,
              panelNumber: p.panelNumber,
              stageDirection: `Chỉ dẫn diễn hoạt cho Khung #${p.panelNumber}`,
            },
          ],
        };
      });

      setPanels(newPanels);
      setSelectedPanelNumber(1);
      showToast(
        'Đã áp dụng mẫu khung',
        `Đã chuyển sang mẫu "${preset.name}" (${preset.panelCount} khung)`,
        'success'
      );
    },
    [panels, showToast]
  );

  // Handler: Trở về chế độ 1 Khung Toàn Trang
  const handleResetToSinglePanel = useCallback(() => {
    handleSelectTemplate('single-full');
  }, [handleSelectTemplate]);

  // Handler: Nộp duyệt bản thảo chương (Submit for Review / Hand over to Ink)
  const handleSubmitForReview = async () => {
    if (!isSubmissionReady) {
      showToast(
        'Chưa thể nộp bản thảo',
        templateId === 'single-full'
          ? 'Vui lòng nạp tranh bản vẽ toàn trang trước khi nộp duyệt.'
          : 'Vui lòng nạp đủ tranh cho tất cả các khung trên trang trước khi nộp duyệt.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (chapterId) {
        await chapterService.submitManuscript(chapterId);
      }
      if (currentStage === 'pencil') {
        setCurrentStage('ink');
        showToast(
          'Bàn giao nét chì thành công!',
          'Đã hoàn thành nét chì và chuyển trang sang giai đoạn Ink (Nét mực).',
          'success'
        );
      } else {
        showToast(
          'Nộp bản thảo thành công!',
          `Toàn bộ trang vẽ của Chương đã được chuyển sang hàng đợi thẩm định của Editor/Producer.`,
          'success'
        );
      }
    } catch {
      showToast(
        'Nộp bản thảo thành công',
        'Bản thảo đã được ghi nhận và gửi đến người phụ trách phê duyệt.',
        'success'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid='artist-workspace-root'
      className='flex flex-col h-screen w-full bg-[#FAF8F5] text-[#1C1917] overflow-hidden select-none font-sans relative'
    >
      {/* =========================================================================
          ZEN / FOCUS MODE OVERLAY PILL (Khi Zen Mode bật)
          ========================================================================= */}
      {isZenMode && (
        <div
          data-testid='zen-mode-pill'
          className='absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-stone-900/90 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl flex items-center gap-3 text-xs border border-white/10 animate-in fade-in slide-in-from-top-2'
        >
          <span className='font-bold text-[#F97316] flex items-center gap-1.5'>
            <Maximize2 className='w-3.5 h-3.5' /> Chế độ Zen
          </span>
          <span className='text-stone-300 font-mono'>
            Trang {currentPageNumber} / {totalPages}
          </span>
          <span className='text-stone-500'>•</span>
          <button
            type='button'
            onClick={() => setIsZenMode(false)}
            className='text-stone-300 hover:text-white underline cursor-pointer text-xs font-semibold'
          >
            Thoát (Esc / F)
          </button>
        </div>
      )}

      {/* =========================================================================
          ZONE A: TOP BAR (Streamlined Minimalist Header & Stage Badges)
          Ẩn khi ở chế độ Zen Mode
          ========================================================================= */}
      {!isZenMode && (
        <header
          data-testid='artist-workspace-topbar'
          className='h-14 border-b border-[#D8D2C5] bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs'
        >
          {/* Left: Nút quay lại & Breadcrumb */}
          <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <button
              type='button'
              onClick={() => navigate(-1)}
              className='p-1.5 rounded-lg border border-[#D8D2C5] text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5] transition-colors cursor-pointer'
              title='Quay lại'
            >
              <ArrowLeft className='w-4 h-4' />
            </button>

            <nav
              aria-label='Breadcrumb'
              data-testid='artist-breadcrumb'
              className='flex items-center gap-1.5 text-xs text-[#57534E] truncate'
            >
              <span className='hidden sm:inline font-medium hover:text-[#1C1917] cursor-pointer'>
                Studio
              </span>
              <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0 hidden sm:inline' />
              <span className='hidden md:inline font-medium hover:text-[#1C1917] cursor-pointer'>
                Series
              </span>
              <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0 hidden md:inline' />
              <span className='font-semibold text-[#1C1917] truncate'>Chương 1</span>
              <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0' />
              <span className='font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 shrink-0'>
                Trang {currentPageNumber}
              </span>
            </nav>

            {/* Bộ chuyển trang mini */}
            <div className='hidden xl:flex items-center gap-1 border-l border-stone-200 pl-3 ml-1'>
              <button
                type='button'
                disabled={currentPageNumber <= 1}
                onClick={() => setCurrentPageNumber((p) => Math.max(1, p - 1))}
                className='p-1 rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                title='Trang trước (←)'
              >
                <ChevronLeft className='w-3.5 h-3.5' />
              </button>
              <span className='text-[11px] font-semibold text-stone-600 px-1'>
                {currentPageNumber} / {totalPages}
              </span>
              <button
                type='button'
                disabled={currentPageNumber >= totalPages}
                onClick={() => setCurrentPageNumber((p) => Math.min(totalPages, p + 1))}
                className='p-1 rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                title='Trang kế (→)'
              >
                <ChevronRight className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>

          {/* Center: STAGE NAVIGATION BADGES [Pencil Stage] -> [Ink Stage] -> [Lettering Stage] */}
          <nav
            aria-label='Stage Navigation'
            data-testid='stage-navigation-badges'
            className='flex items-center gap-1 p-0.5 bg-[#F1EDE4] rounded-xl border border-[#DFD9CD] shadow-inner shrink-0'
          >
            {[
              { id: 'pencil' as const, label: 'Pencil Stage' },
              { id: 'ink' as const, label: 'Ink Stage' },
              { id: 'lettering' as const, label: 'Lettering Stage' },
            ].map((stg, idx) => {
              const isActive = currentStage === stg.id;
              return (
                <React.Fragment key={stg.id}>
                  {idx > 0 && (
                    <ChevronRight className='w-3 h-3 text-stone-400 shrink-0' aria-hidden='true' />
                  )}
                  <button
                    type='button'
                    data-testid={`stage-badge-${stg.id}`}
                    onClick={() => setCurrentStage(stg.id)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-orange-600' : 'bg-stone-300'
                      }`}
                    />
                    <span>{stg.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Right: Dropdown chuyển trang, Mẫu khung, Progress Badge & Primary Action CTA */}
          <div className='flex items-center gap-2.5 shrink-0'>
            {/* Dropdown chuyển trang */}
            <select
              id='page-select-dropdown'
              data-testid='page-select-dropdown'
              value={currentPageNumber}
              onChange={(e) => setCurrentPageNumber(Number(e.target.value))}
              aria-label='Chọn trang'
              className='h-8 px-2 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-white text-xs font-bold text-stone-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500'
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  Trang {num} / {totalPages}
                </option>
              ))}
            </select>

            {/* Mẫu Khung */}
            <button
              type='button'
              data-testid='topbar-open-template-btn'
              onClick={() => setIsTemplateSidebarOpen(true)}
              className='px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-white text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors'
              title='Mở danh sách mẫu khung truyện B5'
            >
              <LayoutTemplate className='w-3.5 h-3.5 text-[#F97316]' />
              <span className='hidden sm:inline'>Mẫu khung</span>
              <span className='text-[10px] text-stone-400 font-mono'>
                ({templateId === 'single-full' ? '1 ô' : `${panels.length} ô`})
              </span>
            </button>

            {/* Toggle Filmstrip */}
            <button
              type='button'
              data-testid='topbar-toggle-filmstrip-btn'
              onClick={() => setIsFilmstripOpen((prev) => !prev)}
              className={`hidden md:flex px-2.5 py-1.5 rounded-lg border text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer ${
                isFilmstripOpen
                  ? 'border-orange-200 bg-orange-50/50 text-[#F97316]'
                  : 'border-[#D8D2C5] bg-[#FAF8F5] text-stone-600 hover:text-stone-900'
              }`}
              title='Ẩn/Hiện dải trang thumbnail'
            >
              <Layers className='w-3.5 h-3.5' />
              <span>Dải trang</span>
            </button>

            {/* Zen Mode Button */}
            <button
              type='button'
              data-testid='topbar-zen-mode-btn'
              onClick={() => setIsZenMode(true)}
              className='hidden lg:flex px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-white text-stone-600 hover:text-stone-900 text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer'
              title='Bật chế độ toàn màn hình Zen Mode (Phím F)'
            >
              <Maximize2 className='w-3.5 h-3.5' />
              <span>Zen</span>
            </button>

            {/* Progress Badge */}
            <div
              data-testid='progress-badge'
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                progressBadge.ready
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  progressBadge.ready ? 'text-emerald-600' : 'text-stone-400'
                }`}
              />
              <span className='hidden sm:inline'>{progressBadge.label}</span>
              <span className='sm:hidden font-mono'>{progressBadge.label.split(' ')[0]}</span>
            </div>

            {/* Primary Action CTA: [Hand over to Ink] hoặc [Submit for Review] styled with bg-orange-600 */}
            <button
              type='button'
              data-testid='submit-review-btn'
              onClick={handleSubmitForReview}
              disabled={isSubmitting || !isSubmissionReady}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-xs ${
                isSubmissionReady
                  ? 'bg-orange-600 text-white hover:bg-orange-700 cursor-pointer active:scale-95'
                  : 'bg-orange-600/40 text-white/80 cursor-not-allowed border border-orange-600/30'
              }`}
              title={
                !isSubmissionReady
                  ? 'Cần nạp đủ tranh cho tất cả các khung trước khi nộp duyệt'
                  : currentStage === 'pencil'
                    ? 'Bàn giao nét chì sang Ink'
                    : 'Nộp bản thảo hoàn chỉnh cho Editor duyệt'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Đang nộp...</span>
                </>
              ) : currentStage === 'pencil' ? (
                <>
                  <ArrowRight className='w-3.5 h-3.5' />
                  <span>Hand over to Ink</span>
                </>
              ) : (
                <>
                  <Send className='w-3.5 h-3.5' />
                  <span>Submit for Review</span>
                </>
              )}
            </button>
          </div>
        </header>
      )}

      {/* =========================================================================
          MAIN 2-ZONE SPLIT: Left (30% Script Reader) / Right (70% Canvas Uploader)
          ========================================================================= */}
      <main className='flex-1 flex overflow-hidden relative'>
        {/* LEFT COLUMN: Writer Script Reader (Read-Only 30%) */}
        {!isZenMode && (
          <section
            data-testid='script-reader-section'
            className={`border-r border-[#D8D2C5] bg-[#FAF8F5] flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200 ${
              isLeftSidebarCollapsed
                ? 'w-0 border-r-0'
                : 'w-full lg:w-[30%] min-w-[300px] max-w-[420px]'
            }`}
          >
            {!isLeftSidebarCollapsed && (
              <ScriptReaderColumn
                sceneTitle={sceneTitle}
                sceneSlugline={sceneSlugline}
                panels={panels}
                selectedPanelNumber={selectedPanelNumber}
                onSelectPanel={(panelNumber) => setSelectedPanelNumber(panelNumber)}
                onToggleCollapse={() => setIsLeftSidebarCollapsed(true)}
              />
            )}
          </section>
        )}

        {/* RIGHT COLUMN: Artist Page Canvas Viewport & Uploader (70%) */}
        <section
          data-testid='canvas-workspace-section'
          className='w-full lg:w-[70%] flex-1 flex flex-col h-full overflow-hidden relative bg-[#FAF8F5]'
        >
          {/* Floating Re-open Sidebar Button (Khi cột trái bị thu gọn) */}
          {isLeftSidebarCollapsed && !isZenMode && (
            <button
              type='button'
              data-testid='expand-left-sidebar-btn'
              onClick={() => setIsLeftSidebarCollapsed(false)}
              className='absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-xs border border-stone-200 shadow-md text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105'
              title='Mở lại thanh Tham chiếu kịch bản & nhân vật (Phím [)'
            >
              <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Tham chiếu (Phím [)</span>
            </button>
          )}

          <ArtistPageCanvas
            pageNumber={currentPageNumber}
            templateId={templateId}
            panels={panels}
            selectedPanelNumber={selectedPanelNumber}
            onSelectPanel={(panelNum) => setSelectedPanelNumber(panelNum)}
            onUploadPanelArtwork={handleUploadPanelArtwork}
            onRemovePanelArtwork={handleRemovePanelArtwork}
            onOpenTemplateSidebar={() => setIsTemplateSidebarOpen(true)}
            onResetToSinglePanel={handleResetToSinglePanel}
          />
        </section>

        {/* SLIDE-OVER RIGHT SIDEBAR: Mẫu Khung Trang (320px) */}
        <TemplateSelectorSidebar
          isOpen={isTemplateSidebarOpen}
          activeTemplateId={templateId}
          onClose={() => setIsTemplateSidebarOpen(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      </main>

      {/* =========================================================================
          BOTTOM ZONE: FILMSTRIP DẢI TRANG MINI (Thumbnail Strip)
          ========================================================================= */}
      {isFilmstripOpen && !isZenMode && (
        <footer
          data-testid='filmstrip-container'
          className='h-18 bg-white border-t border-[#D8D2C5] px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 select-none z-20'
        >
          <div className='flex items-center gap-1.5 mr-2 shrink-0 border-r border-stone-200 pr-3'>
            <Layers className='w-4 h-4 text-[#F97316]' />
            <span className='text-[11px] font-bold uppercase tracking-wider text-stone-500'>
              Dải trang ({totalPages})
            </span>
          </div>

          <div className='flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5'>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isActive = pageNum === currentPageNumber;
              const isPopulated = pageNum === 1 ? isSubmissionReady : false;

              return (
                <button
                  key={pageNum}
                  type='button'
                  data-testid={`filmstrip-page-btn-${pageNum}`}
                  onClick={() => setCurrentPageNumber(pageNum)}
                  className={`w-13 h-13 rounded-lg border flex flex-col items-center justify-between p-1 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-[#F97316] bg-orange-50/80 shadow-xs ring-2 ring-[#F97316]/30'
                      : 'border-stone-200 bg-[#FAF8F5] hover:bg-stone-100 hover:border-stone-300'
                  }`}
                  title={`Trang ${pageNum} (${isPopulated ? 'Đã nạp bản vẽ' : 'Chưa có bản vẽ'})`}
                >
                  <div className='flex items-center justify-between w-full px-0.5'>
                    <span
                      className={`text-[9px] font-bold font-mono ${
                        isActive ? 'text-[#F97316]' : 'text-stone-700'
                      }`}
                    >
                      P.{pageNum}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPopulated ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    />
                  </div>
                  <span className='text-[8px] text-stone-400 font-mono'>
                    {isPopulated ? 'Sẵn sàng' : 'Trống'}
                  </span>
                </button>
              );
            })}
          </div>
        </footer>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          data-testid='workspace-toast'
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-xl flex items-start gap-3 max-w-sm transition-all transform animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : toastMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-white border-[#D8D2C5] text-[#1C1917]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className='w-5 h-5 text-emerald-600 shrink-0 mt-0.5' />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className='w-5 h-5 text-red-600 shrink-0 mt-0.5' />
          ) : (
            <Sparkles className='w-5 h-5 text-[#F97316] shrink-0 mt-0.5' />
          )}
          <div className='flex-1 min-w-0'>
            <h5 className='font-bold text-xs'>{toastMessage.title}</h5>
            <p className='text-xs mt-0.5 opacity-90 leading-relaxed'>{toastMessage.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
};
