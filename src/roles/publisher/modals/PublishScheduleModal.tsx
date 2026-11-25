import React, { useEffect, useState } from 'react';
import { Send, Calendar, Clock, Loader2, Sparkles } from 'lucide-react';
import { chapterService } from '@/services/chapter.service';
import {
  monetizationService,
  type ChapterLanguageStatusDto,
  type ChapterManageDto,
  type ContentLanguage,
} from '@/services/payment.service';
import { seriesService } from '@/services/series.service';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface PublishScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  onSuccess: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const PublishScheduleModal: React.FC<PublishScheduleModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
  onSuccess,
  onShowToast,
}) => {
  const { t, lang } = useTranslation('publisher');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState(() => {
    // Default to tomorrow at 09:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // D4: ấn bản ngôn ngữ gốc phải được chốt Free/Trả phí trước khi chương phát hành
  const [manage, setManage] = useState<ChapterManageDto | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState<ContentLanguage>('vi');
  const [priceType, setPriceType] = useState<'free' | 'paid' | null>(null);
  const [price, setPrice] = useState('');
  const [previewPages, setPreviewPages] = useState(1);

  useEffect(() => {
    if (!isOpen || !chapterId) return;
    let alive = true;
    (async () => {
      try {
        const m = await monetizationService.getChapterManage(chapterId);
        if (!alive) return;
        setManage(m);
        const series = await seriesService.getSeriesById(m.seriesId).catch(() => null);
        if (alive && series?.originalLanguage) {
          setOriginalLanguage(series.originalLanguage as ContentLanguage);
        }
      } catch {
        // Không đọc được cấu hình giá: BE vẫn chặn phát hành nếu chưa đặt giá (D4)
      }
    })();
    return () => {
      alive = false;
    };
  }, [isOpen, chapterId]);

  const originalEdition: ChapterLanguageStatusDto | undefined = manage?.languages.find(
    (l) => l.language === originalLanguage,
  );
  const needsPricing = !!manage && !originalEdition?.isMonetizationConfigured;
  const pageCount = manage?.pages.length ?? 0;
  const priceNumber = Number(price);
  const pricingError = !needsPricing
    ? null
    : priceType === null
      ? t('scheduleModal.pricingRequired')
      : priceType === 'paid' &&
          !(
            Number.isInteger(priceNumber) &&
            priceNumber >= (manage?.minPriceVnd ?? 1) &&
            priceNumber <= (manage?.maxPriceVnd ?? Number.MAX_SAFE_INTEGER)
          )
        ? t('scheduleModal.priceInvalid', {
            min: manage?.minPriceVnd ?? 0,
            max: manage?.maxPriceVnd ?? 0,
          })
        : priceType === 'paid' && !(previewPages >= 0 && previewPages < pageCount)
          ? t('scheduleModal.previewInvalid', { max: Math.max(0, pageCount - 1) })
          : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let isoUtc: string | null = null;
      if (publishMode === 'schedule') {
        const selected = new Date(scheduleDate);
        if (isNaN(selected.getTime())) {
          setError(t('scheduleModal.invalidTime'));
          setLoading(false);
          return;
        }
        if (selected.getTime() <= Date.now() + 60000) {
          setError(t('scheduleModal.futureTimeRequired'));
          setLoading(false);
          return;
        }
        isoUtc = selected.toISOString();
      }

      if (needsPricing) {
        if (pricingError) {
          setError(pricingError);
          setLoading(false);
          return;
        }
        await monetizationService.setEditionMonetization(chapterId, originalLanguage, {
          isPaid: priceType === 'paid',
          priceVnd: priceType === 'paid' ? priceNumber : 0,
          freePreviewPages: priceType === 'paid' ? previewPages : 0,
        });
      }

      await chapterService.publishChapter(chapterId, isoUtc);

      if (publishMode === 'now') {
        onShowToast?.(
          t('scheduleModal.publishSuccessTitle'),
          t('scheduleModal.publishSuccessDesc', { chapterNumber }),
        );
      } else {
        onShowToast?.(
          t('scheduleModal.scheduleSuccessTitle'),
          t('scheduleModal.scheduleSuccessDesc', {
            chapterNumber,
            date: new Date(scheduleDate).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN'),
          }),
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t('scheduleModal.publishError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      title={t('scheduleModal.title')}
      description={t('scheduleModal.description', {
        chapterNumber,
        title: chapterTitle || t('scheduleModal.untitled'),
      })}
      closeLabel={t('common.actions.close')}
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {error && (
          <div className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'>
            {error}
          </div>
        )}

        <div className='space-y-2'>
          <label className='block text-xs font-bold text-[#1C1917]'>
            {t('scheduleModal.releaseModeLabel')}
          </label>
          <div className='grid grid-cols-2 gap-2.5'>
            <button
              type='button'
              onClick={() => setPublishMode('now')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                publishMode === 'now'
                  ? 'border-[#F97316] bg-[#FFF2E6] ring-1 ring-[#F97316]'
                  : 'border-[#D8D2C5] hover:border-[#F97316]/60 bg-[#FCFBF8]'
              }`}
            >
              <div className='flex items-center gap-1.5 font-bold text-xs text-[#1C1917]'>
                <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
                <span>{t('scheduleModal.publishNow')}</span>
              </div>
              <span className='text-[10px] text-[#57534E] leading-relaxed'>
                {t('scheduleModal.publishNowDesc')}
              </span>
            </button>

            <button
              type='button'
              onClick={() => setPublishMode('schedule')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                publishMode === 'schedule'
                  ? 'border-[#F97316] bg-[#FFF2E6] ring-1 ring-[#F97316]'
                  : 'border-[#D8D2C5] hover:border-[#F97316]/60 bg-[#FCFBF8]'
              }`}
            >
              <div className='flex items-center gap-1.5 font-bold text-xs text-[#1C1917]'>
                <Calendar className='w-3.5 h-3.5 text-[#C2410C]' />
                <span>{t('scheduleModal.scheduleRelease')}</span>
              </div>
              <span className='text-[10px] text-[#57534E] leading-relaxed'>
                {t('scheduleModal.scheduleReleaseDesc')}
              </span>
            </button>
          </div>
        </div>

        {publishMode === 'schedule' && (
          <div className='space-y-1.5 p-3.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl animate-in fade-in duration-150'>
            <label className='block text-xs font-semibold text-[#1C1917] flex items-center gap-1.5'>
              <Clock className='w-3.5 h-3.5 text-[#F97316]' />
              <span>{t('scheduleModal.selectDateTime')}</span>
            </label>
            <input
              type='datetime-local'
              required
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className='w-full px-3 py-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#F97316]'
            />
            <p className='text-[10px] text-[#57534E] mt-1'>{t('scheduleModal.utcNotice')}</p>
          </div>
        )}

        {manage && (
          <div className='space-y-2' data-testid='publish-pricing-section'>
            <label className='block text-xs font-bold text-[#1C1917]'>
              {t('scheduleModal.pricingLabel', { lang: originalLanguage.toUpperCase() })}
            </label>
            {!needsPricing && originalEdition ? (
              <p className='text-xs text-[#57534E]' data-testid='publish-pricing-summary'>
                {originalEdition.isPaid
                  ? t('scheduleModal.pricingPaidSummary', {
                      price: originalEdition.priceVnd.toLocaleString(
                        lang === 'en' ? 'en-US' : 'vi-VN',
                      ),
                      preview: originalEdition.freePreviewPages,
                    })
                  : t('scheduleModal.pricingFreeSummary')}
              </p>
            ) : (
              <>
                <div className='grid grid-cols-2 gap-2.5'>
                  {(['free', 'paid'] as const).map((type) => (
                    <button
                      key={type}
                      type='button'
                      data-testid={`publish-pricing-${type}`}
                      aria-pressed={priceType === type}
                      disabled={type === 'paid' && pageCount < 2}
                      onClick={() => setPriceType(type)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        priceType === type
                          ? 'border-[#F97316] bg-[#FFF2E6] ring-1 ring-[#F97316]'
                          : 'border-[#D8D2C5] hover:border-[#F97316]/60 bg-[#FCFBF8]'
                      }`}
                    >
                      {type === 'free'
                        ? t('scheduleModal.pricingFree')
                        : t('scheduleModal.pricingPaid')}
                    </button>
                  ))}
                </div>
                {priceType === 'paid' && (
                  <div className='grid grid-cols-2 gap-2.5'>
                    <label className='flex flex-col gap-1 text-[11px] text-[#57534E]'>
                      {t('scheduleModal.priceLabel')}
                      <input
                        type='number'
                        inputMode='numeric'
                        data-testid='publish-pricing-price'
                        min={manage.minPriceVnd}
                        max={manage.maxPriceVnd}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className='px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] text-xs font-mono'
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-[#57534E]'>
                      {t('scheduleModal.previewLabel', { total: pageCount })}
                      <input
                        type='number'
                        inputMode='numeric'
                        data-testid='publish-pricing-preview'
                        min={0}
                        max={Math.max(0, pageCount - 1)}
                        value={previewPages}
                        onChange={(e) => setPreviewPages(Number(e.target.value))}
                        className='px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] text-xs font-mono'
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className='p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed'>
          <strong>{t('scheduleModal.importantNoteLabel')}</strong>{' '}
          {t('scheduleModal.importantNoteBefore')} <code>Published</code>{' '}
          {t('scheduleModal.importantNoteAfter')}
        </div>

        {/* Action buttons */}
        <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-3.5 py-1.5 text-xs text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] rounded-xl border border-[#D8D2C5] transition-colors cursor-pointer'
          >
            {t('common.actions.cancel')}
          </button>
          <button
            type='submit'
            data-testid='publish-submit'
            disabled={loading || (needsPricing && priceType === null)}
            className='px-4 py-1.5 text-xs font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer active:scale-95'
          >
            {loading ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Send className='w-3.5 h-3.5' />
            )}
            <span>
              {publishMode === 'now'
                ? t('scheduleModal.confirmPublish')
                : t('scheduleModal.confirmSchedule')}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
