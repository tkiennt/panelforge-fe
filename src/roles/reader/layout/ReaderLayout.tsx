import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, Library, LogOut, UserRound, Wallet } from 'lucide-react';
import { workspaceService } from '@/services/workspace.service';
import { useTranslation } from '@/lib/i18n';
import type { ReaderContextValue } from './readerContext';

interface ReaderLayoutProps {
  /** Đã đăng nhập: tên hiển thị trên header. */
  userName?: string;
  /** Khách: mở trang đăng nhập. */
  onLogin?: () => void;
  onLogout?: () => void;
  /** Chỉ thành viên Studio mới có lối quay lại Studio; độc giả không thấy. */
  onBackToStudio?: () => void;
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
    isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`;

/** Khung marketplace của độc giả: mọi trang dưới `/catalog`, không có thành phần Studio. */
export const ReaderLayout: React.FC<ReaderLayoutProps> = ({
  userName,
  onLogin,
  onLogout,
  onBackToStudio,
}) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // Lời mời vào Studio đang chờ: đếm lại mỗi lần đổi trang để huy hiệu khớp sau khi nhận / từ chối.
  const [inviteCount, setInviteCount] = useState(0);
  useEffect(() => {
    if (!userName) return;
    let active = true;
    workspaceService
      .getPendingInvitations()
      .then((list) => active && setInviteCount(list?.length ?? 0));
    return () => {
      active = false;
    };
  }, [userName, pathname]);
  const shownInviteCount = userName ? inviteCount : 0;

  return (
    <div className='flex min-h-screen flex-col bg-[#FAF9F5] text-stone-900'>
      <header className='sticky top-0 z-30 h-14 border-b border-stone-200/80 bg-white'>
        <div className='mx-auto flex h-full max-w-7xl items-center gap-2 px-4 sm:px-6'>
          {onBackToStudio && (
            <button
              type='button'
              onClick={onBackToStudio}
              className='inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            >
              <ArrowLeft className='w-4 h-4' aria-hidden='true' />
              <span className='max-sm:sr-only'>{t('workspace.reader.layout.backToStudio')}</span>
            </button>
          )}
          <Link
            to='/catalog'
            className='flex shrink-0 items-center gap-2'
            aria-label={t('workspace.reader.layout.homeLink')}
          >
            <span className='grid size-8 place-items-center rounded-lg bg-stone-900 text-white'>
              <BookOpen className='w-4 h-4' aria-hidden='true' />
            </span>
            <span className='hidden font-serif text-lg font-bold tracking-tight sm:inline'>
              PanelForge
            </span>
          </Link>

          <nav
            aria-label={t('workspace.reader.layout.mainNav')}
            className='ml-auto flex items-center gap-1'
          >
            <NavLink to='/catalog' end className={navClass}>
              <BookOpen className='w-4 h-4' aria-hidden='true' />
              <span className='max-sm:sr-only'>{t('workspace.reader.layout.navCatalog')}</span>
            </NavLink>
            {userName && (
              <>
                <NavLink to='/catalog/library' className={navClass}>
                  <Library className='w-4 h-4' aria-hidden='true' />
                  <span className='max-sm:sr-only'>{t('workspace.reader.layout.navLibrary')}</span>
                </NavLink>
                <NavLink to='/catalog/wallet' className={navClass}>
                  <Wallet className='w-4 h-4' aria-hidden='true' />
                  <span className='max-sm:sr-only'>{t('workspace.reader.layout.navWallet')}</span>
                </NavLink>
                <NavLink to='/catalog/notifications' className={navClass}>
                  <Bell className='w-4 h-4' aria-hidden='true' />
                  <span className='max-sm:sr-only'>
                    {t('workspace.reader.layout.navNotifications')}
                  </span>
                  {shownInviteCount > 0 && (
                    <span
                      className='rounded-full bg-[#EA580C] px-1.5 font-mono text-xs font-bold text-white tabular-nums'
                      aria-label={t('workspace.reader.layout.pendingInvites', {
                        count: shownInviteCount,
                      })}
                    >
                      {shownInviteCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to='/catalog/profile' className={navClass} title={userName}>
                  <UserRound className='w-4 h-4' aria-hidden='true' />
                  <span className='max-w-32 truncate max-sm:sr-only'>{userName}</span>
                </NavLink>
              </>
            )}
          </nav>

          {userName
            ? onLogout && (
                <button
                  type='button'
                  onClick={onLogout}
                  className='grid size-9 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50'
                  title={t('workspace.reader.layout.logout')}
                  aria-label={t('workspace.reader.layout.logout')}
                >
                  <LogOut className='w-4 h-4' aria-hidden='true' />
                </button>
              )
            : onLogin && (
                <button
                  type='button'
                  onClick={onLogin}
                  className='btn-cta-primary shrink-0 rounded-full px-4 py-2 text-xs font-semibold'
                >
                  {t('workspace.reader.layout.login')}
                </button>
              )}
        </div>
      </header>

      <Outlet
        context={
          {
            isSignedIn: !!userName,
            requestLogin: onLogin ?? (() => undefined),
          } satisfies ReaderContextValue
        }
      />
    </div>
  );
};
