// src/roles/writer/components/script/ChapterCastDrawer.tsx
import React, { useState } from 'react';
import {
  Users,
  Search,
  X,
  Tag,
  User,
  MapPin,
  Box,
  FileText,
  AlertTriangle,
  RotateCcw,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Loader2,
  Undo2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  ChapterCastDto,
  ChapterCastItemDto,
  chapterCastService,
} from '@/services/chapterCast.service';

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
  onJumpToLine?: (lineId: string) => void;
  onJumpToPanel?: (pageNumber?: number | null, panelNumber?: number | null) => void;
  onOpenPanelStageModal?: () => void;
  onShowToast?: (title: string, description?: string) => void;
  t?: (key: string, defaultVal?: string) => string;
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
  onJumpToLine,
  onJumpToPanel,
  onOpenPanelStageModal,
  onShowToast,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [actingEntryId, setActingEntryId] = useState<string | null>(null);

  // Modal Định nghĩa mục nháp (IsStub)
  const [stubToDefine, setStubToDefine] = useState<ChapterCastItemDto | null>(null);
  const [defineName, setDefineName] = useState('');
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
  const handleToggleCrowd = async (entry: ChapterCastItemDto) => {
    setActingEntryId(entry.bibleEntryId);
    try {
      await chapterCastService.setBibleEntryCrowd(seriesId, entry.bibleEntryId, !entry.isCrowd);
      await onRefreshCast();
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

  // 3. Mở form Định nghĩa mục nháp
  const handleOpenDefine = (entry: ChapterCastItemDto) => {
    setStubToDefine(entry);
    setDefineName(entry.name);
    setDefineDesc('');
    setDefineSubtitle('');
  };

  // 4. Submit Định nghĩa mục nháp
  const handleSubmitDefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stubToDefine || !defineDesc.trim()) return;

    setIsDefining(true);
    try {
      await chapterCastService.defineBibleEntry(seriesId, stubToDefine.bibleEntryId, {
        name: defineName.trim() || stubToDefine.name,
        description: defineDesc.trim(),
        subtitle: defineSubtitle.trim() || undefined,
      });

      await onRefreshCast();
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

  // 5. Huỷ bản thay thế
  const handleCancelReplacement = async (entryId: string, revisionId: string) => {
    if (
      !window.confirm(
        t(
          'production.cast.cancelReplacementConfirm',
          'Bạn có chắc muốn huỷ bản thay thế này không?',
        ),
      )
    )
      return;
    setActingEntryId(entryId);
    try {
      await chapterCastService.cancelReplacementRevision(seriesId, entryId, revisionId);
      await onRefreshCast();
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

  const getCategoryIcon = (cat: number | string) => {
    const c = String(cat).toLowerCase();
    if (c === '0' || c === 'character') return <User className='w-4 h-4 text-orange-600' />;
    if (c === '1' || c === 'location') return <MapPin className='w-4 h-4 text-blue-600' />;
    if (c === '2' || c === 'item') return <Box className='w-4 h-4 text-emerald-600' />;
    return <FileText className='w-4 h-4 text-stone-600' />;
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
                <span className='ml-1 text-[11px] text-amber-800'>
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
                <span className='ml-1 text-[11px] text-blue-800'>
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
            <p className='text-[11px] text-stone-400 mt-1'>
              {t(
                'production.cast.entityHint',
                'Dùng tên trong dòng Thoại hoặc bôi đen văn bản để gắn tham chiếu Series Bible.',
              )}
            </p>
          </div>
        )}

        {!isLoading &&
          filteredEntities.map((entry) => {
            const isActing = actingEntryId === entry.bibleEntryId;
            const boundRev = entry.boundRevision;
            const availableRevs = entry.availableRevisions || [];

            return (
              <div
                key={entry.bibleEntryId}
                className='p-3.5 rounded-xl border border-stone-200/90 bg-white shadow-xs space-y-2.5 hover:border-orange-300/80 transition-colors'
              >
                {/* 1. Header & Badges */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <div className='p-1.5 rounded-lg bg-stone-50 border border-stone-200/60 shrink-0'>
                      {getCategoryIcon(entry.category)}
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <span className='font-bold text-xs text-stone-900 truncate'>
                          {entry.name}
                        </span>
                        <span className='text-[10px] font-mono text-stone-400 shrink-0'>
                          {entry.code || 'BIBLE'}
                        </span>
                      </div>

                      {/* Source tag & Crowd tag */}
                      <div className='flex items-center gap-1 mt-0.5 flex-wrap'>
                        <span className='text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-stone-100 text-stone-600 border border-stone-200'>
                          {entry.source === 'Speaker'
                            ? t('production.cast.speaker', 'Người nói')
                            : t('production.cast.highlight', 'Bôi đen')}
                        </span>
                        {entry.isCrowd && (
                          <span className='text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200'>
                            {t('production.cast.crowd', 'Quần chúng')}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium border ${
                            entry.isStub
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : boundRev?.isCanonLocked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {entry.isStub
                            ? t('production.cast.pendingDefinition', 'Chờ định nghĩa')
                            : entry.bibleStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Bound Revision Info */}
                <div className='p-2 bg-stone-50 rounded-lg border border-stone-200/60 text-[11px] space-y-1.5'>
                  <div className='flex items-center justify-between gap-1'>
                    <span className='text-stone-500 font-medium'>
                      {t('production.cast.boundForChapter', 'Bản gắn cho chương:')}
                    </span>
                    <span className='text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/80 text-stone-700 font-medium'>
                      {entry.chosenByWriter
                        ? t('production.cast.chosenByWriter', 'Writer chọn')
                        : entry.inheritedFromChapterNumber
                          ? t(
                              'production.cast.inheritedFromChapter',
                              { number: entry.inheritedFromChapterNumber },
                              `Kế thừa từ Ch. ${entry.inheritedFromChapterNumber}`,
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
                        className={`text-[10px] ${boundRev.isCanonLocked ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}
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

                {/* 3. Writer Controls (Only Writer has action buttons) */}
                {canEditScript && (
                  <div className='pt-2 border-t border-stone-100 space-y-2'>
                    {/* Revision Selector */}
                    <div>
                      <label className='text-[10px] text-stone-500 font-medium block mb-1'>
                        {t('production.cast.changeChapterRevision', 'Đổi bản tạo hình chương:')}
                      </label>
                      <select
                        disabled={isActing}
                        value={
                          entry.chosenByWriter && boundRev ? boundRev.revisionId : '__INHERITED__'
                        }
                        onChange={(e) => handleRevisionChange(entry.bibleEntryId, e.target.value)}
                        className='w-full p-1.5 text-xs bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-500 text-stone-800 font-medium disabled:opacity-60 cursor-pointer'
                      >
                        <option value='__INHERITED__'>
                          {entry.inheritedFromChapterNumber
                            ? t(
                                'production.cast.autoInheritFrom',
                                { number: entry.inheritedFromChapterNumber },
                                `Kế thừa tự động (từ Ch. ${entry.inheritedFromChapterNumber})`,
                              )
                            : t(
                                'production.cast.autoInheritDefault',
                                'Kế thừa tự động (bản mặc định)',
                              )}
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

                    {/* Action buttons bar */}
                    <div className='flex items-center justify-between gap-1.5 flex-wrap pt-1'>
                      {/* Crowd Toggle */}
                      <button
                        type='button'
                        disabled={isActing}
                        onClick={() => handleToggleCrowd(entry)}
                        className={`px-2 py-1 text-[11px] rounded-lg border font-medium cursor-pointer transition-colors ${
                          entry.isCrowd
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {entry.isCrowd
                          ? t('production.cast.crowdMarked', '✓ Quần chúng')
                          : t('production.cast.setCrowd', '+ Đặt Quần chúng')}
                      </button>

                      {/* Define Stub Button */}
                      {entry.isStub && (
                        <button
                          type='button'
                          onClick={() => handleOpenDefine(entry)}
                          className='px-2.5 py-1 text-[11px] rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs'
                        >
                          <Edit3 className='w-3 h-3' />
                          <span>{t('production.cast.writeDefinition', 'Viết định nghĩa')}</span>
                        </button>
                      )}

                      {/* Cancel Replacement Button (if active replacement exists) */}
                      {entry.chosenByWriter && boundRev && !boundRev.isCanonLocked && (
                        <button
                          type='button'
                          disabled={isActing}
                          onClick={() =>
                            handleCancelReplacement(entry.bibleEntryId, boundRev.revisionId)
                          }
                          className='px-2 py-1 text-[11px] rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors flex items-center gap-1'
                        >
                          <Undo2 className='w-3 h-3' />
                          <span>{t('production.cast.cancelReplacement', 'Huỷ bản thay thế')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Panel-specific revisions (hồi tưởng / biến thể panel) */}
                {entry.panelRevisions && entry.panelRevisions.length > 0 && (
                  <div className='p-2 bg-blue-50/60 rounded-lg border border-blue-200/60 text-[11px] space-y-1'>
                    <div className='flex items-center gap-1 text-blue-900 font-semibold'>
                      <Layers className='w-3 h-3' />
                      <span>{t('production.cast.panelRevisions', 'Bản riêng theo Panel:')}</span>
                    </div>
                    {entry.panelRevisions.map((pr) => (
                      <div
                        key={pr.panelId}
                        className='flex items-center justify-between text-blue-800 text-[10px]'
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

                {/* 5. Mentions in Script (Jump to line / panel) */}
                {entry.mentions && entry.mentions.length > 0 && (
                  <div className='text-[11px] space-y-1 pt-1'>
                    <span className='text-stone-400 font-medium block'>
                      {t(
                        'production.cast.appearances',
                        { count: entry.mentions.length },
                        `Xuất hiện (${entry.mentions.length}):`,
                      )}
                    </span>
                    <div className='flex flex-wrap gap-1'>
                      {entry.mentions.slice(0, 5).map((m) => (
                        <button
                          key={m.lineId}
                          type='button'
                          onClick={() => {
                            if (onJumpToLine) onJumpToLine(m.lineId);
                            if (onJumpToPanel && m.pageNumber && m.panelNumber) {
                              onJumpToPanel(m.pageNumber, m.panelNumber);
                            }
                          }}
                          className='px-1.5 py-0.5 rounded text-[10px] bg-stone-100 hover:bg-orange-100 text-stone-700 hover:text-orange-800 transition-colors cursor-pointer border border-stone-200/80 flex items-center gap-0.5'
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
                          <ChevronRight className='w-2.5 h-2.5 opacity-60' />
                        </button>
                      ))}
                      {entry.mentions.length > 5 && (
                        <span className='text-[10px] text-stone-400 self-center'>
                          +{entry.mentions.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Modal Định nghĩa mục nháp (BIB-13 & 4A) */}
      {stubToDefine && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150'>
          <form
            onSubmit={handleSubmitDefine}
            className='w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col text-stone-900'
          >
            <div className='p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60'>
              <div className='flex items-center gap-2'>
                <div className='p-2 rounded-xl bg-orange-100/70 text-orange-600 border border-orange-200/50'>
                  <Edit3 className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='text-sm font-bold font-serif text-stone-900'>
                    {t('production.cast.defineTitle', 'Định nghĩa thực thể Bible')}
                  </h3>
                  <p className='text-[11px] text-stone-500'>
                    {t(
                      'production.cast.defineDesc',
                      'Mục tự động tạo từ kịch bản cần mô tả trước khi Artist vẽ concept',
                    )}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setStubToDefine(null)}
                className='p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-5 space-y-3.5 text-xs'>
              <div>
                <label className='font-semibold text-stone-700 block mb-1'>
                  {t('production.cast.entityNameRequired', 'Tên thực thể *')}
                </label>
                <input
                  type='text'
                  value={defineName}
                  onChange={(e) => setDefineName(e.target.value)}
                  className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-medium'
                  required
                />
              </div>

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
        </div>
      )}
    </div>
  );
};
