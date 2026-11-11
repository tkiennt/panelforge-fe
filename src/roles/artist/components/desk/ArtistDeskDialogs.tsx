import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const useEscape = (onClose: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
};

export const UnlockLayoutDialog: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({
  onCancel,
  onConfirm,
}) => {
  useEscape(onCancel);
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='unlock-layout-title'
        data-testid='modal-unlock-layout-confirm'
        className='w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl p-5 space-y-4'
      >
        <div className='flex items-start gap-3'>
          <div className='p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:text-amber-400 shrink-0'>
            <AlertTriangle className='w-5 h-5' aria-hidden='true' />
          </div>
          <div className='space-y-1'>
            <h3
              id='unlock-layout-title'
              className='text-sm font-bold text-stone-900 dark:text-stone-100'
            >
              Mở khóa đổi mẫu khung trang?
            </h3>
            <p className='text-xs text-stone-600 dark:text-stone-400 leading-relaxed'>
              Trang này hiện đang chứa bản vẽ trong các khung hình. Việc mở khóa và chọn mẫu khung
              khác có thể làm thay đổi tỷ lệ hoặc gỡ bỏ các bản vẽ hiện tại.
            </p>
          </div>
        </div>

        <div className='p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 text-xs text-stone-700 dark:text-stone-300'>
          Bấm <strong className='text-rose-700 dark:text-rose-400'>Xác nhận mở khóa</strong> sẽ gỡ
          tranh tạm trên trang và đưa trang về chế độ chọn bố cục nháp.
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
          <button
            type='button'
            onClick={onCancel}
            data-testid='btn-cancel-unlock'
            className='btn-cta-secondary focus-ring min-h-9 px-3 text-xs font-semibold cursor-pointer'
          >
            Hủy bỏ (Giữ nguyên)
          </button>
          <button
            type='button'
            onClick={onConfirm}
            data-testid='btn-confirm-unlock'
            className='focus-ring min-h-9 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors'
          >
            Xác nhận mở khóa & Gỡ tranh
          </button>
        </div>
      </div>
    </div>
  );
};

export const ArtworkPreviewDialog: React.FC<{
  imageUrl: string;
  title: string;
  onClose: () => void;
}> = ({ imageUrl, title, onClose }) => {
  useEscape(onClose);
  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out'
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className='relative max-w-4xl max-h-[90vh] bg-stone-900 rounded-xl overflow-hidden border border-stone-700 shadow-xl flex flex-col cursor-default'
      >
        <div className='flex items-center justify-between gap-3 px-4 py-1.5 border-b border-stone-800 text-stone-200 text-xs font-medium'>
          <span className='truncate'>{title}</span>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng xem tranh'
            className='focus-ring w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white cursor-pointer'
          >
            <X className='w-4 h-4' aria-hidden='true' />
          </button>
        </div>
        <div className='p-2 flex items-center justify-center overflow-auto'>
          <img
            src={imageUrl}
            alt={title}
            className='max-w-full max-h-[80vh] object-contain rounded'
          />
        </div>
      </div>
    </div>
  );
};
