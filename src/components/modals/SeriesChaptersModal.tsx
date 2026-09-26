// src/components/modals/SeriesChaptersModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  chapterService,
  ChapterDto,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '../../services/chapter.service';

interface SeriesChaptersModalProps {
  isOpen: boolean;
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onChaptersCountChange?: (newCount: number) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const SeriesChaptersModal: React.FC<SeriesChaptersModalProps> = ({
  isOpen,
  seriesId,
  seriesTitle,
  onClose,
  onChaptersCountChange,
  onShowToast,
}) => {
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
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

  // Edit Chapter Modal/Form State
  const [editingChapter, setEditingChapter] = useState<ChapterDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetReleaseDate, setEditTargetReleaseDate] = useState('');

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
      };

      const created = await chapterService.createChapter(seriesId, payload);
      onShowToast?.(
        'Tạo Chương thành công (UC-03)',
        `Đã tạo Chương ${created.chapterNumber}: "${created.title || 'Không tiêu đề'}" kèm mốc lịch phát hành.`,
      );

      setNewTitle('');
      setNewTargetReleaseDate('');
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
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    setActionLoading(true);
    try {
      const payload: UpdateChapterRequest = {
        title: editTitle.trim() || undefined,
        targetReleaseDate: editTargetReleaseDate || undefined,
      };

      await chapterService.updateChapter(editingChapter.id, payload);
      onShowToast?.(
        'Cập nhật thành công',
        `Đã cập nhật thông tin và lịch phát hành cho Chương ${editingChapter.chapterNumber}.`,
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
          <span>Còn {diffDays} ngày ({dateStr})</span>
        </span>
      );
    }
  };

  // Helper formatting for BE chapter status (F7)
  const renderChapterStatus = (status?: string, publishedAt?: string | null) => {
    switch (status) {
      case 'Published':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1'>
            <Sparkles className='w-3 h-3 text-purple-600' />
            <span>Xuất bản {publishedAt ? `(${new Date(publishedAt).toLocaleDateString('vi-VN')})` : ''}</span>
          </span>
        );
      case 'Approved':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
            <span>Đã duyệt</span>
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
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
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
              Tổng số:{' '}
              <strong className='text-[#171717] font-mono'>{totalCount}</strong> chương đã khởi tạo.
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
                  {actionLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : <Plus className='w-3 h-3' />}
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
                  <label className='block font-semibold text-[#171717] mb-1'>Tiêu đề chương</label>
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
                  {actionLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : <Save className='w-3 h-3' />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          )}

          {/* Chapters Table */}
          <div className='border border-[#E7E7E7] rounded-xl overflow-hidden'>
            <table className='w-full text-left border-collapse'>
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
                          {chap.title || <span className='text-[#888888] italic'>Chưa đặt tên</span>}
                        </div>
                        <div className='text-[10px] text-[#888888] font-mono'>
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

                      <td className='py-3 px-3 text-right'>
                        <div className='inline-flex items-center gap-1.5'>
                          <button
                            type='button'
                            onClick={() => handleStartEdit(chap)}
                            className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer'
                            title='Sửa tiêu đề & ngày phát hành'
                          >
                            <Edit2 className='w-3.5 h-3.5' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeleteChapter(chap)}
                            className='p-1.5 rounded-lg hover:bg-red-50 text-[#888888] hover:text-red-600 transition-all cursor-pointer'
                            title='Xóa chương'
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
            * TargetReleaseDate hỗ trợ quản lý lịch phát hành cho Producer &amp; Editor (UC-03 Phase 3).
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
  );
};
