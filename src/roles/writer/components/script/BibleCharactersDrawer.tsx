// src/roles/writer/components/script/BibleCharactersDrawer.tsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Layers,
  Loader2,
  Plus,
  Search,
  User,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { BibleEntryDto, bibleService } from '@/services/bible.service';
import {
  ChapterCastDto,
  ChapterCastItemDto,
  chapterCastService,
} from '@/services/chapterCast.service';
import { useTranslation } from '@/lib/i18n';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { Modal } from '@/shared/ui';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';
import { BibleStubAiDraftSection } from './BibleStubAiDraftSection';

export interface BibleCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: BibleEntryDto[];
  chapterId?: string;
  seriesId?: string;
  canEditScript?: boolean;
  chapterNumber?: number;
  chapterTitle?: string;
  onRefreshBible?: () => Promise<void>;
  onRefreshCast?: () => Promise<void>;
  onShowToast?: (title: string, description?: string) => void;
  chapterCast?: ChapterCastDto | null;
  isLoadingCast?: boolean;
  allBibleEntries?: BibleEntryDto[];
  onJumpToLine?: (lineId: string) => void;
  onJumpToPanel?: (pageNumber?: number | null, panelNumber?: number | null) => void;
  onOpenPanelStageModal?: () => void;
  t?: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
}

