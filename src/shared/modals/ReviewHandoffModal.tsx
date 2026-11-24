import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Smartphone, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

interface ReviewHandoffModalProps {
  token: string;
  onClose: () => void;
}

/**
 * Cầu nối Web → Mobile: QR chứa URL `/review/invite/{token}` — trình quét và ô nhập của app PanelForge Mobile
 * tự bóc tách token ở cuối URL, nên cùng một chuỗi dùng được cho cả trình duyệt lẫn app.
 */
export const ReviewHandoffModal: React.FC<ReviewHandoffModalProps> = ({ token, onClose }) => {
  const { t } = useTranslation();
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
    <Modal
      isOpen
      title={t('common.modals.reviewHandoff.title')}
      closeLabel={t('common.actions.close')}
      size='sm'
      onClose={onClose}
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
              {t('common.modals.reviewHandoff.title')}
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('common.actions.close')}
            className='w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='bg-white rounded-xl p-3 w-fit mx-auto'>
          <QRCodeSVG value={inviteUrl} size={200} level='M' data-testid='review-handoff-qr' />
        </div>

        <label className='block text-xs font-semibold text-neutral-400 mt-4 mb-1'>
          {t('common.modals.reviewHandoff.tokenLabel')}
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
            {copied === 'token'
              ? t('common.modals.reviewHandoff.copied')
              : t('common.modals.reviewHandoff.copy')}
          </button>
        </div>
        <button
          type='button'
          onClick={() => copy(inviteUrl, 'link')}
          className='mt-2 text-xs text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer'
        >
          {copied === 'link'
            ? t('common.modals.reviewHandoff.copiedLink')
            : t('common.modals.reviewHandoff.copyFullLink')}
        </button>

        <p className='mt-4 text-xs leading-relaxed text-neutral-300 bg-neutral-900/80 border border-neutral-800 rounded-lg p-3'>
          {t('common.modals.reviewHandoff.mobileHintBefore')}
          <strong>{t('common.modals.reviewHandoff.mobileHintSection')}</strong>
          {t('common.modals.reviewHandoff.mobileHintAfter')}
        </p>
      </div>
    </Modal>
  );
};

export default ReviewHandoffModal;
