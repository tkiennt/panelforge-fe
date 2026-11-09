import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Upload,
  Layers,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { PageDto, pageService } from '@/services/page.service';
import { artworkService, computeFileSha256 } from '@/services/artwork.service';
import type { PipelineStageDto } from '@/services/pipeline.service';
import {
  ALLOWED_ARTWORK_IMAGE_TYPES,
  MAX_ARTWORK_IMAGE_BYTES,
  generateSafeId,
} from '../utils/artistStage';

export interface UploadPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  selectedPage: PageDto | null;
  pages: PageDto[];
  defaultStageId?: string;
  /** Tên công đoạn nhận ảnh, hiển thị để hoạ sĩ xác nhận trước khi tải lên. */
  stageName?: string;
  /** Danh sách các công đoạn pipeline khả dụng để hoạ sĩ xem hoặc chọn công đoạn nhận ảnh. */
  availableStages?: PipelineStageDto[];
  defaultTab?: 'single' | 'bulk';
  /** Quyền sửa trang */
  canEditPages?: boolean;
  /** Trang hiện tại đã bị tách cho hoạ sĩ khác */
  isCurrentPageCarvedOut?: boolean;
  /** Trang hiện tại có khung đã tách việc */
  hasCarvedOutPanelOnPage?: boolean;
  /** Hoạ sĩ chỉ giữ việc theo khung trên trang này */
  hasPanelOnlyAssignmentOnPage?: boolean;
  onSuccess: (targetPageId?: string) => Promise<void> | void;
  showToast: (title: string, message: string) => void;
}

export interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error(`Tệp ảnh "${file.name}" không hợp lệ hoặc có kích thước rỗng.`));
        return;
      }
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Không thể giải mã tệp ảnh "${file.name}". Tệp có thể đã bị hỏng.`));
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
  stageName,
  availableStages = [],
  defaultTab = 'single',
  canEditPages = true,
  isCurrentPageCarvedOut = false,
  hasCarvedOutPanelOnPage = false,
  hasPanelOnlyAssignmentOnPage = false,
  onSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(defaultTab);

  // Stage selection state
  const [selectedStageId, setSelectedStageId] = useState<string>(defaultStageId || '');

  // Keep selectedStageId in sync when defaultStageId changes on open
  useEffect(() => {
    if (defaultStageId) {
      setSelectedStageId(defaultStageId);
    } else if (availableStages.length > 0) {
      const firstEnabled = availableStages.find((s) => s.isEnabled !== false) || availableStages[0];
      if (firstEnabled) setSelectedStageId(firstEnabled.id);
    }
  }, [defaultStageId, availableStages, isOpen]);

  // Track all created object URLs to prevent memory leaks
  const activePreviewUrlsRef = useRef<Set<string>>(new Set());
  const trackPreviewUrl = useCallback((url: string) => {
    activePreviewUrlsRef.current.add(url);
    return url;
  }, []);
  const revokeTrackedUrl = useCallback((url?: string | null) => {
    if (!url) return;
    if (activePreviewUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      activePreviewUrlsRef.current.delete(url);
    }
  }, []);
  const revokeAllTrackedUrls = useCallback(() => {
    activePreviewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    activePreviewUrlsRef.current.clear();
  }, []);

  // Check upload constraints on current page
  const canUpdateCurrentPage = Boolean(
    selectedPage &&
    canEditPages &&
    !isCurrentPageCarvedOut &&
    !hasCarvedOutPanelOnPage &&
    !hasPanelOnlyAssignmentOnPage,
  );

  const currentPageBlockedReason = useMemo(() => {
    if (!canEditPages) return 'Bạn chỉ có quyền xem, không thể tải ảnh.';
    if (isCurrentPageCarvedOut) {
      return 'Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn, không thể tải ảnh toàn trang.';
    }
    if (hasCarvedOutPanelOnPage) {
      return 'Trang này có khung tranh đã được tách cho người khác, chỉ có thể tải ảnh cho từng khung.';
    }
    if (hasPanelOnlyAssignmentOnPage) {
      return 'Bạn đang giữ việc theo khung nên chỉ có thể tải ảnh cho khung được giao.';
    }
    return undefined;
  }, [canEditPages, isCurrentPageCarvedOut, hasCarvedOutPanelOnPage, hasPanelOnlyAssignmentOnPage]);

  // Single page upload state
  const [singleFile, setSingleFile] = useState<StagedFile | null>(null);
  const [singleTargetMode, setSingleTargetMode] = useState<'current' | 'new'>(
    canUpdateCurrentPage ? 'current' : 'new',
  );
  const [isSingleUploading, setIsSingleUploading] = useState(false);
  const singleInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<StagedFile[]>([]);
  const [bulkTargetMode, setBulkTargetMode] = useState<'append' | 'replaceFromStart'>('append');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isStagingFiles, setIsStagingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Abort controller for cancelling ongoing bulk uploads
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Race condition token for bulk file reading
  const stagingTokenRef = useRef(0);

  // Drag states
  const [isDraggingSingle, setIsDraggingSingle] = useState(false);
  const [isDraggingBulk, setIsDraggingBulk] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllTrackedUrls();
    };
  }, [revokeAllTrackedUrls]);

  // Reset or initialize on open/close
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSingleTargetMode(canUpdateCurrentPage ? 'current' : 'new');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
        uploadAbortRef.current = null;
      }
      revokeAllTrackedUrls();
      setSingleFile(null);
      setBulkFiles([]);
      setIsSingleUploading(false);
      setIsBulkUploading(false);
      setIsStagingFiles(false);
      setUploadProgress(null);
    }
  }, [isOpen, defaultTab, canUpdateCurrentPage, revokeAllTrackedUrls]);

  // Keyboard accessibility: Escape key to close modal if not uploading
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSingleUploading && !isBulkUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSingleUploading, isBulkUploading, onClose]);

  // Current stage display
  const currentStageObj = useMemo(() => {
    return (
      availableStages.find((s) => s.id === selectedStageId) ||
      (defaultStageId ? availableStages.find((s) => s.id === defaultStageId) : null) ||
      null
    );
  }, [availableStages, selectedStageId, defaultStageId]);

  const effectiveStageName = currentStageObj?.name || stageName || 'Mặc định';

  // Single file selection handler
  const handleSelectSingleFile = async (file: File) => {
    if (!ALLOWED_ARTWORK_IMAGE_TYPES.includes(file.type as any)) {
      showToast('Định dạng không hỗ trợ', 'Vui lòng chọn ảnh định dạng PNG, JPG hoặc WebP.');
      return;
    }
    if (file.size > MAX_ARTWORK_IMAGE_BYTES) {
      showToast('Ảnh quá lớn', 'Kích thước ảnh tối đa cho phép là 20 MB (đồng bộ nhận diện vùng).');
      return;
    }

    try {
      const dims = await getImageDimensions(file);
      // Revoke previous single file preview
      if (singleFile?.previewUrl) {
        revokeTrackedUrl(singleFile.previewUrl);
      }

      const previewUrl = trackPreviewUrl(URL.createObjectURL(file));
      setSingleFile({
        id: generateSafeId('single'),
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        width: dims.width,
        height: dims.height,
      });
    } catch (err: any) {
      showToast('Tệp ảnh lỗi', err.message || 'Không thể đọc ảnh đã chọn.');
    }
  };

  // Bulk files selection handler with APPEND behavior & natural alphanumeric sorting
  const handleSelectBulkFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validFiles: File[] = [];
    let oversizedCount = 0;
    let unsupportedFormatCount = 0;

    for (const f of rawFiles) {
      if (!ALLOWED_ARTWORK_IMAGE_TYPES.includes(f.type as any)) {
        unsupportedFormatCount++;
      } else if (f.size > MAX_ARTWORK_IMAGE_BYTES) {
        oversizedCount++;
      } else {
        validFiles.push(f);
      }
    }

    if (unsupportedFormatCount > 0 || oversizedCount > 0) {
      const reasons: string[] = [];
      if (unsupportedFormatCount > 0) reasons.push(`${unsupportedFormatCount} tệp sai định dạng`);
      if (oversizedCount > 0) reasons.push(`${oversizedCount} tệp vượt quá 20MB`);
      showToast('Một số tệp bị bỏ qua', `Bỏ qua ${reasons.join(', ')}.`);
    }

    if (validFiles.length === 0) return;

    const token = ++stagingTokenRef.current;
    setIsStagingFiles(true);

    try {
      const newStagedList: StagedFile[] = [];
      let corruptCount = 0;

      for (const file of validFiles) {
        if (stagingTokenRef.current !== token) return; // Staging cancelled by another pick
        try {
          const dims = await getImageDimensions(file);
          const previewUrl = trackPreviewUrl(URL.createObjectURL(file));
          newStagedList.push({
            id: generateSafeId('bulk'),
            file,
            previewUrl,
            name: file.name,
            size: file.size,
            width: dims.width,
            height: dims.height,
          });
        } catch {
          corruptCount++;
        }
      }

      if (stagingTokenRef.current !== token) return;

      if (corruptCount > 0) {
        showToast('Ảnh bị hỏng', `Đã bỏ qua ${corruptCount} tệp ảnh không thể giải mã kích thước.`);
      }

      // Append to existing bulk files and avoid duplicates by filename + size
      setBulkFiles((prev) => {
        const existingKeys = new Set(prev.map((x) => `${x.name}_${x.size}`));
        const filteredNew = newStagedList.filter((x) => !existingKeys.has(`${x.name}_${x.size}`));

        const combined = [...prev, ...filteredNew];
        // Natural sort
        combined.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
        );
        return combined;
      });
    } finally {
      if (stagingTokenRef.current === token) {
        setIsStagingFiles(false);
      }
    }
  };

  // Execute single file upload with ROLLBACK on failure
  const handleUploadSingle = async () => {
    if (!singleFile || !chapterId) return;

    if (singleTargetMode === 'current' && !canUpdateCurrentPage) {
      showToast('Không thể cập nhật trang', currentPageBlockedReason || 'Trang bị khoá chỉnh sửa.');
      return;
    }

    setIsSingleUploading(true);
    let createdPageId: string | null = null;

    try {
      let targetPageId = selectedPage?.id;

      if (singleTargetMode === 'new' || !targetPageId) {
        const newPageNum = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) + 1 : 1;
        const newPage = await pageService.createPage(chapterId, {
          pageNumber: newPageNum,
          widthPx: singleFile.width || 1200,
          heightPx: singleFile.height || 1800,
          dpi: 300,
        });
        createdPageId = newPage.id;
        targetPageId = newPage.id;
      }

      const sha = await computeFileSha256(singleFile.file);
      await artworkService.uploadArtwork(
        chapterId,
        targetPageId,
        singleFile.file,
        selectedStageId || defaultStageId,
        sha,
      );

      showToast('Tải ảnh thành công', `Đã tải ảnh lên cho trang thành công!`);
      await onSuccess(targetPageId);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tải ảnh:', err);
      // Rollback created page if upload failed
      if (createdPageId) {
        try {
          await pageService.deletePage(createdPageId);
          console.warn(`Đã thu hồi trang mồ côi #${createdPageId} sau khi tải ảnh lỗi.`);
        } catch (delErr) {
          console.error('Không thể thu hồi trang mồ côi:', delErr);
        }
      }
      showToast(
        'Lỗi tải ảnh',
        err.response?.data?.error || err.message || 'Không thể tải ảnh lên.',
      );
    } finally {
      setIsSingleUploading(false);
    }
  };

  // Cancel ongoing upload
  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    setIsBulkUploading(false);
    setUploadProgress(null);
    showToast('Đã dừng tải lên', 'Quá trình tải ảnh hàng loạt đã được huỷ.');
  };

  // Execute bulk upload with ROLLBACK on per-page failure and RETRY support
  const handleUploadBulk = async () => {
    if (bulkFiles.length === 0 || !chapterId) return;

    setIsBulkUploading(true);
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;

    const total = bulkFiles.length;
    let successCount = 0;
    let firstTargetPageId: string | undefined;
    let lastTargetPageId: string | undefined;

    const failedItems: { item: StagedFile; error: string }[] = [];
    const succeededIds = new Set<string>();

    try {
      const sortedExistingPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

      for (let i = 0; i < total; i++) {
        if (abortController.signal.aborted) {
          break;
        }

        const item = bulkFiles[i];
        // Accurate progress before upload begins
        setUploadProgress({
          current: i,
          total,
          message: `Đang tải trang ${i + 1}/${total}: ${item.name}...`,
        });

        let targetPageId: string;
        let createdPageId: string | null = null;

        try {
          if (bulkTargetMode === 'replaceFromStart' && i < sortedExistingPages.length) {
            targetPageId = sortedExistingPages[i].id;
          } else {
            const currentMax =
              sortedExistingPages.length > 0
                ? Math.max(...sortedExistingPages.map((p) => p.pageNumber))
                : 0;
            const newPage = await pageService.createPage(chapterId, {
              pageNumber: currentMax + 1,
              widthPx: item.width || 1200,
              heightPx: item.height || 1800,
              dpi: 300,
            });
            createdPageId = newPage.id;
            targetPageId = newPage.id;
            sortedExistingPages.push(newPage);
          }

          if (!firstTargetPageId) firstTargetPageId = targetPageId;
          lastTargetPageId = targetPageId;

          const sha = await computeFileSha256(item.file);
          await artworkService.uploadArtwork(
            chapterId,
            targetPageId,
            item.file,
            selectedStageId || defaultStageId,
            sha,
          );

          successCount++;
          succeededIds.add(item.id);

          setUploadProgress({
            current: i + 1,
            total,
            message: `Hoàn tất ${i + 1}/${total}: ${item.name}`,
          });
        } catch (itemErr: any) {
          console.error(`Lỗi tải trang ${item.name}:`, itemErr);
          // Rollback newly created page on failure
          if (createdPageId) {
            try {
              await pageService.deletePage(createdPageId);
              const idx = sortedExistingPages.findIndex((p) => p.id === createdPageId);
              if (idx !== -1) sortedExistingPages.splice(idx, 1);
            } catch (delErr) {
              console.error('Không thể rollback trang:', delErr);
            }
          }
          failedItems.push({
            item,
            error: itemErr.response?.data?.error || itemErr.message || 'Lỗi tải ảnh',
          });
        }
      }

      // Update bulkFiles state: remove succeeded, keep failed for easy retry
      if (failedItems.length > 0) {
        setBulkFiles((prev) => {
          return prev
            .filter((f) => !succeededIds.has(f.id))
            .map((f) => {
              const errInfo = failedItems.find((x) => x.item.id === f.id);
              return errInfo ? { ...f, error: errInfo.error } : f;
            });
        });

        showToast(
          'Tải hàng loạt có lỗi',
          `Đã tải thành công ${successCount}/${total} trang. Có ${failedItems.length} trang bị lỗi có thể thử lại.`,
        );

        if (successCount > 0) {
          const targetToSelect =
            bulkTargetMode === 'append'
              ? lastTargetPageId || selectedPage?.id
              : selectedPage?.id || firstTargetPageId;
          await onSuccess(targetToSelect);
        }
      } else if (successCount > 0) {
        showToast(
          'Tải hàng loạt thành công',
          `Đã tải lên và gán thành công ${successCount}/${total} trang truyện!`,
        );
        const targetToSelect =
          bulkTargetMode === 'append'
            ? lastTargetPageId || selectedPage?.id
            : selectedPage?.id || firstTargetPageId;
        await onSuccess(targetToSelect);
        onClose();
      }
    } finally {
      setIsBulkUploading(false);
      setUploadProgress(null);
      uploadAbortRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200'
      data-testid='upload-pages-modal-overlay'
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSingleUploading && !isBulkUploading) {
          onClose();
        }
      }}
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
          {/* Target Stage Banner / Selector */}
          <div
            data-testid='upload-target-stage'
            className='flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900'
          >
            <div className='flex items-center gap-2'>
              <Layers className='w-4 h-4 shrink-0 text-sky-600' />
              <span>
                Đang tải vào công đoạn: <strong className='font-bold'>{effectiveStageName}</strong>
              </span>
            </div>

            {availableStages.length > 1 && (
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                disabled={isSingleUploading || isBulkUploading}
                aria-label='Chọn công đoạn tải ảnh'
                className='text-xs bg-white border border-sky-300 rounded-lg px-2 py-1 font-medium text-sky-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500'
              >
                {availableStages
                  .filter((s) => s.isEnabled !== false)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

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
                    Hỗ trợ định dạng PNG, JPG, WebP (Tối đa 20MB)
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
                      <span
                        className='font-bold text-sm text-stone-900 truncate'
                        title={singleFile.name}
                      >
                        {singleFile.name}
                      </span>
                      <button
                        type='button'
                        onClick={() => {
                          revokeTrackedUrl(singleFile.previewUrl);
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
                        <span>
                          Kích thước: {singleFile.width} × {singleFile.height}px
                        </span>
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
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                        canUpdateCurrentPage
                          ? 'border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300'
                          : 'border-stone-200 bg-stone-100/70 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type='radio'
                        name='singleTarget'
                        value='current'
                        disabled={!canUpdateCurrentPage}
                        checked={singleTargetMode === 'current'}
                        onChange={() => setSingleTargetMode('current')}
                        className='text-orange-600 focus:ring-orange-500 mt-0.5'
                      />
                      <div className='text-xs'>
                        <span className='font-bold text-stone-900'>
                          Cập nhật ảnh cho Trang {selectedPage.pageNumber} hiện tại
                        </span>
                        <p className='text-stone-500 text-[11px]'>
                          Tải phiên bản mới đè lên trang đang mở trên canvas
                        </p>
                        {!canUpdateCurrentPage && currentPageBlockedReason && (
                          <p className='text-amber-700 font-medium text-[11px] mt-1 flex items-center gap-1'>
                            <AlertTriangle className='w-3 h-3 shrink-0' />
                            {currentPageBlockedReason}
                          </p>
                        )}
                      </div>
                    </label>
                  )}
                  <label className='flex items-start gap-2.5 p-2.5 rounded-lg border border-[#D8D2C5] bg-white cursor-pointer hover:border-orange-300 transition-colors'>
                    <input
                      type='radio'
                      name='singleTarget'
                      value='new'
                      checked={singleTargetMode === 'new'}
                      onChange={() => setSingleTargetMode('new')}
                      className='text-orange-600 focus:ring-orange-500 mt-0.5'
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
                  Hỗ trợ tải đồng thời hàng chục trang truyện (Tối đa 20MB/ảnh). Tự động sắp xếp
                  theo thứ tự số trong tên tệp.
                </p>
              </div>

              {isStagingFiles && (
                <div className='flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200'>
                  <Loader2 className='w-4 h-4 animate-spin text-amber-600' />
                  <span>Đang đọc và tạo bản xem trước ảnh...</span>
                </div>
              )}

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
                        bulkFiles.forEach((f) => revokeTrackedUrl(f.previewUrl));
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
                          <p className='text-stone-500 text-[10px]'>
                            Tạo các trang tiếp theo ở cuối chương
                          </p>
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
                          <p className='text-stone-500 text-[10px]'>
                            Ghi đè trang có sẵn, tạo mới nếu thiếu
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Warning Callout for replaceFromStart */}
                    {bulkTargetMode === 'replaceFromStart' && pages.length > 0 && (
                      <div className='flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]'>
                        <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                        <div>
                          <p className='font-semibold'>Cảnh báo ghi đè trang có sẵn:</p>
                          <p>
                            Ảnh sẽ được gán đè lên{' '}
                            <strong>{Math.min(bulkFiles.length, pages.length)} trang có sẵn</strong>{' '}
                            (từ Trang 1 đến Trang {Math.min(bulkFiles.length, pages.length)})
                            {bulkFiles.length > pages.length &&
                              ` và tạo thêm ${bulkFiles.length - pages.length} trang mới ở cuối`}
                            .
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Grid */}
                  <div className='max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-1 custom-scrollbar'>
                    {bulkFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-xl p-2 relative group flex flex-col items-center shadow-2xs ${
                          item.error ? 'border-rose-400 bg-rose-50/30' : 'border-[#D8D2C5]'
                        }`}
                      >
                        <span className='absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold'>
                          #{idx + 1}
                        </span>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            revokeTrackedUrl(item.previewUrl);
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
                        <span
                          className='text-[11px] font-medium text-stone-700 truncate w-full text-center'
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className='text-[10px] text-stone-400'>
                          {formatFileSize(item.size)}
                        </span>
                        {item.error && (
                          <span
                            className='text-[10px] text-rose-600 font-semibold truncate w-full text-center mt-0.5'
                            title={item.error}
                          >
                            Lỗi: {item.error}
                          </span>
                        )}
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
          {isBulkUploading ? (
            <button
              type='button'
              onClick={handleCancelUpload}
              className='px-4 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5'
            >
              <RotateCcw className='w-3.5 h-3.5' />
              <span>Dừng tải lên</span>
            </button>
          ) : (
            <button
              type='button'
              onClick={onClose}
              disabled={isSingleUploading}
              className='px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/70 rounded-xl transition-colors disabled:opacity-40 cursor-pointer'
            >
              Hủy bỏ
            </button>
          )}

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
              disabled={bulkFiles.length === 0 || isBulkUploading || isStagingFiles}
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
                  <span>
                    {bulkFiles.some((f) => f.error)
                      ? `Thử lại tải lên (${bulkFiles.length} trang)`
                      : `Bắt đầu tải lên (${bulkFiles.length} trang)`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
