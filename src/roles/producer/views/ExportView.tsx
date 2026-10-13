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
    <PageContainer className='py-8 flex flex-col h-full overflow-y-auto custom-scrollbar'>
      <button
        onClick={() => navigate(-1)}
        className='self-start flex items-center gap-2 text-sm text-[#737373] hover:text-[#171717] mb-6 transition-colors'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại
      </button>

      <h1 className='text-3xl font-display font-bold text-[#171717] mb-2 flex items-center gap-3'>
        <Download className='w-8 h-8 text-[#8B5CF6]' />
        Xuất chương
      </h1>
      <p className='text-[#555555] mb-8'>
        Chỉ chương đã được Producer duyệt (Approved) hoặc đã phát hành mới xuất được. Nội dung
        chương đã duyệt là chỉ đọc, nên file luôn đúng bản đã duyệt.
      </p>

      {!seriesId ? (
        <p className='text-sm text-[#737373]'>Mở màn này từ trong một Series để chọn chương.</p>
      ) : chapters.length === 0 ? (
        <p className='text-sm text-[#737373]' data-testid='export-no-chapter'>
          Series chưa có chương nào đã duyệt để xuất.
        </p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6'>
          <div className='p-6 border border-[#8B5CF6] rounded-xl flex flex-col gap-4 bg-white shadow-md'>
            <label htmlFor='export-chapter' className='font-bold text-[#171717]'>
              Chương
            </label>
            <select
              id='export-chapter'
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className='px-3 py-2 border border-[#E7E7E7] rounded-lg text-sm'
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
              <legend className='font-bold text-[#171717] mb-2'>Định dạng</legend>
              {FORMATS.map(({ code, label, hint, icon: Icon }) => (
                <label key={code} className='flex items-start gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formats.includes(code)}
                    onChange={() => toggleFormat(code)}
                    className='mt-0.5 w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]'
                    data-testid={`export-format-${code}`}
                  />
                  <Icon className='w-4 h-4 mt-0.5 text-[#737373] shrink-0' />
                  <span>
                    <span className='block text-sm font-semibold'>{label}</span>
                    <span className='block text-xs text-[#737373]'>{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <button
              onClick={handleExport}
              disabled={submitting || formats.length === 0 || !chapterId}
              className='mt-auto py-2.5 bg-[#8B5CF6] text-white font-bold rounded-lg hover:bg-[#7C3AED] disabled:opacity-50 transition-colors flex items-center justify-center gap-2'
              data-testid='export-submit'
            >
              {submitting && <Loader2 className='w-4 h-4 animate-spin' />}
              Xuất file
            </button>
          </div>

          <div className='p-6 border border-[#E7E7E7] rounded-xl bg-white min-w-0'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='font-bold text-[#171717]'>Bản xuất của chương</h2>
              <button
                type='button'
                onClick={fetchJobs}
                className='p-1 rounded text-[#737373] hover:text-[#171717]'
                aria-label='Tải lại danh sách bản xuất'
              >
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin text-[#8B5CF6]' : ''}`} />
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className='text-sm text-[#737373]'>Chưa có bản xuất nào.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='font-mono text-[10px] text-[#737373] uppercase border-b border-[#E7E7E7]'>
                    <tr>
                      <th className='py-2 pr-3'>Định dạng</th>
                      <th className='py-2 pr-3'>Trạng thái</th>
                      <th className='py-2 pr-3'>Trang</th>
                      <th className='py-2 pr-3'>Dung lượng</th>
                      <th className='py-2 pr-3'>Tạo lúc</th>
                      <th className='py-2 text-right'>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#E7E7E7]'>
                    {jobs.map((job) => (
                      <tr key={job.id} data-testid={`export-job-${job.id}`}>
                        <td className='py-2 pr-3 font-semibold'>{job.format}</td>
                        <td className='py-2 pr-3'>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_LABEL[job.status].className}`}
                          >
                            {STATUS_LABEL[job.status].text}
                          </span>
                          {job.error && (
                            <div className='mt-1 text-[11px] text-red-700'>{job.error}</div>
                          )}
                        </td>
                        <td className='py-2 pr-3'>{job.pageCount}</td>
                        <td className='py-2 pr-3'>{formatSize(job.sizeBytes)}</td>
                        <td className='py-2 pr-3 font-mono text-[11px] text-[#555555]'>
                          {new Date(job.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className='py-2 text-right whitespace-nowrap'>
                          {job.status === 'Completed' && (
                            <button
                              type='button'
                              onClick={() => handleDownload(job)}
                              className='px-2 py-1 rounded bg-[#8B5CF6] text-white font-semibold inline-flex items-center gap-1'
                              data-testid={`export-download-${job.id}`}
                            >
                              <Download className='w-3.5 h-3.5' /> Tải
                            </button>
                          )}
                          {job.status === 'Queued' && (
                            <button
                              type='button'
                              onClick={() => handleCancel(job)}
                              className='px-2 py-1 rounded border border-[#E7E7E7] text-[#555555] font-semibold inline-flex items-center gap-1'
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
