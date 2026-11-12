import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, Crosshair, MessageSquareQuote, X } from 'lucide-react';
import type { ChangeRequestDto } from '@/services/assignment.service';
import { crStatus, type CrStatus } from '@/roles/editor/views/script-review/scriptReviewModel';
import { useTranslation } from '@/lib/i18n';

interface WriterChangeRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  changeRequests: ChangeRequestDto[];
  loading: boolean;
  /** Nhận xét chung Editor để lại khi trả kịch bản (assignment.lastFeedbackComment). */
  generalNote?: string | null;
  canResolve: boolean;
  /** Trả false khi BE từ chối, để giữ ô ghi chú cho người dùng sửa lại. */
  onResolve: (changeRequestId: string, note: string) => Promise<boolean>;
  onJump: (cr: ChangeRequestDto) => void;
}

const STATUS_STYLE: Record<CrStatus, string> = {
  Open: 'bg-rose-50 text-rose-800 border-rose-200',
  Resolved: 'bg-amber-50 text-amber-800 border-amber-200',
  Verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-stone-100 text-stone-600 border-stone-200',
};

const CARD_ACCENT: Record<CrStatus, string> = {
  Open: 'border-l-rose-500',
  Resolved: 'border-l-amber-500',
  Verified: 'border-l-emerald-500',
  Rejected: 'border-l-stone-300',
};

const STATUS_ORDER: Record<CrStatus, number> = { Open: 0, Resolved: 1, Verified: 2, Rejected: 3 };

