import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
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
  GitBranch,
  Camera,
  Upload,
  Lock,
} from 'lucide-react';
import {
  chapterService,
  ChapterDto,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '@/services/chapter.service';
import { ChapterAssignmentsModal } from './ChapterAssignmentsModal';
import { ChapterReviewsModal } from '@/shared/modals/ChapterReviewsModal';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { PreviewLinksModal } from './PreviewLinksModal';
import { TypeToConfirmModal } from '@/shared/components/lucian';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { ChapterPriceBadge } from '@/shared/components/ChapterPriceBadge';

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
  const { t } = useTranslation('production');
  const confirm = useConfirm();
  const { workspaceId: paramWorkspaceId } = useParams();
  const effectiveWorkspaceId =
    propWorkspaceId ||
    paramWorkspaceId ||
    (() => {
      try {
        const stored = localStorage.getItem('activeWorkspace');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          return JSON.parse(stored)?.id || '';
        }
      } catch {
        // Ignore parse error
      }
      return '';
    })() ||
    '';

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [assigningChapter, setAssigningChapter] = useState<ChapterDto | null>(null);
  const [reviewingChapter, setReviewingChapter] = useState<ChapterDto | null>(null);
  const [previewChapter, setPreviewChapter] = useState<ChapterDto | null>(null);
  const [provenanceChapter, setProvenanceChapter] = useState<ChapterDto | null>(null);
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
  const [newIsLocked, setNewIsLocked] = useState(false);
  const [newPriceVnd, setNewPriceVnd] = useState(10000);

  // Edit Chapter Modal/Form State
  const [editingChapter, setEditingChapter] = useState<ChapterDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetReleaseDate, setEditTargetReleaseDate] = useState('');
  const [editOutline, setEditOutline] = useState('');
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editPriceVnd, setEditPriceVnd] = useState(10000);

  // Delete Chapter Confirmation State (Lucian #269)
  const [deleteTargetChapter, setDeleteTargetChapter] = useState<ChapterDto | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  const fetchChapters = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chapterService.getChaptersBySeries(seriesId, pageIndex, pageSize);
      const itemsList = Array.isArray(res) ? res : res?.items || [];
      setChapters(itemsList);
      const total = Array.isArray(res) ? res.length : (res?.totalCount ?? itemsList.length);
      setTotalCount(total);

      // Auto compute next chapter number
      if (itemsList && itemsList.length > 0) {
        const maxNum = Math.max(...itemsList.map((c) => Number(c.chapterNumber) || 0));
        setNewChapterNumber(maxNum + 1);
      } else {
        setNewChapterNumber(1);
      }

      if (onChaptersCountChange) {
        onChaptersCountChange(total);
      }
    } catch (err: any) {
      setError(err.message || t('seriesChaptersModal.loading', 'Không thể tải danh sách chương.'));
    } finally {
      setLoading(false);
    }
  }, [seriesId, pageIndex, pageSize, onChaptersCountChange, t]);

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
        isLocked: newIsLocked,
        priceVnd: newIsLocked ? newPriceVnd : 0,
      };

      const created = await chapterService.createChapter(seriesId, payload);
      onShowToast?.(
        t('seriesChaptersModal.toastCreateSuccess', 'Tạo Chương thành công'),
        t('seriesChaptersModal.toastCreateSuccessDesc', {
          number: created.chapterNumber,
          title: created.title || t('seriesChaptersModal.untitled', 'Không tiêu đề'),
          defaultValue: `Đã tạo Chương ${created.chapterNumber}: "${created.title || 'Không tiêu đề'}" kèm mốc lịch phát hành.`,
        }),
      );

      setNewTitle('');
      setNewTargetReleaseDate('');
      setNewOutline('');
      setNewIsLocked(false);
      setNewPriceVnd(10000);
      setShowAddForm(false);
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastCreateError', 'Lỗi tạo chương'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadCover = async (chap: ChapterDto, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      onShowToast?.(
        t('seriesChaptersModal.toastCoverSizeTitle', 'Lỗi tệp'),
        t('seriesChaptersModal.toastCoverSizeError', 'Ảnh bìa không được vượt quá 5 MB.'),
      );
      return;
    }
    setActionLoading(true);
    try {
      const newCoverUrl = await chapterService.uploadChapterCover(chap.id, file);
      onShowToast?.(
        'Thành công',
        t('seriesChaptersModal.toastUploadCoverSuccess', {
          number: chap.chapterNumber,
          defaultValue: `Đã cập nhật ảnh bìa cho Chương ${chap.chapterNumber}.`,
        }),
      );
      setChapters((prev) =>
        prev.map((c) => (c.id === chap.id ? { ...c, coverUrl: newCoverUrl } : c)),
      );
      if (editingChapter && editingChapter.id === chap.id) {
        setEditingChapter((prev) => (prev ? { ...prev, coverUrl: newCoverUrl } : null));
      }
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastUploadCoverError', 'Lỗi tải bìa chương'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCover = async (chap: ChapterDto) => {
    setActionLoading(true);
    try {
      await chapterService.deleteChapterCover(chap.id);
      onShowToast?.(
        'Thành công',
        t('seriesChaptersModal.toastDeleteCoverSuccess', {
          number: chap.chapterNumber,
          defaultValue: `Đã xóa ảnh bìa của Chương ${chap.chapterNumber}.`,
        }),
      );
      setChapters((prev) => prev.map((c) => (c.id === chap.id ? { ...c, coverUrl: null } : c)));
      if (editingChapter && editingChapter.id === chap.id) {
        setEditingChapter((prev) => (prev ? { ...prev, coverUrl: null } : null));
      }
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastDeleteCoverError', 'Lỗi xóa bìa chương'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (chap: ChapterDto) => {
    setEditingChapter(chap);
    setEditTitle(chap.title || '');
    setEditTargetReleaseDate(chap.targetReleaseDate || '');
    setEditOutline(chap.outline || '');
    setEditIsLocked(chap.isLocked ?? false);
    setEditPriceVnd(chap.priceVnd ?? 10000);
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
        isLocked: editIsLocked,
        priceVnd: editIsLocked ? editPriceVnd : 0,
      };

      await chapterService.updateChapter(editingChapter.id, payload);
      onShowToast?.(
        t('seriesChaptersModal.toastUpdateSuccess', 'Cập nhật thành công'),
        t('seriesChaptersModal.toastUpdateSuccessDesc', {
          number: editingChapter.chapterNumber,
          defaultValue: `Đã cập nhật thông tin và đề cương cho Chương ${editingChapter.chapterNumber}.`,
        }),
      );

      setEditingChapter(null);
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastUpdateError', 'Lỗi cập nhật chương'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChapter = (chap: ChapterDto) => {
    setDeleteTargetChapter(chap);
  };

  const executeDeleteChapter = async () => {
    if (!deleteTargetChapter) return;
    setIsDeletingChapter(true);
    setActionLoading(true);
    try {
      await chapterService.deleteChapter(deleteTargetChapter.id);
      onShowToast?.(
        t('seriesChaptersModal.toastDeleteSuccess', 'Đã xóa chương'),
        t('seriesChaptersModal.toastDeleteSuccessDesc', {
          number: deleteTargetChapter.chapterNumber,
          defaultValue: `Đã xóa Chương ${deleteTargetChapter.chapterNumber}.`,
        }),
      );
      await fetchChapters();
      setDeleteTargetChapter(null);
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastDeleteError', 'Lỗi xóa chương'), err.message);
    } finally {
      setIsDeletingChapter(false);
      setActionLoading(false);
    }
  };

  const handleApproveChapter = async (chap: ChapterDto) => {
    setActionLoading(true);
    try {
      try {
        const gate = await chapterService.getChapterLockGate(chap.id);
        if (!gate.canApprove) {
          const blocking = gate.items.filter((i) => i.blocking);
          const msg =
            blocking.map((b) => b.message).join('; ') ||
            t(
              'seriesChaptersModal.toastApproveGateDefault',
              'Chương chưa hoàn thành đủ các điều kiện phê duyệt (còn công đoạn chờ Editor thẩm định).',
            );
          onShowToast?.(t('seriesChaptersModal.toastApproveGateTitle', 'Chưa đủ điều kiện duyệt chương'), msg);
          setActionLoading(false);
          return;
        }
      } catch (gateErr) {
        console.warn('Lỗi kiểm tra lock-gate:', gateErr);
      }

      if (
        !(await confirm({
          title: t('seriesChaptersModal.confirmApproveTitle', {
            number: chap.chapterNumber,
            defaultValue: `Phê duyệt hoàn tất Chương ${chap.chapterNumber}?`,
          }),
          description: t('seriesChaptersModal.confirmApproveDesc', {
            title: chap.title || t('seriesChaptersModal.untitled', 'Không tiêu đề'),
            defaultValue: `Chương "${chap.title || 'Không tiêu đề'}" sẽ chuyển sang trạng thái Approved (Chờ xuất bản). Các phân công sẽ được đóng lại để Publisher duyệt xuất bản.`,
          }),
          confirmText: t('seriesChaptersModal.confirmApproveBtn', 'Phê duyệt hoàn tất'),
          cancelText: t('seriesChaptersModal.confirmApproveCancel', 'Xem lại'),
          variant: 'info',
        }))
      ) {
        setActionLoading(false);
        return;
      }

      await chapterService.approveChapter(chap.id);
      onShowToast?.(
        t('seriesChaptersModal.toastApproveSuccess', 'Đã duyệt chương'),
        t('seriesChaptersModal.toastApproveSuccessDesc', {
          number: chap.chapterNumber,
          defaultValue: `Chương ${chap.chapterNumber} đã hoàn tất sản xuất và chuyển sang trạng thái Approved (chờ Publisher xuất bản).`,
        }),
      );
      await fetchChapters();
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastApproveError', 'Không thể duyệt chương'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /** Trả true khi đã mở lại thành công. */
  const handleReopenChapter = async (chap: ChapterDto): Promise<boolean> => {
    const comment = window.prompt(
      t('seriesChaptersModal.promptReopenReason', {
        number: chap.chapterNumber,
        defaultValue: `Nhập lý do mở lại sản xuất cho Chương ${chap.chapterNumber} (bắt buộc):`,
      }),
    );
    if (comment === null) return false;
    if (!comment.trim()) {
      onShowToast?.('Thiếu thông tin', t('seriesChaptersModal.toastReopenMissing', 'Vui lòng nhập lý do mở lại chương.'));
      return false;
    }

    setActionLoading(true);
    try {
      await chapterService.reopenChapter(chap.id, comment.trim());
      onShowToast?.(
        t('seriesChaptersModal.toastReopenSuccess', 'Đã mở lại chương'),
        t('seriesChaptersModal.toastReopenSuccessDesc', {
          number: chap.chapterNumber,
          defaultValue: `Chương ${chap.chapterNumber} đã chuyển về trạng thái InProduction để tiếp tục sản xuất.`,
        }),
      );
      await fetchChapters();
      return true;
    } catch (err: any) {
      onShowToast?.(t('seriesChaptersModal.toastReopenError', 'Không thể mở lại chương'), err.message);
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
          {t('seriesChaptersModal.noSchedule', 'Chưa đặt lịch')}
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-500 border border-neutral-200'>
          {dateStr}
        </span>
      );
    }
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600' />
          <span>{t('seriesChaptersModal.duePassed', { date: dateStr, defaultValue: `Đã đến hạn (${dateStr})` })}</span>
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1'>
          <Clock className='w-3 h-3 text-amber-600' />
          <span>{t('seriesChaptersModal.dueToday', { date: dateStr, defaultValue: `Hôm nay phát hành (${dateStr})` })}</span>
        </span>
      );
    } else {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1'>
          <Calendar className='w-3 h-3 text-blue-600' />
          <span>
            {t('seriesChaptersModal.dueInDays', { days: diffDays, date: dateStr, defaultValue: `Còn ${diffDays} ngày (${dateStr})` })}
          </span>
        </span>
      );
    }
  };

  // Helper formatting for BE chapter status (F7 + Core flow)
  const renderChapterStatus = (status?: string, publishedAt?: string | null) => {
    switch (status) {
      case 'Published': {
        const pubDate = publishedAt ? new Date(publishedAt) : null;
        const isValidDate = Boolean(pubDate && !isNaN(pubDate.getTime()));
        const isScheduled = Boolean(isValidDate && pubDate! > new Date());
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
                ? t('seriesChaptersModal.publishedScheduled', {
                    date: pubDate?.toLocaleDateString('vi-VN'),
                    defaultValue: `Lên lịch (${pubDate?.toLocaleDateString('vi-VN')})`,
                  })
                : t('seriesChaptersModal.published', {
                    date: isValidDate ? `(${pubDate?.toLocaleDateString('vi-VN')})` : '',
                    defaultValue: `Xuất bản ${isValidDate ? `(${pubDate?.toLocaleDateString('vi-VN')})` : ''}`,
                  })}
            </span>
          </span>
        );
      }
      case 'Approved':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3 text-amber-600' />
            <span>{t('seriesChaptersModal.approved', 'Chờ xuất bản')}</span>
          </span>
        );
      case 'Locked':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1'>
            <span>{t('seriesChaptersModal.locked', 'Đã khóa')}</span>
          </span>
        );
      case 'InProduction':
      default:
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1'>
            <Clock className='w-3 h-3 text-blue-600' />
            <span>{t('seriesChaptersModal.inProduction', 'Đang sản xuất')}</span>
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return createPortal(
    <>
      <div
        role='dialog'
        aria-modal='true'
        className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'
      >
        <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
          {/* Header */}
          <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
                <Calendar className='w-5 h-5' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='px-2 py-0.5 rounded-full bg-orange-50 text-[#F97316] border border-orange-200/80 font-bold text-[10px]'>
                    {t('seriesChaptersModal.headerBadge', 'Kế hoạch xuất bản')}
                  </span>
                  <span className='text-[11px] text-zinc-500 font-medium truncate max-w-xs'>
                    {seriesTitle}
                  </span>
                </div>
                <h2 className='text-base sm:text-lg font-bold text-[#171717] mt-0.5'>
                  {t('seriesChaptersModal.title', 'Quản Lý Tập & Lịch Phát Hành Chương')}
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
                {t('seriesChaptersModal.totalCountDesc', {
                  count: totalCount,
                  defaultValue: `Tổng số: ${totalCount} chương đã khởi tạo.`,
                })}
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>{showAddForm ? t('seriesChaptersModal.closeForm', 'Đóng Form') : t('seriesChaptersModal.createChapterBtn', 'Tạo Chương Mới')}</span>
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
                  <span>{t('seriesChaptersModal.addTitle', 'Khởi Tạo Tập / Chương Mới')}</span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      {t('seriesChaptersModal.chapterNumLabel', 'Số thứ tự chương (Chapter #) *')}
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
                      {t('seriesChaptersModal.chapterTitleLabel', 'Tiêu đề chương (Title)')}
                    </label>
                    <input
                      type='text'
                      placeholder={t('seriesChaptersModal.chapterTitlePlaceholder', 'Ví dụ: Khởi Đầu Mới')}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>

                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      {t('seriesChaptersModal.targetDateLabel', 'Ngày phát hành dự kiến (Target Date)')}
                    </label>
                    <input
                      type='date'
                      value={newTargetReleaseDate}
                      onChange={(e) => setNewTargetReleaseDate(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                </div>

                <ChapterPricingFields
                  isLocked={newIsLocked}
                  priceVnd={newPriceVnd}
                  onLockedChange={setNewIsLocked}
                  onPriceChange={setNewPriceVnd}
                />

                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <label className='block font-semibold text-[#171717]'>
                      {t('seriesChaptersModal.outlineLabel', 'Đề Cương / Tóm Tắt Chương (Outline)')}
                    </label>
                    <span className='text-[10px] text-[#F97316] font-mono font-medium'>
                      {t('seriesChaptersModal.aiWriterBadge', 'Đầu vào AI Writer Agent')}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={newOutline}
                    onChange={(e) => setNewOutline(e.target.value)}
                    placeholder={t('seriesChaptersModal.outlinePlaceholder', 'Tóm tắt diễn biến, cốt truyện chính và các tình tiết của chương này...')}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  />
                  <p className='text-[10px] text-[#737373] mt-1'>
                    {t('seriesChaptersModal.outlineHint', 'Đề cương sẽ được chụp vào snapshot và cung cấp trực tiếp cho AI Writer khi viết kịch bản phân cảnh.')}
                  </p>
                </div>

                <div className='flex justify-end gap-2 pt-1'>
                  <button
                    type='button'
                    onClick={() => setShowAddForm(false)}
                    className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#FAF8F5]'
                  >
                    {t('seriesChaptersModal.cancel', 'Hủy')}
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
                    <span>{t('seriesChaptersModal.addBtn', 'Thêm Chương')}</span>
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
                    <span>{t('seriesChaptersModal.editTitle', { number: editingChapter.chapterNumber, defaultValue: `Chỉnh Sửa Chương ${editingChapter.chapterNumber}` })}</span>
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
                      {t('seriesChaptersModal.chapterTitleLabel', 'Tiêu đề chương')}
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
                      {t('seriesChaptersModal.targetDateLabel', 'Ngày phát hành dự kiến (Target Date)')}
                    </label>
                    <input
                      type='date'
                      value={editTargetReleaseDate}
                      onChange={(e) => setEditTargetReleaseDate(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                </div>

                <ChapterPricingFields
                  isLocked={editIsLocked}
                  priceVnd={editPriceVnd}
                  onLockedChange={setEditIsLocked}
                  onPriceChange={setEditPriceVnd}
                />

                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <label className='block font-semibold text-[#171717]'>
                      {t('seriesChaptersModal.outlineLabel', 'Đề Cương / Tóm Tắt Chương (Outline)')}
                    </label>
                    <span className='text-[10px] text-[#F97316] font-mono font-medium'>
                      {t('seriesChaptersModal.aiWriterBadge', 'Đầu vào AI Writer Agent')}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editOutline}
                    onChange={(e) => setEditOutline(e.target.value)}
                    placeholder={t('seriesChaptersModal.outlinePlaceholder', 'Tóm tắt diễn biến, cốt truyện chính và các tình tiết của chương này...')}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  />
                  <p className='text-[10px] text-[#737373] mt-1'>
                    {t('seriesChaptersModal.outlineHint', 'Đề cương sẽ được chụp vào snapshot và cung cấp trực tiếp cho AI Writer khi viết kịch bản phân cảnh.')}
                  </p>
                </div>

                <div className='flex justify-end gap-2 pt-1'>
                  <button
                    type='button'
                    onClick={() => setEditingChapter(null)}
                    className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555]'
                  >
                    {t('seriesChaptersModal.cancel', 'Hủy')}
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
                    <span>{t('seriesChaptersModal.saveChanges', 'Lưu Thay Đổi')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Chapters Table */}
            <div className='border border-[#E7E7E7] rounded-xl overflow-x-auto'>
              <table className='w-full min-w-[880px] text-left border-collapse'>
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-[10px] text-[#737373] uppercase'>
                  <tr>
                    <th className='py-2.5 px-3'>{t('seriesChaptersModal.thNumber', 'Chương #')}</th>
                    <th className='py-2.5 px-3'>{t('seriesChaptersModal.thTitle', 'Tiêu Đề')}</th>
                    <th className='py-2.5 px-3'>{t('seriesChaptersModal.thStatus', 'Trạng Thái')}</th>
                    <th className='py-2.5 px-3'>{t('seriesChaptersModal.thRelease', 'Lịch Phát Hành (Target Date)')}</th>
                    <th className='py-2.5 px-3'>{t('seriesChaptersModal.thScenesPages', 'Phân Cảnh / Trang')}</th>
                    <th className='py-2.5 px-3 text-right'>{t('seriesChaptersModal.thActions', 'Thao Tác')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#E7E7E7] text-xs'>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className='py-8 text-center text-[#888888]'>
                        <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                        <span>{t('seriesChaptersModal.loading', 'Đang tải danh sách chương...')}</span>
                      </td>
                    </tr>
                  ) : chapters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='py-8 text-center text-[#888888] space-y-1'>
                        <BookOpen className='w-6 h-6 mx-auto text-[#888888]' />
                        <div className='font-bold text-[#171717]'>{t('seriesChaptersModal.emptyTitle', 'Chưa có chương nào')}</div>
                        <div className='text-[11px] text-[#737373]'>
                          {t('seriesChaptersModal.emptySubtitle', 'Bấm "Tạo Chương Mới" để thiết lập lịch phát hành.')}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    chapters.map((chap) => (
                      <tr key={chap.id} className='hover:bg-[#FAF8F5] transition-colors'>
                        <td className='py-3 px-3'>
                          <div className='flex items-center gap-2.5'>
                            <div className='relative group/cover shrink-0'>
                              {chap.coverUrl ? (
                                <AuthenticatedImage
                                  src={chap.coverUrl}
                                  alt={`Bìa Chương ${chap.chapterNumber}`}
                                  className='w-10 h-14 object-cover rounded-md border border-[#E7E7E7] shadow-2xs group-hover/cover:border-[#F97316] transition-colors bg-stone-100'
                                  fallback={
                                    <div className='w-10 h-14 rounded-md bg-[#FAF8F5] border border-[#E7E7E7] flex flex-col items-center justify-center text-center p-0.5 text-stone-500'>
                                      <span className='text-[8px] font-mono uppercase tracking-wider text-stone-400'>
                                        {t('seriesChaptersModal.episodeLabel', 'TẬP')}
                                      </span>
                                      <span className='text-xs font-mono font-bold text-[#F97316]'>
                                        {chap.chapterNumber}
                                      </span>
                                    </div>
                                  }
                                />
                              ) : (
                                <div className='w-10 h-14 rounded-md bg-[#FAF8F5] border border-[#E7E7E7] flex flex-col items-center justify-center text-center p-0.5 shadow-2xs group-hover/cover:border-[#F97316] transition-colors'>
                                  <span className='text-[8px] font-mono uppercase tracking-wider text-stone-400'>
                                    {t('seriesChaptersModal.episodeLabel', 'TẬP')}
                                  </span>
                                  <span className='text-xs font-mono font-bold text-[#F97316]'>
                                    {chap.chapterNumber}
                                  </span>
                                </div>
                              )}
                              <label
                                className='absolute inset-0 bg-black/50 text-white rounded-md opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[8px] font-semibold text-center p-0.5'
                                title={t('seriesChaptersModal.changeCoverTooltip', 'Tải lên hoặc đổi ảnh bìa chương')}
                              >
                                <Camera className='w-3.5 h-3.5 mb-0.5' />
                                <span>{t('seriesChaptersModal.changeCover', 'Đổi bìa')}</span>
                                <input
                                  type='file'
                                  accept='image/png,image/jpeg,image/webp'
                                  className='hidden'
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadCover(chap, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div>
                              <span className='px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E7E7E7] font-mono font-bold text-[#F97316] text-xs'>
                                #{chap.chapterNumber}
                              </span>
                              {chap.coverUrl && (
                                <button
                                  type='button'
                                  onClick={() => handleDeleteCover(chap)}
                                  className='block mt-1 text-[10px] text-stone-400 hover:text-red-500 transition-colors'
                                  title={t('seriesChaptersModal.deleteCoverTooltip', 'Xoá ảnh bìa chương')}
                                >
                                  {t('seriesChaptersModal.deleteCover', 'Xoá bìa')}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className='py-3 px-3'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold text-[#171717]'>
                              {chap.title || (
                              <span className='text-[#888888] italic'>{t('seriesChaptersModal.untitled', 'Chưa đặt tên')}</span>
                              )}
                            </span>
                            <ChapterPriceBadge isLocked={chap.isLocked} priceVnd={chap.priceVnd} />
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
                            {t('seriesChaptersModal.createdDate', {
                              date: chap.createdAt && !isNaN(new Date(chap.createdAt).getTime())
                              ? new Date(chap.createdAt).toLocaleDateString('vi-VN')
                                : '—',
                              defaultValue: `Tạo ngày: ${
                                chap.createdAt && !isNaN(new Date(chap.createdAt).getTime())
                                  ? new Date(chap.createdAt).toLocaleDateString('vi-VN')
                                  : '—'
                              }`,
                            })}
                          </div>
                        </td>

                        <td className='py-3 px-3 whitespace-nowrap'>
                          <div className='flex flex-col gap-1 items-start'>
                            {renderChapterStatus(chap.status, chap.publishedAt)}
                            {chap.isScriptFrozen && (
                              <span
                                className='px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1'
                                title={
                                  chap.scriptContentHash
                                    ? t('seriesChaptersModal.frozenTooltipWithHash', { hash: chap.scriptContentHash, defaultValue: `Kịch bản đã đóng băng (SHA-256: ${chap.scriptContentHash})` })
                                    : t('seriesChaptersModal.frozenTooltip', 'Kịch bản đã đóng băng')
                                }
                                data-testid={`chapter-frozen-badge-${chap.chapterNumber}`}
                              >
                                <Lock className='w-2.5 h-2.5 text-indigo-600' />
                                <span>{t('seriesChaptersModal.frozenBadge', 'Kịch bản đóng băng')}</span>
                                {chap.scriptContentHash && (
                                  <span className='font-bold opacity-80'>
                                    #{chap.scriptContentHash.slice(0, 8)}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className='py-3 px-3 whitespace-nowrap'>
                          {renderReleaseStatus(chap.targetReleaseDate)}
                        </td>

                        <td className='py-3 px-3 font-mono text-[11px] text-[#555555]'>
                          {t('seriesChaptersModal.scenesAndPages', {
                            scenes: chap.scenesCount || 0,
                            pages: chap.pagesCount || 0,
                            defaultValue: `${chap.scenesCount || 0} Cảnh • ${chap.pagesCount || 0} Trang`,
                          })}
                        </td>

                        <td className='py-3 px-3 text-right whitespace-nowrap'>
                          <div className='inline-flex items-center gap-1.5 whitespace-nowrap'>
                            <button
                              type='button'
                              onClick={() => setAssigningChapter(chap)}
                              className='px-2.5 py-1 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FDBA74] text-[#EA580C] hover:text-[#C2410C] transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs'
                              title={t('seriesChaptersModal.assignTooltip', 'Giao việc & Xem tiến độ phân công')}
                            >
                              <ClipboardList className='w-3.5 h-3.5 text-[#F97316]' />
                              <span>{t('seriesChaptersModal.assign', 'Giao việc')}</span>
                            </button>

                            {chap.status === 'InProduction' && (
                              <button
                                type='button'
                                onClick={() => handleApproveChapter(chap)}
                                disabled={actionLoading}
                                className='px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs shadow-xs disabled:opacity-50 active:scale-98'
                                title={t('seriesChaptersModal.approveTooltip', 'Producer duyệt hoàn tất sản xuất -> chuyển sang Approved')}
                                data-testid={`producer-approve-chapter-${chap.id}`}
                              >
                                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-200' />
                                <span>{t('seriesChaptersModal.approve', 'Nghiệm thu & Duyệt')}</span>
                              </button>
                            )}

                            {chap.status === 'Approved' && (
                              <button
                                type='button'
                                onClick={() => handleReopenChapter(chap)}
                                disabled={actionLoading}
                                className='px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs disabled:opacity-50'
                                title={t('seriesChaptersModal.reopenTooltip', 'Mở lại sản xuất (chuyển về InProduction)')}
                              >
                                <RotateCcw className='w-3.5 h-3.5 text-amber-600' />
                                <span>{t('seriesChaptersModal.reopen', 'Mở lại')}</span>
                              </button>
                            )}

                            {/* InProduction: vẫn mở được để chuyển phản hồi "cần sửa" thành yêu cầu sửa (5.7) */}
                            {(chap.status === 'Approved' || chap.status === 'InProduction') && (
                              <button
                                type='button'
                                onClick={() => setPreviewChapter(chap)}
                                className='px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px] shadow-2xs'
                                title={t('seriesChaptersModal.previewTooltip', 'Tạo & Quản lý link xem thử bảo mật (CF5)')}
                                data-testid={`preview-links-btn-${chap.id}`}
                              >
                                <Share2 className='w-3.5 h-3.5 text-indigo-600' />
                                <span>
                                  {chap.status === 'Approved' ? t('seriesChaptersModal.previewSend', 'Gửi xem thử') : t('seriesChaptersModal.previewFeedback', 'Phản hồi xem thử')}
                                </span>
                              </button>
                            )}

                            <button
                              type='button'
                              onClick={() => setReviewingChapter(chap)}
                              className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer'
                              title={t('seriesChaptersModal.historyTooltip', 'Xem lịch sử phê duyệt & xuất bản')}
                            >
                              <History className='w-3.5 h-3.5' />
                            </button>

                            <button
                              type='button'
                              onClick={() => setProvenanceChapter(chap)}
                              className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer'
                              title={t('seriesChaptersModal.provenanceTooltip', 'Bản duyệt, Provenance Report và lịch sử AI (CF4)')}
                              aria-label={t('seriesChaptersModal.provenanceAriaLabel', { number: chap.chapterNumber, defaultValue: `Lịch sử và nguồn gốc chương ${chap.chapterNumber}` })}
                            >
                              <GitBranch className='w-3.5 h-3.5' />
                            </button>

                            <button
                              type='button'
                              onClick={() => handleStartEdit(chap)}
                              disabled={chap.status === 'Approved' || chap.status === 'Published'}
                              className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
                              title={
                                chap.status === 'Approved' || chap.status === 'Published'
                                  ? t('seriesChaptersModal.editDisabledTooltip', 'Chương đã duyệt hoặc đã xuất bản')
                                  : t('seriesChaptersModal.editTooltip', 'Sửa tiêu đề & ngày phát hành')
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
                                  ? t('seriesChaptersModal.deleteDisabledTooltip', 'Chương đã duyệt hoặc đã xuất bản không thể xóa')
                                  : t('seriesChaptersModal.deleteTooltip', 'Xóa chương')
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
                  {t('seriesChaptersModal.pagination', {
                    current: pageIndex,
                    total: totalPages,
                    count: totalCount,
                    defaultValue: `Trang ${pageIndex} / ${totalPages} (Tổng ${totalCount} chương)`,
                  })}
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
              {t('seriesChaptersModal.footerNote', '* Ngày phát hành dự kiến hỗ trợ ban biên tập đối chiếu và điều phối tiến độ sản xuất kịp thời.')}
            </div>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-[#171717] hover:bg-black text-white font-semibold rounded-lg'
            >
              {t('seriesChaptersModal.close', 'Đóng')}
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

      {/* CF4: Bản duyệt, Provenance Report, lịch sử AI */}
      {provenanceChapter && (
        <ChapterProvenanceModal
          seriesId={seriesId}
          chapterId={provenanceChapter.id}
          chapterNumber={provenanceChapter.chapterNumber}
          chapterTitle={provenanceChapter.title}
          viewerRole='Producer'
          onClose={() => setProvenanceChapter(null)}
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
      {/* Lucian #269: Type-to-confirm Delete Chapter Modal */}
      {deleteTargetChapter && (
        <TypeToConfirmModal
          isOpen={!!deleteTargetChapter}
          targetName={
            deleteTargetChapter.title?.trim() || `Chương ${deleteTargetChapter.chapterNumber}`
          }
          title={t('seriesChaptersModal.deleteConfirmTitle', 'Xác nhận xóa chương')}
          description={t('seriesChaptersModal.deleteConfirmDesc', {
            number: deleteTargetChapter.chapterNumber,
            defaultValue: `Bạn có chắc chắn muốn xóa Chương ${deleteTargetChapter.chapterNumber}? Dữ liệu trang và phân cảnh sẽ được đánh dấu xóa mềm. Vui lòng nhập chính xác tên chương bên dưới để xác nhận:`,
          })}
          onConfirm={executeDeleteChapter}
          onCancel={() => setDeleteTargetChapter(null)}
          isDeleting={isDeletingChapter}
        />
      )}
    </>,
    document.body,
  );
};

const CHAPTER_PRICE_PRESETS_VND = [5000, 10000, 15000, 20000];
const MIN_CHAPTER_PRICE_VND = 1000;

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

interface ChapterPricingFieldsProps {
  isLocked: boolean;
  priceVnd: number;
  onLockedChange: (value: boolean) => void;
  onPriceChange: (value: number) => void;
}

/** Toggle "Chương trả phí" + ô nhập giá VNĐ + nút chọn nhanh mệnh giá (form tạo & sửa chương). */
const ChapterPricingFields: React.FC<ChapterPricingFieldsProps> = ({
  isLocked,
  priceVnd,
  onLockedChange,
  onPriceChange,
}) => {
  const { t } = useTranslation();
  const priceTooLow = isLocked && priceVnd < MIN_CHAPTER_PRICE_VND;

  return (
    <div className='p-3 bg-white border border-[#E7E7E7] rounded-lg space-y-2.5'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 select-none'>
          <button
            type='button'
            role='switch'
            aria-checked={isLocked}
            aria-label={t('payments.chapterPricing.toggle')}
            onClick={() => onLockedChange(!isLocked)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              isLocked ? 'bg-[#F97316]' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isLocked ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className='font-semibold text-xs text-[#171717] flex items-center gap-1.5'>
            <Lock className='w-3.5 h-3.5 text-amber-600' />
            {t('payments.chapterPricing.toggle')}
          </span>
        </div>
        <span className='text-[10px] text-stone-500 text-right'>
          {isLocked
            ? t('payments.chapterPricing.lockedHint')
            : t('payments.chapterPricing.freeHint')}
        </span>
      </div>

      {isLocked && (
        <div className='pt-2 border-t border-dashed border-[#E7E7E7] space-y-1.5 animate-in fade-in duration-150'>
          <div className='flex flex-wrap items-center gap-2'>
            <label className='text-xs font-semibold text-[#171717] shrink-0'>
              {t('payments.chapterPricing.priceLabel')}
            </label>
            <input
              type='number'
              min={MIN_CHAPTER_PRICE_VND}
              step={1000}
              required
              value={priceVnd}
              onChange={(e) => onPriceChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className='w-32 px-2.5 py-1 bg-[#FFF7ED] border border-[#FDBA74] rounded-lg text-xs font-mono font-bold text-[#F97316] focus:outline-none'
            />
            <span className='text-xs text-stone-400'>{t('payments.chapterPricing.quickPick')}</span>
            {CHAPTER_PRICE_PRESETS_VND.map((amt) => (
              <button
                key={amt}
                type='button'
                onClick={() => onPriceChange(amt)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors border ${
                  priceVnd === amt
                    ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                    : 'bg-stone-100 hover:bg-amber-100 hover:text-amber-800 text-stone-600 border-stone-200'
                }`}
              >
                {formatVnd(amt)}
              </button>
            ))}
          </div>
          {priceTooLow && (
            <p className='text-[10px] text-rose-600'>
              {t('payments.chapterPricing.minPrice', { min: formatVnd(MIN_CHAPTER_PRICE_VND) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
