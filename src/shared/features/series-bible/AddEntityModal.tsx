import React, { useState, useRef, useEffect } from 'react';
import {
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
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';
import {
  getTempBibleCodes,
  removeTempBibleCode,
  TempBibleCodeItem,
} from '@/shared/utils/tempBibleCodes';

export type NewBibleEntityPayload = BibleEntity & {
  variantLabel: string;
  isCrowd?: boolean;
};

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entity: NewBibleEntityPayload) => void;
  onShowToast: (title: string, desc: string) => void;
  seriesId?: string;
  isProducer?: boolean;
  isArtist?: boolean;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onShowToast,
  seriesId,
  isProducer = true,
  isArtist = true,
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BibleCategory>('characters');
  const [isCrowd, setIsCrowd] = useState(false);
  const [variantLabel, setVariantLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  // Contextual attributes per category
  const [attrField1, setAttrField1] = useState('');
  const [attrField2, setAttrField2] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Character Sheet Gallery (Turnaround & Expressions)
  const [gallery, setGallery] = useState<Array<{ url: string; label: string; sha256?: string }>>(
    [],
  );
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryLabel, setGalleryLabel] = useState('Chính diện (Front)');
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [tempCodes, setTempCodes] = useState<TempBibleCodeItem[]>([]);
  useEffect(() => {
    if (isOpen) {
      setTempCodes(getTempBibleCodes());
    }
  }, [isOpen]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onShowToast(
        t('bible.addEntityModal.invalidFormatTitle', 'Định dạng ảnh không hợp lệ'),
        t('bible.addEntityModal.invalidFormatDesc', 'Hệ thống chỉ nhận ảnh PNG, JPEG hoặc WebP.'),
      );
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      onShowToast(
        t('bible.addEntityModal.sizeExceededTitle', 'Dung lượng ảnh vượt giới hạn'),
        t(
          'bible.addEntityModal.sizeExceededDesc',
          'Ảnh reference sheet không được vượt quá 10 MB.',
        ),
      );
      return;
    }

    if (!seriesId) {
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      onShowToast(t('bible.addEntityModal.localSelectedTitle', 'Đã chọn ảnh cục bộ'), file.name);
      return;
    }

    setUploadingImage(true);
    try {
      const res = await bibleService.uploadReferenceImage(seriesId, file);
      setImageUrl(res.url);
      onShowToast(
        t('bible.addEntityModal.uploadSuccessTitle', 'Đã tải ảnh lên kho an toàn'),
        `${file.name} (${Math.round(res.sizeBytes / 1024)} KB)`,
      );
    } catch (err: any) {
      onShowToast(
        t('bible.addEntityModal.uploadErrorTitle', 'Lỗi tải ảnh tham chiếu'),
        err.message ||
          t('bible.addEntityModal.uploadErrorDesc', 'Không thể tải ảnh reference sheet.'),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (file: File) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onShowToast(
        t('bible.addEntityModal.invalidFormatTitle', 'Định dạng ảnh không hợp lệ'),
        t('bible.addEntityModal.invalidFormatDesc', 'Hệ thống chỉ nhận ảnh PNG, JPEG hoặc WebP.'),
      );
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      onShowToast(
        t('bible.addEntityModal.sizeExceededTitle', 'Dung lượng ảnh vượt giới hạn'),
        t(
          'bible.addEntityModal.gallerySizeExceededDesc',
          'Ảnh phác thảo không được vượt quá 10 MB.',
        ),
      );
      return;
    }

    if (!seriesId) {
      const localUrl = URL.createObjectURL(file);
      setGallery((prev) => [...prev, { url: localUrl, label: galleryLabel }]);
      onShowToast(
        t('bible.addEntityModal.galleryLocalTitle', 'Đã thêm phác thảo cục bộ'),
        `${galleryLabel} - ${file.name}`,
      );
      return;
    }

    setUploadingGallery(true);
    try {
      const res = await bibleService.uploadReferenceImage(seriesId, file);
      setGallery((prev) => [...prev, { url: res.url, label: galleryLabel, sha256: res.sha256 }]);
      onShowToast(
        t('bible.addEntityModal.galleryUploadedTitle', 'Đã thêm góc phác thảo'),
        `${galleryLabel} (${Math.round(res.sizeBytes / 1024)} KB)`,
      );
    } catch (err: any) {
      onShowToast(
        t('bible.addEntityModal.uploadErrorTitle', 'Lỗi tải ảnh phác thảo'),
        err.message || t('bible.addEntityModal.galleryUploadError', 'Không thể tải ảnh góc vẽ.'),
      );
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !variantLabel.trim()) return;

    const generatedCode =
      code.trim().toUpperCase() || `ENT-${Math.floor(1000 + Math.random() * 9000)}`;

    const attributes: Record<string, any> = {};
    if (category === 'characters' || category === 'character') {
      if (attrField1.trim()) attributes.age = attrField1.trim();
      if (attrField2.trim()) attributes.height = attrField2.trim();
    } else if (category === 'locations' || category === 'location') {
      if (attrField1.trim()) attributes.environmentType = attrField1.trim();
      if (attrField2.trim()) attributes.scale = attrField2.trim();
    } else if (category === 'prop') {
      if (attrField1.trim()) attributes.sizeWeight = attrField1.trim();
      if (attrField2.trim()) attributes.material = attrField2.trim();
    } else if (category === 'terminology') {
      if (attrField1.trim()) attributes.termType = attrField1.trim();
      if (attrField2.trim()) attributes.origin = attrField2.trim();
    } else if (category === 'style' || category === 'rule') {
      if (attrField1.trim()) attributes.colorPalette = attrField1.trim();
      if (attrField2.trim()) attributes.lineArtRules = attrField2.trim();
    }

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
      variantLabel: variantLabel.trim(),
      isCrowd,
      gallery: gallery.length > 0 ? gallery : undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    };

    onAdd(newEntity);
    removeTempBibleCode(generatedCode);
    setName('');
    setCode('');
    setSubtitle('');
    setVariantLabel('');
    setIsCrowd(false);
    setDescription('');
    setImageUrl('');
    setGallery([]);
    setAttrField1('');
    setAttrField2('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      closeLabel={t('common.close', 'Đóng')}
      className='font-sans'
      title={
        <span className='flex items-center gap-2.5'>
          <span className='flex size-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-[#F97316]'>
            <BookOpen className='size-4' aria-hidden='true' />
          </span>
          {t('bible.addEntityModal.title', 'Thêm mục mới vào Series Bible')}
        </span>
      }
      description={t(
        'bible.addEntityModal.subtitle',
        'Tạo thiết kế nhân vật, địa điểm, thuật ngữ hoặc quy tắc mỹ thuật',
      )}
    >
      <form onSubmit={handleSubmit} className='space-y-4 custom-scrollbar'>
        {/* Tên & Mã */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='sm:col-span-2'>
            <label
              htmlFor='bible-entity-name'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.nameLabel', 'Tên mục')}{' '}
              <span className='text-red-500'>*</span>
            </label>
            <input
              id='bible-entity-name'
              type='text'
              required
              autoFocus
              placeholder={t(
                'bible.addEntityModal.namePlaceholder',
                'Ví dụ: Kaito Shion, Thành phố Neo-Tokyo',
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] transition-colors'
            />
          </div>

          <div>
            <label
              htmlFor='bible-entity-code'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.codeLabel', 'Mã định danh')}
            </label>
            <input
              id='bible-entity-code'
              type='text'
              placeholder={t('bible.addEntityModal.codePlaceholder', 'Tự động')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] font-mono text-xs text-stone-900 placeholder-stone-400 uppercase focus:outline-none focus:border-[#F97316] transition-colors'
            />
            {tempCodes.length > 0 && (
              <div className='mt-1.5' data-testid='temp-bible-code-suggestions'>
                <span className='text-xs text-stone-500 font-medium block mb-1'>
                  {t('bible.addEntityModal.codeHelp', 'Gợi ý mã tạm từ kịch bản:')}
                </span>
                <div className='flex flex-wrap gap-1'>
                  {tempCodes.map((item) => (
                    <button
                      key={item.code}
                      type='button'
                      onClick={() => {
                        setCode(item.code);
                        if (!name.trim()) setName(item.name);
                        const cat = item.category?.toLowerCase() || '';
                        if (cat.includes('loc') || cat.includes('địa danh')) {
                          setCategory('locations');
                        } else if (
                          cat.includes('prop') ||
                          cat.includes('term') ||
                          cat.includes('thuật ngữ')
                        ) {
                          setCategory('terminology');
                        } else {
                          setCategory('characters');
                        }
                      }}
                      className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300 transition-colors cursor-pointer'
                      title={`Dùng ${item.count} lần${item.chapterNumber ? ` ở Chương ${item.chapterNumber}` : ''}`}
                    >
                      <span>@{item.code}</span>
                      <span className='text-xs text-amber-700 font-normal'>
                        ({item.count}x{item.chapterNumber ? ` Ch.${item.chapterNumber}` : ''})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danh mục & Phụ đề */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label
              htmlFor='bible-entity-category'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.categoryLabel', 'Danh mục tri thức')}{' '}
              <span className='text-red-500'>*</span>
            </label>
            <select
              id='bible-entity-category'
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as BibleCategory);
                setAttrField1('');
                setAttrField2('');
              }}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 font-medium focus:outline-none focus:border-[#F97316] cursor-pointer'
            >
              <option value='characters'>
                {t('bible.categories.characters', 'Nhân vật (Character)')}
              </option>
              <option value='locations'>
                {t('bible.categories.locations', 'Bối cảnh & Địa điểm (Location)')}
              </option>
              <option value='terminology'>
                {t('bible.categories.terminology', 'Thuật ngữ & Đạo cụ (Terminology & Prop)')}
              </option>
              <option value='style'>
                {t('bible.categories.style', 'Quy tắc mỹ thuật (Style Rule)')}
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor='bible-entity-subtitle'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.subtitleLabel', 'Phụ đề / Vai trò')}
            </label>
            <input
              id='bible-entity-subtitle'
              type='text'
              placeholder={t(
                'bible.addEntityModal.subtitlePlaceholder',
                'Ví dụ: Nhân vật chính, Căn cứ kháng chiến',
              )}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] transition-colors'
            />
          </div>
        </div>

        {/* Contextual Attributes Inputs per Category */}
        <div className='p-3 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-2.5'>
          <span className='text-xs font-bold text-stone-800 block'>
            {category === 'characters'
              ? 'Thông số nhân vật (Tùy chọn)'
              : category === 'locations'
                ? 'Thông số không gian & Bối cảnh (Tùy chọn)'
                : category === 'terminology'
                  ? 'Đặc tả thuật ngữ / Đạo cụ (Tùy chọn)'
                  : 'Quy chuẩn mỹ thuật (Tùy chọn)'}
          </span>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-medium text-stone-700 mb-1'>
                {category === 'characters'
                  ? 'Độ tuổi'
                  : category === 'locations'
                    ? 'Loại địa hình / Phân khu'
                    : category === 'terminology'
                      ? 'Phân loại lĩnh vực'
                      : 'Bảng màu chủ đạo'}
              </label>
              <input
                type='text'
                placeholder={
                  category === 'characters'
                    ? 'Ví dụ: 17 tuổi, 25 tuổi...'
                    : category === 'locations'
                      ? 'Ví dụ: Hang động ngầm, Đô thị...'
                      : category === 'terminology'
                        ? 'Ví dụ: Bí thuật, Cấp bậc tu vi...'
                        : 'Ví dụ: Warm Sepia, Cam đất...'
                }
                value={attrField1}
                onChange={(e) => setAttrField1(e.target.value)}
                className='w-full px-3 py-1.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316]'
              />
            </div>

            <div>
              <label className='block text-xs font-medium text-stone-700 mb-1'>
                {category === 'characters'
                  ? 'Chiều cao / Vóc dáng'
                  : category === 'locations'
                    ? 'Quy mô / Khí hậu'
                    : category === 'terminology'
                      ? 'Nguồn gốc / Khởi nguyên'
                      : 'Quy chuẩn nét vẽ'}
              </label>
              <input
                type='text'
                placeholder={
                  category === 'characters'
                    ? 'Ví dụ: 178 cm, Cao gầy...'
                    : category === 'locations'
                      ? 'Ví dụ: Rộng lớn, U tối ẩm ướt...'
                      : category === 'terminology'
                        ? 'Ví dụ: Thời Thượng Cổ, Dị giới...'
                        : 'Ví dụ: Nét line thanh đậm rõ ràng...'
                }
                value={attrField2}
                onChange={(e) => setAttrField2(e.target.value)}
                className='w-full px-3 py-1.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316]'
              />
            </div>
          </div>
        </div>

        {/* Biến thể tạo hình (Variant Label) & Cờ Quần chúng */}
        <div className='p-3.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3'>
          <div>
            <label
              htmlFor='bible-entity-variant-label'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              Nhãn biến thể tạo hình (Variant Label) <span className='text-red-500'>*</span>
            </label>
            <input
              id='bible-entity-variant-label'
              type='text'
              maxLength={100}
              placeholder='Ví dụ: Mặc định, Lúc nhỏ, Trưởng thành...'
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              required
              className='w-full px-3 py-2 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] transition-colors'
              data-testid='bible-variant-label-input'
            />
            <p className='text-xs text-stone-500 mt-1'>
              Bắt buộc và không được trùng với biến thể đang hoạt động khác của mục.
            </p>
          </div>

          <div className='pt-1'>
            <label
              htmlFor='bible-entity-is-crowd'
              className='flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-colors'
            >
              <input
                id='bible-entity-is-crowd'
                type='checkbox'
                checked={isCrowd}
                onChange={(e) => setIsCrowd(e.target.checked)}
                className='mt-0.5 rounded text-[#F97316] focus:ring-[#F97316] w-4 h-4 cursor-pointer'
                data-testid='bible-crowd-checkbox'
              />
              <div>
                <span className='text-xs font-semibold text-stone-900 block'>
                  Cờ Quần chúng (Crowd Entity)
                </span>
                <p className='text-xs text-stone-500'>
                  Mục quần chúng xuất hiện trong kịch bản nhưng không bắt buộc Model Sheet và không
                  chặn kịch bản khi kiểm tra sản xuất.
                </p>
              </div>
            </label>
          </div>
        </div>

        {!isProducer && (
          <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-1.5'>
            <HelpCircle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
            <span>
              <strong>Bản nháp (Hướng B):</strong> Mục bạn tạo sẽ được lưu dưới dạng Bản nháp và cần
              Producer xét duyệt &amp; khoá để trở thành Canon.
            </span>
          </div>
        )}

        {!isArtist ? (
          <div
            className='p-4 rounded-xl border border-dashed border-[#D8D2C5] bg-[#F7F5F0] text-center space-y-2'
            data-testid='artist-role-separation-banner'
          >
            <div className='w-8 h-8 rounded-full bg-[#E5DFD3] text-[#78716C] flex items-center justify-center mx-auto'>
              <HelpCircle className='w-4 h-4' />
            </div>
            <p className='text-xs font-semibold text-[#44403C]'>
              Phân vai chuyên trách: Chỉ Họa sĩ (Artist) mới tải ảnh lên
            </p>
            <p className='text-xs text-[#78716C] max-w-md mx-auto leading-relaxed'>
              Biên kịch và Nhà sản xuất thiết lập thông tin kịch bản và quy chuẩn thiết kế bằng văn
              bản. Sau khi lưu, mục này sẽ tự động chuyển vào{' '}
              <b>Hàng đợi thiết kế (Bible Design Queue)</b> để Họa sĩ vẽ và tải Model Sheet /
              Concept Art lên.
            </p>
          </div>
        ) : (
          <>
            {/* Reference Sheet Image Upload Dropzone */}
            <div>
              <div className='flex items-center justify-between mb-1'>
                <label className='text-xs font-semibold text-stone-800 flex items-center gap-1.5'>
                  <span>Ảnh Reference Sheet / Model Sheet</span>
                  <span className='text-xs text-stone-400 font-normal'>(Khuyên dùng)</span>
                </label>
                <button
                  type='button'
                  onClick={() => setShowUrlInput((v) => !v)}
                  className='text-xs text-[#F97316] hover:underline font-medium flex items-center gap-1 cursor-pointer'
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
                <div className='p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='w-14 h-14 rounded-lg overflow-hidden border border-stone-200 bg-stone-900 shrink-0 relative'>
                      <AuthenticatedImage
                        src={imageUrl}
                        alt={name || 'Reference Sheet Preview'}
                        className='w-full h-full object-cover'
                      />
                    </div>
                    <div className='min-w-0'>
                      <span className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'>
                        <CheckCircle2 className='w-3 h-3' />
                        Đã nạp ảnh hợp lệ
                      </span>
                      <p
                        className='text-xs text-stone-500 truncate font-mono mt-0.5 max-w-[220px]'
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
                      className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E7E7E7] hover:bg-stone-50 text-stone-700 transition-colors'
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
                      : 'border-stone-300 hover:border-[#F97316] bg-[#FAF8F5] hover:bg-[#FFFDF9]'
                  }`}
                >
                  {uploadingImage ? (
                    <div className='flex items-center gap-2 text-xs font-semibold text-[#F97316] py-2'>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>
                        {t('bible.addEntityModal.dropzoneTitle', 'Đang tải ảnh lên kho an toàn...')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className='w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#F97316] shadow-2xs mb-0.5'>
                        <Upload className='w-4 h-4' />
                      </div>
                      <p className='text-xs font-semibold text-stone-800'>
                        {t(
                          'bible.addEntityModal.dropzoneTitle',
                          'Kéo thả ảnh reference sheet vào đây, hoặc ',
                        )}{' '}
                        <span className='text-[#F97316] underline'>
                          {t('bible.addEntityModal.dropzoneBrowse', 'chọn file')}
                        </span>
                      </p>
                      <p className='text-xs text-stone-500'>
                        {t(
                          'bible.addEntityModal.dropzoneFormats',
                          'Định dạng PNG, JPEG, WebP dung lượng tối đa 10 MB',
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}

              {showUrlInput && (
                <div className='mt-2'>
                  <input
                    type='url'
                    placeholder={t(
                      'bible.addEntityModal.dropzoneUrlPlaceholder',
                      'Hoặc dán URL ảnh trực tiếp (https://...)',
                    )}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className='w-full px-3 py-1.5 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 focus:outline-none focus:border-[#F97316]'
                  />
                </div>
              )}
            </div>

            {/* Step 3: Turnaround / Expression Sketch Gallery */}
            <div className='space-y-2.5 pt-3 border-t border-[#E7E7E7]'>
              <div className='flex items-center justify-between'>
                <label className='font-semibold text-[#171717] flex items-center gap-1.5'>
                  <span>
                    {t(
                      'bible.addEntityModal.galleryTitle',
                      'Bộ Sưu Tập Phác Thảo Góc Nhìn & Biểu Cảm (Character Sheet Gallery)',
                    )}
                  </span>
                </label>
                <span className='text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded'>
                  {t(
                    'bible.addEntityModal.galleryCount',
                    { count: gallery.length },
                    `${gallery.length} góc phác thảo`,
                  )}
                </span>
              </div>
              <p className='text-xs text-[#737373]'>
                {t(
                  'bible.addEntityModal.gallerySubtitle',
                  'Tải lên nhiều góc nhìn (Turnaround 360°, Góc 3/4, Biểu cảm, Trang phục) để hoạ sĩ đối chiếu đa chiều.',
                )}
              </p>

              {/* Upload controls */}
              <div className='flex items-center gap-2'>
                <select
                  value={galleryLabel}
                  onChange={(e) => setGalleryLabel(e.target.value)}
                  className='h-8 px-2.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-stone-800 cursor-pointer focus:outline-none focus:border-[#F97316]'
                >
                  <option value='Chính diện (Front)'>Chính diện (Front)</option>
                  <option value='Góc nghiêng 3/4'>Góc nghiêng 3/4</option>
                  <option value='Góc nghiêng (Profile / Side)'>Góc nghiêng (Profile / Side)</option>
                  <option value='Phía sau (Back)'>Phía sau (Back)</option>
                  <option value='Biểu cảm (Expressions)'>Biểu cảm (Expressions)</option>
                  <option value='Trang phục (Costume)'>Trang phục (Costume)</option>
                </select>

                <input
                  type='file'
                  ref={galleryInputRef}
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleGalleryUpload(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />

                <button
                  type='button'
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingGallery}
                  className='h-8 px-3 rounded-lg bg-[#FAF8F5] hover:bg-[#F3F1EB] border border-[#E7E7E7] text-stone-800 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
                >
                  {uploadingGallery ? (
                    <>
                      <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' />
                      <span>{t('bible.addEntityModal.galleryAdding', 'Đang tải...')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>{t('bible.addEntityModal.galleryAddBtn', 'Thêm góc vẽ này')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Thumbnails grid */}
              {gallery.length > 0 && (
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1'>
                  {gallery.map((item, idx) => (
                    <div
                      key={idx}
                      className='p-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl flex items-center gap-2 relative group hover:border-[#F97316]/50 transition-colors'
                    >
                      <div className='w-11 h-11 rounded-lg overflow-hidden bg-stone-900 shrink-0 border border-stone-200'>
                        <AuthenticatedImage
                          src={item.url}
                          alt={item.label}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div
                          className='text-xs font-bold text-stone-900 truncate'
                          title={item.label}
                        >
                          {item.label}
                        </div>
                        <div className='text-xs text-[#737373] font-mono'>
                          {t(
                            'bible.addEntityModal.galleryThumbLabel',
                            { number: idx + 1 },
                            `Góc #${idx + 1}`,
                          )}
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={() => setGallery((prev) => prev.filter((_, i) => i !== idx))}
                        className='p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors'
                        title={t('bible.addEntityModal.galleryDeleteTitle', 'Xóa góc này')}
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Mô tả thiết kế */}
        <div>
          <label
            htmlFor='bible-entity-desc'
            className='block text-xs font-semibold text-stone-800 mb-1'
          >
            {t('bible.addEntityModal.descLabel', 'Mô tả quy chuẩn thiết kế & Nhận dạng')}{' '}
            <span className='text-red-500'>*</span>
          </label>
          <textarea
            id='bible-entity-desc'
            required
            rows={3}
            placeholder={t(
              'bible.addEntityModal.descPlaceholder',
              'Mô tả chi tiết ngoại hình, màu sắc trang phục, tính cách, đặc điểm nhận diện bắt buộc...',
            )}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] transition-colors resize-none'
          ></textarea>
        </div>

        <div className='pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-semibold rounded-full transition-colors cursor-pointer'
          >
            {t('common.cancel', 'Hủy')}
          </button>
          <button
            type='submit'
            disabled={uploadingImage || !name.trim() || !description.trim() || !variantLabel.trim()}
            className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white text-xs font-semibold rounded-full shadow-soft-sm transition-all cursor-pointer flex items-center gap-1.5'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>
              {isProducer
                ? t('bible.addEntityModal.saveProducer', 'Lưu vào Series Bible')
                : t('bible.addEntityModal.saveDraft', 'Tạo bản nháp mới')}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
