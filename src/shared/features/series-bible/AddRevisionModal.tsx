import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ChevronDown,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Trash2,
  Loader2,
  Palette,
  Layers,
} from 'lucide-react';
import type { BibleEntity } from '@/types';
import type { BibleEntryRevisionDto } from '@/services/bible.service';
import type { CharacterVariant } from './BibleEntityDetailModal';
import { useTranslation } from '@/lib/i18n';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { Alert, Modal } from '@/shared/ui';
import { SpecFieldsEditor } from './SpecFieldsEditor';
import {
  SPEC_SCHEMA,
  getFieldLabel,
  getFieldPlaceholder,
  getGroupTitle,
  mergeSpecAttributes,
  parseBibleDetails,
  specCategoryOf,
  specCompleteness,
  specFields,
  type SpecCategory,
} from './bibleSpec';

export interface AddRevisionModalProps {
  isOpen: boolean;
  revisionTarget: BibleEntity | null;
  supersedeTarget: BibleEntryRevisionDto | null;
  isNewVariantInitial?: boolean;
  existingVariants?: CharacterVariant[];
  isArtistConceptSubmit: boolean;
  isArtistResubmit: boolean;
  isArtist: boolean;
  isProducer: boolean;
  revisionReworkFeedback: string | null;
  initialVariantLabel: string;
  initialName: string;
  initialSubtitle?: string;
  initialSummary: string;
  initialDescription: string;
  initialReferenceImageUrl: string;
  expectedVersionNumber: number | null;
  savingRevision: boolean;
  uploadingRevImage: boolean;
  onUploadImage: (file: File) => Promise<string | void>;
  onClose: () => void;
  onSubmit: (content: {
    expectedVersionNumber?: number;
    name: string;
    subtitle?: string;
    description: string;
    referenceImageUrl?: string;
    variantLabel: string;
    stageName?: string;
    summary: string;
    detailsJson?: string;
    attributes?: Record<string, any>;
    isNewVariant?: boolean;
  }) => Promise<void>;
  onConfirmArtistSubmit?: (content: {
    expectedVersionNumber?: number;
    name: string;
    subtitle?: string;
    description: string;
    referenceImageUrl?: string;
    variantLabel: string;
    stageName?: string;
    summary: string;
    detailsJson?: string;
    attributes?: Record<string, any>;
    isNewVariant?: boolean;
  }) => void;
}

