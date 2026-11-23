import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileJson,
  FileText,
  ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';
import { exportService, ExportJobDto, ExportPresetCode } from '@/services/export.service';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import { useTranslation } from '@/lib/i18n';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

const FORMATS: { code: ExportPresetCode; label: string; hint: string; icon: typeof FileText }[] = [
  {
    code: 'PDF',
    label: 'PDF (Xuất bản in)',
    hint: 'Mỗi trang một ảnh, chuẩn PDF/X-1a gửi đối tác xuất bản',
    icon: FileText,
  },
  {
    code: 'CBZ',
    label: 'CBZ (Comic Book ZIP)',
    hint: 'Trình đọc truyện, lật trang theo chiều truyện Manga/Manhwa',
    icon: ImageIcon,
  },
  {
    code: 'PAGE_IMAGES',
    label: 'Ảnh từng trang (ZIP)',
    hint: 'Ảnh gốc đã duyệt của mỗi trang kèm cấu trúc thư mục',
    icon: ImageIcon,
  },
  {
    code: 'WEBTOON',
    label: 'Webtoon cuộn dọc',
    hint: 'Ghép các trang thành một chuỗi ảnh dọc chuẩn đọc điện thoại',
    icon: ImageIcon,
  },
  {
    code: 'OPEN_JSON',
    label: 'JSON kèm nguồn gốc',
    hint: 'Manifest bản duyệt + Provenance Report, kiểm chứng bằng SHA-256',
    icon: FileJson,
  },
];

