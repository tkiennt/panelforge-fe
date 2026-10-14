import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  ClipboardList,
  History,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  chapterService,
  ChapterDto,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '@/services/chapter.service';
import { ChapterAssignmentsModal } from './ChapterAssignmentsModal';
import { ChapterReviewsModal } from '@/shared/modals/ChapterReviewsModal';
import { PreviewLinksModal } from './PreviewLinksModal';

interface SeriesChaptersModalProps {
  isOpen: boolean;
  workspaceId?: string;
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onChaptersCountChange?: (newCount: number) => void;
  onChapterCountChange?: (delta: number) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const SeriesChaptersModal: React.FC<SeriesChaptersModalProps> = ({
  isOpen,
  workspaceId: propWorkspaceId,
  seriesId,
  seriesTitle,
  onClose,
  onChaptersCountChange,
  onChapterCountChange,
  onShowToast,
}) => {
  const { workspaceId: paramWorkspaceId } = useParams();
  const effectiveWorkspaceId =
    propWorkspaceId ||
    paramWorkspaceId ||
    JSON.parse(localStorage.getItem('activeWorkspace') || '{}').id ||
    '';

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [assigningChapter, setAssigningChapter] = useState<ChapterDto | null>(null);
  const [reviewingChapter, setReviewingChapter] = useState<ChapterDto | null>(null);
  const [previewChapter, setPreviewChapter] = useState<ChapterDto | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Chapter Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState(1);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetReleaseDate, setNewTargetReleaseDate] = useState('');
  const [newOutline, setNewOutline] = useState('');

