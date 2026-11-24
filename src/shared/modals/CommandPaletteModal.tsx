import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  Kanban,
  BookOpen,
  Layers,
  FileText,
  LayoutTemplate,
  Type,
  UploadCloud,
  Bell,
  History,
  ArrowRight,
  BookMarked,
  FolderOpen,
  Sparkles,
  X,
} from 'lucide-react';
import { ViewMode, KanbanCard, BibleEntity } from '@/types';
import { seriesService, SeriesDto } from '@/services/series.service';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: ViewMode | string) => void;
  onSelectCard: (card: KanbanCard) => void;
  onSelectEntity: (entity: BibleEntity) => void;
  cards: KanbanCard[];
  entities: BibleEntity[];
  workspaceId?: string;
  seriesId?: string;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  viewKey?: ViewMode | string;
  path?: string;
  color: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  onSelectCard,
  onSelectEntity,
  cards,
  entities,
  workspaceId: propWorkspaceId,
  seriesId: propSeriesId,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Lấy workspace ID đang hoạt động
  const activeWorkspaceId = useMemo(() => {
    if (propWorkspaceId) return propWorkspaceId;
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) return JSON.parse(saved)?.id || undefined;
    } catch {
      // ignore
    }
    return undefined;
  }, [propWorkspaceId]);

  // Lấy series ID đang hoạt động
  const activeSeriesId = useMemo(() => {
    if (propSeriesId) return propSeriesId;
    try {
      const saved = localStorage.getItem('activeProject');
      if (saved) return JSON.parse(saved)?.id || undefined;
    } catch {
      // ignore
    }
    return undefined;
  }, [propSeriesId]);

  // Nạp danh sách Series và Workspaces từ Backend API khi modal mở
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    let isMounted = true;
    const fetchApiData = async () => {
      setIsSearchingApi(true);
      try {
        const ws = await workspaceService.getMyWorkspaces();
        if (isMounted) setWorkspaces(ws || []);

        const targetWsId = activeWorkspaceId || ws?.[0]?.id;
        if (targetWsId) {
          const s = await seriesService.getSeriesList(targetWsId);
          if (isMounted) setSeriesList(s || []);
        }
      } catch (err) {
        console.warn('Failed to load global search data:', err);
      } finally {
        if (isMounted) setIsSearchingApi(false);
      }
    };

    void fetchApiData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeWorkspaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: t('common.modals.commandPalette.nav.dashboardLabel'),
        description: t('common.modals.commandPalette.nav.dashboardDesc'),
        icon: LayoutGrid,
        viewKey: 'dashboard',
        color: 'text-[#F97316]',
      },
      {
        id: 'workflow',
        label: t('common.modals.commandPalette.nav.workflowLabel'),
        description: t('common.modals.commandPalette.nav.workflowDesc'),
        icon: Kanban,
        viewKey: 'workspace',
        color: 'text-[#0EA5E9]',
      },
      {
        id: 'my-work',
        label: t('common.modals.commandPalette.nav.myWorkLabel'),
        description: t('common.modals.commandPalette.nav.myWorkDesc'),
        icon: Layers,
        viewKey: 'my-work',
        color: 'text-[#8B5CF6]',
      },
      {
        id: 'script',
        label: t('common.modals.commandPalette.nav.scriptLabel'),
        description: t('common.modals.commandPalette.nav.scriptDesc'),
        icon: FileText,
        viewKey: 'script',
        color: 'text-[#10B981]',
      },
      {
        id: 'artist',
        label: t('common.modals.commandPalette.nav.artistLabel'),
        description: t('common.modals.commandPalette.nav.artistDesc'),
        icon: LayoutTemplate,
        viewKey: 'artist',
        color: 'text-[#EC4899]',
      },
      {
        id: 'letterer',
        label: t('common.modals.commandPalette.nav.lettererLabel'),
        description: t('common.modals.commandPalette.nav.lettererDesc'),
        icon: Type,
        viewKey: 'letterer',
        color: 'text-[#6366F1]',
      },
      {
        id: 'bible',
        label: t('common.modals.commandPalette.nav.bibleLabel'),
        description: t('common.modals.commandPalette.nav.bibleDesc'),
        icon: BookOpen,
        viewKey: 'bible',
        color: 'text-[#F59E0B]',
      },
      {
        id: 'publishing',
        label: t('common.modals.commandPalette.nav.publishingLabel'),
        description: t('common.modals.commandPalette.nav.publishingDesc'),
        icon: UploadCloud,
        viewKey: 'publishing',
        color: 'text-[#14B8A6]',
      },
      {
        id: 'notifications',
        label: t('common.modals.commandPalette.nav.notificationsLabel'),
        description: t('common.modals.commandPalette.nav.notificationsDesc'),
        icon: Bell,
        path: '/notifications',
        color: 'text-[#F97316]',
      },
    ],
    [t],
  );

  const filteredNavItems = useMemo(() => {
    if (!query) return navItems.slice(0, 5);
    const q = query.toLowerCase();
    return navItems.filter(
      (n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    );
  }, [navItems, query]);

  // Lọc danh sách Series từ API
  const filteredSeries = useMemo(() => {
    if (!query) return seriesList.slice(0, 3);
    const q = query.toLowerCase();
    return seriesList.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.synopsis && s.synopsis.toLowerCase().includes(q)) ||
        (s.genre && s.genre.toLowerCase().includes(q)),
    );
  }, [seriesList, query]);

  // Lọc Trang truyện (Cards)
  const filteredCards = useMemo(() => {
    if (!query) return cards.slice(0, 3);
    const q = query.toLowerCase();
    return cards
      .filter(
        (c) =>
          c.pageNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.stage.toLowerCase().includes(q),
      )
      .slice(0, 4);
  }, [cards, query]);

  // Lọc Nhân vật & Lore (Entities)
  const filteredEntities = useMemo(() => {
    if (!query) return entities.slice(0, 3);
    const q = query.toLowerCase();
    return entities
      .filter((e) => e.name.toLowerCase().includes(q) || e.subtitle.toLowerCase().includes(q))
      .slice(0, 3);
  }, [entities, query]);

  const handleSelectSeries = (s: SeriesDto) => {
    onClose();
    navigate(`/workspaces/${s.workspaceId}/series/${s.id}/dashboard`);
  };

  const handleSelectNav = (item: NavItem) => {
    if (item.path) {
      onClose();
      navigate(item.path);
    } else if (item.viewKey) {
      if (!activeWorkspaceId || !activeSeriesId) return;
      onClose();
      onNavigateView(item.viewKey);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='lg'
      title={t('common.modals.commandPalette.title')}
    >
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col'>
        {/* Search Input Bar */}
        <div className='p-3.5 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center gap-3'>
          <Search className='w-5 h-5 text-[#78716C] shrink-0' />
          <input
            type='text'
            placeholder={t('common.modals.commandPalette.searchPlaceholder')}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            className='w-full text-sm text-[#1C1917] placeholder-[#78716C] bg-transparent focus:outline-none font-sans'
          />
          {query && (
            <button
              type='button'
              onClick={() => setQuery('')}
              className='text-xs text-[#78716C] hover:text-[#1C1917] p-1'
            >
              <X className='w-4 h-4' />
            </button>
          )}
          <span className='text-xs font-mono text-[#78716C] bg-[#EFECE6] px-1.5 py-0.5 rounded border border-[#D8D2C5] shrink-0'>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className='p-2.5 max-h-[460px] overflow-y-auto space-y-3 custom-scrollbar text-xs'>
          {/* Quick Navigation Views */}
          {filteredNavItems.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#78716C]'>
                {t('common.modals.commandPalette.navSection')}
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isContextRequired = Boolean(item.viewKey);
                  const isDisabled = isContextRequired && (!activeWorkspaceId || !activeSeriesId);
                  return (
                    <button
                      key={item.id}
                      type='button'
                      disabled={isDisabled}
                      onClick={() => handleSelectNav(item)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-[#1C1917] transition-colors group ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed bg-transparent'
                          : 'hover:bg-[#F3F0E9] cursor-pointer'
                      }`}
                    >
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                        <div className='truncate'>
                          <span className='font-semibold text-xs block text-[#1C1917]'>
                            {item.label}
                          </span>
                          <span className='text-[11px] text-[#78716C] truncate block'>
                            {item.description}
                          </span>
                        </div>
                      </div>
                      {isDisabled ? (
                        <span className='text-[10px] text-[#A8A29E] shrink-0 ml-2'>
                          {t('common.modals.commandPalette.needSeries')}
                        </span>
                      ) : (
                        <span className='text-[10px] font-mono text-[#78716C] group-hover:text-[#F97316] shrink-0 ml-2'>
                          {t('common.modals.commandPalette.openKey')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Series from Live API */}
          {filteredSeries.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#78716C] flex items-center justify-between'>
                <span>{t('common.modals.commandPalette.seriesSection')}</span>
                {isSearchingApi && (
                  <span className='text-[10px] text-[#F97316]'>
                    {t('common.modals.commandPalette.loadingApi')}
                  </span>
                )}
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredSeries.map((series) => (
                  <button
                    key={series.id}
                    type='button'
                    onClick={() => handleSelectSeries(series)}
                    className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F3F0E9] flex items-center justify-between text-[#1C1917] transition-colors cursor-pointer group'
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <BookMarked className='w-4 h-4 text-[#F97316] shrink-0' />
                      <div className='truncate'>
                        <span className='font-semibold text-xs block text-[#1C1917] truncate'>
                          {series.title}
                        </span>
                        <span className='text-[11px] text-[#78716C] truncate block'>
                          {series.genre || 'Manga'} • {series.format || 'Standard B5'} •{' '}
                          {t('common.modals.commandPalette.chaptersCount', {
                            count: series.chaptersCount || 0,
                          })}
                        </span>
                      </div>
                    </div>
                    <span className='text-[10px] font-mono text-[#78716C] group-hover:text-[#F97316] shrink-0 ml-2'>
                      {t('common.modals.commandPalette.enterSeries')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Storyboard Pages */}
          {filteredCards.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#78716C]'>
                {t('common.modals.commandPalette.pagesSection')}
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredCards.map((card) => (
                  <button
                    key={card.id}
                    type='button'
                    onClick={() => {
                      onSelectCard(card);
                      onClose();
                    }}
                    className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F3F0E9] flex items-center justify-between text-[#1C1917] transition-colors cursor-pointer'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      <span className='px-1.5 py-0.5 bg-[#EAE5DC] rounded text-xs font-mono font-bold text-[#1C1917]'>
                        {card.pageNumber}
                      </span>
                      <span className='truncate text-xs font-medium text-[#1C1917]'>
                        {card.title}
                      </span>
                    </div>
                    <span className='text-[10px] font-mono uppercase text-[#78716C] shrink-0 ml-2'>
                      {card.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Lore & Cast Entities */}
          {filteredEntities.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#78716C]'>
                {t('common.modals.commandPalette.entitiesSection')}
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredEntities.map((ent) => (
                  <button
                    key={ent.id}
                    type='button'
                    onClick={() => {
                      onSelectEntity(ent);
                      onClose();
                    }}
                    className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F3F0E9] flex items-center justify-between text-[#1C1917] transition-colors cursor-pointer'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      <span className='w-2 h-2 rounded-full bg-[#10B981] shrink-0' />
                      <span className='font-semibold text-xs text-[#1C1917]'>{ent.name}</span>
                      <span className='text-[#78716C] text-[11px] truncate'>({ent.subtitle})</span>
                    </div>
                    <span className='text-[10px] font-mono text-[#8B5CF6] shrink-0 ml-2'>
                      LoRA {ent.loraWeight}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className='p-3 bg-[#F8F6F0] border-t border-[#D8D2C5] text-[11px] text-[#78716C] font-mono flex items-center justify-between'>
          <span>
            {t('common.modals.commandPalette.footerUseKeys')}
            <strong>↑↓</strong>
            {t('common.modals.commandPalette.footerToBrowse')}
            <strong>Enter</strong>
            {t('common.modals.commandPalette.footerToSelect')}
          </span>
          <span className='text-[#C2410C] font-bold'>PanelForge Studio Global</span>
        </div>
      </div>
    </Modal>
  );
};
