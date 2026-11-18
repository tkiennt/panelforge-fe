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
import { Modal } from '@/shared/ui';
import { useConfirm } from '@/shared/context/ConfirmContext';
import {
  ChapterCastDto,
  ChapterCastItemDto,
  chapterCastService,
} from '@/services/chapterCast.service';
import { BibleEntryDto, bibleService } from '@/services/bible.service';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';
import { BibleStubAiDraftSection } from './BibleStubAiDraftSection';

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

  // Modal Định nghĩa mục nháp (IsStub)
  const [stubToDefine, setStubToDefine] = useState<ChapterCastItemDto | null>(null);
  const [defineDesc, setDefineDesc] = useState('');
  const [defineSubtitle, setDefineSubtitle] = useState('');
  const [isDefining, setIsDefining] = useState(false);

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

  // 3. Submit Định nghĩa mục nháp từ Modal
  const handleSubmitDefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stubToDefine || !defineDesc.trim()) return;

    setIsDefining(true);
    try {
      await chapterCastService.defineBibleEntry(seriesId, stubToDefine.bibleEntryId, {
        name: stubToDefine.name, // Name is immutable!
        description: defineDesc.trim(),
        subtitle: defineSubtitle.trim() || undefined,
      });

      await onRefreshCast();
      if (onRefreshBible) await onRefreshBible();
      setStubToDefine(null);
      if (onShowToast) {
        onShowToast(
          t('production.cast.defineSuccess', 'Đã hoàn thành định nghĩa thực thể'),
          t(
            'production.cast.defineSuccessDesc',
            'Mục đã được chuyển sang hàng đợi để Artist thiết kế concept.',
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

  // 4. Lưu bản nháp (Draft Revision) trực tiếp từ accordion row
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

      {/* Gate Blockers Summary Alerts */}
      {(submitBlockers.length > 0 || startBlockers.length > 0) && (
        <div className='p-3 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-900 space-y-1.5'>
          {submitBlockers.length > 0 && (
            <div className='flex items-start gap-1.5'>
              <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
              <div>
                <span className='font-bold text-amber-950'>
                  {t('production.cast.submitBlockedTitle', 'Chặn Gửi duyệt')} (
                  {submitBlockers.length}):
                </span>
                <span className='ml-1 text-xs text-amber-800'>
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
                <span className='ml-1 text-xs text-blue-800'>
                  {startBlockers.map((b) => `${b.entryName} (${b.reason})`).join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Modal Định nghĩa mục nháp (IsStub) - Name is IMMUTABLE */}
      <Modal
        isOpen={Boolean(stubToDefine)}
        onClose={() => setStubToDefine(null)}
        size='sm'
        closeLabel={t('common.close', 'Đóng')}
        title={t('production.cast.defineTitle', 'Định nghĩa thực thể Bible')}
        description={t(
          'production.cast.defineDesc',
          'Mục tự động tạo từ kịch bản cần mô tả trước khi Artist vẽ concept',
        )}
      >
        {stubToDefine && (
          <form onSubmit={handleSubmitDefine} className='flex flex-col text-stone-900'>
            <div className='space-y-3.5 text-xs p-5'>
              <div>
                <label className='font-semibold text-stone-700 block mb-1'>
                  {t('production.cast.entityNameReadonly', 'Tên thực thể (Bất biến)')}
                </label>
                <div
                  data-testid='define-entity-name-readonly'
                  className='w-full p-2 bg-stone-100 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 select-none cursor-not-allowed'
                >
                  {stubToDefine.name}
                </div>
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
                <label className='font-semibold text-stone-700 block mb-1'>
                  {t('production.cast.visualDescriptionRequired', 'Mô tả & Đặc điểm nhận diện *')}
                </label>
                <textarea
                  rows={4}
                  value={defineDesc}
                  onChange={(e) => setDefineDesc(e.target.value)}
                  placeholder={t(
                    'production.cast.visualDescriptionPlaceholder',
                    'Ngoại hình, trang phục, vũ khí hoặc đặc điểm nhận diện chính...',
                  )}
                  className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-normal custom-scrollbar'
                  required
                />
              </div>

              <div>
                <label className='font-semibold text-stone-700 block mb-1'>
                  {t('production.cast.subtitleLabel', 'Tiêu đề phụ / Vai trò')}
                </label>
                <input
                  type='text'
                  value={defineSubtitle}
                  onChange={(e) => setDefineSubtitle(e.target.value)}
                  placeholder={t(
                    'production.cast.subtitlePlaceholder',
                    'Ví dụ: Kiếm sĩ lang thang',
                  )}
                  className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-normal'
                />
              </div>
            </div>

            <div className='p-4 border-t border-stone-100 bg-stone-50/40 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => setStubToDefine(null)}
                className='px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-semibold cursor-pointer'
              >
                {t('common.cancel', 'Huỷ')}
              </button>
              <button
                type='submit'
                disabled={isDefining || !defineDesc.trim()}
                className='px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50'
              >
                {isDefining ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <CheckCircle2 className='w-3.5 h-3.5' />
                )}
                {t('production.cast.saveDefinition', 'Lưu định nghĩa')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
