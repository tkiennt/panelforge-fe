import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  RefreshCw,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChapterDto } from '@/services/chapter.service';
import { ChapterCastDto } from '@/services/chapterCast.service';
import { LocalDraft } from '@/lib/localDraft';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ReasonForm } from '@/shared/components/ReasonForm';

export interface ScriptStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  concurrencyError?: string | null;
  onClearConcurrencyError?: () => void;
  loadError?: string | null;
  onRetryLoadScenes?: () => void;
  isScriptFrozen?: boolean;
  currentChapter?: ChapterDto | null;
  normRole?: string;
  freezingScript?: boolean;
  unfreezeReasonOpen?: boolean;
  setUnfreezeReasonOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  handleUnfreezeScript?: (reason: string) => Promise<void>;
  tReview?: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
  isScriptInReview?: boolean;
  hasUnpushedChanges?: boolean;
  isWriterRole?: boolean;
  isChapterContentLocked?: boolean;
  submittingToEditor?: boolean;
  handleRecallScript?: () => Promise<void>;
  isSubmitBlocked?: boolean;
  chapterCast?: ChapterCastDto | null;
  isStartBlocked?: boolean;
  workspaceId?: string;
  seriesId?: string;
  isChapterLocked?: boolean;
  canEditScript?: boolean;
  restorable?: { storyArc?: LocalDraft; outline?: LocalDraft };
  storyArcDraftKey?: string;
  outlineDraftKey?: string;
  onRestoreDraft?: (kind: 'storyArc' | 'outline', text: string) => void;
  onDiscardDraft?: (kind: 'storyArc' | 'outline') => void;
  onOpenDrawer?: (drawer: 'characters' | 'narrative') => void;
  t: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
}

