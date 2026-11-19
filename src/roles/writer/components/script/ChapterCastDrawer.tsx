// src/roles/writer/components/script/ChapterCastDrawer.tsx
import React, { useState } from 'react';
import {
  Users,
  Search,
  X,
  AlertTriangle,
  Clock,
  Layers,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useConfirm } from '@/shared/context/ConfirmContext';
import {
  ChapterCastDto,
  ChapterCastItemDto,
  chapterCastService,
} from '@/services/chapterCast.service';
import { BibleEntryDto, bibleService } from '@/services/bible.service';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';

interface ChapterCastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  seriesId: string;
  canEditScript: boolean;
  chapterNumber?: number;
  chapterTitle?: string;
  chapterCast: ChapterCastDto | null;
  isLoading: boolean;
  onRefreshCast: () => Promise<void>;
  onRefreshBible?: () => Promise<void>;
  allBibleEntries?: BibleEntryDto[];
  onJumpToLine?: (lineId: string) => void;
  onJumpToPanel?: (pageNumber?: number | null, panelNumber?: number | null) => void;
  onOpenPanelStageModal?: () => void;
  onShowToast?: (title: string, description?: string) => void;
  t?: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
}

export const ChapterCastDrawer: React.FC<ChapterCastDrawerProps> = ({
  isOpen,
  onClose,
  chapterId,
  seriesId,
  canEditScript,
  chapterNumber,
  chapterTitle,
  chapterCast,
  isLoading,
  onRefreshCast,
  onRefreshBible,
  allBibleEntries = [],
  onJumpToLine,
  onJumpToPanel,
  onOpenPanelStageModal,
  onShowToast,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const confirm = useConfirm();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    if (propT) return propT(key, fallbackOrParams, explicitFallback);
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [actingEntryId, setActingEntryId] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  if (!isOpen) return null;

  const entities = chapterCast?.entities || [];
  const filteredEntities = entities.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.bibleStatus.toLowerCase().includes(q)
    );
  });

  // 1. Đổi bản gắn cho chương / Về bản kế thừa
  const handleRevisionChange = async (entryId: string, revId: string) => {
    setActingEntryId(entryId);
    try {
      const targetRevId = revId === '__INHERITED__' ? null : revId;
      const res = await chapterCastService.setChapterCastRevision(chapterId, entryId, targetRevId);
      await onRefreshCast();

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
      if (res.warnings && res.warnings.length > 0) {
        messages.push(
          t(
            'production.cast.warningPrefix',
            { warnings: res.warnings.join('; ') },
            `Cảnh báo: ${res.warnings.join('; ')}`,
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
          err?.message || t('common.errorOccurred', 'Có lỗi xảy ra'),
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // 2. Bật / tắt cờ Quần chúng
  const handleToggleCrowd = async (entry: BibleAccordionEntity) => {
    setActingEntryId(entry.id);
    try {
      await chapterCastService.setBibleEntryCrowd(seriesId, entry.id, !entry.isCrowd);
      await onRefreshCast();
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

  // 3. Lưu bản nháp (Draft Revision) trực tiếp từ accordion row
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

      await onRefreshCast();
      if (onRefreshBible) await onRefreshBible();

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

  // 5. Huỷ bản thay thế
  const handleCancelReplacement = async (entryId: string, revisionId: string) => {
    if (
      !(await confirm({
        title: t('common.confirm.title', 'Xác nhận'),
        description: t(
          'production.cast.cancelReplacementConfirm',
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
      await onRefreshCast();
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

  const submitBlockers = chapterCast?.submitGate?.blockers || [];
  const startBlockers = chapterCast?.gate?.blockers || [];

  return (
    <div
      data-testid='chapter-cast-drawer'
      className='w-full xl:w-[420px] 2xl:w-[460px] shrink-0 border-l border-stone-200/90 bg-[#FAF9F5] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200 text-stone-900'
    >
      {/* Drawer Header */}
      <div className='p-4 border-b border-stone-200/80 bg-white flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-orange-100/70 text-orange-600 rounded-xl shrink-0 border border-orange-200/50'>
            <Users className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-stone-900 truncate font-serif'>
              {t('production.cast.drawerTitle', 'Thực thể chương')} ({entities.length})
            </h3>
            <p className='text-xs text-stone-500 truncate'>
              {chapterNumber
                ? t(
                    'production.cast.chapterPrefix',
                    { number: chapterNumber },
                    `Chương ${chapterNumber}`,
                  )
                : ''}
              {chapterTitle ? ` · ${chapterTitle}` : ''}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1'>
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
            title={t('production.cast.close', 'Đóng')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Search Input */}
      {entities.length > 2 && (
        <div className='p-3 border-b border-stone-200/80 bg-white'>
          <div className='relative'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('production.cast.search', 'Tìm thực thể trong chương...')}
              className='w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-xl outline-none focus:border-orange-500 bg-stone-50 text-stone-900'
            />
          </div>
        </div>
      )}

      {/* Entity List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
        {isLoading && (
          <div className='p-8 text-center text-stone-400 flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin text-orange-500' />
            <span className='text-xs'>
              {t('production.cast.loadingEntities', 'Đang tải danh sách thực thể...')}
            </span>
          </div>
        )}

        {!isLoading && filteredEntities.length === 0 && (
          <div className='p-8 text-center text-stone-500 border border-dashed border-stone-200 rounded-2xl bg-white'>
            <Users className='w-8 h-8 text-stone-300 mx-auto mb-2' />
            <p className='text-xs font-semibold text-stone-800'>
              {searchQuery
                ? t('production.cast.noMatchingEntityFound', 'Không tìm thấy thực thể nào phù hợp.')
                : t('production.cast.noEntitiesInChapter', 'Chưa có thực thể nào trong chương.')}
            </p>
            <p className='text-xs text-stone-400 mt-1'>
              {t(
                'production.cast.entityHint',
                'Dùng tên trong dòng Thoại hoặc bôi đen văn bản để gắn tham chiếu Series Bible.',
              )}
            </p>
          </div>
        )}

        {!isLoading &&
          filteredEntities.map((entry) => {
            const bibleEntry = allBibleEntries.find((b) => b.id === entry.bibleEntryId);
            const accordionEntity: BibleAccordionEntity = {
              id: entry.bibleEntryId,
              name: entry.name,
              code: entry.code,
              category: entry.category,
              subtitle: bibleEntry?.subtitle,
              description: bibleEntry?.description,
              detailsJson: bibleEntry?.detailsJson,
              isStub: entry.isStub,
              isCrowd: entry.isCrowd,
              isCanonLocked: entry.boundRevision?.isCanonLocked ?? false,
              bibleStatus: entry.bibleStatus,
              source: entry.source,
              boundRevision: entry.boundRevision,
              chosenByWriter: entry.chosenByWriter,
              inheritedFromChapterNumber: entry.inheritedFromChapterNumber,
              panelRevisions: entry.panelRevisions,
              availableRevisions: entry.availableRevisions,
              mentions: entry.mentions,
            };

            return (
              <BibleEntryAccordionItem
                key={entry.bibleEntryId}
                entity={accordionEntity}
                isOpen={expandedEntryId === entry.bibleEntryId}
                onToggle={() =>
                  setExpandedEntryId((prev) =>
                    prev === entry.bibleEntryId ? null : entry.bibleEntryId,
                  )
                }
                canEditScript={canEditScript}
                seriesId={seriesId}
                isActing={actingEntryId === entry.bibleEntryId}
                onSaveDraft={handleSaveDraft}
                onChangeRevision={handleRevisionChange}
                onToggleCrowd={handleToggleCrowd}
                onCancelReplacement={handleCancelReplacement}
                onJumpToLine={onJumpToLine}
                onJumpToPanel={onJumpToPanel}
                t={t}
              />
            );
          })}
      </div>
    </div>
  );
};
