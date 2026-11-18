import React, { useState, useMemo } from 'react';
import { buildBibleUrl } from '@/app/routePaths';
import {
  AlertTriangle,
  ExternalLink,
  User,
  MapPin,
  Box,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit3,
  CheckCircle2,
  Loader2,
  Undo2,
  Layers,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  ChapterCastBoundRevisionDto,
  ChapterCastPanelRevisionDto,
  ChapterCastAvailableRevisionDto,
  ChapterCastMentionDto,
  ChapterCastSource,
} from '@/services/chapterCast.service';
import {
  toSpecCategory,
  mergeSpecAttributes,
  specCompleteness,
  specFields,
} from '@/shared/features/series-bible/bibleSpec';
import { SpecFieldsEditor } from '@/shared/features/series-bible/SpecFieldsEditor';

export interface BibleAccordionEntity {
  id: string; // bibleEntryId
  name: string;
  code?: string;
  category: number | string;
  subtitle?: string | null;
  description?: string | null;
  detailsJson?: string | null;
  attributes?: Record<string, any>;
  isStub?: boolean;
  isCrowd?: boolean;
  isCanonLocked?: boolean;
  bibleStatus?: string;
  source?: ChapterCastSource;
  boundRevision?: ChapterCastBoundRevisionDto | null;
  chosenByWriter?: boolean;
  inheritedFromChapterNumber?: number | null;
  panelRevisions?: ChapterCastPanelRevisionDto[];
  availableRevisions?: ChapterCastAvailableRevisionDto[];
  mentions?: ChapterCastMentionDto[];
}

export interface BibleEntryAccordionItemProps {
  entity: BibleAccordionEntity;
  isOpen: boolean;
  onToggle: () => void;
  canEditScript?: boolean;
  isInChapter?: boolean;
  workspaceId?: string;
  seriesId?: string;
  isActing?: boolean;
  onSaveDraft?: (
    entryId: string,
    payload: {
      name: string;
      description: string;
      subtitle?: string;
      detailsJson?: string;
      isStub?: boolean;
    },
  ) => Promise<void>;
  onChangeRevision?: (entryId: string, revId: string) => Promise<void>;
  onToggleCrowd?: (entry: BibleAccordionEntity) => Promise<void>;
  onCancelReplacement?: (entryId: string, revId: string) => Promise<void>;
  onJumpToLine?: (lineId: string) => void;
  onJumpToPanel?: (pageNumber?: number | null, panelNumber?: number | null) => void;
  t?: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
}

