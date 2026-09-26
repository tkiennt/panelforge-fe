import React from 'react';
import {
  LayoutGrid,
  Kanban,
  BookOpen,
  Users,
  HardDrive,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Cpu,
  LogOut,
  Type,
} from 'lucide-react';
import { ViewMode, MangaProject, SystemRole } from '../types';

interface SidebarProps {
  currentView: ViewMode | string;
  onSelectView: (view: any) => void;
  activeProject?: MangaProject;
  projects?: MangaProject[];
  onSelectProject: (proj: MangaProject) => void;
  onReturnToHub: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenStorageModal: () => void;
  userRole?: SystemRole | string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeProject,
  projects = [],
  onSelectProject,
  onReturnToHub,
  onOpenSettings,
  onOpenHelp,
  onOpenStorageModal,
  userRole,
  onLogout,
}) => {
  const [projectMenuOpen, setProjectMenuOpen] = React.useState(false);

  return (
    <aside
      className='w-64 bg-[#F8F6F0] border-r-[1.5px] border-[#171717] shadow-none flex flex-col justify-between shrink-0 z-30 select-none h-screen'
      style={{ backgroundColor: '#FAF8F4' }}
    >
      <div className='flex flex-col'>
        {/* Brand Logo Header */}
        <div
          className='h-16 px-5 border-b border-[#E7E7E7] flex items-center justify-between bg-white cursor-pointer'
          onClick={() => onSelectView('dashboard')}
        >
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-bold text-sm tracking-tighter shadow-xs'>
              PF
            </div>
            <div>
              <div className='font-bold text-sm tracking-tight text-[#171717] flex items-center gap-1.5 font-display'>
                PANELFORGE
                <span className='text-[9px] font-mono px-1 py-0.2 bg-[#F3F1EB] text-[#555555] rounded border border-[#E0DED7]'>
                  AI
                </span>
              </div>
              <div className='text-[10px] text-[#888888] tracking-wide font-mono'>
                MANGA STUDIO AI
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Return to Publications Hub Button */}
        <div className='px-3 pt-3'>
          <button
            onClick={onReturnToHub}
            className='w-full px-3 py-2 bg-white hover:bg-[#F3F1EB] rounded-xl border border-[#E7E7E7] text-xs font-semibold text-[#171717] flex items-center justify-between group cursor-pointer shadow-2xs transition-all hover:border-[#F97316]'
            title='Return to Publications Hub (All Projects)'
          >
            <span className='flex items-center gap-2'>
              <ArrowLeft className='w-3.5 h-3.5 text-[#F97316] group-hover:-translate-x-1 transition-transform' />
              <span className='font-display font-bold'>Publications Hub</span>
            </span>
            <span className='text-[10px] font-mono text-[#888888] bg-[#F8F6F0] px-1.5 py-0.5 rounded border border-[#E7E7E7]'>
              Return
            </span>
          </button>
        </div>

        {/* User / Lead Profile Badge */}
        <div className='p-3 mx-3 my-2 bg-white rounded-xl border border-[#E7E7E7] shadow-xs flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-full bg-[#171717] text-white font-semibold text-xs flex items-center justify-center ring-2 ring-[#F97316]/30'>
              TF
            </div>
            <div className='overflow-hidden'>
              <div className='text-xs font-semibold text-[#171717] truncate'>Tatsuki F.</div>
              <div className='text-[10px] text-[#888888] truncate font-mono'>
                {userRole === 'PRODUCER' ? 'Lead Producer' : userRole}
              </div>
            </div>
          </div>
          <span className='text-[9px] font-mono font-semibold text-[#F97316] bg-[#FFF7ED] px-1.5 py-0.5 rounded border border-[#FDBA74]/40'>
            {userRole === 'PRODUCER' ? 'LEAD' : 'MEMBER'}
          </span>
        </div>

        {/* Project Context Selector */}
        <div className='px-3 mb-3 relative'>
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className='w-full text-left px-3 py-2.5 bg-white hover:bg-[#FFFEFA] rounded-xl border border-[#E7E7E7] shadow-xs transition-colors flex items-center justify-between group cursor-pointer'
          >
            <div className='overflow-hidden'>
              <div className='text-xs font-bold text-[#171717] flex items-center gap-1.5 truncate'>
                <span className='w-2 h-2 rounded-full bg-[#F97316] animate-pulse shrink-0'></span>
                <span className='truncate'>{activeProject?.title || 'Chưa chọn dự án'}</span>
              </div>
              <div className='text-[10px] text-[#888888] truncate'>{activeProject?.subtitle || 'Vui lòng chọn hoặc tạo dự án'}</div>
            </div>
            <ChevronsUpDown className='w-3.5 h-3.5 text-[#888888] group-hover:text-[#171717] transition-colors shrink-0 ml-1' />
          </button>

          {/* Project Switcher Dropdown */}
          {projectMenuOpen && (
            <div className='absolute left-3 right-3 top-14 bg-white border border-[#E7E7E7] rounded-xl shadow-xl z-50 p-1.5 space-y-1'>
              <div className='px-2 py-1 text-[10px] font-bold text-[#888888] uppercase tracking-wider'>
                Select Active Manga Project
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    setProjectMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                    p.id === activeProject?.id
                      ? 'bg-[#FFF7ED] text-[#F97316] font-semibold'
                      : 'text-[#555555] hover:bg-[#F3F1EB] hover:text-[#171717]'
                  }`}
                >
                  <div className='truncate'>
                    <div className='truncate'>{p.title}</div>
                    <div className='text-[10px] text-[#888888] font-mono truncate'>{p.arc}</div>
                  </div>
                  <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E7E7E7]'>
                    {p.completedPages}/{p.totalPages}p
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <div className='px-3'>
          <div className='text-[10px] font-bold text-[#888888] uppercase tracking-wider px-3 mb-1.5'>
            Studio Workspace
          </div>
          <nav className='space-y-1'>
            {/* MENU CHO PRODUCER (Nhà sản xuất) */}
            {userRole === 'PRODUCER' && (
              <>
                <button
                  onClick={() => onSelectView('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'dashboard' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <LayoutGrid
                    className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Dashboard Tổng quan</span>
                </button>
                <button
                  onClick={() => onSelectView('workflow')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'workflow' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <Kanban
                    className={`w-4 h-4 ${currentView === 'workflow' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Production Pipeline</span>
                </button>
                <button
                  onClick={() => onSelectView('members')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'members' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <Users
                    className={`w-4 h-4 ${currentView === 'members' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Members & Roles (RBAC)</span>
                </button>
              </>
            )}

            {/* MENU CHO ARTIST (Họa sĩ) */}
            {userRole === 'ARTIST' && (
              <>
                <button
                  onClick={() => onSelectView('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'dashboard' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <LayoutGrid
                    className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Dashboard (Họa sĩ)</span>
                </button>
                <button
                  onClick={() => onSelectView('workflow')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'workflow' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <Kanban
                    className={`w-4 h-4 ${currentView === 'workflow' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Workflow Board</span>
                </button>
              </>
            )}

            {/* MENU CHO WRITER (Biên kịch) */}
            {userRole === 'WRITER' && (
              <>
                <button
                  onClick={() => onSelectView('script')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'script' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <BookOpen
                    className={`w-4 h-4 ${currentView === 'script' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Kịch bản & Lời thoại</span>
                </button>
              </>
            )}

            {/* MENU CHO EDITOR (Biên tập viên) */}
            {userRole === 'EDITOR' && (
              <>
                <button
                  onClick={() => onSelectView('review')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'review' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${currentView === 'review' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Trung tâm Phê duyệt</span>
                </button>
                <button
                  onClick={() => onSelectView('members')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'members' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <Users
                    className={`w-4 h-4 ${currentView === 'members' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Quản lý Nhân sự</span>
                </button>
              </>
            )}

            {/* MENU CHO ADMIN (Quản trị viên) */}
            {userRole === 'ADMINISTRATOR' && (
              <>
                <button
                  onClick={() => onSelectView('admin-dash')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    currentView === 'admin-dash'
                      ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]'
                      : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                  }`}
                >
                  <LayoutGrid
                    className={`w-4 h-4 ${currentView === 'admin-dash' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Bảng Điều Khiển Admin</span>
                </button>
                <button
                  onClick={() => onSelectView('users')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    currentView === 'users' || currentView === 'roles'
                      ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]'
                      : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                  }`}
                >
                  <Users
                    className={`w-4 h-4 ${currentView === 'users' || currentView === 'roles' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Quản Lý Người Dùng & RBAC</span>
                </button>
                <button
                  onClick={() => onSelectView('ai-quota')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    currentView === 'ai-quota' || currentView === 'storage'
                      ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]'
                      : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                  }`}
                >
                  <Cpu
                    className={`w-4 h-4 ${currentView === 'ai-quota' || currentView === 'storage' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Hạn Ngạch AI & Cấu Hình</span>
                </button>
                <button
                  onClick={() => onSelectView('audit')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    currentView === 'audit'
                      ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]'
                      : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                  }`}
                >
                  <Shield
                    className={`w-4 h-4 ${currentView === 'audit' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Nhật Ký Kiểm Toán (Audit)</span>
                </button>
              </>
            )}

            {/* MENU CHO LETTERER (Người lồng chữ) */}
            {userRole === 'LETTERER' && (
              <>
                <button
                  onClick={() => onSelectView('lettering')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'lettering' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
                >
                  <Type
                    className={`w-4 h-4 ${currentView === 'lettering' ? 'text-[#F97316]' : 'text-[#888888]'}`}
                  />
                  <span>Lồng chữ (Lettering)</span>
                </button>
              </>
            )}

            {/* MENU CHUNG CHO MỌI ROLE */}
            <button
              onClick={() => onSelectView('bible')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${currentView === 'bible' ? 'font-semibold bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316]' : 'font-medium text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'}`}
            >
              <BookOpen
                className={`w-4 h-4 ${currentView === 'bible' ? 'text-[#F97316]' : 'text-[#888888]'}`}
              />
              <span>Series Bible (Canon)</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Sidebar Bottom Utilities */}
      <div className='p-3 border-t border-[#E7E7E7] bg-white/80 space-y-3'>
        <div
          onClick={onOpenStorageModal}
          className='p-3 bg-[#F8F6F0] hover:bg-[#F3F1EB] rounded-lg border border-[#E7E7E7] cursor-pointer transition-colors'
        >
          <div className='flex items-center justify-between text-[11px] mb-1.5'>
            <span className='font-medium text-[#333333] flex items-center gap-1.5'>
              <HardDrive className='w-3 h-3 text-[#888888]' />
              Cloud Vault Spec
            </span>
            <span className='font-mono text-xs font-semibold text-[#F97316]'>78%</span>
          </div>
          <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden'>
            <div
              className='bg-[#F97316] h-full rounded-full transition-all duration-500'
              style={{ width: '78%' }}
            ></div>
          </div>
          <div className='text-[9px] text-[#888888] mt-1 font-mono flex items-center justify-between'>
            <span>15.6 / 20 GB used</span>
            <span className='text-[#F97316] font-semibold hover:underline'>Upgrade</span>
          </div>
        </div>

        <nav className='space-y-0.5 border-b border-[#E7E7E7] pb-2 mb-2'>
          <button
            onClick={onOpenSettings}
            className='w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB] transition-colors text-left cursor-pointer'
          >
            <Settings className='w-3.5 h-3.5 text-[#888888]' />
            <span>Studio Settings</span>
          </button>
          <button
            onClick={onOpenHelp}
            className='w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB] transition-colors text-left cursor-pointer'
          >
            <HelpCircle className='w-3.5 h-3.5 text-[#888888]' />
            <span>Help & Docs</span>
          </button>
        </nav>

        {/* LOGOUT BUTTON */}
        {onLogout && (
          <button
            onClick={onLogout}
            className='w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] hover:text-[#B91C1C] transition-colors text-left cursor-pointer'
          >
            <LogOut className='w-4 h-4' />
            <span>Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
};
