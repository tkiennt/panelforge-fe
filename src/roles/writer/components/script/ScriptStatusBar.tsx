import React from 'react';
import { AlertTriangle, Clock, Eye, Lock, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface ScriptStatusBarProps {
  concurrencyError?: string | null;
  onClearConcurrencyError?: () => void;
  onReloadWorkingCopy?: () => void;
  isScriptFrozen?: boolean;
  isScriptInReview?: boolean;
  isChapterLocked?: boolean;
  canEditScript?: boolean;
  isSubmitBlocked?: boolean;
  isStartBlocked?: boolean;
  onOpenStatusDrawer?: () => void;
  onOpenCharactersDrawer?: () => void;
}

export const ScriptStatusBar: React.FC<ScriptStatusBarProps> = ({
  concurrencyError,
  onClearConcurrencyError,
  onReloadWorkingCopy,
  isScriptFrozen,
  isScriptInReview,
  isChapterLocked,
  canEditScript = true,
  isSubmitBlocked,
  isStartBlocked,
  onOpenStatusDrawer,
  onOpenCharactersDrawer,
}) => {
  const { t } = useTranslation('production');

  const hasAnyBanner = Boolean(
    concurrencyError ||
      isScriptFrozen ||
      isScriptInReview ||
      isChapterLocked ||
      !canEditScript ||
      isSubmitBlocked ||
      isStartBlocked,
  );

  if (!hasAnyBanner) return null;

  return (
    <div
      data-testid='script-status-bar'
      className='px-4 py-1.5 bg-white/95 border-b border-stone-200/80 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap shadow-2xs'
    >
      {/* Trạng thái 409 hoặc trạng thái chương (1 chip duy nhất) */}
      <div className='flex items-center gap-2 min-w-0'>
        {concurrencyError ? (
          <div
            role='alert'
            data-testid='concurrency-error-banner'
            className='inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200'
          >
            <AlertTriangle className='w-3.5 h-3.5 text-rose-600 shrink-0' />
            <span className='truncate'>{concurrencyError}</span>
            {onReloadWorkingCopy && (
              <button
                type='button'
                data-testid='reload-working-copy-btn'
                onClick={onReloadWorkingCopy}
                className='inline-flex items-center gap-1 rounded-full bg-rose-600 hover:bg-rose-700 px-2.5 py-0.5 text-xs font-semibold text-white cursor-pointer transition-colors ml-1 shrink-0'
              >
                <RefreshCw className='w-3 h-3' />
                <span>{t('scriptStudio.save.reloadLatest', 'Tải lại')}</span>
              </button>
            )}
          </div>
        ) : isScriptFrozen ? (
          <div
            data-testid='script-frozen-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300'
          >
            <Lock className='w-3.5 h-3.5 text-stone-500' />
            <span>{t('scriptStudio.statusDrawer.frozenChip', 'Đã đóng băng')}</span>
          </div>
        ) : isScriptInReview ? (
          <div
            data-testid='script-in-review-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300'
          >
            <Clock className='w-3.5 h-3.5 text-amber-600' />
            <span>{t('scriptStudio.statusDrawer.inReview', 'Kịch bản đang được Editor thẩm định')}</span>
          </div>
        ) : isChapterLocked ? (
          <div
            data-testid='chapter-locked-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200'
          >
            <Lock className='w-3.5 h-3.5 text-stone-400' />
            <span>{t('scriptStudio.statusDrawer.locked', 'Chương đang sản xuất (khóa chỉnh sửa)')}</span>
          </div>
        ) : !canEditScript ? (
          <div
            data-testid='role-view-only-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200'
          >
            <Eye className='w-3.5 h-3.5 text-blue-500' />
            <span>{t('scriptStudio.statusDrawer.viewOnly', 'Chế độ chỉ xem')}</span>
          </div>
        ) : null}
      </div>

      {/* Cụm lý do chặn cạnh nút Gửi duyệt (Submit-blocked / Start-blocked) */}
      <div className='flex items-center gap-2 shrink-0'>
        {isSubmitBlocked && (
          <div
            data-testid='submit-blocked-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300'
          >
            <AlertTriangle className='w-3.5 h-3.5 text-rose-600 shrink-0' />
            <span>
              {t(
                'scriptStudio.statusDrawer.submitBlocked',
                'Chặn gửi duyệt: nhân vật nháp chưa liên kết',
              )}
            </span>
            {onOpenCharactersDrawer && (
              <button
                type='button'
                onClick={onOpenCharactersDrawer}
                className='underline text-rose-900 hover:text-rose-950 font-bold ml-1 cursor-pointer'
              >
                {t('scriptStudio.statusDrawer.openCast', 'Mở Cast')}
              </button>
            )}
          </div>
        )}
        {isStartBlocked && !isSubmitBlocked && (
          <div
            data-testid='start-blocked-chip'
            className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300'
          >
            <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0' />
            <span>
              {t('scriptStudio.statusDrawer.startBlocked', 'Chưa có phân cảnh nào để gửi duyệt')}
            </span>
          </div>
        )}

        {onOpenStatusDrawer && (
          <button
            type='button'
            onClick={onOpenStatusDrawer}
            className='text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer ml-1'
          >
            {t('scriptStudio.statusDrawer.viewDetails', 'Xem chi tiết')}
          </button>
        )}
        {concurrencyError && onClearConcurrencyError && (
          <button
            type='button'
            onClick={onClearConcurrencyError}
            className='text-rose-400 hover:text-rose-700 cursor-pointer p-0.5'
            title={t('common.close', 'Đóng')}
          >
            <X className='w-3.5 h-3.5' />
          </button>
        )}
      </div>
    </div>
  );
};
