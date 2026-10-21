import React from 'react';
import { X, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { PipelineTemplateDto } from '@/services/pipeline.service';
import { SeriesDto } from '@/services/series.service';
import { SYSTEM_COVERS, type SystemImage } from '@/shared/utils/systemImages';

export interface CoverPickerModalProps {
  series: { id: string; title: string } | null;
  savingCoverId: string | null;
  onClose: () => void;
  onPickSystemCover: (img: SystemImage) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  series,
  savingCoverId,
  onClose,
  onPickSystemCover,
}) => {
  if (!series) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='cover-picker-title'
      data-testid='system-cover-picker'
      className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4'
      onClick={() => !savingCoverId && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && !savingCoverId && onClose()}
    >
      <div
        className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between'>
          <h3 id='cover-picker-title' className='text-sm font-bold text-[#44403C]'>
            Chọn ảnh bìa cho “{series.title}”
          </h3>
          <button
            type='button'
            autoFocus
            onClick={onClose}
            disabled={Boolean(savingCoverId)}
            className='p-1 text-[#57534E] hover:text-[#44403C] cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-[#F97316]'
            aria-label='Đóng'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
        <p className='text-xs text-[#57534E]'>
          Chọn một ảnh bìa có sẵn của hệ thống (không cần tải ảnh từ máy).
        </p>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {SYSTEM_COVERS.map((img) => (
            <button
              key={img.id}
              type='button'
              data-testid={`system-cover-${img.id}`}
              onClick={() => onPickSystemCover(img)}
              disabled={Boolean(savingCoverId)}
              className='relative p-1.5 rounded-lg border border-[#D8D2C5] hover:border-[#F97316] bg-white flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#F97316]'
            >
              <img
                src={img.url}
                alt={img.name}
                className='w-full aspect-[366/594] object-cover rounded-md'
              />
              <span className='text-[11px] font-semibold text-[#44403C]'>
                {savingCoverId === img.id ? 'Đang lưu…' : img.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export interface CreateSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onTitleChange: (v: string) => void;
  format: string;
  onFormatChange: (v: string) => void;
  direction: number;
  onDirectionChange: (v: number) => void;
  genre: string;
  onGenreChange: (v: string) => void;
  synopsis: string;
  onSynopsisChange: (v: string) => void;
  storyArc: string;
  onStoryArcChange: (v: string) => void;
  pipelineTemplates: PipelineTemplateDto[];
  templateId: string;
  onTemplateIdChange: (v: string) => void;
  creating: boolean;
}

export const CreateSeriesModal: React.FC<CreateSeriesModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  format,
  onFormatChange,
  direction,
  onDirectionChange,
  genre,
  onGenreChange,
  synopsis,
  onSynopsisChange,
  storyArc,
  onStoryArcChange,
  pipelineTemplates,
  templateId,
  onTemplateIdChange,
  creating,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <h3 className='text-sm font-bold text-[#171717]'>Tạo Dự Án Bộ Truyện Mới</h3>
          <button type='button' onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={onSubmit} className='space-y-3.5 text-xs'>
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Tên Dự Án (Series Title) *
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder='Ví dụ: Tokyo Neon Shadows'
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              required
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Định Dạng (Format)</label>
              <select
                value={format}
                onChange={(e) => {
                  const fmt = e.target.value;
                  onFormatChange(fmt);
                  if (fmt === 'MANGA') onDirectionChange(1);
                  else if (fmt === 'COMIC') onDirectionChange(0);
                  else if (fmt === 'WEBTOON') onDirectionChange(2);
                }}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value='WEBTOON'>Webtoon (Cuộn dọc)</option>
                <option value='MANGA'>Manga (Phải sang Trái)</option>
                <option value='COMIC'>Comic (Trái sang Phải)</option>
              </select>
            </div>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                Hướng Đọc (Reading Direction)
              </label>
              <select
                value={direction}
                onChange={(e) => onDirectionChange(Number(e.target.value))}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value={1}>Phải sang Trái (Manga RTL)</option>
                <option value={0}>Trái sang Phải (Comic LTR)</option>
                <option value={2}>Cuộn Dọc (Webtoon Vertical)</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Thể Loại (Genre)</label>
              <input
                type='text'
                value={genre}
                onChange={(e) => onGenreChange(e.target.value)}
                placeholder='Ví dụ: Shonen, Action, Sci-Fi...'
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              />
            </div>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                Tuyến Truyện / Phần (Story Arc)
              </label>
              <input
                type='text'
                value={storyArc}
                onChange={(e) => onStoryArcChange(e.target.value)}
                placeholder='Ví dụ: Arc 1: Khởi nguồn'
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              />
            </div>
          </div>

          {pipelineTemplates.length > 0 && (
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                Mẫu Quy Trình Sản Xuất (Pipeline Template)
              </label>
              <select
                value={templateId}
                onChange={(e) => onTemplateIdChange(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                {pipelineTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? '(Mặc định)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Tóm Tắt Cốt Truyện (Synopsis)
            </label>
            <textarea
              rows={2}
              value={synopsis}
              onChange={(e) => onSynopsisChange(e.target.value)}
              placeholder='Mô tả ngắn gọn bối cảnh và cốt truyện chính của dự án...'
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316] resize-none'
            />
          </div>

          <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-xs text-[#737373]'>
            <div className='font-bold text-[#171717] flex items-center gap-1.5'>
              <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Cấu hình tự động:</span>
            </div>
            <div>• Áp dụng chuẩn 8 công đoạn (Script → Approved) có Review Gate.</div>
            <div>• Hướng đọc tự động thiết lập theo Format.</div>
            <div>• Khởi tạo sẵn Series Bible rỗng.</div>
          </div>

          <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={creating || !title.trim()}
              className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
            >
              {creating ? 'Đang tạo...' : 'Tạo Dự Án Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface EditSeriesModalProps {
  series: SeriesDto | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onTitleChange: (v: string) => void;
  synopsis: string;
  onSynopsisChange: (v: string) => void;
  storyArc: string;
  onStoryArcChange: (v: string) => void;
  genre: string;
  onGenreChange: (v: string) => void;
  format: string;
  onFormatChange: (v: string) => void;
  direction: number;
  onDirectionChange: (v: number) => void;
  schedule: string;
  onScheduleChange: (v: string) => void;
  updating: boolean;
}

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({
  series,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  synopsis,
  onSynopsisChange,
  storyArc,
  onStoryArcChange,
  genre,
  onGenreChange,
  format,
  onFormatChange,
  direction,
  onDirectionChange,
  schedule,
  onScheduleChange,
  updating,
}) => {
  if (!series) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div className='flex items-center gap-2'>
            <Edit2 className='w-4 h-4 text-[#F97316]' />
            <h3 className='text-sm font-bold text-[#171717]'>
              Chỉnh Sửa Thông Tin Series
            </h3>
          </div>
          <button type='button' onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={onSubmit} className='space-y-3.5 text-xs'>
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>Tên Dự Án (Title) *</label>
            <input
              type='text'
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              required
            />
          </div>

          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Tóm Tắt Cốt Truyện (Synopsis)
            </label>
            <textarea
              rows={2}
              value={synopsis}
              onChange={(e) => onSynopsisChange(e.target.value)}
              placeholder='Mô tả ngắn gọn nội dung cốt truyện...'
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div>
            <div className='flex items-center justify-between mb-1'>
              <label className='block font-semibold text-[#171717]'>
                Cung Truyện Tổng Thể (Story Arc)
              </label>
              <span className='text-xs text-[#888888] font-mono'>Đầu vào AI Writer</span>
            </div>
            <textarea
              rows={3}
              value={storyArc}
              onChange={(e) => onStoryArcChange(e.target.value)}
              placeholder='Tuyến truyện chính, các mốc xung đột và bước ngoặt xuyên suốt Series...'
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
            />
            <p className='text-xs text-[#737373] mt-1'>
              Story arc sẽ được chuyển vào snapshot và nạp vào prompt cho AI Writer Agent khi sinh
              kịch bản.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Thể Loại (Genre)</label>
              <select
                value={genre}
                onChange={(e) => onGenreChange(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value='Action / Sci-Fi'>Action / Sci-Fi</option>
                <option value='Fantasy / Isekai'>Fantasy / Isekai</option>
                <option value='Mystery / Detective'>Mystery / Detective</option>
                <option value='Horror / Supernatural'>Horror / Supernatural</option>
                <option value='Slice of Life / Drama'>Slice of Life / Drama</option>
              </select>
            </div>

            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Định Dạng (Format)</label>
              <select
                value={format}
                onChange={(e) => onFormatChange(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value='Manga (B&W Standard)'>Manga (B&W Standard)</option>
                <option value='Webtoon (Vertical Scroll)'>Webtoon (Vertical Scroll)</option>
                <option value='Comic (Color Format)'>Comic (Color Format)</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Hướng Đọc</label>
              <select
                value={direction}
                onChange={(e) => onDirectionChange(parseInt(e.target.value, 10))}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value={1}>Phải sang Trái (Manga RTL)</option>
                <option value={0}>Trái sang Phải (Comic LTR)</option>
                <option value={2}>Cuộn Dọc (Webtoon)</option>
              </select>
            </div>

            <div>
              <label className='block font-semibold text-[#171717] mb-1'>Lịch Xuất Bản</label>
              <input
                type='text'
                value={schedule}
                onChange={(e) => onScheduleChange(e.target.value)}
                placeholder='Ví dụ: Thứ 6 hàng tuần'
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              />
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={updating || !title.trim()}
              className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
            >
              {updating ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface DeleteSeriesConfirmModalProps {
  series: SeriesDto | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteSeriesConfirmModal: React.FC<DeleteSeriesConfirmModalProps> = ({
  series,
  deleting,
  onClose,
  onConfirm,
}) => {
  if (!series) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-sm w-full p-6 space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0'>
            <Trash2 className='w-5 h-5' />
          </div>
          <div>
            <h3 className='text-sm font-bold text-[#171717]'>Xác nhận xóa Series</h3>
            <p className='text-xs text-[#737373]'>
              Thao tác này sẽ xóa Series và toàn bộ dữ liệu liên quan.
            </p>
          </div>
        </div>

        <p className='text-xs text-[#555555] p-3 bg-red-50 rounded-xl border border-red-200'>
          Bạn có chắc chắn muốn xóa bộ truyện <strong>&quot;{series.title}&quot;</strong>?
        </p>

        <div className='flex justify-end gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB] text-xs'
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={deleting}
            className='px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50'
          >
            {deleting ? 'Đang xóa...' : 'Xóa Vĩnh Viễn'}
          </button>
        </div>
      </div>
    </div>
  );
};
