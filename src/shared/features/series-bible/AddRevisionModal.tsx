import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  ChevronDown,
  X,
  GitCommit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Trash2,
  Loader2,
  Palette,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { BibleEntity } from '@/types';
import type { BibleEntryRevisionDto } from '@/services/bible.service';
import type { CharacterEraStage } from './BibleEntityDetailModal';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { LucianInlineAlert } from '@/shared/components/lucian';

export interface AddRevisionModalProps {
  isOpen: boolean;
  revisionTarget: BibleEntity | null;
  supersedeTarget: BibleEntryRevisionDto | null;
  isNewEraInitial?: boolean;
  existingStages?: CharacterEraStage[];
  isArtistConceptSubmit: boolean;
  isArtistResubmit: boolean;
  isArtist: boolean;
  isProducer: boolean;
  revisionReworkFeedback: string | null;
  initialStageName: string;
  initialEffectiveChapter: number;
  initialEffectiveToChapter: number | '';
  initialName: string;
  initialSubtitle: string;
  initialSummary: string;
  initialDescription: string;
  initialReferenceImageUrl: string;
  expectedVersionNumber: number | null;
  lockedChapterNumbers: number[];
  savingRevision: boolean;
  uploadingRevImage: boolean;
  onUploadImage: (file: File) => Promise<string | void>;
  onClose: () => void;
  onSubmit: (content: {
    expectedVersionNumber?: number;
    name: string;
    subtitle: string;
    description: string;
    referenceImageUrl?: string;
    stageName?: string;
    effectiveFromChapterNumber: number;
    effectiveToChapterNumber?: number;
    summary: string;
    detailsJson?: string;
    attributes?: Record<string, any>;
  }) => Promise<void>;
  onConfirmArtistSubmit?: (content: {
    expectedVersionNumber?: number;
    name: string;
    subtitle: string;
    description: string;
    referenceImageUrl?: string;
    stageName?: string;
    effectiveFromChapterNumber: number;
    effectiveToChapterNumber?: number;
    summary: string;
    detailsJson?: string;
    attributes?: Record<string, any>;
  }) => void;
}

