import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/shared/ui';

export const UnlockLayoutDialog: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      size='sm'
      closeLabel='Hủy bỏ'
      data-testid='modal-unlock-layout-confirm'
      title={
        <div className='flex items-start gap-3'>
          <div className='p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:text-amber-400 shrink-0'>
            <AlertTriangle className='w-5 h-5' aria-hidden='true' />
          </div>
          <span
            id='unlock-layout-title'
            className='text-sm font-bold text-stone-900 dark:text-stone-100'
          >
            Mở khóa đổi mẫu khung trang?
          </span>
        </div>
      }
      description='Trang này hiện đang chứa bản vẽ trong các khung hình. Việc mở khóa và chọn mẫu khung khác có thể làm thay đổi tỷ lệ hoặc gỡ bỏ các bản vẽ hiện tại.'
      footer={
        <div className='flex flex-wrap items-center justify-end gap-2 w-full'>
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
      }
    >
      <div className='p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 text-xs text-stone-700 dark:text-stone-300'>
        Bấm <strong className='text-rose-700 dark:text-rose-400'>Xác nhận mở khóa</strong> sẽ gỡ
        tranh tạm trên trang và đưa trang về chế độ chọn bố cục nháp.
      </div>
    </Modal>
  );
};

export const ArtworkPreviewDialog: React.FC<{
  imageUrl: string;
  title: string;
  onClose: () => void;
}> = ({ imageUrl, title, onClose }) => {
  return (
    <Modal isOpen={true} onClose={onClose} size='xl' title={title} closeLabel='Đóng xem tranh'>
      <div className='p-2 flex items-center justify-center overflow-auto'>
        <img
          src={imageUrl}
          alt={title}
          className='max-w-full max-h-[80vh] object-contain rounded'
        />
      </div>
    </Modal>
  );
};