  // Edit Chapter Modal/Form State
  const [editingChapter, setEditingChapter] = useState<ChapterDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetReleaseDate, setEditTargetReleaseDate] = useState('');
  const [editOutline, setEditOutline] = useState('');

  const fetchChapters = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chapterService.getChaptersBySeries(seriesId, pageIndex, pageSize);
      setChapters(res.items || []);
      setTotalCount(res.totalCount || 0);

      // Auto compute next chapter number
      if (res.items && res.items.length > 0) {
        const maxNum = Math.max(...res.items.map((c) => Number(c.chapterNumber)));
        setNewChapterNumber(maxNum + 1);
      } else {
        setNewChapterNumber(1);
      }

      if (onChaptersCountChange) {
        onChaptersCountChange(res.totalCount || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách chương.');
    } finally {
      setLoading(false);
    }
  }, [seriesId, pageIndex, pageSize, onChaptersCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchChapters();
    }
  }, [isOpen, fetchChapters]);

  if (!isOpen) return null;

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId) return;
    setActionLoading(true);
    try {
      const payload: CreateChapterRequest = {
        chapterNumber: Number(newChapterNumber),
        title: newTitle.trim() || undefined,
        targetReleaseDate: newTargetReleaseDate || undefined,
        outline: newOutline.trim() || undefined,
      };

      const created = await chapterService.createChapter(seriesId, payload);
      onShowToast?.(
        'Tạo Chương thành công (UC-03)',
        `Đã tạo Chương ${created.chapterNumber}: "${created.title || 'Không tiêu đề'}" kèm mốc lịch phát hành.`,
      );

      setNewTitle('');
      setNewTargetReleaseDate('');
      setNewOutline('');
      setShowAddForm(false);
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi tạo chương', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (chap: ChapterDto) => {
    setEditingChapter(chap);
    setEditTitle(chap.title || '');
    setEditTargetReleaseDate(chap.targetReleaseDate || '');
    setEditOutline(chap.outline || '');
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    setActionLoading(true);
    try {
      const payload: UpdateChapterRequest = {
        title: editTitle.trim() === '' ? '' : editTitle.trim(),
        targetReleaseDate: editTargetReleaseDate || undefined,
        outline: editOutline.trim() === '' ? '' : editOutline.trim(),
      };

      await chapterService.updateChapter(editingChapter.id, payload);
      onShowToast?.(
        'Cập nhật thành công',
        `Đã cập nhật thông tin và đề cương cho Chương ${editingChapter.chapterNumber}.`,
      );

      setEditingChapter(null);
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi cập nhật chương', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChapter = async (chap: ChapterDto) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa Chương ${chap.chapterNumber}: "${chap.title || 'Không tiêu đề'}"? Dữ liệu trang và phân cảnh sẽ được đánh dấu xóa mềm.`,
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await chapterService.deleteChapter(chap.id);
      onShowToast?.('Đã xóa chương', `Đã xóa Chương ${chap.chapterNumber}.`);
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.('Lỗi xóa chương', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveChapter = async (chap: ChapterDto) => {
    if (
      !window.confirm(
        `Xác nhận phê duyệt hoàn tất sản xuất Chương ${chap.chapterNumber}: "${chap.title || 'Không tiêu đề'}"?\n\nChương sẽ chuyển sang trạng thái Approved (Chờ xuất bản). Theo quy tắc BR-12, các phân công của chương sẽ được đóng lại để Publisher duyệt xuất bản.`,
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await chapterService.approveChapter(chap.id);
      onShowToast?.(
        'Đã duyệt chương',
        `Chương ${chap.chapterNumber} đã hoàn tất sản xuất và chuyển sang trạng thái Approved (chờ Publisher xuất bản).`,
      );
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.('Không thể duyệt chương', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /** Trả true khi đã mở lại thành công. */
  const handleReopenChapter = async (chap: ChapterDto): Promise<boolean> => {
    const comment = window.prompt(
      `Nhập lý do mở lại sản xuất cho Chương ${chap.chapterNumber} (bắt buộc):`,
    );
    if (comment === null) return false;
    if (!comment.trim()) {
      onShowToast?.('Thiếu thông tin', 'Vui lòng nhập lý do mở lại chương.');
      return false;
    }

    setActionLoading(true);
    try {
      await chapterService.reopenChapter(chap.id, comment.trim());
      onShowToast?.(
        'Đã mở lại chương',
        `Chương ${chap.chapterNumber} đã chuyển về trạng thái InProduction để tiếp tục sản xuất.`,
      );
      await fetchChapters();
      return true;
    } catch (err: any) {
      onShowToast?.('Không thể mở lại chương', err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formatting for release date badge
  const renderReleaseStatus = (dateStr?: string | null) => {
    if (!dateStr) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-500 border border-neutral-200'>
          Chưa đặt lịch
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600' />
          <span>Đã đến hạn ({dateStr})</span>
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1'>
          <Clock className='w-3 h-3 text-amber-600' />
          <span>Hôm nay phát hành ({dateStr})</span>
        </span>
      );
    } else {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1'>
          <Calendar className='w-3 h-3 text-blue-600' />
          <span>
            Còn {diffDays} ngày ({dateStr})
          </span>
        </span>
      );
    }
  };

  // Helper formatting for BE chapter status (F7 + Core flow)
  const renderChapterStatus = (status?: string, publishedAt?: string | null) => {
    switch (status) {
      case 'Published': {
        const isScheduled = publishedAt && new Date(publishedAt) > new Date();
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border flex items-center gap-1 ${
              isScheduled
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isScheduled ? (
              <Calendar className='w-3 h-3 text-purple-600' />
            ) : (
              <Sparkles className='w-3 h-3 text-emerald-600' />
            )}
            <span>
              {isScheduled
                ? `Lên lịch (${new Date(publishedAt).toLocaleDateString('vi-VN')})`
                : `Xuất bản ${publishedAt ? `(${new Date(publishedAt).toLocaleDateString('vi-VN')})` : ''}`}
            </span>
          </span>
        );
      }
      case 'Approved':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3 text-amber-600' />
            <span>Chờ xuất bản</span>
          </span>
        );
      case 'Locked':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1'>
            <span>Đã khóa</span>
          </span>
        );
      case 'InProduction':
      default:
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1'>
            <Clock className='w-3 h-3 text-blue-600' />
            <span>Đang sản xuất</span>
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <>
      <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
        <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
          {/* Header */}
          <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
                <Calendar className='w-5 h-5' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[9px] font-bold'>
                    UC-03 // RELEASE CALENDAR
                  </span>
                  <span className='text-[10px] text-[#888888] font-mono'>Chapter Scheduling</span>
                </div>
                <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                  Lịch Phát Hành &amp; Quản Lý Tập/Chương: {seriesTitle}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Content Body */}
          <div className='p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs'>
            {error && (
              <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 shrink-0' />
                <span>{error}</span>
              </div>
            )}

            {/* Action bar */}
            <div className='flex items-center justify-between'>
              <div className='text-xs text-[#737373]'>
                Tổng số: <strong className='text-[#171717] font-mono'>{totalCount}</strong> chương
                đã khởi tạo.
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>{showAddForm ? 'Đóng Form' : 'Tạo Chương Mới'}</span>
              </button>
            </div>

            {/* Add Chapter Form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateChapter}
                className='p-4 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3 animate-in fade-in duration-150'
              >
                <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                  <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>Khởi Tạo Tập / Chương Mới</span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      Số thứ tự chương (Chapter #) *
                    </label>
                    <input
                      type='number'
                      step='any'
                      min={0.1}
                      required
                      value={newChapterNumber}
                      onChange={(e) => setNewChapterNumber(parseFloat(e.target.value) || 1)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg font-mono text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>

                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      Tiêu đề chương (Title)
                    </label>
                    <input
                      type='text'
                      placeholder='Ví dụ: Khởi Đầu Mới'
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>

                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      Ngày phát hành dự kiến (Target Date)
                    </label>
                    <input
                      type='date'
                      value={newTargetReleaseDate}
                      onChange={(e) => setNewTargetReleaseDate(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <label className='block font-semibold text-[#171717]'>
                      Đề Cương / Tóm Tắt Chương (Outline)
                    </label>
                    <span className='text-[10px] text-[#F97316] font-mono font-medium'>
                      Đầu vào AI Writer Agent
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={newOutline}
                    onChange={(e) => setNewOutline(e.target.value)}
                    placeholder='Tóm tắt diễn biến, cốt truyện chính và các tình tiết của chương này...'
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  />
                  <p className='text-[10px] text-[#737373] mt-1'>
                    Đề cương sẽ được chụp vào snapshot và cung cấp trực tiếp cho AI Writer khi viết
                    kịch bản phân cảnh.
                  </p>
                </div>

                <div className='flex justify-end gap-2 pt-1'>
                  <button
                    type='button'
                    onClick={() => setShowAddForm(false)}
                    className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#FAF8F5]'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    disabled={actionLoading}
                    className='px-3.5 py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1.5 disabled:opacity-50'
                  >
                    {actionLoading ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <Plus className='w-3 h-3' />
                    )}
                    <span>Thêm Chương</span>
                  </button>
                </div>
              </form>
            )}

            {/* Edit Chapter Inline Form */}
            {editingChapter && (
              <form
                onSubmit={handleUpdateChapter}
                className='p-4 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl space-y-3 animate-in fade-in duration-150'
              >
                <div className='font-bold text-xs text-[#171717] flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <Edit2 className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>Chỉnh Sửa Chương {editingChapter.chapterNumber}</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => setEditingChapter(null)}
                    className='text-[#888888] hover:text-[#171717]'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      Tiêu đề chương
                    </label>
                    <input
                      type='text'
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>

                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      Ngày phát hành dự kiến (Target Date)
                    </label>
                    <input
                      type='date'
                      value={editTargetReleaseDate}
                      onChange={(e) => setEditTargetReleaseDate(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <label className='block font-semibold text-[#171717]'>
                      Đề Cương / Tóm Tắt Chương (Outline)
                    </label>
                    <span className='text-[10px] text-[#F97316] font-mono font-medium'>
                      Đầu vào AI Writer Agent
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editOutline}
                    onChange={(e) => setEditOutline(e.target.value)}
                    placeholder='Tóm tắt diễn biến, cốt truyện chính và các tình tiết của chương này...'
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  />
                  <p className='text-[10px] text-[#737373] mt-1'>
                    Đề cương sẽ được chụp vào snapshot và cung cấp trực tiếp cho AI Writer khi viết
                    kịch bản phân cảnh.
                  </p>
                </div>

                <div className='flex justify-end gap-2 pt-1'>
                  <button
                    type='button'
                    onClick={() => setEditingChapter(null)}
                    className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555]'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    disabled={actionLoading}
                    className='px-3.5 py-1 rounded-lg bg-[#171717] hover:bg-black text-white font-semibold flex items-center gap-1.5 disabled:opacity-50'
                  >
                    {actionLoading ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <Save className='w-3 h-3' />
                    )}
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </form>
            )}

            {/* Chapters Table */}
            <div className='border border-[#E7E7E7] rounded-xl overflow-x-auto'>
              <table className='w-full min-w-[880px] text-left border-collapse'>
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-[10px] text-[#737373] uppercase'>
                  <tr>
                    <th className='py-2.5 px-3'>Chương #</th>
                    <th className='py-2.5 px-3'>Tiêu Đề</th>
                    <th className='py-2.5 px-3'>Trạng Thái</th>
                    <th className='py-2.5 px-3'>Lịch Phát Hành (Target Date)</th>
                    <th className='py-2.5 px-3'>Phân Cảnh / Trang</th>
                    <th className='py-2.5 px-3'>Version Vector</th>
                    <th className='py-2.5 px-3 text-right'>Thao Tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#E7E7E7] text-xs'>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className='py-8 text-center text-[#888888]'>
                        <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                        <span>Đang tải danh sách chương...</span>
                      </td>
                    </tr>
                  ) : chapters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='py-8 text-center text-[#888888] space-y-1'>
                        <BookOpen className='w-6 h-6 mx-auto text-[#888888]' />
                        <div className='font-bold text-[#171717]'>Chưa có chương nào</div>
                        <div className='text-[11px] text-[#737373]'>
                          Bấm &quot;Tạo Chương Mới&quot; để thiết lập lịch phát hành.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    chapters.map((chap) => (
                      <tr key={chap.id} className='hover:bg-[#FAF8F5] transition-colors'>
                        <td className='py-3 px-3 font-mono font-bold text-[#171717]'>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E7E7E7] text-[#F97316]'>
                            #{chap.chapterNumber}
                          </span>
                        </td>

                        <td className='py-3 px-3'>
                          <div className='font-semibold text-[#171717]'>
                            {chap.title || (
                              <span className='text-[#888888] italic'>Chưa đặt tên</span>
                            )}
                          </div>
                          {chap.outline && (
                            <div className='mt-1 flex items-start gap-1'>
                              <span className='px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono shrink-0'>
                                Outline
                              </span>
                              <span
                                className='text-[10px] text-zinc-500 line-clamp-1'
                                title={chap.outline}
                              >
                                {chap.outline}
                              </span>
                            </div>
                          )}
                          <div className='text-[10px] text-[#888888] font-mono mt-0.5'>
                            Tạo ngày: {new Date(chap.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>

                        <td className='py-3 px-3 whitespace-nowrap'>
                          {renderChapterStatus(chap.status, chap.publishedAt)}
                        </td>

                        <td className='py-3 px-3 whitespace-nowrap'>
                          {renderReleaseStatus(chap.targetReleaseDate)}
                        </td>

                        <td className='py-3 px-3 font-mono text-[11px] text-[#555555]'>
                          {chap.scenesCount || 0} Cảnh • {chap.pagesCount || 0} Trang
                        </td>

                        <td className='py-3 px-3 font-mono text-[11px] text-[#888888]'>
                          v{chap.versionVector}
                        </td>

                        <td className='py-3 px-3 text-right whitespace-nowrap'>
                          <div className='inline-flex items-center gap-1.5 whitespace-nowrap'>
                            <button
                              type='button'
                              onClick={() => setAssigningChapter(chap)}
                              className='px-2.5 py-1 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FDBA74] text-[#EA580C] hover:text-[#C2410C] transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs'
                              title='Giao việc & Xem tiến độ phân công (UC-05 Assignment)'
                            >
                              <ClipboardList className='w-3.5 h-3.5 text-[#F97316]' />
                              <span>Giao việc</span>
                            </button>

                            {chap.status === 'InProduction' && (
                              <button
                                type='button'
                                onClick={() => handleApproveChapter(chap)}
                                disabled={actionLoading}
                                className='px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs disabled:opacity-50'
                                title='Producer duyệt hoàn tất sản xuất -> chuyển sang Approved'
                              >
                                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                                <span>Duyệt</span>
                              </button>
                            )}

                            {chap.status === 'Approved' && (
                              <button
                                type='button'
                                onClick={() => handleReopenChapter(chap)}
                                disabled={actionLoading}
                                className='px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs disabled:opacity-50'
                                title='Mở lại sản xuất (chuyển về InProduction)'
                              >
                                <RotateCcw className='w-3.5 h-3.5 text-amber-600' />
                                <span>Mở lại</span>
                              </button>
                            )}

                            {/* InProduction: vẫn mở được để chuyển phản hồi "cần sửa" thành yêu cầu sửa (5.7) */}
                            {(chap.status === 'Approved' || chap.status === 'InProduction') && (
                              <button
                                type='button'
                                onClick={() => setPreviewChapter(chap)}
                                className='px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs'
                                title='Tạo & Quản lý link xem thử bảo mật (CF5)'
                                data-testid={`preview-links-btn-${chap.id}`}
                              >
                                <Share2 className='w-3.5 h-3.5 text-indigo-600' />
                                <span>
                                  {chap.status === 'Approved' ? 'Gửi xem thử' : 'Phản hồi xem thử'}
                                </span>
                              </button>
                            )}

                            <button
                              type='button'
                              onClick={() => setReviewingChapter(chap)}
                              className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer'
                              title='Xem lịch sử phê duyệt & xuất bản'
                            >
                              <History className='w-3.5 h-3.5' />
                            </button>

                            <button
                              type='button'
                              onClick={() => handleStartEdit(chap)}
                              disabled={chap.status === 'Approved' || chap.status === 'Published'}
                              className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
                              title={
                                chap.status === 'Approved' || chap.status === 'Published'
                                  ? 'Chương đã duyệt hoặc đã xuất bản (BR-12)'
                                  : 'Sửa tiêu đề & ngày phát hành'
                              }
                            >
                              <Edit2 className='w-3.5 h-3.5' />
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeleteChapter(chap)}
                              disabled={chap.status === 'Approved' || chap.status === 'Published'}
                              className='p-1.5 rounded-lg hover:bg-red-50 text-[#888888] hover:text-red-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
                              title={
                                chap.status === 'Approved' || chap.status === 'Published'
                                  ? 'Chương đã duyệt hoặc đã xuất bản không thể xóa (BR-12)'
                                  : 'Xóa chương'
                              }
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between text-xs font-mono text-[#737373] pt-2'>
                <span>
                  Trang {pageIndex} / {totalPages} (Tổng {totalCount} chương)
                </span>
                <div className='flex items-center gap-1'>
                  <button
                    disabled={pageIndex <= 1 || loading}
                    onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                    className='p-1 rounded-lg border border-[#E7E7E7] bg-white disabled:opacity-40 hover:bg-[#FAF8F5]'
                  >
                    <ChevronLeft className='w-3.5 h-3.5' />
                  </button>
                  <button
                    disabled={pageIndex >= totalPages || loading}
                    onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                    className='p-1 rounded-lg border border-[#E7E7E7] bg-white disabled:opacity-40 hover:bg-[#FAF8F5]'
                  >
                    <ChevronRight className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] rounded-b-2xl flex items-center justify-between text-xs'>
            <div className='text-[11px] text-[#737373]'>
              * TargetReleaseDate hỗ trợ quản lý lịch phát hành cho Producer &amp; Editor (UC-03
              Phase 3).
            </div>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-[#171717] hover:bg-black text-white font-semibold rounded-lg'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* UC-05: Chapter Assignments & StageProgress Modal */}
      {assigningChapter && (
        <ChapterAssignmentsModal
          isOpen={!!assigningChapter}
          workspaceId={effectiveWorkspaceId}
          seriesId={seriesId}
          chapterId={assigningChapter.id}
          chapterNumber={assigningChapter.chapterNumber}
          chapterTitle={assigningChapter.title}
          onClose={() => setAssigningChapter(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* Chapter Reviews Timeline Modal */}
      {reviewingChapter && (
        <ChapterReviewsModal
          isOpen={!!reviewingChapter}
          chapterId={reviewingChapter.id}
          chapterNumber={reviewingChapter.chapterNumber}
          chapterTitle={reviewingChapter.title}
          onClose={() => setReviewingChapter(null)}
        />
      )}

      {/* CF5: Preview Links & Feedback Triage Modal */}
      {previewChapter && (
        <PreviewLinksModal
          isOpen={!!previewChapter}
          chapterId={previewChapter.id}
          chapterNumber={previewChapter.chapterNumber}
          chapterTitle={previewChapter.title}
          chapterStatus={previewChapter.status}
          onClose={() => setPreviewChapter(null)}
          onReopenChapter={async () => {
            // Giữ modal mở ở trạng thái mới để chuyển ngay phản hồi thành yêu cầu sửa (5.7)
            if (await handleReopenChapter(previewChapter))
              setPreviewChapter({ ...previewChapter, status: 'InProduction' });
          }}
          onShowToast={onShowToast}
        />
      )}
    </>
  );
};