export const AddRevisionModal: React.FC<AddRevisionModalProps> = React.memo(
  ({
    isOpen,
    revisionTarget,
    supersedeTarget,
    isNewEraInitial = false,
    existingStages = [],
    isArtistConceptSubmit,
    isArtistResubmit,
    isArtist,
    isProducer,
    revisionReworkFeedback,
    initialStageName,
    initialEffectiveChapter,
    initialEffectiveToChapter,
    initialName,
    initialSubtitle,
    initialSummary,
    initialDescription,
    initialReferenceImageUrl,
    expectedVersionNumber,
    lockedChapterNumbers,
    savingRevision,
    uploadingRevImage,
    onUploadImage,
    onClose,
    onSubmit,
    onConfirmArtistSubmit,
  }) => {
    const [eraMode, setEraMode] = useState<'existing' | 'new'>(() => {
      if (isNewEraInitial) return 'new';
      if (existingStages && existingStages.length > 0) return 'existing';
      return 'new';
    });
    const [selectedExistingStageKey, setSelectedExistingStageKey] = useState<string>('');
    const [stageName, setStageName] = useState(initialStageName);
    const [effectiveChapter, setEffectiveChapter] = useState(initialEffectiveChapter);
    const [effectiveToChapter, setEffectiveToChapter] = useState<number | ''>(
      initialEffectiveToChapter,
    );
    const [name, setName] = useState(initialName);
    const [subtitle, setSubtitle] = useState(initialSubtitle);
    const [summary, setSummary] = useState(initialSummary);
    const [description, setDescription] = useState(initialDescription);
    const [referenceImageUrl, setReferenceImageUrl] = useState(initialReferenceImageUrl);
    const [revAttr1, setRevAttr1] = useState('');
    const [revAttr2, setRevAttr2] = useState('');
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
        const mode =
          isNewEraInitial || !existingStages || existingStages.length === 0 ? 'new' : 'existing';
        setEraMode(mode);
        setName(initialName);
        setSubtitle(initialSubtitle);
        setSummary(initialSummary);
        setDescription(initialDescription);
        setReferenceImageUrl(initialReferenceImageUrl);
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
          const isCatChar =
            revisionTarget.category === 'characters' || revisionTarget.category === 'character';
          const isCatLoc =
            revisionTarget.category === 'locations' || revisionTarget.category === 'location';
          const isCatProp = revisionTarget.category === 'prop';
          const isCatTerm = revisionTarget.category === 'terminology';
          const isCatStyle =
            revisionTarget.category === 'style' || revisionTarget.category === 'rule';

          if (isCatChar) {
            setRevAttr1(initialAttrs.age || '');
            setRevAttr2(initialAttrs.height || '');
          } else if (isCatLoc) {
            setRevAttr1(initialAttrs.environmentType || '');
            setRevAttr2(initialAttrs.scale || initialAttrs.atmosphere || '');
          } else if (isCatProp) {
            setRevAttr1(initialAttrs.sizeWeight || '');
            setRevAttr2(initialAttrs.material || '');
          } else if (isCatTerm) {
            setRevAttr1(initialAttrs.termType || '');
            setRevAttr2(initialAttrs.origin || '');
          } else if (isCatStyle) {
            setRevAttr1(initialAttrs.colorPalette || '');
            setRevAttr2(initialAttrs.lineArtRules || '');
          }
        }

        if (mode === 'existing' && existingStages && existingStages.length > 0) {
          const matching =
            existingStages.find(
              (s) =>
                s.effectiveFromChapterNumber === initialEffectiveChapter ||
                (initialStageName && s.stageName.toLowerCase() === initialStageName.toLowerCase()),
            ) || existingStages[0];
          setSelectedExistingStageKey(matching.stageKey);
          setStageName(matching.stageName);
          setEffectiveChapter(matching.effectiveFromChapterNumber);
          setEffectiveToChapter(matching.effectiveToChapterNumber ?? '');
        } else {
          setStageName(initialStageName);
          setEffectiveChapter(initialEffectiveChapter);
          setEffectiveToChapter(initialEffectiveToChapter);
        }
      }
    }, [
      isOpen,
      isNewEraInitial,
      existingStages,
      initialStageName,
      initialEffectiveChapter,
      initialEffectiveToChapter,
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

    const handleSubmit = () => {
      const isCatChar =
        revisionTarget.category === 'characters' || revisionTarget.category === 'character';
      const isCatLoc =
        revisionTarget.category === 'locations' || revisionTarget.category === 'location';
      const isCatProp = revisionTarget.category === 'prop';
      const isCatTerm = revisionTarget.category === 'terminology';
      const isCatStyle = revisionTarget.category === 'style' || revisionTarget.category === 'rule';

      const updatedAttrs: Record<string, any> = { ...(revisionTarget.attributes || {}) };
      if (isCatChar) {
        if (revAttr1.trim()) updatedAttrs.age = revAttr1.trim();
        else delete updatedAttrs.age;
        if (revAttr2.trim()) updatedAttrs.height = revAttr2.trim();
        else delete updatedAttrs.height;
      } else if (isCatLoc) {
        if (revAttr1.trim()) updatedAttrs.environmentType = revAttr1.trim();
        if (revAttr2.trim()) updatedAttrs.scale = revAttr2.trim();
      } else if (isCatProp) {
        if (revAttr1.trim()) updatedAttrs.sizeWeight = revAttr1.trim();
        if (revAttr2.trim()) updatedAttrs.material = revAttr2.trim();
      } else if (isCatTerm) {
        if (revAttr1.trim()) updatedAttrs.termType = revAttr1.trim();
        if (revAttr2.trim()) updatedAttrs.origin = revAttr2.trim();
      } else if (isCatStyle) {
        if (revAttr1.trim()) updatedAttrs.colorPalette = revAttr1.trim();
        if (revAttr2.trim()) updatedAttrs.lineArtRules = revAttr2.trim();
      }

      const detailsPayload = JSON.stringify({
        turnaroundGallery: revisionTarget.gallery || [],
        attributes: updatedAttrs,
      });

      const submissionPayload = {
        expectedVersionNumber: expectedVersionNumber ?? undefined,
        name: name.trim() || revisionTarget.name,
        subtitle: subtitle.trim() || revisionTarget.subtitle || '',
        description: description.trim() || revisionTarget.description || '',
        referenceImageUrl: referenceImageUrl || undefined,
        stageName: stageName.trim() || undefined,
        effectiveFromChapterNumber: effectiveChapter,
        effectiveToChapterNumber:
          effectiveToChapter !== '' ? Number(effectiveToChapter) : undefined,
        summary: summary.trim(),
        detailsJson: detailsPayload,
        attributes: updatedAttrs,
      };

      if (isArtistConceptSubmit && isArtist && onConfirmArtistSubmit) {
        onConfirmArtistSubmit(submissionPayload);
      } else {
        void onSubmit(submissionPayload);
      }
    };

    return createPortal(
      <div
        className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-3 sm:p-4'
        role='dialog'
        aria-modal='true'
        data-child-modal='true'
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className='bg-white border border-stone-200 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'
          onClick={(e) => e.stopPropagation()}
        >
          {/* ================= MODAL HEADER ================= */}
          <div className='flex items-center justify-between border-b border-stone-200/80 px-5 sm:px-6 py-4 bg-stone-50/80 shrink-0'>
            <div className='flex items-center gap-3 min-w-0'>
              {isArtistConceptSubmit ? (
                <div className='w-9 h-9 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0 shadow-2xs'>
                  <Palette className='w-4.5 h-4.5' />
                </div>
              ) : (
                <div className='w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs'>
                  <GitCommit className='w-4.5 h-4.5' />
                </div>
              )}
              <div className='min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <h3 className='text-sm sm:text-base font-bold text-stone-900 truncate'>
                    {supersedeTarget
                      ? `Thay thế bản khoá v${supersedeTarget.versionNumber}: ${revisionTarget.name}`
                      : eraMode === 'new'
                        ? `Tạo Thời kỳ (Era) mới: ${revisionTarget.name}`
                        : isArtistResubmit
                          ? `Nộp lại bản vẽ Concept Art: ${revisionTarget.name}`
                          : isArtistConceptSubmit && isArtist
                            ? `Nộp bản vẽ Concept Art: ${revisionTarget.name}`
                            : isProducer
                              ? `Tạo phiên bản mới: ${revisionTarget.name}`
                              : `Tạo bản nháp mới: ${revisionTarget.name}`}
                  </h3>
                  {isArtistConceptSubmit && isArtist && (
                    <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300'>
                      Họa sĩ (Artist)
                    </span>
                  )}
                  {eraMode === 'new' && (
                    <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300'>
                      Thời kỳ mới
                    </span>
                  )}
                </div>
                <p className='text-xs text-stone-500 truncate'>
                  {isArtistConceptSubmit
                    ? 'Tải lên thiết kế nhân vật (Model Sheet / Turnaround) để thẩm định'
                    : `Thời kỳ: ${stageName || 'Giai đoạn chuẩn'} • Có hiệu lực từ Ch.${effectiveChapter}+`}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              aria-label='Đóng'
              className='w-8 h-8 rounded-xl hover:bg-stone-200/60 flex items-center justify-center text-stone-400 hover:text-stone-700 transition cursor-pointer shrink-0'
            >
              <X className='w-4.5 h-4.5' />
            </button>
          </div>

          {/* ================= MODAL BODY (SCROLLABLE) ================= */}
          <div className='p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4'>
            {/* Context Alert for Rework or Resubmit */}
            {revisionReworkFeedback ? (
              <LucianInlineAlert
                type='warning'
                title='Yêu cầu chỉnh sửa từ Biên kịch / Biên tập viên'
                description={`"${revisionReworkFeedback}"`}
                details='Vui lòng điều chỉnh thiết kế theo góp ý trên và tải lên bản vẽ mới.'
                dismissible={false}
              />
            ) : isArtistResubmit ? (
              <LucianInlineAlert
                type='info'
                title='Nộp lại bản vẽ Concept Art (Sửa nộp nhầm)'
                description='Bản vẽ mới sẽ thay thế bản vẽ đang chờ duyệt mà không làm mất lịch sử phiên bản.'
                dismissible={false}
              />
            ) : !supersedeTarget && lockedChapterNumbers.includes(effectiveChapter) ? (
              <LucianInlineAlert
                type='warning'
                title='Chương đã có phiên bản khoá tham chiếu'
                description={`Chương ${effectiveChapter} đã có bản khoá Canon.`}
                details='Vui lòng chọn số chương khác cho thời kỳ mới, hoặc dùng chức năng Thay thế bản khoá.'
                dismissible={false}
              />
            ) : null}

            {/* ================= HERO CONCEPT ART UPLOAD (FOR ARTISTS) ================= */}
            {isArtistConceptSubmit && (
              <div className='bg-orange-50/40 border border-orange-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Palette className='w-4 h-4 text-[#EA580C]' />
                    <label className='text-xs sm:text-sm font-bold text-stone-900'>
                      Bản vẽ Concept Art / Model Sheet
                    </label>
                    <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-[#EA580C] text-white shadow-2xs'>
                      Trọng tâm nộp bài
                    </span>
                  </div>
                  <span className='text-[11px] text-stone-500 font-medium'>
                    PNG, JPG, WebP ≤ 10MB
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
                        <span>Đã tải lên bản vẽ thành công</span>
                      </div>
                      <p className='text-[11px] text-stone-500 font-mono truncate'>
                        {referenceImageUrl}
                      </p>
                      <div className='flex items-center gap-2 pt-1'>
                        <button
                          type='button'
                          onClick={() => revFileInputRef.current?.click()}
                          disabled={uploadingRevImage}
                          className='px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition cursor-pointer'
                        >
                          Đổi ảnh khác
                        </button>
                        <button
                          type='button'
                          onClick={() => setReferenceImageUrl('')}
                          className='px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                          <span>Gỡ ảnh</span>
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
                          Đang tải ảnh lên máy chủ...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className='w-12 h-12 rounded-2xl bg-orange-100 text-[#EA580C] flex items-center justify-center mb-0.5 shadow-2xs'>
                          <Upload className='w-6 h-6' />
                        </div>
                        <p className='text-xs sm:text-sm font-semibold text-stone-800'>
                          Kéo thả ảnh bản vẽ vào đây, hoặc{' '}
                          <span className='text-[#EA580C] underline font-bold'>
                            chọn tệp từ máy
                          </span>
                        </p>
                        <p className='text-[11px] text-stone-400'>
                          Hỗ trợ PNG, JPG, WebP tối đa 10MB • Hỗ trợ dán trực tiếp từ Clipboard
                          (Ctrl + V)
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= ERA (THỜI KỲ & TIẾN TRÌNH CỐT TRUYỆN) ================= */}
            <div
              className='bg-[#FAF8F5] border border-[#E7E5E4] rounded-2xl p-4 space-y-3'
              data-testid='era-config-block'
            >
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <Clock className='w-4 h-4 text-[#EA580C]' />
                  <span className='text-xs font-bold text-zinc-900'>
                    Thời kỳ & Tiến trình cốt truyện (Era)
                  </span>
                </div>
                {!supersedeTarget && existingStages && existingStages.length > 0 && (
                  <div
                    className='inline-flex rounded-xl bg-stone-200/70 p-0.5 text-xs font-medium'
                    role='tablist'
                  >
                    <button
                      type='button'
                      role='tab'
                      aria-selected={eraMode === 'existing'}
                      onClick={() => {
                        setEraMode('existing');
                        const stg =
                          existingStages.find((s) => s.stageKey === selectedExistingStageKey) ||
                          existingStages[0];
                        if (stg) {
                          setStageName(stg.stageName);
                          setEffectiveChapter(stg.effectiveFromChapterNumber);
                          setEffectiveToChapter(stg.effectiveToChapterNumber ?? '');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        eraMode === 'existing'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      data-testid='switch-to-existing-era-tab'
                    >
                      Thời kỳ hiện có
                    </button>
                    <button
                      type='button'
                      role='tab'
                      aria-selected={eraMode === 'new'}
                      onClick={() => {
                        setEraMode('new');
                        setStageName('');
                        const maxCh = Math.max(
                          ...existingStages.map((s) => s.effectiveFromChapterNumber || 1),
                        );
                        setEffectiveChapter(maxCh + 1);
                        setEffectiveToChapter('');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        eraMode === 'new'
                          ? 'bg-[#EA580C] text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      data-testid='switch-to-new-era-tab'
                    >
                      <Plus className='w-3 h-3' />
                      <span>Tạo thời kỳ mới</span>
                    </button>
                  </div>
                )}
              </div>

              {eraMode === 'existing' &&
              existingStages &&
              existingStages.length > 0 &&
              !supersedeTarget ? (
                <div className='space-y-2 pt-1'>
                  <label className='block text-xs font-semibold text-zinc-700'>
                    {isArtistConceptSubmit
                      ? 'Chọn thời kỳ áp dụng bản vẽ Concept Art *'
                      : 'Chọn thời kỳ của nhân vật để thêm phiên bản *'}
                  </label>
                  <select
                    value={selectedExistingStageKey}
                    onChange={(e) => {
                      const key = e.target.value;
                      setSelectedExistingStageKey(key);
                      const stg = existingStages.find((s) => s.stageKey === key);
                      if (stg) {
                        setStageName(stg.stageName);
                        setEffectiveChapter(stg.effectiveFromChapterNumber);
                        setEffectiveToChapter(stg.effectiveToChapterNumber ?? '');
                      }
                    }}
                    className='w-full px-3 py-2 bg-white border border-[#D8D2C5] rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#F97316] cursor-pointer'
                    data-testid='existing-era-select'
                  >
                    {existingStages.map((stg) => (
                      <option key={stg.stageKey} value={stg.stageKey}>
                        {stg.stageName} (Chương {stg.effectiveFromChapterNumber}
                        {stg.effectiveToChapterNumber ? `–${stg.effectiveToChapterNumber}` : '+'})
                      </option>
                    ))}
                  </select>
                  <p className='text-[11px] text-zinc-500'>
                    {isArtistConceptSubmit
                      ? `Bản vẽ sẽ được thẩm định và liên kết với thời kỳ `
                      : `Phiên bản mới sẽ bổ sung vào thời kỳ `}
                    <strong>{stageName || 'Giai đoạn chuẩn'}</strong> (từ Chương {effectiveChapter}
                    {effectiveToChapter ? ` đến Chương ${effectiveToChapter}` : '+'}).
                  </p>
                </div>
              ) : (
                <div className='space-y-3 pt-1'>
                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <label className='text-xs font-semibold text-zinc-800 flex items-center gap-1.5'>
                        <span>Tên Thời kỳ mới (Era Name)</span>
                        <span className='text-red-500'>*</span>
                      </label>
                      <span className='text-[10.5px] text-zinc-400'>
                        VD: Lúc nhỏ, Siêu Saiyan, Trưởng thành...
                      </span>
                    </div>
                    <input
                      type='text'
                      maxLength={100}
                      placeholder='Nhập tên thời kỳ (VD: Thiếu niên, Trưởng thành, Hắc hóa...)'
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      className='w-full px-3 py-2 bg-white border border-[#D8D2C5] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                      data-testid='revision-stage-name-input'
                    />
                    {/* Quick Preset Pills */}
                    <div className='flex items-center gap-1.5 mt-2 flex-wrap'>
                      <span className='text-[11px] text-zinc-400'>Gợi ý nhanh:</span>
                      {[
                        'Lúc nhỏ',
                        'Thiếu niên',
                        'Trưởng thành',
                        'Biến hình / Hóa thần',
                        'Arc mới',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type='button'
                          onClick={() => setStageName(preset)}
                          className='px-2.5 py-0.5 rounded-lg bg-stone-100 hover:bg-orange-50 hover:text-[#EA580C] hover:border-orange-200 border border-stone-200 text-xs text-zinc-600 transition-colors cursor-pointer'
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chapter Range: From & To */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                        Bắt đầu từ Chương *
                      </label>
                      <input
                        type='number'
                        min={1}
                        value={effectiveChapter}
                        disabled={!!supersedeTarget}
                        onChange={(e) =>
                          setEffectiveChapter(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-zinc-900 focus:outline-none disabled:opacity-60 ${
                          !supersedeTarget && lockedChapterNumbers.includes(effectiveChapter)
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-[#D8D2C5] focus:border-[#F97316]'
                        }`}
                        data-testid='revision-effective-from-input'
                      />
                      {!supersedeTarget && lockedChapterNumbers.includes(effectiveChapter) && (
                        <p className='text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1'>
                          <AlertCircle className='w-3 h-3 text-red-500 shrink-0' />
                          Chương {effectiveChapter} đã có phiên bản bị khoá!
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                        Đến Chương (Tùy chọn)
                      </label>
                      <input
                        type='number'
                        min={effectiveChapter}
                        placeholder='Để trống = Đến hết truyện'
                        value={effectiveToChapter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEffectiveToChapter(val === '' ? '' : parseInt(val, 10));
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-zinc-900 focus:outline-none ${
                          effectiveToChapter !== '' && Number(effectiveToChapter) < effectiveChapter
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-[#D8D2C5] focus:border-[#F97316]'
                        }`}
                        data-testid='revision-effective-to-input'
                      />
                      {effectiveToChapter !== '' &&
                        Number(effectiveToChapter) < effectiveChapter && (
                          <p className='text-[11px] text-red-600 mt-1 font-medium'>
                            Chương kết thúc phải ≥ chương bắt đầu ({effectiveChapter}).
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ================= SUMMARY / REVISION NOTE ================= */}
            <div>
              <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                {supersedeTarget
                  ? 'Lý do thay thế bản đã khoá *'
                  : isArtistConceptSubmit
                    ? 'Ghi chú nộp bài / Lời nhắn gửi Biên kịch & Biên tập viên *'
                    : 'Tóm tắt thay đổi *'}
              </label>
              <input
                type='text'
                maxLength={supersedeTarget ? 400 : undefined}
                placeholder={
                  isArtistConceptSubmit
                    ? 'Ví dụ: Hoàn thiện turnaround 3 góc, cập nhật trang phục và chuôi kiếm theo kịch bản...'
                    : 'Ví dụ: Cập nhật trang phục chiến đấu mới...'
                }
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                data-testid='revision-summary-input'
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
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
                        Thông số & Đặc tả kịch bản (Tùy chọn)
                      </span>
                      <span className='text-[11px] text-stone-500 truncate block'>
                        {isSpecsExpanded
                          ? 'Mặc định giữ nguyên theo kịch bản của Writer. Nhấp để thu gọn.'
                          : `${name} • ${revAttr1 || 'Chưa thiết lập'} • ${revAttr2 || 'Chưa thiết lập'}`}
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
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                          Tên mục *
                        </label>
                        <input
                          type='text'
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                          Phụ đề / Vai trò
                        </label>
                        <input
                          type='text'
                          value={subtitle}
                          onChange={(e) => setSubtitle(e.target.value)}
                          className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                        />
                      </div>
                    </div>

                    <div className='p-3 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl space-y-2'>
                      <span className='text-xs font-bold text-zinc-800 block'>
                        Thông số nhân vật (Độ tuổi & Vóc dáng)
                      </span>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-xs font-medium text-zinc-700 mb-1'>
                            Độ tuổi
                          </label>
                          <input
                            type='text'
                            placeholder='Ví dụ: 17 tuổi, 25 tuổi...'
                            value={revAttr1}
                            onChange={(e) => setRevAttr1(e.target.value)}
                            className='w-full px-3 py-1.5 bg-white border border-[#D8D2C5] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-zinc-700 mb-1'>
                            Chiều cao / Vóc dáng
                          </label>
                          <input
                            type='text'
                            placeholder='Ví dụ: 178 cm, Cao gầy...'
                            value={revAttr2}
                            onChange={(e) => setRevAttr2(e.target.value)}
                            className='w-full px-3 py-1.5 bg-white border border-[#D8D2C5] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                        Mô tả chi tiết (Tùy chọn)
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder='Mô tả chi tiết ngoại hình, phục trang, tính cách...'
                        className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316] resize-y custom-scrollbar leading-relaxed'
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                      Tên mục *
                    </label>
                    <input
                      type='text'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                      Phụ đề / Vai trò
                    </label>
                    <input
                      type='text'
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                </div>

                {/* Contextual Attributes (Specs) */}
                <div className='p-3 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl space-y-2'>
                  <span className='text-xs font-bold text-zinc-800 block'>
                    {revisionTarget.category === 'characters' ||
                    revisionTarget.category === 'character'
                      ? 'Thông số nhân vật (Độ tuổi & Vóc dáng)'
                      : revisionTarget.category === 'locations' ||
                          revisionTarget.category === 'location'
                        ? 'Thông số không gian & Bối cảnh'
                        : revisionTarget.category === 'prop'
                          ? 'Thông số đạo cụ & Vật phẩm'
                          : revisionTarget.category === 'terminology'
                            ? 'Đặc tả thuật ngữ / Cốt truyện'
                            : 'Quy chuẩn mỹ thuật'}
                  </span>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-zinc-700 mb-1'>
                        {revisionTarget.category === 'characters' ||
                        revisionTarget.category === 'character'
                          ? 'Độ tuổi'
                          : revisionTarget.category === 'locations' ||
                              revisionTarget.category === 'location'
                            ? 'Loại địa hình / Phân khu'
                            : revisionTarget.category === 'prop'
                              ? 'Kích thước & Trọng lượng'
                              : revisionTarget.category === 'terminology'
                                ? 'Phân loại lĩnh vực'
                                : 'Bảng màu chủ đạo'}
                      </label>
                      <input
                        type='text'
                        placeholder={
                          revisionTarget.category === 'characters' ||
                          revisionTarget.category === 'character'
                            ? 'Ví dụ: 17 tuổi, 25 tuổi...'
                            : 'Ví dụ: Hang động, Rừng lớn...'
                        }
                        value={revAttr1}
                        onChange={(e) => setRevAttr1(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#D8D2C5] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-medium text-zinc-700 mb-1'>
                        {revisionTarget.category === 'characters' ||
                        revisionTarget.category === 'character'
                          ? 'Chiều cao / Vóc dáng'
                          : revisionTarget.category === 'locations' ||
                              revisionTarget.category === 'location'
                            ? 'Quy mô / Khí hậu'
                            : revisionTarget.category === 'prop'
                              ? 'Chất liệu cấu tạo'
                              : revisionTarget.category === 'terminology'
                                ? 'Nguồn gốc / Khởi nguyên'
                                : 'Quy chuẩn nét vẽ'}
                      </label>
                      <input
                        type='text'
                        placeholder={
                          revisionTarget.category === 'characters' ||
                          revisionTarget.category === 'character'
                            ? 'Ví dụ: 178 cm, Cao gầy...'
                            : 'Ví dụ: U tối, Đầy sương...'
                        }
                        value={revAttr2}
                        onChange={(e) => setRevAttr2(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#D8D2C5] rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#F97316]'
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-semibold text-zinc-800 mb-1'>
                    Mô tả chi tiết (Tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='Mô tả chi tiết ngoại hình, tính cách hoặc lưu ý cho họa sĩ...'
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#F97316] resize-y custom-scrollbar leading-relaxed'
                  />
                </div>

                {/* Upload reference sheet image for Producer/Writer */}
                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <label className='text-xs font-semibold text-zinc-800'>
                      Ảnh tham chiếu / Moodboard (Tùy chọn)
                    </label>
                    <span className='text-[10px] text-zinc-400 font-normal'>
                      {isArtist ? 'Dành cho Artist' : 'Chỉ Artist được tải'}
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
                        <div className='w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-900 shrink-0 relative'>
                          <AuthenticatedImage
                            src={referenceImageUrl}
                            alt={name || 'Reference Sheet'}
                            className='w-full h-full object-cover'
                          />
                        </div>
                        <div className='min-w-0'>
                          <span className='text-[10px] text-zinc-500 font-mono truncate block max-w-[200px]'>
                            {referenceImageUrl}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-1 shrink-0'>
                        <button
                          type='button'
                          onClick={() => revFileInputRef.current?.click()}
                          className='px-2 py-1 text-[11px] font-semibold rounded bg-white border border-[#E7E7E7] hover:bg-zinc-50 text-zinc-700'
                        >
                          Đổi ảnh
                        </button>
                        <button
                          type='button'
                          onClick={() => setReferenceImageUrl('')}
                          className='p-1 text-red-600 hover:bg-red-50 rounded'
                          title='Gỡ ảnh'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ) : !isArtist ? (
                    <div className='p-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-center text-xs text-zinc-500 flex items-center justify-center gap-2'>
                      <Lock className='w-3.5 h-3.5 text-zinc-400' />
                      <span>Chỉ Họa sĩ (Artist) mới có quyền tải ảnh Model Sheet mới.</span>
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => revFileInputRef.current?.click()}
                      disabled={uploadingRevImage}
                      className='w-full p-3 rounded-xl border border-dashed border-zinc-300 hover:border-[#F97316] bg-[#FAF8F5] text-center text-xs text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-2 cursor-pointer transition-colors'
                    >
                      {uploadingRevImage ? (
                        <>
                          <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' />
                          <span>Đang tải ảnh lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className='w-3.5 h-3.5 text-[#F97316]' />
                          <span>+ Tải ảnh Model Sheet / Concept (PNG, JPEG, WebP ≤ 10MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ================= MODAL FOOTER ================= */}
          <div className='px-5 sm:px-6 py-3.5 border-t border-stone-200/80 bg-stone-50/70 flex items-center justify-between shrink-0 gap-3'>
            <div className='text-xs'>
              {isArtistConceptSubmit &&
                (referenceImageUrl ? (
                  <span className='text-emerald-700 font-semibold flex items-center gap-1.5'>
                    <CheckCircle2 className='w-4 h-4' />
                    Đã đính kèm ảnh bản vẽ
                  </span>
                ) : (
                  <span className='text-amber-700 font-medium flex items-center gap-1.5'>
                    <AlertCircle className='w-4 h-4' />
                    Chưa chọn ảnh bản vẽ
                  </span>
                ))}
            </div>

            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={onClose}
                className='px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='button'
                disabled={
                  !summary.trim() ||
                  savingRevision ||
                  (!supersedeTarget && lockedChapterNumbers.includes(effectiveChapter)) ||
                  (effectiveToChapter !== '' && Number(effectiveToChapter) < effectiveChapter)
                }
                onClick={handleSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${
                  isArtistConceptSubmit
                    ? 'bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98]'
                    : 'bg-[#059669] hover:bg-[#047857] active:scale-[0.98]'
                }`}
                data-testid='save-revision-submit-btn'
              >
                {isArtistConceptSubmit ? (
                  <Palette className='w-4 h-4' />
                ) : (
                  <CheckCircle2 className='w-4 h-4' />
                )}
                <span>
                  {savingRevision
                    ? 'Đang lưu...'
                    : supersedeTarget
                      ? 'Khoá & Thay thế'
                      : isArtistConceptSubmit && isArtist
                        ? isArtistResubmit
                          ? 'Nộp lại Concept Art'
                          : 'Nộp Concept Art'
                        : eraMode === 'new'
                          ? isProducer
                            ? 'Tạo thời kỳ & Lưu'
                            : 'Tạo thời kỳ & Gửi'
                          : isProducer
                            ? 'Lưu phiên bản'
                            : 'Gửi bản nháp'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);
AddRevisionModal.displayName = 'AddRevisionModal';
