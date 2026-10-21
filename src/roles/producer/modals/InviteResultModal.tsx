import React from 'react';
import { X, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';

export interface InviteResultItem {
  email: string;
  role: string;
  success: boolean;
  message?: string;
}

export interface InviteResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: InviteResultItem[];
  workspaceName?: string;
}

export const InviteResultModal: React.FC<InviteResultModalProps> = ({
  isOpen,
  onClose,
  results,
  workspaceName,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || results.length === 0) return null;

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  const handleCopyList = () => {
    const text = results
      .map(
        (r) =>
          `${r.email} - ${r.role}: ${r.success ? 'Thành công' : `Thất bại (${r.message || 'Lỗi'})`}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center'>
              <CheckCircle2 className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>
                Kết quả gửi lời mời
              </h3>
              {workspaceName && (
                <p className='text-[11px] text-stone-500'>{workspaceName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label='Đóng'
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Summary Badges */}
        <div className='p-4 border-b border-[#E7E7E7] bg-white grid grid-cols-2 gap-3'>
          <div className='p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0'>
              {successCount}
            </div>
            <div className='text-xs'>
              <div className='font-bold text-emerald-800'>Gửi thành công</div>
              <div className='text-emerald-600 text-[11px]'>Chờ xác nhận email</div>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              failureCount > 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                failureCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-stone-200 text-stone-500'
              }`}
            >
              {failureCount}
            </div>
            <div className='text-xs'>
              <div className='font-bold'>Thất bại</div>
              <div className='text-[11px]'>
                {failureCount > 0 ? 'Kiểm tra lại email' : 'Không có lỗi'}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results List */}
        <div className='p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar text-xs'>
          <div className='text-[11px] text-stone-500 font-semibold mb-1'>
            Chi tiết ({results.length})
          </div>

          {results.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                item.success
                  ? 'bg-[#FAF8F5] border-[#E7E5E4]'
                  : 'bg-red-50/70 border-red-200'
              }`}
            >
              <div className='flex items-start gap-2.5 min-w-0'>
                {item.success ? (
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                ) : (
                  <AlertTriangle className='w-4 h-4 text-red-600 shrink-0 mt-0.5' />
                )}
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-mono font-medium text-stone-900 truncate'>
                      {item.email}
                    </span>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-stone-200 text-stone-700 font-semibold'>
                      {item.role}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      item.success ? 'text-stone-500' : 'text-red-700 font-medium'
                    }`}
                  >
                    {item.success
                      ? 'Đã gửi lời mời (Chờ xác nhận)'
                      : item.message || 'Lỗi gửi lời mời'}
                  </p>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                  item.success
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {item.success ? 'Chờ duyệt' : 'Lỗi'}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className='p-3.5 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
          <button
            type='button'
            onClick={handleCopyList}
            className='px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer'
          >
            {copied ? <Check className='w-3.5 h-3.5 text-emerald-600' /> : <Copy className='w-3.5 h-3.5 text-stone-500' />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>

          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
