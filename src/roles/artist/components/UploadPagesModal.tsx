import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Layers,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PageDto, pageService } from '@/services/page.service';
import { artworkService, computeFileSha256 } from '@/services/artwork.service';

interface UploadPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  selectedPage: PageDto | null;
  pages: PageDto[];
  defaultStageId?: string;
  defaultTab?: 'single' | 'bulk';
  onSuccess: (targetPageId?: string) => Promise<void> | void;
  showToast: (title: string, message: string) => void;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 1800 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1200, height: 1800 });
    };
    img.src = url;
  });
}

export const UploadPagesModal: React.FC<UploadPagesModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  selectedPage,
  pages,
  defaultStageId,
  defaultTab = 'single',
  onSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(defaultTab);

  // Single page upload state
  const [singleFile, setSingleFile] = useState<StagedFile | null>(null);
  const [singleTargetMode, setSingleTargetMode] = useState<'current' | 'new'>(
    selectedPage ? 'current' : 'new',
  );
  const [isSingleUploading, setIsSingleUploading] = useState(false);
  const singleInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<StagedFile[]>([]);
  const [bulkTargetMode, setBulkTargetMode] = useState<'append' | 'replaceFromStart'>('append');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; message: string } | null>(
    null,
  );
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Drag states
  const [isDraggingSingle, setIsDraggingSingle] = useState(false);
  const [isDraggingBulk, setIsDraggingBulk] = useState(false);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSingleTargetMode(selectedPage ? 'current' : 'new');
    } else {
      // Cleanup previews
      if (singleFile) URL.revokeObjectURL(singleFile.previewUrl);
      setSingleFile(null);
      bulkFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setBulkFiles([]);
      setIsSingleUploading(false);
      setIsBulkUploading(false);
      setUploadProgress(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Single file selection handler
  const handleSelectSingleFile = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Định dạng không hỗ trợ', 'Vui lòng chọn ảnh định dạng PNG, JPG hoặc WebP.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Ảnh quá lớn', 'Kích thước ảnh tối đa cho phép là 25 MB.');
      return;
    }
    const dims = await getImageDimensions(file);
    const previewUrl = URL.createObjectURL(file);
    setSingleFile({
      id: crypto.randomUUID(),
      file,
      previewUrl,
      name: file.name,
      size: file.size,
      width: dims.width,
      height: dims.height,
    });
  };

  // Bulk files selection handler with natural alphanumeric sorting
  const handleSelectBulkFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validFiles = rawFiles.filter((f) =>
      ['image/png', 'image/jpeg', 'image/webp'].includes(f.type) && f.size <= 25 * 1024 * 1024,
    );

    if (validFiles.length < rawFiles.length) {
      showToast('Một số tệp bị bỏ qua', 'Chỉ chấp nhận tệp ảnh PNG, JPG, WebP và dung lượng ≤ 25MB.');
    }

    // Natural sort: page-1, page-2, page-10 instead of page-1, page-10, page-2
    validFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );

    const stagedList: StagedFile[] = [];
    for (const file of validFiles) {
      const dims = await getImageDimensions(file);
      stagedList.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        width: dims.width,
        height: dims.height,
      });
    }

    setBulkFiles(stagedList);
  };

  // Execute single file upload
  const handleUploadSingle = async () => {
    if (!singleFile || !chapterId) return;
    setIsSingleUploading(true);

    try {
      let targetPageId = selectedPage?.id;

      if (singleTargetMode === 'new' || !targetPageId) {
        // Create new page
        const newPageNum = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) + 1 : 1;
        const newPage = await pageService.createPage(chapterId, {
          pageNumber: newPageNum,
          widthPx: singleFile.width || 1200,
          heightPx: singleFile.height || 1800,
          dpi: 300,
        });
        targetPageId = newPage.id;
      }

      const sha = await computeFileSha256(singleFile.file);
      await artworkService.uploadArtwork(
        chapterId,
        targetPageId,
        singleFile.file,
        defaultStageId,
        sha,
      );

      showToast('Tải ảnh thành công', `Đã tải ảnh lên cho trang thành công!`);
      await onSuccess(targetPageId);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tải ảnh:', err);
      showToast('Lỗi tải ảnh', err.response?.data?.error || err.message || 'Không thể tải ảnh lên.');
    } finally {
      setIsSingleUploading(false);
    }
  };

  // Execute bulk upload
  const handleUploadBulk = async () => {
    if (bulkFiles.length === 0 || !chapterId) return;
    setIsBulkUploading(true);

    const total = bulkFiles.length;
    let successCount = 0;
    let firstTargetPageId: string | undefined;

    try {
      const sortedExistingPages = [...pages].sort(
        (a, b) => a.pageNumber - b.pageNumber,
      );

      for (let i = 0; i < total; i++) {
        const item = bulkFiles[i];
        setUploadProgress({
          current: i + 1,
          total,
          message: `Đang xử lý trang ${i + 1}/${total}: ${item.name}...`,
        });

        let targetPageId: string;

        if (bulkTargetMode === 'replaceFromStart' && i < sortedExistingPages.length) {
          // Gán vào trang có sẵn
          targetPageId = sortedExistingPages[i].id;
        } else {
          // Tạo trang mới
          const currentMaxPage =
            sortedExistingPages.length > 0
              ? Math.max(...sortedExistingPages.map((p) => p.pageNumber))
              : 0;
          const newPageNum = currentMaxPage + 1;

          const newPage = await pageService.createPage(chapterId, {
            pageNumber: newPageNum,
            widthPx: item.width || 1200,
            heightPx: item.height || 1800,
            dpi: 300,
          });
          targetPageId = newPage.id;
          sortedExistingPages.push(newPage);
        }

        if (!firstTargetPageId) {
          firstTargetPageId = targetPageId;
        }

        // Upload Artwork
        const sha = await computeFileSha256(item.file);
        await artworkService.uploadArtwork(
          chapterId,
          targetPageId,
          item.file,
          defaultStageId,
          sha,
        );

        successCount++;
      }

      showToast(
        'Tải hàng loạt thành công',
        `Đã tải lên và gán thành công ${successCount}/${total} trang truyện!`,
      );
      await onSuccess(firstTargetPageId);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tải hàng loạt:', err);
      showToast(
        'Quá trình tải bị gián đoạn',
        `Đã tải thành công ${successCount}/${total} trang. Lỗi: ${
          err.response?.data?.error || err.message || 'Lỗi không xác định'
        }`,
      );
      await onSuccess();
    } finally {
      setIsBulkUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200'
      data-testid='upload-pages-modal-overlay'
    >
      <div
        className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-[#1C1917]'
        role='dialog'
        aria-modal='true'
        aria-labelledby='upload-modal-title'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#E7E2D7] bg-[#F5F2EB]'>
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-2xs'>
              <Upload className='w-5 h-5' />
            </div>
            <div>
              <h3 id='upload-modal-title' className='font-bold text-base text-[#1C1917]'>
                Tải Ảnh Trang Truyện
              </h3>
              <p className='text-xs text-[#78716C]'>
                Tải ảnh cho 1 trang cụ thể hoặc import hàng loạt nhiều trang vào chương
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={isSingleUploading || isBulkUploading}
            className='p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors disabled:opacity-30'
            aria-label='Đóng'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Tab switcher */}
        <div className='flex border-b border-[#E7E2D7] bg-[#FCFBF8] px-6 pt-3 gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('single')}
            disabled={isSingleUploading || isBulkUploading}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileImage className='w-4 h-4' />
            <span>Tải 1 Trang</span>
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('bulk')}
            disabled={isSingleUploading || isBulkUploading}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className='w-4 h-4' />
            <span>Tải Hàng Loạt Trang</span>
            {bulkFiles.length > 0 && (
              <span className='px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold'>
                {bulkFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className='flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar'>
          {activeTab === 'single' ? (
            /* TAB 1: TẢI 1 TRANG */
            <div className='space-y-4'>
              {/* Dropzone */}
              {!singleFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingSingle(true);
                  }}
                  onDragLeave={() => setIsDraggingSingle(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSingle(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleSelectSingleFile(file);
                  }}
                  onClick={() => singleInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDraggingSingle
                      ? 'border-orange-500 bg-orange-50/60 scale-[0.99]'
                      : 'border-[#D8D2C5] bg-[#FDFBF7] hover:border-orange-400 hover:bg-orange-50/20'
                  }`}
                >
                  <input
                    ref={singleInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/webp'
                    className='hidden'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleSelectSingleFile(file);
                      e.target.value = '';
                    }}
                  />
                  <div className='w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 shadow-2xs'>
                    <Upload className='w-6 h-6' />
                  </div>
                  <p className='text-sm font-bold text-stone-800'>
                    Kéo thả ảnh vào đây hoặc bấm để chọn
                  </p>
                  <p className='text-xs text-stone-500 mt-1'>
                    Hỗ trợ định dạng PNG, JPG, WebP (Tối đa 25MB)
                  </p>
                </div>
              ) : (
                /* Selected File Preview */
                <div className='bg-white border border-[#D8D2C5] rounded-xl p-4 flex gap-4 items-center relative shadow-2xs'>
                  <div className='w-24 h-32 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center'>
                    <img
                      src={singleFile.previewUrl}
                      alt={singleFile.name}
                      className='w-full h-full object-contain'
                    />
                  </div>
                  <div className='flex-1 min-w-0 space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-sm text-stone-900 truncate' title={singleFile.name}>
                        {singleFile.name}
                      </span>
                      <button
                        type='button'
                        onClick={() => {
                          URL.revokeObjectURL(singleFile.previewUrl);
                          setSingleFile(null);
                        }}
                        className='text-stone-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors'
                        title='Chọn ảnh khác'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                    <div className='text-xs text-stone-500 flex gap-3'>
                      <span>Dung lượng: {formatFileSize(singleFile.size)}</span>
                      {singleFile.width && singleFile.height && (
                        <span>Kích thước: {singleFile.width} × {singleFile.height}px</span>
                      )}
                    </div>
                    <div className='pt-1'>
                      <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full'>
                        <CheckCircle2 className='w-3 h-3' /> Đã sẵn sàng tải lên
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Target Option */}
              <div className='bg-[#F5F2EB]/60 border border-[#E7E2D7] rounded-xl p-4 space-y-3'>
                <label className='text-xs font-bold text-stone-700 uppercase tracking-wider block'>
                  Mục tiêu tải lên:
                </label>
                <div className='space-y-2'>
                  {selectedPage && (
                    <label className='flex items-center gap-2.5 p-2.5 rounded-lg border border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300 transition-colors'>
                      <input
                        type='radio'
                        name='singleTarget'
                        value='current'
                        checked={singleTargetMode === 'current'}
                        onChange={() => setSingleTargetMode('current')}
                        className='text-orange-600 focus:ring-orange-500'
                      />
                      <div className='text-xs'>
                        <span className='font-bold text-stone-900'>
                          Cập nhật ảnh cho Trang {selectedPage.pageNumber} hiện tại
                        </span>
                        <p className='text-stone-500 text-[11px]'>
                          Tải phiên bản mới đè lên trang đang mở trên canvas
                        </p>
                      </div>
                    </label>
                  )}
                  <label className='flex items-center gap-2.5 p-2.5 rounded-lg border border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300 transition-colors'>
                    <input
                      type='radio'
                      name='singleTarget'
                      value='new'
                      checked={singleTargetMode === 'new'}
                      onChange={() => setSingleTargetMode('new')}
                      className='text-orange-600 focus:ring-orange-500'
                    />
                    <div className='text-xs'>
                      <span className='font-bold text-stone-900'>
                        Tạo thành trang mới tiếp theo (Trang{' '}
                        {pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) + 1 : 1})
                      </span>
                      <p className='text-stone-500 text-[11px]'>
                        Tạo thêm một trang mới ở cuối chương và gán ảnh này vào
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: TẢI HÀNG LOẠT TRANG */
            <div className='space-y-4'>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBulk(true);
                }}
                onDragLeave={() => setIsDraggingBulk(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBulk(false);
                  if (e.dataTransfer.files) void handleSelectBulkFiles(e.dataTransfer.files);
                }}
                onClick={() => bulkInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDraggingBulk
                    ? 'border-orange-500 bg-orange-50/60 scale-[0.99]'
                    : 'border-[#D8D2C5] bg-[#FDFBF7] hover:border-orange-400 hover:bg-orange-50/20'
                }`}
              >
                <input
                  ref={bulkInputRef}
                  type='file'
                  multiple
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={(e) => {
                    if (e.target.files) void handleSelectBulkFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <div className='w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2 shadow-2xs'>
                  <Layers className='w-6 h-6' />
                </div>
                <p className='text-sm font-bold text-stone-800'>
                  Kéo thả nhiều ảnh vào đây hoặc bấm để chọn hàng loạt
                </p>
                <p className='text-xs text-stone-500 mt-1'>
                  Hỗ trợ tải đồng thời hàng chục trang truyện. Tự động sắp xếp theo thứ tự số trong tên tệp.
                </p>
              </div>

              {/* Bulk options & list */}
              {bulkFiles.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-bold text-stone-800'>
                      Danh sách {bulkFiles.length} trang đã chọn:
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        bulkFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                        setBulkFiles([]);
                      }}
                      className='text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer'
                    >
                      <Trash2 className='w-3.5 h-3.5' /> Xóa tất cả
                    </button>
                  </div>

                  {/* Bulk Target Strategy */}
                  <div className='bg-[#F5F2EB]/60 border border-[#E7E2D7] rounded-xl p-3 space-y-2'>
                    <label className='text-xs font-bold text-stone-700 uppercase tracking-wider block'>
                      Cách gán vào chương:
                    </label>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                      <label className='flex items-center gap-2 p-2 rounded-lg border border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300 text-xs'>
                        <input
                          type='radio'
                          name='bulkStrategy'
                          value='append'
                          checked={bulkTargetMode === 'append'}
                          onChange={() => setBulkTargetMode('append')}
                          className='text-orange-600 focus:ring-orange-500'
                        />
                        <div>
                          <span className='font-bold text-stone-900'>Tạo mới toàn bộ</span>
                          <p className='text-stone-500 text-[10px]'>Tạo các trang tiếp theo ở cuối chương</p>
                        </div>
                      </label>
                      <label className='flex items-center gap-2 p-2 rounded-lg border border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300 text-xs'>
                        <input
                          type='radio'
                          name='bulkStrategy'
                          value='replaceFromStart'
                          checked={bulkTargetMode === 'replaceFromStart'}
                          onChange={() => setBulkTargetMode('replaceFromStart')}
                          className='text-orange-600 focus:ring-orange-500'
                        />
                        <div>
                          <span className='font-bold text-stone-900'>Áp dụng từ Trang 1</span>
                          <p className='text-stone-500 text-[10px]'>Ghi đè trang có sẵn, tạo mới nếu thiếu</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className='max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-1 custom-scrollbar'>
                    {bulkFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className='bg-white border border-[#D8D2C5] rounded-xl p-2 relative group flex flex-col items-center shadow-2xs'
                      >
                        <span className='absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold'>
                          #{idx + 1}
                        </span>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            URL.revokeObjectURL(item.previewUrl);
                            setBulkFiles((prev) => prev.filter((x) => x.id !== item.id));
                          }}
                          className='absolute top-1 right-1 z-10 p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity'
                          title='Xóa ảnh này'
                        >
                          <X className='w-3 h-3' />
                        </button>
                        <div className='w-full h-24 bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center mb-1.5'>
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className='w-full h-full object-contain'
                          />
                        </div>
                        <span className='text-[11px] font-medium text-stone-700 truncate w-full text-center' title={item.name}>
                          {item.name}
                        </span>
                        <span className='text-[10px] text-stone-400'>
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isBulkUploading && uploadProgress && (
                <div className='bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2'>
                  <div className='flex items-center justify-between text-xs font-bold text-orange-900'>
                    <span className='flex items-center gap-1.5'>
                      <Loader2 className='w-4 h-4 animate-spin text-orange-600' />
                      {uploadProgress.message}
                    </span>
                    <span>
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className='w-full h-2.5 bg-orange-200 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-orange-600 transition-all duration-300'
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className='flex items-center justify-between px-6 py-4 border-t border-[#E7E2D7] bg-[#F5F2EB]'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSingleUploading || isBulkUploading}
            className='px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/70 rounded-xl transition-colors disabled:opacity-40 cursor-pointer'
          >
            Hủy bỏ
          </button>

          {activeTab === 'single' ? (
            <button
              type='button'
              onClick={handleUploadSingle}
              disabled={!singleFile || isSingleUploading}
              className='px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-soft-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSingleUploading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className='w-4 h-4' />
                  <span>
                    {singleTargetMode === 'current' && selectedPage
                      ? `Cập nhật Trang ${selectedPage.pageNumber}`
                      : 'Tạo trang mới & Tải ảnh'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type='button'
              onClick={handleUploadBulk}
              disabled={bulkFiles.length === 0 || isBulkUploading}
              className='px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-soft-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isBulkUploading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Đang tải hàng loạt...</span>
                </>
              ) : (
                <>
                  <Upload className='w-4 h-4' />
                  <span>Bắt đầu tải lên ({bulkFiles.length} trang)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
