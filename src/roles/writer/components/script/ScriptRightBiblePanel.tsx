// src/roles/writer/components/script/ScriptRightBiblePanel.tsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Search,
  Users,
  User,
  X,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Package,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { BibleEntryDto, BibleCategory } from '@/services/bible.service';
import type { ChapterCastDto } from '@/services/chapterCast.service';
import { buildBibleUrl } from '@/app/routePaths';

export interface ScriptRightBiblePanelProps {
  characters: BibleEntryDto[];
  chapterCast?: ChapterCastDto | null;
  allBibleEntries?: BibleEntryDto[];
  seriesId?: string;
  workspaceId?: string;
  onClose?: () => void;
  onSelectEntity?: (entity: BibleEntryDto) => void;
}

export const ScriptRightBiblePanel: React.FC<ScriptRightBiblePanelProps> = ({
  characters,
  chapterCast,
  allBibleEntries = [],
  seriesId,
  workspaceId,
  onClose,
  onSelectEntity,
}) => {
  const { t } = useTranslation('production');
  const [subTab, setSubTab] = useState<'chapter' | 'all'>('chapter');
  const [searchQuery, setSearchQuery] = useState('');

  const castEntryIds = useMemo(() => {
    return new Set(chapterCast?.entities?.map((e) => e.bibleEntryId) ?? []);
  }, [chapterCast]);

  // Nhân vật chính / phụ trong chương
  const chapterCharacters = useMemo(() => {
    if (castEntryIds.size > 0) {
      return characters.filter((c) => castEntryIds.has(c.id));
    }
    return characters;
  }, [characters, castEntryIds]);

  // Quần chúng & extras trong chương
  const crowdCharacters = useMemo(() => {
    return characters.filter((c) => {
      const entity = chapterCast?.entities?.find((e) => e.bibleEntryId === c.id);
      return Boolean(entity?.isCrowd || c.isCrowd);
    });
  }, [characters, chapterCast]);

  const regularChapterCharacters = useMemo(() => {
    return chapterCharacters.filter((c) => {
      const entity = chapterCast?.entities?.find((e) => e.bibleEntryId === c.id);
      return !entity?.isCrowd && !c.isCrowd;
    });
  }, [chapterCharacters, chapterCast]);

  // Lọc toàn bộ thực thể theo từ khoá
  const filteredAllEntries = useMemo(() => {
    const list = allBibleEntries.length > 0 ? allBibleEntries : characters;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
        (e.effectiveRevision?.stageName && e.effectiveRevision.stageName.toLowerCase().includes(q)),
    );
  }, [allBibleEntries, characters, searchQuery]);

  const vaultUrl =
    workspaceId && seriesId
      ? buildBibleUrl(workspaceId, seriesId)
      : seriesId
        ? `/series/${seriesId}/bible`
        : '#';

  const getEntityIcon = (category?: BibleCategory) => {
    const cat = String(category ?? '').toLowerCase();
    switch (cat) {
      case 'location':
      case '1':
        return <MapPin className='w-3.5 h-3.5' />;
      case 'prop':
      case 'item':
      case '2':
        return <Package className='w-3.5 h-3.5' />;
      default:
        return <User className='w-3.5 h-3.5' />;
    }
  };

  return (
    <div
      id='right-panel-bible'
      data-testid='script-right-bible-panel'
      className='flex-1 flex flex-col overflow-hidden bg-[#FBF9F4]'
    >
      {/* Header bar */}
      <div className='p-3 border-b border-stone-200/80 bg-white flex items-center justify-between select-none'>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center font-bold'>
            <BookOpen className='w-4 h-4' />
          </div>
          <h3 className='font-headline-sm text-xs font-bold text-stone-900'>
            {t('collaboration.writerStudio.toolPanelTitle', 'Bảng công cụ Biên kịch')}
          </h3>
        </div>
        {onClose && (
          <button
            type='button'
            className='p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer'
            onClick={onClose}
            title={t('common.close', 'Đóng')}
            aria-label={t('common.close', 'Đóng')}
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Subtabs bar: Trong chương | Toàn bộ | Vault đầy đủ */}
      <div className='p-2.5 border-b border-stone-200/80 bg-[#FDFBF7] flex items-center justify-between gap-1 select-none'>
        <div className='flex items-center gap-1 bg-[#FAF9F5] p-0.5 rounded-lg border border-stone-200/80'>
          <button
            type='button'
            id='bible-subtab-chapter'
            onClick={() => setSubTab('chapter')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              subTab === 'chapter'
                ? 'font-semibold bg-[#EA580C] text-white shadow-xs'
                : 'font-medium text-stone-600 hover:bg-stone-200/60'
            }`}
          >
            {t('collaboration.writerStudio.inChapter', 'Trong chương')}
          </button>
          <button
            type='button'
            id='bible-subtab-all'
            onClick={() => setSubTab('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              subTab === 'all'
                ? 'font-semibold bg-[#EA580C] text-white shadow-xs'
                : 'font-medium text-stone-600 hover:bg-stone-200/60'
            }`}
          >
            {t('collaboration.writerStudio.allVault', 'Toàn bộ')}
          </button>
        </div>

        <Link
          to={vaultUrl}
          className='px-2 py-1 rounded text-xs font-semibold text-[#EA580C] hover:underline flex items-center gap-1'
        >
          <span>{t('collaboration.writerStudio.fullVaultLink', 'Vault đầy đủ')}</span>
          <ExternalLink className='w-3 h-3' />
        </Link>
      </div>

      {/* Subpanel 1: Trong chương */}
      {subTab === 'chapter' && (
        <div id='bible-subpanel-chapter' className='flex-1 overflow-y-auto p-3 space-y-4'>
          <div className='space-y-2.5'>
            <div className='flex items-center justify-between px-0.5 select-none'>
              <span className='text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1'>
                <ShieldCheck className='w-3.5 h-3.5 text-[#EA580C]' />
                <span>
                  {t('collaboration.writerStudio.charactersInChapter', {
                    count: regularChapterCharacters.length,
                    defaultValue: `NHÂN VẬT XUẤT HIỆN (${regularChapterCharacters.length})`,
                  })}
                </span>
              </span>
              <span className='text-xs font-mono text-stone-400'>
                {t('collaboration.writerStudio.canonGate1', 'Canon Gate 1')}
              </span>
            </div>

            {regularChapterCharacters.length === 0 ? (
              <p className='text-xs text-stone-400 py-3 text-center'>
                {t(
                  'production.cast.noCharactersInChapter',
                  'Chưa có nhân vật nào trong chương này.',
                )}
              </p>
            ) : (
              <div className='space-y-2.5'>
                {regularChapterCharacters.map((char) => {
                  const variantLabel =
                    char.effectiveRevision?.stageName ||
                    char.subtitle ||
                    t('production.cast.mainCharacter', 'Mặc định');
                  const versionNum = char.effectiveRevision?.versionNumber ?? 1;
                  const initials = char.name
                    .split(' ')
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isLocked = Boolean(
                    char.effectiveRevision?.isLocked ||
                    char.effectiveRevision?.reviewStatus === 'CanonLocked',
                  );

                  return (
                    <div
                      key={char.id}
                      onClick={() => onSelectEntity?.(char)}
                      className='bg-white border border-stone-200/80 rounded-xl p-2.5 shadow-2xs hover:border-[#EA580C]/40 transition-all relative overflow-hidden group cursor-pointer'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className='w-7 h-7 rounded-lg bg-stone-900 text-[#FAF9F5] flex items-center justify-center font-bold text-xs shrink-0'>
                            {initials || 'CH'}
                          </div>
                          <div className='min-w-0'>
                            <h4 className='font-headline-sm text-xs font-bold text-stone-900 leading-tight group-hover:text-[#EA580C] transition-colors truncate'>
                              <span>{char.name}</span>
                              <span className='font-normal text-stone-500 font-sans'>
                                {' '}
                                — {variantLabel} (v{versionNum})
                              </span>
                            </h4>
                            <p className='text-xs text-stone-500 truncate'>
                              {char.subtitle || variantLabel}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.2 rounded text-xs font-semibold shrink-0 border ${
                            isLocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isLocked
                            ? t('production.cast.lockedStatus', 'Đã khóa')
                            : t('production.cast.pendingStatus', 'Chờ khóa')}
                        </span>
                      </div>

                      {char.description && (
                        <div className='mt-2 pt-2 border-t border-stone-200/60 text-xs text-stone-600 space-y-1'>
                          <p className='line-clamp-2 leading-relaxed'>{char.description}</p>
                          <div className='flex items-center justify-between pt-0.5'>
                            <span className='text-[#EA580C] font-semibold text-xs flex items-center gap-0.5'>
                              <span>{t('common.details', 'Chi tiết')}</span>
                              <ArrowRight className='w-3 h-3' />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUẦN CHÚNG & EXTRAS */}
          {crowdCharacters.length > 0 && (
            <div className='pt-3 border-t-2 border-dashed border-stone-200/80 space-y-2.5'>
              <div className='flex items-center justify-between px-0.5 select-none'>
                <div className='flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-stone-400' />
                  <span className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                    {t('collaboration.writerStudio.crowdAndExtras', 'QUẦN CHÚNG & EXTRAS')}
                  </span>
                </div>
                <span className='px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200'>
                  {t('collaboration.writerStudio.exemptGate1', 'Miễn trừ Gate 1')}
                </span>
              </div>

              <div className='space-y-2'>
                {crowdCharacters.map((crowd) => (
                  <div
                    key={crowd.id}
                    onClick={() => onSelectEntity?.(crowd)}
                    className='bg-white border border-stone-200/80 rounded-lg p-2.5 space-y-1 hover:border-[#EA580C]/30 transition-all cursor-pointer'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-headline-sm text-xs font-bold text-stone-900'>
                        {crowd.name}
                      </span>
                      <span className='px-1.5 py-0.2 rounded text-xs font-medium bg-stone-100 text-stone-500'>
                        {t('collaboration.writerStudio.exemptLock', 'Miễn trừ khóa')}
                      </span>
                    </div>
                    {crowd.description && (
                      <p className='text-xs text-stone-500 line-clamp-2'>{crowd.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subpanel 2: Toàn bộ */}
      {subTab === 'all' && (
        <div id='bible-subpanel-all' className='flex-1 overflow-y-auto p-3 space-y-3'>
          <div className='relative flex items-center bg-[#FAF9F5] border border-stone-200/80 rounded-lg px-2.5 py-1.5 focus-within:border-[#EA580C] transition-colors'>
            <Search className='w-3.5 h-3.5 text-stone-400 mr-1.5 shrink-0' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('production.cast.searchCharacter', 'Tìm nhân vật & thực thể...')}
              className='w-full bg-transparent text-xs text-stone-900 border-none focus:outline-none'
            />
          </div>

          <div className='space-y-2 text-xs'>
            {filteredAllEntries.length === 0 ? (
              <p className='text-xs text-stone-400 py-4 text-center'>
                {t('common.noResults', 'Không tìm thấy kết quả')}
              </p>
            ) : (
              filteredAllEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntity?.(entry)}
                  className='p-2.5 bg-white border border-stone-200/80 rounded-lg hover:border-[#EA580C]/40 cursor-pointer transition-colors shadow-2xs'
                >
                  <div className='flex justify-between items-center'>
                    <strong className='text-stone-900 flex items-center gap-1.5'>
                      {getEntityIcon(entry.category)}
                      <span>{entry.name}</span>
                    </strong>
                    <span className='text-xs text-[#EA580C] font-bold capitalize'>
                      {entry.category || 'Character'}
                    </span>
                  </div>
                  {entry.subtitle && (
                    <p className='text-xs text-stone-500 mt-0.5 truncate'>{entry.subtitle}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
