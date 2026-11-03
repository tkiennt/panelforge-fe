// src/roles/writer/components/script/chapter-selection/ChapterSelectionView.tsx
import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Lock,
  ArrowRight,
  Calendar,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
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

export const ChapterSelectionView: React.FC<ChapterSelectionViewProps> = ({
  chapters,
  seriesDetail,
  canCreateChapter = false,
  loadingChapters = false,
  onSelectChapter,
  onCreateChapter,
  onShowToast,
}) => {
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

  const handleOpenCreateModal = () => {
    const nextNum = chapters && chapters.length > 0
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
    if (!onCreateChapter) return;
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Lock className="w-3 h-3" />
          Kịch bản đã khóa (Frozen)
        </span>
      );
    }

    switch (chapter.status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Đã duyệt kịch bản
          </span>
        );
      case 'Published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3 h-3" />
            Đã phát hành
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Đang sản xuất (In Progress)
          </span>
        );
    }
  };

  return (
    <div
      data-testid="chapter-selection-view"
      className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FAF8F5] text-[#1C1917] custom-scrollbar"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 1. Header Banner & Context */}
        <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-[10px] font-bold uppercase tracking-wider">
                QUẢN LÝ TIẾN ĐỘ KỊCH BẢN
              </span>
              {seriesDetail?.title && (
                <span className="text-xs text-[#57534E] font-medium">
                  • Series: <strong className="text-[#1C1917]">{seriesDetail.title}</strong>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917] tracking-tight">
              Chọn Chương Để Thực Hiện Kịch Bản
            </h1>
            <p className="text-xs text-[#57534E] max-w-xl">
              Writer lựa chọn một chương được phân công để mở trang giấy kịch bản, quản lý phân cảnh, hội thoại và phân rã khung hình Thumbnail.
            </p>
          </div>

          {canCreateChapter && (
            <button
              type="button"
              data-testid="create-chapter-btn"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo chương mới</span>
            </button>
          )}
        </div>

        {/* 2. Danh sách các Chương */}
        {loadingChapters ? (
          <div className="text-center py-20 text-xs text-[#57534E]">
            Đang tải danh sách chương...
          </div>
        ) : chapters.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                data-testid={`chapter-card-${chapter.chapterNumber}`}
                onClick={() => onSelectChapter(chapter)}
                className="group bg-[#FCFBF8] hover:bg-white border border-[#D8D2C5] hover:border-[#F97316] rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Trạng thái & Phiên bản */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[#F3F0E9] border border-[#E5E0D8] text-[#1C1917]">
                      CHƯƠNG {chapter.chapterNumber}
                    </span>
                    <span className="font-mono text-[10px] text-[#57534E] bg-white px-1.5 py-0.5 rounded border border-[#E5E0D8]">
                      v{chapter.versionVector || 1}
                    </span>
                  </div>

                  {/* Tiêu đề chương */}
                  <div>
                    <h3 className="text-base font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C] transition-colors line-clamp-1">
                      {formatChapterOption(chapter.chapterNumber, chapter.title)}
                    </h3>
                    <div className="mt-1.5">{getStatusBadge(chapter)}</div>
                  </div>

                  {/* Đề cương kịch bản tóm tắt */}
                  <div className="text-xs text-[#57534E] line-clamp-2 italic bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EBE7DF]">
                    {chapter.outline ? `“${chapter.outline}”` : 'Chưa có đề cương kịch bản tóm tắt.'}
                  </div>
                </div>

                {/* Footer thông tin & Nút mở kịch bản */}
                <div className="pt-3 border-t border-[#EBE7DF] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] font-mono">
                    {chapter.targetReleaseDate ? (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-[#57534E]" />
                        <span>{chapter.targetReleaseDate}</span>
                      </>
                    ) : (
                      <span>Chưa ấn định ngày</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{chapter.isScriptFrozen ? 'Xem kịch bản' : 'Viết kịch bản'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Modal Tạo Chương Mới (Chỉ Producer) */}
      {modalOpen && (
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
    </div>
  );
};