export const BibleEntryAccordionItem: React.FC<BibleEntryAccordionItemProps> = ({
  entity,
  isOpen,
  onToggle,
  canEditScript = true,
  isInChapter,
  workspaceId,
  seriesId,
  isActing = false,
  onSaveDraft,
  onChangeRevision,
  onToggleCrowd,
  onCancelReplacement,
  onJumpToLine,
  onJumpToPanel,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const effectiveWorkspaceId =
    workspaceId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(/\/workspaces\/([^/]+)/)?.[1]
      : undefined);
  const effectiveSeriesId =
    seriesId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(/\/series\/([^/]+)/)?.[1]
      : undefined);

  const bibleUrl =
    effectiveWorkspaceId && effectiveSeriesId
      ? buildBibleUrl(effectiveWorkspaceId, effectiveSeriesId, entity.name)
      : '#';

  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    if (propT) return propT(key, fallbackOrParams, explicitFallback);
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const specCat = useMemo(() => toSpecCategory(entity.category), [entity.category]);

  // Parse existing attributes from detailsJson / attributes
  const initialAttributes = useMemo<Record<string, any>>(() => {
    let parsed: Record<string, any> = {};
    if (entity.detailsJson) {
      try {
        const details = JSON.parse(entity.detailsJson);
        parsed = details.attributes || details.Attributes || details || {};
      } catch {
        // ignore
      }
    }
    return { ...(entity.attributes || {}), ...parsed };
  }, [entity.detailsJson, entity.attributes]);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editSubtitle, setEditSubtitle] = useState(entity.subtitle || '');
  const [editDescription, setEditDescription] = useState(entity.description || '');
  const [editSpecValues, setEditSpecValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    for (const f of specFields(specCat)) {
      vals[f.key] = String(initialAttributes[f.key] ?? '');
    }
    return vals;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync edit state when entity changes
  const handleOpenEdit = () => {
    if (entity.isStub) return;
    setEditSubtitle(entity.subtitle || '');
    setEditDescription(entity.description || '');
    const vals: Record<string, string> = {};
    for (const f of specFields(specCat)) {
      vals[f.key] = String(initialAttributes[f.key] ?? '');
    }
    setEditSpecValues(vals);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveDraft || !editDescription.trim()) return;
    setIsSaving(true);
    try {
      const mergedAttrs = mergeSpecAttributes(specCat, initialAttributes, editSpecValues);
      const detailsPayload = JSON.stringify({
        attributes: mergedAttrs,
      });

      await onSaveDraft(entity.id, {
        name: entity.name,
        description: editDescription.trim(),
        subtitle: editSubtitle.trim() || undefined,
        detailsJson: detailsPayload,
        isStub: entity.isStub,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (cat: number | string) => {
    const c = String(cat).toLowerCase();
    if (c === '0' || c === 'character') return <User className='w-4 h-4 text-orange-600' />;
    if (c === '1' || c === 'location') return <MapPin className='w-4 h-4 text-blue-600' />;
    if (c === '2' || c === 'item' || c.startsWith('prop'))
      return <Box className='w-4 h-4 text-emerald-600' />;
    return <FileText className='w-4 h-4 text-stone-600' />;
  };

  const boundRev = entity.boundRevision;
  const availableRevs = entity.availableRevisions || [];
  const specStats = useMemo(
    () => specCompleteness(specCat, initialAttributes),
    [specCat, initialAttributes],
  );

  const renderStatusBadge = () => {
    // 1. Trạng thái Màu Vàng: Chưa định nghĩa
    if (entity.isStub || entity.bibleStatus === 'PendingDefinition') {
      return (
        <span
          data-testid='status-badge-stub'
          className='text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0'
        >
          {t('production.cast.pendingDefinition', 'Chưa định nghĩa')}
        </span>
      );
    }

    // 2. Trạng thái Màu Xanh Lá: Canon
    if (entity.isCanonLocked || entity.bibleStatus === 'CanonLocked' || boundRev?.isCanonLocked) {
      return (
        <span
          data-testid='status-badge-canon'
          className='text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0'
        >
          Canon
        </span>
      );
    }

    const revStatus = boundRev?.status;

    // 3. Trạng thái Màu Xanh Lá: Chờ xác nhận
    if (
      entity.bibleStatus === 'WaitingForConfirmation' ||
      revStatus === 'ConceptSubmitted' ||
      (revStatus as any) === 2
    ) {
      return (
        <span
          data-testid='status-badge-confirm'
          className='text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50/70 text-emerald-800 border border-emerald-200 shrink-0'
        >
          {t('production.cast.waitingForConfirmation', 'Chờ xác nhận')}
        </span>
      );
    }

    // 4. Trạng thái Màu Vàng: Cần vẽ lại
    if (
      entity.bibleStatus === 'ReworkRequired' ||
      revStatus === 'ReworkRequired' ||
      (revStatus as any) === 3
    ) {
      return (
        <span
          data-testid='status-badge-rework'
          className='text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-900 border border-amber-300 shrink-0'
        >
          {t('production.cast.reworkRequired', 'Cần vẽ lại')}
        </span>
      );
    }

    // 5. Trạng thái Màu Vàng: Chưa vẽ phác thảo
    return (
      <span
        data-testid='status-badge-draft'
        className='text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 shrink-0'
      >
        {t('production.cast.noSketch', 'Chưa vẽ phác thảo')}
      </span>
    );
  };

  return (
    <div
      data-testid='bible-entry-accordion-item'
      className='rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden transition-all hover:border-orange-300/80'
    >
      {/* 1. Header (Collapsed View - Shows ONLY entity name, category icon, in/out chapter badge, status badge) */}
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${entity.id}`}
        data-testid={`accordion-toggle-${entity.id}`}
        className='w-full p-3 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-stone-50/70 transition-colors'
      >
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-1.5 rounded-lg bg-stone-50 border border-stone-200/70 shrink-0'>
            {getCategoryIcon(entity.category)}
          </div>
          <div className='min-w-0 flex items-center gap-2 flex-wrap'>
            <span className='font-bold text-xs sm:text-sm text-stone-900 truncate'>
              {entity.name}
            </span>
            {entity.code && (
              <span className='text-xs font-mono text-stone-400 shrink-0'>{entity.code}</span>
            )}
            {/* Huy hiệu Trong chương / Ngoài chương */}
            {isInChapter !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  isInChapter
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                {isInChapter
                  ? t('production.cast.inChapter', 'Trong chương')
                  : t('production.cast.outOfChapter', 'Ngoài chương')}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-1.5 shrink-0'>
          {/* Note trạng thái màu vàng / màu xanh lá */}
          {renderStatusBadge()}

          {entity.isCrowd && (
            <span className='text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0'>
              {t('production.cast.crowd', 'Quần chúng')}
            </span>
          )}

          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-orange-600' : ''
            }`}
          />
        </div>
      </button>

      {/* 2. Expanded View (Details & Actions) */}
      {isOpen && (
        <div
          id={`accordion-content-${entity.id}`}
          data-testid='accordion-content'
          className='px-3.5 pb-3.5 pt-2 border-t border-stone-200/70 space-y-3 bg-stone-50/30 animate-in fade-in duration-150 text-stone-900'
        >
          {/* Source Tag if present in chapter cast */}
          {entity.source && (
            <div className='flex items-center gap-1.5'>
              <span className='text-xs px-2 py-0.5 rounded-md font-medium bg-stone-100 text-stone-600 border border-stone-200'>
                {entity.source === 'Speaker'
                  ? t('production.cast.speaker', 'Người nói')
                  : t('production.cast.highlight', 'Bôi đen')}
              </span>
            </div>
          )}

          {/* STUB NOTICE: Tối giản, ít chữ */}
          {entity.isStub ? (
            <div className='p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-center justify-between gap-2.5 text-xs'>
              <span className='text-amber-900 font-medium'>
                {t('production.cast.stubNoticeShort', 'Chưa có định nghĩa')}
              </span>
              {bibleUrl !== '#' && (
                <a
                  href={bibleUrl}
                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs'
                >
                  <ExternalLink className='w-3 h-3' />
                  <span>{t('production.cast.openSeriesBibleShort', 'Định nghĩa')}</span>
                </a>
              )}
            </div>
          ) : isEditing ? (
            <form
              onSubmit={handleSave}
              className='p-3 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-3'
            >
              <div className='flex items-center justify-between border-b border-stone-100 pb-2'>
                <span className='text-xs font-bold text-stone-800 uppercase tracking-wide'>
                  {t('production.cast.editSpecTitle', 'Chỉnh sửa thông tin & Đặc tả')}
                </span>
                <span className='text-xs text-stone-400'>
                  {t('production.cast.editSpecHint', 'Lưu thành bản nháp Series Bible')}
                </span>
              </div>

              {/* Entity Name is IMMUTABLE */}
              <div>
                <label className='block text-xs font-semibold text-stone-700 mb-1'>
                  {t('production.cast.entityNameReadonly', 'Tên thực thể (Bất biến)')}
                </label>
                <div
                  data-testid='define-entity-name-readonly'
                  className='w-full p-2 bg-stone-100 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 select-none cursor-not-allowed'
                >
                  {entity.name}
                </div>
              </div>

              {/* Subtitle / Role */}
              <div>
                <label className='block text-xs font-semibold text-stone-700 mb-1'>
                  {t('production.cast.subtitleLabel', 'Tiêu đề phụ / Vai trò')}
                </label>
                <input
                  type='text'
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder={t(
                    'production.cast.subtitlePlaceholder',
                    'Ví dụ: Kiếm sĩ lang thang',
                  )}
                  className='w-full p-2 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 font-medium text-stone-900'
                />
              </div>

              {/* Description */}
              <div>
                <label className='block text-xs font-semibold text-stone-700 mb-1'>
                  {t('production.cast.visualDescriptionRequired', 'Mô tả & Đặc điểm nhận diện *')}
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t(
                    'production.cast.visualDescriptionPlaceholder',
                    'Ngoại hình, trang phục, vũ khí hoặc đặc điểm nhận diện chính...',
                  )}
                  className='w-full p-2 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 font-normal custom-scrollbar text-stone-900'
                  required
                />
              </div>

              {/* Category Spec Fields from bibleSpec.ts */}
              <div className='pt-1'>
                <SpecFieldsEditor
                  category={specCat}
                  values={editSpecValues}
                  onChange={(key, val) => setEditSpecValues((prev) => ({ ...prev, [key]: val }))}
                />
              </div>

              {/* Action buttons */}
              <div className='flex items-center justify-end gap-2 pt-2 border-t border-stone-100'>
                <button
                  type='button'
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                  className='px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold cursor-pointer'
                >
                  {t('common.cancel', 'Huỷ')}
                </button>
                <button
                  type='submit'
                  disabled={isSaving || !editDescription.trim()}
                  data-testid='save-entry-draft-btn'
                  className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50'
                >
                  {isSaving ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <CheckCircle2 className='w-3.5 h-3.5' />
                  )}
                  <span>{t('production.cast.saveDraft', 'Lưu bản nháp')}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE FOR DETAILS */
            <div className='space-y-2.5'>
              {/* Subtitle */}
              {entity.subtitle && (
                <div className='text-xs text-[#C2410C] font-mono font-semibold'>
                  {entity.subtitle}
                </div>
              )}

              {/* Description */}
              {entity.description ? (
                <p className='text-xs text-stone-700 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-xl border border-stone-200/70'>
                  {entity.description}
                </p>
              ) : (
                <p className='text-xs italic text-stone-400'>
                  {t('production.cast.noDescriptionShort', '(Chưa có mô tả)')}
                </p>
              )}

              {/* Spec completeness badge & quick specs view */}
              <div className='flex items-center justify-between text-xs text-stone-500 pt-1'>
                <span className='font-medium'>
                  {t('production.cast.specFilledCount', 'Đặc tả:')} {specStats.filled}/{specStats.total}
                </span>

                {canEditScript && onSaveDraft && !entity.isStub && (
                  <button
                    type='button'
                    onClick={handleOpenEdit}
                    data-testid='edit-entry-btn'
                    className='px-2.5 py-1 text-xs rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                  >
                    <Edit3 className='w-3.5 h-3.5' />
                    <span>{t('production.cast.editSpecBtnShort', 'Sửa')}</span>
                  </button>
                )}
              </div>

              {/* Read-only spec preview if any fields filled */}
              {specStats.filled > 0 && (
                <div className='pt-1'>
                  <SpecFieldsEditor category={specCat} values={editSpecValues} readOnly />
                </div>
              )}
            </div>
          )}

          {/* Bound Revision Info (If in Chapter Cast) */}
          {entity.boundRevision !== undefined && (
            <div className='p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs space-y-1.5'>
              <div className='flex items-center justify-between gap-1'>
                <span className='text-stone-500 font-medium'>
                  {t('production.cast.boundForChapter', 'Bản gắn cho chương:')}
                </span>
                <span className='text-xs px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700 font-medium'>
                  {entity.chosenByWriter
                    ? t('production.cast.chosenByWriter', 'Writer chọn')
                    : entity.inheritedFromChapterNumber
                      ? t(
                          'production.cast.inheritedFromChapter',
                          { number: entity.inheritedFromChapterNumber },
                          `Kế thừa từ Ch. ${entity.inheritedFromChapterNumber}`,
                        )
                      : t('production.cast.defaultVariant', 'Mặc định')}
                </span>
              </div>

              {boundRev ? (
                <div className='flex items-center justify-between text-stone-800 font-medium'>
                  <span>
                    v{boundRev.versionNumber} ·{' '}
                    {boundRev.variantLabel || t('production.cast.defaultVariant', 'Mặc định')}
                  </span>
                  <span
                    className={`text-xs ${boundRev.isCanonLocked ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}
                  >
                    {boundRev.isCanonLocked ? 'CanonLocked' : boundRev.status}
                  </span>
                </div>
              ) : (
                <span className='text-stone-400 italic block'>
                  {t('production.cast.noBoundRevision', 'Chưa gắn bản tạo hình nào')}
                </span>
              )}
            </div>
          )}

          {/* Writer Chapter Cast Controls (Revision selector, crowd, cancel replacement) */}
          {canEditScript && (availableRevs.length > 0 || onToggleCrowd) && (
            <div className='pt-1 border-t border-stone-100 space-y-2'>
              {/* Revision Selector */}
              {availableRevs.length > 0 && onChangeRevision && (
                <div>
                  <label className='text-xs text-stone-500 font-medium block mb-1'>
                    {t('production.cast.changeChapterRevision', 'Đổi bản tạo hình chương:')}
                  </label>
                  <select
                    disabled={isActing}
                    value={entity.chosenByWriter && boundRev ? boundRev.revisionId : '__INHERITED__'}
                    onChange={(e) => onChangeRevision(entity.id, e.target.value)}
                    className='w-full p-1.5 text-xs bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-500 text-stone-800 font-medium disabled:opacity-60 cursor-pointer'
                  >
                    <option value='__INHERITED__'>
                      {entity.inheritedFromChapterNumber
                        ? t(
                            'production.cast.autoInheritFrom',
                            { number: entity.inheritedFromChapterNumber },
                            `Kế thừa tự động (từ Ch. ${entity.inheritedFromChapterNumber})`,
                          )
                        : t('production.cast.autoInheritDefault', 'Kế thừa tự động (bản mặc định)')}
                    </option>
                    {availableRevs.map((rev) => (
                      <option key={rev.revisionId} value={rev.revisionId}>
                        v{rev.versionNumber} ·{' '}
                        {rev.variantLabel || t('production.cast.defaultVariant', 'Mặc định')} (
                        {rev.isCanonLocked ? 'CanonLocked' : rev.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action buttons bar */}
              <div className='flex items-center justify-between gap-1.5 flex-wrap pt-1'>
                {/* Crowd Toggle */}
                {onToggleCrowd && (
                  <button
                    type='button'
                    disabled={isActing}
                    onClick={() => onToggleCrowd(entity)}
                    className={`px-2 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                      entity.isCrowd
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {entity.isCrowd
                      ? t('production.cast.crowdMarked', '✓ Quần chúng')
                      : t('production.cast.setCrowd', '+ Đặt Quần chúng')}
                  </button>
                )}

                {/* Cancel Replacement Button */}
                {onCancelReplacement &&
                  entity.chosenByWriter &&
                  boundRev &&
                  !boundRev.isCanonLocked && (
                    <button
                      type='button'
                      disabled={isActing}
                      onClick={() => onCancelReplacement(entity.id, boundRev.revisionId)}
                      className='px-2 py-1 text-xs rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors flex items-center gap-1'
                    >
                      <Undo2 className='w-3 h-3' />
                      <span>{t('production.cast.cancelReplacement', 'Huỷ bản thay thế')}</span>
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* Panel-specific revisions (hồi tưởng / biến thể panel) */}
          {entity.panelRevisions && entity.panelRevisions.length > 0 && (
            <div className='p-2 bg-blue-50/60 rounded-lg border border-blue-200/60 text-xs space-y-1'>
              <div className='flex items-center gap-1 text-blue-900 font-semibold'>
                <Layers className='w-3.5 h-3.5' />
                <span>{t('production.cast.panelRevisions', 'Bản riêng theo Panel:')}</span>
              </div>
              {entity.panelRevisions.map((pr) => (
                <div
                  key={pr.panelId}
                  className='flex items-center justify-between text-blue-800 text-xs'
                >
                  <span>
                    {t(
                      'production.cast.pagePanelFormat',
                      { page: pr.pageNumber, panel: pr.panelNumber },
                      `Trang ${pr.pageNumber} · Panel ${pr.panelNumber}`,
                    )}
                  </span>
                  <span className='font-medium'>
                    v{pr.versionNumber} ·{' '}
                    {pr.variantLabel || t('production.cast.variant', 'Biến thể')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mentions in Script (Jump to line / panel) */}
          {entity.mentions && entity.mentions.length > 0 && (
            <div className='text-xs space-y-1 pt-1 border-t border-stone-100'>
              <span className='text-stone-400 font-medium block'>
                {t(
                  'production.cast.appearances',
                  { count: entity.mentions.length },
                  `Xuất hiện (${entity.mentions.length}):`,
                )}
              </span>
              <div className='flex flex-wrap gap-1'>
                {entity.mentions.slice(0, 5).map((m) => (
                  <button
                    key={m.lineId}
                    type='button'
                    onClick={() => {
                      if (onJumpToLine) onJumpToLine(m.lineId);
                      if (onJumpToPanel && m.pageNumber && m.panelNumber) {
                        onJumpToPanel(m.pageNumber, m.panelNumber);
                      }
                    }}
                    className='px-1.5 py-0.5 rounded text-xs bg-stone-100 hover:bg-orange-100 text-stone-700 hover:text-orange-800 transition-colors cursor-pointer border border-stone-200/80 flex items-center gap-0.5'
                  >
                    <span>
                      {m.pageNumber && m.panelNumber
                        ? `P${m.pageNumber}.${m.panelNumber}`
                        : t(
                            'production.cast.lineFormat',
                            { order: m.lineOrder },
                            `Dòng ${m.lineOrder}`,
                          )}
                    </span>
                    <ChevronRight className='w-3 h-3 opacity-60' />
                  </button>
                ))}
                {entity.mentions.length > 5 && (
                  <span className='text-xs text-stone-400 self-center'>
                    +{entity.mentions.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
