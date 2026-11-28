import React from 'react';
import { FlaskConical, RotateCcw, X } from 'lucide-react';
import { disableReaderMock, isReaderMockEnabled } from '@/mocks/reader/config';
import { useTranslation } from '@/lib/i18n';

/** Dải nhắc đang dùng dữ liệu mẫu (không gọi BE cho khu độc giả); chỉ hiện khi bật mock. */
export const MockDataBanner: React.FC = () => {
  const { t } = useTranslation();
  if (!isReaderMockEnabled()) return null;

  const reset = async () => {
    const { resetMockState } = await import('@/mocks/reader');
    resetMockState();
    window.location.reload();
  };

  return (
    <div className='border-b border-amber-200 bg-amber-50 text-amber-900'>
      <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-xs sm:px-6'>
        <FlaskConical className='w-3.5 h-3.5 shrink-0' aria-hidden='true' />
        <span className='font-semibold'>{t('workspace.reader.mock.title')}</span>
        <span className='text-amber-800 max-sm:hidden'>{t('workspace.reader.mock.hint')}</span>
        <span className='ml-auto flex items-center gap-1'>
          <button
            type='button'
            onClick={() => void reset()}
            className='inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 font-semibold hover:bg-amber-100'
          >
            <RotateCcw className='w-3.5 h-3.5' aria-hidden='true' />
            {t('workspace.reader.mock.reset')}
          </button>
          <button
            type='button'
            onClick={disableReaderMock}
            className='inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 font-semibold hover:bg-amber-100'
          >
            <X className='w-3.5 h-3.5' aria-hidden='true' />
            {t('workspace.reader.mock.disable')}
          </button>
        </span>
      </div>
    </div>
  );
};
