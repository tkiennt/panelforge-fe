import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Command,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { MangaProject } from '@/types';
import { CurrentUser } from './AppShell';

export interface FocusWorkspaceLayoutProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id?: string; name: string } | null;
  activeSeries?: MangaProject | { title: string; subtitle?: string } | null;
  onLogout?: () => void;
  children?: React.ReactNode;
}

/**
 * FocusWorkspaceLayout - Chế độ phòng làm việc tập trung (Figma / Canva / Photopea Studio style)
 *
 * Áp dụng theo quy ước SIDEBAR_CONVENTION.md:
 * - Ẩn hoàn toàn AppShellSidebar (thanh điều hướng toàn app) để tối đa hoá diện tích hiển thị.
 * - Cung cấp Compact Studio Header (h-12) gồm nút quay lại, breadcrumb, trạng thái lưu.
 * - Nhường 100% không gian còn lại cho Sidebar công cụ nghiệp vụ duy nhất và Bàn vẽ Manga.
 * - Hỗ trợ hiệu ứng chuyển đổi mượt mà (smooth transition) và Chế độ Zen Mode toàn màn hình (Phím tắt F).
 */
export const FocusWorkspaceLayout: React.FC<FocusWorkspaceLayoutProps> = ({
  currentUser,
  activeWorkspace,
  activeSeries,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [isZenMode, setIsZenMode] = useState(false);

  const workspaceId = params.workspaceId ?? activeWorkspace?.id;
  const seriesId = params.seriesId ?? (activeSeries as any)?.id;

  // Lắng nghe phím tắt 'f' để bật/tắt Zen Mode, 'Escape' để thoát
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsZenMode((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  // Tính toán nhãn màn hình làm việc hiện tại
  const getWorkspaceTitle = () => {
    const path = location.pathname;
    if (path.includes('/artist/workspace')) return 'Không gian vẽ Canvas (Fabric Studio)';
    if (path.includes('/artist')) return 'Bàn vẽ Artist (Manga B5 Desk)';
    if (path.includes('/script')) return 'Biên kịch & Kịch bản (Script Editor)';
    if (path.includes('/letterer')) return 'Chế bản & Thoại (Letterer Desk)';
    if (path.includes('/chapter-review')) return 'Kiểm duyệt toàn chương (Chapter Review)';
    if (path.includes('/review/')) return 'Kiểm duyệt biên tập (Editor Review)';
    if (path.includes('/task/')) return 'Bàn giao việc (Task Desk)';
    return 'Phòng làm việc sáng tác';
  };

  const handleBackToProject = () => {
    if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/dashboard`);
    } else if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/series`);
    } else {
      navigate('/workspaces');
    }
  };

  return (
    <div
      className='h-screen w-full flex flex-col overflow-hidden bg-[#181615] text-[#FCFBF8] select-none transition-colors duration-300'
      data-testid='focus-workspace-layout'
    >
      {/* --- FLOATING ZEN PILL KHI BẬT ZEN MODE --- */}
      {isZenMode ? (
        <div
          data-testid='focus-zen-pill'
          className='absolute top-3 right-4 z-50 animate-in fade-in zoom-in-95 duration-200'
        >
          <button
            type='button'
            onClick={() => setIsZenMode(false)}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1917]/90 backdrop-blur-md border border-[#3E3A36] text-xs font-mono text-stone-200 hover:text-white hover:bg-[#292524] shadow-lg cursor-pointer transition-all'
            title='Thoát chế độ Zen Mode (Phím F hoặc Escape)'
          >
            <Minimize2 className='w-3.5 h-3.5 text-[#F97316]' />
            <span className='font-semibold'>Thoát Zen Mode (F)</span>
          </button>
        </div>
      ) : (
        /* --- COMPACT STUDIO HEADER (h-12 ~ 48px) VỚI HIỆU ỨNG TRƯỢT XUỐNG MƯỢT MÀ --- */
        <header
          className='h-12 bg-[#1C1917] border-b border-[#292524] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2'
          data-testid='focus-studio-header'
        >
          {/* Phía trái: Nút thoát bàn vẽ + Breadcrumb */}
          <div className='flex items-center gap-2.5 min-w-0'>
            <button
              type='button'
              onClick={handleBackToProject}
              data-testid='focus-back-btn'
              title='Quay lại Dashboard dự án (Thoát chế độ tập trung)'
              className='flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#A8A29E] hover:text-[#FCFBF8] hover:bg-[#292524] transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C]'
            >
              <ArrowLeft className='w-4 h-4' />
              <span className='hidden sm:inline font-semibold'>Về dự án</span>
            </button>

            <span className='text-[#44403C] font-bold select-none'>/</span>

            <BrandMark size={20} tone='paper' className='shrink-0 hidden xs:inline-block' />

            <div className='flex items-center gap-1.5 min-w-0 text-xs truncate'>
              <span className='font-semibold text-[#A8A29E] truncate hidden md:inline'>
                {activeSeries?.title || activeWorkspace?.name || 'PanelForge Studio'}
              </span>
              <span className='text-[#44403C] hidden md:inline select-none'>/</span>
              <span className='font-bold text-[#FCFBF8] truncate'>
                {getWorkspaceTitle()}
              </span>
            </div>
          </div>

          {/* Ở giữa: Trạng thái đồng bộ đám mây & Tiêu chuẩn Manga B5 */}
          <div className='hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#A8A29E] shrink-0'>
            <div className='flex items-center gap-1.5 bg-[#24201E] px-2.5 py-0.5 rounded-full border border-[#2E2A27]'>
              <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
              <span>Auto-saved (SHA-256 CAS)</span>
            </div>
            <span className='text-[#3E3A36]'>•</span>
            <span className='text-[#D6D3CD] font-medium'>B5 Master (600 DPI)</span>
          </div>

          {/* Phía phải: Chế độ Zen Mode, Phím tắt & Thông tin người dùng */}
          <div className='flex items-center gap-2 shrink-0'>
            <button
              type='button'
              onClick={() => setIsZenMode(true)}
              title='Chế độ tập trung tối đa / Zen Mode (Phím F)'
              data-testid='focus-zen-toggle-btn'
              className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#24201E] border border-[#2E2A27] text-xs font-mono text-[#A8A29E] hover:text-[#FCFBF8] hover:border-[#44403C] transition-colors cursor-pointer'
            >
              <Maximize2 className='w-3.5 h-3.5 text-[#F97316]' />
              <span className='hidden sm:inline'>Zen Mode</span>
            </button>

            <button
              type='button'
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                )
              }
              title='Mở Command Palette (Ctrl+K / ⌘K)'
              className='hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-[#24201E] border border-[#2E2A27] text-[11px] font-mono text-[#A8A29E] hover:text-[#FCFBF8] hover:border-[#44403C] transition-colors cursor-pointer'
            >
              <Command className='w-3 h-3' />
              <span>K</span>
            </button>

            <div className='flex items-center gap-2 pl-2 border-l border-[#2E2A27]'>
              <div
                className='w-7 h-7 rounded-full bg-[#C2410C]/20 border border-[#C2410C]/40 text-[#F97316] flex items-center justify-center text-xs font-bold font-mono'
                title={`${currentUser.name} (${currentUser.workspaceRole || currentUser.role})`}
              >
                {currentUser.avatarInitials || 'PF'}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* --- WORKSPACE BODY: BƯỚC CHUYỂN MƯỢT MÀ VỚI ANIMATE-IN FADE-IN DURATION-300 --- */}
      <main
        className='flex-1 min-h-0 min-w-0 w-full flex flex-col overflow-hidden relative transition-all duration-300 ease-out'
        data-testid='focus-workspace-body'
      >
        <div
          key={location.pathname}
          className='w-full h-full flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300 ease-out'
        >
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default FocusWorkspaceLayout;
