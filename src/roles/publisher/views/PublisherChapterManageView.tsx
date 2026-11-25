import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Languages,
  Eye,
  Lock,
  Loader2,
  AlertTriangle,
  ImageOff,
} from 'lucide-react';
import { seriesService } from '@/services/series.service';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { useToast } from '@/shared/context/ToastContext';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  CONTENT_LANGUAGES,
  monetizationService,
  type ChapterInsightDto,
  type ChapterLanguageStatusDto,
  type ChapterManageDto,
  type ContentLanguage,
} from '@/services/payment.service';
import { LanguageFilter, StatCards } from '../components/MonetizationWidgets';
import { useMoney } from '../components/useMoney';

type Section = 'general' | 'editions';

/**
 * Publisher → bộ truyện → chương: sidebar General (số liệu chương, lọc theo ngôn ngữ) và Manage → Ấn bản & giá.
 * BR-33 / D4: mỗi ấn bản ngôn ngữ có loại Free/Trả phí, giá VNĐ và N trang đầu xem trước riêng; Publisher phải chốt
 * Free hoặc Trả phí trước khi phát hành. Mua ấn bản mở mọi trang của đúng ngôn ngữ đó.
 */
export const PublisherChapterManageView: React.FC = () => {
  const { t } = useTranslation('payments');
  const { seriesId = '', chapterId = '' } = useParams();
  const toast = useToast();
  const [section, setSection] = useState<Section>('general');
  const [manage, setManage] = useState<ChapterManageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setManage(await monetizationService.getChapterManage(chapterId));
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSaved = (next: ChapterManageDto) => {
    setManage(next);
    toast.success(t('manage.saved'), '');
  };
  const onError = (err: unknown) => toast.error(t('manage.saveError'), getApiErrorMessage(err));

  const nav: { group: string; items: { id: Section; label: string; icon: React.ReactNode }[] }[] = [
    {
      group: t('manage.sidebarGeneral'),
      items: [
        { id: 'general', label: t('manage.general'), icon: <BarChart3 className='w-4 h-4' /> },
      ],
    },
    {
      group: t('manage.sidebarManage'),
      items: [
        { id: 'editions', label: t('edition.navLabel'), icon: <Languages className='w-4 h-4' /> },
      ],
    },
  ];

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-5'>
      <div className='pb-4 border-b border-[#E7E7E7]'>
        <Link
          to={`/publisher/revenue/series/${seriesId}`}
          className='inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#171717]'
        >
          <ArrowLeft className='w-3.5 h-3.5' />
          {t('manage.backToSeries')}
        </Link>
        <h1 className='text-xl font-bold text-[#171717] tracking-tight mt-1'>
          {manage ? t('insights.chapterLabel', { number: manage.chapterNumber }) : '…'}
          {manage?.title && <span className='font-normal text-[#555555]'> · {manage.title}</span>}
        </h1>
        {manage && (
          <p className='text-xs text-[#737373]'>
            {t('manage.pagesCount', { count: manage.pages.length })}
            {!manage.isPublished && ` · ${t('insights.unpublished')}`}
          </p>
        )}
      </div>

      <div className='flex flex-col md:flex-row gap-5'>
        <nav aria-label={t('manage.sidebarManage')} className='md:w-56 shrink-0 space-y-4'>
          {nav.map((g) => (
            <div key={g.group}>
              <div className='px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]'>
                {g.group}
              </div>
              <ul className='space-y-0.5'>
                {g.items.map((it) => (
                  <li key={it.id}>
                    <button
                      type='button'
                      onClick={() => setSection(it.id)}
                      aria-current={section === it.id ? 'page' : undefined}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer ${
                        section === it.id
                          ? 'bg-[#F97316]/10 text-[#C2410C] font-semibold'
                          : 'text-[#555555] hover:bg-[#FAF8F4]'
                      }`}
                    >
                      {it.icon}
                      {it.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className='flex-1 min-w-0'>
          {error && (
            <div className='flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm'>
              <AlertTriangle className='w-4 h-4' />
              {error}
            </div>
          )}
          {loading ? (
            <div className='flex justify-center py-16 text-[#737373]'>
              <Loader2 className='w-5 h-5 animate-spin' />
            </div>
          ) : (
            manage && (
              <>
                {section === 'general' && (
                  <GeneralSection seriesId={seriesId} chapterId={chapterId} />
                )}
                {section === 'editions' && (
                  <EditionsSection
                    manage={manage}
                    onSaved={onSaved}
                    onError={onError}
                    onReload={reload}
                  />
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ─── General ──────────────────────────────────────────────────────────────────

const GeneralSection: React.FC<{ seriesId: string; chapterId: string }> = ({
  seriesId,
  chapterId,
}) => {
  const { t } = useTranslation('payments');
  const [language, setLanguage] = useState<ContentLanguage | ''>('');
  const [chapter, setChapter] = useState<ChapterInsightDto | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  useEffect(() => {
    let mounted = true;
    monetizationService
      .getSeriesInsights(seriesId, language || undefined)
      .then((res) => {
        if (!mounted) return;
        setChapter(res.chapters.find((c) => c.chapterId === chapterId) ?? null);
        setRating({ avg: res.totals.ratingAverage, count: res.totals.ratingCount });
      })
      .catch(() => mounted && setChapter(null));
    return () => {
      mounted = false;
    };
  }, [seriesId, chapterId, language]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-xs text-[#737373]'>{t('manage.generalHint')}</p>
        <LanguageFilter value={language} onChange={setLanguage} />
      </div>
      {chapter ? (
        <StatCards stats={chapter.stats} showRating={false} />
      ) : (
        <div className='flex justify-center py-10 text-[#737373]'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      )}
      <p className='text-xs text-[#737373]'>
        {t('manage.ratingSeriesOnly', { avg: rating.avg.toFixed(1), count: rating.count })}
      </p>
    </div>
  );
};

// ─── Ấn bản & giá (BR-33 / D4) ───────────────────────────────────────────────

type PricingType = 'free' | 'paid' | null;

interface Draft {
  type: PricingType;
  price: string;
  preview: number;
  reason: string;
}

const draftOf = (ed: ChapterLanguageStatusDto | undefined): Draft => ({
  type: !ed?.isMonetizationConfigured ? null : ed.isPaid ? 'paid' : 'free',
  price: ed?.isMonetizationConfigured && ed.isPaid ? String(ed.priceVnd) : '',
  preview: ed?.isMonetizationConfigured && ed.isPaid ? ed.freePreviewPages : 0,
  reason: '',
});

const PRICE_PRESETS = [5000, 10000, 15000, 20000];

const EditionsSection: React.FC<{
  manage: ChapterManageDto;
  onSaved: (d: ChapterManageDto) => void;
  onError: (e: unknown) => void;
  onReload: () => Promise<void>;
}> = ({ manage, onSaved, onError, onReload }) => {
  const { t } = useTranslation('payments');
  const { vnd } = useMoney();
  const [language, setLanguage] = useState<ContentLanguage>('vi');
  const edition = manage.languages.find((l) => l.language === language);
  const [draft, setDraft] = useState<Draft>(() => draftOf(edition));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null);

  useEffect(() => setDraft(draftOf(edition)), [edition]);

  useEffect(() => {
    let alive = true;
    seriesService
      .getSeriesById(manage.seriesId)
      .then((s) => alive && setOriginalLanguage(s?.originalLanguage ?? 'vi'))
      .catch(() => alive && setOriginalLanguage('vi'));
    return () => {
      alive = false;
    };
  }, [manage.seriesId]);

  const pageCount = manage.pages.length;
  const maxPreview = Math.max(0, pageCount - 1);
  const isPaid = draft.type === 'paid';
  const priceNumber = Number(draft.price);
  const priceValid =
    !isPaid ||
    (Number.isInteger(priceNumber) &&
      priceNumber >= manage.minPriceVnd &&
      priceNumber <= manage.maxPriceVnd);
  const previewValid =
    !isPaid || (pageCount > 0 && draft.preview >= 0 && draft.preview < pageCount);

  const saved = draftOf(edition);
  const commercialChanged =
    !!edition?.isMonetizationConfigured &&
    (draft.type !== saved.type || (isPaid && priceNumber !== edition.priceVnd));
  const changed =
    draft.type !== saved.type ||
    (isPaid && (priceNumber !== Number(saved.price) || draft.preview !== saved.preview));
  // D4: đổi loại hoặc giá của ấn bản đã phát hành cần lý do (ghi Audit).
  const needsReason = !!edition?.isAvailable && commercialChanged;
  const canSave =
    draft.type !== null &&
    changed &&
    priceValid &&
    previewValid &&
    (!needsReason || draft.reason.trim().length > 0);

  const save = async () => {
    if (!draft.type) return;
    setSaving(true);
    try {
      onSaved(
        await monetizationService.setEditionMonetization(manage.chapterId, language, {
          isPaid,
          priceVnd: isPaid ? priceNumber : 0,
          freePreviewPages: isPaid ? draft.preview : 0,
          reason: draft.reason.trim() || undefined,
        }),
      );
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  };

  // Bản gốc phát hành cùng chương ("Phát hành chương" ở bàn Publisher) để chương lên Catalog (BR-24, BR-34)
  const isOriginalBeforeRelease = !manage.isPublished && language === originalLanguage;
  const canPublish =
    !edition?.isAvailable && edition?.editionStatus === 'Approved' && !isOriginalBeforeRelease;
  const publish = async () => {
    setPublishing(true);
    try {
      await monetizationService.publishLanguageEdition(manage.chapterId, language);
      await onReload();
    } catch (err) {
      onError(err);
    } finally {
      setPublishing(false);
    }
  };

  /** Bấm trang k: xem trước đến hết trang k (bấm lại trang cuối của phần xem trước để thu về k-1). */
  const pickPreviewUntil = (index: number) =>
    setDraft((d) => {
      const next = d.preview === index + 1 ? index : index + 1;
      return { ...d, preview: Math.min(next, maxPreview) };
    });

  return (
    <div className='space-y-4'>
      <p className='text-xs text-[#737373]'>{t('edition.hint')}</p>

      <div
        role='tablist'
        aria-label={t('edition.languageTabs')}
        className='inline-flex rounded-xl border border-[#E7E7E7] bg-white p-0.5'
      >
        {CONTENT_LANGUAGES.map((l) => {
          const ed = manage.languages.find((x) => x.language === l);
          return (
            <button
              key={l}
              type='button'
              role='tab'
              aria-selected={language === l}
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
                language === l ? 'bg-[#171717] text-white' : 'text-[#555555] hover:bg-[#FAF8F4]'
              }`}
            >
              {t(`lang.${l}`)}
              {!ed?.isMonetizationConfigured && (
                <span
                  className='w-1.5 h-1.5 rounded-full bg-amber-500'
                  aria-label={t('edition.notConfigured')}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className='p-4 rounded-2xl border border-[#E7E7E7] bg-white space-y-4'>
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <span className='font-semibold text-[#171717]'>{t(`lang.${language}`)}</span>
          <span className='px-2 py-0.5 rounded-full bg-[#FAF8F4] border border-[#E7E7E7] text-[#555555]'>
            {edition?.editionStatus ?? t('edition.noEdition')}
          </span>
          {edition?.isAvailable && (
            <span className='text-emerald-700'>{t('manage.available')}</span>
          )}
          {!edition?.isMonetizationConfigured && (
            <span className='px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800'>
              {t('edition.notConfigured')}
            </span>
          )}
        </div>

        <fieldset className='space-y-2'>
          <legend className='text-sm font-semibold text-[#171717]'>{t('edition.typeLabel')}</legend>
          <div className='flex flex-wrap gap-2'>
            {(['free', 'paid'] as const).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer ${
                  draft.type === type
                    ? 'border-[#F97316] bg-[#F97316]/10 text-[#C2410C] font-semibold'
                    : 'border-[#E7E7E7] text-[#555555] hover:bg-[#FAF8F4]'
                }`}
              >
                <input
                  type='radio'
                  name={`pricing-type-${language}`}
                  value={type}
                  checked={draft.type === type}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      type,
                      price: type === 'paid' && !d.price ? '10000' : d.price,
                      preview: type === 'paid' ? Math.min(d.preview, maxPreview) : 0,
                    }))
                  }
                  className='accent-[#F97316]'
                />
                {type === 'free' ? t('edition.free') : t('edition.paid')}
              </label>
            ))}
          </div>
          {draft.type === null && <Notice>{t('edition.mustChoose')}</Notice>}
        </fieldset>

        {isPaid && (
          <div className='space-y-3 pt-3 border-t border-[#F0F0F0]'>
            <div className='flex flex-wrap items-center gap-3'>
              <label className='flex items-center gap-2 text-xs text-[#555555] font-medium'>
                {t('edition.priceLabel')}
                <input
                  type='number'
                  inputMode='numeric'
                  min={manage.minPriceVnd}
                  max={manage.maxPriceVnd}
                  step={500}
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                  aria-invalid={!priceValid}
                  className='w-32 px-2.5 py-1.5 rounded-lg border border-[#E7E7E7] font-mono text-xs focus:outline-none focus:border-[#F97316]'
                />
              </label>
              <div className='flex items-center gap-1.5 text-xs text-[#737373]'>
                <span>{t('chapterPricing.quickPick')}</span>
                {PRICE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type='button'
                    onClick={() => setDraft((d) => ({ ...d, price: String(preset) }))}
                    className={`px-2 py-1 rounded-md border text-[11px] font-mono cursor-pointer ${
                      priceNumber === preset
                        ? 'border-[#F97316] bg-[#F97316]/10 text-[#C2410C] font-bold'
                        : 'border-[#E7E7E7] bg-[#FAF8F4] text-[#555555] hover:bg-white'
                    }`}
                  >
                    {vnd(preset)}
                  </button>
                ))}
              </div>
            </div>
            {!priceValid && (
              <p className='text-xs text-rose-700'>
                {t('edition.priceRange', {
                  min: vnd(manage.minPriceVnd),
                  max: vnd(manage.maxPriceVnd),
                })}
              </p>
            )}

            <label className='flex flex-wrap items-center gap-2 text-xs text-[#555555] font-medium'>
              {t('edition.previewLabel')}
              <input
                type='number'
                inputMode='numeric'
                min={0}
                max={maxPreview}
                value={draft.preview}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    preview: Math.min(
                      maxPreview,
                      Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                    ),
                  }))
                }
                className='w-20 px-2.5 py-1.5 rounded-lg border border-[#E7E7E7] font-mono text-xs focus:outline-none focus:border-[#F97316]'
              />
              <span className='text-[#737373]'>
                {t('edition.previewSummary', {
                  preview: draft.preview,
                  locked: pageCount - draft.preview,
                })}
              </span>
            </label>
            {pageCount === 0 && <Notice>{t('edition.noPages')}</Notice>}
          </div>
        )}

        {needsReason && (
          <label className='flex flex-col gap-1 text-xs text-[#555555] font-medium'>
            {t('edition.reasonLabel')}
            <textarea
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              rows={2}
              required
              className='px-2.5 py-1.5 rounded-lg border border-[#E7E7E7] text-xs focus:outline-none focus:border-[#F97316]'
            />
            <span className='text-[#737373] font-normal'>{t('edition.reasonHint')}</span>
          </label>
        )}

        <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
          <SaveButton
            saving={saving}
            disabled={!canSave}
            onClick={save}
            label={t('edition.save')}
          />
          {isOriginalBeforeRelease && edition?.editionStatus === 'Approved' && (
            <span
              className='text-xs text-[#737373]'
              data-testid='edition-publish-with-chapter-hint'
            >
              {t('edition.publishWithChapterHint')}
            </span>
          )}
          {canPublish && (
            <div className='flex items-center gap-2'>
              {!edition?.isMonetizationConfigured && (
                <span className='text-xs text-amber-800'>{t('edition.publishBlocked')}</span>
              )}
              <button
                type='button'
                disabled={publishing || !edition?.isMonetizationConfigured}
                onClick={publish}
                className='px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5'
              >
                {publishing && <Loader2 className='w-4 h-4 animate-spin' />}
                {t('edition.publish', { lang: language.toUpperCase() })}
              </button>
            </div>
          )}
        </div>
      </div>

      <PreviewGrid
        manage={manage}
        language={language}
        isPaid={isPaid}
        preview={draft.preview}
        onPick={isPaid ? pickPreviewUntil : undefined}
      />
    </div>
  );
};

/** Lưới ảnh trang của ấn bản: N trang đầu xem trước (viền xanh), các trang sau khóa (làm mờ). */
const PreviewGrid: React.FC<{
  manage: ChapterManageDto;
  language: ContentLanguage;
  isPaid: boolean;
  preview: number;
  onPick?: (index: number) => void;
}> = ({ manage, language, isPaid, preview, onPick }) => {
  const { t } = useTranslation('payments');
  const pages = useMemo(() => manage.pages, [manage.pages]);

  return (
    <div className='space-y-2'>
      {isPaid && <p className='text-xs text-[#737373]'>{t('edition.gridHint')}</p>}
      <div className='rounded-2xl bg-[#ECEAE6] border border-[#E0DDD7] p-4'>
        <ul className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-5'>
          {pages.map((p, i) => {
            const isPreview = isPaid && i < preview;
            const locked = isPaid && !isPreview;
            const url = p.imageUrls[language] ?? null;
            const label = t('manage.page', { number: p.pageNumber });
            return (
              <li key={p.pageId} className='flex flex-col items-center gap-1.5'>
                <button
                  type='button'
                  disabled={!onPick}
                  aria-label={label}
                  title={
                    isPaid
                      ? isPreview
                        ? t('manage.previewBadge')
                        : t('manage.lockedBadge')
                      : label
                  }
                  onClick={() => onPick?.(i)}
                  className={`relative w-full aspect-[1/1.414] bg-white shadow-sm overflow-hidden cursor-pointer disabled:cursor-default transition ${
                    isPreview
                      ? 'ring-2 ring-emerald-500'
                      : locked
                        ? 'ring-1 ring-[#F97316]/60'
                        : 'ring-1 ring-black/5'
                  }`}
                >
                  {url ? (
                    <AuthenticatedImage
                      src={url}
                      alt={label}
                      className={`w-full h-full object-cover ${locked ? 'blur-[2px] opacity-60' : ''}`}
                    />
                  ) : (
                    <span className='w-full h-full flex flex-col items-center justify-center gap-1 text-[#A3A3A3] text-[10px]'>
                      <ImageOff className='w-4 h-4' />
                      {t('manage.noImage')}
                    </span>
                  )}
                  {isPaid && (
                    <span
                      className={`absolute top-1 right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ${
                        isPreview ? 'bg-emerald-600' : 'bg-[#F97316]'
                      }`}
                    >
                      {isPreview ? <Eye className='w-3 h-3' /> : <Lock className='w-3 h-3' />}
                      {isPreview ? t('manage.previewBadge') : t('manage.lockedBadge')}
                    </span>
                  )}
                </button>
                <span className='text-[11px] font-medium text-[#555555]'>{p.pageNumber}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

// ─── Phụ ──────────────────────────────────────────────────────────────────────

const Notice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs'>
    <AlertTriangle className='w-4 h-4 shrink-0' />
    <span>{children}</span>
  </div>
);

const SaveButton: React.FC<{
  saving: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}> = ({ saving, disabled, onClick, label }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={saving || disabled}
    className='px-4 py-2 rounded-xl bg-[#F97316] text-white text-sm font-semibold hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5'
  >
    {saving && <Loader2 className='w-4 h-4 animate-spin' />}
    {label}
  </button>
);

export default PublisherChapterManageView;
