import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Settings,
  UploadCloud,
  FileImage,
  RefreshCw,
  CheckCircle2,
  X,
  Maximize2,
  Layout,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { pageService, PageDto, PageDetailDto, MOCK_PAGES, DEFAULT_CHAPTER_ID } from '../../services/page.service';

export const ArtistDeskView: React.FC = () => {
  const [pages, setPages] = useState<PageDto[]>(MOCK_PAGES);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(MOCK_PAGES[0]);
  const [pageDetail, setPageDetail] = useState<PageDetailDto | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPageNumber, setNewPageNumber] = useState(4);
  const [newLayoutFormat, setNewLayoutFormat] = useState('StandardPage');
  const [newWidthPx, setNewWidthPx] = useState('1200');
  const [newHeightPx, setNewHeightPx] = useState('1800');
  const [newDpi, setNewDpi] = useState('600');

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editWidthPx, setEditWidthPx] = useState('1200');
  const [editHeightPx, setEditHeightPx] = useState('1800');
  const [editDpi, setEditDpi] = useState('600');
  const [editLayout, setEditLayout] = useState('StandardPage');

  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPages = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await pageService.getPagesByChapter(DEFAULT_CHAPTER_ID);
      if (list && list.length > 0) {
        setPages(list);
        const sel = list.find((p) => p.id === selectedPage?.id) || list[0];
        setSelectedPage(sel);
        const detail = await pageService.getPageById(sel.id);
        setPageDetail(detail);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPage?.id]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSelectPage = async (p: PageDto) => {
    setSelectedPage(p);
    try {
      const detail = await pageService.getPageById(p.id);
      setPageDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await pageService.createPage(DEFAULT_CHAPTER_ID, {
        pageNumber: newPageNumber,
        layoutFormat: newLayoutFormat,
        widthPx: parseInt(newWidthPx, 10),
        heightPx: parseInt(newHeightPx, 10),
        dpi: parseInt(newDpi, 10),
      });
      setPages((prev) => [...prev, created]);
      setSelectedPage(created);
      setCreateModalOpen(false);
      showToast(
        'Tạo trang thành công',
        `Đã tạo Trang ${created.pageNumber} (${created.layoutFormat} - ${created.dpi} DPI).`,
      );
    } catch (err: any) {
      showToast('Lỗi tạo trang', err.message);
    }
  };

  const handleUpdateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    try {
      await pageService.updateCanvasSettings(selectedPage.id, {
        widthPx: parseInt(editWidthPx, 10),
        heightPx: parseInt(editHeightPx, 10),
        dpi: parseInt(editDpi, 10),
        layoutFormat: editLayout,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPage.id
            ? {
                ...p,
                widthPx: parseInt(editWidthPx, 10),
                heightPx: parseInt(editHeightPx, 10),
                dpi: parseInt(editDpi, 10),
                layoutFormat: editLayout,
              }
            : p,
        ),
      );
      setSettingsModalOpen(false);
      showToast('Cập nhật Canvas', 'Đã lưu cài đặt kích thước và DPI khổ giấy.');
    } catch (err: any) {
      showToast('Lỗi', err.message);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa trang này khỏi Chapter?')) return;
    try {
      await pageService.deletePage(pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (selectedPage?.id === pageId) {
        setSelectedPage(remaining[0] || null);
      }
      showToast('Đã xóa trang', 'Trang đã được gỡ khỏi chapter.');
    } catch (err: any) {
      showToast('Lỗi', err.message);
    }
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Toast */}
      {toast && (
        <div className='fixed top-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toast.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{toast.desc}</div>
          </div>
          <button onClick={() => setToast(null)} className='ml-2 text-[#737373] hover:text-white'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold'>
              ARTIST // PAGES DESK
            </span>
            <span className='text-xs text-[#888888] font-mono'>
              API: <code>/api/chapters/&#123;id&#125;/pages</code> &amp;{' '}
              <code>/api/pages/&#123;id&#125;</code>
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Genga &amp; Manga Pages Desk
          </h1>
          <p className='text-xs text-[#737373]'>
            Bàn vẽ và điều phối trang truyện của Họa sĩ: Quản lý kích thước canvas, khổ in chuẩn 600
            DPI, vẽ phác thảo và tải bản thảo lên hệ thống lưu trữ Marten Event Store.
          </p>
        </div>

        <div className='flex items-center gap-2.5 shrink-0'>
          <button
            onClick={loadPages}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Tạo Trang Mới</span>
          </button>
        </div>
      </div>

      {/* Pages Thumbnails Carousel / Strip */}
      <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-3'>
        <div className='flex items-center justify-between text-xs font-bold text-[#171717]'>
          <span className='flex items-center gap-2'>
            <Layout className='w-4 h-4 text-blue-600' />
            <span>Danh Sách Trang Bản Thảo (Chapter 5)</span>
          </span>
          <span className='font-mono text-[11px] text-[#888888]'>
            Tổng cộng: {pages.length} trang
          </span>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          {pages.map((p) => {
            const isSel = selectedPage?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPage(p)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-center relative ${
                  isSel
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/30'
                    : 'border-[#E7E7E7] bg-[#FAF8F5] hover:bg-white hover:border-blue-400'
                }`}
              >
                <div className='aspect-[2/3] bg-white border border-[#E7E7E7] rounded-lg flex flex-col items-center justify-center p-2 mb-2 relative overflow-hidden group shadow-2xs'>
                  <FileImage className='w-8 h-8 text-blue-400 mb-1' />
                  <span className='text-[10px] font-mono text-[#888888]'>
                    {p.widthPx}x{p.heightPx}
                  </span>
                  <span className='text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded mt-1'>
                    {p.dpi} DPI
                  </span>
                </div>
                <div className='text-xs font-bold text-[#171717]'>Trang {p.pageNumber}</div>
                <div className='text-[10px] text-[#888888] font-mono truncate'>
                  {p.layoutFormat}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Page Workbench & Canvas Specs */}
      {selectedPage && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Canvas Preview Simulation */}
          <div className='lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
                  <Layers className='w-4 h-4 text-blue-600' />
                  <span>Trang {selectedPage.pageNumber} — Genga Artwork Stage</span>
                </h3>
                <span className='text-[11px] font-mono text-[#888888]'>
                  Khổ: {selectedPage.widthPx} x {selectedPage.heightPx} px • {selectedPage.dpi} DPI
                  (B5 Tankōbon)
                </span>
              </div>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() => {
                    setEditWidthPx(selectedPage.widthPx.toString());
                    setEditHeightPx(selectedPage.heightPx.toString());
                    setEditDpi(selectedPage.dpi.toString());
                    setEditLayout(selectedPage.layoutFormat);
                    setSettingsModalOpen(true);
                  }}
                  className='px-2.5 py-1 text-xs font-semibold text-[#555555] hover:text-[#171717] bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg flex items-center gap-1 cursor-pointer'
                >
                  <Settings className='w-3 h-3' />
                  <span>Cài Đặt Canvas</span>
                </button>
                <button
                  onClick={() => handleDeletePage(selectedPage.id)}
                  className='p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer'
                  title='Xóa trang'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>

            {/* Canvas Mock Area */}
            <div className='bg-[#F8F6F0] rounded-xl border border-dashed border-[#CCCCCC] p-8 flex flex-col items-center justify-center min-h-[350px] relative'>
              <div
                className='bg-white shadow-lg border border-[#E7E7E7] rounded p-6 flex flex-col items-center justify-center transition-all'
                style={{
                  width: '280px',
                  height: '400px',
                }}
              >
                <div className='border-2 border-dashed border-blue-200 w-full h-full rounded flex flex-col items-center justify-center text-center p-4 space-y-2'>
                  <UploadCloud className='w-10 h-10 text-blue-500 animate-bounce' />
                  <div className='text-xs font-bold text-[#171717]'>
                    Tải Lên Bản Vẽ Genga (600 DPI)
                  </div>
                  <p className='text-[10px] text-[#888888]'>
                    Kéo thả tệp Clip Studio .clip, PSD hoặc TIFF vào đây
                  </p>
                  <button className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer'>
                    Chọn Tệp Bản Thảo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Info: Marten Event Store Stream Info */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2 border-b border-[#E7E7E7] pb-3'>
              <Sparkles className='w-4 h-4 text-blue-600' />
              <span>Event Store &amp; Page Metadata</span>
            </h3>

            <div className='space-y-3 text-xs'>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Page Stream ID
                </span>
                <span className='font-mono font-medium text-[#171717] select-all'>
                  {selectedPage.id}
                </span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Định dạng bố cục
                </span>
                <span className='font-semibold text-[#171717]'>{selectedPage.layoutFormat}</span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Độ phân giải DPI
                </span>
                <span className='font-mono text-blue-600 font-bold'>
                  {selectedPage.dpi} DPI (Print-Ready)
                </span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Kích thước điểm ảnh
                </span>
                <span className='font-mono text-[#171717]'>
                  {selectedPage.widthPx} × {selectedPage.heightPx} px
                </span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Phiên bản Marten Stream
                </span>
                <span className='font-mono text-emerald-600 font-semibold'>
                  v{pageDetail?.version || 1} (Rebuilt from append-only stream)
                </span>
              </div>
            </div>

            <div className='p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-[11px] text-[#555555] space-y-1 mt-4'>
              <div className='font-semibold text-blue-900'>Mô hình cấu trúc Manga</div>
              <p>
                Trang truyện được gắn liền với Stream ID trên Marten Event Store. Mọi thao tác vẽ,
                thêm khung tranh và bóng thoại đều được lưu trữ dạng event log không thể ghi đè.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Page */}
      {createModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Tạo Trang Truyện Mới</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className='space-y-3 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Số thứ tự trang (Page Number)
                </label>
                <input
                  type='number'
                  value={newPageNumber}
                  onChange={(e) => setNewPageNumber(parseInt(e.target.value, 10))}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  required
                />
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Kiểu bố cục (Layout Format)
                </label>
                <select
                  value={newLayoutFormat}
                  onChange={(e) => setNewLayoutFormat(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='StandardPage'>StandardPage (Trang đơn tiêu chuẩn)</option>
                  <option value='SpreadLeft'>SpreadLeft (Trang đôi - Nửa trái)</option>
                  <option value='SpreadRight'>SpreadRight (Trang đôi - Nửa phải)</option>
                  <option value='WebtoonScroll'>WebtoonScroll (Cuộn dọc)</option>
                </select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={newWidthPx}
                    onChange={(e) => setNewWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={newHeightPx}
                    onChange={(e) => setNewHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Độ phân giải DPI</label>
                <select
                  value={newDpi}
                  onChange={(e) => setNewDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='300'>300 DPI (Web &amp; Digital Preview)</option>
                  <option value='600'>600 DPI (B5 Tankōbon Print Standard)</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold'
                >
                  Tạo Trang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Canvas Settings */}
      {settingsModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Cập Nhật Thông Số Canvas Trang</h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleUpdateCanvas} className='space-y-3 text-xs'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={editWidthPx}
                    onChange={(e) => setEditWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={editHeightPx}
                    onChange={(e) => setEditHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Độ phân giải DPI</label>
                <select
                  value={editDpi}
                  onChange={(e) => setEditDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='300'>300 DPI</option>
                  <option value='600'>600 DPI</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setSettingsModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold'
                >
                  Lưu Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
