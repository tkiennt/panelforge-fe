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
        console.warn('Không thể nạp dữ liệu tìm kiếm toàn cục:', err);
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
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard sản xuất',
        description: 'Tổng quan tiến độ Chapter & Burndown',
        icon: LayoutGrid,
        viewKey: 'dashboard',
        color: 'text-[#F97316]',
      },
      {
        id: 'workflow',
        label: 'Bảng quy trình (Pipeline Board)',
        description: '8 công đoạn sản xuất truyện tranh',
        icon: Kanban,
        viewKey: 'workspace',
        color: 'text-[#0EA5E9]',
      },
      {
        id: 'my-work',
        label: 'Công việc của tôi & Xét duyệt',
        description: 'Nhiệm vụ được giao và yêu cầu sửa',
        icon: Layers,
        viewKey: 'my-work',
        color: 'text-[#8B5CF6]',
      },
      {
        id: 'script',
        label: 'Kịch bản (Script Editor)',
        description: 'Biên tập phân cảnh và thoại nhân vật',
        icon: FileText,
        viewKey: 'script',
        color: 'text-[#10B981]',
      },
      {
        id: 'artist',
        label: 'Bàn vẽ & Khung trang (Artist Desk)',
        description: 'Phác thảo, Inking, Bố cục trang B5',
        icon: LayoutTemplate,
        viewKey: 'artist',
        color: 'text-[#EC4899]',
      },
      {
        id: 'letterer',
        label: 'Chèn chữ & Bóng thoại (Letterer Desk)',
        description: 'Bóng thoại SFX và phông chữ Manga',
        icon: Type,
        viewKey: 'letterer',
        color: 'text-[#6366F1]',
      },
      {
        id: 'bible',
        label: 'Series Bible Repository',
        description: 'Kho tri thức bối cảnh, nhân vật & LoRA',
        icon: BookOpen,
        viewKey: 'bible',
        color: 'text-[#F59E0B]',
      },
      {
        id: 'publishing',
        label: 'Xuất bản & Pre-Press (B5 Spec)',
        description: 'Kiểm tra in ấn và đóng gói xuất bản',
        icon: UploadCloud,
        viewKey: 'publishing',
        color: 'text-[#14B8A6]',
      },
      {
        id: 'notifications',
        label: 'Trung tâm thông báo (Notifications)',
        description: 'Xem tất cả thông báo công việc',
        icon: Bell,
        path: '/notifications',
        color: 'text-[#F97316]',
      },
    ],
    [],
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
    onClose();
    if (item.path) {
      navigate(item.path);
    } else if (item.viewKey) {
      onNavigateView(item.viewKey);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4'>
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col'>
        {/* Search Input Bar */}
        <div className='p-3.5 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center gap-3'>
          <Search className='w-5 h-5 text-[#78716C] shrink-0' />
          <input
            type='text'
            placeholder='Tìm kiếm Series, phân cảnh, trang truyện, nhân vật hoặc điều hướng...'
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
                Điều Hướng Nhanh (Navigation)
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => handleSelectNav(item)}
                      className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F3F0E9] flex items-center justify-between text-[#1C1917] transition-colors cursor-pointer group'
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
                      <span className='text-[10px] font-mono text-[#78716C] group-hover:text-[#F97316] shrink-0 ml-2'>
                        Mở ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Series từ Live API */}
          {filteredSeries.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#78716C] flex items-center justify-between'>
                <span>Danh Sách Series (Live API)</span>
                {isSearchingApi && <span className='text-[10px] text-[#F97316]'>Đang nạp...</span>}
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
                          {series.chaptersCount || 0} chương
                        </span>
                      </div>
                    </div>
                    <span className='text-[10px] font-mono text-[#78716C] group-hover:text-[#F97316] shrink-0 ml-2'>
                      Vào Series ↵
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
                Trang Truyện (Storyboard Pages)
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
                Nhân Vật &amp; Bối Cảnh (Series Bible)
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
            Dùng phím <strong>↑↓</strong> để duyệt, <strong>Enter</strong> để chọn
          </span>
          <span className='text-[#C2410C] font-bold'>PanelForge Studio Global</span>
        </div>
      </div>
    </div>
  );
};
