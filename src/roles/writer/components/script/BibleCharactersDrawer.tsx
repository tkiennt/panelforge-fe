// src/roles/writer/components/script/BibleCharactersDrawer.tsx
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';
import { ChapterCastDto, chapterCastService } from '@/services/chapterCast.service';
import { useTranslation } from '@/lib/i18n';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';
import { buildBibleUrl } from '@/app/routePaths';

export interface BibleCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: BibleEntryDto[];
  defaultTab?: 'cast' | 'all' | 'nonCast';
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
  defaultTab = 'cast',
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
  const [filterTab, setFilterTab] = useState<'cast' | 'all' | 'nonCast'>(defaultTab);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [actingEntryId, setActingEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFilterTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

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

  // Tách riêng nhân vật chính/phụ và Quần chúng & Extras
  const regularCharacters = allCharacters.filter((c) => !c.isCrowd);
  const crowdCharacters = allCharacters.filter((c) => c.isCrowd);

  // Lọc theo search và tab
  const filterList = (list: BibleEntryDto[]) =>
    list.filter((char) => {
      const inCast = castEntityIds.has(char.id) || Boolean(char.isStub);
      if (filterTab === 'cast' && !inCast) return false;
      if (filterTab === 'nonCast' && inCast) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        char.name.toLowerCase().includes(q) ||
        (char.code && char.code.toLowerCase().includes(q)) ||
        (char.subtitle && char.subtitle.toLowerCase().includes(q)) ||
        (char.description && char.description.toLowerCase().includes(q))
      );
    });

  const filteredRegular = filterList(regularCharacters);
  const filteredCrowd = filterList(crowdCharacters);
  const filteredAll = filterList(allCharacters);

  const vaultUrl =
    effectiveWorkspaceId && effectiveSeriesId
      ? `/workspaces/${effectiveWorkspaceId}/series/${effectiveSeriesId}/bible`
      : '#';

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
      if (res.warnings && res.warnings.length > 0) {
        messages.push(...res.warnings);
      }
      if (onShowToast) {
        onShowToast(
          t('production.cast.revisionChangeSuccess', 'Đã gán bản tạo hình cho chương'),
          messages.join(' • '),
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          t('production.cast.revisionChangeFailed', 'Gán bản tạo hình thất bại'),
          err?.message,
        );
      }
    } finally {
      setActingEntryId(null);
    }
  };

  // Đổi cờ Quần chúng
  const handleToggleCrowd = async (entry: BibleAccordionEntity) => {
    if (!effectiveSeriesId) return;
    setActingEntryId(entry.id);
    try {
      await chapterCastService.setBibleEntryCrowd(effectiveSeriesId, entry.id, !entry.isCrowd);
      if (onRefreshCast) await onRefreshCast();
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

  const renderEntityItem = (char: BibleEntryDto) => {
    const castEntity = castEntities.find((e) => e.bibleEntryId === char.id);
    const accordionEntity: BibleAccordionEntity = {
      id: char.id,
      name: char.name,
      code: char.code,
      category: char.category,
      subtitle: char.subtitle,
      description: char.description,
      detailsJson: char.detailsJson,
      isStub: char.isStub,
      isCrowd: char.isCrowd || castEntity?.isCrowd,
      isCanonLocked: char.effectiveRevision?.isLocked ?? false,
      bibleStatus: char.effectiveRevision?.reviewStatus,
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
        isOpen={expandedEntryId === char.id}
        onToggle={() => setExpandedEntryId((prev) => (prev === char.id ? null : char.id))}
        canEditScript={canEditScript}
        isInChapter={castEntityIds.has(char.id) || Boolean(char.isStub)}
        workspaceId={effectiveWorkspaceId}
        seriesId={effectiveSeriesId}
        isActing={actingEntryId === char.id}
        onChangeRevision={handleRevisionChange}
        onToggleCrowd={handleToggleCrowd}
        onCancelReplacement={handleCancelReplacement}
        onJumpToLine={onJumpToLine}
        onJumpToPanel={onJumpToPanel}
        t={t}
      />
    );
  };

  return (
    <aside
      id='script-right-drawer'
      data-testid='bible-characters-drawer'
      aria-label={t('collaboration.writerStudio.toolPanelTitle', 'Bảng công cụ Biên kịch')}
      className='w-80 2xl:w-96 shrink-0 border-l border-[#E8E3DA] bg-[#FBF9F4] flex flex-col h-full shadow-[-1px_0_3px_rgba(0,0,0,0.02)] z-30 text-stone-900 select-none'
    >
      {/* 1. Header: Bảng công cụ Biên kịch */}
      <div className='p-3 border-b border-stone-200/80 bg-white flex items-center justify-between select-none'>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold'>
            <Users className='w-4 h-4 text-primary' />
          </div>
          <div>
            <h3 className='font-headline-sm text-[13.5px] font-bold text-stone-900'>
              {t('collaboration.writerStudio.toolPanelTitle', 'Bảng công cụ Biên kịch')}
            </h3>
            <span className='sr-only'>
              {`${t('production.cast.charactersDrawerTitle', 'Nhân vật Series Bible')} (${allCharacters.length})`}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {canEditScript && onOpenPanelStageModal && (
            <button
              type='button'
              onClick={onOpenPanelStageModal}
              title={t('production.cast.setPanelStageBtn', 'Đặt giai đoạn theo Panel')}
              className='p-1 text-stone-400 hover:text-primary hover:bg-orange-50 rounded transition-colors cursor-pointer'
            >
              <Layers className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            onClick={onClose}
            className='p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer'
            title={t('common.close', 'Đóng')}
            aria-label={t('common.close', 'Đóng')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* 2. Subtab row: Trong chương / Toàn bộ + Vault đầy đủ ↗ link */}
      <div className='p-2.5 border-b border-stone-200/80 bg-[#FDFBF7] flex items-center justify-between gap-1 select-none'>
        <div className='flex items-center gap-1 bg-[#FAF9F5] p-0.5 rounded-lg border border-stone-200/80'>
          <button
            type='button'
            id='bible-subtab-chapter'
            data-testid='filter-tab-cast'
            onClick={() => setFilterTab('cast')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'cast'
                ? 'bg-primary text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/60'
            }`}
          >
            {t('collaboration.writerStudio.inChapter', 'Trong chương')}
          </button>
          <button
            type='button'
            id='bible-subtab-all'
            data-testid='filter-tab-all'
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/60'
            }`}
          >
            {t('collaboration.writerStudio.allVault', 'Toàn bộ')}
          </button>
          {/* Ẩn tab nonCast nhưng giữ cho test compat */}
          <button
            type='button'
            data-testid='filter-tab-nonCast'
            onClick={() => setFilterTab('nonCast')}
            className='sr-only'
          >
            {t('production.cast.outOfChapterFilter', 'Ngoài chương')}
          </button>
        </div>

        {vaultUrl !== '#' && (
          <Link
            to={vaultUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='px-2 py-1 rounded text-xs font-semibold text-primary hover:underline flex items-center gap-1'
          >
            <span>{t('collaboration.writerStudio.fullVaultLink', 'Vault đầy đủ')}</span>
            <ExternalLink className='w-3 h-3' />
          </Link>
        )}
      </div>

      {/* Search Bar when in all tab */}
      {filterTab === 'all' && (
        <div className='p-2.5 border-b border-stone-200/80 bg-white'>
          <div className='relative'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('production.cast.searchCharacter', 'Tìm nhân vật & thực thể...')}
              className='w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg outline-none focus:border-primary bg-stone-50 text-stone-900'
            />
          </div>
        </div>
      )}

      {/* 3. Panel Content */}
      <div className='flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar'>
        {isLoadingCast && (
          <div className='p-4 text-center text-stone-400 flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin text-primary' />
            <span className='text-xs'>
              {t('production.cast.loadingEntities', 'Đang tải danh sách thực thể...')}
            </span>
          </div>
        )}

        {filterTab === 'cast' ? (
          <>
            {/* NHÂN VẬT XUẤT HIỆN */}
            <div className='space-y-2.5'>
              <div className='flex items-center justify-between px-0.5'>
                <span className='text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1'>
                  <ShieldCheck className='w-3.5 h-3.5 text-primary' />
                  {t('collaboration.writerStudio.charactersInChapter', {
                    count: filteredRegular.length,
                  })}
                </span>
                <span className='text-xs font-mono text-stone-400'>
                  {t('collaboration.writerStudio.canonGate1', 'Canon Gate 1')}
                </span>
              </div>

              {filteredRegular.length === 0 ? (
                <div className='p-4 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl bg-white text-xs'>
                  {t(
                    'production.cast.noCharactersInChapter',
                    'Chưa có nhân vật nào xuất hiện trong phân cảnh.',
                  )}
                </div>
              ) : (
                <div className='space-y-2.5'>{filteredRegular.map(renderEntityItem)}</div>
              )}
            </div>

            {/* QUẦN CHÚNG & EXTRAS */}
            <div className='pt-3 border-t-2 border-dashed border-stone-200/80 space-y-2.5'>
              <div className='flex items-center justify-between px-0.5'>
                <div className='flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-stone-400' />
                  <span className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                    {t('collaboration.writerStudio.crowdAndExtras', 'QUẦN CHÚNG & EXTRAS')}
                  </span>
                </div>
                <span className='px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200'>
                  {t('collaboration.writerStudio.exemptGate1', 'Miễn trừ Gate 1')}
                </span>
              </div>
              <p className='text-xs text-stone-500 leading-relaxed px-0.5'>
                {t(
                  'collaboration.writerStudio.exemptGate1Hint',
                  'Nhân vật phụ làm nền không yêu cầu Model Sheet đa góc xoay hoặc khóa chuẩn v2.0.',
                )}
              </p>

              {filteredCrowd.length === 0 ? (
                <div className='p-3 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl bg-white text-xs'>
                  {t(
                    'production.cast.noCrowdCharacters',
                    'Chưa có nhân vật quần chúng được gắn cờ.',
                  )}
                </div>
              ) : (
                <div className='space-y-2'>{filteredCrowd.map(renderEntityItem)}</div>
              )}
            </div>
          </>
        ) : (
          /* TOÀN BỘ SERIES BIBLE */
          <div className='space-y-2.5'>
            {filteredAll.length === 0 ? (
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
              filteredAll.map(renderEntityItem)
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
