// src/roles/writer/components/script/chapter-selection/ChapterSelectionView.tsx
import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/shared/components/PageContainer';
import {
  BookOpen,
  Plus,
  Lock,
  Calendar,
  Sparkles,
  Clock,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Film,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { ChapterDto, CreateChapterRequest } from '@/services/chapter.service';
import { SeriesDetailDto } from '@/services/series.service';
import { formatChapterOption } from '../../../views/ScriptEditorView';

interface ChapterSelectionViewProps {
  chapters: ChapterDto[];
  seriesDetail?: SeriesDetailDto | null;
  canCreateChapter?: boolean;
  loadingChapters?: boolean;
  onSelectChapter: (chapter: ChapterDto) => void;
  onCreateChapter?: (data: CreateChapterRequest) => Promise<void>;
  onShowToast?: (title: string, desc: string) => void;
}

type StatusFilterType = 'all' | 'in_progress' | 'frozen' | 'approved';
type SortByType = 'chapter_asc' | 'chapter_desc' | 'newest' | 'oldest';
type ViewModeType = 'grid' | 'table';

export const ChapterSelectionView: React.FC<ChapterSelectionViewProps> = ({
  chapters,
  seriesDetail,
  canCreateChapter = false,
  loadingChapters = false,
  onSelectChapter,
  onCreateChapter,
  onShowToast,
}) => {
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [chapterNumber, setChapterNumber] = useState<number>(() => {
    if (!chapters || chapters.length === 0) return 1;
    const maxNum = Math.max(...chapters.map((c) => c.chapterNumber || 0));
    return maxNum + 1;
  });
  const [title, setTitle] = useState('');
  const [outline, setOutline] = useState('');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter, Sort, View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('chapter_asc');
  const [viewMode, setViewMode] = useState<ViewModeType>('grid');

  // Stats calculation
  const stats = useMemo(() => {
    const total = chapters.length;
    const frozen = chapters.filter((c) => !!c.isScriptFrozen).length;
    const approved = chapters.filter((c) => c.status === 'Approved' || c.status === 'Published').length;
    const inProgress = chapters.filter((c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published').length;
    return { total, frozen, approved, inProgress };
  }, [chapters]);

  // Filter & Sort
  const filteredChapters = useMemo(() => {
    let list = [...chapters];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((chap) => {
        const matchNum = String(chap.chapterNumber).includes(q) || `chương ${chap.chapterNumber}`.includes(q);
        const matchTitle = (chap.title || '').toLowerCase().includes(q);
        const matchOutline = (chap.outline || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchOutline;
      });
    }

    // Status filter
    if (statusFilter === 'in_progress') {
      list = list.filter((c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published');
    } else if (statusFilter === 'frozen') {
      list = list.filter((c) => !!c.isScriptFrozen);
    } else if (statusFilter === 'approved') {
      list = list.filter((c) => c.status === 'Approved' || c.status === 'Published');
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'chapter_asc') {
        return (a.chapterNumber || 0) - (b.chapterNumber || 0);
      }
      if (sortBy === 'chapter_desc') {
        return (b.chapterNumber || 0) - (a.chapterNumber || 0);
      }
      if (sortBy === 'newest') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      return 0;
    });

    return list;
  }, [chapters, searchQuery, statusFilter, sortBy]);

  const handleOpenCreateModal = () => {
    if (!canCreateChapter) {
      onShowToast?.('Không có quyền hạn', 'Chỉ có Producer mới được quyền khởi tạo chương mới.');
      return;
    }
    const nextNum =
      chapters && chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterNumber || 0)) + 1
        : 1;
    setChapterNumber(nextNum);
    setTitle('');
    setOutline('');
    setTargetReleaseDate('');
    setModalOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateChapter || !onCreateChapter) {
      onShowToast?.('Không có quyền hạn', 'Chỉ có Producer mới được quyền khởi tạo chương mới.');
      return;
    }
    if (chapterNumber < 1) {
      onShowToast?.('Lỗi nhập liệu', 'Số thứ tự chương phải lớn hơn hoặc bằng 1.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateChapter({
        chapterNumber,
        title: title.trim() || null,
        outline: outline.trim() || null,
        targetReleaseDate: targetReleaseDate || null,
      });
      setModalOpen(false);
      onShowToast?.('Tạo chương thành công', `Đã tạo Chương ${chapterNumber} cho series.`);
    } catch (err: any) {
      onShowToast?.('Lỗi tạo chương', err.message || 'Không thể tạo chương mới.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (chapter: ChapterDto) => {
    if (chapter.isScriptFrozen) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
          <Lock className="w-3 h-3" />
          <span>Kịch bản đã khóa (Frozen)</span>
          {chapter.scriptContentHash && (
            <span
              className="font-mono text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200"
              title={`SHA-256: ${chapter.scriptContentHash}`}
              data-testid={`chapter-hash-${chapter.chapterNumber}`}
            >
              #{chapter.scriptContentHash.slice(0, 8)}
            </span>
          )}
        </span>
      );
    }

    switch (chapter.status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã duyệt kịch bản</span>
          </span>
        );
      case 'Published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>Đã phát hành</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <Clock className="w-3 h-3" />
            <span>Đang sản xuất (In Progress)</span>
          </span>
        );
    }
  };

  const seriesTitle = seriesDetail?.title || 'Đốm Lửa Trường Sinh';

  return (
    <PageContainer
      data-testid="chapter-selection-view"
      className="space-y-6 py-6 text-[#1C1917] dark:text-[#F5F5F4] font-sans"
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ & THỐNG KÊ NHANH (KHÔNG LẶP LẠI BREADCRUMB CỦA APPSHELL ĐỂ TRÁNH TRÙNG 2 HEADER) */}
      <div className="bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          {/* Tiêu đề trang & Mô tả hướng dẫn */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF2E6] dark:bg-orange-950/50 border border-[#F97316]/30 text-[#C2410C] dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>SCRIPT MANAGEMENT HUB</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917] dark:text-stone-100 tracking-tight">
                Quản lý Kịch bản — {seriesTitle}
              </h1>
            </div>
            <p className="text-xs text-[#57534E] dark:text-stone-400 leading-relaxed max-w-3xl">
              <strong className="text-[#1C1917] dark:text-stone-200 font-semibold">Chọn Chương Để Mở Kịch Bản</strong> — Writer lựa chọn một chương được phân công để mở trang giấy kịch bản, quản lý phân cảnh, hội thoại và phân rã khung hình Thumbnail trong không gian làm việc chuyên dụng.
            </p>
          </div>
        </div>

        {/* Khối thống kê nhanh (KPI Quick Stats) */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Tổng số chương */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E0D8] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-[#78716C]">
              <BookOpen className="w-4 h-4 text-[#C2410C]" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-[#78716C] tracking-wide">Tổng số chương</div>
              <div className="text-sm font-bold font-mono text-[#1C1917]">{stats.total}</div>
            </div>
          </div>

          {/* Đang viết / In Production */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-amber-800 tracking-wide">Đang viết</div>
              <div className="text-sm font-bold font-mono text-amber-900">{stats.inProgress}</div>
            </div>
          </div>

          {/* Đã khóa / Frozen */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-800">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-indigo-800 tracking-wide">Đã khóa</div>
              <div className="text-sm font-bold font-mono text-indigo-900">{stats.frozen}</div>
            </div>
          </div>

          {/* Đã duyệt */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-emerald-800 tracking-wide">Đã duyệt</div>
              <div className="text-sm font-bold font-mono text-emerald-900">{stats.approved}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ: TÌM KIẾM, BỘ LỌC, SẮP XẾP, CHẾ ĐỘ XEM & TẠO CHƯƠNG */}
      <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Trái: Ô tìm kiếm nhanh */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh theo tên chương, nội dung tóm tắt, số chương..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C] transition-all placeholder:text-[#A8A29E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#78716C] hover:text-[#1C1917] rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phải: Sắp xếp, View toggle & Nút Tạo chương */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* Bộ chọn sắp xếp */}
            <div className="flex items-center gap-1.5 bg-white border border-[#D8D2C5] rounded-xl px-2.5 py-1.5 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#78716C]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByType)}
                className="bg-transparent text-xs text-[#1C1917] font-medium outline-none cursor-pointer pr-1"
              >
                <option value="chapter_asc">Số chương: Tăng dần</option>
                <option value="chapter_desc">Số chương: Giảm dần</option>
                <option value="newest">Mới cập nhật</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </div>

            {/* Chuyển đổi Grid / Table View */}
            <div className="flex items-center bg-[#F3F0E9] border border-[#E5E0D8] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Dạng thẻ (Grid View)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Dạng bảng (Table/List View)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Nút "+ Tạo chương mới" */}
            {canCreateChapter && (
              <button
                type="button"
                data-testid="create-chapter-btn"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] active:scale-95 rounded-xl shadow-xs transition-all duration-200 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo chương mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Dòng bộ lọc trạng thái (Status Filter Pills/Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 border-t border-[#EBE7DF]">
          <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mr-1.5 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#A8A29E]" />
            Lọc:
          </span>

          {/* Tất cả */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-[#1C1917] text-white shadow-2xs font-bold'
                : 'bg-white text-[#57534E] hover:bg-[#FAF8F5] border border-[#E5E0D8]'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#F3F0E9] text-[#78716C]'
              }`}
            >
              {stats.total}
            </span>
          </button>

          {/* Đang sản xuất */}
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              statusFilter === 'in_progress'
                ? 'bg-amber-800 text-white shadow-2xs font-bold'
                : 'bg-white text-amber-800 hover:bg-amber-50/50 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Đang sản xuất</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === 'in_progress' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {stats.inProgress}
            </span>
          </button>

          {/* Đã khóa (Frozen) */}
          <button
            type="button"
            onClick={() => setStatusFilter('frozen')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              statusFilter === 'frozen'
                ? 'bg-indigo-700 text-white shadow-2xs font-bold'
                : 'bg-white text-indigo-700 hover:bg-indigo-50/50 border border-indigo-200'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>Đã khóa (Frozen)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === 'frozen' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {stats.frozen}
            </span>
          </button>

          {/* Chờ duyệt / Đã duyệt */}
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              statusFilter === 'approved'
                ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                : 'bg-white text-emerald-700 hover:bg-emerald-50/50 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã duyệt kịch bản</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {stats.approved}
            </span>
          </button>
        </div>
      </div>

      {/* 3. NỘI DUNG HIỂN THỊ DANH SÁCH CHƯƠNG */}
      {loadingChapters ? (
        <div className="text-center py-24 text-xs text-[#57534E] bg-white border border-[#D8D2C5] rounded-2xl">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#C2410C] border-t-transparent mb-3" />
          <p>Đang tải danh sách chương...</p>
        </div>
      ) : chapters.length === 0 ? (
        /* Empty State hoàn toàn chưa có chương nào */
        <div className="bg-[#FCFBF8] border border-dashed border-[#D8D2C5] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C] mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-serif text-[#1C1917]">
            Chưa có chương nào trong series này
          </h3>
          <p className="text-xs text-[#57534E] max-w-md mx-auto">
            {canCreateChapter
              ? 'Hãy khởi tạo Chương 1 để bắt đầu giao việc cho Writer biên soạn kịch bản.'
              : 'Producer phụ trách dự án sẽ khởi tạo chương và giao việc. Vui lòng liên hệ Producer để tạo chương trước khi viết kịch bản.'}
          </p>
          {canCreateChapter && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] rounded-xl shadow-xs transition-all cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Khởi tạo Chương 1</span>
            </button>
          )}
        </div>
      ) : filteredChapters.length === 0 ? (
        /* Empty State khi bộ lọc hoặc tìm kiếm không khớp kết quả */
        <div className="bg-[#FCFBF8] border border-dashed border-[#D8D2C5] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F0E9] border border-[#E5E0D8] flex items-center justify-center text-[#78716C] mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-serif text-[#1C1917]">
            Không tìm thấy chương nào phù hợp
          </h3>
          <p className="text-xs text-[#57534E] max-w-md mx-auto">
            Không có chương nào khớp với từ khóa &ldquo;{searchQuery}&rdquo; hoặc bộ lọc trạng thái hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1C1917] bg-white hover:bg-[#FAF8F5] border border-[#D8D2C5] rounded-xl shadow-2xs transition-all cursor-pointer mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#78716C]" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CHẾ ĐỘ XEM GRID (CSS Grid co giãn thích ứng full-width) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredChapters.map((chapter) => (
            <div
              key={chapter.id}
              data-testid={`chapter-card-${chapter.chapterNumber}`}
              onClick={() => onSelectChapter(chapter)}
              className="group bg-white hover:bg-white border border-[#D8D2C5]/70 hover:border-[#F97316]/50 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3.5">
                {/* Header card: Số thứ tự chương, phiên bản & trạng thái */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#1C1917] group-hover:border-[#F97316]/40 transition-colors">
                    CHƯƠNG {chapter.chapterNumber}
                  </span>
                  <span className="font-mono text-[11px] text-[#78716C] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E5E0D8]">
                    v{chapter.versionVector || 1}
                  </span>
                </div>

                {/* Status Badge */}
                <div>{getStatusBadge(chapter)}</div>

                {/* Body card: Tiêu đề chương */}
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C] transition-colors line-clamp-1">
                    {formatChapterOption(chapter.chapterNumber, chapter.title)}
                  </h3>
                </div>

                {/* Body card: Đoạn tóm tắt/ghi chú có line-clamp-3 để đều chiều cao */}
                <div className="text-xs text-[#57534E] line-clamp-3 leading-relaxed italic bg-[#FAF8F5] p-3 rounded-xl border border-[#EBE7DF] min-h-[4.75rem]">
                  {chapter.outline ? `“${chapter.outline}”` : 'Chưa có đề cương kịch bản tóm tắt.'}
                </div>

                {/* Thống kê quy mô phân cảnh & trang */}
                <div className="flex items-center gap-3 text-[11px] text-[#78716C] pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{chapter.scenesCount ?? 0} phân cảnh</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{chapter.pagesCount ?? 0} trang</span>
                  </span>
                </div>
              </div>

              {/* Card Footer: Hạn chót/Ngày cập nhật & Nút hành động */}
              <div className="pt-3 border-t border-[#EBE7DF] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#78716C]" />
                  <span>
                    {chapter.targetReleaseDate ||
                      (chapter.updatedAt
                        ? new Date(chapter.updatedAt).toLocaleDateString('vi-VN')
                        : 'Chưa ấn định')}
                  </span>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] group-hover:translate-x-1 transition-transform"
                >
                  <span>{chapter.isScriptFrozen ? 'Xem kịch bản' : 'Viết kịch bản'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* CHẾ ĐỘ XEM BẢNG (Table/List View để duyệt nhanh nhiều chương) */
        <div className="bg-white border border-[#D8D2C5] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EBE7DF] text-[#78716C] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-28">Chương</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Tiêu đề chương</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Đề cương tóm tắt</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Trạng thái</th>
                  <th className="py-3.5 px-4 w-32">Quy mô</th>
                  <th className="py-3.5 px-4 w-24">Phiên bản</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Hạn chót</th>
                  <th className="py-3.5 px-4 w-32 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE7DF]">
                {filteredChapters.map((chapter) => (
                  <tr
                    key={chapter.id}
                    data-testid={`chapter-card-${chapter.chapterNumber}`}
                    onClick={() => onSelectChapter(chapter)}
                    className="hover:bg-[#FFF8F2] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#1C1917] group-hover:border-[#F97316]/50">
                        Chương {chapter.chapterNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C]">
                      {formatChapterOption(chapter.chapterNumber, chapter.title)}
                    </td>
                    <td className="py-3.5 px-4 text-[#57534E] max-w-sm truncate italic">
                      {chapter.outline ? `“${chapter.outline}”` : '—'}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(chapter)}</td>
                    <td className="py-3.5 px-4 text-[#78716C] font-mono text-[11px]">
                      {chapter.scenesCount ?? 0} cảnh / {chapter.pagesCount ?? 0} trang
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#78716C]">
                      v{chapter.versionVector || 1}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C] font-mono text-[11px]">
                      {chapter.targetReleaseDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] group-hover:translate-x-1 transition-transform"
                      >
                        <span>{chapter.isScriptFrozen ? 'Xem kịch bản' : 'Viết kịch bản'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL KHỞI TẠO CHƯƠNG MỚI (Chỉ Producer) */}
      {modalOpen && canCreateChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#F7F5EE] border-b border-[#D8D2C5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold font-serif text-[#1C1917]">
                  Khởi Tạo Chương Mới (Producer)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE7DF] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Số thứ tự chương <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#C2410C] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Tiêu đề chương
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khởi Đầu Mới, Đêm Tại Quận Shibuya..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#C2410C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Đề cương kịch bản tóm tắt (Outline)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tóm tắt nội dung chính hoặc diễn biến quan trọng của chương..."
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#C2410C] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Ngày phát hành mục tiêu (Target Date)
                </label>
                <input
                  type="date"
                  value={targetReleaseDate}
                  onChange={(e) => setTargetReleaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2C5] rounded-xl outline-none focus:border-[#C2410C] font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#EBE7DF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE7DF] rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Khởi tạo chương'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
