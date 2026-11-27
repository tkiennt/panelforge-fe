import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FileText,
  ImageIcon,
  LayoutGrid,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';
import { exportService, ExportJobDto, ExportPresetCode } from '@/services/export.service';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import {
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildProductionWorkspaceUrl,
} from '@/app/routePaths';
import { Badge, Button, Card, CardBody, CardHeader, StatusBadge, Tabs } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

const FORMATS: { code: ExportPresetCode; icon: typeof FileText }[] = [
  { code: 'PDF', icon: FileText },
  { code: 'CBZ', icon: ImageIcon },
  { code: 'PAGE_IMAGES', icon: ImageIcon },
  { code: 'WEBTOON', icon: ImageIcon },
  { code: 'OPEN_JSON', icon: FileJson },
];

const STATUS_TONE: Record<
  ExportJobDto['status'],
  'warning' | 'info' | 'success' | 'danger' | 'neutral'
> = {
  Queued: 'warning',
  Processing: 'info',
  Completed: 'success',
  Failed: 'danger',
  Cancelled: 'neutral',
};

const formatSize = (bytes?: number | null) =>
  bytes == null
    ? '—'
    : bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** UC-12 / Kiểm duyệt & Bàn giao: Theo dõi duyệt chương, đọc thử và đóng gói bản thảo (PDF/CBZ/Webtoon/JSON). */
