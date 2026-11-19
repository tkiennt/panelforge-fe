import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  History,
  GitCommit,
  Eye,
  Layers,
  Palette,
  CheckCircle2,
  MessageSquare,
  Plus,
  RotateCcw,
  Upload,
  Clock,
  ArrowLeft,
  User,
  FileText,
  Edit3,
  Send,
  CornerDownRight,
  Check,
  Users,
  Loader2,
} from 'lucide-react';
import { BibleEntity, normalizeWorkspaceRole } from '@/types';
import {
  BibleEntryDto,
  BibleEntryRevisionDto,
  BibleConceptCommentDto,
  bibleService,
} from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { Alert, CollapsibleSidebar, Modal, SidebarSection } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { BibleStubAiDraftSection } from './BibleStubAiDraftSection';
import { getCategoryLabel } from './bibleCategory';
import { SPEC_DELIVERABLES, SPEC_SCHEMA, specCategoryOf, specCompleteness } from './bibleSpec';
import type { BibleEntryUsageDto } from '@/services/bible.service';

export interface CharacterVariant {
  variantKey: string;
  variantLabel: string;
  latestRevision: BibleEntryRevisionDto;
  revisions: BibleEntryRevisionDto[];
  isLocked: boolean;
}

export function getRevisionVariantLabel(
  rev?: { variantLabel?: string | null; stageName?: string | null } | null,
): string {
  const raw = rev?.variantLabel ?? rev?.stageName ?? '';
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'Mặc định';
}

