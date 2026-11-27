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
  stageName?: string;
  isCrowd?: boolean;
  age?: string;
  artistNotes?: string;
  detailsJson?: string;
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
  const [category, setCategory] = useState<BibleCategory>('characters');
  const [isCrowd, setIsCrowd] = useState(false);
  const [variantLabel, setVariantLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [age, setAge] = useState('');
  const [artistNotes, setArtistNotes] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        t('bible.addEntityModal.invalidFormatTitle'),
        t('bible.addEntityModal.invalidFormatDesc'),
      );
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      onShowToast(
        t('bible.addEntityModal.sizeExceededTitle'),
        t('bible.addEntityModal.sizeExceededDesc'),
      );
      return;
    }

    if (!seriesId) {
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      onShowToast(t('bible.addEntityModal.localSelectedTitle'), file.name);
      return;
    }

    setUploadingImage(true);
    try {
      const res = await bibleService.uploadReferenceImage(seriesId, file);
      setImageUrl(res.url);
      onShowToast(
        t('bible.addEntityModal.uploadSuccessTitle'),
        `${file.name} (${Math.round(res.sizeBytes / 1024)} KB)`,
      );
    } catch (err: any) {
      onShowToast(
        t('bible.addEntityModal.uploadErrorTitle'),
        err.message || t('bible.addEntityModal.uploadErrorDesc'),
      );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !variantLabel.trim()) return;

    const generatedCode =
      code.trim().toUpperCase() || `ENT-${Math.floor(1000 + Math.random() * 9000)}`;

    const detailsPayload = JSON.stringify({
      age: category === 'characters' && age.trim() ? age.trim() : undefined,
      artistNotes: artistNotes.trim() ? artistNotes.trim() : undefined,
    });

    const newEntity: NewBibleEntityPayload = {
      id: `entity-${Date.now()}`,
      code: generatedCode,
      name: name.trim(),
      category: category,
      tags: ['CANON', String(category).toUpperCase()],
      description: description.trim(),
      imageUrl: imageUrl.trim() || '',
      status: 'Draft',
      variantLabel: variantLabel.trim(),
      stageName: variantLabel.trim(),
      isCrowd,
      age: category === 'characters' && age.trim() ? age.trim() : undefined,
      artistNotes: artistNotes.trim() ? artistNotes.trim() : undefined,
      detailsJson: detailsPayload,
    };

    onAdd(newEntity);
    removeTempBibleCode(generatedCode);
    setName('');
    setCode('');
    setVariantLabel('');
    setIsCrowd(false);
    setDescription('');
    setImageUrl('');
    setAge('');
    setArtistNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      closeLabel={t('common.actions.close')}
      className='font-sans'
      title={
        <span className='flex items-center gap-2.5'>
          <span className='flex size-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-[#F97316]'>
            <BookOpen className='size-4' aria-hidden='true' />
          </span>
          {t('bible.addEntityModal.title')}
        </span>
      }
      description={t('bible.addEntityModal.subtitle')}
    >
      <form onSubmit={handleSubmit} className='space-y-4 custom-scrollbar'>
        {/* Tên & Mã */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='sm:col-span-2'>
            <label
              htmlFor='bible-entity-name'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.nameLabel')} <span className='text-red-500'>*</span>
            </label>
            <input
              id='bible-entity-name'
              type='text'
              required
              autoFocus
              placeholder={t('bible.addEntityModal.namePlaceholder')}
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
              {t('bible.addEntityModal.codeLabel')}
            </label>
            <input
              id='bible-entity-code'
              type='text'
              placeholder={t('bible.addEntityModal.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] font-mono text-xs text-stone-900 placeholder-stone-400 uppercase focus:outline-none focus:border-[#F97316] transition-colors'
            />
            {tempCodes.length > 0 && (
              <div className='mt-1.5' data-testid='temp-bible-code-suggestions'>
                <span className='text-xs text-stone-500 font-medium block mb-1'>
                  {t('bible.addEntityModal.tempCodeSuggestions')}
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
                      title={
                        item.chapterNumber
                          ? t('bible.addEntityModal.tempCodeUsageChapter', {
                              count: item.count,
                              chapter: item.chapterNumber,
                            })
                          : t('bible.addEntityModal.tempCodeUsage', { count: item.count })
                      }
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

        {/* Danh mục */}
        <div>
          <label
            htmlFor='bible-entity-category'
            className='block text-xs font-semibold text-stone-800 mb-1'
          >
            {t('bible.addEntityModal.categoryLabel')} <span className='text-red-500'>*</span>
          </label>
          <select
            id='bible-entity-category'
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BibleCategory);
            }}
            className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 font-medium focus:outline-none focus:border-[#F97316] cursor-pointer'
          >
            <option value='characters'>{t('bible.categories.characters')}</option>
            <option value='locations'>{t('bible.categories.locations')}</option>
            <option value='terminology'>{t('bible.categories.terminology')}</option>
            <option value='style'>{t('bible.categories.style')}</option>
          </select>
        </div>

        {/* Đặc tả ngoại hình / Ghi chú cho Artist */}
        <div className='p-3 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3'>
          <span className='text-xs font-bold text-stone-800 block'>
            {t('bible.spec.groups.notes', 'Ghi chú cho Artist')}
          </span>
          {category === 'characters' && (
            <div>
              <label
                htmlFor='bible-entity-age'
                className='block text-xs font-medium text-stone-700 mb-1'
              >
                {t('bible.spec.fields.age.label', 'Tuổi')}
              </label>
              <input
                id='bible-entity-age'
                type='text'
                placeholder={t('bible.spec.fields.age.placeholder', 'vd. 17 tuổi, 25–28')}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className='w-full px-3 py-1.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316]'
              />
            </div>
          )}
          <div>
            <label
              htmlFor='bible-entity-artist-notes'
              className='block text-xs font-medium text-stone-700 mb-1'
            >
              {t('bible.spec.fields.artistNotes.label', 'Ghi chú cho Artist (Artist Notes)')}
            </label>
            <textarea
              id='bible-entity-artist-notes'
              rows={3}
              placeholder={t(
                'bible.spec.fields.artistNotes.placeholder',
                'Mô tả ngoại hình, kiểu tóc, màu mắt, vết sẹo đặc trưng, trang phục, phong cách nét vẽ và các chi tiết cấm vẽ sai...',
              )}
              value={artistNotes}
              onChange={(e) => setArtistNotes(e.target.value)}
              className='w-full px-3 py-2 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] resize-y'
            />
          </div>
        </div>

        {/* Biến thể tạo hình (Variant Label) & Cờ Quần chúng */}
        <div className='p-3.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3'>
          <div>
            <label
              htmlFor='bible-entity-variant-label'
              className='block text-xs font-semibold text-stone-800 mb-1'
            >
              {t('bible.addEntityModal.variantLabel')} <span className='text-red-500'>*</span>
            </label>
            <input
              id='bible-entity-variant-label'
              type='text'
              maxLength={100}
              placeholder={t('bible.addEntityModal.variantPlaceholder')}
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              required
              className='w-full px-3 py-2 bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#F97316] transition-colors'
              data-testid='bible-variant-label-input'
            />
            <p className='text-xs text-stone-500 mt-1'>{t('bible.addEntityModal.variantHelp')}</p>
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
                  {t('bible.addEntityModal.crowdCheckboxLabel')}
                </span>
                <p className='text-xs text-stone-500'>
                  {t('bible.addEntityModal.crowdCheckboxHelp')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {!isProducer && (
          <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-1.5'>
            <HelpCircle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
            <span>
              <strong>{t('bible.addEntityModal.draftNoticeTitle')}</strong>{' '}
              {t('bible.addEntityModal.draftNoticeBody')}
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
              {t('bible.addEntityModal.artistOnlyBannerTitle')}
            </p>
            <p className='text-xs text-[#78716C] max-w-md mx-auto leading-relaxed'>
              {t('bible.addEntityModal.artistOnlyBannerBefore')}{' '}
              <b>{t('bible.addEntityModal.artistOnlyBannerQueue')}</b>{' '}
              {t('bible.addEntityModal.artistOnlyBannerAfter')}
            </p>
          </div>
        ) : (
          <>
            {/* Reference Sheet Image Upload Dropzone */}
            <div>
              <div className='flex items-center justify-between mb-1'>
                <label className='text-xs font-semibold text-stone-800 flex items-center gap-1.5'>
                  <span>{t('bible.addEntityModal.refSheetLabel')}</span>
                  <span className='text-xs text-stone-400 font-normal'>
                    {t('bible.addEntityModal.recommended')}
                  </span>
                </label>
                <button
                  type='button'
                  onClick={() => setShowUrlInput((v) => !v)}
                  className='text-xs text-[#F97316] hover:underline font-medium flex items-center gap-1 cursor-pointer'
                >
                  <LinkIcon className='w-3 h-3' />
                  <span>
                    {showUrlInput
                      ? t('bible.addEntityModal.hideUrlInput')
                      : t('bible.addEntityModal.pasteUrlDirectly')}
                  </span>
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
                        {t('bible.addEntityModal.imageLoadedValid')}
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
                      {t('bible.addEntityModal.changeImage')}
                    </button>
                    <button
                      type='button'
                      onClick={() => setImageUrl('')}
                      className='p-1.5 text-xs rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors'
                      title={t('bible.addEntityModal.deleteImageTitle')}
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
                      <span>{t('bible.addEntityModal.uploadingToStorage')}</span>
                    </div>
                  ) : (
                    <>
                      <div className='w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#F97316] shadow-2xs mb-0.5'>
                        <Upload className='w-4 h-4' />
                      </div>
                      <p className='text-xs font-semibold text-stone-800'>
                        {t('bible.addEntityModal.dropzoneTitle')}{' '}
                        <span className='text-[#F97316] underline'>
                          {t('bible.addEntityModal.dropzoneBrowse')}
                        </span>
                      </p>
                      <p className='text-xs text-stone-500'>
                        {t('bible.addEntityModal.dropzoneFormats')}
                      </p>
                    </>
                  )}
                </div>
              )}

              {showUrlInput && (
                <div className='mt-2'>
                  <input
                    type='url'
                    placeholder={t('bible.addEntityModal.dropzoneUrlPlaceholder')}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className='w-full px-3 py-1.5 bg-[#FAF8F5] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-stone-900 focus:outline-none focus:border-[#F97316]'
                  />
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
            {t('bible.addEntityModal.descLabel')} <span className='text-red-500'>*</span>
          </label>
          <textarea
            id='bible-entity-desc'
            required
            rows={3}
            placeholder={t('bible.addEntityModal.descPlaceholder')}
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
            {t('bible.addEntityModal.cancel')}
          </button>
          <button
            type='submit'
            disabled={uploadingImage || !name.trim() || !description.trim() || !variantLabel.trim()}
            className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white text-xs font-semibold rounded-full shadow-soft-sm transition-all cursor-pointer flex items-center gap-1.5'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>
              {isProducer
                ? t('bible.addEntityModal.saveProducer')
                : t('bible.addEntityModal.saveDraft')}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
