import React, { useState } from 'react';
import { Check, Copy, Download, LifeBuoy } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface RecoveryCodesPanelProps {
  codes: string[];
  /** Người dùng xác nhận đã lưu mã (bắt buộc trước khi đóng). */
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
}

/** Hiển thị bộ mã khôi phục 2FA đúng một lần: sao chép, tải .txt, xác nhận đã lưu. */
export const RecoveryCodesPanel: React.FC<RecoveryCodesPanelProps> = ({
  codes,
  acknowledged,
  onAcknowledgedChange,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard: mã vẫn chọn được để chép tay hoặc tải file
    }
  };

  const handleDownload = () => {
    const blob = new Blob([`${t('profile.twoFactorModal.recoveryFileHeader')}\n\n${text}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'panelforge-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby='pf-2fa-recovery-title'
      className='space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left'
      data-testid='recovery-codes-panel'
    >
      <div className='flex items-start gap-2'>
        <LifeBuoy className='mt-0.5 size-4 shrink-0 text-amber-700' aria-hidden='true' />
        <div>
          <h3 id='pf-2fa-recovery-title' className='text-sm font-bold text-stone-900'>
            {t('profile.twoFactorModal.recoveryTitle')}
          </h3>
          <p className='mt-0.5 text-xs leading-relaxed text-stone-700'>
            {t('profile.twoFactorModal.recoveryDesc')}
          </p>
        </div>
      </div>

      <ol
        className='grid select-all grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-stone-200 bg-white px-4 py-3 font-mono text-sm font-semibold tracking-wider text-stone-900'
        aria-label={t('profile.twoFactorModal.recoveryTitle')}
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>

      <div className='flex flex-wrap gap-2'>
        <Button
          size='sm'
          variant='secondary'
          onClick={() => void handleCopy()}
          leadingIcon={copied ? <Check /> : <Copy />}
        >
          {copied
            ? t('profile.twoFactorModal.recoveryCopied')
            : t('profile.twoFactorModal.recoveryCopyAll')}
        </Button>
        <Button size='sm' variant='secondary' onClick={handleDownload} leadingIcon={<Download />}>
          {t('profile.twoFactorModal.recoveryDownload')}
        </Button>
      </div>

      <label className='flex cursor-pointer items-start gap-2 text-xs font-medium text-stone-800'>
        <input
          type='checkbox'
          checked={acknowledged}
          onChange={(e) => onAcknowledgedChange(e.target.checked)}
          className='mt-0.5 size-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500'
        />
        {t('profile.twoFactorModal.recoverySavedAck')}
      </label>
    </section>
  );
};
