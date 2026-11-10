/* Lucian UX/UI · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React, { useState } from 'react';
import {
  Eye,
  Layers,
  LayoutTemplate,
  ZoomIn,
  ZoomOut,
  PanelRightOpen,
  MoreHorizontal,
  RefreshCw,
  BookOpen,
  Plus,
  Settings,
  Trash2,
  ChevronDown,
  Check,
  Loader2,
  Lock,
} from 'lucide-react';
import { PageDto } from '@/services/page.service';
import { PipelineStageDto } from '@/services/pipeline.service';
import { PencilStageWorkspaceBar } from '../PencilStageWorkspaceBar';
import { InkStageWorkspaceBar, InkingNib, ScreenToneLpi } from '../InkStageWorkspaceBar';
import { LetteringStageWorkspaceBar } from '../LetteringStageWorkspaceBar';

interface ArtistBottomDockProps {
  selectedPage: PageDto | null;
  currentChapterId?: string | null;
  workBadge: { label: string; tone: string } | null;
  workStageName?: string | null;
  primaryCta: {
    testId: string;
    action: string;
    disabled?: boolean;
    reason?: string | null;
    title?: string;
    label: string;
    icon?: React.ReactNode;
  } | null;
  runPrimaryCta: (action: string) => void;
  startingAssignmentPanelId: string | null;
  viewStageId: string;
  stages: PipelineStageDto[];
  sortedStages: PipelineStageDto[];
  trueActiveStage: PipelineStageDto | null;
  myStageOnPage?: PipelineStageDto | string | null;
  stageLabel: (stage: PipelineStageDto | string | null | undefined) => string;
  handleSelectStageFilter: (stageId: string) => void;
  canEditPages: boolean;
  uploadMode: 'page' | 'panel';
  setUploadMode: (mode: 'page' | 'panel') => void;
  selectedPanelDetail: any;
  hasPanelOnlyAssignmentOnPage: boolean;
  setFrameTemplateModalOpen: (open: boolean) => void;
  layoutEdit?: boolean;
  onToggleLayoutEdit?: () => void;
  isCurrentPageCarvedOut?: boolean;
  pageArtUrl?: string | null;
  panelsLength?: number;
  onOpenAiAssist?: () => void;
  isPencilStage: boolean;
  isInkStage: boolean;
  isLetteringStage: boolean;
  storyboardOpacity: number;
  setStoryboardOpacity: (opacity: number) => void;
  showStoryboardOverlay: boolean;
  setShowStoryboardOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  hasStoryboard: boolean;
  bibleEntries: any[];
  selectedModelSheetId: string | null;
  setSelectedModelSheetId: (id: string | null) => void;
  sketchColor: 'blue' | 'graphite';
  setSketchColor: (color: 'blue' | 'graphite') => void;
  handleTriggerUploadPage: () => void;
  hasPencilArtwork: boolean;
  pencilArtworkVersion: number | null;
  uploadingPage: boolean;
  currentActiveStage: PipelineStageDto | null;
  handleStageHandoff: (stage: PipelineStageDto) => void;
  submittingStageHandoff: boolean;
  pencilUnderlayVisible: boolean;
  setPencilUnderlayVisible: React.Dispatch<React.SetStateAction<boolean>>;
  pencilUnderlayOpacity: number;
  setPencilUnderlayOpacity: (opacity: number) => void;
  hasPencilArt: boolean;
  selectedNib: InkingNib;
  setSelectedNib: (nib: InkingNib) => void;
  selectedLpi: ScreenToneLpi;
  setSelectedLpi: (lpi: ScreenToneLpi) => void;
  toneDensity: number;
  setToneDensity: (density: number) => void;
  safeZoneVisible: boolean;
  setSafeZoneVisible: React.Dispatch<React.SetStateAction<boolean>>;
  hasInkArtwork: boolean;
  inkArtworkVersion: number | null;
  readingFlowVisible: boolean;
  setReadingFlowVisible: (visible: boolean) => void;
  setAutoAssignModalOpen: (open: boolean) => void;
  activeTab: 'pages' | 'script' | 'queue';
  setActiveTab: React.Dispatch<React.SetStateAction<'pages' | 'script' | 'queue'>>;
  sceneLines: any[];
  letteringActiveTool: 'caption' | 'thought' | 'balloon' | 'sfx' | 'tail-edit';
  setLetteringActiveTool: React.Dispatch<React.SetStateAction<'caption' | 'thought' | 'balloon' | 'sfx' | 'tail-edit'>>;
  zoomScale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToScreen: () => void;
  isFitMode: boolean;
  isRightCollapsed: boolean;
  setIsRightCollapsed: (collapsed: boolean) => void;
  openDetails: () => void;
  loadPages: () => Promise<void>;
  loading: boolean;
  setSelectedDrawerPanelId: (panelId: string | null) => void;
  setBibleDrawerOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditWidthPx: (v: string) => void;
  setEditHeightPx: (v: string) => void;
  setEditDpi: (v: string) => void;
  setEditLayout: (v: string) => void;
  setSettingsModalOpen: (open: boolean) => void;
  handleDeletePage: (pageId: string) => void;
}

export const ArtistBottomDock: React.FC<ArtistBottomDockProps> = ({
  selectedPage,
  currentChapterId,
  workBadge,
  workStageName,
  primaryCta,
  runPrimaryCta,
  startingAssignmentPanelId,
  viewStageId,
  stages,
  sortedStages,
  trueActiveStage,
  myStageOnPage,
  stageLabel,
  handleSelectStageFilter,
  canEditPages,
  uploadMode,
  setUploadMode,
  selectedPanelDetail,
  hasPanelOnlyAssignmentOnPage,
  setFrameTemplateModalOpen,
  layoutEdit = false,
  onToggleLayoutEdit,
  isCurrentPageCarvedOut = false,
  pageArtUrl = null,
  panelsLength = 0,
  onOpenAiAssist,
  isPencilStage,
  isInkStage,
  isLetteringStage,
  storyboardOpacity,
  setStoryboardOpacity,
  showStoryboardOverlay,
  setShowStoryboardOverlay,
  hasStoryboard,
  bibleEntries,
  selectedModelSheetId,
  setSelectedModelSheetId,
  sketchColor,
  setSketchColor,
  handleTriggerUploadPage,
  hasPencilArtwork,
  pencilArtworkVersion,
  uploadingPage,
  currentActiveStage,
  handleStageHandoff,
  submittingStageHandoff,
  pencilUnderlayVisible,
  setPencilUnderlayVisible,
  pencilUnderlayOpacity,
  setPencilUnderlayOpacity,
  hasPencilArt,
  selectedNib,
  setSelectedNib,
  selectedLpi,
  setSelectedLpi,
  toneDensity,
  setToneDensity,
  safeZoneVisible,
  setSafeZoneVisible,
  hasInkArtwork,
  inkArtworkVersion,
  readingFlowVisible,
  setReadingFlowVisible,
  setAutoAssignModalOpen,
  activeTab,
  setActiveTab,
  sceneLines,
  letteringActiveTool,
  setLetteringActiveTool,
  zoomScale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleFitToScreen,
  isFitMode,
  isRightCollapsed,
  setIsRightCollapsed,
  openDetails,
  loadPages,
  loading,
  setSelectedDrawerPanelId,
  setBibleDrawerOpen,
  setCreateModalOpen,
  setEditWidthPx,
  setEditHeightPx,
  setEditDpi,
  setEditLayout,
  setSettingsModalOpen,
  handleDeletePage,
}) => {
  const [openMenu, setOpenMenu] = useState<'upload' | 'page' | null>(null);

  const toolbarBtn =
    'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed select-none';
  const toolbarIdle =
    'bg-[#FCFBF8] border border-[#D8D2C5] text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] active:bg-[#EAE5D9]';
  const toolbarOn =
    'bg-orange-50 border border-orange-300 text-[#C2410C] font-semibold';
  const menuItem =
    'w-full text-left px-3 py-1.5 text-xs text-[#1C1917] hover:bg-[#F3F0E9] flex items-center gap-2 cursor-pointer transition-colors';

  return (
    <div
      className='absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#FCFBF8]/95 backdrop-blur-md border border-[#D8D2C5] rounded-xl px-2.5 py-1.5 shadow-[0_8px_28px_-6px_rgba(40,30,20,0.22),0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-1.5 select-none shrink-0'
      role='toolbar'
      aria-label='Thanh công cụ bàn vẽ nổi'
      data-testid='artist-main-toolbar'
    >
      {/* CỤM 1 (BÊN TRÁI): TRẠNG THÁI & GATEWAY CTA */}
      <div className='flex items-center gap-1.5 shrink-0 min-w-0'>
        {/* Trạng thái phân công công việc của Artist */}
        {workBadge && (
          <span className='sr-only' data-testid='artist-work-status'>
            {workBadge.label}
          </span>
        )}

        {/* Primary CTA (Assignment Gateway: Bắt đầu vẽ / Tải tranh) */}
        {primaryCta && (
          <div className={primaryCta.testId === 'cta-start-work' ? 'flex items-center' : 'sr-only'}>
            <button
              type='button'
              onClick={() => runPrimaryCta(primaryCta.action)}
              disabled={primaryCta.disabled}
              title={primaryCta.reason ?? primaryCta.title}
              aria-describedby={primaryCta.reason ? 'artist-cta-reason' : undefined}
              data-testid={primaryCta.testId}
              className={`${toolbarBtn} h-7 text-xs px-2.5 ${
                primaryCta.disabled
                  ? ''
                  : 'bg-[#EA580C] hover:bg-[#C2410C] text-white border-[#EA580C]'
              } max-w-[12rem] flex items-center gap-1.5 font-bold`}
            >
              {startingAssignmentPanelId !== null && primaryCta.testId === 'cta-start-work' ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                primaryCta.icon
              )}
              <span className='truncate'>{primaryCta.label}</span>
            </button>
            {primaryCta.reason && (
              <span id='artist-cta-reason' className='sr-only'>
                {primaryCta.reason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CỤM 2 (Ở GIỮA): CHẾ ĐỘ HIỂN THỊ & CÔNG CỤ VẼ TRANG */}
      {selectedPage && (
        <div className='flex items-center gap-1.5 shrink-0'>
          <span className='w-px h-5 bg-[#D8D2C5]' aria-hidden='true' />

          {/* Chọn Layer Ảnh hiển thị */}
          <label
            className='flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-[#F3EFE6] px-2 py-0.5 rounded-lg border border-[#DDD6C8] h-7 cursor-pointer'
            title='Chỉ đổi ảnh đang xem trên canvas, không đổi công đoạn'
          >
            <Eye className='w-3.5 h-3.5 text-[#C2410C]' aria-hidden='true' />
            <span className='hidden 2xl:inline whitespace-nowrap text-[11px] font-medium'>
              Ảnh hiển thị:
            </span>
            <select
              value={viewStageId}
              onChange={(e) => handleSelectStageFilter(e.target.value)}
              data-testid='desk-stage-select'
              title='Chỉ đổi ảnh đang xem trên canvas, không đổi công đoạn công việc'
              className='h-6 max-w-[8rem] bg-white border border-[#D8D2C5] rounded px-1 font-semibold text-xs text-[#1C1917] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
            >
              <option value='AUTO'>
                Tự động{myStageOnPage ? ` (${stageLabel(myStageOnPage)})` : ''}
              </option>
              {stages.map((s) => {
                const sIdx = sortedStages.findIndex((st) => st.id === s.id);
                const activeIdx = sortedStages.findIndex((st) => st.id === trueActiveStage?.id);
                const isFutureStage = activeIdx >= 0 && sIdx > activeIdx;
                return (
                  <option key={s.id} value={s.id} disabled={isFutureStage}>
                    {s.stageOrder}. {s.name}
                    {s.isEnabled === false ? ' (đã tắt)' : ''}
                    {isFutureStage ? ' (chưa mở)' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          {/* Chế độ vẽ: Vẽ cả trang / Vẽ từng khung */}
          {canEditPages && (
            <div className='relative' data-menu-root>
              <button
                type='button'
                aria-haspopup='menu'
                aria-expanded={openMenu === 'upload'}
                onClick={() => setOpenMenu((m) => (m === 'upload' ? null : 'upload'))}
                data-testid='upload-menu-btn'
                aria-label={`Chế độ tải ảnh: ${uploadMode === 'page' ? 'cả trang' : 'từng khung'}`}
                title='Chọn chế độ tải ảnh: Tải cả trang liền mạch hoặc tải từng khung riêng biệt'
                className={`${toolbarBtn} ${toolbarIdle} h-7 text-xs px-2 flex items-center gap-1`}
              >
                <Layers className='w-3.5 h-3.5 text-[#C2410C]' />
                <span className='hidden md:inline font-medium text-xs'>
                  {uploadMode === 'page' ? 'Cả trang' : 'Từng khung'}
                </span>
                <ChevronDown className='w-3 h-3 text-[#57534E]' />
              </button>
              {openMenu === 'upload' && (
                <div
                  role='menu'
                  aria-label='Chế độ tải ảnh'
                  data-testid='upload-mode-toggle'
                  className='absolute left-0 bottom-full mb-2 w-64 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl py-1 z-50'
                >
                  {[
                    {
                      mode: 'panel' as const,
                      testId: 'mode-panel-slice',
                      title: 'Từng khung',
                      hint: selectedPanelDetail
                        ? `Tải cho Khung #${selectedPanelDetail.panelNumber} đang chọn`
                        : 'Chọn một khung trên trang để tải ảnh riêng',
                    },
                    ...(!hasPanelOnlyAssignmentOnPage
                      ? [
                          {
                            mode: 'page' as const,
                            testId: 'mode-full-page',
                            title: 'Cả trang',
                            hint: `Một ảnh cho cả Trang ${selectedPage.pageNumber}, có nhận diện khung & bóng thoại`,
                          },
                        ]
                      : []),
                  ].map((o) => (
                    <button
                      key={o.mode}
                      type='button'
                      role='menuitemradio'
                      aria-checked={uploadMode === o.mode}
                      data-testid={o.testId}
                      onClick={() => {
                        setUploadMode(o.mode);
                        setOpenMenu(null);
                      }}
                      className={menuItem}
                    >
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${uploadMode === o.mode ? 'text-[#C2410C]' : 'invisible'}`}
                      />
                      <span className='min-w-0'>
                        <span className='block font-semibold text-[#1C1917]'>{o.title}</span>
                        <span className='block text-[11px] text-[#57534E]'>{o.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nút Mẫu Khung */}
          {canEditPages && (
            <button
              type='button'
              onClick={() => setFrameTemplateModalOpen(true)}
              data-testid='toolbar-frame-template-btn'
              title='Áp dụng mẫu khung tranh dựng sẵn vào trang'
              className={`${toolbarBtn} ${toolbarIdle} h-7 text-xs px-2.5 flex items-center gap-1.5 cursor-pointer font-medium hover:bg-stone-100 hover:text-stone-900`}
            >
              <LayoutTemplate className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>Mẫu Khung</span>
            </button>
          )}

          {/* Nút Sửa bố cục */}
          {canEditPages && !pageArtUrl && panelsLength > 0 && (
            <button
              type='button'
              aria-pressed={layoutEdit}
              disabled={isCurrentPageCarvedOut}
              onClick={onToggleLayoutEdit}
              data-testid='toggle-layout-edit'
              className='sr-only'
            >
              <span>Sửa bố cục</span>
            </button>
          )}

          {/* Nút AI Sinh Mô Tả Vẽ */}
          {canEditPages && onOpenAiAssist && (
            <button
              type='button'
              onClick={onOpenAiAssist}
              data-testid='desk-open-ai-assist-btn'
              className='sr-only'
            >
              <span>Tạo mô tả vẽ (cả cảnh)</span>
            </button>
          )}
        </div>
      )}

      {/* CỤM 2.5: CÔNG CỤ THEO NGỮ CẢNH GIAI ĐOẠN HIỆN TẠI */}
      {currentChapterId && (
        <div className='flex items-center gap-1.5 shrink-0 px-1 border-x border-[#D8D2C5]/80'>
          {isPencilStage && (
            <PencilStageWorkspaceBar
              onlyUploadButton={true}
              storyboardOpacity={storyboardOpacity}
              onStoryboardOpacityChange={setStoryboardOpacity}
              showStoryboardOverlay={showStoryboardOverlay}
              onToggleStoryboardOverlay={() => setShowStoryboardOverlay((v) => !v)}
              hasStoryboard={hasStoryboard}
              bibleEntries={bibleEntries}
              selectedBibleEntryId={selectedModelSheetId}
              onSelectBibleEntry={setSelectedModelSheetId}
              sketchColor={sketchColor}
              onSketchColorChange={setSketchColor}
              onTriggerUpload={handleTriggerUploadPage}
              hasPencilArtwork={hasPencilArtwork}
              pencilArtworkVersion={pencilArtworkVersion}
              isUploading={uploadingPage}
              onHandoffToInk={() => currentActiveStage && handleStageHandoff(currentActiveStage)}
              isSubmitting={submittingStageHandoff}
            />
          )}

          {isInkStage && (
            <InkStageWorkspaceBar
              onlyUploadButton={true}
              pencilUnderlayVisible={pencilUnderlayVisible}
              onTogglePencilUnderlay={() => setPencilUnderlayVisible((v) => !v)}
              pencilUnderlayOpacity={pencilUnderlayOpacity}
              onPencilUnderlayOpacityChange={setPencilUnderlayOpacity}
              hasPencilArt={hasPencilArt}
              selectedNib={selectedNib}
              onSelectNib={setSelectedNib}
              selectedLpi={selectedLpi}
              onSelectLpi={setSelectedLpi}
              toneDensity={toneDensity}
              onToneDensityChange={setToneDensity}
              safeZoneVisible={safeZoneVisible}
              onToggleSafeZone={() => setSafeZoneVisible((v) => !v)}
              onTriggerUpload={handleTriggerUploadPage}
              hasInkArtwork={hasInkArtwork}
              inkArtworkVersion={inkArtworkVersion}
              isUploading={uploadingPage}
              onHandoffToLettering={() => currentActiveStage && handleStageHandoff(currentActiveStage)}
              isSubmitting={submittingStageHandoff}
            />
          )}

          {isLetteringStage && (
            <LetteringStageWorkspaceBar
              readingFlowVisible={readingFlowVisible}
              onToggleReadingFlow={() => setReadingFlowVisible(!readingFlowVisible)}
              onOpenAutoAssignModal={() => setAutoAssignModalOpen(true)}
              scriptDrawerOpen={activeTab === 'script'}
              onToggleScriptDrawer={() => setActiveTab(activeTab === 'script' ? 'pages' : 'script')}
              unplacedCount={sceneLines.filter((l) => !l.panelId).length}
              totalLetterableCount={sceneLines.length}
              activeTool={letteringActiveTool}
              onSelectTool={setLetteringActiveTool}
              onSubmitToGate2={() => currentActiveStage && handleStageHandoff(currentActiveStage)}
              isSubmitting={submittingStageHandoff}
            />
          )}
        </div>
      )}

      {/* CỤM 3: THU PHÓNG & THAO TÁC CANVAS */}
      <div className='flex items-center gap-1.5 shrink-0'>
        {selectedPage && (
          <div
            className='inline-flex items-center h-8 bg-[#F3F0E9] p-1 rounded-xl border border-[#D8D2C5] shrink-0'
            role='group'
            aria-label='Thu phóng'
          >
            <button
              type='button'
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.3}
              className='p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8] rounded-md cursor-pointer disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F97316]'
              title='Thu nhỏ'
              aria-label='Thu nhỏ'
            >
              <ZoomOut className='w-3 h-3' />
            </button>
            <button
              type='button'
              onClick={handleResetZoom}
              className='hidden 2xl:block px-1 text-[11px] font-mono font-bold text-[#1C1917] rounded hover:bg-[#FCFBF8] cursor-pointer min-w-[2.5rem] focus-visible:outline-2 focus-visible:outline-[#F97316]'
              title='Đặt lại 100%'
              aria-label={`Thu phóng ${Math.round(zoomScale * 100)}%, bấm để đặt lại 100%`}
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              type='button'
              onClick={handleZoomIn}
              disabled={zoomScale >= 2.5}
              className='p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8] rounded-md cursor-pointer disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F97316]'
              title='Phóng to'
              aria-label='Phóng to'
            >
              <ZoomIn className='w-3 h-3' />
            </button>
            <button
              type='button'
              onClick={handleFitToScreen}
              data-testid='zoom-fit-btn'
              aria-pressed={isFitMode}
              className={`px-1.5 py-0.5 text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                isFitMode
                  ? 'bg-white text-[#C2410C] shadow-2xs'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8]'
              }`}
              title='Vừa khung: nhìn trọn trang'
            >
              Vừa khung
            </button>
          </div>
        )}

        {/* Nút Chi tiết (Inspector) */}
        {selectedPage && (
          <button
            type='button'
            onClick={() => (isRightCollapsed ? openDetails() : setIsRightCollapsed(true))}
            aria-expanded={!isRightCollapsed}
            aria-controls='artist-details'
            data-testid='toggle-details'
            title={isRightCollapsed ? 'Mở bảng chi tiết & layer' : 'Đóng bảng chi tiết'}
            className={`${toolbarBtn} ${isRightCollapsed ? toolbarIdle : toolbarOn} h-7 px-2 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer`}
          >
            <PanelRightOpen className='w-3.5 h-3.5 text-stone-600' />
            <span className='text-xs font-semibold'>Chi tiết</span>
          </button>
        )}

        {/* Menu thao tác phụ Trang */}
        <div className='relative shrink-0' data-menu-root>
          <button
            type='button'
            aria-haspopup='menu'
            aria-expanded={openMenu === 'page'}
            aria-label='Thao tác trang'
            title='Thao tác trang'
            onClick={() => setOpenMenu((m) => (m === 'page' ? null : 'page'))}
            data-testid='page-menu-btn'
            className={`${toolbarBtn} ${toolbarIdle} w-7 h-7 px-0 justify-center rounded-lg`}
          >
            <MoreHorizontal className='w-3.5 h-3.5' />
          </button>
          {openMenu === 'page' && (
            <div
              role='menu'
              aria-label='Thao tác trang'
              className='absolute right-0 bottom-full mb-2 w-56 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl py-1 z-50'
            >
              <button
                type='button'
                role='menuitem'
                onClick={() => {
                  setOpenMenu(null);
                  void loadPages();
                }}
                disabled={loading}
                className={menuItem}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
              </button>
              <button
                type='button'
                role='menuitem'
                data-testid='artist-desk-bible-reference-btn'
                onClick={() => {
                  setOpenMenu(null);
                  setSelectedDrawerPanelId(selectedPanelDetail?.id || null);
                  setBibleDrawerOpen(true);
                }}
                className={menuItem}
              >
                <BookOpen className='w-3.5 h-3.5' /> Tham chiếu Series Bible
              </button>
              {canEditPages && (
                <>
                  <button
                    type='button'
                    role='menuitem'
                    onClick={() => {
                      setOpenMenu(null);
                      setCreateModalOpen(true);
                    }}
                    disabled={!currentChapterId}
                    className={menuItem}
                  >
                    <Plus className='w-3.5 h-3.5' /> Tạo trang mới
                  </button>
                  {selectedPage && (
                    <>
                      <button
                        type='button'
                        role='menuitem'
                        data-testid='page-settings-btn'
                        onClick={() => {
                          setOpenMenu(null);
                          setEditWidthPx(selectedPage.widthPx.toString());
                          setEditHeightPx(selectedPage.heightPx.toString());
                          setEditDpi(selectedPage.dpi.toString());
                          setEditLayout(selectedPage.layoutFormat);
                          setSettingsModalOpen(true);
                        }}
                        className={menuItem}
                      >
                        <Settings className='w-3.5 h-3.5' /> Cài đặt trang
                      </button>
                      <div className='my-1 border-t border-[#D8D2C5]' />
                      <button
                        type='button'
                        role='menuitem'
                        onClick={() => {
                          setOpenMenu(null);
                          handleDeletePage(selectedPage.id);
                        }}
                        className={`${menuItem} text-rose-700 hover:bg-rose-50`}
                      >
                        <Trash2 className='w-3.5 h-3.5' /> Xóa Trang {selectedPage.pageNumber}…
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
