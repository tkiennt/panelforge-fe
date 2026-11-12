import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Smartphone, X } from 'lucide-react';

interface ReviewHandoffModalProps {
  token: string;
  onClose: () => void;
}

/**
 * Cầu nối Web → Mobile: QR chứa URL `/review/invite/{token}` — trình quét và ô nhập của app PanelForge Mobile
 * tự bóc tách token ở cuối URL, nên cùng một chuỗi dùng được cho cả trình duyệt lẫn app.
 */
export const ReviewHandoffModal: React.FC<ReviewHandoffModalProps> = ({ token, onClose }) => {
  const [copied, setCopied] = useState<'token' | 'link' | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/review/invite/${encodeURIComponent(token)}`;

  const copy = async (value: string, kind: 'token' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard bị chặn (HTTP / quyền trình duyệt) — người dùng vẫn có thể chọn và sao chép thủ công.
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='review-handoff-title'
      onClick={onClose}
      data-testid='review-handoff-modal'
    >
      <div
        className='w-full max-w-sm bg-[#18181B] border border-neutral-800 rounded-2xl p-5 shadow-2xl text-neutral-100'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Smartphone className='w-4 h-4 text-[#F97316]' />
            <h2 id='review-handoff-title' className='text-sm font-bold'>
              Mở trên App PanelForge Mobile
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='bg-white rounded-xl p-3 w-fit mx-auto'>
          <QRCodeSVG value={inviteUrl} size={200} level='M' data-testid='review-handoff-qr' />
        </div>

        <label className='block text-xs font-semibold text-neutral-400 mt-4 mb-1'>
          Mã token duyệt bản thảo
        </label>
        <div className='flex items-center gap-2'>
          <code className='flex-1 min-w-0 truncate px-2.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-amber-300'>
            {token}
          </code>
          <button
            type='button'
            onClick={() => copy(token, 'token')}
            className='shrink-0 px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1 cursor-pointer'
            data-testid='copy-review-token-btn'
          >
            {copied === 'token' ? (
              <Check className='w-3.5 h-3.5 text-emerald-400' />
            ) : (
              <Copy className='w-3.5 h-3.5' />
            )}
            {copied === 'token' ? 'Đã chép' : 'Copy'}
          </button>
        </div>
        <button
          type='button'
          onClick={() => copy(inviteUrl, 'link')}
          className='mt-2 text-xs text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer'
        >
          {copied === 'link' ? 'Đã sao chép liên kết' : 'Hoặc sao chép cả liên kết'}
        </button>

        <p className='mt-4 text-xs leading-relaxed text-neutral-300 bg-neutral-900/80 border border-neutral-800 rounded-lg p-3'>
          Bạn đang xem bản thảo trực tiếp trên trình duyệt. Nếu muốn dùng bút cảm ứng vẽ ghi chú
          trực tiếp lên tranh, hãy quét mã QR này từ mục <strong>“Review &amp; Cộng Tác”</strong>{' '}
          trên ứng dụng PanelForge Mobile.
        </p>
      </div>
    </div>
  );
};

export default ReviewHandoffModal;
