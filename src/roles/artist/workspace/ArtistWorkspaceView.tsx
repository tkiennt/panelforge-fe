import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileImage,
  LayoutTemplate,
  Send,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { ScriptReaderColumn } from './ScriptReaderColumn';
import { FullPageCanvas } from './FullPageCanvas';
import { TemplatePanelCanvas, FRAME_PRESETS } from './TemplatePanelCanvas';
import {
  WorkspaceMode,
  PanelBlockData,
  PageArtworkState,
  FramePresetTemplate,
  BreadcrumbInfo,
} from './workspace.types';
import { chapterService } from '@/services/chapter.service';
import { artworkService, computeFileSha256 } from '@/services/artwork.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { scriptLineService, SceneDto, ScriptLineDto } from '@/services/scriptLine.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { PanelDto } from '@/types/pipeline';

// Mock data khi chạy trực tiếp hoặc trang mới chưa có kịch bản trên DB
const INITIAL_DEMO_PANELS: PanelBlockData[] = [
  {
    id: 'panel-1',
    panelNumber: 1,
    readingOrder: 1,
    x: 5,
    y: 4,
    width: 90,
    height: 28,
    scriptLines: [
      {
        id: 'line-1',
        lineOrder: 1,
        panelNumber: 1,
        stageDirection: 'Góc toàn cảnh cổng thành hoang tàn sau cơn bão cát. Khói bốc lên từ đài quan sát.',
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
  {
    id: 'panel-2',
    panelNumber: 2,
    readingOrder: 2,
    x: 5,
    y: 35,
    width: 90,
    height: 28,
    scriptLines: [
      {
        id: 'line-3',
        lineOrder: 3,
        panelNumber: 2,
        stageDirection: 'Cận cảnh bước chân của Minh Triết giẫm lên thanh đoản kiếm gãy vùi dưới cát.',
      },
    ],
  },
  {
    id: 'panel-3',
    panelNumber: 3,
    readingOrder: 3,
    x: 5,
    y: 66,
    width: 90,
    height: 30,
    scriptLines: [
      {
        id: 'line-4',
        lineOrder: 4,
        panelNumber: 3,
        characterName: 'Hoàng Anh',
        characterColor: '#3B82F6',
        dialogueText: 'Cẩn thận! Có dấu hiệu mai phục của đội thị vệ cấm thành phía trước!',
      },
    ],
  },
];

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

  // 1. Chế độ làm việc: [Tranh Toàn Trang] vs [Mẫu Khung & Ô Tranh]
  const [mode, setMode] = useState<WorkspaceMode>('full-page');

  // 2. Trạng thái điều hướng & Trang
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(18);
  const [selectedPanelNumber, setSelectedPanelNumber] = useState<number | null>(1);

  // 3. Trạng thái dữ liệu kịch bản & Panels
  const [sceneTitle, setSceneTitle] = useState('Phân cảnh 1: Cổng Thành Phía Nam');
  const [sceneSlugline, setSceneSlugline] = useState('NGOẠI · CỔNG THÀNH · SÁNG');
  const [panels, setPanels] = useState<PanelBlockData[]>(INITIAL_DEMO_PANELS);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>('preset-3-row');

  // 4. Trạng thái tranh vẽ toàn trang (Mode 1)
  const [fullPageArtwork, setFullPageArtwork] = useState<PageArtworkState>({
    previewUrl: null,
    version: 'v1',
  });

  // 5. Trạng thái nộp duyệt & Toast
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'info' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((title: string, desc: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // 6. Tính toán tiến độ hoàn thành (Progress Badge)
  const progressBadge = useMemo(() => {
    if (mode === 'full-page') {
      return fullPageArtwork.previewUrl
        ? { label: 'Bản vẽ toàn trang: Sẵn sàng', ready: true }
        : { label: 'Chưa nạp bản vẽ toàn trang', ready: false };
    }

    const total = panels.length;
    const readyCount = panels.filter((p) => Boolean(p.artwork?.previewUrl)).length;
    return {
      label: `${readyCount}/${total} Khung sẵn sàng`,
      ready: total > 0 && readyCount === total,
    };
  }, [mode, fullPageArtwork, panels]);

  // Handler: Tải ảnh toàn trang (Mode 1)
  const handleFullPageFileSelected = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setFullPageArtwork({
      file,
      previewUrl: objectUrl,
      version: 'v1',
      isUploaded: false,
    });
    showToast('Đã nạp bản vẽ', `Tệp "${file.name}" đã được tải vào trang ${currentPageNumber}`, 'success');
  };

  // Handler: Tải ảnh vào từng khung (Mode 2)
  const handleUploadPanelArtwork = (panelNumber: number, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPanels((prev) =>
      prev.map((p) => {
        if (p.panelNumber === panelNumber) {
          return {
            ...p,
            artwork: {
              panelNumber,
              file,
              previewUrl: objectUrl,
              version: 'v1',
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return p;
      })
    );
    setSelectedPanelNumber(panelNumber);
    showToast('Đã nạp tranh khung', `Ảnh đã nạp vào Khung #${panelNumber}`, 'success');
  };

  // Handler: Xoá ảnh khỏi khung
  const handleRemovePanelArtwork = (panelNumber: number) => {
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
  };

  // Handler: Áp dụng Mẫu Khung mới
  const handleApplyTemplate = (template: FramePresetTemplate) => {
    setActiveTemplateId(template.id);
    const newPanels: PanelBlockData[] = template.panels.map((p) => {
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
        scriptLines: existing?.scriptLines || [],
      };
    });
    setPanels(newPanels);
    setSelectedPanelNumber(1);
    showToast('Đã áp dụng mẫu khung', `Đã áp dụng mẫu "${template.name}" (${template.panelCount} khung)`, 'success');
  };

  // Handler: Đặt lại Mẫu Khung
  const handleResetTemplate = () => {
    setPanels([]);
    setActiveTemplateId(null);
    setSelectedPanelNumber(null);
    showToast('Đã đặt lại', 'Đã xoá cấu hình mẫu khung trên trang');
  };

  // Handler: Nộp duyệt bản thảo (Submit for Review)
  const handleSubmitForReview = async () => {
    if (!progressBadge.ready) {
      showToast(
        'Chưa thể nộp bản thảo',
        mode === 'full-page'
          ? 'Vui lòng nạp ảnh bản vẽ toàn trang trước khi nộp duyệt.'
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
      showToast('Nộp bản thảo thành công!', 'Bản thảo đã được gửi tới Producer & Biên tập viên xét duyệt.', 'success');
    } catch (err: any) {
      showToast('Lỗi khi nộp bản thảo', err?.message || 'Không thể kết nối máy chủ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid='artist-workspace-view'
      className='w-screen h-screen flex flex-col bg-[#FAF8F5] text-[#171717] overflow-hidden'
    >
      {/* ======================================================== */}
      {/* A. TOP BAR (COMPACT & FUNCTIONAL)                         */}
      {/* ======================================================== */}
      <header
        data-testid='workspace-top-bar'
        className='h-14 border-b border-[#E7E7E7] bg-white px-4 flex items-center justify-between shrink-0 select-none z-30'
      >
        {/* Left: Breadcrumb */}
        <div className='flex items-center gap-1.5 text-xs text-stone-600 font-medium truncate max-w-[380px]'>
          <button
            type='button'
            onClick={() => navigate(-1)}
            title='Quay lại'
            className='p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer mr-1'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <span className='text-stone-400'>Không gian</span>
          <ChevronRight className='w-3 h-3 text-stone-300' />
          <span className='font-semibold text-[#171717]'>Vương Triều Bóng Đêm</span>
          <ChevronRight className='w-3 h-3 text-stone-300' />
          <span className='text-stone-700'>Chương 12</span>
          <ChevronRight className='w-3 h-3 text-stone-300' />
          <span className='px-2 py-0.5 rounded bg-orange-50 text-[#F97316] font-bold font-mono text-[11px] border border-orange-200/60'>
            Trang {currentPageNumber} / {totalPages}
          </span>
        </div>

        {/* Center: Segmented Mode Switcher */}
        <div
          data-testid='workspace-mode-switcher'
          className='flex items-center bg-[#EBE7DF] p-1 rounded-xl text-xs font-semibold'
        >
          <button
            type='button'
            onClick={() => setMode('full-page')}
            data-testid='mode-full-page-btn'
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'full-page'
                ? 'bg-white text-[#F97316] shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileImage className='w-3.5 h-3.5' />
            <span>Tranh Toàn Trang</span>
          </button>

          <button
            type='button'
            onClick={() => setMode('panel-template')}
            data-testid='mode-panel-template-btn'
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'panel-template'
                ? 'bg-white text-[#F97316] shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutTemplate className='w-3.5 h-3.5' />
            <span>Mẫu Khung & Ô Tranh</span>
          </button>
        </div>

        {/* Right: Progress Badge & Submit for Review CTA */}
        <div className='flex items-center gap-3 shrink-0'>
          {/* Progress Badge */}
          <div
            data-testid='workspace-progress-badge'
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 border ${
              progressBadge.ready
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                progressBadge.ready ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
            />
            <span>{progressBadge.label}</span>
          </div>

          {/* Primary Action CTA */}
          <button
            type='button'
            onClick={handleSubmitForReview}
            disabled={isSubmitting}
            data-testid='submit-for-review-cta'
            className='px-4 py-2 rounded-lg bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                <span>Đang nộp...</span>
              </>
            ) : (
              <>
                <Send className='w-3.5 h-3.5' />
                <span>Nộp Duyệt Bản Thảo</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2-ZONE SPLIT ARCHITECTURE (35% Left / 65% Right)         */}
      {/* ======================================================== */}
      <main className='flex-1 flex min-h-0 relative overflow-hidden'>
        {/* B. Left Column (35% Width): Writer Script Reader */}
        <div className='w-[35%] max-w-[440px] min-w-[320px] h-full shrink-0'>
          <ScriptReaderColumn
            sceneTitle={sceneTitle}
            sceneSlugline={sceneSlugline}
            panels={panels}
            selectedPanelNumber={selectedPanelNumber}
            onSelectPanel={(num) => setSelectedPanelNumber(num)}
          />
        </div>

        {/* C. Right Column (65% Width): Workspace Canvas & Dropzone */}
        <div className='flex-1 h-full min-w-0 bg-[#EBE7DF] relative'>
          {mode === 'full-page' ? (
            <FullPageCanvas
              pageNumber={currentPageNumber}
              artworkState={fullPageArtwork}
              onFileSelected={handleFullPageFileSelected}
              onRemoveArtwork={() =>
                setFullPageArtwork({ previewUrl: null, version: 'v1' })
              }
            />
          ) : (
            <TemplatePanelCanvas
              panels={panels}
              selectedPanelNumber={selectedPanelNumber}
              activeTemplateId={activeTemplateId}
              onSelectPanel={(num) => setSelectedPanelNumber(num)}
              onApplyTemplate={handleApplyTemplate}
              onResetTemplate={handleResetTemplate}
              onUploadPanelArtwork={handleUploadPanelArtwork}
              onRemovePanelArtwork={handleRemovePanelArtwork}
            />
          )}
        </div>
      </main>

      {/* Toast Notification Notification */}
      {toastMessage && (
        <div
          data-testid='workspace-toast'
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-[#171717] text-white border-stone-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className='w-4 h-4 text-rose-400 shrink-0' />
          ) : (
            <Sparkles className='w-4 h-4 text-orange-400 shrink-0' />
          )}
          <div>
            <div className='font-bold'>{toastMessage.title}</div>
            <div className='text-stone-300 text-[11px]'>{toastMessage.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistWorkspaceView;