export const WriterChangeRequestsDrawer: React.FC<WriterChangeRequestsDrawerProps> = ({
  isOpen,
  onClose,
  changeRequests,
  loading,
  generalNote,
  canResolve,
  onResolve,
  onJump,
}) => {
  const { t } = useTranslation('production');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const openCount = changeRequests.filter((c) => crStatus(c.status) === 'Open').length;
  const resolvedCount = changeRequests.filter((c) => crStatus(c.status) === 'Resolved').length;
  const sorted = [...changeRequests].sort(
    (a, b) =>
      STATUS_ORDER[crStatus(a.status)] - STATUS_ORDER[crStatus(b.status)] ||
      a.createdAt.localeCompare(b.createdAt),
  );

  const submitResolve = async (crId: string) => {
    setSavingId(crId);
    try {
      if (!(await onResolve(crId, (noteDrafts[crId] ?? '').trim()))) return;
      setResolvingId(null);
      setNoteDrafts((prev) => {
        const next = { ...prev };
        delete next[crId];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      data-testid='writer-change-requests-panel'
      className='w-full xl:w-[440px] 2xl:w-[480px] shrink-0 border-l border-[#D8D2C5] bg-[#FCFBF8] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200'
    >
      <div className='p-4 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0'>
            <ClipboardList className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-[#1C1917] truncate font-serif'>
              {t('writerChangeRequests.title', { count: changeRequests.length })}
            </h3>
            <p className='text-xs text-[#57534E] truncate'>
              {t('writerChangeRequests.summary', { open: openCount, resolved: resolvedCount })}
            </p>
          </div>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
          title={t('writerChangeRequests.close')}
          aria-label={t('writerChangeRequests.close')}
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      <div
        data-testid='writer-cr-gate'
        className={`px-4 py-2.5 border-b text-xs font-semibold ${
          openCount > 0
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : resolvedCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}
      >
        {openCount > 0
          ? t('writerChangeRequests.gateBlocked', { count: openCount })
          : resolvedCount > 0
            ? t('writerChangeRequests.gateAwaitingVerify', { count: resolvedCount })
            : t('writerChangeRequests.gateClear')}
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#F3F0E9]'>
        {generalNote?.trim() && (
          <div className='p-3 rounded-xl border border-stone-200/80 bg-white'>
            <p className='text-xs font-bold text-[#57534E] uppercase tracking-wide mb-1'>
              {t('writerChangeRequests.generalNote')}
            </p>
            <p className='text-sm text-[#1C1917] whitespace-pre-wrap'>{generalNote}</p>
          </div>
        )}

        {loading && changeRequests.length === 0 ? (
          <p className='text-xs text-[#57534E] text-center py-6'>
            {t('writerChangeRequests.loading')}
          </p>
        ) : sorted.length === 0 ? (
          <div className='p-6 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-2xl bg-[#FCFBF8]'>
            <CheckCircle2 className='w-6 h-6 text-emerald-500 mx-auto mb-2' />
            <p className='text-xs font-semibold text-[#1C1917]'>
              {t('writerChangeRequests.empty')}
            </p>
          </div>
        ) : (
          sorted.map((cr) => {
            const status = crStatus(cr.status);
            const anchored = !!(cr.scriptLineId || cr.sceneId);
            const isResolving = resolvingId === cr.id;
            return (
              <div
                key={cr.id}
                data-testid={`writer-cr-${cr.id}`}
                className={`p-3 rounded-xl border border-stone-200/80 border-l-4 bg-white space-y-2 ${CARD_ACCENT[status]}`}
              >
                <div className='flex items-center justify-between gap-2'>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-xs font-bold ${STATUS_STYLE[status]}`}
                  >
                    {t(`writerChangeRequests.status.${status}`)}
                  </span>
                  {anchored && (
                    <button
                      type='button'
                      onClick={() => onJump(cr)}
                      className='inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C2410C] hover:bg-[#FFF2E6] rounded-lg cursor-pointer'
                      data-testid={`writer-cr-jump-${cr.id}`}
                    >
                      <Crosshair className='w-3.5 h-3.5' />
                      {cr.scriptLineId
                        ? t('writerChangeRequests.jumpLine')
                        : t('writerChangeRequests.jumpScene')}
                    </button>
                  )}
                </div>

                <p className='text-sm text-[#1C1917] whitespace-pre-wrap'>{cr.description}</p>

                {cr.quotedText?.trim() && (
                  <div className='flex gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200/80'>
                    <MessageSquareQuote className='w-3.5 h-3.5 text-[#78716C] shrink-0 mt-0.5' />
                    <div className='min-w-0'>
                      <p className='text-xs font-semibold text-[#78716C]'>
                        {t('writerChangeRequests.quotedAt')}
                      </p>
                      <p className='text-xs text-[#57534E] italic whitespace-pre-wrap break-words'>
                        {cr.quotedText}
                      </p>
                    </div>
                  </div>
                )}

                {cr.resolutionNote?.trim() && status !== 'Open' && (
                  <p className='text-xs text-[#57534E]'>
                    <span className='font-semibold'>{t('writerChangeRequests.yourNote')}</span>{' '}
                    {cr.resolutionNote}
                  </p>
                )}
                {cr.reviewerComment?.trim() && (
                  <p className='text-xs text-[#57534E]'>
                    <span className='font-semibold'>{t('writerChangeRequests.editorReply')}</span>{' '}
                    {cr.reviewerComment}
                  </p>
                )}
                {status === 'Resolved' && (
                  <p className='text-xs text-amber-700'>
                    {t('writerChangeRequests.awaitingVerify')}
                  </p>
                )}

                {status === 'Open' &&
                  canResolve &&
                  (isResolving ? (
                    <div className='space-y-2'>
                      <textarea
                        value={noteDrafts[cr.id] ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [cr.id]: e.target.value }))
                        }
                        rows={2}
                        maxLength={2000}
                        placeholder={t('writerChangeRequests.notePlaceholder')}
                        className='w-full text-sm p-2 rounded-lg border border-stone-200/80 bg-[#FCFBF8] focus:outline-none focus:ring-2 focus:ring-orange-200'
                        data-testid={`writer-cr-note-${cr.id}`}
                      />
                      <div className='flex justify-end gap-2'>
                        <button
                          type='button'
                          onClick={() => setResolvingId(null)}
                          disabled={savingId === cr.id}
                          className='px-2.5 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] rounded-lg cursor-pointer'
                        >
                          {t('writerChangeRequests.cancel')}
                        </button>
                        <button
                          type='button'
                          onClick={() => void submitResolve(cr.id)}
                          disabled={savingId === cr.id}
                          className='px-2.5 py-1.5 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 rounded-lg cursor-pointer'
                          data-testid={`writer-cr-confirm-${cr.id}`}
                        >
                          {savingId === cr.id
                            ? t('writerChangeRequests.saving')
                            : t('writerChangeRequests.confirmResolve')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => setResolvingId(cr.id)}
                      className='w-full px-2.5 py-1.5 text-xs font-semibold text-[#C2410C] border border-orange-200 hover:bg-[#FFF2E6] rounded-lg cursor-pointer'
                      data-testid={`writer-cr-resolve-${cr.id}`}
                    >
                      {t('writerChangeRequests.markResolved')}
                    </button>
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
