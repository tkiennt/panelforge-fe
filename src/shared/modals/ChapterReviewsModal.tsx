import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCcw,
  Clock,
  Calendar,
} from 'lucide-react';
import { chapterService, ChapterReviewDto, ChapterReviewAction } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

interface ChapterReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
}

export const ChapterReviewsModal: React.FC<ChapterReviewsModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
}) => {
  const { t, lang } = useTranslation();
  const [reviews, setReviews] = useState<ChapterReviewDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    chapterService
      .getChapterReviews(chapterId)
      .then((data) => {
        if (mounted) {
          setReviews(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || t('common.modals.chapterReviews.loadError'));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, chapterId, t]);

  if (!isOpen) return null;

  const getActionConfig = (action: ChapterReviewAction) => {
    switch (action) {
      case 'ProducerApproved':
        return {
          label: t('common.modals.chapterReviews.actions.producerApprovedLabel'),
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          dotBg: 'bg-emerald-500',
          icon: <CheckCircle2 className='w-4 h-4 text-emerald-600' />,
          desc: t('common.modals.chapterReviews.actions.producerApprovedDesc'),
        };
      case 'ProducerReopened':
        return {
          label: t('common.modals.chapterReviews.actions.producerReopenedLabel'),
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          dotBg: 'bg-amber-500',
          icon: <RotateCcw className='w-4 h-4 text-amber-600' />,
          desc: t('common.modals.chapterReviews.actions.producerReopenedDesc'),
        };
      case 'PublisherRejected':
        return {
          label: t('common.modals.chapterReviews.actions.publisherRejectedLabel'),
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          dotBg: 'bg-rose-500',
          icon: <AlertTriangle className='w-4 h-4 text-rose-600' />,
          desc: t('common.modals.chapterReviews.actions.publisherRejectedDesc'),
        };
      case 'PublisherPublished':
        return {
          label: t('common.modals.chapterReviews.actions.publisherPublishedLabel'),
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          dotBg: 'bg-indigo-500',
          icon: <Send className='w-4 h-4 text-indigo-600' />,
          desc: t('common.modals.chapterReviews.actions.publisherPublishedDesc'),
        };
      default:
        return {
          label: action,
          color: 'text-neutral-700 bg-neutral-50 border-neutral-200',
          dotBg: 'bg-neutral-500',
          icon: <Clock className='w-4 h-4 text-neutral-600' />,
          desc: t('common.modals.chapterReviews.actions.defaultDesc'),
        };
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='lg'
      title={t('common.modals.chapterReviews.title')}
    >
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center'>
              <History className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>
                {t('common.modals.chapterReviews.title')}
              </h3>
              <p className='text-xs text-[#737373]'>
                {t('common.modals.chapterReviews.chapterSubtitle', {
                  number: chapterNumber,
                  title: chapterTitle || t('common.modals.chapterReviews.untitled'),
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto flex-1 custom-scrollbar'>
          {loading && (
            <div className='py-12 flex flex-col items-center justify-center text-xs text-[#888888] gap-2'>
              <Clock className='w-5 h-5 animate-spin text-orange-500' />
              <span>{t('common.modals.chapterReviews.loading')}</span>
            </div>
          )}

          {error && (
            <div className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'>
              {error}
            </div>
          )}

          {!loading && !error && reviews.length === 0 && (
            <div className='py-12 text-center text-xs text-[#888888]'>
              {t('common.modals.chapterReviews.empty')}
            </div>
          )}

          {!loading && !error && reviews.length > 0 && (
            <div className='relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E7E7]'>
              {reviews.map((rev) => {
                const config = getActionConfig(rev.action);
                return (
                  <div key={rev.id} className='relative group'>
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${config.dotBg}`}
                    />

                    <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3.5 space-y-2 group-hover:border-neutral-400 transition-colors'>
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          <span className='text-xs text-[#888888] font-mono'>
                            v.{rev.chapterVersion}
                          </span>
                        </div>
                        <span className='text-xs text-[#737373] font-mono'>
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>

                      <p className='text-xs text-[#555555]'>{config.desc}</p>

                      {rev.comment && (
                        <div className='p-2.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] mt-1 space-y-0.5'>
                          <div className='text-xs font-bold text-[#888888] uppercase tracking-wider'>
                            {t('common.modals.chapterReviews.commentLabel')}
                          </div>
                          <p className='whitespace-pre-wrap leading-relaxed'>{rev.comment}</p>
                        </div>
                      )}

                      {rev.scheduledAt && (
                        <div className='flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2 font-medium'>
                          <Calendar className='w-3.5 h-3.5 shrink-0' />
                          <span>
                            {t('common.modals.chapterReviews.scheduledAt')}{' '}
                            <strong>{formatDate(rev.scheduledAt)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-3 bg-[#FAF8F4] border-t border-[#E7E7E7] flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            {t('common.actions.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