export const BibleCharactersDrawer: React.FC<BibleCharactersDrawerProps> = ({
  isOpen,
  onClose,
  characters,
  chapterId,
  seriesId,
  canEditScript = true,
  chapterNumber,
  chapterTitle,
  onRefreshBible,
  onRefreshCast,
  onShowToast,
  chapterCast,
  isLoadingCast = false,
  allBibleEntries = [],
  onJumpToLine,
  onJumpToPanel,
  onOpenPanelStageModal,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const confirm = useConfirm();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    if (propT) return propT(key, fallbackOrParams, explicitFallback);
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'cast' | 'nonCast' | 'stubs'>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [actingEntryId, setActingEntryId] = useState<string | null>(null);

  // Modal Định nghĩa mục nháp (IsStub)
  const [stubToDefine, setStubToDefine] = useState<ChapterCastItemDto | null>(null);
  const [defineDesc, setDefineDesc] = useState('');
  const [defineSubtitle, setDefineSubtitle] = useState('');
  const [isDefining, setIsDefining] = useState(false);

  if (!isOpen) return null;

  // Lấy danh sách thực thể cast hiện có
  const castEntities = chapterCast?.entities || [];
  const castEntityIds = new Set(castEntities.map((e) => e.bibleEntryId));

  // Gộp: tất cả nhân vật từ Bible + những stub trong cast chưa có trong Bible
  const stubsNotInBible: BibleEntryDto[] = castEntities
    .filter((e) => e.isStub && !characters.some((c) => c.id === e.bibleEntryId))
    .map((e) => ({
      id: e.bibleEntryId,
      seriesBibleId: seriesId || '',
      category: 'Character',
      code: e.code,
      name: e.name,
      description: '',
      detailsJson: null,
      priority: 0,
      strictCheck: false,
      isStub: true,
      isCrowd: e.isCrowd,
      isActive: true,
      createdAt: new Date().toISOString(),
    }));

  const allCharacters = [...characters, ...stubsNotInBible];

  // Lọc theo search và tab
  const filtered = allCharacters.filter((char) => {
    const inCast = castEntityIds.has(char.id) || Boolean(char.isStub);
    if (filterTab === 'cast' && !inCast) return false;
    if (filterTab === 'nonCast' && inCast) return false;
    if (filterTab === 'stubs' && !char.isStub) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      char.name.toLowerCase().includes(q) ||
      (char.code && char.code.toLowerCase().includes(q)) ||
      (char.subtitle && char.subtitle.toLowerCase().includes(q)) ||
      (char.description && char.description.toLowerCase().includes(q))
    );
  });

  const submitBlockers = chapterCast?.submitGate?.blockers || [];
  const startBlockers = chapterCast?.gate?.blockers || [];

  // Thao tác Thêm / Bỏ khỏi cast của chương
  const handleToggleCast = async (charId: string, currentlyInCast: boolean) => {
    if (!chapterId) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.noChapterSelected', 'Chưa chọn chương'),
          t('production.cast.selectChapterHint', 'Hãy chọn một chương trước khi thay đổi cast.'),
        );
      }
      return;
    }

    setActingEntryId(charId);
    try {
      if (currentlyInCast) {
        // Bỏ khỏi cast: đặt bound revision về null
        await chapterCastService.setChapterCastRevision(chapterId, charId, null);
        if (onShowToast) {
          onShowToast(
            t('production.cast.removedFromCastSuccess', 'Đã bỏ nhân vật khỏi cast'),
            t(
              'production.cast.removedFromCastSuccessDesc',
              'Nhân vật đã được đưa về trạng thái ngoài cast chương.',
            ),
          );
        }
      } else {
        // Thêm vào cast: liên kết thực thể với chương
        await chapterCastService.setChapterCastRevision(chapterId, charId, null);
        if (onShowToast) {
          onShowToast(
            t('production.cast.addedToCastSuccess', 'Đã thêm nhân vật vào cast'),
            t(
              'production.cast.addedToCastSuccessDesc',
              'Nhân vật đã được gắn vào danh sách phân vai của chương.',
            ),
          );
        }
      }
      if (onRefreshCast) await onRefreshCast();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.toggleCastFailed', 'Thao tác phân vai thất bại'),
          err?.message || t('common.errorOccurred', 'Có lỗi xảy ra'),
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // Đổi bản tạo hình gắn cho chương
  const handleRevisionChange = async (entryId: string, revId: string) => {
    if (!chapterId) return;
    setActingEntryId(entryId);
    try {
      const targetRevId = revId === '__INHERITED__' ? null : revId;
      const res = await chapterCastService.setChapterCastRevision(chapterId, entryId, targetRevId);
      if (onRefreshCast) await onRefreshCast();

      const messages: string[] = [];
      if (res.affectedChapterNumbers && res.affectedChapterNumbers.length > 0) {
        messages.push(
          t(
            'production.cast.affectedChaptersInherit',
            { chapters: res.affectedChapterNumbers.join(', ') },
            `Các chương phía sau sẽ kế thừa: Ch. ${res.affectedChapterNumbers.join(', ')}`,
          ),
        );
      }
      if (onShowToast) {
        onShowToast(
          targetRevId
            ? t('production.cast.revisionChanged', 'Đã đổi bản tạo hình cho chương')
            : t('production.cast.revisionReset', 'Đã đưa về bản kế thừa'),
          messages.join('\n') || undefined,
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.revisionChangeFailed', 'Đổi bản tạo hình thất bại'),
          err?.message,
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // Bật/tắt cờ Quần chúng
  const handleToggleCrowd = async (entry: BibleAccordionEntity) => {
    if (!seriesId) return;
    setActingEntryId(entry.id);
    try {
      await chapterCastService.setBibleEntryCrowd(seriesId, entry.id, !entry.isCrowd);
      if (onRefreshCast) await onRefreshCast();
      if (onRefreshBible) await onRefreshBible();
      if (onShowToast) {
        onShowToast(
          !entry.isCrowd
            ? t('production.cast.crowdSetSuccess', 'Đã gắn cờ Quần chúng')
            : t('production.cast.crowdRemovedSuccess', 'Đã bỏ cờ Quần chúng'),
          !entry.isCrowd
            ? t(
                'production.cast.crowdUnblockNotice',
                'Thực thể này không còn chặn Gửi duyệt hay Bắt đầu sản xuất.',
              )
            : undefined,
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.crowdUpdateFailed', 'Cập nhật cờ Quần chúng thất bại'),
          err?.message,
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // Huỷ bản thay thế
  const handleCancelReplacement = async (entryId: string, revisionId: string) => {
    if (!seriesId) return;
    if (
      !(await confirm({
        title: t('production.cast.cancelReplacementConfirmTitle', 'Huỷ bản thay thế'),
        description: t(
          'production.cast.cancelReplacementConfirmBody',
          'Bạn có chắc muốn huỷ bản thay thế này không?',
        ),
        confirmLabel: t('common.actions.confirm', 'Xác nhận'),
        cancelLabel: t('common.cancel', 'Huỷ'),
      }))
    )
      return;

    setActingEntryId(entryId);
    try {
      await chapterCastService.cancelReplacementRevision(seriesId, entryId, revisionId);
      if (onRefreshCast) await onRefreshCast();
      if (onRefreshBible) await onRefreshBible();
      if (onShowToast) {
        onShowToast(
          t('production.cast.cancelReplacementSuccess', 'Đã huỷ bản thay thế'),
          t(
            'production.cast.cancelReplacementSuccessDesc',
            'Binding của chương đã quay về bản kế thừa.',
          ),
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.cancelReplacementFailed', 'Huỷ bản thay thế thất bại'),
          err?.message,
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // Submit Định nghĩa mục nháp từ Modal
  const handleSubmitDefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stubToDefine || !defineDesc.trim() || !seriesId) return;

    setIsDefining(true);
    try {
      await chapterCastService.defineBibleEntry(seriesId, stubToDefine.bibleEntryId, {
        name: stubToDefine.name,
        description: defineDesc.trim(),
        subtitle: defineSubtitle.trim() || undefined,
      });

      if (onRefreshCast) await onRefreshCast();
      if (onRefreshBible) await onRefreshBible();
      setStubToDefine(null);
      if (onShowToast) {
        onShowToast(
          t('production.cast.defineSuccess', 'Đã định nghĩa thực thể'),
          t(
            'production.cast.defineSuccessDesc',
            'Mục nháp đã trở thành bản ghi Series Bible chính thức.',
          ),
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.defineFailed', 'Định nghĩa thực thể thất bại'),
          err?.message,
        );
      }
    } finally {
      setIsDefining(false);
    }
  };

  // Lưu bản nháp (Draft Revision)
  const handleSaveDraft = async (
    entryId: string,
    payload: {
      name: string;
      description: string;
      subtitle?: string;
      detailsJson?: string;
      isStub?: boolean;
    },
  ) => {
    if (!seriesId) return;
    try {
      if (payload.isStub) {
        await chapterCastService.defineBibleEntry(seriesId, entryId, {
          name: payload.name,
          description: payload.description,
          subtitle: payload.subtitle,
          detailsJson: payload.detailsJson,
        });
      } else {
        await bibleService.addRevision(seriesId, entryId, {
          summary: t('production.cast.draftSummaryDefault', 'Cập nhật đặc tả từ kịch bản'),
          name: payload.name,
          description: payload.description,
          subtitle: payload.subtitle,
          detailsJson: payload.detailsJson,
          variantLabel: 'Mặc định',
        });
      }

      if (onRefreshBible) await onRefreshBible();
      if (onRefreshCast) await onRefreshCast();

      if (onShowToast) {
        onShowToast(
          t('production.cast.saveDraftSuccess', 'Đã lưu bản nháp Series Bible'),
          t(
            'production.cast.saveDraftSuccessDesc',
            'Đặc tả đã được cập nhật thành phiên bản nháp mới.',
          ),
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.saveDraftFailed', 'Lưu bản nháp thất bại'),
          err?.message || t('common.errorOccurred', 'Có lỗi xảy ra'),
        );
      }
    }
  };

  return (
    <aside
      data-testid='bible-characters-drawer'
      aria-label={t('production.cast.charactersDrawerTitle', 'Nhân vật Series Bible')}
      className='w-full xl:w-[440px] 2xl:w-[480px] shrink-0 border-l border-stone-200/90 bg-[#FAF9F5] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200 text-stone-900 select-none'
    >
      {/* Drawer Header */}
      <div className='p-4 border-b border-stone-200/80 bg-white flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-orange-100/70 text-orange-600 rounded-xl shrink-0 border border-orange-200/50'>
            <Users className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-stone-900 truncate font-serif'>
              {t('production.cast.charactersDrawerTitle', 'Nhân vật Series Bible')} (
              {characters.length})
            </h3>
            <p className='text-xs text-stone-500 truncate'>
              {t(
                'production.cast.charactersDrawerDesc',
                'Danh sách nhân vật Canon đối chiếu kịch bản',
              )}
              {castEntities.length > 0 && ` · ${castEntities.length} trong cast`}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {canEditScript && onOpenPanelStageModal && (
            <button
              type='button'
              onClick={onOpenPanelStageModal}
              title={t('production.cast.setPanelStageBtn', 'Đặt giai đoạn theo Panel')}
              className='p-1.5 text-stone-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors'
            >
              <Layers className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors'
            title={t('common.close', 'Đóng')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Gate Blockers Summary Alerts (Submit Gate & Start Gate) */}
      {(submitBlockers.length > 0 || startBlockers.length > 0) && (
        <div className='p-3 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-xs'>
          {submitBlockers.length > 0 && (
            <div className='flex items-start gap-1.5'>
              <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-amber-950'>
                  {t('production.cast.submitBlockedTitle', 'Chặn Gửi duyệt')} (
                  {submitBlockers.length}):
                </span>
                <span className='ml-1 text-xs text-amber-800 leading-relaxed'>
                  {submitBlockers.map((b) => `${b.entryName} (${b.reason})`).join(', ')}
                </span>
              </div>
            </div>
          )}
          {startBlockers.length > 0 && (
            <div className='flex items-start gap-1.5'>
              <Clock className='w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-blue-950'>
                  {t('production.cast.startBlockedTitle', 'Chờ Gate 1')} ({startBlockers.length}):
                </span>
                <span className='ml-1 text-xs text-blue-800 leading-relaxed'>
                  {startBlockers.map((b) => `${b.entryName} (${b.reason})`).join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className='px-4 pt-3 pb-2 border-b border-stone-200/80 bg-white flex items-center gap-1 overflow-x-auto'>
        <button
          type='button'
          onClick={() => setFilterTab('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            filterTab === 'all'
              ? 'bg-orange-100 text-orange-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('production.cast.allFilter', 'Tất cả')} ({allCharacters.length})
        </button>
        <button
          type='button'
          onClick={() => setFilterTab('cast')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            filterTab === 'cast'
              ? 'bg-orange-100 text-orange-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('production.cast.inCastFilter', 'Trong cast')} ({castEntities.length})
        </button>
        <button
          type='button'
          onClick={() => setFilterTab('nonCast')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            filterTab === 'nonCast'
              ? 'bg-orange-100 text-orange-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('production.cast.notInCastFilter', 'Chưa vào cast')} (
          {Math.max(0, allCharacters.length - castEntities.length)})
        </button>
        {stubsNotInBible.length > 0 && (
          <button
            type='button'
            onClick={() => setFilterTab('stubs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterTab === 'stubs'
                ? 'bg-amber-100 text-amber-900'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            {t('production.cast.stubsFilter', 'Mục nháp')} ({stubsNotInBible.length})
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className='p-3 border-b border-stone-200/80 bg-white'>
        <div className='relative'>
          <Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('production.cast.searchCharacter', 'Tìm kiếm nhân vật...')}
            className='w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-xl outline-none focus:border-orange-500 bg-stone-50 text-stone-900'
          />
        </div>
      </div>

      {/* Characters & Cast List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
        {isLoadingCast && (
          <div className='p-4 text-center text-stone-400 flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin text-orange-500' />
            <span className='text-xs'>
              {t('production.cast.loadingEntities', 'Đang tải danh sách thực thể...')}
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className='p-8 text-center text-stone-500 border border-dashed border-stone-200 rounded-2xl bg-white'>
            <User className='w-8 h-8 text-stone-300 mx-auto mb-2' />
            <p className='text-xs font-semibold text-stone-800'>
              {searchQuery
                ? t(
                    'production.cast.noMatchingCharacterFound',
                    'Không tìm thấy nhân vật nào phù hợp.',
                  )
                : t(
                    'production.cast.noCharactersInBible',
                    'Chưa có nhân vật nào trong Series Bible.',
                  )}
            </p>
          </div>
        ) : (
          filtered.map((char) => {
            const castEntity = castEntities.find(
              (e) => e.bibleEntryId === char.id || e.code === char.code,
            );
            const inCast = Boolean(castEntity);
            const isStub = Boolean(char.isStub || castEntity?.isStub);

            const accordionEntity: BibleAccordionEntity = {
              id: char.id,
              name: char.name,
              code: char.code,
              category: char.category,
              subtitle: char.subtitle,
              description: char.description,
              detailsJson: char.detailsJson,
              isStub,
              isCrowd: char.isCrowd || castEntity?.isCrowd,
              isCanonLocked:
                castEntity?.boundRevision?.isCanonLocked ??
                char.effectiveRevision?.isLocked ??
                false,
              bibleStatus:
                castEntity?.bibleStatus ||
                (char.effectiveRevision?.isLocked ? 'CanonLocked' : 'Draft'),
              source: castEntity?.source,
              boundRevision: castEntity?.boundRevision,
              chosenByWriter: castEntity?.chosenByWriter,
              inheritedFromChapterNumber: castEntity?.inheritedFromChapterNumber,
              panelRevisions: castEntity?.panelRevisions,
              availableRevisions: castEntity?.availableRevisions,
              mentions: castEntity?.mentions,
            };

            return (
              <div
                key={char.id}
                className='border border-stone-200/80 rounded-2xl bg-white overflow-hidden shadow-xs'
              >
                {/* Header dải gộp: Huy hiệu Cast & Nút Thao tác Thêm / Bỏ khỏi cast */}
                <div className='px-3.5 py-2 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between gap-2 text-xs'>
                  <div className='flex items-center gap-1.5 min-w-0'>
                    {inCast ? (
                      <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold'>
                        <UserCheck className='w-3 h-3' />
                        {t('production.cast.inCastBadge', 'Thuộc cast')}
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-medium'>
                        <User className='w-3 h-3' />
                        {t('production.cast.notInCastBadge', 'Chưa vào cast')}
                      </span>
                    )}

                    {isStub && (
                      <span className='px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs'>
                        Mục nháp
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-1.5 shrink-0'>
                    {isStub && castEntity && canEditScript && (
                      <button
                        type='button'
                        onClick={() => {
                          setStubToDefine(castEntity);
                          setDefineDesc(char.description || '');
                          setDefineSubtitle(char.subtitle || '');
                        }}
                        className='px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs'
                      >
                        Định nghĩa
                      </button>
                    )}

                    {canEditScript && (
                      <button
                        type='button'
                        disabled={actingEntryId === char.id}
                        onClick={() => handleToggleCast(char.id, inCast)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 ${
                          inCast
                            ? 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-300'
                            : 'bg-orange-600 hover:bg-orange-700 text-white border border-transparent'
                        }`}
                      >
                        {actingEntryId === char.id ? (
                          <Loader2 className='w-3 h-3 animate-spin' />
                        ) : inCast ? (
                          <>
                            <UserMinus className='w-3 h-3' />
                            <span>{t('production.cast.removeFromCastBtn', 'Bỏ khỏi cast')}</span>
                          </>
                        ) : (
                          <>
                            <Plus className='w-3 h-3' />
                            <span>{t('production.cast.addToCastBtn', '+ Thêm vào cast')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Accordion Chi tiết nhân vật */}
                <BibleEntryAccordionItem
                  entity={accordionEntity}
                  isOpen={expandedEntryId === char.id}
                  onToggle={() => setExpandedEntryId((prev) => (prev === char.id ? null : char.id))}
                  canEditScript={canEditScript}
                  seriesId={seriesId}
                  isActing={actingEntryId === char.id}
                  onSaveDraft={handleSaveDraft}
                  onChangeRevision={handleRevisionChange}
                  onToggleCrowd={handleToggleCrowd}
                  onCancelReplacement={handleCancelReplacement}
                  onJumpToLine={onJumpToLine}
                  onJumpToPanel={onJumpToPanel}
                  t={t}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Modal định nghĩa mục nháp IsStub */}
      {stubToDefine && (
        <Modal
          isOpen={true}
          onClose={() => setStubToDefine(null)}
          title={`Định nghĩa nhân vật: ${stubToDefine.name}`}
          size='md'
          closeLabel='Hủy'
        >
          <form onSubmit={handleSubmitDefine} className='p-4 space-y-3.5 text-xs text-stone-800'>
            <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900'>
              Tên nhân vật: <strong>{stubToDefine.name}</strong> ({stubToDefine.code}). Tên này là
              bất biến theo quy chuẩn BIB-13.
            </div>

            <BibleStubAiDraftSection
              seriesId={seriesId}
              entryId={stubToDefine.bibleEntryId}
              canUseAi={Boolean(canEditScript)}
              onApplyDraft={({ description, subtitle }) => {
                if (description) setDefineDesc(description);
                setDefineSubtitle(subtitle);
              }}
            />

            <div>
              <label className='block font-semibold mb-1 text-stone-700'>
                Danh xưng / Phụ đề (Subtitle):
              </label>
              <input
                type='text'
                value={defineSubtitle}
                onChange={(e) => setDefineSubtitle(e.target.value)}
                placeholder='vd: Nữ kiếm sĩ tập sự'
                className='w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs outline-none focus:border-orange-500 bg-white text-stone-900'
              />
            </div>

            <div>
              <label className='block font-semibold mb-1 text-stone-700'>
                Mô tả nhân vật (Description) <span className='text-rose-500'>*</span>:
              </label>
              <textarea
                rows={3}
                required
                value={defineDesc}
                onChange={(e) => setDefineDesc(e.target.value)}
                placeholder='Nhập mô tả xuất thân, ngoại hình, tính cách...'
                className='w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs outline-none focus:border-orange-500 bg-white text-stone-900 resize-none'
              />
            </div>

            <div className='flex items-center justify-end gap-2 pt-2 border-t border-stone-200'>
              <button
                type='button'
                onClick={() => setStubToDefine(null)}
                className='px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={isDefining || !defineDesc.trim()}
                className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5'
              >
                {isDefining && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
                <span>Lưu định nghĩa</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </aside>
  );
};