export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
  const { t, lang } = useTranslation('production');
  const { t: tp } = useTranslation('pipeline');
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const [searchParams] = useSearchParams();
  const urlChapterId = searchParams.get('chapterId') || '';

  const [allChapters, setAllChapters] = useState<ChapterDto[]>([]);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [chapterId, setChapterId] = useState(urlChapterId);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesFormat, setSeriesFormat] = useState('');
  const [formats, setFormats] = useState<ExportPresetCode[]>(['PDF']);
  const [jobs, setJobs] = useState<ExportJobDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [activeTab, setActiveTab] = useState<'handoff' | 'review'>('handoff');
  const confirm = useConfirm();

  useEffect(() => {
    if (!seriesId) return;
    seriesService
      .getSeriesById(seriesId)
      .then((s) => {
        if (s?.title) setSeriesTitle(s.title);
        if (s?.format) setSeriesFormat(s.format);
      })
      .catch(() => {});

    chapterService
      .getChaptersBySeries(seriesId, 1, 100)
      .then((res) => {
        const items = res.items || [];
        setAllChapters([...items].sort((a, b) => a.chapterNumber - b.chapterNumber));
        const exportable = items.filter(
          (c) => c.status === 'ChapterApproved' || c.status === 'HandedOffAndPublished',
        );
        setChapters(exportable);
        setChapterId((current) => {
          if (urlChapterId && exportable.some((c) => c.id === urlChapterId)) return urlChapterId;
          if (current && exportable.some((c) => c.id === current)) return current;
          return exportable[0]?.id || '';
        });
      })
      .catch((err) => onShowToast(t('producer.exportView.loadChaptersError'), err.message));
  }, [seriesId, urlChapterId, onShowToast, t]);

  const fetchJobs = useCallback(async () => {
    if (!chapterId) return setJobs([]);
    try {
      setJobs(await exportService.getExports(chapterId));
    } catch (err: any) {
      onShowToast(t('producer.exportView.loadExportsError'), err.message);
    }
  }, [chapterId, onShowToast, t]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const running = jobs.some((j) => j.status === 'Queued' || j.status === 'Processing');
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(fetchJobs, 3000);
    return () => clearInterval(timer);
  }, [running, fetchJobs]);

  const toggleFormat = (code: ExportPresetCode) =>
    setFormats((prev) => (prev.includes(code) ? prev.filter((f) => f !== code) : [...prev, code]));

  const handleExport = async () => {
    setSubmitting(true);
    const results = await Promise.allSettled(
      formats.map((f) => exportService.createExport(chapterId, f)),
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected')
        onShowToast(
          t('producer.exportView.exportFormatError', { format: formats[i] }),
          r.reason?.message,
        );
    });
    if (results.some((r) => r.status === 'fulfilled'))
      onShowToast(t('producer.exportView.queuedTitle'), t('producer.exportView.queuedDesc'));
    setSubmitting(false);
    fetchJobs();
  };

  const handleDownload = (job: ExportJobDto) =>
    exportService
      .downloadExport(chapterId, job)
      .then(fetchJobs)
      .catch((err) => onShowToast(t('producer.exportView.downloadError'), err.message));

  const handleCancel = (job: ExportJobDto) =>
    exportService
      .cancelExport(chapterId, job.id)
      .then(fetchJobs)
      .catch((err) => onShowToast(t('producer.exportView.cancelError'), err.message));

  const selectedChapter = chapters.find((c) => c.id === chapterId);
  const canHandOff = selectedChapter?.status === 'ChapterApproved' && !selectedChapter.isHandedOff;

  const handleHandOff = async () => {
    if (!selectedChapter) return;
    const ok = await confirm({
      title: t('producer.exportView.handOffConfirmTitle', {
        number: selectedChapter.chapterNumber,
      }),
      description: t('producer.exportView.handOffConfirmDesc'),
      confirmLabel: t('producer.exportView.handOffBtn'),
    });
    if (!ok) return;
    setHandingOff(true);
    try {
      await chapterService.handOffChapter(selectedChapter.id);
      const handedOffAt = new Date().toISOString();
      setChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapter.id ? { ...c, isHandedOff: true, handedOffAt } : c,
        ),
      );
      setAllChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapter.id ? { ...c, isHandedOff: true, handedOffAt } : c,
        ),
      );
      onShowToast(
        t('producer.exportView.handOffSuccessTitle'),
        t('producer.exportView.handOffSuccessDesc', { number: selectedChapter.chapterNumber }),
      );
    } catch (err: any) {
      onShowToast(t('producer.exportView.handOffError'), err.message);
    } finally {
      setHandingOff(false);
    }
  };

  const chapterStatusLabel = (status?: string | null) =>
    status ? tp(`workbench.chapterStatus.${status}`, status) : '';

  const nonReadyChapters = allChapters.filter(
    (c) => c.status !== 'ChapterApproved' && c.status !== 'HandedOffAndPublished',
  );

  return (
    <div className='w-full min-h-screen bg-[#FAF9F5] font-sans text-stone-900 flex flex-col min-w-0'>
      <ProducerSharedHeader
        hideBackLink
        workspaceId={workspaceId}
        seriesId={seriesId}
        currentChapterId={chapterId}
        chapters={chapters.length > 0 ? chapters : allChapters}
        seriesTitle={seriesTitle}
        seriesFormat={seriesFormat}
        currentChapter={selectedChapter ?? allChapters[0] ?? null}
        onChapterChange={(nextId) => {
          if (chapters.some((c) => c.id === nextId)) {
            setChapterId(nextId);
          }
        }}
        actionCta={
          <div className='flex items-center gap-2'>
            {selectedChapter?.isHandedOff ? (
              <Badge
                tone='success'
                icon={<CheckCircle2 aria-hidden='true' />}
                data-testid='handoff-done'
              >
                {t('producer.exportView.handedOffBadge', {
                  date: selectedChapter.handedOffAt
                    ? new Date(selectedChapter.handedOffAt).toLocaleDateString(
                        lang === 'en' ? 'en-US' : 'vi-VN',
                      )
                    : '',
                })}
              </Badge>
            ) : (
              canHandOff && (
                <Button
                  variant='secondary'
                  size='sm'
                  loading={handingOff}
                  leadingIcon={<Send aria-hidden='true' />}
                  onClick={handleHandOff}
                  data-testid='handoff-submit'
                >
                  {t('producer.exportView.handOffBtn')}
                </Button>
              )
            )}
            <Button
              variant='primary'
              size='sm'
              loading={submitting}
              disabled={formats.length === 0 || !chapterId}
              leadingIcon={<Download aria-hidden='true' />}
              onClick={handleExport}
              data-testid='export-submit'
            >
              {t('review.handoffView.createPackage')}
            </Button>
          </div>
        }
      />

      <div className='py-5 flex flex-col flex-1 overflow-y-auto font-sans bg-[#FAF9F5] max-w-[1640px] mx-auto w-full px-4 sm:px-6 lg:px-8'>
        <div className='space-y-4 min-w-0' id='view-handoff'>
          {/* Internal Tabs: Bàn giao vs Kiểm duyệt & Đọc thử */}
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <Tabs
              aria-label={t('producer.exportView.tabsAria')}
              value={activeTab}
              onChange={(v) => setActiveTab(v as 'handoff' | 'review')}
              items={[
                {
                  id: 'handoff',
                  label: t('producer.exportView.tabHandoff'),
                  count: chapters.length,
                },
                {
                  id: 'review',
                  label: t('producer.exportView.tabReview'),
                  count: allChapters.length,
                },
              ]}
            />
            {selectedChapter && workspaceId && seriesId && (
              <Button
                variant='secondary'
                size='sm'
                leadingIcon={<BookOpen aria-hidden='true' />}
                onClick={() =>
                  navigate(buildChapterReaderUrl(workspaceId, seriesId, selectedChapter.id))
                }
              >
                {t('producer.exportView.previewChapterBtn')}
              </Button>
            )}
          </div>

          {activeTab === 'review' ? (
            <Card>
              <CardHeader
                icon={<ShieldCheck aria-hidden='true' />}
                title={t('producer.exportView.reviewTableTitle')}
                subtitle={t('producer.exportView.reviewTableSubtitle')}
              />
              <CardBody className='p-0'>
                {allChapters.length === 0 ? (
                  <div className='p-8 text-center text-xs text-stone-500'>
                    {t('producer.exportView.noSeriesNotice')}
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-left border-collapse text-xs'>
                      <thead className='bg-head-wash text-kraft-ink border-b border-head-line font-semibold uppercase tracking-wide'>
                        <tr>
                          <th className='py-2.5 px-4'>{t('producer.exportView.colChapter')}</th>
                          <th className='py-2.5 px-4'>{t('producer.exportView.colStatus')}</th>
                          <th className='py-2.5 px-4'>{t('producer.exportView.colHandoff')}</th>
                          <th className='py-2.5 px-4 text-right'>
                            {t('producer.exportView.colActions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-stone-200'>
                        {allChapters.map((chap) => (
                          <tr key={chap.id} className='hover:bg-stone-50/60'>
                            <td className='py-3 px-4 font-semibold text-stone-900'>
                              {t('producer.exportView.chapterOption', {
                                number: chap.chapterNumber,
                              })}
                              {chap.title ? `: ${chap.title}` : ''}
                            </td>
                            <td className='py-3 px-4'>
                              <StatusBadge kind='chapter' status={chap.status} />
                            </td>
                            <td className='py-3 px-4 text-stone-600'>
                              {chap.isHandedOff ? (
                                <Badge tone='success'>
                                  {t('producer.exportView.handedOffShort')}
                                </Badge>
                              ) : chap.status === 'ChapterApproved' ? (
                                <Badge tone='info'>{t('producer.exportView.readyToHandOff')}</Badge>
                              ) : (
                                <span className='text-stone-500'>
                                  {t('producer.exportView.notEligibleHandoff')}
                                </span>
                              )}
                            </td>
                            <td className='py-3 px-4 text-right whitespace-nowrap space-x-2'>
                              {workspaceId && seriesId && (
                                <>
                                  <Button
                                    variant='secondary'
                                    size='sm'
                                    leadingIcon={<BookOpen aria-hidden='true' />}
                                    onClick={() =>
                                      navigate(
                                        buildChapterReaderUrl(workspaceId, seriesId, chap.id),
                                      )
                                    }
                                  >
                                    {t('producer.exportView.previewBtn')}
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    leadingIcon={<LayoutGrid aria-hidden='true' />}
                                    onClick={() =>
                                      navigate(
                                        buildProductionWorkspaceUrl(workspaceId, seriesId, {
                                          chapterId: chap.id,
                                          tab: 'progress',
                                        }),
                                      )
                                    }
                                  >
                                    {t('producer.exportView.prodBoardShortBtn')}
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Compact Readiness & Provenance Bar */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
                <div className='p-3.5 rounded-xl bg-white border border-stone-200/90 flex items-start gap-2.5 shadow-2xs'>
                  <ShieldCheck className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                  <div>
                    <div className='font-semibold text-stone-900'>
                      {t('review.handoffView.securityTitle')}
                    </div>
                    <p className='text-stone-600 leading-relaxed mt-0.5'>
                      {t('review.handoffView.securityDesc')}
                    </p>
                  </div>
                </div>

                <div className='p-3.5 rounded-xl bg-white border border-stone-200/90 flex items-start gap-2.5 shadow-2xs'>
                  <Package className='w-4 h-4 text-accent-dark shrink-0 mt-0.5' />
                  <div>
                    <div className='font-semibold text-stone-900'>
                      {t('review.handoffView.readinessTitle')}
                    </div>
                    <p className='text-stone-700 leading-relaxed mt-0.5'>
                      {chapters.length > 0
                        ? selectedChapter
                          ? t('producer.exportView.chapterReady', {
                              number: selectedChapter.chapterNumber,
                              status: chapterStatusLabel(selectedChapter.status),
                            })
                          : t('review.handoffView.readinessReady')
                        : t('review.handoffView.readinessNotice')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Work Area */}
              {!seriesId ? (
                <Card>
                  <CardBody className='text-center text-xs text-stone-500 py-8'>
                    {t('producer.exportView.noSeriesNotice')}
                  </CardBody>
                </Card>
              ) : chapters.length === 0 ? (
                <Card data-testid='export-no-chapter'>
                  <CardHeader
                    icon={<Clock aria-hidden='true' />}
                    tone='warning'
                    title={t('producer.exportView.noReadyChaptersTitle')}
                    subtitle={t('producer.exportView.noApprovedChapters')}
                  />
                  <CardBody className='space-y-3'>
                    {nonReadyChapters.length > 0 && (
                      <div className='space-y-2'>
                        <div className='text-xs font-semibold text-stone-700'>
                          {t('producer.exportView.inProgressChaptersTitle', {
                            count: nonReadyChapters.length,
                          })}
                        </div>
                        <ul className='divide-y divide-stone-100 border border-stone-200/80 rounded-xl bg-[#FAF9F5]'>
                          {nonReadyChapters.slice(0, 6).map((chap) => (
                            <li
                              key={chap.id}
                              className='px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
                            >
                              <div className='flex items-center gap-2 min-w-0'>
                                <span className='font-semibold text-stone-900 truncate'>
                                  {t('producer.exportView.chapterOption', {
                                    number: chap.chapterNumber,
                                  })}
                                  {chap.title ? `: ${chap.title}` : ''}
                                </span>
                                <StatusBadge kind='chapter' status={chap.status} />
                              </div>
                              {workspaceId && seriesId && (
                                <div className='flex items-center gap-2 shrink-0'>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      navigate(
                                        chap.status === 'PreProduction'
                                          ? buildChapterManagementUrl(
                                              workspaceId,
                                              seriesId,
                                              chap.id,
                                            )
                                          : buildProductionWorkspaceUrl(workspaceId, seriesId, {
                                              chapterId: chap.id,
                                              tab: 'progress',
                                            }),
                                      )
                                    }
                                    className='inline-flex items-center gap-1 font-semibold text-accent-dark hover:underline cursor-pointer'
                                  >
                                    <span>
                                      {chap.status === 'PreProduction'
                                        ? t('producer.exportView.openOverviewBtn')
                                        : t('producer.exportView.openProdBoardBtn')}
                                    </span>
                                    <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ) : (
                <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 items-start'>
                  {/* Left Box: Chapter & Format Selection */}
                  <Card>
                    <CardHeader
                      icon={<Package aria-hidden='true' />}
                      title={t('producer.exportView.formatLegend')}
                    />
                    <CardBody className='space-y-4'>
                      <div>
                        <label
                          htmlFor='export-chapter'
                          className='font-semibold text-xs text-stone-800 block mb-1.5'
                        >
                          {t('producer.exportView.chapterLabel')}
                        </label>
                        <select
                          id='export-chapter'
                          value={chapterId}
                          onChange={(e) => setChapterId(e.target.value)}
                          className='w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none focus:border-accent cursor-pointer'
                          data-testid='export-chapter-select'
                        >
                          {chapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {t('producer.exportView.chapterOption', { number: c.chapterNumber })}
                              {c.title ? `: ${c.title}` : ''} ({chapterStatusLabel(c.status)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <fieldset className='space-y-2.5 pt-2 border-t border-stone-200'>
                        <legend className='sr-only'>{t('producer.exportView.formatLegend')}</legend>
                        {FORMATS.map(({ code, icon: Icon }) => (
                          <label
                            key={code}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                              formats.includes(code)
                                ? 'bg-accent-soft/60 border-accent-border ring-1 ring-accent-border'
                                : 'bg-[#FAF9F5] border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <input
                              type='checkbox'
                              checked={formats.includes(code)}
                              onChange={() => toggleFormat(code)}
                              className='mt-0.5 w-4 h-4 rounded accent-[#EA580C] border-stone-300 cursor-pointer'
                              data-testid={`export-format-${code}`}
                            />
                            <Icon className='w-4 h-4 mt-0.5 text-stone-500 shrink-0' />
                            <span className='min-w-0'>
                              <span className='block text-xs font-semibold text-stone-900'>
                                {t(`producer.exportView.formats.${code}.label`)}
                              </span>
                              <span className='block text-xs text-stone-500 leading-normal'>
                                {t(`producer.exportView.formats.${code}.hint`)}
                              </span>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    </CardBody>
                  </Card>

                  {/* Right Box: Export Jobs Table */}
                  <Card className='min-w-0'>
                    <CardHeader
                      icon={<Download aria-hidden='true' />}
                      title={`${t('producer.exportView.exportsListTitle')} (${jobs.length})`}
                      subtitle={t('producer.exportView.exportsListHint')}
                      actions={
                        <button
                          type='button'
                          onClick={fetchJobs}
                          className='p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer'
                          aria-label={t('producer.exportView.reloadAria')}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${running ? 'animate-spin text-accent-dark' : ''}`}
                          />
                        </button>
                      }
                    />
                    <CardBody className='p-0'>
                      {jobs.length === 0 ? (
                        <div className='py-12 text-center text-xs text-stone-500'>
                          {t('producer.exportView.noExports')}
                        </div>
                      ) : (
                        <div className='overflow-x-auto'>
                          <table className='w-full text-left text-xs'>
                            <thead className='bg-head-wash border-b border-head-line text-kraft-ink font-semibold uppercase tracking-wide'>
                              <tr>
                                <th className='py-2.5 px-3'>
                                  {t('producer.exportView.colFormat')}
                                </th>
                                <th className='py-2.5 px-3'>
                                  {t('producer.exportView.colStatus')}
                                </th>
                                <th className='py-2.5 px-3'>{t('producer.exportView.colPages')}</th>
                                <th className='py-2.5 px-3'>{t('producer.exportView.colSize')}</th>
                                <th className='py-2.5 px-3'>
                                  {t('producer.exportView.colCreatedAt')}
                                </th>
                                <th className='py-2.5 px-3 text-right'>
                                  {t('producer.exportView.colActions')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-stone-200'>
                              {jobs.map((job) => (
                                <tr
                                  key={job.id}
                                  data-testid={`export-job-${job.id}`}
                                  className='hover:bg-stone-50/60'
                                >
                                  <td className='py-3 px-3 font-semibold text-stone-900'>
                                    {job.format}
                                  </td>
                                  <td className='py-3 px-3'>
                                    <Badge tone={STATUS_TONE[job.status]}>
                                      {t(`producer.exportView.status.${job.status}`)}
                                    </Badge>
                                    {job.error && (
                                      <div className='mt-1 text-xs text-rose-700 max-w-xs leading-normal'>
                                        {job.error}
                                      </div>
                                    )}
                                  </td>
                                  <td className='py-3 px-3 font-mono tabular-nums text-stone-800'>
                                    {job.pageCount}
                                  </td>
                                  <td className='py-3 px-3 font-mono tabular-nums text-stone-800'>
                                    {formatSize(job.sizeBytes)}
                                    {job.sha256 && (
                                      <div
                                        className='font-mono text-xs text-stone-500'
                                        title={`SHA-256: ${job.sha256}`}
                                        data-testid={`export-sha-${job.id}`}
                                      >
                                        SHA-256 {job.sha256.slice(0, 12)}…
                                      </div>
                                    )}
                                  </td>
                                  <td className='py-3 px-3 font-mono text-xs text-stone-500 whitespace-nowrap'>
                                    {new Date(job.createdAt).toLocaleString(
                                      lang === 'en' ? 'en-US' : 'vi-VN',
                                    )}
                                  </td>
                                  <td className='py-3 px-3 text-right whitespace-nowrap'>
                                    {job.status === 'Completed' && (
                                      <Button
                                        variant='success'
                                        size='sm'
                                        leadingIcon={<Download aria-hidden='true' />}
                                        onClick={() => handleDownload(job)}
                                        data-testid={`export-download-${job.id}`}
                                      >
                                        {t('producer.exportView.downloadBtn')}
                                      </Button>
                                    )}
                                    {job.status === 'Queued' && (
                                      <Button
                                        variant='secondary'
                                        size='sm'
                                        leadingIcon={<X aria-hidden='true' />}
                                        onClick={() => handleCancel(job)}
                                        data-testid={`export-cancel-${job.id}`}
                                      >
                                        {t('producer.exportView.cancelBtn')}
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
