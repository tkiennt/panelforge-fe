import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  History,
  GitCommit,
  Eye,
  Copy,
  Check,
  ChevronDown,
  Image as ImageIcon,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { BibleEntity } from '@/types';
import { BibleEntryDto } from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

interface BibleEntityDetailModalProps {
  entity: BibleEntity;
  rawEntry?: BibleEntryDto;
  isProducer: boolean;
  canCreateDraft?: boolean;
  onClose: () => void;
  onOpenHistory: (entity: BibleEntity) => void;
  onOpenAddRevision: (entity: BibleEntity) => void;
  onShowToast: (title: string, desc: string) => void;
  onZoomImage: (image: { url: string; title: string }) => void;
}

export const BibleEntityDetailModal: React.FC<BibleEntityDetailModalProps> = ({
  entity,
  rawEntry,
  isProducer,
  canCreateDraft = isProducer,
  onClose,
  onOpenHistory,
  onOpenAddRevision,
  onShowToast,
  onZoomImage,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap, Escape key listener & Body scroll locking
  useEffect(() => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially for accessibility
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      lastActiveElementRef.current?.focus?.();
    };
  }, [onClose]);

  const effectiveRevision = rawEntry?.effectiveRevision;

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      onShowToast('Đã sao chép', 'Mã băm nội dung đã được lưu vào bộ nhớ tạm.');
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      onShowToast('Không thể sao chép', 'Trình duyệt không cho phép truy cập clipboard.');
    }
  };

  const getCategoryLabel = (category: string | number): string => {
    const catStr = String(category).toLowerCase();
    switch (catStr) {
      case 'characters':
      case 'character':
      case '0':
        return 'Nhân vật';
      case 'locations':
      case 'location':
      case '1':
        return 'Địa điểm & Bối cảnh';
      case 'terminology':
      case 'prop':
      case '2':
      case '3':
        return 'Thuật ngữ & Đạo cụ';
      case 'style':
      case 'rule':
      case '4':
      case '5':
        return 'Quy tắc mỹ thuật';
      default:
        return 'Mục tri thức';
    }
  };

  // Content block rendering helper for reuse
  const renderVersionInfo = () => (
    <div className='p-3.5 sm:p-4 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-3 text-xs'>
      <div className='flex items-center justify-between'>
        <span className='font-bold text-xs text-zinc-900 flex items-center gap-1.5'>
          <Layers className='w-3.5 h-3.5 text-[#F97316]' />
          <span>Thông tin phiên bản</span>
        </span>
        <span className='font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200'>
          {effectiveRevision?.stageName ||
            (effectiveRevision
              ? `Giai đoạn ${effectiveRevision.versionNumber}`
              : 'Giai đoạn khởi tạo')}
        </span>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs'>
        <div className='p-2.5 bg-white rounded-lg border border-zinc-200/80 space-y-0.5'>
          <span className='text-[11px] text-zinc-500 block font-medium'>
            Giai đoạn &amp; Hiệu lực
          </span>
          <strong className='text-zinc-900 text-xs sm:text-sm font-semibold'>
            {effectiveRevision?.stageName ? `${effectiveRevision.stageName} · ` : ''}
            Ch.{effectiveRevision?.effectiveFromChapterNumber ?? 1}
            {effectiveRevision?.effectiveToChapterNumber
              ? `–${effectiveRevision.effectiveToChapterNumber}`
              : ' → hết'}
          </strong>
        </div>
        <div className='p-2.5 bg-white rounded-lg border border-zinc-200/80 space-y-0.5'>
          <span className='text-[11px] text-zinc-500 block font-medium'>Cập nhật lần cuối</span>
          <span className='text-zinc-800 text-xs sm:text-sm font-medium'>
            {rawEntry?.updatedAt || rawEntry?.createdAt
              ? new Date(rawEntry.updatedAt || rawEntry.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Mới khởi tạo'}
          </span>
        </div>
      </div>

      {/* Chi tiết kỹ thuật có thể mở rộng (Mã hash nội dung & ID) */}
      <div className='pt-2 border-t border-zinc-200/70'>
        <button
          type='button'
          onClick={() => setTechOpen((v) => !v)}
          className='w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-800 transition-colors py-1 cursor-pointer font-medium'
        >
          <span>Chi tiết kỹ thuật &amp; Mã băm</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${techOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {techOpen && (
          <div className='mt-2.5 space-y-2 text-[11px] pt-1'>
            {effectiveRevision?.contentHash ? (
              <div className='p-2.5 bg-white rounded-lg border border-zinc-200 space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-zinc-600 font-medium'>Mã băm nội dung (Hash):</span>
                  <button
                    type='button'
                    onClick={() => handleCopyHash(effectiveRevision.contentHash)}
                    className='inline-flex items-center gap-1 text-[11px] text-[#F97316] hover:underline font-medium cursor-pointer'
                    title='Sao chép mã băm'
                  >
                    {copiedHash ? (
                      <>
                        <Check className='w-3 h-3 text-emerald-600' />
                        <span className='text-emerald-600 font-semibold'>Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className='w-3 h-3' />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
                <div className='font-mono text-[10px] sm:text-[11px] text-zinc-700 break-all select-all bg-zinc-50 p-2 rounded border border-zinc-200/60 leading-tight'>
                  {effectiveRevision.contentHash}
                </div>
              </div>
            ) : null}

            <div className='flex items-center justify-between text-[11px] text-zinc-500 px-1'>
              <span>Mã định danh hệ thống (ID):</span>
              <span className='font-mono text-zinc-700 select-all'>{entity.id}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const modalContent = (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='bible-detail-modal-title'
      className='fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden font-sans'
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalContainerRef}
        className={`bg-white border border-[#E7E7E7] rounded-2xl w-full max-h-[min(90vh,calc(100dvh-1.5rem))] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          entity.imageUrl ? 'max-w-2xl lg:max-w-4xl' : 'max-w-2xl sm:max-w-3xl'
        }`}
      >
        {/* Sticky Header: Tiêu đề chính duy nhất, Mã, Phân loại, Nút đóng */}
        <div className='px-4 sm:px-5 py-3.5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] shrink-0 gap-3'>
          <div className='flex items-center gap-2.5 min-w-0 flex-1'>
            <span className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 shrink-0 border border-zinc-300/70'>
              {entity.code}
            </span>
            <div className='min-w-0 flex items-center gap-2 flex-wrap'>
              <h2
                id='bible-detail-modal-title'
                className='text-base sm:text-lg font-bold font-sans text-zinc-900 truncate'
              >
                {entity.name}
              </h2>
              <span className='px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-medium border border-zinc-200/80 shrink-0'>
                {getCategoryLabel(entity.category)}
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            aria-label='Đóng cửa sổ chi tiết'
            className='w-8 h-8 rounded-lg hover:bg-zinc-200/70 border border-transparent hover:border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer shrink-0'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className='p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 custom-scrollbar'>
          {/* Trạng thái: Canon/khóa và thông tin hiệu lực theo chương */}
          {entity.isLocked ? (
            <div className='p-3 sm:p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950'>
              <div className='w-7 h-7 rounded-lg bg-amber-100 border border-amber-300/70 flex items-center justify-center text-amber-700 shrink-0 mt-0.5'>
                <Lock className='w-4 h-4' />
              </div>
              <div className='space-y-1 flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-bold uppercase tracking-wider text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded'>
                    Canon đã khoá
                  </span>
                  <span className='text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/60'>
                    {effectiveRevision?.stageName ? `${effectiveRevision.stageName} · ` : ''}
                    Ch.{effectiveRevision?.effectiveFromChapterNumber ?? 1}
                    {effectiveRevision?.effectiveToChapterNumber
                      ? `–${effectiveRevision.effectiveToChapterNumber}`
                      : ' → hết'}
                  </span>
                  {entity.lockedAt && (
                    <span className='text-[11px] font-medium text-amber-800'>
                      • Đã duyệt {new Date(entity.lockedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
                <p className='text-xs text-amber-900/90 leading-relaxed'>
                  Bản thiết kế đã được Producer phê duyệt chính thức. Hoạ sĩ và các bộ phận sản xuất
                  sử dụng bản vẽ này làm quy chuẩn tham chiếu duy nhất.
                </p>
              </div>
            </div>
          ) : (
            <div className='p-3 sm:p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3 text-xs text-zinc-700'>
              <div className='w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 mt-0.5'>
                <HelpCircle className='w-4 h-4' />
              </div>
              <div className='space-y-1 flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-semibold text-zinc-900'>Bản nháp – chờ Producer duyệt</span>
                  <span className='text-[11px] font-medium text-zinc-600 bg-zinc-200/80 px-2 py-0.5 rounded'>
                    {effectiveRevision?.stageName ? `${effectiveRevision.stageName} · ` : ''}
                    Ch.{effectiveRevision?.effectiveFromChapterNumber ?? 1}
                    {effectiveRevision?.effectiveToChapterNumber
                      ? `–${effectiveRevision.effectiveToChapterNumber}`
                      : ' → hết'}
                  </span>
                </div>
                <p className='text-xs text-zinc-600 leading-relaxed'>
                  Mục này chưa chốt quy chuẩn chính thức. Producer có thể kiểm tra các phiên bản và
                  khoá làm tham chiếu Canon trong mục Lịch sử.
                </p>
              </div>
            </div>
          )}

          {/* Bố cục nội dung chính: Chia 2 cột trên Desktop nếu có ảnh, 1 cột gọn gàng nếu không có ảnh */}
          {entity.imageUrl ? (
            <div className='grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start'>
              {/* Cột trái: Ảnh Reference Sheet */}
              <div className='md:col-span-5 space-y-2'>
                <div className='flex items-center justify-between text-xs font-semibold text-zinc-700'>
                  <span>Ảnh Reference Sheet</span>
                  <button
                    type='button'
                    onClick={() =>
                      onZoomImage({
                        url: entity.imageUrl!,
                        title: entity.name,
                      })
                    }
                    className='text-[11px] text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer font-medium'
                  >
                    <Eye className='w-3.5 h-3.5' />
                    <span>Phóng to ảnh</span>
                  </button>
                </div>

                <div
                  className='relative w-full max-h-72 md:max-h-80 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 cursor-pointer group flex items-center justify-center p-2'
                  onClick={() =>
                    onZoomImage({
                      url: entity.imageUrl!,
                      title: entity.name,
                    })
                  }
                >
                  <AuthenticatedImage
                    src={entity.imageUrl}
                    alt={entity.name}
                    className='w-full h-full max-h-68 md:max-h-76 object-contain'
                  />
                  <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5'>
                    <Eye className='w-4 h-4' />
                    <span>Bấm để phóng to xem đầy đủ</span>
                  </div>
                </div>
              </div>

              {/* Cột phải: Vai trò, Mô tả, Thông tin phiên bản */}
              <div className='md:col-span-7 space-y-4'>
                {entity.subtitle && (
                  <div className='text-xs sm:text-sm font-semibold text-[#F97316] flex items-center gap-1.5'>
                    <span>Vai trò / Phụ đề:</span>
                    <span className='text-zinc-900'>{entity.subtitle}</span>
                  </div>
                )}

                <div className='space-y-1'>
                  <span className='text-xs font-semibold text-zinc-700 block'>Mô tả chi tiết</span>
                  <div className='p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 text-xs sm:text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar'>
                    {entity.description || 'Chưa có mô tả chi tiết cho mục tri thức này.'}
                  </div>
                </div>

                {renderVersionInfo()}
              </div>
            </div>
          ) : (
            <div className='space-y-4 sm:space-y-5'>
              {/* Empty state ảnh nhỏ gọn - Không chiếm hộp đen khổng lồ */}
              <div className='p-3.5 sm:p-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0 shadow-2xs'>
                    <ImageIcon className='w-4 h-4' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-zinc-800'>
                      Chưa có ảnh Reference Sheet cho mục này
                    </p>
                    <p className='text-[11px] text-zinc-500'>
                      Bổ sung ảnh thiết kế giúp hoạ sĩ vẽ đúng trang phục và nhận dạng.
                    </p>
                  </div>
                </div>
                {isProducer && (
                  <button
                    type='button'
                    onClick={() => {
                      onClose();
                      onOpenAddRevision(entity);
                    }}
                    className='px-3 py-1.5 bg-white hover:bg-orange-50 border border-zinc-200 hover:border-[#F97316] text-[#F97316] rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer shadow-2xs'
                  >
                    Tạo phiên bản mới để thêm ảnh
                  </button>
                )}
              </div>

              {/* Vai trò nhân vật / Phụ đề & Mô tả thiết kế */}
              <div className='space-y-2'>
                {entity.subtitle && (
                  <div className='text-xs sm:text-sm font-semibold text-[#F97316] flex items-center gap-1.5'>
                    <span>Vai trò / Phụ đề:</span>
                    <span className='text-zinc-900'>{entity.subtitle}</span>
                  </div>
                )}
                <div className='space-y-1'>
                  <span className='text-xs font-semibold text-zinc-700 block'>Mô tả chi tiết</span>
                  <div className='p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 text-xs sm:text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap'>
                    {entity.description || 'Chưa có mô tả chi tiết cho mục tri thức này.'}
                  </div>
                </div>
              </div>

              {renderVersionInfo()}
            </div>
          )}
        </div>

        {/* Sticky Footer: Các hành động chính */}
        <div className='px-4 sm:px-5 py-3.5 bg-[#FAF8F5] border-t border-[#E7E7E7] flex flex-wrap items-center justify-between gap-2.5 shrink-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <button
              type='button'
              onClick={() => {
                onClose();
                onOpenHistory(entity);
              }}
              className='px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
            >
              <History className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Xem lịch sử phiên bản</span>
            </button>

            {canCreateDraft ? (
              <button
                type='button'
                onClick={() => {
                  onClose();
                  onOpenAddRevision(entity);
                }}
                className='px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer'
              >
                <GitCommit className='w-3.5 h-3.5' />
                <span>{isProducer ? '+ Tạo phiên bản mới' : '+ Tạo bản nháp mới'}</span>
              </button>
            ) : (
              <span className='text-[11px] text-zinc-500 italic'>Chế độ chỉ xem.</span>
            )}
          </div>

          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer active:scale-95'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