const STATUS_LABEL: Record<ExportJobDto['status'], { text: string; className: string }> = {
  Queued: { text: 'Đang chờ', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  Processing: { text: 'Đang dựng', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  Completed: { text: 'Xong', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  Failed: { text: 'Lỗi', className: 'bg-red-50 text-red-700 border-red-300' },
  Cancelled: { text: 'Đã huỷ', className: 'bg-stone-100 text-stone-600 border-stone-300' },
};

const formatSize = (bytes?: number | null) =>
  bytes == null
    ? '—'
    : bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** UC-12 / view-handoff: Đóng gói bản thảo gửi nhà xuất bản (PDF/CBZ/Webtoon/JSON). */
export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const { t } = useTranslation('review');

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesFormat, setSeriesFormat] = useState('');
  const [formats, setFormats] = useState<ExportPresetCode[]>(['PDF']);
  const [jobs, setJobs] = useState<ExportJobDto[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
        const exportable = (res.items || []).filter(
          (c) => c.status === 'ChapterApproved' || c.status === 'HandedOffAndPublished',
        );
        setChapters(exportable);
        setChapterId((current) => current || exportable[0]?.id || '');
      })
      .catch((err) => onShowToast('Không thể tải danh sách chương', err.message));
  }, [seriesId, onShowToast]);

  const fetchJobs = useCallback(async () => {
    if (!chapterId) return setJobs([]);
    try {
      setJobs(await exportService.getExports(chapterId));
    } catch (err: any) {
      onShowToast('Không thể tải bản xuất', err.message);
    }
  }, [chapterId, onShowToast]);

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
      if (r.status === 'rejected') onShowToast(`Không xuất được ${formats[i]}`, r.reason?.message);
    });
    if (results.some((r) => r.status === 'fulfilled'))
      onShowToast('Đã xếp hàng xuất file', 'File được dựng ở nền; bạn sẽ nhận thông báo khi xong.');
    setSubmitting(false);
    fetchJobs();
  };

  const handleDownload = (job: ExportJobDto) =>
    exportService
      .downloadExport(chapterId, job)
      .then(fetchJobs)
      .catch((err) => onShowToast('Không tải được file', err.message));

  const handleCancel = (job: ExportJobDto) =>
    exportService
      .cancelExport(chapterId, job.id)
      .then(fetchJobs)
      .catch((err) => onShowToast('Không huỷ được', err.message));

  const selectedChapter = chapters.find((c) => c.id === chapterId);

  return (
    <div className='w-full min-h-screen bg-[#FAF9F5] font-sans text-stone-900 flex flex-col'>
      <ProducerSharedHeader
        workspaceId={workspaceId}
        seriesId={seriesId}
        currentChapterId={chapterId}
        chapters={chapters}
        seriesTitle={seriesTitle}
        seriesFormat={seriesFormat}
        currentChapter={selectedChapter}
        activeTab='handoff'
        onChapterChange={(nextId) => setChapterId(nextId)}
      />

      <div className='py-6 flex flex-col flex-1 overflow-y-auto font-sans bg-[#FAF9F5] max-w-[1640px] mx-auto w-full px-4 sm:px-6 lg:px-8'>
        {/* Main Handoff Container */}
        <div className='space-y-4' id='view-handoff'>
          {/* Header and spec summary card */}
          <div className='p-5 rounded-xl bg-white border border-stone-200/80 shadow-xs space-y-4'>
            <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-stone-200'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0 shadow-2xs'>
                  <Package className='w-5 h-5' />
                </div>
                <div>
                  <h1 className='text-base font-bold text-stone-900'>
                    {t('handoffView.title', 'Đóng gói bản thảo gửi nhà xuất bản')}
                  </h1>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t('handoffView.subtitle', 'Chuẩn file PDF/X-1a xuất bản tiêu chuẩn.')}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={handleExport}
                  disabled={submitting || formats.length === 0 || !chapterId}
                  className='px-4 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 active:scale-98'
                  data-testid='export-submit'
                >
                  {submitting ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Download className='w-3.5 h-3.5' />
                  )}
                  <span>{t('handoffView.createPackage', 'Tạo gói gửi')}</span>
                </button>
              </div>
            </div>

            {/* 2 Technical cards from cleaned view-handoff design (fake print specs slop removed) */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
              <div className='p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5'>
                <div className='flex items-center gap-1.5 font-semibold text-stone-900'>
                  <ShieldCheck className='w-3.5 h-3.5 text-emerald-600' />
                  <span>{t('handoffView.securityTitle', 'Bảo mật bản quyền')}</span>
                </div>
                <p className='text-stone-600 text-xs leading-relaxed'>
                  {t(
                    'handoffView.securityDesc',
                    'Đóng dấu chìm mã biên tập viên tự động khi xem trước và xác thực nguồn gốc SHA-256.',
                  )}
                </p>
              </div>

              <div className='p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5'>
                <div className='flex items-center gap-1.5 font-semibold text-stone-900'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-[#EA580C]' />
                  <span>{t('handoffView.readinessTitle', 'Tình trạng sẵn sàng')}</span>
                </div>
                <p className='text-stone-700 text-xs leading-relaxed'>
                  {chapters.length > 0
                    ? selectedChapter
                      ? `Chương ${selectedChapter.chapterNumber} đã sẵn sàng xuất (${selectedChapter.status}).`
                      : t('handoffView.readinessReady', 'Đã sẵn sàng xuất bản.')
                    : t(
                        'handoffView.readinessNotice',
                        'Cần xử lý xong các trang chưa đạt trước khi xuất file hoàn chỉnh.',
                      )}
                </p>
              </div>
            </div>
          </div>

          {/* Main Work Area */}
          {!seriesId ? (
            <div className='p-6 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-500'>
              Mở màn này từ trong một Series để chọn chương xuất bản.
            </div>
          ) : chapters.length === 0 ? (
            <div
              className='p-8 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-500 space-y-1 shadow-xs'
              data-testid='export-no-chapter'
            >
              <Clock className='w-6 h-6 text-stone-400 mx-auto mb-2' />
              <div className='font-bold text-stone-800 text-sm'>Chưa có chương sẵn sàng xuất</div>
              <p>
                Series chưa có chương nào được Producer duyệt (ChapterApproved) hoặc phát hành để
                xuất bản.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5'>
              {/* Left Box: Chapter & Format Selection */}
              <div className='p-5 bg-white border border-stone-200 rounded-xl flex flex-col gap-4 shadow-xs'>
                <div>
                  <label
                    htmlFor='export-chapter'
                    className='font-bold text-xs text-stone-900 block mb-1.5'
                  >
                    Chọn chương xuất bản
                  </label>
                  <select
                    id='export-chapter'
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                    className='w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#EA580C] cursor-pointer'
                    data-testid='export-chapter-select'
                  >
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        Chương {c.chapterNumber}
                        {c.title ? `: ${c.title}` : ''} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset className='space-y-3 pt-2 border-t border-stone-200'>
                  <legend className='font-bold text-xs text-stone-900 mb-2'>
                    Định dạng đóng gói
                  </legend>
                  {FORMATS.map(({ code, label, hint, icon: Icon }) => (
                    <label
                      key={code}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        formats.includes(code)
                          ? 'bg-orange-50/40 border-orange-300 ring-1 ring-orange-200'
                          : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type='checkbox'
                        checked={formats.includes(code)}
                        onChange={() => toggleFormat(code)}
                        className='mt-0.5 w-4 h-4 rounded text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C] border-stone-300 cursor-pointer'
                        data-testid={`export-format-${code}`}
                      />
                      <Icon className='w-4 h-4 mt-0.5 text-stone-500 shrink-0' />
                      <span className='min-w-0'>
                        <span className='block text-xs font-semibold text-stone-900'>{label}</span>
                        <span className='block text-xs text-stone-500 leading-normal'>{hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {/* Right Box: Export Jobs Table */}
              <div className='p-5 bg-white border border-stone-200 rounded-xl shadow-xs min-w-0 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between mb-3 pb-2 border-b border-stone-200'>
                    <div>
                      <h2 className='font-bold text-xs text-stone-900 uppercase tracking-wider'>
                        Bản xuất của chương ({jobs.length})
                      </h2>
                      <p className='text-xs text-stone-500 mt-0.5'>
                        Các bản dựng file sẵn sàng để tải về hoặc đối soát
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={fetchJobs}
                      className='p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer'
                      aria-label='Tải lại danh sách bản xuất'
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${running ? 'animate-spin text-[#EA580C]' : ''}`}
                      />
                    </button>
                  </div>

                  {jobs.length === 0 ? (
                    <div className='py-12 text-center text-xs text-stone-500'>
                      Chưa có bản xuất nào cho chương này. Chọn định dạng bên trái và bấm &quot;Tạo
                      gói gửi&quot;.
                    </div>
                  ) : (
                    <div className='overflow-x-auto'>
                      <table className='w-full text-left text-xs'>
                        <thead className='bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold'>
                          <tr>
                            <th className='py-2.5 px-3'>Định dạng</th>
                            <th className='py-2.5 px-3'>Trạng thái</th>
                            <th className='py-2.5 px-3'>Trang</th>
                            <th className='py-2.5 px-3'>Dung lượng</th>
                            <th className='py-2.5 px-3'>Tạo lúc</th>
                            <th className='py-2.5 px-3 text-right'>Thao tác</th>
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
                                <span
                                  className={`px-2 py-0.5 rounded-full border text-xs font-bold ${
                                    STATUS_LABEL[job.status].className
                                  }`}
                                >
                                  {STATUS_LABEL[job.status].text}
                                </span>
                                {job.error && (
                                  <div className='mt-1 text-xs text-red-700 max-w-xs leading-normal'>
                                    {job.error}
                                  </div>
                                )}
                              </td>
                              <td className='py-3 px-3 tabular-nums text-stone-800'>
                                {job.pageCount}
                              </td>
                              <td className='py-3 px-3 tabular-nums text-stone-800'>
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
                                {new Date(job.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td className='py-3 px-3 text-right whitespace-nowrap'>
                                {job.status === 'Completed' && (
                                  <button
                                    type='button'
                                    onClick={() => handleDownload(job)}
                                    className='px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer text-xs'
                                    data-testid={`export-download-${job.id}`}
                                  >
                                    <Download className='w-3 h-3' /> Tải
                                  </button>
                                )}
                                {job.status === 'Queued' && (
                                  <button
                                    type='button'
                                    onClick={() => handleCancel(job)}
                                    className='px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer text-xs'
                                    data-testid={`export-cancel-${job.id}`}
                                  >
                                    <X className='w-3 h-3' /> Huỷ
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
