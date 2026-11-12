import React, { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { BibleEntryRevisionDto } from '@/services/bible.service';

interface ReworkModalProps {
  isOpen: boolean;
  targetRev: BibleEntryRevisionDto | null;
  entityName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const ReworkModal: React.FC<ReworkModalProps> = React.memo(
  ({ isOpen, targetRev, entityName, isSubmitting, onClose, onSubmit }) => {
    const [localReason, setLocalReason] = useState('');

    useEffect(() => {
      if (isOpen) {
        setLocalReason('');
      }
    }, [isOpen]);

    if (!isOpen || !targetRev) return null;

    return createPortal(
      <div
        className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-4'
        role='dialog'
        aria-modal='true'
        data-child-modal='true'
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className='bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-center justify-between border-b border-zinc-100 pb-3'>
            <div className='flex items-center gap-2'>
              <div className='w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center'>
                <MessageSquare className='w-4 h-4' />
              </div>
              <div>
                <h3 className='font-bold text-sm text-zinc-900'>
                  Yêu cầu vẽ lại thiết kế (Rework)
                </h3>
                <p className='text-[11px] text-zinc-500'>
                  Phiên bản v{targetRev.versionNumber} của &quot;{entityName}&quot;
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <div>
            <label className='block text-xs font-semibold text-zinc-800 mb-1.5'>
              Nhận xét chi tiết cho Artist (Lý do chưa chuẩn / Rắc-co) *
            </label>
            <textarea
              rows={4}
              required
              autoFocus
              placeholder='Ví dụ: Kiểu tóc chưa đúng với nguyên tác, màu trang phục cần chỉnh lại thành màu xanh đậm, thiếu biểu cảm giận dữ...'
              value={localReason}
              onChange={(e) => setLocalReason(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-rose-500 resize-none'
            />
            <p className='text-[10px] text-zinc-500 mt-1'>
              Ghi chú này sẽ được chuyển ngay đến hàng đợi vẽ của Artist để vẽ bản cập nhật tiếp
              theo.
            </p>
          </div>

          <div className='flex items-center justify-end gap-2 pt-2 border-t border-zinc-100'>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50'
            >
              Hủy
            </button>
            <button
              type='button'
              disabled={!localReason.trim() || isSubmitting}
              onClick={() => void onSubmit(localReason)}
              className='px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-2xs'
            >
              <MessageSquare className='w-3.5 h-3.5' />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu vẽ lại'}</span>
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);
ReworkModal.displayName = 'ReworkModal';
