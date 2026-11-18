// src/roles/writer/components/script/BibleCharactersDrawer.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Layers,
  Loader2,
  Search,
  User,
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
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';

export interface BibleCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: BibleEntryDto[];
  chapterId?: string;
  seriesId?: string;
  workspaceId?: string;
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
  workspaceId,
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
  const routeParams = useParams<{ workspaceId?: string; seriesId?: string }>();
  const effectiveWorkspaceId = workspaceId || routeParams.workspaceId;
  const effectiveSeriesId = seriesId || routeParams.seriesId;
  const confirm = useConfirm();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    if (propT) return propT(key, fallbackOrParams, explicitFallback);
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'cast' | 'all' | 'nonCast' | 'stubs'>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [actingEntryId, setActingEntryId] = useState<string | null>(null);

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
        onShowToast(t('production.cast.crowdUpdateFailed', 'Cập nhật cờ Quần chúng thất bại'), err?.message);
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
          t('production.cast.cancelReplacementSuccessDesc', 'Binding của chương đã quay về bản kế thừa.'),
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(t('production.cast.cancelReplacementFailed', 'Huỷ bản thay thế thất bại'), err?.message);
      }
    } finally {
      setActingEntryId(null);
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
          t('production.cast.saveDraftSuccessDesc', 'Đặc tả đã được cập nhật thành phiên bản nháp mới.'),
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
              {t('production.cast.charactersDrawerTitle', 'Nhân vật')}
            </h3>
            <p className='text-xs text-stone-500 truncate'>
              {castEntities.length} {t('production.cast.inChapter', 'Trong chương').toLowerCase()} · {allCharacters.length} {t('production.cast.total', 'tổng số')}
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

      {/* Filter Tabs: Đẩy tab Trong chương lên đầu */}
      <div className='px-4 pt-3 pb-2 border-b border-stone-200/80 bg-white flex items-center gap-1 overflow-x-auto'>
        <button
          type='button'
          onClick={() => setFilterTab('cast')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            filterTab === 'cast'
              ? 'bg-orange-100 text-orange-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('production.cast.inChapterFilter', 'Trong chương')} ({castEntities.length})
        </button>
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
          onClick={() => setFilterTab('nonCast')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            filterTab === 'nonCast'
              ? 'bg-orange-100 text-orange-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('production.cast.outOfChapterFilter', 'Ngoài chương')} (
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
            {t('production.cast.stubsFilter', 'Chưa định nghĩa')} ({stubsNotInBible.length})
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
            placeholder={t('production.cast.searchCharacter', 'Tìm nhân vật...')}
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
              isCanonLocked: castEntity?.boundRevision?.isCanonLocked ?? char.effectiveRevision?.isLocked ?? false,
              bibleStatus: castEntity?.bibleStatus || (char.effectiveRevision?.isLocked ? 'CanonLocked' : 'Draft'),
              source: castEntity?.source,
              boundRevision: castEntity?.boundRevision,
              chosenByWriter: castEntity?.chosenByWriter,
              inheritedFromChapterNumber: castEntity?.inheritedFromChapterNumber,
              panelRevisions: castEntity?.panelRevisions,
              availableRevisions: castEntity?.availableRevisions,
              mentions: castEntity?.mentions,
            };

            return (
              <BibleEntryAccordionItem
                key={char.id}
                entity={accordionEntity}
                isInChapter={filterTab === 'all' ? inCast : undefined}
                isOpen={expandedEntryId === char.id}
                onToggle={() =>
                  setExpandedEntryId((prev) => (prev === char.id ? null : char.id))
                }
                canEditScript={canEditScript}
                workspaceId={effectiveWorkspaceId}
                seriesId={effectiveSeriesId}
                isActing={actingEntryId === char.id}
                onSaveDraft={handleSaveDraft}
                onChangeRevision={handleRevisionChange}
                onToggleCrowd={handleToggleCrowd}
                onCancelReplacement={handleCancelReplacement}
                onJumpToLine={onJumpToLine}
                onJumpToPanel={onJumpToPanel}
                t={t}
              />
            );
          })
        )}
      </div>
    </aside>
  );
};