export const AddRevisionModal: React.FC<AddRevisionModalProps> = React.memo(
  ({
    isOpen,
    revisionTarget,
    supersedeTarget,
    isNewVariantInitial = false,
    existingVariants = [],
    isArtistConceptSubmit,
    isArtistResubmit,
    isArtist,
    isProducer,
    revisionReworkFeedback,
    initialVariantLabel,
    initialName,
    initialSubtitle,
    initialSummary,
    initialDescription,
    initialReferenceImageUrl,
    expectedVersionNumber,
    savingRevision,
    uploadingRevImage,
    onUploadImage,
    onClose,
    onSubmit,
    onConfirmArtistSubmit,
  }) => {
    const { t } = useTranslation();
    const [variantMode, setVariantMode] = useState<'existing' | 'new'>(() => {
      if (isNewVariantInitial) return 'new';
      if (existingVariants.length > 0) return 'existing';
      return 'new';
    });
    const [selectedExistingVariantKey, setSelectedExistingVariantKey] = useState<string>('');
    const [variantLabel, setVariantLabel] = useState(initialVariantLabel);
    const [entryName, setEntryName] = useState(revisionTarget?.name || initialName);
    const name = entryName || revisionTarget?.name || initialName;
    const [subtitle, setSubtitle] = useState(initialSubtitle);
    const [summary, setSummary] = useState(initialSummary);
    const [description, setDescription] = useState(initialDescription);
    const [referenceImageUrl, setReferenceImageUrl] = useState(initialReferenceImageUrl);
    const [specValues, setSpecValues] = useState<Record<string, string>>({});
    const specCategory: SpecCategory = revisionTarget
      ? specCategoryOf(revisionTarget)
      : 'character';
    const [isSpecsExpanded, setIsSpecsExpanded] = useState(!isArtistConceptSubmit);
    const [isDragging, setIsDragging] = useState(false);
    const revFileInputRef = useRef<HTMLInputElement>(null);
    const isInitRef = useRef(false);

    // Global Clipboard Paste listener (Ctrl+V) for instant image submission
    useEffect(() => {
      if (!isOpen || !isArtist) return;
      const handlePaste = (e: ClipboardEvent) => {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
          const file = e.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            void (async () => {
              const uploadedUrl = await onUploadImage(file);
              if (uploadedUrl) setReferenceImageUrl(uploadedUrl);
            })();
          }
        }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen, isArtist, onUploadImage]);

    useEffect(() => {
      if (!isOpen) {
        isInitRef.current = false;
        return;
      }
      if (!isInitRef.current) {
        isInitRef.current = true;
        const mode = isNewVariantInitial || existingVariants.length === 0 ? 'new' : 'existing';
        setVariantMode(mode);
        setEntryName(revisionTarget?.name || initialName);
        setSubtitle(initialSubtitle);
        setSummary(initialSummary);
        setDescription(initialDescription);
        setReferenceImageUrl(initialReferenceImageUrl);
        setVariantLabel(initialVariantLabel);
        setIsSpecsExpanded(!isArtistConceptSubmit);

        let initialAttrs: Record<string, any> = revisionTarget?.attributes || {};
        if (supersedeTarget?.snapshotJson) {
          try {
            const snap = JSON.parse(supersedeTarget.snapshotJson);
            const snapAttrs = snap.Attributes || snap.attributes;
            if (snapAttrs && typeof snapAttrs === 'object') {
              initialAttrs = { ...initialAttrs, ...snapAttrs };
            } else if (snap.DetailsJson || snap.detailsJson) {
              const inner = JSON.parse(snap.DetailsJson || snap.detailsJson);
              if (inner.attributes) initialAttrs = { ...initialAttrs, ...inner.attributes };
            }
          } catch {
            // ignore
          }
        }
        if (revisionTarget) {
          const cat = specCategoryOf(revisionTarget);
          const rawDetails =
            supersedeTarget?.snapshotJson ||
            (revisionTarget as any).detailsJson ||
            JSON.stringify(revisionTarget.attributes || {});
          const parsed = parseBibleDetails(rawDetails);
          const combinedAttrs: Record<string, any> = {
            ...initialAttrs,
            age: parsed.age || initialAttrs.age || revisionTarget.age || '',
            artistNotes:
              parsed.artistNotes || initialAttrs.artistNotes || revisionTarget.artistNotes || '',
          };
          setSpecValues(
            Object.fromEntries(
              specFields(cat).map((fd) => [fd.key, String(combinedAttrs[fd.key] ?? '')]),
            ),
          );
        }

        if (mode === 'existing' && existingVariants.length > 0) {
          const matching =
            existingVariants.find(
              (variant) =>
                initialVariantLabel &&
                (variant.variantLabel || '').toLowerCase() === initialVariantLabel.toLowerCase(),
            ) || existingVariants[0];
          setSelectedExistingVariantKey(matching.variantKey);
          setVariantLabel(matching.variantLabel);
        } else {
          setVariantLabel(initialVariantLabel);
        }
      }
    }, [
      isOpen,
      isNewVariantInitial,
      existingVariants,
      initialVariantLabel,
      initialName,
      initialSubtitle,
      initialSummary,
      initialDescription,
      initialReferenceImageUrl,
      revisionTarget,
      supersedeTarget,
      isArtistConceptSubmit,
    ]);

    if (!isOpen || !revisionTarget) return null;

    const modalTitle = supersedeTarget
      ? t('bible.addRevisionModal.headerSupersede', {
          version: supersedeTarget.versionNumber,
          name: revisionTarget.name,
        })
      : variantMode === 'new'
        ? t('bible.addRevisionModal.headerNewVariant', { name: revisionTarget.name })
        : isArtistResubmit
          ? t('bible.addRevisionModal.headerResubmit', { name: revisionTarget.name })
          : isArtistConceptSubmit && isArtist
            ? t('bible.addRevisionModal.headerArtistSubmit', { name: revisionTarget.name })
            : isProducer
              ? t('bible.addRevisionModal.headerProducerNewVer', { name: revisionTarget.name })
              : t('bible.addRevisionModal.headerDraftNewVer', { name: revisionTarget.name });
    const modalDescription = isArtistConceptSubmit
      ? t('bible.addRevisionModal.descArtistSubmit')
      : t('bible.addRevisionModal.descVariant', {
          variant: variantLabel || t('bible.addRevisionModal.unlabeledVariant'),
        });

    const handleSubmit = () => {
      const updatedAttrs = mergeSpecAttributes(
        specCategory,
        revisionTarget.attributes || {},
        specValues,
      ) as Record<string, any>;

      const rawDetails =
        supersedeTarget?.snapshotJson ||
        (revisionTarget as any).detailsJson ||
        JSON.stringify(revisionTarget.attributes || {});
      const parsedDetails = parseBibleDetails(rawDetails);
      const effectiveAge =
        specCategory === 'character'
          ? specValues.age?.trim() || parsedDetails.age || revisionTarget.age || ''
          : undefined;
      const effectiveNotes =
        specValues.artistNotes?.trim() ||
        parsedDetails.artistNotes ||
        revisionTarget.artistNotes ||
        '';

      const detailsPayload = JSON.stringify({
        age: effectiveAge || undefined,
        artistNotes: effectiveNotes || undefined,
        attributes: updatedAttrs,
      });

      // Biến thể có sẵn: gửi stageName gốc, không gửi nhãn hiển thị. Biến thể mặc định có stageName null,
      // nhãn hiển thị là chữ đã dịch ("Mặc định") nên gửi lên sẽ bị BE coi là đổi biến thể và trả 409.
      const selectedExistingVariant =
        variantMode === 'existing' && !supersedeTarget
          ? existingVariants.find((variant) => variant.variantKey === selectedExistingVariantKey)
          : undefined;
      const payloadVariantLabel = selectedExistingVariant
        ? (selectedExistingVariant.latestRevision.stageName ?? '').trim()
        : variantLabel.trim();

      const canEditName = Boolean(
        revisionTarget && !revisionTarget.isLocked && !isArtistConceptSubmit && !supersedeTarget,
      );
      const submissionPayload = {
        expectedVersionNumber: expectedVersionNumber ?? undefined,
        name: canEditName ? entryName.trim() || revisionTarget.name : revisionTarget.name,
        subtitle: '',
        description: description.trim() || revisionTarget.description || '',
        referenceImageUrl: referenceImageUrl || undefined,
        variantLabel: payloadVariantLabel,
        stageName: payloadVariantLabel,
        summary: summary.trim(),
        detailsJson: detailsPayload,
        attributes: updatedAttrs,
        isNewVariant: variantMode === 'new' && !supersedeTarget,
      };

      if (isArtistConceptSubmit && isArtist && onConfirmArtistSubmit) {
        onConfirmArtistSubmit(submissionPayload);
      } else {
        void onSubmit(submissionPayload);
      }
    };

    return (
      <Modal
        isOpen={isOpen}
        title={modalTitle}
        description={modalDescription}
        size={isArtistConceptSubmit ? 'lg' : 'md'}
        closeLabel={t('common.actions.close')}
        onClose={onClose}
        data-child-modal='true'
        footer={
          <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='text-xs'>
              {isArtistConceptSubmit &&
                (referenceImageUrl ? (
                  <span className='flex items-center gap-1.5 font-semibold text-emerald-700'>
                    <CheckCircle2 className='h-4 w-4' />
                    {t('bible.addRevisionModal.artworkAttached')}
                  </span>
                ) : (
                  <span className='flex items-center gap-1.5 font-medium text-amber-700'>
                    <AlertCircle className='h-4 w-4' />
                    {t('bible.addRevisionModal.noArtworkSelected')}
                  </span>
                ))}
            </div>
            <div className='flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={onClose}
                className='rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100'
              >
                {t('bible.addRevisionModal.cancel')}
              </button>
              <button
                type='button'
                disabled={
                  !summary.trim() ||
                  savingRevision ||
                  !variantLabel.trim() ||
                  (isArtistConceptSubmit && !referenceImageUrl)
                }
                onClick={handleSubmit}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isArtistConceptSubmit
                    ? 'bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98]'
                    : 'bg-[#059669] hover:bg-[#047857] active:scale-[0.98]'
                }`}
                data-testid='save-revision-submit-btn'
              >
                {isArtistConceptSubmit ? (
                  <Palette className='h-4 w-4' />
                ) : (
                  <CheckCircle2 className='h-4 w-4' />
                )}
                <span>
                  {savingRevision
                    ? t('bible.addRevisionModal.saving')
                    : supersedeTarget
                      ? t('bible.addRevisionModal.btnSupersede')
                      : isArtistConceptSubmit && isArtist
                        ? isArtistResubmit
                          ? t('bible.addRevisionModal.btnResubmit')
                          : t('bible.addRevisionModal.btnSubmitConcept')
                        : variantMode === 'new'
                          ? isProducer
                            ? t('bible.addRevisionModal.btnCreateVariantSave')
                            : t('bible.addRevisionModal.btnCreateVariantSend')
                          : isProducer
                            ? t('bible.addRevisionModal.btnSaveVersion')
                            : t('bible.addRevisionModal.btnSendDraft')}
                </span>
              </button>
            </div>
          </div>
        }
      >
        {(isArtistConceptSubmit || variantMode === 'new') && (
          <div className='flex flex-wrap items-center gap-2'>
            {isArtistConceptSubmit && isArtist && (
              <span className='px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300'>
                {t('bible.addRevisionModal.badgeArtist')}
              </span>
            )}
            {variantMode === 'new' && (
              <span className='px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300'>
                {t('bible.addRevisionModal.badgeNewVariant')}
              </span>
            )}
          </div>
        )}

        {isArtistConceptSubmit && (
          <ol
            className='mt-4 grid grid-cols-3 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2'
            aria-label={t('bible.addRevisionModal.submissionStepsAria')}
          >
            {[
              t('bible.addRevisionModal.submissionStepArtwork'),
              t('bible.addRevisionModal.submissionStepVariant'),
              t('bible.addRevisionModal.submissionStepNote'),
            ].map((label, index) => (
              <li
                key={label}
                className='flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-stone-700'
              >
                <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-mono text-xs font-bold text-orange-700'>
                  {index + 1}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        )}

        {/* ================= MODAL BODY (SCROLLABLE) ================= */}
        <div className='mt-4 space-y-4'>
          {/* Context Alert for Rework or Resubmit */}
          {revisionReworkFeedback ? (
            <Alert tone='warning' title={t('bible.addRevisionModal.reworkAlertTitle')}>
              “{revisionReworkFeedback}” {t('bible.addRevisionModal.reworkAlertSuffix')}
            </Alert>
          ) : isArtistResubmit ? (
            <Alert tone='info' title={t('bible.addRevisionModal.resubmitAlertTitle')}>
              {t('bible.addRevisionModal.resubmitAlertBody')}
            </Alert>
          ) : null}

          {/* ================= HERO CONCEPT ART UPLOAD (FOR ARTISTS) ================= */}
          {isArtistConceptSubmit && (
            <div className='bg-orange-50/40 border border-orange-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Palette className='w-4 h-4 text-[#EA580C]' />
                  <label className='text-xs sm:text-sm font-bold text-stone-900'>
                    {t('bible.addRevisionModal.heroArtworkLabel')}
                  </label>
                  <span className='px-2 py-0.5 rounded text-xs font-bold bg-[#EA580C] text-white shadow-2xs'>
                    {t('bible.addRevisionModal.heroFocusBadge')}
                  </span>
                </div>
                <span className='text-xs text-stone-500 font-medium'>PNG, JPG, WebP ≤ 10MB</span>
              </div>

              <input
                type='file'
                ref={revFileInputRef}
                accept='image/png,image/jpeg,image/webp'
                className='hidden'
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const uploadedUrl = await onUploadImage(e.target.files[0]);
                    if (uploadedUrl) setReferenceImageUrl(uploadedUrl);
                  }
                }}
              />

              {referenceImageUrl ? (
                <div className='bg-white border border-stone-200 rounded-2xl p-3 flex items-center gap-4 shadow-2xs'>
                  <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-950 shrink-0 relative group'>
                    <AuthenticatedImage
                      src={referenceImageUrl}
                      alt={name || 'Concept Art'}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <div className='min-w-0 flex-1 space-y-1.5'>
                    <div className='flex items-center gap-1.5 text-xs font-bold text-emerald-700'>
                      <CheckCircle2 className='w-4 h-4 shrink-0' />
                      <span>{t('bible.addRevisionModal.uploadSuccessText')}</span>
                    </div>
                    <p className='text-xs text-stone-500'>
                      {t('bible.addRevisionModal.artworkReadyLabel', 'Tệp hình ảnh đã sẵn sàng')}
                    </p>
                    <div className='flex items-center gap-2 pt-1'>
                      <button
                        type='button'
                        onClick={() => revFileInputRef.current?.click()}
                        disabled={uploadingRevImage}
                        className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition cursor-pointer'
                      >
                        {t('bible.addRevisionModal.changeAnotherImage')}
                      </button>
                      <button
                        type='button'
                        onClick={() => setReferenceImageUrl('')}
                        className='px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                        <span>{t('bible.addRevisionModal.removeImageBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const uploadedUrl = await onUploadImage(e.dataTransfer.files[0]);
                      if (uploadedUrl) setReferenceImageUrl(uploadedUrl);
                    }
                  }}
                  onClick={() => revFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-[#EA580C] bg-orange-100/60 scale-[1.01]'
                      : 'border-orange-300/80 bg-white hover:border-[#EA580C] hover:bg-orange-50/40'
                  }`}
                >
                  {uploadingRevImage ? (
                    <>
                      <Loader2 className='w-8 h-8 animate-spin text-[#EA580C]' />
                      <span className='text-xs font-semibold text-stone-700'>
                        {t('bible.addRevisionModal.uploadingToServer')}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className='w-12 h-12 rounded-2xl bg-orange-100 text-[#EA580C] flex items-center justify-center mb-0.5 shadow-2xs'>
                        <Upload className='w-6 h-6' />
                      </div>
                      <p className='text-xs sm:text-sm font-semibold text-stone-800'>
                        {t('bible.addRevisionModal.heroDropzonePrefix')}{' '}
                        <span className='text-[#EA580C] underline font-bold'>
                          {t('bible.addRevisionModal.heroDropzoneBrowse')}
                        </span>
                      </p>
                      <p className='text-xs text-stone-400'>
                        {t('bible.addRevisionModal.heroDropzoneHint')}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= DESIGN VARIANT ================= */}
          <div
            className='bg-[#FAF8F5] border border-[#E7E5E4] rounded-2xl p-4 space-y-3'
            data-testid='variant-config-block'
          >
            <div className='flex items-center justify-between gap-2 flex-wrap'>
              <div className='flex items-center gap-2'>
                <Layers className='w-4 h-4 text-[#EA580C]' />
                <span className='text-xs font-bold text-stone-900'>
                  {t('bible.addRevisionModal.designVariantTitle')}
                </span>
              </div>
              {!supersedeTarget && existingVariants.length > 0 && (
                <div className='inline-flex rounded-xl bg-stone-200/70 p-0.5 text-xs font-medium'>
                  <button
                    type='button'
                    onClick={() => {
                      setVariantMode('existing');
                      const variant =
                        existingVariants.find(
                          (item) => item.variantKey === selectedExistingVariantKey,
                        ) || existingVariants[0];
                      setSelectedExistingVariantKey(variant.variantKey);
                      setVariantLabel(variant.variantLabel);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      variantMode === 'existing'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    data-testid='switch-to-existing-variant'
                  >
                    {t('bible.addRevisionModal.existingVariantTab')}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setVariantMode('new');
                      setVariantLabel('');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      variantMode === 'new'
                        ? 'bg-[#EA580C] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    data-testid='switch-to-new-variant'
                  >
                    {t('bible.addRevisionModal.newVariantTab')}
                  </button>
                </div>
              )}
            </div>

            {variantMode === 'existing' && existingVariants.length > 0 && !supersedeTarget ? (
              <div className='space-y-2 pt-1'>
                <label
                  htmlFor='existing-variant-select'
                  className='block text-xs font-semibold text-stone-700'
                >
                  {t('bible.addRevisionModal.selectVariantLabel')}
                </label>
                <select
                  id='existing-variant-select'
                  value={selectedExistingVariantKey}
                  onChange={(e) => {
                    setSelectedExistingVariantKey(e.target.value);
                    const variant = existingVariants.find(
                      (item) => item.variantKey === e.target.value,
                    );
                    if (variant) setVariantLabel(variant.variantLabel);
                  }}
                  className='w-full px-3 py-2 bg-white border border-[#D8D2C5] rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#F97316] cursor-pointer'
                  data-testid='existing-variant-select'
                >
                  {existingVariants.map((variant) => (
                    <option key={variant.variantKey} value={variant.variantKey}>
                      {variant.variantLabel}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className='space-y-1 pt-1'>
                <label
                  htmlFor='revision-variant-label'
                  className='text-xs font-semibold text-stone-800'
                >
                  {t('bible.addRevisionModal.newVariantLabel')}{' '}
                  <span className='text-red-500'>*</span>
                </label>
                <input
                  id='revision-variant-label'
                  type='text'
                  maxLength={100}
                  placeholder={t('bible.addRevisionModal.newVariantPlaceholder')}
                  value={variantLabel}
                  onChange={(e) => setVariantLabel(e.target.value)}
                  className='w-full px-3 py-2 bg-white border border-[#D8D2C5] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#F97316]'
                  data-testid='revision-variant-label-input'
                  required
                />
                <p className='text-xs text-stone-500'>
                  {t('bible.addRevisionModal.newVariantHelp')}
                </p>
              </div>
            )}
          </div>

          {/* ================= SUMMARY / REVISION NOTE ================= */}
          <div>
            <label className='block text-xs font-semibold text-stone-800 mb-1'>
              {supersedeTarget
                ? t('bible.addRevisionModal.summaryLabelSupersede')
                : isArtistConceptSubmit
                  ? t('bible.addRevisionModal.summaryLabelArtist')
                  : t('bible.addRevisionModal.summaryLabelDefault')}
            </label>
            <input
              type='text'
              maxLength={supersedeTarget ? 400 : undefined}
              placeholder={
                isArtistConceptSubmit
                  ? t('bible.addRevisionModal.summaryPlaceholderArtist')
                  : t('bible.addRevisionModal.summaryPlaceholderDefault')
              }
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              data-testid='revision-summary-input'
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#F97316]'
            />
          </div>

          {/* ================= COLLAPSIBLE / WRITER SPECS SECTION ================= */}
          {isArtistConceptSubmit ? (
            <div className='border border-stone-200 rounded-2xl bg-stone-50/50 overflow-hidden transition-all'>
              <button
                type='button'
                onClick={() => setIsSpecsExpanded((prev) => !prev)}
                className='w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-100/60 transition cursor-pointer'
              >
                <div className='flex items-center gap-2.5 min-w-0'>
                  <FileText className='w-4 h-4 text-stone-500 shrink-0' />
                  <div className='min-w-0'>
                    <span className='text-xs font-bold text-stone-800 block'>
                      {t('bible.addRevisionModal.writerSpecsTitle')}
                    </span>
                    <span className='text-xs text-stone-500 truncate block'>
                      {isSpecsExpanded
                        ? t('bible.addRevisionModal.writerSpecsExpandedHint')
                        : t('bible.addRevisionModal.writerSpecsCollapsedHint', {
                            name,
                            filled: specCompleteness(specCategory, specValues).filled,
                            total: specCompleteness(specCategory, specValues).total,
                          })}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ${
                    isSpecsExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isSpecsExpanded && (
                <div className='p-4 pt-2 border-t border-stone-200/70 space-y-3 bg-white'>
                  <SpecFieldsEditor category={specCategory} values={specValues} readOnly />
                  {description && (
                    <p className='text-sm text-stone-700 leading-relaxed whitespace-pre-line'>
                      {description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className='block text-xs font-semibold text-stone-800 mb-1'>
                  {t('bible.addRevisionModal.entryNameLabel')}
                </label>
                {!revisionTarget.isLocked && !isArtistConceptSubmit && !supersedeTarget ? (
                  <input
                    type='text'
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    data-testid='revision-name-input'
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#F97316]'
                  />
                ) : (
                  <div
                    className='w-full px-3 py-2 bg-stone-100 border border-[#E7E7E7] rounded-xl text-xs font-medium text-stone-700'
                    data-testid='revision-name-readonly'
                  >
                    {revisionTarget.name}
                  </div>
                )}
              </div>

              {/* Đặc tả theo danh mục (bibleSpec) */}
              <SpecFieldsEditor
                category={specCategory}
                values={specValues}
                onChange={(key, value) => setSpecValues((prev) => ({ ...prev, [key]: value }))}
              />

              <div>
                <label className='block text-xs font-semibold text-stone-800 mb-1'>
                  {t('bible.addRevisionModal.descriptionLabel')}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('bible.addRevisionModal.descriptionPlaceholder')}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#F97316] resize-y custom-scrollbar leading-relaxed'
                />
              </div>

              {/* Upload reference sheet image for Producer/Writer */}
              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='text-xs font-semibold text-stone-800'>
                    {t('bible.addRevisionModal.moodboardLabel')}
                  </label>
                  <span className='text-xs text-stone-400 font-normal'>
                    {isArtist
                      ? t('bible.addRevisionModal.forArtistHint')
                      : t('bible.addRevisionModal.artistUploadOnlyHint')}
                  </span>
                </div>
                <input
                  type='file'
                  ref={revFileInputRef}
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const uploadedUrl = await onUploadImage(e.target.files[0]);
                      if (uploadedUrl) setReferenceImageUrl(uploadedUrl);
                    }
                  }}
                />
                {referenceImageUrl ? (
                  <div className='p-2.5 bg-[#FAF8F4] border border-[#E7E7E7] rounded-xl flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className='w-12 h-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-900 shrink-0 relative'>
                        <AuthenticatedImage
                          src={referenceImageUrl}
                          alt={name || 'Reference Sheet'}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div className='min-w-0'>
                        <span className='text-xs text-stone-500 block'>
                          {t(
                            'bible.addRevisionModal.artworkReadyLabel',
                            'Tệp hình ảnh đã sẵn sàng',
                          )}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <button
                        type='button'
                        onClick={() => revFileInputRef.current?.click()}
                        className='px-2 py-1 text-xs font-semibold rounded bg-white border border-[#E7E7E7] hover:bg-stone-50 text-stone-700'
                      >
                        {t('bible.addEntityModal.changeImage')}
                      </button>
                      <button
                        type='button'
                        onClick={() => setReferenceImageUrl('')}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        title={t('bible.addRevisionModal.removeImageBtn')}
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ) : !isArtist ? (
                  <div className='p-3 rounded-xl border border-dashed border-stone-200 bg-stone-50 text-center text-xs text-stone-500 flex items-center justify-center gap-2'>
                    <Lock className='w-3.5 h-3.5 text-stone-400' />
                    <span>{t('bible.addRevisionModal.artistUploadOnlyNotice')}</span>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => revFileInputRef.current?.click()}
                    disabled={uploadingRevImage}
                    className='w-full p-3 rounded-xl border border-dashed border-stone-300 hover:border-[#F97316] bg-[#FAF8F5] text-center text-xs text-stone-600 hover:text-stone-900 flex items-center justify-center gap-2 cursor-pointer transition-colors'
                  >
                    {uploadingRevImage ? (
                      <>
                        <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' />
                        <span>{t('bible.addRevisionModal.uploadingImage')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className='w-3.5 h-3.5 text-[#F97316]' />
                        <span>{t('bible.addRevisionModal.uploadModelSheetBtn')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  },
);
AddRevisionModal.displayName = 'AddRevisionModal';
