// src/roles/writer/components/script/flow/comic-editor/versioning/VersionPreviewModal.tsx
import React from 'react';
import { Copy, Check } from 'lucide-react';
import { ScriptVersion } from './types';
import { Modal } from '@/shared/ui';

interface VersionPreviewModalProps {
  version: ScriptVersion | null;
  onClose: () => void;
  onRestore?: (version: ScriptVersion) => void;
  canRestore?: boolean;
}

export const VersionPreviewModal: React.FC<VersionPreviewModalProps> = ({
  version,
  onClose,
  onRestore,
  canRestore = true,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!version) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(version.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={Boolean(version)}
      onClose={onClose}
      size='xl'
      closeLabel='Đóng'
      title={`Xem phiên bản v${version.versionNumber}`}
      description={`Lưu lúc ${new Date(version.createdAt).toLocaleString('vi-VN')} · Tác giả: ${version.createdBy}`}
      footer={
        <div className='flex w-full items-center justify-between text-xs text-slate-500'>
          <span>{version.rawText.split('\n').filter(Boolean).length} dòng kịch bản</span>
          <div className='flex items-center gap-3'>
            {canRestore && onRestore && (
              <button
                type='button'
                onClick={() => {
                  onRestore(version);
                  onClose();
                }}
                className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-2xs'
              >
                Khôi phục bản này vào kịch bản
              </button>
            )}
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer'
            >
              Đóng
            </button>
          </div>
        </div>
      }
    >
      <div className='mb-4 flex items-center justify-between gap-2'>
        <span className='text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200'>
          {version.status}
        </span>
        <button
          type='button'
          onClick={handleCopy}
          className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs'
        >
          {copied ? (
            <Check className='w-3.5 h-3.5 text-emerald-600' />
          ) : (
            <Copy className='w-3.5 h-3.5' />
          )}
          <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
        </button>
      </div>

      {/* FEEDBACK BANNER IF EXISTS */}
      {version.changeLog && (
        <div className='px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900'>
          <span className='font-bold'>Ghi chú phản hồi: </span>
          <span>{version.changeLog}</span>
        </div>
      )}

      {/* CONTENT */}
      <div className='bg-[#F3F0E9] p-6'>
        <div className='bg-white rounded-xl border border-[#D8D2C5] p-6 shadow-sm font-mono text-sm leading-relaxed whitespace-pre-wrap select-text'>
          {version.rawText || (
            <span className='text-slate-400 italic'>(Nội dung kịch bản trống)</span>
          )}
        </div>
      </div>
    </Modal>
  );
};