export const ScriptStatusDrawer: React.FC<ScriptStatusDrawerProps> = ({
  isOpen,
  onClose,
  concurrencyError,
  onClearConcurrencyError,
  loadError,
  onRetryLoadScenes,
  isScriptFrozen,
  currentChapter,
  normRole,
  freezingScript,
  unfreezeReasonOpen,
  setUnfreezeReasonOpen,
  handleUnfreezeScript,
  tReview,
  isScriptInReview,
  hasUnpushedChanges,
  isWriterRole,
  isChapterContentLocked,
  submittingToEditor,
  handleRecallScript,
  isSubmitBlocked,
  chapterCast,
  isStartBlocked,
  workspaceId,
  seriesId,
  isChapterLocked,
  canEditScript,
  restorable = {},
  storyArcDraftKey,
  outlineDraftKey,
  onRestoreDraft,
  onDiscardDraft,
  onOpenDrawer,
  t,
}) => {
  const { lang } = useTranslation('production');
  if (!isOpen) return null;

  const hasRestorable = Boolean(
    (restorable.storyArc && storyArcDraftKey) || (restorable.outline && outlineDraftKey),
  );

  const hasAnyNotice = Boolean(
    concurrencyError ||
      loadError ||
      isScriptFrozen ||
      isScriptInReview ||
      isSubmitBlocked ||
      isStartBlocked ||
      (isChapterContentLocked && !isScriptFrozen) ||
      (!canEditScript && !isChapterLocked) ||
      hasRestorable,
  );

  return (
    <aside
      data-testid='script-status-drawer'
      aria-label={t('scriptStudio.statusDrawer.title', 'Thông báo & Trạng thái')}
      className='w-full xl:w-[460px] 2xl:w-[500px] shrink-0 border-l border-stone-200/90 bg-[#FAF9F5] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200 text-stone-900 select-none'
    >
      {/* Header */}
      <div className='p-4 border-b border-stone-200/80 bg-white flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-amber-100/70 text-amber-700 rounded-xl shrink-0 border border-amber-200/60'>
            <Bell className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-stone-900 truncate font-serif'>
              {t('scriptStudio.statusDrawer.title', 'Thông báo & Trạng thái')}
            </h3>
            <p className='text-xs text-stone-500 truncate'>
              {t(
                'scriptStudio.statusDrawer.desc',
                'Cảnh báo, trạng thái kịch bản và các cổng duyệt',
              )}
            </p>
          </div>
        </div>

        <button
          type='button'
          onClick={onClose}
          className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors'
          title={t('common.close', 'Đóng')}
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Content list */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3.5'>
        {/* Offline status banner */}
        <OfflineStatusBanner className='p-3 bg-white rounded-xl border border-stone-200 text-xs shadow-xs' />

        {/* Khôi phục bản nháp */}
        {(['storyArc', 'outline'] as const).map((kind) => {
          const draft = restorable[kind];
          const key = kind === 'storyArc' ? storyArcDraftKey : outlineDraftKey;
          if (!draft || !key) return null;
          const label =
            kind === 'storyArc'
              ? t('scriptStudio.narrative.storyArc', 'Story Arc')
              : t('scriptStudio.narrative.outlineWithChapter', {
                  n: currentChapter?.chapterNumber ?? '',
                  defaultValue: `Đề cương Chương ${currentChapter?.chapterNumber ?? ''}`,
                });
          const formattedTime = formatDateTime(draft.savedAt);
          return (
            <div
              key={kind}
              role='status'
              data-testid={`draft-restore-${kind}`}
              className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2.5 text-xs text-amber-900 shadow-xs'
            >
              <div className='flex items-start gap-2'>
                <Clock className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                <span className='font-medium leading-relaxed'>
                  {t('scriptStudio.statusDrawer.draftNotice', {
                    label,
                    time: formattedTime,
                    defaultValue: `Có bản nháp ${label} chưa lưu lúc ${formattedTime}.`,
                  })}
                </span>
              </div>
              <div className='flex items-center gap-2 self-end'>
                <button
                  type='button'
                  onClick={() => onRestoreDraft?.(kind, draft.text)}
                  className='px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 cursor-pointer transition-colors'
                >
                  {t('scriptStudio.statusDrawer.restore', 'Khôi phục')}
                </button>
                <button
                  type='button'
                  onClick={() => onDiscardDraft?.(kind)}
                  className='px-2.5 py-1 rounded-lg border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer transition-colors'
                >
                  {t('scriptStudio.statusDrawer.discard', 'Bỏ bản nháp')}
                </button>
              </div>
            </div>
          );
        })}

        {/* Xung đột phiên bản 409 */}
        {concurrencyError && (
          <div
            data-testid='drawer-concurrency-error-banner'
            className='p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-2 text-rose-800 shadow-xs'
          >
            <div className='flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0 mt-0.5' />
              <span className='text-xs font-medium leading-relaxed'>{concurrencyError}</span>
            </div>
            {onClearConcurrencyError && (
              <button
                type='button'
                onClick={onClearConcurrencyError}
                className='text-rose-500 hover:text-rose-700 cursor-pointer p-0.5'
              >
                <X className='w-4 h-4' />
              </button>
            )}
          </div>
        )}

        {/* Lỗi tải cảnh */}
        {loadError && (
          <div className='p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 shadow-xs'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
              <span className='text-xs font-medium'>{loadError}</span>
            </div>
            {onRetryLoadScenes && (
              <button
                type='button'
                onClick={onRetryLoadScenes}
                className='text-xs font-bold text-rose-700 underline cursor-pointer'
              >
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* Kịch bản đóng băng */}
        {isScriptFrozen && (
          <div
            data-testid='script-frozen-banner'
            className='p-3.5 bg-stone-100 border border-stone-300 rounded-xl flex flex-col gap-2.5 text-stone-900 shadow-xs'
          >
            <div className='flex items-start gap-2.5'>
              <div className='w-7 h-7 rounded-lg bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0'>
                <Lock className='w-4 h-4' />
              </div>
              <div className='min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-bold text-xs uppercase tracking-wider bg-stone-200 text-stone-800 px-2 py-0.5 rounded inline-flex items-center gap-1.5'>
                    <span>🔒 Kịch bản đã chốt (chỉ đọc)</span>
                    {currentChapter?.scriptContentHash && (
                      <span
                        className='font-mono font-semibold text-xs text-stone-800 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-300'
                        title={`SHA-256: ${currentChapter.scriptContentHash}`}
                        data-testid='frozen-script-hash-badge'
                      >
                        #{currentChapter.scriptContentHash.slice(0, 8)}
                      </span>
                    )}
                  </span>
                </div>
                <p className='text-xs text-stone-700 font-medium mt-1.5'>
                  Đã chuyển giao cho Artist phác thảo (Pencil) &amp; bố cục khung.
                </p>
                <p className='text-xs text-stone-500 mt-0.5 leading-relaxed'>
                  Writer không thể sửa trực tiếp kịch bản để tránh xung đột khung tranh của hoạ sĩ. Thẻ xem nhanh vẫn dùng được qua hover hoặc Ctrl+.
                </p>
              </div>
            </div>
            {normRole === 'PRODUCER' && (
              <div className='self-end'>
                <button
                  type='button'
                  disabled={freezingScript}
                  onClick={() => setUnfreezeReasonOpen?.((open) => !open)}
                  className='px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5'
                >
                  <RefreshCw className='w-3.5 h-3.5' />
                  <span>
                    {tReview ? tReview('scriptReview.checks.unfreeze') : 'Mở khoá kịch bản'}
                  </span>
                </button>
                {unfreezeReasonOpen && handleUnfreezeScript && (
                  <ReasonForm
                    label={
                      tReview ? tReview('scriptReview.checks.unfreezeReason') : 'Lý do mở khoá'
                    }
                    confirmLabel={tReview ? tReview('scriptReview.checks.unfreeze') : 'Mở khoá'}
                    busy={freezingScript}
                    onConfirm={(reason) => void handleUnfreezeScript(reason)}
                    onCancel={() => setUnfreezeReasonOpen?.(false)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Đang chờ duyệt */}
        {isScriptInReview && (
          <div
            data-testid='script-in-review-banner'
            className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2 text-amber-950 shadow-xs'
          >
            <div className='flex items-start gap-2.5'>
              <Send className='w-4 h-4 text-amber-700 shrink-0 mt-0.5' />
              <div>
                <p className='text-xs font-semibold'>
                  {t('scriptStudio.lifecycle.inReviewTitle', 'Kịch bản đang chờ duyệt')}
                </p>
                <p className='text-xs text-amber-900/80 mt-0.5 leading-relaxed'>
                  {hasUnpushedChanges
                    ? t('scriptStudio.lifecycle.inReviewDirty', 'Có thay đổi chưa gửi duyệt lại')
                    : t(
                        'scriptStudio.lifecycle.inReviewBody',
                        'Editor đang xem xét kịch bản của chương này',
                      )}
                </p>
              </div>
            </div>
            {isWriterRole && !isChapterContentLocked && handleRecallScript && (
              <button
                type='button'
                disabled={submittingToEditor}
                onClick={() => void handleRecallScript()}
                className='self-end px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60 flex items-center gap-1.5'
              >
                <RefreshCw className='w-3.5 h-3.5' />
                {t('scriptStudio.submit.recall', 'Thu hồi kịch bản')}
              </button>
            )}
          </div>
        )}

        {/* Submit blocked (Gate) */}
        {isSubmitBlocked && chapterCast?.submitGate?.blockers && (
          <div
            data-testid='submit-blocked-banner'
            className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2.5 text-amber-900 shadow-xs'
          >
            <div className='flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
              <span className='text-xs font-medium leading-relaxed'>
                <strong>{t('scriptStudio.cast.submitBlockedBanner', 'Chưa thể gửi duyệt')}:</strong>{' '}
                Còn {chapterCast.submitGate.blockers.length} mục nháp Bible chưa được định nghĩa.
              </span>
            </div>
            <button
              type='button'
              onClick={() => onOpenDrawer?.('characters')}
              className='self-end px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer transition-colors'
            >
              {t('scriptStudio.cast.viewCast', 'Xem thực thể')}
            </button>
          </div>
        )}

        {/* Start blocked (Gate) */}
        {isStartBlocked && chapterCast?.gate?.blockers && (
          <div
            data-testid='start-blocked-banner'
            className='p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2.5 text-rose-900 shadow-xs'
          >
            <div className='flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0 mt-0.5' />
              <span className='text-xs font-medium leading-relaxed'>
                <strong>
                  {t('scriptStudio.cast.startBlockedBanner', 'Chưa thể bắt đầu sản xuất')}:
                </strong>{' '}
                Còn {chapterCast.gate.blockers.length} biến thể chưa khoá Canon.
              </span>
            </div>
            <div className='flex items-center justify-between gap-2 pt-1 border-t border-rose-200/60'>
              <Link
                to={
                  workspaceId && seriesId
                    ? `/workspaces/${workspaceId}/series/${seriesId}/bible`
                    : '#'
                }
                className='text-xs font-semibold text-rose-700 hover:text-rose-900 underline'
              >
                Mở Series Bible để duyệt Canon
              </Link>
              <button
                type='button'
                onClick={() => onOpenDrawer?.('characters')}
                className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shrink-0 cursor-pointer transition-colors'
              >
                {t('scriptStudio.cast.viewCast', 'Xem thực thể')}
              </button>
            </div>
          </div>
        )}

        {/* Chapter content locked */}
        {isChapterContentLocked && !isScriptFrozen && (
          <div
            data-testid='chapter-locked-banner'
            className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-2 text-amber-900 shadow-xs'
          >
            <div className='flex items-start gap-2'>
              <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
              <span className='text-xs font-medium leading-relaxed'>
                Chương này đã ở trạng thái <strong>{currentChapter?.status}</strong> — Kịch bản ở
                chế độ chỉ đọc để bảo vệ tính toàn vẹn sản xuất. Thẻ xem nhanh vẫn dùng được qua
                hover hoặc Ctrl+.
              </span>
            </div>
            <span className='text-xs font-bold uppercase tracking-wider bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full shrink-0'>
              Chỉ đọc
            </span>
          </div>
        )}

        {/* Role view only */}
        {!canEditScript && !isChapterLocked ? (
          <div
            data-testid='role-view-only-banner'
            className='p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-2 text-blue-900 shadow-xs'
          >
            <div className='flex items-start gap-2'>
              <Info className='w-4 h-4 text-blue-600 shrink-0 mt-0.5' />
              <span className='text-xs font-medium leading-relaxed'>
                Chế độ xem: Bạn đang xem kịch bản với quyền tham khảo. Chỉ vai trò{' '}
                <strong>Producer</strong> hoặc <strong>Writer</strong> được phân công mới có quyền
                tạo và chỉnh sửa kịch bản.
              </span>
            </div>
            <span className='text-xs font-bold uppercase tracking-wider bg-blue-200/90 text-blue-900 px-2 py-0.5 rounded-full shrink-0'>
              Tham khảo
            </span>
          </div>
        ) : null}

        {/* Empty state */}
        {!hasAnyNotice && (
          <div className='p-8 flex flex-col items-center justify-center text-center text-stone-500'>
            <div className='w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3'>
              <CheckCircle2 className='w-5 h-5' />
            </div>
            <h4 className='text-xs font-semibold text-stone-800 mb-1'>Hệ thống bình thường</h4>
            <p className='text-xs text-stone-500 max-w-xs'>
              {t(
                'scriptStudio.statusDrawer.empty',
                'Tất cả trạng thái bình thường. Không có thông báo cần xử lý.',
              )}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
