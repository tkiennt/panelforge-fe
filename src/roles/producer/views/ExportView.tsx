import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { exportService, ExportJobDto, ExportPresetCode } from '@/services/export.service';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

const FORMATS: { code: ExportPresetCode; label: string; hint: string; icon: typeof FileText }[] = [
  {
    code: 'PDF',
    label: 'PDF',
    hint: 'Mỗi trang một ảnh, để đọc duyệt / gửi đối tác',
    icon: FileText,
  },
  {
    code: 'CBZ',
    label: 'CBZ',
    hint: 'Trình đọc truyện, lật trang theo hướng đọc của Series',
    icon: ImageIcon,
  },
  {
    code: 'PAGE_IMAGES',
    label: 'Ảnh từng trang (ZIP)',
    hint: 'Ảnh gốc đã duyệt của mỗi trang',
    icon: ImageIcon,
  },
  {
    code: 'WEBTOON',
    label: 'Webtoon cuộn dọc',
    hint: 'Ghép các trang thành một ảnh dọc',
    icon: ImageIcon,
  },
];

const STATUS_LABEL: Record<ExportJobDto['status'], { text: string; className: string }> = {
  Queued: { text: 'Đang chờ', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  Processing: { text: 'Đang dựng', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  Completed: { text: 'Xong', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  Failed: { text: 'Lỗi', className: 'bg-red-50 text-red-700 border-red-300' },
  Cancelled: { text: 'Đã huỷ', className: 'bg-zinc-100 text-zinc-600 border-zinc-300' },
};

const formatSize = (bytes?: number | null) =>
  bytes == null
    ? '—'
    : bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** UC-12: Producer xuất chương đã duyệt (Approved/Published). File dựng nền ở Backend; màn hỏi lại trạng thái tới khi xong. */
export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
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
          (c) => c.status === 'Approved' || c.status === 'Published',
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

  return (
    <PageContainer className='py-8 flex flex-col h-full overflow-y-auto custom-scrollbar font-sans'>
      <button
        onClick={() => navigate(-1)}
        className='self-start flex items-center gap-2 text-sm text-[#57534E] hover:text-[#1C1917] mb-6 transition-colors cursor-pointer font-medium'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại
      </button>

      <h1 className='text-3xl font-serif font-bold text-[#1C1917] mb-2 flex items-center gap-3'>
        <Download className='w-8 h-8 text-[#F97316]' />
        Xuất chương
      </h1>
      <p className='text-[#57534E] mb-8 text-sm'>
        Chỉ chương đã được Producer duyệt (Approved) hoặc đã phát hành mới xuất được. Nội dung
        chương đã duyệt là chỉ đọc, nên file luôn đúng bản đã duyệt.
      </p>

      {!seriesId ? (
        <p className='text-sm text-[#57534E]'>Mở màn này từ trong một Series để chọn chương.</p>
      ) : chapters.length === 0 ? (
        <p className='text-sm text-[#57534E]' data-testid='export-no-chapter'>
          Series chưa có chương nào đã duyệt để xuất.
        </p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6'>
          <div className='p-6 border border-[#D8D2C5] rounded-xl flex flex-col gap-4 bg-[#FCFBF8] shadow-xs'>
            <label htmlFor='export-chapter' className='font-bold text-sm text-[#1C1917]'>
              Chương
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
                  Chương {c.chapterNumber}
                  {c.title ? `: ${c.title}` : ''} ({c.status})
                </option>
              ))}
            </select>

            <fieldset className='space-y-3'>
              <legend className='font-bold text-sm text-[#1C1917] mb-2'>Định dạng</legend>
              {FORMATS.map(({ code, label, hint, icon: Icon }) => (
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
                    <span className='block text-sm font-semibold text-[#1C1917]'>{label}</span>
                    <span className='block text-xs text-[#57534E]'>{hint}</span>
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
              Xuất file
            </button>
          </div>

          <div className='p-6 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] shadow-xs min-w-0'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='font-bold text-[#1C1917]'>Bản xuất của chương</h2>
              <button
                type='button'
                onClick={fetchJobs}
                className='p-1 rounded text-[#78716C] hover:text-[#1C1917] cursor-pointer'
                aria-label='Tải lại danh sách bản xuất'
              >
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin text-[#F97316]' : ''}`} />
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className='text-sm text-[#57534E]'>Chưa có bản xuất nào.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='font-mono text-[10px] text-[#78716C] uppercase border-b border-[#D8D2C5]'>
                    <tr>
                      <th className='py-2 pr-3 font-semibold'>Định dạng</th>
                      <th className='py-2 pr-3 font-semibold'>Trạng thái</th>
                      <th className='py-2 pr-3 font-semibold'>Trang</th>
                      <th className='py-2 pr-3 font-semibold'>Dung lượng</th>
                      <th className='py-2 pr-3 font-semibold'>Tạo lúc</th>
                      <th className='py-2 text-right font-semibold'>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#D8D2C5]'>
                    {jobs.map((job) => (
                      <tr key={job.id} data-testid={`export-job-${job.id}`}>
                        <td className='py-2.5 pr-3 font-semibold text-[#1C1917]'>{job.format}</td>
                        <td className='py-2.5 pr-3'>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_LABEL[job.status].className}`}
                          >
                            {STATUS_LABEL[job.status].text}
                          </span>
                          {job.error && (
                            <div className='mt-1 text-[11px] text-red-700'>{job.error}</div>
                          )}
                        </td>
                        <td className='py-2.5 pr-3 tabular-nums text-[#1C1917]'>{job.pageCount}</td>
                        <td className='py-2.5 pr-3 tabular-nums text-[#1C1917]'>{formatSize(job.sizeBytes)}</td>
                        <td className='py-2.5 pr-3 font-mono text-[11px] text-[#57534E]'>
                          {new Date(job.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className='py-2.5 text-right whitespace-nowrap'>
                          {job.status === 'Completed' && (
                            <button
                              type='button'
                              onClick={() => handleDownload(job)}
                              className='px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 shadow-sm cursor-pointer'
                              data-testid={`export-download-${job.id}`}
                            >
                              <Download className='w-3.5 h-3.5' /> Tải
                            </button>
                          )}
                          {job.status === 'Queued' && (
                            <button
                              type='button'
                              onClick={() => handleCancel(job)}
                              className='px-2.5 py-1 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer'
                              data-testid={`export-cancel-${job.id}`}
                            >
                              <X className='w-3.5 h-3.5' /> Huỷ
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
