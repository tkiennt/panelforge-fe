import React from 'react';
import {
  Search,
  Bell,
  Download,
  Calendar,
  Sparkles,
  User,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { ViewMode, MangaProject } from '../types';

interface HeaderProps {
  currentView: ViewMode;
  activeProject: MangaProject;
  onReturnToHub: () => void;
  onOpenCommandPalette: () => void;
  onOpenAiEngineModal: () => void;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeProject,
  onReturnToHub,
  onOpenCommandPalette,
  onOpenAiEngineModal,
  onOpenExportModal,
}) => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Chapter 5 Pipeline';
      case 'workflow':
        return 'Chapter 5 Pipeline';
      case 'bible':
        return 'Series Bible Repository';
      case 'members':
        return 'Members & RBAC Control';
      case 'publications':
        return 'Manga Series & Publications';
      default:
        return 'Production Hub';
    }
  };

  return (
    <header className='h-16 bg-white border-b border-[#E7E7E7] px-6 md:px-8 flex items-center justify-between shrink-0 z-20 sticky top-0 shadow-2xs'>
      {/* Return Button & Breadcrumbs */}
      <div className='flex items-center gap-3 md:gap-4'>
        {/* Prominent Return Button */}
        <button
          onClick={onReturnToHub}
          className='flex items-center gap-1.5 bg-[#171717] hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer group active:scale-95 shrink-0'
          title='Return to Publications Hub (All Projects)'
        >
          <ArrowLeft className='w-3.5 h-3.5 text-[#F97316] group-hover:-translate-x-0.5 transition-transform' />
          <span className='hidden sm:inline'>Return to Publications Hub</span>
          <span className='sm:hidden'>Hub</span>
        </button>

        <div className='h-4 w-[1px] bg-[#E7E7E7] hidden sm:block'></div>

        <div className='flex items-center gap-2 text-xs'>
          <button
            onClick={onReturnToHub}
            className='font-display font-semibold text-[#888888] hover:text-[#171717] cursor-pointer transition-colors'
          >
            Publications Hub
          </button>
          <span className='text-[#888888] font-mono'>/</span>
          <span className='font-display font-semibold text-[#171717] hover:text-[#F97316] cursor-pointer transition-colors truncate max-w-[140px] md:max-w-[200px]'>
            {activeProject.title.split(':')[0]}
          </span>
          <span className='text-[#888888] font-mono'>/</span>
          <span className='font-medium text-[#555555] hidden md:inline'>{getViewTitle()}</span>
        </div>

        <div className='hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-medium border border-[#10B981]/30'>
          <span className='w-1.5 h-1.5 rounded-full bg-[#10B981]'></span>
          IN PRODUCTION
        </div>

        <div className='hidden md:flex items-center gap-1.5 text-xs text-[#888888]'>
          <Calendar className='w-3.5 h-3.5 text-[#888888]' />
          <span>Due {activeProject.dueDate.split(',')[0]}</span>
        </div>
      </div>

      {/* Center-Right Quick Search & Actions */}
      <div className='flex items-center gap-3'>
        {/* Global Search Bar (opens Command Palette) */}
        <div onClick={onOpenCommandPalette} className='relative w-48 sm:w-64 cursor-pointer group'>
          <Search className='w-3.5 h-3.5 text-[#888888] group-hover:text-[#171717] absolute left-3 top-1/2 -translate-y-1/2 transition-colors' />
          <div className='w-full pl-9 pr-12 py-1.5 bg-[#F8F6F0] group-hover:bg-white border border-[#E7E7E7] group-hover:border-[#F97316] rounded-lg text-xs text-[#888888] transition-all flex items-center justify-between'>
            <span className='truncate'>Search cuts, panels, notes...</span>
          </div>
          <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#888888] bg-white px-1.5 py-0.5 rounded border border-[#E7E7E7] shadow-2xs'>
            ⌘K
          </span>
        </div>

        {/* AI Engine Status Pill */}
        <button
          onClick={onOpenAiEngineModal}
          className='hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3E8FF] border border-[#8B5CF6]/30 text-[#6D28D9] text-xs font-medium cursor-pointer hover:bg-[#8B5CF6]/20 transition-all active:scale-95'
          title='Click to view AI Engine Continuity and Model Vector Specs'
        >
          <span className='w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse'></span>
          <span className='font-semibold text-[11px] font-mono'>AI Engine: Active</span>
        </button>

        {/* Notifications Button */}
        <div className='relative'>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className='w-8 h-8 rounded-lg border border-[#E7E7E7] bg-white hover:bg-[#F8F6F0] flex items-center justify-center text-[#555555] hover:text-[#171717] transition-colors relative cursor-pointer'
            aria-label='Notifications'
          >
            <Bell className='w-4 h-4' />
            <span className='w-2 h-2 rounded-full bg-[#F97316] absolute top-1.5 right-1.5 ring-2 ring-white'></span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className='absolute right-0 top-10 w-80 bg-white border border-[#E7E7E7] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150'>
              <div className='flex items-center justify-between pb-2 mb-2 border-b border-[#E7E7E7]'>
                <span className='text-xs font-bold text-[#171717]'>Recent Production Alerts</span>
                <span className='text-[10px] font-mono bg-[#FFF7ED] text-[#F97316] px-1.5 py-0.5 rounded font-semibold'>
                  3 New
                </span>
              </div>
              <div className='space-y-2 text-xs'>
                <div className='p-2 rounded-lg bg-[#F8F6F0] hover:bg-white border border-[#E7E7E7] transition-colors'>
                  <div className='flex items-center justify-between text-[10px] text-[#888888] font-mono'>
                    <span className='text-[#8B5CF6] font-semibold'>AI LoRA Assist</span>
                    <span>10m ago</span>
                  </div>
                  <p className='text-[#171717] font-medium text-[11px] mt-0.5'>
                    Page 12 dialogue bubble autofit verified with zero overflow.
                  </p>
                </div>

                <div className='p-2 rounded-lg bg-[#F8F6F0] hover:bg-white border border-[#E7E7E7] transition-colors'>
                  <div className='flex items-center justify-between text-[10px] text-[#888888] font-mono'>
                    <span className='text-[#F97316] font-semibold'>Inker Submission</span>
                    <span>25m ago</span>
                  </div>
                  <p className='text-[#171717] font-medium text-[11px] mt-0.5'>
                    Kenji S. uploaded 600 DPI spread for Page 12 review.
                  </p>
                </div>

                <div className='p-2 rounded-lg bg-[#F8F6F0] hover:bg-white border border-[#E7E7E7] transition-colors'>
                  <div className='flex items-center justify-between text-[10px] text-[#888888] font-mono'>
                    <span className='text-[#059669] font-semibold'>Editorial Sign-Off</span>
                    <span>4h ago</span>
                  </div>
                  <p className='text-[#171717] font-medium text-[11px] mt-0.5'>
                    Chief Editor Tanaka approved Page 06 inks & lettering.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Action Button */}
        <button
          onClick={onOpenExportModal}
          className='px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95'
        >
          <Download className='w-3.5 h-3.5' />
          <span>Export</span>
        </button>

        {/* Avatar Menu */}
        <div
          onClick={onOpenAiEngineModal}
          className='w-8 h-8 rounded-full bg-[#171717] text-white text-xs font-bold flex items-center justify-center ring-1 ring-[#E7E7E7] cursor-pointer hover:ring-2 hover:ring-[#F97316] transition-all'
          title='Tatsuki F. (Lead Producer)'
        >
          <User className='w-4 h-4' />
        </div>
      </div>
    </header>
  );
};
