import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronDown, Plus, Check, Grid, Building2, Users, Loader2 } from 'lucide-react';
import { workspaceService } from '@/services/workspace.service';
import { WorkspaceDto, normalizeWorkspaceRole } from '@/types';
import { useTranslation } from '@/lib/i18n';

export interface StudioSwitcherProps {
  activeWorkspaceId?: string;
  activeWorkspaceName?: string;
  className?: string;
  onCreateNewStudio?: () => void;
  onSelectStudio?: (workspace: WorkspaceDto) => void;
}

export const StudioSwitcher: React.FC<StudioSwitcherProps> = ({
  activeWorkspaceId,
  activeWorkspaceName,
  className = '',
  onCreateNewStudio,
  onSelectStudio,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Load user's studios when dropdown opens
  const fetchWorkspaces = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await workspaceService.getMyWorkspaces();
      const mapped: WorkspaceDto[] = (list || []).map((ws) => ({
        ...ws,
        currentUserRole: normalizeWorkspaceRole(ws.currentUserRole),
      }));
      setWorkspaces(mapped);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && workspaces.length === 0) {
      void fetchWorkspaces();
    }
  }, [isOpen, workspaces.length, fetchWorkspaces]);

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const displayName = activeWorkspaceName || currentWorkspace?.name || 'Studio Workspace';

  const handleSelect = (ws: WorkspaceDto) => {
    setIsOpen(false);
    localStorage.setItem('activeWorkspaceId', ws.id);
    if (onSelectStudio) {
      onSelectStudio(ws);
    } else {
      navigate(`/workspaces/${ws.id}`);
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateNewStudio) {
      onCreateNewStudio();
    } else {
      navigate('/workspaces?create=true');
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/workspaces');
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type='button'
        data-testid='studio-switcher-trigger'
        aria-haspopup='true'
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen && workspaces.length === 0) {
            void fetchWorkspaces();
          }
          setIsOpen(!isOpen);
        }}
        className='group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/80 hover:border-orange-300 text-stone-900 shadow-2xs transition-all cursor-pointer select-none max-w-[280px] sm:max-w-[340px]'
        title={t('navigation.header.switchStudio', 'Chuyển đổi Studio làm việc')}
      >
        <span className='w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0'>
          <Building2 className='w-3.5 h-3.5' />
        </span>
        <div className='flex items-center gap-1.5 min-w-0 text-left'>
          <span className='text-xs font-semibold text-stone-500 uppercase tracking-wider shrink-0 hidden sm:inline'>
            Studio
          </span>
          <span className='text-xs font-bold text-stone-900 truncate'>{displayName}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-orange-600' : 'group-hover:text-stone-800'
          }`}
        />
      </button>

      {/* Flyout Popover */}
      {isOpen && (
        <div
          data-testid='studio-switcher-dropdown'
          className='absolute left-0 mt-2 w-80 sm:w-88 rounded-xl bg-white border border-stone-200 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 origin-top-left'
        >
          {/* Header */}
          <div className='px-3.5 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between border-b border-stone-100 pb-2 mb-1'>
            <span>{t('common.components.studioSwitcher.headerTitle')}</span>
            <span className='text-[10px] text-stone-500 font-normal'>
              {workspaces.length} Studio
            </span>
          </div>

          {/* Studio List */}
          <div className='max-h-72 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-1 py-1'>
            {loading && workspaces.length === 0 ? (
              <div className='py-6 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs'>
                <Loader2 className='w-4 h-4 animate-spin text-orange-600' />
                <span>{t('common.components.studioSwitcher.loading')}</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className='py-6 px-4 text-center text-xs text-stone-500'>
                {t('common.components.studioSwitcher.empty')}
              </div>
            ) : (
              workspaces.map((ws, idx) => {
                const isActive = ws.id === activeWorkspaceId;
                const rawRole =
                  normalizeWorkspaceRole(ws.currentUserRole) ||
                  (ws.isOwner ? 'PRODUCER' : 'MEMBER');
                const isProd = rawRole === 'PRODUCER' || ws.isOwner;
                const isEd = rawRole === 'EDITOR';
                const roleBadgeText = isProd ? 'Producer' : isEd ? 'Editor' : rawRole;
                const roleBadgeClass = isProd
                  ? 'bg-orange-100 text-orange-700'
                  : isEd
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-stone-100 text-stone-700';

                const icons = ['🏢', '🖋️', '🎨', '⚡', '⛩️'];
                const studioIcon = icons[idx % icons.length];

                return (
                  <button
                    key={ws.id}
                    type='button'
                    data-testid={`studio-option-${ws.id}`}
                    onClick={() => handleSelect(ws)}
                    className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-orange-50/80 text-stone-900 font-medium'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className='w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm shrink-0'>
                        {studioIcon}
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <span className='font-semibold text-stone-900 truncate'>{ws.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${roleBadgeClass}`}
                          >
                            {roleBadgeText}
                          </span>
                        </div>
                        <p className='text-[11px] text-stone-500 mt-0.5 truncate'>
                          {t('common.components.studioSwitcher.stats', {
                            seriesCount: ws.seriesCount ?? 0,
                            memberCount: ws.memberCount ?? 1,
                          })}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Check className='w-4 h-4 text-orange-600 shrink-0 ml-2 stroke-[2.5]' />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className='my-1.5 border-t border-stone-100' />
          <div className='px-2 flex flex-col gap-1'>
            <button
              type='button'
              data-testid='studio-switcher-create-btn'
              onClick={handleCreateNew}
              className='w-full px-2.5 py-2 text-left flex items-center gap-2 text-orange-600 hover:bg-orange-50 font-medium rounded-lg cursor-pointer transition-colors'
            >
              <Plus className='w-4 h-4' />
              <span>{t('common.components.studioSwitcher.createNew')}</span>
            </button>
            <button
              type='button'
              data-testid='studio-switcher-view-all-btn'
              onClick={handleViewAll}
              className='w-full px-2.5 py-2 text-left flex items-center gap-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-medium rounded-lg cursor-pointer transition-colors'
            >
              <Grid className='w-4 h-4 text-stone-400' />
              <span>{t('common.components.studioSwitcher.viewAll')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
