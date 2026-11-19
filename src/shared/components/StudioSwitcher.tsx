import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronDown, Plus, Check, Grid, Building2, Users, Loader2 } from 'lucide-react';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';
import { normalizeWorkspaceRole } from '@/types/auth';
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
      setWorkspaces(list || []);
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
          className='absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-stone-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left'
        >
          {/* Header */}
          <div className='px-4 py-2.5 border-b border-stone-100 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Building2 className='w-4 h-4 text-orange-600' />
              <span className='text-xs font-bold text-stone-900'>Không gian Studio của bạn</span>
            </div>
            <span className='text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold'>
              {workspaces.length} Studio
            </span>
          </div>

          {/* Studio List */}
          <div className='max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-1'>
            {loading && workspaces.length === 0 ? (
              <div className='py-6 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs'>
                <Loader2 className='w-4 h-4 animate-spin text-orange-600' />
                <span>Đang tải danh sách Studio...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className='py-6 px-4 text-center text-xs text-stone-500'>
                Bạn chưa tham gia Studio nào.
              </div>
            ) : (
              workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                const roleName =
                  normalizeWorkspaceRole(ws.currentUserRole) ||
                  (ws.isOwner ? 'PRODUCER' : 'MEMBER');

                return (
                  <button
                    key={ws.id}
                    type='button'
                    data-testid={`studio-option-${ws.id}`}
                    onClick={() => handleSelect(ws)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-50 border border-orange-200 text-stone-900 shadow-2xs'
                        : 'hover:bg-stone-50 text-stone-800 border border-transparent'
                    }`}
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActive
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-bold text-stone-900 truncate'>
                            {ws.name}
                          </span>
                          <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 shrink-0 uppercase'>
                            {roleName}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-[11px] text-stone-500 mt-0.5'>
                          <span className='flex items-center gap-1'>
                            <Users className='w-3 h-3' />
                            {ws.memberCount ?? 1} thành viên
                          </span>
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className='w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs'>
                        <Check className='w-3.5 h-3.5 stroke-[2.5]' />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className='pt-2 mt-1 border-t border-stone-100 px-2 space-y-1'>
            <button
              type='button'
              data-testid='studio-switcher-create-btn'
              onClick={handleCreateNew}
              className='w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-orange-700 hover:text-orange-800 hover:bg-orange-50 transition-colors cursor-pointer'
            >
              <Plus className='w-4 h-4' />
              <span>+ Tạo Studio mới</span>
            </button>
            <button
              type='button'
              data-testid='studio-switcher-view-all-btn'
              onClick={handleViewAll}
              className='w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer'
            >
              <Grid className='w-3.5 h-3.5' />
              <span>Xem tất cả Studio (/workspaces)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
