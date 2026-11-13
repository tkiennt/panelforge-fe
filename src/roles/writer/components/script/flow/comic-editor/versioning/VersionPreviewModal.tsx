// src/roles/writer/components/script/flow/comic-editor/versioning/VersionPreviewModal.tsx
import React from 'react';
import { X, Eye, Clock, User, ShieldCheck, Copy, Check } from 'lucide-react';
import { ScriptVersion } from './types';

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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 sm:p-6 animate-in fade-in duration-150'>
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-[#1C1917]'>
        {/* HEADER */}
        <header className='px-6 py-4 bg-white border-b border-[#EBE7DF] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#C2410C]'>
              <Eye className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-base font-bold text-slate-900'>
                  Xem phiên bản v{version.versionNumber}
                </h2>
                <span className='text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200'>
                  {version.status}
                </span>
              </div>
              <p className='text-xs text-slate-500'>
                Lưu lúc {new Date(version.createdAt).toLocaleString('vi-VN')} · Tác giả:{' '}
                {version.createdBy}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
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
            <button
              type='button'
              onClick={onClose}
              className='p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </header>

        {/* FEEDBACK BANNER IF EXISTS */}
        {version.changeLog && (
          <div className='px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900'>
            <span className='font-bold'>Ghi chú phản hồi: </span>
            <span>{version.changeLog}</span>
          </div>
        )}

        {/* CONTENT */}
        <div className='flex-1 overflow-y-auto p-6 bg-[#F3F0E9]'>
          <div className='bg-white rounded-xl border border-[#D8D2C5] p-6 shadow-sm font-mono text-sm leading-relaxed whitespace-pre-wrap select-text'>
            {version.rawText || (
              <span className='text-slate-400 italic'>(Nội dung kịch bản trống)</span>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className='px-6 py-3 bg-white border-t border-[#EBE7DF] flex items-center justify-between text-xs text-slate-500 shrink-0'>
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
        </footer>
      </div>
    </div>
  );
};
