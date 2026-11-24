import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileJson,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { exportService, ExportJobDto, ExportPresetCode } from '@/services/export.service';
import { useTranslation } from '@/lib/i18n';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

const FORMAT_META: { code: ExportPresetCode; icon: typeof FileText }[] = [
  { code: 'PDF', icon: FileText },
  { code: 'CBZ', icon: ImageIcon },
  { code: 'PAGE_IMAGES', icon: ImageIcon },
  { code: 'WEBTOON', icon: ImageIcon },
  { code: 'OPEN_JSON', icon: FileJson },
];

const STATUS_CLASS: Record<ExportJobDto['status'], string> = {
  Queued: 'bg-amber-50 text-amber-700 border-amber-300',
  Processing: 'bg-blue-50 text-blue-700 border-blue-300',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  Failed: 'bg-red-50 text-red-700 border-red-300',
  Cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-300',
};

const formatSize = (bytes?: number | null) =>
  bytes == null
    ? '—'
    : bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** UC-12: Producer xuất chương đã duyệt (Approved/Published). File dựng nền ở Backend; màn hỏi lại trạng thái tới khi xong. */
export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
  const { t, lang } = useTranslation('production');
  const navigate = useNavigate();
  const { seriesId } = useParams<{ seriesId: string }>();

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [formats, setFormats] = useState<ExportPresetCode[]>(['PDF']);
  const [jobs, setJobs] = useState<ExportJobDto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    chapterService
      .getChaptersBySeries(seriesId, 1, 100)
      .then((res) => {
        const exportable = (res.items || []).filter(
          (c) => c.status === 'ChapterApproved' || c.status === 'HandedOffAndPublished',
        );
        setChapters(exportable);
        setChapterId((current) => current || exportable[0]?.id || '');
      })
      .catch((err) => onShowToast(t('producer.exportView.loadChaptersError'), err.message));
  }, [seriesId, onShowToast, t]);

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

  // Hỏi lại khi còn bản đang chờ / đang dựng
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

  return (
    <PageContainer className='py-8 flex flex-col h-full overflow-y-auto custom-scrollbar font-sans'>
      <button
        onClick={() => navigate(-1)}
        className='self-start flex items-center gap-2 text-sm text-[#57534E] hover:text-[#1C1917] mb-6 transition-colors cursor-pointer font-medium'
      >
        <ArrowLeft className='w-4 h-4' /> {t('producer.exportView.back')}
      </button>

      <h1 className='text-3xl font-serif font-bold text-[#1C1917] mb-2 flex items-center gap-3'>
        <Download className='w-8 h-8 text-[#F97316]' />
        {t('producer.exportView.title')}
      </h1>
      <p className='text-[#57534E] mb-8 text-sm'>{t('producer.exportView.subtitle')}</p>

      {!seriesId ? (
        <p className='text-sm text-[#57534E]'>{t('producer.exportView.noSeriesNotice')}</p>
      ) : chapters.length === 0 ? (
        <p className='text-sm text-[#57534E]' data-testid='export-no-chapter'>
          {t('producer.exportView.noApprovedChapters')}
        </p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6'>
          <div className='p-6 border border-[#D8D2C5] rounded-xl flex flex-col gap-4 bg-[#FCFBF8] shadow-xs'>
            <label htmlFor='export-chapter' className='font-bold text-sm text-[#1C1917]'>
              {t('producer.exportView.chapterLabel')}
            </label>
            <select
              id='export-chapter'
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className='px-3 py-2 bg-[#F8F6F0] border border-[#D8D2C5] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#F97316] cursor-pointer'
              data-testid='export-chapter-select'
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {t('producer.exportView.chapterOption', { number: c.chapterNumber })}
                  {c.title ? `: ${c.title}` : ''} ({c.status})
                </option>
              ))}
            </select>

            <fieldset className='space-y-3'>
              <legend className='font-bold text-sm text-[#1C1917] mb-2'>
                {t('producer.exportView.formatLegend')}
              </legend>
              {FORMAT_META.map(({ code, icon: Icon }) => (
                <label key={code} className='flex items-start gap-3 cursor-pointer group'>
                  <input
                    type='checkbox'
                    checked={formats.includes(code)}
                    onChange={() => toggleFormat(code)}
                    className='mt-0.5 w-4 h-4 rounded text-[#F97316] focus:ring-[#F97316] accent-[#F97316] border-[#D8D2C5] cursor-pointer'
                    data-testid={`export-format-${code}`}
                  />
                  <Icon className='w-4 h-4 mt-0.5 text-[#78716C] group-hover:text-[#F97316] shrink-0 transition-colors' />
                  <span>
                    <span className='block text-sm font-semibold text-[#1C1917]'>
                      {t(`producer.exportView.formats.${code}.label`)}
                    </span>
                    <span className='block text-xs text-[#57534E]'>
                      {t(`producer.exportView.formats.${code}.hint`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <button
              onClick={handleExport}
              disabled={submitting || formats.length === 0 || !chapterId}
              className='mt-auto py-2.5 bg-[#F97316] text-white font-bold rounded-full hover:bg-[#EA580C] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98'
              data-testid='export-submit'
            >
              {submitting && <Loader2 className='w-4 h-4 animate-spin' />}
              {t('producer.exportView.exportBtn')}
            </button>
          </div>

          <div className='p-6 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] shadow-xs min-w-0'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='font-bold text-[#1C1917]'>
                {t('producer.exportView.exportsListTitle')}
              </h2>
              <button
                type='button'
                onClick={fetchJobs}
                className='p-1 rounded text-[#78716C] hover:text-[#1C1917] cursor-pointer'
                aria-label={t('producer.exportView.reloadAria')}
              >
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin text-[#F97316]' : ''}`} />
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className='text-sm text-[#57534E]'>{t('producer.exportView.noExports')}</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='font-mono text-[10px] text-[#78716C] uppercase border-b border-[#D8D2C5]'>
                    <tr>
                      <th className='py-2 pr-3 font-semibold'>
                        {t('producer.exportView.colFormat')}
                      </th>
                      <th className='py-2 pr-3 font-semibold'>
                        {t('producer.exportView.colStatus')}
                      </th>
                      <th className='py-2 pr-3 font-semibold'>
                        {t('producer.exportView.colPages')}
                      </th>
                      <th className='py-2 pr-3 font-semibold'>
                        {t('producer.exportView.colSize')}
                      </th>
                      <th className='py-2 pr-3 font-semibold'>
                        {t('producer.exportView.colCreatedAt')}
                      </th>
                      <th className='py-2 text-right font-semibold'>
                        {t('producer.exportView.colActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#D8D2C5]'>
                    {jobs.map((job) => (
                      <tr key={job.id} data-testid={`export-job-${job.id}`}>
                        <td className='py-2.5 pr-3 font-semibold text-[#1C1917]'>{job.format}</td>
                        <td className='py-2.5 pr-3'>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_CLASS[job.status]}`}
                          >
                            {t(`producer.exportView.status.${job.status}`)}
                          </span>
                          {job.error && (
                            <div className='mt-1 text-[11px] text-red-700'>{job.error}</div>
                          )}
                        </td>
                        <td className='py-2.5 pr-3 tabular-nums text-[#1C1917]'>{job.pageCount}</td>
                        <td className='py-2.5 pr-3 tabular-nums text-[#1C1917]'>
                          {formatSize(job.sizeBytes)}
                          {job.sha256 && (
                            <div
                              className='font-mono text-[10px] text-[#57534E]'
                              title={`SHA-256: ${job.sha256}`}
                              data-testid={`export-sha-${job.id}`}
                            >
                              SHA-256 {job.sha256.slice(0, 12)}…
                            </div>
                          )}
                        </td>
                        <td className='py-2.5 pr-3 font-mono text-[11px] text-[#57534E]'>
                          {new Date(job.createdAt).toLocaleString(
                            lang === 'en' ? 'en-US' : 'vi-VN',
                          )}
                        </td>
                        <td className='py-2.5 text-right whitespace-nowrap'>
                          {job.status === 'Completed' && (
                            <button
                              type='button'
                              onClick={() => handleDownload(job)}
                              className='px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 shadow-sm cursor-pointer'
                              data-testid={`export-download-${job.id}`}
                            >
                              <Download className='w-3.5 h-3.5' />{' '}
                              {t('producer.exportView.downloadBtn')}
                            </button>
                          )}
                          {job.status === 'Queued' && (
                            <button
                              type='button'
                              onClick={() => handleCancel(job)}
                              className='px-2.5 py-1 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer'
                              data-testid={`export-cancel-${job.id}`}
                            >
                              <X className='w-3.5 h-3.5' /> {t('producer.exportView.cancelBtn')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
};
