import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Languages,
  Eye,
  Lock,
  Settings,
  Images,
  Loader2,
  AlertTriangle,
  ImageOff,
  Upload,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { useToast } from '@/shared/context/ToastContext';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  CONTENT_LANGUAGES,
  TRANSLATION_LANGUAGES,
  monetizationService,
  type ChapterInsightDto,
  type ChapterManageDto,
  type ContentLanguage,
} from '@/services/payment.service';
import { LanguageFilter, StatCards } from '../components/MonetizationWidgets';
import { useMoney } from '../components/useMoney';

type Section = 'general' | 'prices' | 'pages' | 'settings';

const previewIdsOf = (d: ChapterManageDto) =>
  new Set(d.pages.filter((p) => p.isPreview).map((p) => p.pageId));

/**
 * Publisher → bộ truyện → chương: sidebar General (số liệu chương, lọc theo ngôn ngữ) và Manage
 * (giá theo ngôn ngữ, lưới trang chọn trang xem trước + ảnh bản dịch, settings N trang đầu xem trước của bộ truyện).
 * Chương trả phí: mua chương mở mọi trang; người chưa mua chỉ xem trang xem trước.
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
        { id: 'prices', label: t('manage.prices'), icon: <Languages className='w-4 h-4' /> },
        { id: 'pages', label: t('manage.pages'), icon: <Images className='w-4 h-4' /> },
        { id: 'settings', label: t('manage.settings'), icon: <Settings className='w-4 h-4' /> },
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
            {t('manage.pagesCount', { count: manage.pages.length })} ·{' '}
            {manage.chapterIsLocked ? t('insights.paid') : t('insights.free')}
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
                {section === 'prices' && (
                  <PricesSection manage={manage} onSaved={onSaved} onError={onError} />
                )}
                {section === 'pages' && (
                  <PagesSection manage={manage} onSaved={onSaved} onError={onError} />
                )}
                {section === 'settings' && (
                  <SettingsSection
                    manage={manage}
                    onSaved={() => {
                      toast.success(t('manage.saved'), '');
                      void reload();
                    }}
                    onError={onError}
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

// ─── Giá theo ngôn ngữ ───────────────────────────────────────────────────────

const PricesSection: React.FC<{
  manage: ChapterManageDto;
  onSaved: (d: ChapterManageDto) => void;
  onError: (e: unknown) => void;
}> = ({ manage, onSaved, onError }) => {
  const { t } = useTranslation('payments');
  const { vnd } = useMoney();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      manage.languagePrices.map((p) => [p.language, p.isCustom ? String(p.priceVnd) : '']),
    ),
  );
  const [saving, setSaving] = useState(false);

  if (!manage.chapterIsLocked) {
    return <Notice>{t('manage.pricesFreeChapter')}</Notice>;
  }

  const save = async () => {
    setSaving(true);
    try {
      onSaved(
        await monetizationService.setLanguagePrices(
          manage.chapterId,
          CONTENT_LANGUAGES.map((l) => ({
            language: l,
            priceVnd: draft[l] ? Number(draft[l]) : null,
          })),
        ),
      );
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4'>
      <p className='text-xs text-[#737373]'>
        {t('manage.pricesHint', { base: vnd(manage.basePriceVnd) })}
      </p>
      <div className='rounded-2xl border border-[#E7E7E7] bg-white divide-y divide-[#F0F0F0]'>
        {CONTENT_LANGUAGES.map((l) => {
          const status = manage.languages.find((s) => s.language === l);
          return (
            <div key={l} className='flex flex-wrap items-center gap-3 px-4 py-3'>
              <div className='w-40'>
                <div className='text-sm font-semibold text-[#171717]'>{t(`lang.${l}`)}</div>
                <div
                  className={`text-[11px] ${status?.isAvailable ? 'text-emerald-700' : 'text-[#A3A3A3]'}`}
                >
                  {status?.isAvailable
                    ? t('manage.available')
                    : t('manage.notAvailable', {
                        done: status?.translatedPages ?? 0,
                        total: manage.pages.length,
                      })}
                </div>
              </div>
              <label className='flex items-center gap-2 text-xs text-[#555555]'>
                {t('manage.customPrice')}
                <input
                  type='number'
                  min={1000}
                  step={500}
                  value={draft[l] ?? ''}
                  placeholder={String(manage.basePriceVnd)}
                  onChange={(e) => setDraft((d) => ({ ...d, [l]: e.target.value }))}
                  aria-label={`${t('manage.customPrice')} ${l}`}
                  className='w-32 px-2.5 py-1.5 rounded-lg border border-[#E7E7E7] focus:outline-none focus:border-[#F97316]'
                />
              </label>
              {draft[l] && (
                <button
                  type='button'
                  onClick={() => setDraft((d) => ({ ...d, [l]: '' }))}
                  className='text-xs text-[#737373] underline cursor-pointer'
                >
                  {t('manage.useBase')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <SaveButton saving={saving} onClick={save} label={t('manage.savePrices')} />
    </div>
  );
};

// ─── Trang xem trước + ảnh bản dịch (lưới thumbnail nhiều trang, kiểu xem nhiều trang của Word) ──

const PagesSection: React.FC<{
  manage: ChapterManageDto;
  onSaved: (d: ChapterManageDto) => void;
  onError: (e: unknown) => void;
}> = ({ manage, onSaved, onError }) => {
  const { t } = useTranslation('payments');
  const [preview, setPreview] = useState<ContentLanguage>('vi');
  const [draft, setDraft] = useState<Set<string>>(() => previewIdsOf(manage));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => setDraft(previewIdsOf(manage)), [manage]);

  const paid = manage.chapterIsLocked;
  const changed = useMemo(() => {
    const saved = previewIdsOf(manage);
    return saved.size !== draft.size || [...draft].some((id) => !saved.has(id));
  }, [manage, draft]);

  const toggle = (pageId: string) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });

  const run = async (key: string | null, fn: () => Promise<ChapterManageDto>) => {
    if (key) setUploading(key);
    else setSaving(true);
    try {
      onSaved(await fn());
    } catch (err) {
      onError(err);
    } finally {
      setUploading(null);
      setSaving(false);
    }
  };

  const status = manage.languages.find((l) => l.language === preview);
  const isTranslation = TRANSLATION_LANGUAGES.includes(preview);

  return (
    <div className='space-y-4'>
      <p className='text-xs text-[#737373]'>{t('manage.pagesHint')}</p>

      <div className='flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FAF8F4] border border-[#E7E7E7] text-xs'>
        <span className='text-[#555555]'>
          {!paid
            ? t('manage.freeChapterNotice')
            : manage.previewPagesCustomized
              ? t('manage.customized')
              : manage.seriesDefaultPreviewPageCount > 0
                ? t('manage.followingDefault', { count: manage.seriesDefaultPreviewPageCount })
                : t('manage.noDefault')}
        </span>
        {manage.previewPagesCustomized && (
          <button
            type='button'
            onClick={() => run(null, () => monetizationService.resetPreviewPages(manage.chapterId))}
            className='px-2.5 py-1 rounded-lg border border-[#E7E7E7] bg-white font-medium cursor-pointer'
          >
            {t('manage.resetToDefault')}
          </button>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <span className='text-xs font-semibold text-[#555555]'>{t('manage.previewLanguage')}</span>
        <div className='inline-flex rounded-xl border border-[#E7E7E7] bg-white p-0.5'>
          {CONTENT_LANGUAGES.map((l) => (
            <button
              key={l}
              type='button'
              aria-pressed={preview === l}
              onClick={() => setPreview(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                preview === l ? 'bg-[#171717] text-white' : 'text-[#555555] hover:bg-[#FAF8F4]'
              }`}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        {status && (
          <span className={`text-xs ${status.isAvailable ? 'text-emerald-700' : 'text-[#A3A3A3]'}`}>
            {status.isAvailable
              ? t('manage.available')
              : t('manage.notAvailable', {
                  done: status.translatedPages,
                  total: manage.pages.length,
                })}
          </span>
        )}
      </div>

      <div className='rounded-2xl bg-[#ECEAE6] border border-[#E0DDD7] p-4'>
        <ul className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-5'>
          {manage.pages.map((p) => {
            const isPreview = draft.has(p.pageId);
            const locked = paid && !isPreview;
            const url = p.imageUrls[preview] ?? null;
            const key = `${p.pageId}:${preview}`;
            const label = t('manage.page', { number: p.pageNumber });
            const uploadLabel = url
              ? t('manage.replace')
              : t('manage.upload', { lang: preview.toUpperCase() });
            return (
              <li key={p.pageId} className='flex flex-col items-center gap-1.5'>
                <button
                  type='button'
                  disabled={!paid}
                  aria-pressed={isPreview}
                  aria-label={label}
                  title={
                    paid ? (isPreview ? t('manage.previewBadge') : t('manage.lockedBadge')) : label
                  }
                  onClick={() => toggle(p.pageId)}
                  className={`relative w-full aspect-[1/1.414] bg-white shadow-sm overflow-hidden cursor-pointer disabled:cursor-default transition ${
                    isPreview && paid
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
                  {paid && (
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
                {isTranslation && (
                  <div className='flex items-center gap-1'>
                    <label
                      title={uploadLabel}
                      className='inline-flex items-center justify-center p-1 rounded-md border border-[#D6D3CE] bg-white hover:bg-[#FAF8F4] cursor-pointer'
                    >
                      {uploading === key ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        <Upload className='w-3.5 h-3.5' />
                      )}
                      <span className='sr-only'>{uploadLabel}</span>
                      <input
                        type='file'
                        accept='image/png,image/jpeg,image/webp'
                        className='sr-only'
                        disabled={uploading !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file)
                            void run(key, () =>
                              monetizationService.uploadPageTranslation(
                                manage.chapterId,
                                p.pageId,
                                preview,
                                file,
                              ),
                            );
                        }}
                      />
                    </label>
                    {url && (
                      <button
                        type='button'
                        aria-label={t('manage.removeTranslation')}
                        title={t('manage.removeTranslation')}
                        disabled={uploading !== null}
                        onClick={() =>
                          run(key, () =>
                            monetizationService.deletePageTranslation(
                              manage.chapterId,
                              p.pageId,
                              preview,
                            ),
                          )
                        }
                        className='p-1 rounded-md border border-[#D6D3CE] bg-white text-[#888888] hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {paid && (
        <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
          <div className='flex items-center gap-3 text-xs text-[#555555]'>
            <span>
              {t('manage.previewSummary', {
                preview: draft.size,
                locked: manage.pages.length - draft.size,
              })}
            </span>
            {draft.size > 0 && (
              <button
                type='button'
                onClick={() => setDraft(new Set())}
                className='underline text-[#737373] cursor-pointer'
              >
                {t('manage.lockAll')}
              </button>
            )}
          </div>
          <SaveButton
            saving={saving}
            disabled={!changed}
            onClick={() =>
              run(null, () => monetizationService.setPreviewPages(manage.chapterId, [...draft]))
            }
            label={t('manage.savePreview')}
          />
        </div>
      )}
    </div>
  );
};

// ─── Settings (theo bộ truyện) ───────────────────────────────────────────────

const SettingsSection: React.FC<{
  manage: ChapterManageDto;
  onSaved: () => void;
  onError: (e: unknown) => void;
}> = ({ manage, onSaved, onError }) => {
  const { t } = useTranslation('payments');
  const [count, setCount] = useState(manage.seriesDefaultPreviewPageCount);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await monetizationService.updateSeriesSettings(manage.seriesId, {
        defaultPreviewPageCount: count,
      });
      onSaved();
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4 max-w-xl'>
      <div>
        <h2 className='text-sm font-bold text-[#171717]'>{t('manage.settingsTitle')}</h2>
        <p className='text-xs text-[#737373] mt-1'>{t('manage.settingsHint')}</p>
      </div>
      <label className='flex flex-col gap-1 text-xs text-[#555555]'>
        {t('manage.defaultCount')}
        <input
          type='number'
          min={0}
          max={50}
          value={count}
          onChange={(e) => setCount(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
          className='w-32 px-2.5 py-1.5 rounded-lg border border-[#E7E7E7] focus:outline-none focus:border-[#F97316]'
        />
      </label>
      <SaveButton saving={saving} onClick={save} label={t('manage.saveSettings')} />
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
