// src/roles/writer/components/script/BibleCharactersDrawer.tsx
import React, { useState } from 'react';
import { User, Search, X } from 'lucide-react';
import { BibleEntryDto, bibleService } from '@/services/bible.service';
import { ChapterCastDto, chapterCastService } from '@/services/chapterCast.service';
import { useTranslation } from '@/lib/i18n';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';

interface BibleCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: BibleEntryDto[];
  seriesId?: string;
  canEditScript?: boolean;
  onRefreshBible?: () => Promise<void>;
  onShowToast?: (title: string, description?: string) => void;
  chapterCast?: ChapterCastDto | null;
  onJumpToLine?: (lineId: string) => void;
  onJumpToPanel?: (pageNumber?: number | null, panelNumber?: number | null) => void;
  t?: (key: string, fallbackOrParams?: any, explicitFallback?: string) => string;
}

export const BibleCharactersDrawer: React.FC<BibleCharactersDrawerProps> = ({
  isOpen,
  onClose,
  characters,
  seriesId,
  canEditScript = true,
  onRefreshBible,
  onShowToast,
  chapterCast,
  onJumpToLine,
  onJumpToPanel,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    if (propT) return propT(key, fallbackOrParams, explicitFallback);
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = characters.filter((c) =>
    searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true,
  );

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

      if (onRefreshBible) {
        await onRefreshBible();
      }

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
    <div
      data-testid='bible-characters-drawer'
      className='w-full xl:w-[420px] 2xl:w-[460px] shrink-0 border-l border-stone-200/90 bg-[#FAF9F5] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200 text-stone-900'
    >
      {/* Drawer Header */}
      <div className='p-4 border-b border-stone-200/80 bg-white flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-orange-100/70 text-orange-600 rounded-xl shrink-0 border border-orange-200/50'>
            <User className='w-4 h-4' />
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
            </p>
          </div>
        </div>

        <button
          type='button'
          onClick={onClose}
          className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors'
          title={t('common.close', 'Đóng')}
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Search Input */}
      {characters.length > 2 && (
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
      )}

      {/* Characters List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
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
            const castEntity = chapterCast?.entities?.find((e) => e.bibleEntryId === char.id);
            const accordionEntity: BibleAccordionEntity = {
              id: char.id,
              name: char.name,
              code: char.code,
              category: char.category,
              subtitle: char.subtitle,
              description: char.description,
              detailsJson: char.detailsJson,
              isStub: char.isStub,
              isCrowd: char.isCrowd,
              isCanonLocked: char.effectiveRevision?.isLocked ?? false,
              bibleStatus: char.effectiveRevision?.isLocked
                ? 'CanonLocked'
                : char.effectiveRevision?.reviewStatus || 'Draft',
              mentions: castEntity?.mentions,
            };

            return (
              <BibleEntryAccordionItem
                key={char.id}
                entity={accordionEntity}
                isOpen={expandedEntryId === char.id}
                onToggle={() => setExpandedEntryId((prev) => (prev === char.id ? null : char.id))}
                canEditScript={canEditScript}
                seriesId={seriesId}
                onSaveDraft={handleSaveDraft}
                onJumpToLine={onJumpToLine}
                onJumpToPanel={onJumpToPanel}
                t={t}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
