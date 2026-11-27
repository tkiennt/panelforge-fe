import React, { useState, useEffect, useCallback } from 'react';
import { Globe, CheckCircle2, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';
import {
  chapterEditionService,
  type ChapterEditionDto,
  type EditionStatus,
} from '@/services/chapter-edition.service';
import type { ChapterDto } from '@/services/chapter.service';

export interface ChapterEditionsModalProps {
  isOpen: boolean;
  chapter: ChapterDto | null;
  onClose: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const STATUS_CONFIG: Record<EditionStatus, { bg: string; text: string; border: string }> = {
  Draft: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
  InReview: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  EditorApproved: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  Approved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  Published: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export const ChapterEditionsModal: React.FC<ChapterEditionsModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation('production');
  const [editions, setEditions] = useState<ChapterEditionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reopenModal, setReopenModal] = useState<{ lang: string; isOpen: boolean }>({
    lang: '',
    isOpen: false,
  });
  const [reopenReason, setReopenReason] = useState('');

  const loadEditions = useCallback(async () => {
    if (!chapter?.id) return;
    setLoading(true);
    try {
      const data = await chapterEditionService.getChapterEditions(chapter.id);
      setEditions(data);
    } catch (err: any) {
      onShowToast?.(t('producer.chapterEditionsModal.loadError'), err.message);
    } finally {
      setLoading(false);
    }
  }, [chapter?.id, onShowToast, t]);

  useEffect(() => {
    if (isOpen && chapter?.id) {
      loadEditions();
    }
  }, [isOpen, chapter?.id, loadEditions]);

  if (!isOpen || !chapter) return null;

  const handleApproveEdition = async (lang: string) => {
    setActionLoading(`approve-${lang}`);
    try {
      await chapterEditionService.approveEdition(chapter.id, lang);
      onShowToast?.(
        t('producer.chapterEditionsModal.approveToastTitle'),
        t('producer.chapterEditionsModal.approveToastDesc', { lang: lang.toUpperCase() }),
      );
      await loadEditions();
    } catch (err: any) {
      onShowToast?.(t('producer.chapterEditionsModal.approveError'), err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      onShowToast?.(
        t('producer.chapterEditionsModal.reopenReasonRequiredTitle'),
        t('producer.chapterEditionsModal.reopenReasonRequiredDesc'),
      );
      return;
    }
    const lang = reopenModal.lang;
    setActionLoading(`reopen-${lang}`);
    try {
      await chapterEditionService.reopenEdition(chapter.id, lang, { reason: reopenReason.trim() });
      onShowToast?.(
        t('producer.chapterEditionsModal.reopenToastTitle'),
        t('producer.chapterEditionsModal.reopenToastDesc', { lang: lang.toUpperCase() }),
      );
      setReopenModal({ lang: '', isOpen: false });
      setReopenReason('');
      await loadEditions();
    } catch (err: any) {
      onShowToast?.(t('producer.chapterEditionsModal.reopenError'), err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size='xl'
        backdropTestId='chapter-editions-modal'
        data-testid='chapter-editions-modal'
        closeLabel={t('producer.chapterEditionsModal.close')}
        title={
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0'>
              <Globe className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-base font-bold font-serif text-stone-900'>
                {t('producer.chapterEditionsModal.title', { chapterNumber: chapter.chapterNumber })}
              </h2>
              <p className='text-xs text-stone-500 font-sans font-normal'>
                {t('producer.chapterEditionsModal.subtitle', {
                  title: chapter.title || t('producer.chapterEditionsModal.untitled'),
                })}
              </p>
            </div>
          </div>
        }
        footer={
          <div className='flex items-center justify-between w-full text-xs text-stone-500'>
            <p>
              {t('producer.chapterEditionsModal.footerNotePrefix')}
              <strong>{t('producer.chapterEditionsModal.footerNoteStrong')}</strong>
              {t('producer.chapterEditionsModal.footerNoteSuffix')}
            </p>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={loadEditions}
                disabled={loading}
                className='px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50'
                title={t('producer.chapterEditionsModal.refreshTitle')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{t('common.actions.refresh')}</span>
              </button>
              <button
                type='button'
                onClick={onClose}
                className='px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs'
              >
                {t('producer.chapterEditionsModal.close')}
              </button>
            </div>
          </div>
        }
      >
        <div className='space-y-4'>
          {/* Content Table */}
          <div className='border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden'>
            {loading && editions.length === 0 ? (
              <div className='p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2'>
                <RefreshCw className='w-4 h-4 animate-spin text-orange-600' />
                <span>{t('producer.chapterEditionsModal.loading')}</span>
              </div>
            ) : editions.length === 0 ? (
              <div className='p-8 text-center text-xs text-stone-500'>
                {t('producer.chapterEditionsModal.empty')}
              </div>
            ) : (
              <table className='w-full text-left text-xs border-collapse'>
                <thead>
                  <tr className='bg-stone-50 border-b border-stone-200 text-stone-600 font-mono'>
                    <th className='py-2.5 px-4 font-semibold'>
                      {t('producer.chapterEditionsModal.colLanguage')}
                    </th>
                    <th className='py-2.5 px-3 font-semibold'>
                      {t('producer.chapterEditionsModal.colStatus')}
                    </th>
                    <th className='py-2.5 px-3 font-semibold'>
                      {t('producer.chapterEditionsModal.colTranslator')}
                    </th>
                    <th className='py-2.5 px-3 font-semibold'>
                      {t('producer.chapterEditionsModal.colApprover')}
                    </th>
                    <th className='py-2.5 px-3 font-semibold'>
                      {t('producer.chapterEditionsModal.colVersion')}
                    </th>
                    <th className='py-2.5 px-4 font-semibold text-right'>
                      {t('producer.chapterEditionsModal.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-stone-100'>
                  {editions.map((ed) => {
                    const cfg = STATUS_CONFIG[ed.status] || STATUS_CONFIG.Draft;
                    const langName =
                      LANGUAGE_NAMES[ed.languageCode.toLowerCase()] || ed.languageCode;
                    const isApproveBusy = actionLoading === `approve-${ed.languageCode}`;
                    const canApprove = ed.status === 'EditorApproved';
                    const canReopen =
                      ed.status === 'Approved' ||
                      ed.status === 'Published' ||
                      ed.status === 'EditorApproved';

                    return (
                      <tr
                        key={ed.languageCode}
                        data-testid={`edition-row-${ed.languageCode}`}
                        className='hover:bg-stone-50/80 transition-colors'
                      >
                        <td className='py-3 px-4'>
                          <div className='flex items-center gap-2'>
                            <span className='font-bold text-stone-900 uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-xs'>
                              {ed.languageCode}
                            </span>
                            <span className='text-stone-700 font-medium'>{langName}</span>
                          </div>
                        </td>
                        <td className='py-3 px-3'>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {t(`producer.chapterEditionsModal.status.${ed.status}`)}
                          </span>
                        </td>
                        <td className='py-3 px-3 text-stone-600'>{ed.translatorName || '—'}</td>
                        <td className='py-3 px-3 text-stone-600'>{ed.approvedByName || '—'}</td>
                        <td className='py-3 px-3 font-mono text-stone-500'>v{ed.version}</td>
                        <td className='py-3 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            {canApprove && (
                              <button
                                type='button'
                                onClick={() => handleApproveEdition(ed.languageCode)}
                                disabled={Boolean(actionLoading)}
                                data-testid={`approve-edition-${ed.languageCode}`}
                                className='px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50'
                                title={t('producer.chapterEditionsModal.approveTooltip')}
                              >
                                <CheckCircle2 className='w-3.5 h-3.5' />
                                <span>
                                  {isApproveBusy
                                    ? t('producer.chapterEditionsModal.approving')
                                    : t('producer.chapterEditionsModal.approveBtn')}
                                </span>
                              </button>
                            )}
                            {canReopen && (
                              <button
                                type='button'
                                onClick={() =>
                                  setReopenModal({ lang: ed.languageCode, isOpen: true })
                                }
                                disabled={Boolean(actionLoading)}
                                data-testid={`reopen-edition-${ed.languageCode}`}
                                className='px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50'
                                title={t('producer.chapterEditionsModal.reopenTooltip')}
                              >
                                <RotateCcw className='w-3.5 h-3.5 text-amber-600' />
                                <span>{t('producer.chapterEditionsModal.reopenBtn')}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* Reopen Reason Prompt Modal */}
      {reopenModal.isOpen && (
        <Modal
          isOpen={reopenModal.isOpen}
          onClose={() => {
            setReopenModal({ lang: '', isOpen: false });
            setReopenReason('');
          }}
          size='sm'
          data-testid='reopen-edition-modal'
          backdropTestId='reopen-edition-modal'
          closeLabel={t('producer.chapterEditionsModal.close')}
          title={
            <div className='flex items-center gap-2 text-amber-600'>
              <AlertTriangle className='w-5 h-5 shrink-0' />
              <h3 className='font-bold text-base text-stone-900'>
                {t('producer.chapterEditionsModal.reopenModalTitle', {
                  lang: reopenModal.lang.toUpperCase(),
                })}
              </h3>
            </div>
          }
          footer={
            <div className='flex justify-end gap-2 w-full'>
              <button
                type='button'
                onClick={() => {
                  setReopenModal({ lang: '', isOpen: false });
                  setReopenReason('');
                }}
                className='px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer'
              >
                {t('producer.chapterEditionsModal.cancel')}
              </button>
              <button
                type='button'
                onClick={handleConfirmReopen}
                disabled={!reopenReason.trim()}
                className='px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50'
              >
                {t('producer.chapterEditionsModal.confirmReopen')}
              </button>
            </div>
          }
        >
          <div className='space-y-3'>
            <p className='text-xs text-stone-600'>
              {t('producer.chapterEditionsModal.reopenModalDescPrefix')}
              <strong>{t('producer.chapterEditionsModal.reopenModalDescStrong')}</strong>
              {t('producer.chapterEditionsModal.reopenModalDescSuffix')}
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={t('producer.chapterEditionsModal.reopenPlaceholder')}
              className='w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-stone-900'
              autoFocus
            />
          </div>
        </Modal>
      )}
    </>
  );
};
