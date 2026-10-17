import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  BookOpen,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { BibleEntity, BibleCategory } from '@/types';
import { bibleService } from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

export type NewBibleEntityPayload = BibleEntity & {
  stageName?: string;
  effectiveFromChapterNumber?: number;
  effectiveToChapterNumber?: number | null;
};

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entity: NewBibleEntityPayload) => void;
  onShowToast: (title: string, desc: string) => void;
  seriesId?: string;
  isProducer?: boolean;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onShowToast,
  seriesId,
  isProducer = true,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BibleCategory>('characters');
  const [stageName, setStageName] = useState('');
  const [effectiveFromChapter, setEffectiveFromChapter] = useState(1);
  const [effectiveToChapter, setEffectiveToChapter] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onShowToast('Định dạng ảnh không hợp lệ', 'Hệ thống chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      onShowToast('Dung lượng ảnh vượt giới hạn', 'Ảnh reference sheet không được vượt quá 10 MB.');
      return;
    }

    if (!seriesId) {
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      onShowToast('Đã chọn ảnh cục bộ', file.name);
      return;
    }

    setUploadingImage(true);
    try {
      const res = await bibleService.uploadReferenceImage(seriesId, file);
      setImageUrl(res.url);
      onShowToast(
        'Đã tải ảnh lên kho an toàn',
        `${file.name} (${Math.round(res.sizeBytes / 1024)} KB)`,
      );
    } catch (err: any) {
      onShowToast('Lỗi tải ảnh tham chiếu', err.message || 'Không thể tải ảnh reference sheet.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const isRangeInvalid =
    effectiveToChapter !== '' && Number(effectiveToChapter) < Number(effectiveFromChapter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    if (isRangeInvalid) {
      onShowToast(
        'Phạm vi chương không hợp lệ',
        'Chương kết thúc phải lớn hơn hoặc bằng chương bắt đầu.',
      );
      return;
    }

    const generatedCode =
      code.trim().toUpperCase() || `ENT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEntity: NewBibleEntityPayload = {
      id: `entity-${Date.now()}`,
      code: generatedCode,
      name: name.trim(),
      subtitle: subtitle.trim() || '',
      category: category,
      tags: ['CANON', String(category).toUpperCase()],
      description: description.trim(),
      imageUrl: imageUrl.trim() || '',
      status: 'Draft',
      stageName: stageName.trim() || undefined,
      effectiveFromChapterNumber: effectiveFromChapter,
      effectiveToChapterNumber:
        typeof effectiveToChapter === 'number' ? effectiveToChapter : undefined,
    };

    onAdd(newEntity);
    setName('');
    setCode('');
    setSubtitle('');
    setStageName('');
    setEffectiveFromChapter(1);
    setEffectiveToChapter('');
    setDescription('');
    setImageUrl('');
    onClose();
  };

  const modalContent = (
    <div
      className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-3 sm:p-4 font-sans'
      role='dialog'
      aria-modal='true'
      aria-labelledby='add-bible-entity-title'
    >
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F5] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F97316]'>
              <BookOpen className='w-4 h-4' />
            </div>
            <div>
              <h3
                id='add-bible-entity-title'
                className='font-bold font-sans text-sm text-[#171717]'
              >
                Thêm mục mới vào Series Bible
              </h3>
              <p className='text-[11px] text-zinc-500'>
                Tạo thiết kế nhân vật, địa điểm, thuật ngữ hoặc quy tắc mỹ thuật
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-5 overflow-y-auto space-y-4 custom-scrollbar'>
          {/* Tên & Mã */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='sm:col-span-2'>
              <label
                htmlFor='bible-entity-name'
                className='block text-xs font-semibold text-zinc-800 mb-1'
              >
                Tên mục <span className='text-red-500'>*</span>
              </label>
              <input
                id='bible-entity-name'
                type='text'
                required
                autoFocus
                placeholder='Ví dụ: Kaito Shion, Thành phố Neo-Tokyo'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#F97316] transition-colors'
              />
            </div>

            <div>
              <label
                htmlFor='bible-entity-code'
                className='block text-xs font-semibold text-zinc-800 mb-1'
              >
                Mã định danh
              </label>
              <input
                id='bible-entity-code'
                type='text'
                placeholder='Tự động'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] font-mono text-xs text-zinc-900 placeholder-zinc-400 uppercase focus:outline-none focus:border-[#F97316] transition-colors'
              />
            </div>
          </div>

          {/* Danh mục & Phụ đề */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label
                htmlFor='bible-entity-category'
                className='block text-xs font-semibold text-zinc-800 mb-1'
              >
                Danh mục tri thức <span className='text-red-500'>*</span>
              </label>
              <select
                id='bible-entity-category'
                value={category}
                onChange={(e) => setCategory(e.target.value as BibleCategory)}
                className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 font-medium focus:outline-none focus:border-[#F97316] cursor-pointer'
              >
                <option value='characters'>Nhân vật (Character)</option>
                <option value='locations'>Địa điểm &amp; Bối cảnh (Location)</option>
                <option value='terminology'>Thuật ngữ &amp; Đạo cụ (Terminology &amp; Prop)</option>
                <option value='style'>Quy tắc mỹ thuật (Style Rule)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor='bible-entity-subtitle'
                className='block text-xs font-semibold text-zinc-800 mb-1'
              >
                Phụ đề / Vai trò
              </label>
              <input
                id='bible-entity-subtitle'
                type='text'
                placeholder='Ví dụ: Nhân vật chính, Căn cứ kháng chiến'
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#F97316] transition-colors'
              />
            </div>
          </div>

          {/* Giai đoạn & Phạm vi chương hiệu lực */}
          <div className='p-3.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3'>
            <div>
              <label
                htmlFor='bible-entity-stage-name'
                className='block text-xs font-semibold text-zinc-800 mb-1'
              >
                Tên giai đoạn (Tùy chọn)
              </label>
              <input
                id='bible-entity-stage-name'
                type='text'
                maxLength={100}
                placeholder='Ví dụ: Lúc nhỏ, Trưởng thành, Khởi nghiệp...'
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className='w-full px-3 py-2 bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#F97316] transition-colors'
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label
                  htmlFor='bible-entity-from-chapter'
                  className='block text-xs font-semibold text-zinc-800 mb-1'
                >
                  Hiệu lực từ Chương số *
                </label>
                <input
                  id='bible-entity-from-chapter'
                  type='number'
                  min={1}
                  required
                  value={effectiveFromChapter}
                  onChange={(e) =>
                    setEffectiveFromChapter(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className='w-full px-3 py-2 bg-white rounded-lg border border-[#E7E7E7] text-xs font-mono text-zinc-900 focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <label
                  htmlFor='bible-entity-to-chapter'
                  className='block text-xs font-semibold text-zinc-800 mb-1'
                >
                  Đến Chương (Để trống = tới hết truyện)
                </label>
                <input
                  id='bible-entity-to-chapter'
                  type='number'
                  min={effectiveFromChapter}
                  placeholder='Để trống = tới hết truyện'
                  value={effectiveToChapter}
                  onChange={(e) =>
                    setEffectiveToChapter(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-xs font-mono text-zinc-900 focus:outline-none ${
                    isRangeInvalid
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-[#E7E7E7] focus:border-[#F97316]'
                  }`}
                />
              </div>
            </div>

            {isRangeInvalid && (
              <p className='text-[11px] text-red-600 font-medium'>
                Chương kết thúc ({effectiveToChapter}) phải lớn hơn hoặc bằng chương bắt đầu (
                {effectiveFromChapter}).
              </p>
            )}
          </div>

          {!isProducer && (
            <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-start gap-1.5'>
              <HelpCircle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
              <span>
                <strong>Bản nháp (Hướng B):</strong> Mục bạn tạo sẽ được lưu dưới dạng Bản nháp và
                cần Producer xét duyệt &amp; khoá để trở thành Canon.
              </span>
            </div>
          )}

          {/* Reference Sheet Image Upload Dropzone */}
          <div>
            <div className='flex items-center justify-between mb-1'>
              <label className='text-xs font-semibold text-zinc-800 flex items-center gap-1.5'>
                <span>Ảnh Reference Sheet / Model Sheet</span>
                <span className='text-[10px] text-zinc-400 font-normal'>(Khuyên dùng)</span>
              </label>
              <button
                type='button'
                onClick={() => setShowUrlInput((v) => !v)}
                className='text-[11px] text-[#F97316] hover:underline font-medium flex items-center gap-1 cursor-pointer'
              >
                <LinkIcon className='w-3 h-3' />
                <span>{showUrlInput ? 'Ẩn nhập URL' : 'Dán URL trực tiếp'}</span>
              </button>
            </div>

            <input
              type='file'
              ref={fileInputRef}
              accept='image/png,image/jpeg,image/webp'
              className='hidden'
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {imageUrl ? (
              <div className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-900 shrink-0 relative'>
                    <AuthenticatedImage
                      src={imageUrl}
                      alt={name || 'Reference Sheet Preview'}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <div className='min-w-0'>
                    <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'>
                      <CheckCircle2 className='w-3 h-3' />
                      Đã nạp ảnh hợp lệ
                    </span>
                    <p
                      className='text-[10px] text-zinc-500 truncate font-mono mt-0.5 max-w-[220px]'
                      title={imageUrl}
                    >
                      {imageUrl}
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-1.5 shrink-0'>
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E7E7E7] hover:bg-zinc-50 text-zinc-700 transition-colors'
                  >
                    Đổi ảnh
                  </button>
                  <button
                    type='button'
                    onClick={() => setImageUrl('')}
                    className='p-1.5 text-xs rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors'
                    title='Xóa ảnh này'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isDragActive
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-zinc-300 hover:border-[#F97316] bg-[#FAF8F5] hover:bg-[#FFFDF9]'
                }`}
              >
                {uploadingImage ? (
                  <div className='flex items-center gap-2 text-xs font-semibold text-[#F97316] py-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Đang tải ảnh lên kho an toàn...</span>
                  </div>
                ) : (
                  <>
                    <div className='w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[#F97316] shadow-2xs mb-0.5'>
                      <Upload className='w-4 h-4' />
                    </div>
                    <p className='text-xs font-semibold text-zinc-800'>
                      Kéo thả ảnh reference sheet vào đây, hoặc{' '}
                      <span className='text-[#F97316] underline'>chọn file</span>
                    </p>
                    <p className='text-[10px] text-zinc-500'>
                      Định dạng PNG, JPEG, WebP dung lượng tối đa 10 MB
                    </p>
                  </>
                )}
              </div>
            )}

            {showUrlInput && (
              <div className='mt-2'>
                <input
                  type='url'
                  placeholder='Hoặc dán URL ảnh trực tiếp (https://...)'
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className='w-full px-3 py-1.5 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                />
              </div>
            )}
          </div>

          {/* Mô tả thiết kế */}
          <div>
            <label
              htmlFor='bible-entity-desc'
              className='block text-xs font-semibold text-zinc-800 mb-1'
            >
              Mô tả quy chuẩn thiết kế &amp; Nhận dạng <span className='text-red-500'>*</span>
            </label>
            <textarea
              id='bible-entity-desc'
              required
              rows={3}
              placeholder='Mô tả chi tiết ngoại hình, màu sắc trang phục, tính cách, đặc điểm nhận diện bắt buộc...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#F97316] transition-colors resize-none'
            ></textarea>
          </div>

          <div className='pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-semibold rounded-full transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={uploadingImage || !name.trim() || !description.trim() || isRangeInvalid}
              className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white text-xs font-semibold rounded-full shadow-soft-sm transition-all cursor-pointer flex items-center gap-1.5'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>{isProducer ? 'Lưu vào Series Bible' : 'Tạo bản nháp mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