export function groupRevisionsIntoVariants(
  revisions: BibleEntryRevisionDto[],
  fallbackRevision?: BibleEntryRevisionDto | null,
): CharacterVariant[] {
  const all: BibleEntryRevisionDto[] = [];
  const seenIds = new Set<string>();

  const addRev = (rev: BibleEntryRevisionDto | null | undefined) => {
    if (!rev) return;
    const label = getRevisionVariantLabel(rev);
    const normalizedRev: BibleEntryRevisionDto = { ...rev, variantLabel: label };
    const idKey = normalizedRev.id
      ? String(normalizedRev.id)
      : `v${normalizedRev.versionNumber}-${label}`;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      all.push(normalizedRev);
    }
  };

  if (Array.isArray(revisions)) {
    for (const r of revisions) addRev(r);
  }
  if (fallbackRevision) {
    addRev(fallbackRevision);
  }

  if (all.length === 0) {
    return [];
  }

  const groupMap = new Map<string, BibleEntryRevisionDto[]>();
  for (const rev of all) {
    const label = getRevisionVariantLabel(rev);
    const groupKey = label.toLocaleLowerCase();
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(rev);
  }

  const variants: CharacterVariant[] = [];
  const sortedGroupKeys = Array.from(groupMap.keys()).sort((a, b) => {
    const minVerA = Math.min(...groupMap.get(a)!.map((r) => r.versionNumber || 0));
    const minVerB = Math.min(...groupMap.get(b)!.map((r) => r.versionNumber || 0));
    return minVerA - minVerB;
  });

  for (const groupKey of sortedGroupKeys) {
    const revList = groupMap.get(groupKey)!;
    const sortedRevs = [...revList].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
    const latest = sortedRevs[0];
    const isLocked = sortedRevs.some((r) => r.reviewStatus === 'CanonLocked');
    const latestLabel = getRevisionVariantLabel(latest);
    variants.push({
      variantKey: `variant-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      variantLabel: latestLabel,
      latestRevision: { ...latest, variantLabel: latestLabel },
      revisions: sortedRevs,
      isLocked,
    });
  }

  return variants;
}

const getVariantIcon = (name?: string | null, category?: string | number) => {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('loc') || cat === '2') return '🗺️';
  if (cat.includes('prop') || cat === '3') return '🗡️';
  if (cat.includes('term') || cat.includes('lore') || cat === '4' || cat === '6') return '📜';
  if (cat.includes('style') || cat.includes('rule') || cat === '5') return '🎨';

  const lower = (name || '').toLowerCase();
  if (
    lower.includes('nhỏ') ||
    lower.includes('bé') ||
    lower.includes('child') ||
    lower.includes('kid') ||
    lower.includes('thiếu nhi')
  ) {
    return '🧒';
  }
  if (
    lower.includes('lớn') ||
    lower.includes('trưởng thành') ||
    lower.includes('adult') ||
    lower.includes('thanh niên')
  ) {
    return '🧑';
  }
  if (lower.includes('già') || lower.includes('lão') || lower.includes('old')) {
    return '🧓';
  }
  if (
    lower.includes('biến hình') ||
    lower.includes('ma hóa') ||
    lower.includes('form') ||
    lower.includes('chiến đấu') ||
    lower.includes('awakening')
  ) {
    return '⚡';
  }
  return '👤';
};

export interface DefineStubModalProps {
  isOpen: boolean;
  entity: BibleEntity | null;
  seriesId?: string;
  isWriter: boolean;
  onClose: () => void;
  onDefined: (
    entity: BibleEntity,
    defined: { description: string; subtitle: string; dto?: BibleEntryDto },
  ) => void | Promise<void>;
  onShowToast: (title: string, desc: string) => void;
}

export const DefineStubModal: React.FC<DefineStubModalProps> = ({
  isOpen,
  entity,
  seriesId,
  isWriter,
  onClose,
  onDefined,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const subtitleInputId = useId();
  const descriptionInputId = useId();
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const initializedEntityIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entity) {
      initializedEntityIdRef.current = null;
      return;
    }
    if (initializedEntityIdRef.current !== entity.id) {
      initializedEntityIdRef.current = entity.id;
      setSubtitle(entity.subtitle || '');
      setDescription(entity.description || '');
      setSubmitError(null);
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [isOpen, entity]);

  if (!isOpen || !entity) return null;

  const runSubmit = async () => {
    if (submittingRef.current || !seriesId) return;
    const trimmedDescription = description.trim();
    if (!trimmedDescription) return;
    const trimmedSubtitle = subtitle.trim();

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updatedDto = await bibleService.defineBibleEntry(seriesId, entity.id, {
        name: entity.name,
        description: trimmedDescription,
        subtitle: trimmedSubtitle || undefined,
      });
      await onDefined(entity, {
        description: trimmedDescription,
        subtitle: trimmedSubtitle,
        dto: updatedDto,
      });
      onShowToast(
        t('bible.defineStub.successTitle', 'Đã định nghĩa thực thể'),
        t(
          'bible.defineStub.successDesc',
          { name: entity.name },
          `Đã lưu mô tả đặc tả cho "${entity.name}".`,
        ),
      );
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        t('bible.defineStub.errorDesc', 'Không thể định nghĩa mục Series Bible.');
      setSubmitError(message);
      onShowToast(t('bible.defineStub.errorTitle', 'Định nghĩa thực thể thất bại'), message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      size='md'
      closeLabel={t('common.close', 'Đóng')}
      data-child-modal='true'
      title={t('bible.defineStub.modalTitle', 'Định nghĩa thực thể Series Bible')}
      description={t(
        'bible.defineStub.modalSubtitle',
        'Mục tự động tạo từ kịch bản cần có mô tả đặc tả trước khi đưa vào thiết kế.',
      )}
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <BibleStubAiDraftSection
          seriesId={seriesId}
          entryId={entity.id}
          canUseAi={isWriter}
          onApplyDraft={({ description: draftDesc, subtitle: draftSub }) => {
            setDescription(draftDesc);
            setSubtitle(draftSub);
            setSubmitError(null);
          }}
        />

        <div>
          <span className='block text-xs font-semibold text-stone-700 mb-1'>
            {t('bible.defineStub.nameLabel', 'Tên thực thể (Bất biến)')}
          </span>
          <div
            data-testid='define-entity-name-readonly'
            className='w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 select-none cursor-not-allowed'
          >
            {entity.name}
          </div>
        </div>

        <div>
          <label
            htmlFor={subtitleInputId}
            className='block text-xs font-semibold text-stone-700 mb-1'
          >
            {t('bible.defineStub.subtitleLabel', 'Tiêu đề phụ / Vai trò')}
          </label>
          <input
            id={subtitleInputId}
            name='subtitle'
            type='text'
            value={subtitle}
            disabled={isSubmitting}
            onChange={(e) => setSubtitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                void runSubmit();
              }
            }}
            placeholder={t('bible.defineStub.subtitlePlaceholder', 'Ví dụ: Kiếm sĩ lang thang')}
            data-testid='define-entity-subtitle-input'
            className='w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#F97316] disabled:opacity-60'
          />
        </div>

        <div>
          <label
            htmlFor={descriptionInputId}
            className='block text-xs font-semibold text-stone-700 mb-1'
          >
            {t('bible.defineStub.descriptionLabel', 'Mô tả & Đặc điểm nhận diện *')}
          </label>
          <textarea
            id={descriptionInputId}
            name='description'
            rows={4}
            required
            autoFocus
            value={description}
            disabled={isSubmitting}
            onChange={(e) => {
              setDescription(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) {
                  return;
                }
                e.preventDefault();
                void runSubmit();
              }
            }}
            placeholder={t(
              'bible.defineStub.descriptionPlaceholder',
              'Ngoại hình, trang phục, vũ khí hoặc đặc điểm nhận diện chính...',
            )}
            data-testid='define-entity-description-input'
            className='w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#F97316] disabled:opacity-60'
          />
        </div>

        {submitError && (
          <div
            role='alert'
            data-testid='define-stub-error'
            className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800'
          >
            {submitError}
          </div>
        )}

        <div className='flex items-center justify-end gap-2 pt-3 border-t border-stone-200'>
          <button
            type='button'
            disabled={isSubmitting}
            onClick={onClose}
            className='px-3.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold cursor-pointer disabled:opacity-50'
          >
            {t('bible.defineStub.cancel', 'Hủy')}
          </button>
          <button
            type='submit'
            disabled={isSubmitting || !description.trim()}
            data-testid='save-define-stub-btn'
            className='px-4 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSubmitting ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <CheckCircle2 className='w-3.5 h-3.5' />
            )}
            <span>
              {isSubmitting
                ? t('bible.defineStub.saving', 'Đang lưu...')
                : t('bible.defineStub.save', 'Lưu định nghĩa')}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface BibleEntityDetailModalProps {
  entity: BibleEntity;
  rawEntry?: BibleEntryDto;
  latestSavedRevision?: BibleEntryRevisionDto | null;
  isProducer: boolean;
  isArtist?: boolean;
  isWriter?: boolean;
  isEditor?: boolean;
  canCreateDraft?: boolean;
  canEndorse?: boolean;
  canRequestRework?: boolean;
  seriesId?: string;
  onClose: () => void;
  onOpenHistory: (entity: BibleEntity) => void;
  onOpenAddRevision: (
    entity: BibleEntity,
    supersede?: BibleEntryRevisionDto | null,
    fromQueue?: boolean,
    reworkFeedback?: string,
    isResubmit?: boolean,
    isNewVariant?: boolean,
  ) => void;
  onOpenDefineStub?: (entity: BibleEntity) => void;
  onDefinedStub?: () => void;
  onRequestRework?: (entity: BibleEntity, rev: BibleEntryRevisionDto) => void;
  onConfirmCanon?: (rev: BibleEntryRevisionDto) => Promise<void>;
  onShowToast: (title: string, desc: string) => void;
  onZoomImage: (image: { url: string; title: string }) => void;
  onDeleteRevision?: (entity: BibleEntity, rev: BibleEntryRevisionDto) => Promise<void>;
  onToggleCrowd?: (entity: BibleEntity) => void;
  /** Danh sách mục của Bible để chuyển nhanh sang mục cùng danh mục ở sidebar. */
  entities?: BibleEntity[];
  onSelectEntity?: (entity: BibleEntity) => void;
  /**
   * Lưu nhanh các trường đặc tả nhập trực tiếp: tạo bản nháp mới (append-only) với
   * expectedVersionNumber = phiên bản lớn nhất người dùng đang xem. Trả về true nếu lưu thành công.
   */
  onSaveSpecFields?: (
    entity: BibleEntity,
    attributes: Record<string, unknown>,
    variantLabel: string,
    expectedVersionNumber: number,
    targetRevisionId?: string,
  ) => Promise<boolean>;
}

export const BibleEntityDetailModal: React.FC<BibleEntityDetailModalProps> = ({
  entity,
  rawEntry,
  latestSavedRevision,
  isProducer,
  isArtist = false,
  isWriter = false,
  isEditor = false,
  canCreateDraft = true,
  canEndorse = false,
  canRequestRework = canEndorse,
  seriesId,
  onSaveSpecFields,
  onClose,
  onOpenHistory,
  onOpenAddRevision,
  onOpenDefineStub,
  onDefinedStub,
  onRequestRework,
  onConfirmCanon,
  onShowToast,
  onZoomImage,
  onDeleteRevision,
  onToggleCrowd,
  entities = [],
  onSelectEntity,
}) => {
  const { t } = useTranslation();
  const [activeArtTab, setActiveArtTab] = useState<'turnaround' | 'action'>('turnaround');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Request Info Changes state (Editor/Producer -> Writer)
  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [requestInfoField, setRequestInfoField] = useState('Mô tả đặc tả');
  const [requestInfoNote, setRequestInfoNote] = useState('');
  const [submittingInfoRequest, setSubmittingInfoRequest] = useState(false);

  // Concept Review: Versions & Comments State (BIB-10 FE)
  const [selectedConceptEventId, setSelectedConceptEventId] = useState<string | null>(null);
  const [conceptComments, setConceptComments] = useState<BibleConceptCommentDto[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Revisions & design variants state
  const [allRevisions, setAllRevisions] = useState<BibleEntryRevisionDto[]>(() => {
    return latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id
      ? [latestSavedRevision]
      : [];
  });
  const [isLocking, setIsLocking] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    return latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id
      ? latestSavedRevision.id
      : null;
  });
  const [selectedVariantKey, setSelectedVariantKey] = useState<string>(() => {
    if (latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id) {
      return `variant-${getRevisionVariantLabel(latestSavedRevision)
        .toLocaleLowerCase()
        .replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    return '';
  });

  useEffect(() => {
    if (latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id) {
      setAllRevisions((prev) => {
        const filtered = prev.filter((r) => r.id !== latestSavedRevision.id);
        return [latestSavedRevision, ...filtered];
      });
      setSelectedVersionId(latestSavedRevision.id);
      setSelectedVariantKey(
        `variant-${getRevisionVariantLabel(latestSavedRevision)
          .toLocaleLowerCase()
          .replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      );
    }
  }, [latestSavedRevision, entity.id]);

  // User workspace role detection
  const currentRole = useMemo(() => {
    try {
      const rawWs = localStorage.getItem('activeWorkspace');
      const ws = rawWs ? JSON.parse(rawWs) : null;
      return (
        normalizeWorkspaceRole(ws?.currentUserRole || ws?.role || ws?.userRole) ||
        normalizeWorkspaceRole(localStorage.getItem('workspaceRole'))
      );
    } catch {
      return null;
    }
  }, []);

  const isProducerUser = isProducer || currentRole === 'PRODUCER';
  const isArtistUser = isArtist || currentRole === 'ARTIST';
  const isEditorUser = isEditor || currentRole === 'EDITOR' || (!isProducerUser && canEndorse);
  const isWriterUser =
    Boolean(isWriter) ||
    currentRole === 'WRITER' ||
    (!isProducerUser && canCreateDraft && !isArtistUser && !isEditorUser);

  const effectiveCanCreateDraft = canCreateDraft || isWriterUser;
  const [localDefinedForId, setLocalDefinedForId] = useState<string | null>(null);
  const [isLocalDefineOpen, setIsLocalDefineOpen] = useState(false);
  const isStubEntity =
    localDefinedForId !== entity.id && Boolean(entity.isStub ?? rawEntry?.isStub);
  const canDefineStub = isStubEntity && isWriterUser && canCreateDraft;

  useEffect(() => {
    if (!seriesId || !entity.id) return;
    let active = true;
    bibleService
      .getEntryHistory(seriesId, entity.id)
      .then((revs) => {
        if (active && revs && revs.length > 0) {
          setAllRevisions(revs);
        }
      })
      .catch((err) => {
        console.warn('Cannot fetch full revision history for entity:', err);
      });
    return () => {
      active = false;
    };
  }, [
    seriesId,
    entity.id,
    rawEntry?.effectiveRevision?.id,
    rawEntry?.effectiveRevision?.versionNumber,
  ]);

  // Sidebar: chương nào trong kịch bản dùng mục này (cùng quy tắc Gate 1, BR-21)
  const [usages, setUsages] = useState<BibleEntryUsageDto[] | null | 'error'>(null);
  useEffect(() => {
    if (!seriesId || !entity.id) return;
    let active = true;
    setUsages(null);
    bibleService
      .getEntryUsages(seriesId, entity.id)
      .then((list) => active && setUsages(list || []))
      .catch(() => active && setUsages('error'));
    return () => {
      active = false;
    };
  }, [seriesId, entity.id]);

  const siblings = useMemo(
    () => entities.filter((e) => e.category === entity.category),
    [entities, entity.category],
  );

  const variants = useMemo(() => {
    const fallback = rawEntry?.effectiveRevision || null;
    return groupRevisionsIntoVariants(allRevisions, fallback);
  }, [allRevisions, rawEntry?.effectiveRevision]);

  useEffect(() => {
    if (
      variants.length > 0 &&
      (!selectedVariantKey ||
        !variants.some((variant) => variant.variantKey === selectedVariantKey))
    ) {
      const eff = rawEntry?.effectiveRevision;
      const matching = eff
        ? variants.find((variant) => variant.revisions.some((revision) => revision.id === eff.id))
        : null;
      setSelectedVariantKey(
        matching ? matching.variantKey : variants[variants.length - 1].variantKey,
      );
    }
  }, [variants, rawEntry?.effectiveRevision, selectedVariantKey]);

  const activeVariant = useMemo(() => {
    return variants.find((variant) => variant.variantKey === selectedVariantKey) || variants[0];
  }, [variants, selectedVariantKey]);

  const activeRevision = useMemo(() => {
    if (selectedVersionId && activeVariant?.revisions) {
      const found = activeVariant.revisions.find((r) => r.id === selectedVersionId);
      if (found) return found;
    }
    const effective = rawEntry?.effectiveRevision;
    if (effective && activeVariant?.revisions.some((revision) => revision.id === effective.id)) {
      return effective;
    }
    return activeVariant?.latestRevision || effective || null;
  }, [selectedVersionId, activeVariant, rawEntry?.effectiveRevision]);

  // Turnaround / Character Sheet Gallery Active View State
  const initialUrl = entity.imageUrl || (entity.gallery?.[0]?.url ?? '');
  const initialTitle = entity.imageUrl
    ? entity.name
    : entity.gallery?.[0]?.label
      ? `${entity.name} - ${entity.gallery[0].label}`
      : entity.name;
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(initialUrl);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>(initialTitle);

  useEffect(() => {
    const showCanonDto =
      !selectedVersionId && activeRevision?.id === rawEntry?.effectiveRevision?.id;
    let img = showCanonDto
      ? entity.imageUrl
      : activeRevision?.conceptImageUrl || activeRevision?.referenceImageUrl;
    if (!img && !showCanonDto && activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        img =
          snap.ConceptImageUrl ||
          snap.conceptImageUrl ||
          snap.ReferenceImageUrl ||
          snap.referenceImageUrl;
      } catch {
        // ignore
      }
    }
    if (img) {
      setSelectedImageUrl(img);
      setSelectedImageTitle(
        showCanonDto
          ? entity.name
          : `${entity.name} - ${activeVariant?.variantLabel || 'Model Sheet'}`,
      );
    } else {
      setSelectedImageUrl(entity.imageUrl || (entity.gallery?.[0]?.url ?? ''));
      setSelectedImageTitle(
        entity.imageUrl
          ? entity.name
          : entity.gallery?.[0]?.label
            ? `${entity.name} - ${entity.gallery[0].label}`
            : entity.name,
      );
    }
  }, [
    activeRevision,
    activeVariant?.variantLabel,
    entity.imageUrl,
    entity.gallery,
    entity.name,
    rawEntry?.effectiveRevision?.id,
    selectedVersionId,
  ]);

  // Concept versions list from revision events (BIB-10 FE)
  const conceptVersions = useMemo(() => {
    return (activeRevision?.events || []).filter((e) => e.type === 'ConceptSubmitted');
  }, [activeRevision?.events]);

  const fetchComments = async () => {
    if (!seriesId || !entity.id || !activeRevision?.id) {
      setConceptComments([]);
      return;
    }
    setLoadingComments(true);
    try {
      const comments = await bibleService.getConceptComments(
        seriesId,
        entity.id,
        activeRevision.id,
      );
      setConceptComments(comments || []);
    } catch {
      setConceptComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    void fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, entity.id, activeRevision?.id]);

  const handleCreateComment = async () => {
    if (!seriesId || !entity.id || !activeRevision?.id || !newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      await bibleService.createConceptComment(seriesId, entity.id, activeRevision.id, {
        body: newCommentText.trim(),
        conceptEventId: selectedConceptEventId || activeRevision.currentConceptEventId || undefined,
      });
      setNewCommentText('');
      await fetchComments();
      onShowToast(
        t('bible.detailModal.commentSuccess', 'Đã gửi nhận xét'),
        t(
          'bible.detailModal.commentSuccessDesc',
          'Nhận xét về bản vẽ Concept Art đã được ghi nhận.',
        ),
      );
    } catch (err: any) {
      onShowToast(
        t('bible.detailModal.commentError', 'Lỗi gửi nhận xét'),
        err.message || t('bible.detailModal.commentError', 'Không thể gửi nhận xét.'),
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyComment = async (parentCommentId: string) => {
    const text = replyTextMap[parentCommentId]?.trim();
    if (!seriesId || !entity.id || !activeRevision?.id || !text) return;
    setSubmittingComment(true);
    try {
      await bibleService.replyConceptComment(
        seriesId,
        entity.id,
        activeRevision.id,
        parentCommentId,
        { body: text },
      );
      setReplyTextMap((prev) => ({ ...prev, [parentCommentId]: '' }));
      setActiveReplyId(null);
      await fetchComments();
      onShowToast(
        t('bible.detailModal.replySuccess', 'Đã gửi phản hồi'),
        t('bible.detailModal.replySuccessDesc', 'Phản hồi của bạn đã được gửi thành công.'),
      );
    } catch (err: any) {
      onShowToast(
        t('bible.detailModal.replyError', 'Lỗi gửi phản hồi'),
        err.message || t('bible.detailModal.replyError', 'Không thể gửi phản hồi.'),
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolveComment = async (commentId: string, currentResolved: boolean) => {
    if (!seriesId || !entity.id || !activeRevision?.id) return;
    try {
      await bibleService.resolveConceptComment(
        seriesId,
        entity.id,
        activeRevision.id,
        commentId,
        !currentResolved,
      );
      await fetchComments();
      onShowToast(
        !currentResolved
          ? t('bible.detailModal.resolveComment', 'Đã giải quyết nhận xét')
          : t('bible.detailModal.reopenComment', 'Đã mở lại nhận xét'),
        '',
      );
    } catch (err: any) {
      onShowToast(
        t('bible.detailModal.updateCommentError', 'Lỗi cập nhật nhận xét'),
        err.message ||
          t('bible.detailModal.updateCommentErrorDesc', 'Không thể cập nhật trạng thái nhận xét.'),
      );
    }
  };

  // Visual Diff: Previous Revision & Before/After Image Resolution
  const previousRevision = useMemo(() => {
    if (!activeVariant?.revisions || activeVariant.revisions.length <= 1) return null;
    const sorted = [...activeVariant.revisions].sort(
      (a, b) => (b.versionNumber || 0) - (a.versionNumber || 0),
    );
    const currentIndex = sorted.findIndex((r) => r.id === activeRevision?.id);
    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      return sorted[currentIndex + 1];
    }
    return sorted[sorted.length - 1].id !== activeRevision?.id ? sorted[sorted.length - 1] : null;
  }, [activeVariant?.revisions, activeRevision?.id]);

  const beforeImageUrl = useMemo(() => {
    let prevImg = previousRevision?.conceptImageUrl || previousRevision?.referenceImageUrl;
    if (!prevImg && previousRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(previousRevision.snapshotJson);
        prevImg =
          snap.ConceptImageUrl ||
          snap.conceptImageUrl ||
          snap.ReferenceImageUrl ||
          snap.referenceImageUrl;
      } catch {
        // ignore
      }
    }
    if (prevImg) return prevImg;
    if (entity.gallery?.[0]?.url && entity.gallery[0].url !== selectedImageUrl) {
      return entity.gallery[0].url;
    }
    return selectedImageUrl;
  }, [previousRevision, entity.gallery, selectedImageUrl]);

  const beforeVersionLabel = useMemo(() => {
    if (previousRevision) {
      return `v${previousRevision.versionNumber} (${previousRevision.reviewStatus || t('bible.detailModal.reviewStatusBefore', 'Trước')})`;
    }
    if (entity.gallery?.[0]?.url && entity.gallery[0].url !== selectedImageUrl) {
      return t('bible.detailModal.beforeDraft', 'Bản phác thảo (Before)');
    }
    return t('bible.detailModal.beforeDraft', 'Bản phác thảo (Before)');
  }, [previousRevision, entity.gallery, selectedImageUrl, t]);

  const afterVersionLabel = useMemo(() => {
    if (activeRevision) {
      return `v${activeRevision.versionNumber}${t('bible.detailModal.currentLabel', ' (Hiện tại)')}`;
    }
    return t('bible.detailModal.afterFinal', 'Bản hoàn thiện (After)');
  }, [activeRevision, t]);

  // Entity Category detection
  const normalizedCategory = useMemo(
    () => specCategoryOf(entity, rawEntry?.category),
    [entity, rawEntry?.category],
  );

  const isCharacter = normalizedCategory === 'character';
  const isLocation = normalizedCategory === 'location';
  const isProp = normalizedCategory === 'prop';
  const isTerminology = normalizedCategory === 'terminology';
  const isStyleRule = normalizedCategory === 'style';

  // Variant attributes parsing (No hardcoded mock defaults)
  const variantAttributes = useMemo(() => {
    let parsed: Record<string, any> = {};
    if (activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        parsed = snap.Attributes || snap.attributes || {};
        if (!parsed || Object.keys(parsed).length === 0) {
          if (snap.DetailsJson || snap.detailsJson) {
            const inner = JSON.parse(snap.DetailsJson || snap.detailsJson);
            parsed = inner.attributes || inner.Attributes || {};
          }
        }
      } catch {
        // ignore
      }
    }
    let rawDetailsObj: Record<string, any> = {};
    if (rawEntry?.detailsJson) {
      try {
        const details = JSON.parse(rawEntry.detailsJson);
        rawDetailsObj = details.attributes || details.Attributes || {};
      } catch {
        // ignore
      }
    }
    const combined = { ...(entity.attributes || {}), ...rawDetailsObj, ...parsed };

    return {
      raw: combined as Record<string, unknown>,
      // Character fields (No 17 tuổi or 178 cm fallbacks!)
      age: combined.age || combined['tuổi'] || combined['độ tuổi'] || '',
      height: combined.height || combined['chiều cao'] || combined['vóc dáng'] || '',
      appearance:
        combined.appearance ||
        combined.traits ||
        combined['đặc điểm'] ||
        combined['ngoại hình'] ||
        (isCharacter ? entity.description : '') ||
        '',
      mood: combined.mood || combined['bảng màu'] || '',
      costume: combined.costume || combined['trang phục'] || '',

      // Location fields
      environmentType:
        combined.environmentType ||
        combined.type ||
        combined['loại bối cảnh'] ||
        combined['địa hình'] ||
        entity.subtitle ||
        '',
      scale: combined.scale || combined['quy mô'] || combined['kích thước'] || '',
      atmosphere:
        combined.atmosphere ||
        combined.lighting ||
        combined['khí hậu'] ||
        combined['ánh sáng'] ||
        combined.mood ||
        '',
      architecture:
        combined.architecture ||
        combined['kiến trúc'] ||
        (isLocation ? entity.description : '') ||
        '',

      // Prop fields
      propType:
        combined.propType ||
        combined.type ||
        combined['loại đạo cụ'] ||
        combined['phân loại'] ||
        entity.subtitle ||
        '',
      sizeWeight:
        combined.sizeWeight ||
        combined.size ||
        combined['kích thước'] ||
        combined['trọng lượng'] ||
        '',
      material: combined.material || combined['chất liệu'] || combined['nguồn gốc'] || '',
      functionality:
        combined.functionality ||
        combined['công năng'] ||
        combined['cơ chế'] ||
        (isProp ? entity.description : '') ||
        '',

      // Terminology fields
      termType:
        combined.termType ||
        combined.type ||
        combined['lĩnh vực'] ||
        combined['phân loại'] ||
        entity.subtitle ||
        '',
      origin: combined.origin || combined['nguồn gốc'] || combined['xuất xứ'] || '',
      rules:
        combined.rules ||
        combined['quy luật'] ||
        combined['nguyên lý'] ||
        (isTerminology ? entity.description : '') ||
        '',
      plotImpact: combined.plotImpact || combined['tác động'] || combined['vai trò'] || '',

      // Style fields
      strictness: rawEntry?.strictCheck
        ? t('bible.detailModal.strictCheck', 'Khắt khe (Strict Check)')
        : t('bible.detailModal.standardCheck', 'Tiêu chuẩn'),
      colorPalette: combined.colorPalette || combined.palette || combined['bảng màu'] || '',
      lineArtRules:
        combined.lineArtRules ||
        combined['nét vẽ'] ||
        combined['quy chuẩn'] ||
        (isStyleRule ? entity.description : '') ||
        '',
      negativeConstraints:
        entity.negativeConstraints?.join(', ') ||
        combined.negativeConstraints ||
        combined['cấm kỵ'] ||
        '',
    };
  }, [
    activeRevision,
    entity,
    rawEntry,
    isCharacter,
    isLocation,
    isProp,
    isTerminology,
    isStyleRule,
    t,
  ]);

  const card1Title = useMemo(() => {
    const variant =
      activeVariant?.variantLabel || t('bible.detailModal.defaultVariant', 'Mặc định');
    if (isLocation)
      return t(
        'bible.detailModal.card1TitleLocation',
        { variant },
        `Thông số không gian & Bối cảnh (${variant})`,
      );
    if (isProp)
      return t(
        'bible.detailModal.card1TitleProp',
        { variant },
        `Thông số đạo cụ & Vật phẩm (${variant})`,
      );
    if (isTerminology)
      return t(
        'bible.detailModal.card1TitleTerminology',
        { variant },
        `Đặc tả thuật ngữ & Khái niệm (${variant})`,
      );
    if (isStyleRule)
      return t('bible.detailModal.card1TitleStyle', { variant }, `Quy chuẩn mỹ thuật (${variant})`);
    return t(
      'bible.detailModal.card1TitleCharacter',
      { variant },
      `Thông số nhân vật (${variant})`,
    );
  }, [isLocation, isProp, isTerminology, isStyleRule, activeVariant, t]);

  const visualCardInfo = useMemo(() => {
    if (isLocation) {
      return {
        title: t('bible.detailModal.visualLocTitle', 'Bản vẽ Concept Bối cảnh'),
        badge: t('bible.detailModal.visualLocBadge', 'Concept Bối cảnh'),
        subtitle: t(
          'bible.detailModal.visualLocSubtitle',
          'Bản vẽ tham chiếu không gian và ánh sáng cho đội ngũ sáng tác',
        ),
        tab1: t('bible.detailModal.visualLocTab1', 'Toàn cảnh (Wide Shot)'),
        tab2: t('bible.detailModal.visualLocTab2', 'Góc cận cảnh (Close-up)'),
        emptyWriterPrompt: t(
          'bible.detailModal.visualLocEmptyWriter',
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số bối cảnh để Họa sĩ nắm bắt chính xác không gian trước khi vẽ.',
        ),
        emptyArtistPrompt: t(
          'bible.detailModal.visualLocEmptyArtist',
          'Bạn hãy tải lên bản phác thảo Concept Bối cảnh theo thông số không gian phía trên để bắt đầu chu trình kiểm duyệt.',
        ),
      };
    }
    if (isProp) {
      return {
        title: t('bible.detailModal.visualPropTitle', 'Bản vẽ Thiết kế Đạo cụ'),
        badge: t('bible.detailModal.visualPropBadge', 'Thiết kế Đạo cụ'),
        subtitle: t(
          'bible.detailModal.visualPropSubtitle',
          'Bản vẽ tham chiếu cấu tạo và chi tiết vật phẩm cho đội ngũ sáng tác',
        ),
        tab1: t('bible.detailModal.visualPropTab1', 'Tổng thể (Overview)'),
        tab2: t('bible.detailModal.visualPropTab2', 'Cơ chế & Chi tiết'),
        emptyWriterPrompt: t(
          'bible.detailModal.visualPropEmptyWriter',
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số vật phẩm để Họa sĩ nắm bắt cấu tạo trước khi vẽ.',
        ),
        emptyArtistPrompt: t(
          'bible.detailModal.visualPropEmptyArtist',
          'Bạn hãy tải lên bản phác thảo Thiết kế Đạo cụ theo thông số vật phẩm phía trên để bắt đầu chu trình kiểm duyệt.',
        ),
      };
    }
    if (isTerminology) {
      return {
        title: t('bible.detailModal.visualTermTitle', 'Sơ đồ & Minh họa Khái niệm'),
        badge: t('bible.detailModal.visualTermBadge', 'Tài liệu trực quan'),
        subtitle: t(
          'bible.detailModal.visualTermSubtitle',
          'Sơ đồ, biểu tượng hoặc hình ảnh minh họa cho thuật ngữ cốt truyện',
        ),
        tab1: t('bible.detailModal.visualTermTab1', 'Minh họa chính'),
        tab2: t('bible.detailModal.visualTermTab2', 'Sơ đồ & Chi tiết'),
        emptyWriterPrompt: t(
          'bible.detailModal.visualTermEmptyWriter',
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật mô tả thuật ngữ để Họa sĩ thiết kế hình ảnh minh họa phù hợp.',
        ),
        emptyArtistPrompt: t(
          'bible.detailModal.visualTermEmptyArtist',
          'Bạn hãy tải lên sơ đồ hoặc hình ảnh minh họa cho khái niệm này để làm tài liệu tham chiếu.',
        ),
      };
    }
    if (isStyleRule) {
      return {
        title: t('bible.detailModal.visualStyleTitle', 'Quy chuẩn Phong cách Mỹ thuật'),
        badge: t('bible.detailModal.visualStyleBadge', 'Style Guide Sheet'),
        subtitle: t(
          'bible.detailModal.visualStyleSubtitle',
          'Mẫu tham chiếu bảng màu, nét vẽ và hiệu ứng phân khung cho toàn bộ truyện',
        ),
        tab1: t('bible.detailModal.visualStyleTab1', 'Bảng màu & Nét vẽ'),
        tab2: t('bible.detailModal.visualStyleTab2', 'Minh họa quy chuẩn'),
        emptyWriterPrompt: t(
          'bible.detailModal.visualStyleEmptyWriter',
          'Biên tập viên mỹ thuật có thể cập nhật thông số quy chuẩn để họa sĩ tuân thủ nhất quán phong cách.',
        ),
        emptyArtistPrompt: t(
          'bible.detailModal.visualStyleEmptyArtist',
          'Bạn hãy tải lên bảng mẫu Style Guide tham chiếu cho quy tắc mỹ thuật này.',
        ),
      };
    }
    return {
      title: t('bible.detailModal.visualCharTitle', 'Bản vẽ Model Sheet'),
      badge: t('bible.detailModal.visualCharBadge', 'Chuẩn tham chiếu'),
      subtitle: t(
        'bible.detailModal.visualCharSubtitle',
        'Bản vẽ tham chiếu chuẩn cho đội ngũ sáng tác',
      ),
      tab1: t('bible.detailModal.visualCharTab1', 'Turnaround'),
      tab2: t('bible.detailModal.visualCharTab2', 'Góc nhìn & Biểu cảm'),
      emptyWriterPrompt: t(
        'bible.detailModal.visualCharEmptyWriter',
        'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số đặc tả kịch bản để Họa sĩ nắm bắt chính xác tạo hình trước khi vẽ.',
      ),
      emptyArtistPrompt: t(
        'bible.detailModal.visualCharEmptyArtist',
        'Bạn hãy tải lên bản phác thảo Model Sheet theo thông số phía trên để bắt đầu chu trình kiểm duyệt.',
      ),
    };
  }, [isLocation, isProp, isTerminology, isStyleRule, t]);

  // Dynamic Audit logs for SHA-256 Provenance & Revision Events
  const auditLogs = useMemo(() => {
    const list: Array<{ time: string; actor: string; action: string; hash: string }> = [];

    // Prioritize real chronological events from activeRevision.events if available
    if (activeRevision?.events && activeRevision.events.length > 0) {
      activeRevision.events.forEach((evt) => {
        let actionDesc = '';
        let actorDesc = t('bible.detailModal.actorSystem', 'Hệ thống');
        switch (evt.type) {
          case 'Created':
            actorDesc = t('bible.detailModal.actorCreator', 'Khởi tạo');
            actionDesc = t(
              'bible.detailModal.actionCreated',
              { version: activeRevision.versionNumber },
              `Khởi tạo phiên bản v${activeRevision.versionNumber}`,
            );
            break;
          case 'ConceptSubmitted':
            actorDesc = t('bible.detailModal.actorArtist', 'Họa sĩ');
            actionDesc = `${t('bible.detailModal.actionConceptSubmitted', 'Đã nộp Concept Art')}${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'ReworkRequested':
            actorDesc = t('bible.detailModal.actorWriterEditor', 'Biên kịch / Biên tập');
            actionDesc = `${t('bible.detailModal.actionReworkRequested', 'Yêu cầu sửa')}${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'Endorsed':
            actorDesc = t('bible.detailModal.actorEditor', 'Biên tập viên');
            actionDesc = t(
              'bible.detailModal.actionEndorsed',
              'Đã xác nhận & khoá Canon thiết kế sáng tác',
            );
            break;
          case 'Locked':
            actorDesc = t('bible.detailModal.actorEditor', 'Biên tập viên');
            actionDesc = t(
              'bible.detailModal.actionLocked',
              {
                target: activeRevision.variantLabel || activeRevision.stageName || entity.name,
              },
              `Ban hành quy chuẩn chính thức cho ${activeRevision.variantLabel || activeRevision.stageName || entity.name}`,
            );
            break;
          case 'Superseded':
            actorDesc = t('bible.detailModal.actorSystem', 'Hệ thống');
            actionDesc = `${t('bible.detailModal.actionSuperseded', 'Thay thế bởi phiên bản mới')}${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'DraftOverwritten':
            actorDesc = t('bible.detailModal.actorWriterEditor', 'Biên kịch / Biên tập');
            actionDesc = t(
              'bible.detailModal.actionDraftOverwritten',
              'Writer định nghĩa lại nội dung bản nháp',
            );
            break;
          default:
            actionDesc = t(
              'bible.detailModal.actionDefaultEvent',
              { type: evt.type },
              `Sự kiện ${evt.type}`,
            );
        }

        list.push({
          time: evt.createdAt
            ? new Date(evt.createdAt).toLocaleDateString('vi-VN')
            : t('bible.detailModal.timeNew', 'Mới'),
          actor: actorDesc,
          action: actionDesc,
          hash: '',
        });
      });
      return [...list].reverse();
    }

    if (activeVariant?.revisions) {
      activeVariant.revisions.forEach((rev) => {
        if (rev.reviewStatus === 'CanonLocked') {
          list.push({
            time: rev.lockedAt
              ? new Date(rev.lockedAt).toLocaleDateString('vi-VN')
              : t('bible.detailModal.timeApproved', 'Đã duyệt'),
            actor: t('bible.detailModal.actorEditor', 'Biên tập viên'),
            action: t(
              'bible.detailModal.actionLocked',
              {
                target: `${rev.variantLabel || rev.stageName || entity.name} (v${rev.versionNumber})`,
              },
              `Ban hành quy chuẩn chính thức cho ${rev.variantLabel || rev.stageName || entity.name} (v${rev.versionNumber})`,
            ),
            hash: '',
          });
        }
        if (rev.reviewStatus === 'ConceptSubmitted') {
          list.push({
            time: rev.createdAt
              ? new Date(rev.createdAt).toLocaleDateString('vi-VN')
              : t('bible.detailModal.timeRecent', 'Gần đây'),
            actor: t('bible.detailModal.actorArtist', 'Họa sĩ'),
            action: t(
              'bible.detailModal.actionConceptSubmittedVer',
              { version: rev.versionNumber },
              `Đã nộp bản vẽ thiết kế cho phiên bản v${rev.versionNumber}`,
            ),
            hash: '',
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        time: rawEntry?.createdAt
          ? new Date(rawEntry.createdAt).toLocaleDateString('vi-VN')
          : t('bible.detailModal.timeCreated', 'Khởi tạo'),
        actor: t('bible.detailModal.actorSystem', 'Hệ thống'),
        action: t('bible.detailModal.actionInitialLog', 'Khởi tạo hồ sơ lưu trữ thiết kế sáng tác'),
        hash: '',
      });
    }
    return list;
  }, [activeRevision, activeVariant, rawEntry, entity.name, t]);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap, Escape key listener & Body scroll locking
  useEffect(() => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not close workbench if any child modal (e.g. Add Revision, Confirm, Zoom) is currently open on top
      const hasOpenChildModal =
        document.querySelector('[data-child-modal="true"]') ||
        document.querySelectorAll('[role="dialog"]').length > 1;

      if (e.key === 'Escape') {
        if (hasOpenChildModal) {
          // Let the top child modal handle Escape instead of closing the entire workbench
          return;
        }
        e.preventDefault();
        onClose();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      lastActiveElementRef.current?.focus?.();
    };
  }, [onClose]);

  // Clipboard paste listener for quick Model Sheet upload via Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!effectiveCanCreateDraft || isStubEntity) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          onOpenAddRevision(entity, activeRevision);
          onShowToast(
            t('bible.detailModal.imagePastedTitle', 'Đã nhận diện ảnh dán'),
            t(
              'bible.detailModal.imagePastedDesc',
              'Đang mở giao diện nộp bản vẽ Model Sheet mới...',
            ),
          );
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [
    effectiveCanCreateDraft,
    isStubEntity,
    entity,
    activeRevision,
    onOpenAddRevision,
    onShowToast,
    t,
  ]);

  const handleRequestRework = (rev: BibleEntryRevisionDto) => {
    if (!onRequestRework) return;
    onRequestRework(entity, rev);
    setAllRevisions((prev) =>
      prev.map((r) => (r.id === rev.id ? { ...r, reviewStatus: 'ReworkRequired' } : r)),
    );
  };

  const handleLock = async (rev: BibleEntryRevisionDto) => {
    if (!onConfirmCanon) return;
    setIsLocking(true);
    try {
      await onConfirmCanon(rev);
      setAllRevisions((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, reviewStatus: 'CanonLocked' } : r)),
      );
    } finally {
      setIsLocking(false);
    }
  };

  const handleSendRequestInfo = async () => {
    if (!seriesId || !requestInfoNote.trim()) return;
    setSubmittingInfoRequest(true);
    try {
      const targetRevId = activeRevision?.id || rawEntry?.effectiveRevision?.id;
      const formattedBody = `[Yêu cầu sửa thông tin - ${requestInfoField}]: ${requestInfoNote.trim()}`;
      if (targetRevId) {
        await bibleService.createConceptComment(seriesId, entity.id, targetRevId, {
          body: formattedBody,
          conceptEventId:
            selectedConceptEventId || activeRevision?.currentConceptEventId || undefined,
        });
        await fetchComments();
      }
      onShowToast(
        'Đã gửi yêu cầu sửa thông tin',
        `Yêu cầu chỉnh sửa trường "${requestInfoField}" của "${entity.name}" đã được chuyển cho Biên kịch.`,
      );
      setIsRequestInfoOpen(false);
      setRequestInfoNote('');
    } catch (err: any) {
      onShowToast(
        'Không thể gửi yêu cầu',
        err?.message || 'Có lỗi xảy ra khi gửi yêu cầu sửa thông tin.',
      );
    } finally {
      setSubmittingInfoRequest(false);
    }
  };

  // Spec V2.6 §5.2: vòng đời của giai đoạn đang chọn và "bóng đang ở chân ai"
  const isVisualDesign = ['character', 'location', 'prop'].includes(normalizedCategory);
  const lifecycleStatus = ((): 'Draft' | 'ConceptSubmitted' | 'ReworkRequired' | 'CanonLocked' => {
    if (!activeRevision) return 'Draft';
    return activeRevision.reviewStatus || 'Draft';
  })();
  const lifecycleSteps = isVisualDesign
    ? [
        t('bible.detailModal.stepDraft', 'Bản nháp'),
        t('bible.detailModal.stepConceptSubmitted', 'Đã nộp Concept'),
        t('bible.detailModal.stepCanonLocked', 'Canon Locked'),
      ]
    : [
        t('bible.detailModal.stepDraft', 'Bản nháp'),
        t('bible.detailModal.stepConfirmed', 'Đã xác nhận'),
      ];
  const lifecycleIndex = isVisualDesign
    ? { Draft: 0, ConceptSubmitted: 1, ReworkRequired: 1, CanonLocked: 2 }[lifecycleStatus]
    : lifecycleStatus === 'Draft'
      ? 0
      : 1;
  const lifecycleDone = isVisualDesign
    ? lifecycleStatus === 'CanonLocked'
    : lifecycleStatus !== 'Draft';
  const waitingFor = {
    Draft: isVisualDesign
      ? t('bible.detailModal.waitingDraftVisual', 'Artist tải Model Sheet theo đặc tả')
      : t('bible.detailModal.waitingDraftNonVisual', 'Writer / Editor xác nhận nội dung'),
    ConceptSubmitted: t(
      'bible.detailModal.waitingConceptSubmitted',
      'Editor xác nhận (khoá Canon) hoặc yêu cầu vẽ lại',
    ),
    ReworkRequired: t('bible.detailModal.waitingReworkRequired', 'Artist vẽ lại theo nhận xét'),
    CanonLocked: t(
      'bible.detailModal.waitingCanonLocked',
      'Đã khoá. Muốn thay đổi hãy tạo giai đoạn mới',
    ),
  }[lifecycleStatus];
  const isMyTurn =
    (lifecycleStatus === 'Draft' && (isVisualDesign ? isArtistUser : canEndorse)) ||
    (lifecycleStatus === 'ConceptSubmitted' && canEndorse) ||
    (lifecycleStatus === 'ReworkRequired' && isArtistUser);
  const specProgress = specCompleteness(normalizedCategory, variantAttributes.raw);

  // Nhập trực tiếp các trường đặc tả còn trống → lưu thành bản nháp mới (append-only).
  const [specDraft, setSpecDraft] = useState<Record<string, string>>({});
  const [savingSpec, setSavingSpec] = useState(false);
  useEffect(() => {
    setSpecDraft({});
    setEditingSpecKeys(new Set());
  }, [activeRevision?.id]);
  const canInlineEditSpec =
    !isStubEntity &&
    effectiveCanCreateDraft &&
    !!onSaveSpecFields &&
    activeRevision?.reviewStatus !== 'CanonLocked';
  const [editingSpecKeys, setEditingSpecKeys] = useState<Set<string>>(new Set());
  const specDraftDirty = Object.entries(specDraft).some(
    ([k, v]) => v.trim() !== String(variantAttributes.raw[k] ?? '').trim(),
  );
  const handleSaveSpecDraft = async () => {
    if (!onSaveSpecFields || !specDraftDirty || savingSpec) return;
    const attrs: Record<string, unknown> = { ...variantAttributes.raw };
    for (const [k, v] of Object.entries(specDraft)) {
      if (v.trim()) attrs[k] = v.trim();
      else delete attrs[k];
    }
    const allRevs = variants.flatMap((v) => v.revisions);
    const expected = allRevs.length
      ? Math.max(...allRevs.map((r) => r.versionNumber))
      : (activeRevision?.versionNumber ?? 1);
    setSavingSpec(true);
    try {
      const ok = await onSaveSpecFields(
        entity,
        attrs,
        (activeRevision?.variantLabel ?? activeRevision?.stageName ?? '').trim(),
        expected,
        activeRevision?.id,
      );
      if (ok) setSpecDraft({});
      setEditingSpecKeys(new Set());
    } finally {
      setSavingSpec(false);
    }
  };

  const modalContent = (
    <section
      ref={modalContainerRef}
      className='space-y-4 animate-in fade-in duration-150'
      aria-labelledby='bible-entity-title'
      data-testid='bible-entity-workbench'
    >
      {/* ================= HEADER: thanh công cụ gọn (Level 2 toolbar như các màn làm việc khác) ================= */}
      <header className='sticky top-0 z-20 bg-white/90 backdrop-blur-md border border-stone-200 rounded-xl shadow-xs'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3'>
          <button
            type='button'
            onClick={onClose}
            className='w-9 h-9 shrink-0 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:border-stone-400 hover:bg-stone-100 transition-colors cursor-pointer'
            title={t('bible.detailModal.backToBibleTitle', 'Quay lại danh sách Series Bible (Esc)')}
            aria-label={t('bible.detailModal.backToBible', 'Series Bible')}
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div className='w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center'>
            {entity.imageUrl ? (
              <AuthenticatedImage
                src={entity.imageUrl}
                alt={entity.name}
                className='w-full h-full object-cover'
                data-testid='bible-header-thumb'
              />
            ) : (
              <span className='font-serif font-bold text-lg text-stone-800'>
                {(entity.name || '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <nav className='flex items-center gap-1 text-xs text-stone-500' aria-label='breadcrumb'>
              <button
                type='button'
                onClick={onClose}
                className='hover:text-stone-900 hover:underline cursor-pointer'
              >
                {t('bible.detailModal.backToBible', 'Series Bible')}
              </button>
              <span aria-hidden='true'>/</span>
              <span>{getCategoryLabel(entity.category)}</span>
            </nav>
            <div className='flex items-center gap-2 min-w-0 flex-wrap'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200'>
                  {entity.code}
                </span>
                {isStubEntity && (
                  <span
                    data-testid='stub-badge-detail'
                    className='px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1 shadow-2xs'
                  >
                    {t('bible.defineStub.badge', 'Chưa định nghĩa')}
                  </span>
                )}
                {entity.isCrowd && (
                  <span
                    data-testid='crowd-badge-detail'
                    className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 shadow-2xs'
                    title={t('bible.isCrowdHelp', 'Thực thể quần chúng không bắt buộc Model Sheet')}
                  >
                    <Users className='w-3.5 h-3.5 text-emerald-600' />
                    {t('production.cast.crowd', 'Quần chúng')}
                  </span>
                )}
              </div>
              <h2
                id='bible-entity-title'
                className='text-xl font-bold font-serif text-stone-900 tracking-tight truncate'
              >
                {entity.name}
              </h2>
              {entity.latestDraftVersionNumber != null && (
                <span
                  className='inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium'
                  data-testid='pending-draft-badge-detail'
                >
                  {t('bible.view.pendingDraftBadge', { n: entity.latestDraftVersionNumber })}
                </span>
              )}
              {entity.subtitle && (
                <span className='text-sm text-stone-500 truncate'>· {entity.subtitle}</span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 bg-stone-100 text-stone-700 border-stone-200'>
              <User className='w-3.5 h-3.5 text-stone-500' />
              {isProducerUser
                ? t('bible.detailModal.roleProducer', 'Nhà sản xuất')
                : isWriterUser
                  ? t('bible.detailModal.roleWriter', 'Biên kịch')
                  : isArtistUser
                    ? t('bible.detailModal.roleArtist', 'Họa sĩ')
                    : isEditorUser
                      ? t('bible.detailModal.roleEditor', 'Biên tập viên')
                      : t('bible.detailModal.roleViewer', 'Người xem')}
            </span>
            {onToggleCrowd && (
              <button
                type='button'
                onClick={() => onToggleCrowd(entity)}
                data-testid='detail-toggle-crowd-btn'
                title={
                  entity.isCrowd
                    ? t('production.cast.crowdMarked', '✓ Quần chúng (bấm để huỷ)')
                    : t('production.cast.setCrowd', '+ Đặt Quần chúng')
                }
                className={`px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                  entity.isCrowd
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Users
                  className={`w-4 h-4 ${entity.isCrowd ? 'text-emerald-600' : 'text-stone-500'}`}
                />
                <span>
                  {entity.isCrowd
                    ? t('production.cast.crowdMarked', '✓ Quần chúng')
                    : t('production.cast.setCrowd', '+ Quần chúng')}
                </span>
              </button>
            )}
            <button
              type='button'
              onClick={() => onOpenHistory(entity)}
              className='px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F5F4] text-[#292524] border border-[#E7E5E4] text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98]'
            >
              <History className='w-4 h-4 text-stone-500' />
              <span>{t('bible.detailModal.historyBtn', 'Lịch sử phiên bản')}</span>
            </button>
            {isStubEntity ? (
              canDefineStub ? (
                <button
                  type='button'
                  onClick={() => {
                    if (onOpenDefineStub) onOpenDefineStub(entity);
                    else setIsLocalDefineOpen(true);
                  }}
                  data-testid='detail-define-stub-btn'
                  className='px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98]'
                >
                  <Edit3 className='w-4 h-4' />
                  <span>{t('bible.defineStub.action', 'Định nghĩa')}</span>
                </button>
              ) : (
                <span className='px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium flex items-center gap-1.5'>
                  <Lock className='w-3.5 h-3.5 text-stone-500' />
                  {t('bible.detailModal.readOnlyNotice', 'Chế độ chỉ xem')}
                </span>
              )
            ) : effectiveCanCreateDraft ? (
              <button
                type='button'
                onClick={() => onOpenAddRevision(entity)}
                className='px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98]'
              >
                <GitCommit className='w-4 h-4' />
                <span>
                  {isProducer
                    ? t('bible.detailModal.createRevisionBtn', 'Tạo phiên bản mới')
                    : t('bible.detailModal.createDraftBtn', 'Tạo bản nháp mới')}
                </span>
              </button>
            ) : (
              <span className='px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium flex items-center gap-1.5'>
                <Lock className='w-3.5 h-3.5 text-stone-500' />
                {isArtist
                  ? t(
                      'bible.detailModal.artistVariantsNotice',
                      'Họa sĩ nộp Concept Art theo từng giai đoạn',
                    )
                  : t('bible.detailModal.readOnlyNotice', 'Chế độ chỉ xem')}
              </span>
            )}
            <button
              ref={closeButtonRef}
              type='button'
              onClick={onClose}
              className='p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer'
              title={t('bible.detailModal.closeTitle', 'Đóng (Esc)')}
              aria-label={t('bible.detailModal.closeAria', 'Đóng cửa sổ chi tiết')}
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>
        <div
          className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 px-4 py-2 border-t border-stone-200/80 bg-stone-50/70 rounded-b-xl'
          data-testid='bible-status-strip'
        >
          <ol
            className='flex items-center gap-1.5 overflow-x-auto'
            aria-label={t('bible.detailModal.lifecycleTitle', 'Vòng đời phiên bản')}
          >
            {lifecycleSteps.map((label, i) => {
              const done = lifecycleDone || i < lifecycleIndex;
              const current = !lifecycleDone && i === lifecycleIndex;
              const rework = current && lifecycleStatus === 'ReworkRequired';
              return (
                <li
                  key={label}
                  className='flex items-center gap-2 shrink-0'
                  aria-current={current ? 'step' : undefined}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : rework
                          ? 'bg-rose-600 text-white'
                          : current
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    {done ? <CheckCircle2 className='w-3 h-3' /> : i + 1}
                  </span>
                  <span
                    className={`text-xs ${current ? 'font-semibold text-stone-900' : 'text-stone-500'}`}
                  >
                    {rework ? t('bible.detailModal.stepRework', 'Cần vẽ lại') : label}
                  </span>
                  {i < lifecycleSteps.length - 1 && (
                    <span className='w-5 h-px bg-stone-300' aria-hidden='true' />
                  )}
                </li>
              );
            })}
          </ol>
          <div className='flex items-center gap-1.5 flex-wrap text-xs'>
            <span className='text-stone-500'>{t('bible.detailModal.waitingFor', 'Đang chờ:')}</span>
            <span className='font-semibold text-stone-800'>{waitingFor}</span>
            {isMyTurn && (
              <span className='px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold'>
                {t('bible.detailModal.yourTurn', 'Đến lượt bạn')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ================= WORKSPACE BODY CONTAINER ================= */}
      <div className='space-y-4'>
        <div className='grid grid-cols-1 xl:grid-cols-[272px_minmax(0,1fr)] gap-5 items-start'>
          {/* ================= SIDEBAR: mục cùng danh mục · giai đoạn · xuất hiện trong kịch bản ================= */}
          <CollapsibleSidebar
            collapsed={false}
            label={t('bible.detailModal.navSidebarAria', 'Điều hướng mục Series Bible')}
            className='space-y-4 xl:sticky xl:top-5'
            data-testid='bible-workbench-sidebar'
          >
            {siblings.length > 1 && onSelectEntity && (
              <nav
                className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl shadow-xs p-2'
                aria-label={t('bible.detailModal.navSameCategoryAria', 'Mục cùng danh mục')}
              >
                <p className='px-2.5 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500'>
                  {t(
                    'bible.detailModal.sameCategoryTitle',
                    { count: siblings.length },
                    `Cùng danh mục · ${siblings.length}`,
                  )}
                </p>
                <SidebarSection className='max-h-64 overflow-y-auto space-y-0.5'>
                  <ul>
                    {siblings.map((e) => {
                      const isActive = e.id === entity.id;
                      return (
                        <li key={e.id}>
                          <button
                            type='button'
                            onClick={() => !isActive && onSelectEntity(e)}
                            aria-current={isActive ? 'true' : undefined}
                            className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center gap-2 border-l-4 transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-stone-100 border-stone-500 text-stone-800'
                                : 'border-transparent text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <span className='font-mono text-xs text-stone-500 shrink-0'>
                              {e.code}
                            </span>
                            <span className='text-sm font-medium truncate flex-1'>{e.name}</span>
                            {e.isLocked && (
                              <Lock
                                className='w-3.5 h-3.5 text-emerald-600 shrink-0'
                                aria-label={t('bible.detailModal.canonLockedAria', 'Đã khoá Canon')}
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </SidebarSection>
              </nav>
            )}

            <section className='space-y-3' data-testid='variant-selector'>
              <div className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3'>
                <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                  <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                    <Layers className='w-4 h-4 text-stone-500' />
                    <span>{t('bible.detailModal.variantsTitle', 'Biến thể thiết kế')}</span>
                  </div>
                  <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 whitespace-nowrap'>
                    {t(
                      'bible.detailModal.variantCount',
                      { count: variants.length },
                      `${variants.length} biến thể`,
                    )}
                  </span>
                </div>

                {/* Vertical list of variants */}
                <div className='space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-0.5'>
                  {variants.map((variant) => {
                    const vLabel = variant.variantLabel || 'Mặc định';
                    const isActive = selectedVariantKey === variant.variantKey;
                    const isDefaultVariant =
                      vLabel.toLowerCase().includes('chuẩn') ||
                      vLabel.toLowerCase().includes('mặc định');
                    const variantIcon = isDefaultVariant
                      ? null
                      : getVariantIcon(vLabel, entity.category);
                    return (
                      <div
                        key={variant.variantKey}
                        onClick={() => {
                          setSelectedVariantKey(variant.variantKey);
                          setSelectedVersionId(null);
                        }}
                        data-testid={`variant-tab-${variant.variantKey}`}
                        className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          isActive
                            ? 'bg-stone-100 text-stone-900 border-stone-400 ring-1 ring-stone-400/30'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50/60'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-1.5'>
                          <div className='flex items-center gap-1.5 min-w-0 font-semibold text-xs sm:text-sm'>
                            {variantIcon && <span>{variantIcon}</span>}
                            <span className='truncate'>{variant.variantLabel}</span>
                          </div>
                          {variant.isLocked ? (
                            <span className='text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0'>
                              {t('bible.detailModal.officialBadge', 'Chính thức')}
                            </span>
                          ) : (
                            <span className='text-xs font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0'>
                              {t('bible.detailModal.draftBadge', 'Bản nháp')}
                            </span>
                          )}
                        </div>

                        <div className='text-xs text-stone-500'>
                          <span>
                            {t(
                              'bible.detailModal.revisionCount',
                              { count: variant.revisions.length },
                              `${variant.revisions.length} phiên bản`,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom quick-create variant action */}
                {effectiveCanCreateDraft && !isStubEntity && (
                  <button
                    type='button'
                    onClick={() => {
                      onOpenAddRevision(entity, null, false, undefined, false, true);
                    }}
                    data-testid='add-new-variant-btn'
                    className='w-full py-2 border-2 border-dashed border-stone-300 hover:border-stone-400 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer'
                    title={t(
                      'bible.detailModal.createNewVariantTitle',
                      'Thêm biến thể thiết kế mới',
                    )}
                  >
                    <Plus className='w-4 h-4' />
                    <span>{t('bible.detailModal.createNewVariant', 'Tạo biến thể mới')}</span>
                  </button>
                )}
              </div>
            </section>

            {seriesId && (
              <section
                className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl shadow-xs p-4 space-y-2.5'
                data-testid='bible-usages'
              >
                <p className='text-sm font-bold text-stone-900 flex items-center gap-1.5'>
                  <FileText className='w-4 h-4 text-stone-500' />
                  {t('bible.detailModal.scriptAppearances', 'Xuất hiện trong kịch bản')}
                </p>
                {usages === null ? (
                  <p className='text-xs text-stone-500'>{t('common.loading', 'Đang tải…')}</p>
                ) : usages === 'error' ? (
                  <p className='text-xs text-rose-700'>
                    {t('bible.detailModal.loadUsagesError', 'Không tải được danh sách chương.')}
                  </p>
                ) : usages.length === 0 ? (
                  <p className='text-xs text-stone-500'>
                    {t(
                      'bible.detailModal.noUsagesFound',
                      'Chưa được @Tag hay làm người nói trong kịch bản nào.',
                    )}
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {usages.map((u) => (
                      <li
                        key={u.chapterId}
                        className='rounded-lg border border-stone-200/70 bg-stone-50/60 p-2.5 space-y-1.5'
                      >
                        <span className='block min-w-0'>
                          <span className='font-mono text-xs text-stone-500 mr-1.5'>
                            Ch.{u.chapterNumber}
                          </span>
                          <span className='text-sm font-medium text-stone-800 break-words'>
                            {u.chapterTitle ||
                              t('bible.detailModal.untitledChapter', 'Chưa đặt tên')}
                          </span>
                          <span className='block text-xs text-stone-500'>
                            {t(
                              'bible.detailModal.lineCount',
                              { count: u.lineCount },
                              `${u.lineCount} dòng kịch bản`,
                            )}
                            {u.isScriptFrozen
                              ? t('bible.detailModal.scriptFrozen', ' · đã chốt kịch bản')
                              : ''}
                          </span>
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            u.isCanonSatisfied
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {u.isCanonSatisfied
                            ? t('bible.detailModal.canonSatisfied', 'Đạt Canon')
                            : isVisualDesign
                              ? t('bible.detailModal.notCanonLocked', 'Chưa khoá Canon')
                              : t('bible.detailModal.noEffectiveVersion', 'Chưa có bản hiệu lực')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {Array.isArray(usages) &&
                  usages.some((u) => !u.isCanonSatisfied && !u.isScriptFrozen) && (
                    <p className='text-xs text-rose-700 border-t border-stone-100 pt-2'>
                      {t(
                        'bible.detailModal.gate1Warning',
                        'Chương chưa đạt sẽ bị chặn ở Gate 1 khi Producer chốt kịch bản (BR-21).',
                      )}
                    </p>
                  )}
              </section>
            )}
            {/* CARD 2: PHIÊN BẢN & NHẬT KÝ SỬA ĐỔI (VERSION & AUDIT TRAIL GỘP CHUNG) */}
            <div className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-1.5'>
                  <History className='w-4 h-4 text-stone-500' />
                  <span>{t('bible.detailModal.versionsAndAudit', 'Phiên bản & Nhật ký')}</span>
                </div>
                <button
                  type='button'
                  onClick={() => onOpenHistory(entity)}
                  className='text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md border border-stone-200 hover:bg-stone-50 transition cursor-pointer'
                >
                  {t('bible.detailModal.historyQuickBtn', 'Lịch sử')}
                </button>
              </div>

              {/* Version list */}
              <div className='space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5'>
                {activeVariant?.revisions && activeVariant.revisions.length > 0 ? (
                  activeVariant.revisions.map((rev) => {
                    const isSelected = rev.id === activeRevision?.id;
                    const isCanon = rev.reviewStatus === 'CanonLocked';
                    return (
                      <div
                        key={rev.id}
                        onClick={() => setSelectedVersionId(rev.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-stone-100 border-stone-400 shadow-2xs font-semibold'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='font-mono font-bold text-stone-800'>
                            v{rev.versionNumber}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${
                              isCanon
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                                : rev.reviewStatus === 'ConceptSubmitted'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : rev.reviewStatus === 'ReworkRequired'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {isCanon
                              ? t('bible.detailModal.officialBadge', 'Chính thức')
                              : rev.reviewStatus === 'ConceptSubmitted'
                                ? t('bible.detailModal.pendingReview', 'Chờ thẩm định')
                                : rev.reviewStatus === 'ReworkRequired'
                                  ? t('bible.detailModal.stepRework', 'Yêu cầu sửa')
                                  : t('bible.detailModal.draftBadge', 'Bản nháp')}
                          </span>
                        </div>
                        <span className='text-xs text-stone-400 font-mono'>
                          {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className='p-2 text-center text-xs text-stone-400 italic'>
                    {t('bible.detailModal.noRevisions', 'Chưa có phiên bản')}
                  </div>
                )}
              </div>

              {/* Active Version Immutability & Action */}
              {activeRevision?.reviewStatus === 'CanonLocked' && (
                <div className='p-2.5 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-1.5 text-xs'>
                  <div className='flex items-center justify-between'>
                    <span className='font-bold text-stone-800 flex items-center gap-1.5'>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeRevision?.reviewStatus === 'CanonLocked'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      v{activeRevision?.versionNumber ?? 1} (
                      {activeRevision?.reviewStatus === 'CanonLocked'
                        ? t('bible.detailModal.officialBadge', 'Chính thức')
                        : activeRevision?.reviewStatus === 'ConceptSubmitted'
                          ? t('bible.detailModal.pendingReview', 'Chờ thẩm định')
                          : activeRevision?.reviewStatus === 'ReworkRequired'
                            ? t('bible.detailModal.stepRework', 'Yêu cầu sửa')
                            : t('bible.detailModal.draftBadge', 'Bản nháp')}
                      )
                    </span>
                    <span className='text-xs text-stone-500 font-medium'>
                      {activeRevision?.reviewStatus === 'CanonLocked'
                        ? t('bible.detailModal.immutable', 'Bất biến')
                        : t('bible.detailModal.editable', 'Có thể chỉnh sửa')}
                    </span>
                  </div>

                  {activeRevision?.reviewStatus === 'CanonLocked' &&
                    effectiveCanCreateDraft &&
                    !isStubEntity && (
                      <button
                        type='button'
                        onClick={() => onOpenAddRevision(entity, activeRevision)}
                        className='w-full py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-semibold text-xs rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-1'
                        title={t(
                          'bible.detailModal.supersedeLockedTitle',
                          'Tạo phiên bản kế thừa tiếp theo mà không ghi đè bản gốc đã khóa chuẩn',
                        )}
                      >
                        <Plus className='w-3 h-3' />
                        <span>
                          {t(
                            'bible.detailModal.supersedeLockedBtn',
                            'Thay thế bản khóa (Supersede)',
                          )}
                        </span>
                      </button>
                    )}
                </div>
              )}

              {/* AUDIT TRAIL GỘP TRỰC TIẾP VÀO VERSION CARD */}
              <div className='space-y-2 pt-2 border-t border-stone-200/80'>
                <div className='font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center justify-between'>
                  <span>{t('bible.detailModal.changeHistoryTitle', 'Lịch sử thay đổi')}</span>
                  <span className='text-xs font-normal text-stone-400'>
                    {t(
                      'bible.detailModal.eventCount',
                      { count: auditLogs.length },
                      `${auditLogs.length} sự kiện`,
                    )}
                  </span>
                </div>

                <div className='space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5 text-xs'>
                  {auditLogs.map((log, i) => (
                    <div
                      key={i}
                      className='p-1.5 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-between gap-1 text-xs'
                    >
                      <div className='truncate min-w-0'>
                        <strong className='text-stone-900'>{log.actor}</strong>{' '}
                        <span className='text-stone-600'>{log.action}</span>
                      </div>
                      <span className='text-xs text-stone-400 shrink-0 font-medium'>
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSidebar>

          {/* ================= MAIN: trạng thái · Đặc tả | Bản vẽ · Phiên bản ================= */}
          <div className='min-w-0 space-y-4'>
            {/* ================= SINGLE CONTEXTUAL STATUS ALERT (LUCIAN INLINE ALERT) ================= */}
            {isStubEntity ? (
              <Alert
                tone='warning'
                title={t('bible.defineStub.detailAlertTitle', 'Thực thể chưa được định nghĩa')}
              >
                {canDefineStub
                  ? t(
                      'bible.defineStub.detailAlertDescWriter',
                      'Mục này được tự động tạo từ kịch bản. Hãy bấm "Định nghĩa" để bổ sung mô tả đặc tả trước khi thiết kế.',
                    )
                  : t(
                      'bible.defineStub.detailAlertDescReadOnly',
                      'Mục này được tự động tạo từ kịch bản và đang chờ Biên kịch (Writer) định nghĩa mô tả.',
                    )}
              </Alert>
            ) : activeRevision?.reviewStatus === 'ReworkRequired' ? (
              <Alert
                tone='warning'
                title={t(
                  'bible.detailModal.reworkAlertTitle',
                  'Yêu cầu chỉnh sửa bản vẽ từ Writer / Editor',
                )}
              >
                {activeRevision.reworkFeedback ||
                  t(
                    'bible.detailModal.reworkAlertDefault',
                    'Writer yêu cầu chỉnh sửa lại thiết kế cho giai đoạn này.',
                  )}{' '}
                {t(
                  'bible.detailModal.reworkAlertDetails',
                  {
                    variant:
                      activeVariant?.variantLabel ||
                      t('bible.detailModal.defaultVariant', 'Mặc định'),
                  },
                  `Biến thể: "${activeVariant?.variantLabel || t('bible.detailModal.defaultVariant', 'Mặc định')}". Chỉnh sửa nét vẽ và nộp lại.`,
                )}
              </Alert>
            ) : activeRevision?.reviewStatus === 'ConceptSubmitted' ? (
              <Alert
                tone='info'
                title={t(
                  'bible.detailModal.submittedAlertTitle',
                  'Bản vẽ Model Sheet đã nộp – Đang chờ kiểm duyệt',
                )}
              >
                {t(
                  'bible.detailModal.submittedAlertDesc',
                  'Bản thiết kế đang chờ duyệt. Có thể nộp lại bản vẽ mới bất kỳ lúc nào trước khi duyệt.',
                )}{' '}
                {t(
                  'bible.detailModal.submittedAlertDetails',
                  {
                    variant: activeVariant?.variantLabel || 'Mặc định',
                    version: activeRevision.versionNumber,
                  },
                  `Biến thể: "${activeVariant?.variantLabel || 'Mặc định'}" · Lần sửa #${activeRevision.versionNumber}.`,
                )}
              </Alert>
            ) : activeRevision?.reviewStatus === 'CanonLocked' ? (
              <Alert
                tone='success'
                title={t('bible.detailModal.canonLockedBadge', 'Đã khóa chuẩn (Canon Locked)')}
              >
                <div className='space-y-1 flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    {activeVariant?.variantLabel && (
                      <span className='text-xs font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/60'>
                        {activeVariant.variantLabel}
                      </span>
                    )}
                    <span className='font-mono font-bold text-xs bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded'>
                      {t(
                        'bible.detailModal.revisionNumber',
                        { number: activeRevision.versionNumber },
                        `Lần sửa #${activeRevision.versionNumber}`,
                      )}
                    </span>
                    {activeRevision.lockedAt && (
                      <span className='text-xs font-medium text-amber-800'>
                        {t(
                          'bible.detailModal.approvedAt',
                          { date: new Date(activeRevision.lockedAt).toLocaleDateString('vi-VN') },
                          `• Đã duyệt ${new Date(activeRevision.lockedAt).toLocaleDateString('vi-VN')}`,
                        )}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-amber-900/90 leading-relaxed'>
                    {t(
                      'bible.detailModal.canonLockedDesc',
                      'Bản thiết kế cho giai đoạn này đã được Editor xác nhận chính thức (Canon Locked). Toàn bộ đội ngũ sản xuất sử dụng bản vẽ này làm quy chuẩn tham chiếu thống nhất.',
                    )}
                  </p>
                </div>
              </Alert>
            ) : null}

            <div
              className={`grid grid-cols-1 gap-4 items-start ${isVisualDesign ? 'lg:grid-cols-2' : ''}`}
            >
              <section className='min-w-0' data-testid='bible-spec-column'>
                {/* CARD 1: THÔNG TIN ĐẶC TẢ THU GỌN (METADATA SPECS) */}
                <div className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3'>
                  <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                    <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-1.5'>
                      <FileText className='w-4 h-4 text-stone-500' />
                      <span>{card1Title}</span>
                      <span
                        className='px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-mono font-medium'
                        title={t(
                          'bible.detailModal.specFilledCountTitle',
                          'Số trường đặc tả đã điền',
                        )}
                        data-testid='spec-completeness'
                      >
                        {specProgress.filled}/{specProgress.total}
                      </span>
                    </div>
                  </div>

                  <div className='space-y-5'>
                    {SPEC_SCHEMA[normalizedCategory].map((group) => {
                      const rows = group.fields.map((field) => ({
                        field,
                        value: String(variantAttributes.raw[field.key] ?? '').trim(),
                      }));
                      const filled = rows.filter((r) => r.value);
                      const empty = rows.filter((r) => !r.value);
                      return (
                        <div key={group.title} className='space-y-2'>
                          <div className='flex items-center gap-2'>
                            <p className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                              {group.title}
                            </p>
                            <span className='h-px flex-1 bg-stone-200' aria-hidden='true' />
                            <span className='text-xs font-mono text-stone-400'>
                              {filled.length}/{rows.length}
                            </span>
                          </div>
                          {filled.length > 0 && (
                            <dl className='space-y-1.5'>
                              {filled.map(({ field, value }) => {
                                const isForbidden = field.key === 'forbidden';
                                return (
                                  <div
                                    key={field.key}
                                    className={`grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1 items-center min-h-[52px] px-3 py-2 rounded-lg ${
                                      isForbidden
                                        ? 'bg-rose-50 border border-rose-200'
                                        : 'bg-stone-50'
                                    }`}
                                  >
                                    <dt className='text-xs font-medium text-stone-500'>
                                      {field.label}
                                    </dt>
                                    {editingSpecKeys.has(field.key) ? (
                                      <dd>
                                        {(() => {
                                          const props = {
                                            id: `spec-input-${field.key}`,
                                            'data-testid': `spec-input-${field.key}`,
                                            autoFocus: true,
                                            disabled: savingSpec,
                                            value: specDraft[field.key] ?? value,
                                            onChange: (
                                              e: React.ChangeEvent<
                                                HTMLInputElement | HTMLTextAreaElement
                                              >,
                                            ) =>
                                              setSpecDraft((prev) => ({
                                                ...prev,
                                                [field.key]: e.target.value,
                                              })),
                                            className:
                                              'w-full px-3 py-1.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-400/20 transition disabled:opacity-60',
                                          };
                                          return field.multiline ? (
                                            <textarea {...props} rows={2} />
                                          ) : (
                                            <input {...props} type='text' />
                                          );
                                        })()}
                                      </dd>
                                    ) : (
                                      <dd className='flex items-center justify-between gap-2'>
                                        <span
                                          className={`text-sm font-medium whitespace-pre-line ${
                                            isForbidden ? 'text-rose-800' : 'text-stone-900'
                                          }`}
                                        >
                                          {value}
                                        </span>
                                        {canInlineEditSpec && (
                                          <button
                                            type='button'
                                            onClick={() =>
                                              setEditingSpecKeys((prev) =>
                                                new Set(prev).add(field.key),
                                              )
                                            }
                                            data-testid={`spec-edit-${field.key}`}
                                            className='shrink-0 p-1 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer'
                                            title={t('bible.detailModal.editSpecBtn', 'Sửa')}
                                            aria-label={`${t('bible.detailModal.editSpecBtn', 'Sửa')} ${field.label}`}
                                          >
                                            <Edit3 className='w-3.5 h-3.5' />
                                          </button>
                                        )}
                                      </dd>
                                    )}
                                  </div>
                                );
                              })}
                            </dl>
                          )}
                          {empty.length > 0 &&
                            (canInlineEditSpec ? (
                              <div className='space-y-1.5'>
                                {empty.map(({ field }) => {
                                  const inputId = `spec-input-${field.key}`;
                                  const common = {
                                    id: inputId,
                                    value: specDraft[field.key] ?? '',
                                    disabled: savingSpec,
                                    placeholder: field.placeholder || field.label,
                                    'data-testid': inputId,
                                    className:
                                      'w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg placeholder:text-stone-400 hover:border-stone-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 transition disabled:opacity-60',
                                  };
                                  const onChange = (
                                    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                  ) =>
                                    setSpecDraft((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }));
                                  return (
                                    <div
                                      key={field.key}
                                      className='grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1 items-center min-h-[52px] px-3 py-2 rounded-lg bg-stone-50'
                                    >
                                      <label
                                        htmlFor={inputId}
                                        className='text-xs font-medium text-stone-500'
                                      >
                                        {field.label}
                                      </label>
                                      {field.multiline ? (
                                        <textarea {...common} rows={2} onChange={onChange} />
                                      ) : (
                                        <input
                                          {...common}
                                          type='text'
                                          onChange={onChange}
                                          onKeyDown={(e) => {
                                            if (e.key !== 'Enter' || e.nativeEvent.isComposing)
                                              return;
                                            e.preventDefault();
                                            void handleSaveSpecDraft();
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className='flex flex-wrap items-center gap-1.5'>
                                <span className='text-xs text-stone-400'>
                                  {t('bible.detailModal.notConfigured', 'Chưa thiết lập')}
                                </span>
                                {empty.map(({ field }) => (
                                  <span
                                    key={field.key}
                                    className='px-2 py-0.5 rounded-full border border-dashed border-stone-300 text-xs text-stone-500'
                                  >
                                    {field.label}
                                  </span>
                                ))}
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                  {canInlineEditSpec && specDraftDirty && (
                    <div className='sticky bottom-3 flex items-center justify-end gap-2 pt-3 border-t border-stone-200/80 bg-white'>
                      <button
                        type='button'
                        disabled={savingSpec}
                        onClick={() => setSpecDraft({})}
                        className='px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50'
                      >
                        {t('bible.detailModal.cancelSpecEdit', 'Huỷ')}
                      </button>
                      <button
                        type='button'
                        disabled={savingSpec}
                        onClick={() => void handleSaveSpecDraft()}
                        data-testid='save-spec-inline-btn'
                        className='px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5'
                      >
                        <Check className='w-3.5 h-3.5' />
                        {savingSpec
                          ? t('bible.detailModal.savingSpec', 'Đang lưu…')
                          : t('bible.detailModal.saveSpec', 'Lưu đặc tả')}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {isVisualDesign && (
                <section className='min-w-0 space-y-3.5' data-testid='bible-artwork-column'>
                  {SPEC_DELIVERABLES[normalizedCategory] && (
                    <div className='bg-amber-50/60 border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm text-amber-900 flex items-center gap-2 flex-wrap'>
                      <span className='font-semibold'>
                        {t('bible.detailModal.artistMustSubmit', 'Artist cần nộp:')}
                      </span>
                      {SPEC_DELIVERABLES[normalizedCategory]!.map((d) => (
                        <span
                          key={d}
                          className='px-2 py-0.5 rounded-full bg-white border border-amber-200 text-xs font-medium'
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className='bg-[#FDFCFA] border border-[#E7E2D6] rounded-xl p-4 sm:p-5 shadow-xs space-y-3'>
                    {/* Artwork Header: Tab Turnaround vs Action / Expressions + Zoom button */}
                    <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <Palette className='w-4 h-4 text-stone-500 shrink-0' />
                        <span className='font-bold text-xs sm:text-sm text-[#1C1917] truncate'>
                          {visualCardInfo.title}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-300`}
                        >
                          {visualCardInfo.badge}
                        </span>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <div className='flex bg-stone-100 p-0.5 rounded-xl border border-stone-200'>
                          <button
                            type='button'
                            onClick={() => setActiveArtTab('turnaround')}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                              activeArtTab === 'turnaround'
                                ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                                : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            {visualCardInfo.tab1}
                          </button>
                          <button
                            type='button'
                            onClick={() => setActiveArtTab('action')}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                              activeArtTab === 'action'
                                ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                                : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            {visualCardInfo.tab2}
                          </button>
                        </div>

                        {selectedImageUrl && (
                          <button
                            type='button'
                            onClick={() =>
                              onZoomImage({
                                url: selectedImageUrl,
                                title: selectedImageTitle || entity.name,
                              })
                            }
                            className='p-1.5 rounded-lg border border-stone-200 hover:bg-white text-stone-600 hover:text-stone-900 transition shadow-2xs cursor-pointer'
                            title={t('bible.detailModal.zoomImageTitle', 'Phóng to ảnh')}
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hero Canvas Viewport (To, Rõ Ràng, Nổi Bật) */}
                    {selectedImageUrl ? (
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                          <span className='truncate max-w-[280px] text-xs font-bold text-[#1C1917]'>
                            {selectedImageTitle || `${entity.name} - Model Sheet`}
                          </span>
                          <span className='text-xs text-stone-400 font-mono'>
                            Turnaround / Model Sheet Canvas
                          </span>
                        </div>
                        <div
                          className='relative w-full h-[480px] sm:h-[520px] md:h-[560px] bg-[#121214] rounded-2xl overflow-hidden border border-stone-800 cursor-pointer group flex items-center justify-center p-3 shadow-inner'
                          onClick={() =>
                            onZoomImage({
                              url: selectedImageUrl,
                              title: selectedImageTitle || entity.name,
                            })
                          }
                        >
                          <AuthenticatedImage
                            src={selectedImageUrl}
                            alt={selectedImageTitle || entity.name}
                            className='w-full h-full object-contain drop-shadow-md'
                          />
                          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]'>
                            <Eye className='w-4 h-4' />
                            <span>
                              {t('bible.detailModal.zoomToViewFull', 'Bấm để phóng to xem đầy đủ')}
                            </span>
                          </div>
                        </div>

                        {/* Character Sheet Gallery Strip */}
                        {entity.gallery && entity.gallery.length > 0 && (
                          <div className='space-y-1.5 pt-2 border-t border-stone-200/80'>
                            <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                              <span>
                                {t(
                                  'bible.detailModal.anglesAndExpressions',
                                  { count: entity.gallery.length },
                                  `Góc nhìn & Biểu cảm (${entity.gallery.length}):`,
                                )}
                              </span>
                              <span className='text-xs text-stone-500'>
                                {t('bible.detailModal.clickToChangeAngle', 'Bấm để đổi góc xem')}
                              </span>
                            </div>
                            <div className='flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar'>
                              {entity.imageUrl && (
                                <button
                                  type='button'
                                  onClick={() => {
                                    setSelectedImageUrl(entity.imageUrl!);
                                    setSelectedImageTitle(
                                      `${entity.name} - ${t('bible.detailModal.frontView', 'Mặt chính diện')}`,
                                    );
                                  }}
                                  className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                    selectedImageUrl === entity.imageUrl
                                      ? 'border-stone-400 bg-stone-100 ring-1 ring-stone-400/30'
                                      : 'border-stone-200 hover:border-stone-300 bg-white'
                                  }`}
                                >
                                  <div className='w-8 h-8 rounded overflow-hidden shrink-0'>
                                    <AuthenticatedImage
                                      src={entity.imageUrl}
                                      alt={entity.name}
                                      className='w-full h-full object-cover'
                                    />
                                  </div>
                                  <span className='text-xs font-medium text-stone-800'>
                                    {t('bible.detailModal.frontView', 'Mặt chính diện')}
                                  </span>
                                </button>
                              )}
                              {entity.gallery.map((img, i) => (
                                <button
                                  key={i}
                                  type='button'
                                  onClick={() => {
                                    setSelectedImageUrl(img.url);
                                    setSelectedImageTitle(
                                      `${entity.name} - ${img.label || t('bible.detailModal.angleNumber', { number: i + 1 }, `Góc ${i + 1}`)}`,
                                    );
                                  }}
                                  className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                    selectedImageUrl === img.url
                                      ? 'border-stone-400 bg-stone-100 ring-1 ring-stone-400/30'
                                      : 'border-stone-200 hover:border-stone-300 bg-white'
                                  }`}
                                >
                                  <div className='w-8 h-8 rounded overflow-hidden shrink-0'>
                                    <AuthenticatedImage
                                      src={img.url}
                                      alt={img.label || `${entity.name} góc ${i + 1}`}
                                      className='w-full h-full object-cover'
                                    />
                                  </div>
                                  <span className='text-xs font-medium text-stone-800'>
                                    {img.label ||
                                      t(
                                        'bible.detailModal.angleNumber',
                                        { number: i + 1 },
                                        `Góc ${i + 1}`,
                                      )}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (effectiveCanCreateDraft && !isStubEntity) setIsDraggingOver(true);
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          if (effectiveCanCreateDraft && !isStubEntity) {
                            onOpenAddRevision(entity, activeRevision);
                          }
                        }}
                        className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3.5 text-center min-h-[300px] group ${
                          isDraggingOver
                            ? 'border-stone-400 bg-stone-100 shadow-inner ring-4 ring-stone-400/30'
                            : 'border-stone-300 hover:border-stone-400 bg-stone-50/60 hover:bg-stone-100'
                        }`}
                      >
                        <div className='w-14 h-14 rounded-2xl bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-500 group-hover:scale-105 group-hover:bg-stone-700 group-hover:text-white transition-all shadow-2xs'>
                          <Upload className='w-7 h-7' />
                        </div>
                        <div className='max-w-md space-y-1.5'>
                          <div className='text-sm sm:text-base font-bold text-stone-900'>
                            {t(
                              'bible.detailModal.noReferenceImage',
                              'Chưa có ảnh Reference Sheet cho mục này',
                            )}
                          </div>
                          <p className='text-xs text-stone-500 leading-relaxed'>
                            {isArtistUser
                              ? visualCardInfo.emptyArtistPrompt
                              : visualCardInfo.emptyWriterPrompt}
                          </p>
                        </div>
                        {effectiveCanCreateDraft && !isStubEntity && (
                          <div className='flex flex-col items-center gap-2 pt-2'>
                            <button
                              type='button'
                              onClick={() => {
                                onOpenAddRevision(entity, activeRevision);
                              }}
                              className='inline-flex items-center gap-2 px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]'
                              title={t(
                                'bible.detailModal.uploadModelSheetTitle',
                                'Tải lên bản vẽ tham chiếu Model Sheet mới',
                              )}
                            >
                              <Upload className='w-4 h-4' />
                              <span>
                                {t('bible.detailModal.uploadModelSheet', 'Tải lên Model Sheet')}
                              </span>
                            </button>
                            <div className='flex items-center gap-1.5 text-xs text-stone-400'>
                              <span>
                                {t(
                                  'bible.detailModal.dragDropOrPaste',
                                  'Kéo thả file ảnh vào đây hoặc nhấn',
                                )}
                              </span>
                              <kbd className='px-1.5 py-0.5 bg-stone-200/80 border border-stone-300 rounded font-mono text-xs text-stone-700 font-semibold'>
                                Ctrl + V
                              </kbd>
                              <span>{t('bible.detailModal.toPaste', 'để dán')}</span>
                            </div>
                            <button
                              type='button'
                              onClick={() => {
                                onOpenAddRevision(entity);
                              }}
                              className='inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 transition-colors cursor-pointer mt-0.5'
                            >
                              <Edit3 className='w-3 h-3 text-stone-500' />
                              <span>
                                {isWriterUser
                                  ? t(
                                      'bible.detailModal.editSpecOrNewVerWriter',
                                      'Chỉnh sửa đặc tả / Cập nhật kịch bản',
                                    )
                                  : t(
                                      'bible.detailModal.editSpecOrNewVerArtist',
                                      'Tạo phiên bản mới để thêm ảnh',
                                    )}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROLE ACTIONS BAR (FOCUSED & MINIMAL) */}
                    <div className='pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
                      {/* Status indicator on the left of action bar */}
                      <div className='text-xs text-stone-500 flex items-center gap-1.5'>
                        {!selectedImageUrl ? (
                          <span className='inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'>
                            <Clock className='w-3 h-3 text-amber-600' />
                            {t(
                              'bible.detailModal.waitingArtistUpload',
                              'Chờ Họa sĩ tải lên bản vẽ',
                            )}
                          </span>
                        ) : activeRevision?.reviewStatus === 'CanonLocked' ? (
                          <span className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200'>
                            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                            {t('bible.detailModal.canonLockedOfficial', 'Đã khoá Canon chính thức')}
                          </span>
                        ) : activeRevision?.reviewStatus === 'Draft' ? (
                          <span className='inline-flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200'>
                            {t('bible.detailModal.draftUnsubmitted', 'Bản thảo (Chưa nộp duyệt)')}
                          </span>
                        ) : activeRevision?.reviewStatus === 'ConceptSubmitted' ? (
                          <span className='inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse'>
                            {t(
                              'bible.detailModal.waitingEditorConfirm',
                              '● Chờ Editor xác nhận & khoá Canon',
                            )}
                          </span>
                        ) : activeRevision?.reviewStatus === 'ReworkRequired' ? (
                          <span className='inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200'>
                            {t('bible.detailModal.reworkRequested', '↺ Yêu cầu vẽ lại')}
                          </span>
                        ) : null}
                      </div>

                      <div className='flex items-center gap-2 flex-wrap ml-auto'>
                        {/* Artist Actions */}
                        {isArtistUser && (
                          <>
                            {activeRevision?.reviewStatus === 'ConceptSubmitted' && (
                              <button
                                type='button'
                                onClick={() => {
                                  onOpenAddRevision(entity, null, true, undefined, true);
                                }}
                                className='px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                                data-testid='detail-artist-resubmit-btn'
                              >
                                <RotateCcw className='w-3.5 h-3.5' />
                                <span>
                                  {t('bible.detailModal.artistResubmitBtn', '🔄 Nộp lại bản vẽ')}
                                </span>
                              </button>
                            )}
                            {activeRevision?.reviewStatus === 'ReworkRequired' && (
                              <button
                                type='button'
                                onClick={() => {
                                  onOpenAddRevision(
                                    entity,
                                    null,
                                    true,
                                    activeRevision.reworkFeedback || undefined,
                                    false,
                                  );
                                }}
                                className='px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                                data-testid='detail-artist-rework-btn'
                              >
                                <RotateCcw className='w-3.5 h-3.5' />
                                <span>
                                  {t('bible.detailModal.artistReworkBtn', 'Nộp bản vẽ sửa đổi')}
                                </span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Editor Confirm (= Lock Canon) Action per Q20/Q22 */}
                        {isEditorUser &&
                          !isProducerUser &&
                          (entity.isVisualDesign ?? (isCharacter || isLocation || isProp)) &&
                          activeRevision &&
                          activeRevision.reviewStatus !== 'CanonLocked' && (
                            <button
                              type='button'
                              disabled={
                                isLocking || activeRevision.reviewStatus === 'ReworkRequired'
                              }
                              onClick={() => void handleLock(activeRevision)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                                activeRevision.reviewStatus === 'ReworkRequired'
                                  ? 'bg-stone-200 text-stone-500 cursor-not-allowed opacity-60'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]'
                              }`}
                              title={
                                activeRevision.reviewStatus === 'ReworkRequired'
                                  ? t(
                                      'bible.detailModal.confirmAndLockReworkWarning',
                                      'Bản vẽ đang bị yêu cầu vẽ lại; cần Artist nộp lại concept trước khi duyệt',
                                    )
                                  : t(
                                      'bible.detailModal.confirmAndLockTitle',
                                      'Xác nhận thiết kế và khoá Canon',
                                    )
                              }
                              data-testid='detail-confirm-btn'
                            >
                              <span className='inline-flex items-center gap-1.5'>
                                <CheckCircle2 className='w-3.5 h-3.5' />
                                <span>
                                  {isLocking
                                    ? t('bible.detailModal.confirmingLock', 'Đang xác nhận...')
                                    : t(
                                        'bible.detailModal.confirmAndLockBtn',
                                        'Xác nhận & khoá Canon',
                                      )}
                                </span>
                              </span>
                            </button>
                          )}

                        {/* Request Rework Action (Writer + Editor + Producer per Q22) */}
                        {canRequestRework && activeRevision && (
                          <button
                            type='button'
                            disabled={activeRevision.reviewStatus === 'CanonLocked' || isLocking}
                            onClick={() => handleRequestRework(activeRevision)}
                            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all ${
                              activeRevision.reviewStatus === 'CanonLocked'
                                ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-50'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-[0.98]'
                            }`}
                            title={
                              activeRevision.reviewStatus === 'CanonLocked'
                                ? t(
                                    'bible.detailModal.reworkLockedNotice',
                                    'Phiên bản này đã khoá Canon, không thể yêu cầu vẽ lại.',
                                  )
                                : t(
                                    'bible.detailModal.requestArtistRework',
                                    'Yêu cầu Artist chỉnh sửa lại bản vẽ',
                                  )
                            }
                            data-testid='detail-rework-btn'
                          >
                            <Palette className='w-3.5 h-3.5 text-rose-600' />
                            <span>
                              {t('bible.detailModal.reworkArtworkBtn', 'Yêu cầu vẽ lại Artwork')}
                            </span>
                          </button>
                        )}

                        {/* Request Info Changes (Editor + Producer) */}
                        {(isEditorUser || canEndorse || isProducerUser) && (
                          <button
                            type='button'
                            disabled={isLocking}
                            onClick={() => {
                              setRequestInfoField('Mô tả đặc tả');
                              setRequestInfoNote('');
                              setIsRequestInfoOpen(true);
                            }}
                            className='px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer active:scale-[0.98]'
                            title='Yêu cầu Biên kịch (Writer) chỉnh sửa hoặc bổ sung các trường thông tin đặc tả'
                            data-testid='detail-request-info-btn'
                          >
                            <Edit3 className='w-3.5 h-3.5 text-amber-700' />
                            <span>
                              {t('bible.detailModal.requestInfoBtn', 'Yêu cầu sửa thông tin')}
                            </span>
                          </button>
                        )}

                        {/* Canon locked status badge */}
                        {(activeRevision?.reviewStatus === 'CanonLocked' ||
                          !(entity.isVisualDesign ?? isCharacter)) && (
                          <div className='px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-1.5'>
                            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                            <span>
                              {t(
                                'bible.detailModal.referenceForCategory',
                                { category: getCategoryLabel(entity.category) },
                                `Tham chiếu ${getCategoryLabel(entity.category)}`,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CONCEPT REVIEW: VERSIONS LIST (BIB-10 FE) */}
                    {conceptVersions.length > 0 && (
                      <div
                        className='mt-4 pt-3 border-t border-stone-200/80 space-y-2'
                        data-testid='concept-versions-list'
                      >
                        <div className='flex items-center justify-between text-xs font-bold text-stone-700'>
                          <div className='flex items-center gap-1.5'>
                            <History className='w-3.5 h-3.5 text-stone-500' />
                            <span>
                              {t(
                                'bible.detailModal.conceptSubmissions',
                                { count: conceptVersions.length },
                                `Các bản nộp Concept Art (${conceptVersions.length})`,
                              )}
                            </span>
                          </div>
                          <span className='text-stone-400 font-normal'>
                            {t(
                              'bible.detailModal.clickToReviewSubmissions',
                              'Nhấn để xem lại từng bản nộp',
                            )}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar'>
                          {conceptVersions.map((evt, idx) => {
                            const verNum = evt.conceptVersionNumber ?? idx + 1;
                            const isSelected =
                              selectedConceptEventId === evt.id ||
                              (!selectedConceptEventId && idx === conceptVersions.length - 1);
                            return (
                              <button
                                key={evt.id || idx}
                                type='button'
                                title={evt.comment || undefined}
                                onClick={() => {
                                  setSelectedConceptEventId(evt.id || null);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-stone-100 border-stone-500 text-stone-800 shadow-2xs font-bold ring-1 ring-stone-400/30'
                                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                                }`}
                                data-testid={`concept-version-item-${verNum}`}
                              >
                                <span className='w-2 h-2 rounded-full bg-orange-500' />
                                <span>Concept v{verNum}</span>
                                <span className='text-stone-400 font-mono text-xs'>
                                  {evt.createdAt
                                    ? new Date(evt.createdAt).toLocaleDateString('vi-VN')
                                    : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CONCEPT REVIEW: COMMENTS SECTION (BIB-10 FE) */}
                    <div
                      className='mt-4 pt-4 border-t border-stone-200/80 space-y-3'
                      data-testid='concept-comments-section'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-900'>
                          <MessageSquare className='w-4 h-4 text-stone-500' />
                          <span>
                            {t('bible.detailModal.conceptCommentsTitle', 'Nhận xét Concept Art')}
                          </span>
                          <span className='px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold'>
                            {conceptComments.length}
                          </span>
                        </div>
                      </div>

                      {/* Comments List */}
                      {loadingComments ? (
                        <div className='py-4 text-center text-xs text-stone-500'>
                          {t('bible.detailModal.loadingComments', 'Đang tải nhận xét...')}
                        </div>
                      ) : conceptComments.length === 0 ? (
                        <div className='p-3 text-center text-xs text-stone-400 italic bg-stone-50/60 rounded-xl border border-stone-200/60'>
                          {t(
                            'bible.detailModal.noCommentsYet',
                            'Chưa có nhận xét nào cho bản vẽ này.',
                          )}
                        </div>
                      ) : (
                        <div className='space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1'>
                          {conceptComments.map((c) => {
                            const isResolved = Boolean(c.resolvedAt);
                            return (
                              <div
                                key={c.id}
                                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                                  isResolved
                                    ? 'bg-stone-50/70 border-stone-200 text-stone-500 opacity-80'
                                    : 'bg-white border-stone-200 shadow-2xs text-stone-800'
                                }`}
                                data-testid={`concept-comment-${c.id}`}
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <div className='flex items-center gap-2 min-w-0'>
                                    <span className='font-bold text-stone-900 truncate'>
                                      {c.authorId
                                        ? t(
                                            'bible.detailModal.memberWithId',
                                            { id: c.authorId.slice(0, 8) },
                                            `Thành viên (${c.authorId.slice(0, 8)})`,
                                          )
                                        : t('bible.detailModal.memberLabel', 'Thành viên')}
                                    </span>
                                    <span className='text-stone-400 font-mono text-xs'>
                                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1.5 shrink-0'>
                                    {isResolved && (
                                      <span className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200'>
                                        <Check className='w-3 h-3 text-emerald-600' />
                                        {t('bible.detailModal.resolvedBadge', 'Đã giải quyết')}
                                      </span>
                                    )}
                                    {(isWriterUser || isEditorUser) && (
                                      <button
                                        type='button'
                                        onClick={() => void handleResolveComment(c.id, isResolved)}
                                        className='px-2 py-0.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 transition cursor-pointer'
                                        data-testid={`resolve-comment-btn-${c.id}`}
                                        title={
                                          isResolved
                                            ? t(
                                                'bible.detailModal.reopenCommentTitle',
                                                'Mở lại nhận xét',
                                              )
                                            : t(
                                                'bible.detailModal.resolveCommentTitle',
                                                'Đánh dấu đã giải quyết',
                                              )
                                        }
                                      >
                                        {isResolved
                                          ? t('bible.detailModal.reopenBtn', 'Mở lại')
                                          : t('bible.detailModal.resolveBtn', 'Giải quyết')}
                                      </button>
                                    )}
                                    <button
                                      type='button'
                                      onClick={() =>
                                        setActiveReplyId(activeReplyId === c.id ? null : c.id)
                                      }
                                      className='px-2 py-0.5 text-xs font-medium text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded border border-stone-300 transition cursor-pointer flex items-center gap-1'
                                      data-testid={`reply-comment-btn-${c.id}`}
                                    >
                                      <CornerDownRight className='w-3 h-3' />
                                      <span>{t('bible.detailModal.replyBtn', 'Trả lời')}</span>
                                    </button>
                                  </div>
                                </div>

                                <p className='text-xs leading-relaxed text-stone-800 whitespace-pre-wrap'>
                                  {c.body}
                                </p>

                                {/* Nested Replies */}
                                {c.replies && c.replies.length > 0 && (
                                  <div className='pl-3 border-l-2 border-stone-200 space-y-1.5 pt-1 mt-1'>
                                    {c.replies.map((r) => (
                                      <div
                                        key={r.id}
                                        className='bg-stone-50 p-2 rounded-lg text-xs space-y-1'
                                      >
                                        <div className='flex items-center gap-2 text-xs text-stone-500'>
                                          <span className='font-bold text-stone-800'>
                                            {r.authorId
                                              ? t(
                                                  'bible.detailModal.memberWithId',
                                                  { id: r.authorId.slice(0, 8) },
                                                  `Thành viên (${r.authorId.slice(0, 8)})`,
                                                )
                                              : t('bible.detailModal.memberLabel', 'Thành viên')}
                                          </span>
                                          <span className='font-mono'>
                                            {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                          </span>
                                        </div>
                                        <p className='text-stone-700'>{r.body}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Inline Reply Box */}
                                {activeReplyId === c.id && (
                                  <div className='pt-2 flex items-center gap-2'>
                                    <input
                                      type='text'
                                      value={replyTextMap[c.id] || ''}
                                      onChange={(e) =>
                                        setReplyTextMap((prev) => ({
                                          ...prev,
                                          [c.id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          if (
                                            e.nativeEvent?.isComposing ||
                                            (e as any).keyCode === 229
                                          )
                                            return;
                                          e.preventDefault();
                                          void handleReplyComment(c.id);
                                        }
                                      }}
                                      placeholder={t(
                                        'bible.detailModal.replyPlaceholder',
                                        'Viết câu trả lời...',
                                      )}
                                      className='flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F97316]'
                                      data-testid={`reply-input-${c.id}`}
                                    />
                                    <button
                                      type='button'
                                      disabled={submittingComment || !replyTextMap[c.id]?.trim()}
                                      onClick={() => void handleReplyComment(c.id)}
                                      className='px-3 py-1.5 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1'
                                      data-testid={`submit-reply-btn-${c.id}`}
                                    >
                                      <Send className='w-3 h-3' />
                                      <span>{t('bible.detailModal.sendReply', 'Gửi')}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Comment Input */}
                      <div className='pt-2 flex items-center gap-2'>
                        <input
                          type='text'
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
                              e.preventDefault();
                              void handleCreateComment();
                            }
                          }}
                          placeholder={t(
                            'bible.detailModal.newCommentPlaceholder',
                            'Thêm nhận xét về bản vẽ Concept Art...',
                          )}
                          className='flex-1 px-3.5 py-2 text-xs bg-stone-50 hover:bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F97316] transition'
                          data-testid='create-concept-comment-input'
                        />
                        <button
                          type='button'
                          disabled={submittingComment || !newCommentText.trim()}
                          onClick={() => void handleCreateComment()}
                          className='px-4 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-[0.98]'
                          data-testid='create-concept-comment-btn'
                        >
                          <Send className='w-3.5 h-3.5' />
                          <span>{t('bible.detailModal.sendComment', 'Gửi nhận xét')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const finalContent = (
    <>
      {/* Toàn trang trên nền giấy (không có sidebar/top bar của AppShell) */}
      <div
        className='fixed inset-0 z-[1000] bg-[#F2F0EA] overflow-y-auto animate-in fade-in duration-150'
        role='dialog'
        aria-modal='true'
        aria-labelledby='bible-entity-title'
      >
        <div className='max-w-[1600px] mx-auto px-4 py-5 sm:px-6 lg:px-8'>{modalContent}</div>
      </div>

      {/* REQUEST INFO CHANGE MODAL */}
      <Modal
        isOpen={isRequestInfoOpen}
        onClose={() => setIsRequestInfoOpen(false)}
        title='Yêu cầu sửa thông tin đặc tả'
        size='md'
        closeLabel='Đóng'
      >
        <div className='p-5 space-y-4 text-stone-900'>
          <p className='text-xs text-stone-600 leading-relaxed'>
            Gửi yêu cầu góp ý tới Biên kịch (Writer) để điều chỉnh các trường thông tin của thực thể{' '}
            <strong className='font-bold text-stone-900'>{entity.name}</strong>.
          </p>
          <div>
            <label className='block text-xs font-bold text-stone-700 mb-1.5'>
              Trường thông tin cần sửa
            </label>
            <select
              value={requestInfoField}
              onChange={(e) => setRequestInfoField(e.target.value)}
              className='w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-amber-500'
            >
              <option value='Mô tả đặc tả'>Mô tả đặc tả (Description)</option>
              <option value='Tên thực thể'>Tên thực thể (Name)</option>
              <option value='Phụ đề / Bí danh'>Phụ đề / Bí danh (Subtitle)</option>
              <option value='Thuộc tính / Chi tiết'>Thuộc tính / Chi tiết (Attributes)</option>
              <option value='Toàn bộ thông tin'>Toàn bộ thông tin</option>
            </select>
          </div>
          <div>
            <label className='block text-xs font-bold text-stone-700 mb-1.5'>
              Chi tiết nội dung cần sửa
            </label>
            <textarea
              rows={4}
              value={requestInfoNote}
              onChange={(e) => setRequestInfoNote(e.target.value)}
              placeholder='Ví dụ: Cần làm rõ thêm tính cách và vũ khí sở trường của nhân vật...'
              className='w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-amber-500'
            />
          </div>
          <div className='flex items-center justify-end gap-2 pt-2 border-t border-stone-200'>
            <button
              type='button'
              onClick={() => setIsRequestInfoOpen(false)}
              className='px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800'
            >
              Hủy
            </button>
            <button
              type='button'
              disabled={!requestInfoNote.trim() || submittingInfoRequest}
              onClick={handleSendRequestInfo}
              className='px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer'
              data-testid='submit-request-info-btn'
            >
              <Send className='w-3.5 h-3.5' />
              <span>Gửi yêu cầu sửa</span>
            </button>
          </div>
        </div>
      </Modal>

      {!onOpenDefineStub && (
        <DefineStubModal
          isOpen={isLocalDefineOpen}
          entity={entity}
          seriesId={seriesId}
          isWriter={canDefineStub}
          onClose={() => setIsLocalDefineOpen(false)}
          onDefined={async () => {
            setLocalDefinedForId(entity.id);
            onDefinedStub?.();
            if (seriesId) {
              try {
                const revs = await bibleService.getEntryHistory(seriesId, entity.id);
                if (revs && revs.length > 0) setAllRevisions(revs);
              } catch {
                // ignore
              }
            }
          }}
          onShowToast={onShowToast}
        />
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(finalContent, document.body) : finalContent;
};
