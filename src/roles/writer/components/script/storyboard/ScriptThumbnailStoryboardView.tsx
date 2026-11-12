// src/roles/writer/components/script/storyboard/ScriptThumbnailStoryboardView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  LayoutTemplate,
  FileText,
  Columns,
  Grid,
  Plus,
  RefreshCw,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  X,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { StoryboardPage, StoryboardPanel } from './scriptThumbnail.types';
import {
  SAMPLE_SCRIPT_TEXT,
  parseScriptToStoryboard,
  serializeStoryboardToScript,
  scenesToStoryboardPages,
  generateId,
} from './scriptThumbnailParser';
import { PanelThumbnailCard } from './PanelThumbnailCard';
import { SceneDetailDto } from '@/services/scriptLine.service';

interface ScriptThumbnailStoryboardViewProps {
  scenes?: SceneDetailDto[];
  canEdit?: boolean;
  getSpeakerName?: (id?: string | null) => string | null;
  onShowToast?: (title: string, desc: string) => void;
}

export const ScriptThumbnailStoryboardView: React.FC<ScriptThumbnailStoryboardViewProps> = ({
  scenes = [],
  canEdit = true,
  getSpeakerName,
  onShowToast,
}) => {
  // Chế độ hiển thị: Song song (Split) | Lưới Panels (Grid) | Văn bản (Script)
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'script'>('split');

  // Khởi tạo trạng thái Storyboard từ Scenes hiện có hoặc Mẫu kịch bản
  const [pages, setPages] = useState<StoryboardPage[]>(() => {
    if (scenes && scenes.length > 0) {
      return scenesToStoryboardPages(scenes, getSpeakerName);
    }
    return parseScriptToStoryboard(SAMPLE_SCRIPT_TEXT);
  });

  // Văn bản kịch bản thô (Raw script text)
  const [rawText, setRawText] = useState<string>(() => serializeStoryboardToScript(pages));

  // Lightbox xem trước ảnh thumbnail phóng to
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Tính toán thống kê độ phủ Thumbnail (Coverage metrics)
  const stats = useMemo(() => {
    let totalPanels = 0;
    let panelsWithThumbnails = 0;
    let totalDialogues = 0;

    pages.forEach((page) => {
      totalPanels += page.panels.length;
      page.panels.forEach((panel) => {
        if (panel.thumbnailUrl) panelsWithThumbnails++;
        totalDialogues += panel.dialogues.length;
      });
    });

    const percent = totalPanels > 0 ? Math.round((panelsWithThumbnails / totalPanels) * 100) : 0;
    return {
      totalPages: pages.length,
      totalPanels,
      panelsWithThumbnails,
      totalDialogues,
      percent,
    };
  }, [pages]);

  // Cập nhật một Panel cụ thể trong cây phân trang
  const handleUpdatePanel = useCallback((pageId: string, updatedPanel: StoryboardPanel) => {
    setPages((prevPages) => {
      const nextPages = prevPages.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          panels: page.panels.map((p) => (p.id === updatedPanel.id ? updatedPanel : p)),
        };
      });
      // Cập nhật lại văn bản kịch bản phản ánh thay đổi
      setRawText(serializeStoryboardToScript(nextPages));
      return nextPages;
    });
  }, []);

  // Xoá một Panel
  const handleDeletePanel = useCallback(
    (pageId: string, panelId: string) => {
      setPages((prevPages) => {
        const nextPages = prevPages.map((page) => {
          if (page.id !== pageId) return page;
          return {
            ...page,
            panels: page.panels.filter((p) => p.id !== panelId),
          };
        });
        setRawText(serializeStoryboardToScript(nextPages));
        return nextPages;
      });
      onShowToast?.('Đã xoá panel', 'Khung panel đã được gỡ bỏ khỏi trang.');
    },
    [onShowToast],
  );

  // Thêm Panel mới vào trang
  const handleAddPanelToPage = (pageId: string) => {
    setPages((prevPages) => {
      const nextPages = prevPages.map((page) => {
        if (page.id !== pageId) return page;
        const newPanelNum = page.panels.length + 1;
        const newPanel: StoryboardPanel = {
          id: generateId(),
          panelKey: `${page.pageNumber}.${newPanelNum}`,
          panelNumber: newPanelNum,
          readingOrder: newPanelNum,
          dialogues: [],
        };
        return {
          ...page,
          panels: [...page.panels, newPanel],
        };
      });
      setRawText(serializeStoryboardToScript(nextPages));
      return nextPages;
    });
    onShowToast?.('Đã thêm panel', 'Đã thêm khung panel mới vào trang.');
  };

  // Thêm Trang mới
  const handleAddPage = () => {
    setPages((prevPages) => {
      const nextNum = prevPages.length + 1;
      const newPage: StoryboardPage = {
        id: generateId(),
        pageNumber: nextNum,
        panels: [
          {
            id: generateId(),
            panelKey: `${nextNum}.1`,
            panelNumber: 1,
            readingOrder: 1,
            dialogues: [],
          },
        ],
      };
      const nextPages = [...prevPages, newPage];
      setRawText(serializeStoryboardToScript(nextPages));
      return nextPages;
    });
    onShowToast?.('Đã tạo trang mới', `Đã thêm Trang ${pages.length + 1} vào storyboard.`);
  };

  // Xoá Trang
  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      onShowToast?.('Cảnh báo', 'Storyboard cần duy trì tối thiểu 1 trang.');
      return;
    }
    setPages((prevPages) => {
      const nextPages = prevPages.filter((p) => p.id !== pageId);
      setRawText(serializeStoryboardToScript(nextPages));
      return nextPages;
    });
    onShowToast?.('Đã xoá trang', 'Trang đã được gỡ bỏ.');
  };

  // Áp dụng văn bản kịch bản sang các panel
  const handleApplyScriptText = () => {
    const parsed = parseScriptToStoryboard(rawText);
    if (parsed.length === 0) {
      onShowToast?.('Cảnh báo', 'Kịch bản trống hoặc cú pháp chưa đúng định dạng.');
      return;
    }

    // Bảo tồn các thumbnail đã chèn nếu panelKey trùng nhau
    const existingThumbs = new Map<
      string,
      { url: string | null; name: string | null; file: File | null }
    >();
    pages.forEach((p) => {
      p.panels.forEach((pn) => {
        if (pn.thumbnailUrl) {
          existingThumbs.set(pn.panelKey, {
            url: pn.thumbnailUrl,
            name: pn.thumbnailName || null,
            file: pn.thumbnailFile || null,
          });
        }
      });
    });

    const merged = parsed.map((p) => ({
      ...p,
      panels: p.panels.map((pn) => {
        const thumb = existingThumbs.get(pn.panelKey);
        if (thumb) {
          return {
            ...pn,
            thumbnailUrl: thumb.url,
            thumbnailName: thumb.name,
            thumbnailFile: thumb.file,
          };
        }
        return pn;
      }),
    }));

    setPages(merged);
    onShowToast?.(
      'Đã đồng bộ kịch bản',
      `Đã phân giải ${merged.length} trang và ${stats.totalPanels} panel.`,
    );
  };

  // Nạp kịch bản mẫu
  const handleLoadSample = () => {
    setRawText(SAMPLE_SCRIPT_TEXT);
    const parsed = parseScriptToStoryboard(SAMPLE_SCRIPT_TEXT);
    setPages(parsed);
    onShowToast?.('Đã nạp kịch bản mẫu', 'Cấu trúc mẫu Trang 1, #panel 1.1, @nhanvat đã được nạp.');
  };

  // Đồng bộ lại từ các phân cảnh CSDL hiện tại
  const handleSyncFromScenes = () => {
    if (!scenes || scenes.length === 0) {
      onShowToast?.('Thông báo', 'Chương hiện tại chưa có phân cảnh nào.');
      return;
    }
    const converted = scenesToStoryboardPages(scenes, getSpeakerName);
    setPages(converted);
    setRawText(serializeStoryboardToScript(converted));
    onShowToast?.('Đồng bộ thành công', 'Đã nạp dữ liệu từ các cảnh hiện tại của chương.');
  };

  // Sao chép kịch bản vào clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(rawText);
    onShowToast?.('Đã sao chép', 'Nội dung kịch bản đã được lưu vào clipboard.');
  };

  return (
    <div className='flex flex-col rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] shadow-xs overflow-hidden'>
      {/* 1. Header Toolbar & Tiến độ phủ Thumbnail (Script Coverage Bar) */}
      <div className='flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#EBE7DF] bg-[#F7F5EE]/80'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs'>
              <LayoutTemplate className='w-4 h-4' />
            </span>
            <h2 className='text-base font-bold text-[#1C1917] font-serif'>
              Dàn Khung & Chèn Thumbnail Kịch Bản
            </h2>
            <span className='px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-mono font-bold'>
              Cú pháp: Trang N &bull; #panel X.Y &bull; @nhanvat: thoại
            </span>
          </div>

          <p className='text-xs text-[#57534E]'>
            Trích xuất bố cục phân khung từ kịch bản phân cảnh và gắn bản vẽ phác thảo (thumbnail
            storyboard) cho từng panel.
          </p>
        </div>

        {/* Thanh công cụ chuyển chế độ xem */}
        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex items-center bg-white p-0.5 rounded-xl border border-gray-200 shadow-2xs'>
            <button
              type='button'
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title='Xem song song kịch bản và khung thumbnail'
            >
              <Columns className='w-3.5 h-3.5' />
              <span>Song song</span>
            </button>
            <button
              type='button'
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title='Xem toàn bộ lưới panel'
            >
              <Grid className='w-3.5 h-3.5' />
              <span>Lưới Panels</span>
            </button>
            <button
              type='button'
              onClick={() => setViewMode('script')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'script'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title='Soạn thảo văn bản kịch bản'
            >
              <FileText className='w-3.5 h-3.5' />
              <span>Kịch bản</span>
            </button>
          </div>

          {canEdit && (
            <button
              type='button'
              onClick={handleAddPage}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-colors cursor-pointer'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>+ Thêm Trang</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thống kê Tiến độ (Script Coverage Bar: Tỷ lệ phủ Thumbnail) */}
      <div className='px-6 py-3 bg-white border-b border-[#EBE7DF] flex flex-wrap items-center justify-between gap-4 text-xs font-mono'>
        <div className='flex items-center gap-6 flex-wrap'>
          <div>
            <span className='text-gray-500'>Tổng trang:</span>{' '}
            <strong className='text-gray-900 font-bold'>{stats.totalPages}</strong>
          </div>
          <div>
            <span className='text-gray-500'>Tổng panel:</span>{' '}
            <strong className='text-gray-900 font-bold'>{stats.totalPanels}</strong>
          </div>
          <div>
            <span className='text-gray-500'>Đã gắn thumbnail:</span>{' '}
            <strong className='text-emerald-700 font-bold'>
              {stats.panelsWithThumbnails}/{stats.totalPanels} ({stats.percent}%)
            </strong>
          </div>
          <div>
            <span className='text-gray-500'>Tổng dòng thoại:</span>{' '}
            <strong className='text-amber-800 font-bold'>{stats.totalDialogues}</strong>
          </div>
        </div>

        {/* Thanh progress bar trực quan */}
        <div className='flex items-center gap-3 w-full sm:w-64'>
          <div className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden border border-gray-200'>
            <div
              className={`h-full transition-all duration-300 ${
                stats.percent === 100
                  ? 'bg-emerald-500'
                  : stats.percent > 50
                    ? 'bg-amber-500'
                    : 'bg-orange-500'
              }`}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <span className='text-xs font-bold text-gray-700 shrink-0'>{stats.percent}%</span>
        </div>
      </div>

      {/* 3. Vùng làm việc chính (Workspace Layout) */}
      <div className='flex-1 flex flex-col md:flex-row min-h-[650px] overflow-hidden'>
        {/* CỘT TRÁI: Soạn thảo kịch bản văn bản (Nếu ở chế độ split hoặc script) */}
        {(viewMode === 'split' || viewMode === 'script') && (
          <div
            className={`border-b md:border-b-0 md:border-r border-[#EBE7DF] bg-[#FCFBF8] flex flex-col ${
              viewMode === 'script' ? 'w-full' : 'w-full md:w-[420px] lg:w-[460px]'
            }`}
          >
            <div className='flex items-center justify-between px-4 py-2.5 bg-[#F7F5EE] border-b border-[#EBE7DF] text-xs font-semibold text-gray-700'>
              <span className='flex items-center gap-1.5'>
                <FileText className='w-3.5 h-3.5 text-amber-700' /> Kịch bản nguồn (Script Text)
              </span>

              <div className='flex items-center gap-1.5'>
                <button
                  type='button'
                  onClick={handleLoadSample}
                  className='px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 rounded cursor-pointer'
                  title='Nạp cấu trúc script mẫu'
                >
                  Kịch bản mẫu
                </button>
                <button
                  type='button'
                  onClick={handleSyncFromScenes}
                  className='px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 rounded cursor-pointer'
                  title='Đồng bộ từ các cảnh hiện tại'
                >
                  <RefreshCw className='w-3 h-3 inline mr-1' />
                  Nạp từ Cảnh
                </button>
                <button
                  type='button'
                  onClick={handleCopyScript}
                  className='p-1 text-gray-500 hover:text-gray-800 rounded cursor-pointer'
                  title='Sao chép kịch bản'
                >
                  <Copy className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>

            {/* Trình soạn thảo văn bản */}
            <div className='flex-1 p-3 flex flex-col'>
              <textarea
                value={rawText}
                disabled={!canEdit}
                onChange={(e) => setRawText(e.target.value)}
                placeholder='Nhập kịch bản theo cú pháp:\nTrang 1\n#panel 1.1\n@nhanvat: loi thoại\n#panel 1.2...'
                className='flex-1 w-full p-3 font-mono text-xs leading-relaxed text-gray-900 bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 custom-scrollbar disabled:opacity-60'
              />

              {canEdit && (
                <div className='mt-3 flex items-center justify-between gap-2'>
                  <span className='text-[11px] text-gray-400 font-mono'>
                    Hỗ trợ #panel và @nhanvat
                  </span>
                  <button
                    type='button'
                    onClick={handleApplyScriptText}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-colors cursor-pointer'
                  >
                    <ArrowRight className='w-3.5 h-3.5' />
                    <span>Áp dụng vào Lưới Panel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CỘT PHẢI: Lưới trực quan các Trang & Panel kèm chèn Thumbnail */}
        {(viewMode === 'split' || viewMode === 'grid') && (
          <div className='flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAF8F5] space-y-8 custom-scrollbar'>
            {pages.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-20 text-center'>
                <LayoutTemplate className='w-12 h-12 text-gray-300 mb-3' />
                <h3 className='text-sm font-bold text-gray-700'>Chưa có trang kịch bản nào</h3>
                <p className='text-xs text-gray-500 max-w-sm mt-1'>
                  Nhập kịch bản bên trái hoặc bấm &quot;Kịch bản mẫu&quot; để tự động tạo cấu trúc
                  trang và khung tranh.
                </p>
                <button
                  type='button'
                  onClick={handleLoadSample}
                  className='mt-4 px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 cursor-pointer'
                >
                  Nạp kịch bản mẫu
                </button>
              </div>
            ) : (
              pages.map((page) => (
                <div
                  key={page.id}
                  className='rounded-2xl border border-[#D8D2C5] bg-white shadow-soft-sm overflow-hidden'
                >
                  {/* Tiêu đề Trang (Trang 1, Trang 2...) */}
                  <div className='flex items-center justify-between px-5 py-3 bg-[#F7F5EE] border-b border-[#EBE7DF]'>
                    <div className='flex items-center gap-2'>
                      <span className='px-3 py-1 rounded-lg bg-amber-700 text-white font-serif font-bold text-xs shadow-2xs'>
                        TRANG {page.pageNumber}
                      </span>
                      <span className='text-xs text-gray-500 font-mono'>
                        {page.panels.length} khung tranh (panels)
                      </span>
                    </div>

                    {canEdit && (
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => handleAddPanelToPage(page.id)}
                          className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          <span>+ Thêm Panel</span>
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeletePage(page.id)}
                          className='p-1 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer'
                          title='Xoá trang này'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lưới các Panel trong trang */}
                  <div className='p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5'>
                    {page.panels.map((panel) => (
                      <PanelThumbnailCard
                        key={panel.id}
                        panel={panel}
                        canEdit={canEdit}
                        onUpdatePanel={(updated) => handleUpdatePanel(page.id, updated)}
                        onDeletePanel={(panelId) => handleDeletePanel(page.id, panelId)}
                        onPreviewImage={(url, title) => setLightboxImage({ url, title })}
                        onShowToast={onShowToast}
                      />
                    ))}

                    {/* Thẻ tạo nhanh panel */}
                    {canEdit && (
                      <button
                        type='button'
                        onClick={() => handleAddPanelToPage(page.id)}
                        className='border-2 border-dashed border-[#D8D2C5] hover:border-amber-500 rounded-2xl min-h-[300px] flex flex-col items-center justify-center p-6 text-gray-400 hover:text-amber-700 hover:bg-amber-50/30 transition-all cursor-pointer group'
                      >
                        <div className='w-12 h-12 rounded-full bg-gray-100 group-hover:bg-amber-100 flex items-center justify-center mb-2 transition-colors'>
                          <Plus className='w-6 h-6 text-gray-500 group-hover:text-amber-700' />
                        </div>
                        <span className='text-xs font-bold font-serif'>
                          + Thêm #panel {page.pageNumber}.{page.panels.length + 1}
                        </span>
                        <span className='text-[11px] text-gray-400 mt-1'>
                          Tạo khung tranh mới trong Trang {page.pageNumber}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Lightbox Phóng to xem ảnh Thumbnail */}
      {lightboxImage && (
        <div
          className='fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4'
          onClick={() => setLightboxImage(null)}
        >
          <div
            className='relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between px-4 py-3 bg-neutral-900 text-white border-b border-neutral-800'>
              <span className='text-xs font-mono font-bold'>{lightboxImage.title}</span>
              <button
                type='button'
                onClick={() => setLightboxImage(null)}
                className='p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='flex-1 overflow-auto flex items-center justify-center p-2 bg-neutral-950'>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className='max-h-[80vh] w-auto object-contain rounded-lg shadow-lg'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
