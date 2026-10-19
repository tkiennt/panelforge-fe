import React from 'react';
import { AlertTriangle, RefreshCw, X, ArrowRight, ShieldAlert } from 'lucide-react';

export interface ElementConflictModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  entityType?: string;
  elementId?: string;
  errorMessage?: string;
  onReload: () => void;
  onForceOverwrite?: () => void;
  onClose: () => void;
}

export const ElementConflictModal: React.FC<ElementConflictModalProps> = ({
  isOpen,
  title,
  subtitle,
  entityType,
  elementId,
  errorMessage,
  onReload,
  onForceOverwrite,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentEntity = entityType || 'Phần tử';

  return (
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200'>
      <div className='bg-white rounded-2xl border border-red-200 shadow-2xl max-w-lg w-full p-6 space-y-4'>
        {/* Header */}
        <div className='flex items-start justify-between border-b border-[#E7E7E7] pb-3'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 bg-red-100 text-red-600 rounded-xl'>
              <AlertTriangle className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-[#171717]'>
                {title || 'Xung Đột Phiên Bản Phần Tử'}
              </h3>
              <p className='text-xs text-[#737373]'>
                {subtitle || 'Optimistic Concurrency Control — ELEMENT_VERSION_CONFLICT'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1 text-[#888888] hover:text-[#171717] rounded-lg transition-colors cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <div className='space-y-3 text-xs'>
          <div className='p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1.5'>
            <div className='font-bold flex items-center gap-1.5'>
              <ShieldAlert className='w-4 h-4 text-amber-600' />
              <span>{currentEntity} đã được cập nhật bởi một người dùng khác</span>
            </div>
            <p className='text-xs text-amber-800 leading-relaxed'>
              Phiên bản trên máy chủ hiện tại đã tăng lên (khác với phiên bản bạn đang giữ trên màn
              hình). Để tránh vô tình ghi đè hoặc làm mất dữ liệu của đồng đội, thao tác vừa rồi đã
              được chặn lại.
            </p>
            {elementId && (
              <div className='text-xs font-mono text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded'>
                {entityType ? `${entityType} ID:` : 'Element ID:'} {elementId}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className='p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 font-mono text-xs'>
              Thông báo máy chủ: {errorMessage}
            </div>
          )}

          <p className='text-[#555555] font-medium'>
            Chọn cách bạn muốn xử lý xung đột này:
          </p>

          <div className='space-y-2 pt-1'>
            {/* Option 1: Reload */}
            <button
              onClick={() => {
                onReload();
                onClose();
              }}
              className='w-full p-3 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left flex items-center justify-between group transition-all cursor-pointer'
            >
              <div>
                <div className='font-bold text-blue-900 flex items-center gap-1.5'>
                  <RefreshCw className='w-3.5 h-3.5 text-blue-600 group-hover:rotate-180 transition-transform duration-300' />
                  <span>Tải lại dữ liệu mới nhất (Khuyên dùng)</span>
                </div>
                <div className='text-xs text-blue-700 mt-0.5'>
                  Cập nhật canvas với dữ liệu mới nhất từ máy chủ để bạn thấy chính xác thay đổi của
                  người khác.
                </div>
              </div>
              <ArrowRight className='w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform' />
            </button>

            {/* Option 2: Force Overwrite (if supported) */}
            {onForceOverwrite && (
              <button
                onClick={() => {
                  onForceOverwrite();
                  onClose();
                }}
                className='w-full p-3 bg-red-50/50 hover:bg-red-100/60 border border-red-200 rounded-xl text-left flex items-center justify-between group transition-all cursor-pointer'
              >
                <div>
                  <div className='font-bold text-red-900'>Ghi đè bằng thay đổi của tôi</div>
                  <div className='text-xs text-red-700 mt-0.5'>
                    Buộc gửi lại thao tác của bạn lên phiên bản mới nhất trên máy chủ.
                  </div>
                </div>
                <ArrowRight className='w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform' />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end pt-2 border-t border-[#E7E7E7]'>
          <button
            onClick={onClose}
            className='px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConflictResolutionModal = ElementConflictModal;
export default ElementConflictModal;
