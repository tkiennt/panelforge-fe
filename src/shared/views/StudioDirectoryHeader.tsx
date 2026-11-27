import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid, LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { PageContainer } from '@/shared/components/PageContainer';
import { BrandMark } from '@/shared/components/BrandMark';

export interface StudioDirectoryHeaderProps {
  currentUser?: { name: string; role?: string; avatarUrl?: string | null };
  onLogout?: () => void;
  /** Trang con của danh sách Studio (vd. "Việc của tôi"): chip Workspaces thành link quay về. */
  current?: React.ReactNode;
}

const chipClass =
  'px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 border border-head-line';

/**
 * Header dùng chung cho các trang ngoài Studio (/workspaces, /my-work).
 * Cùng PageContainer + max-w-7xl với phần thân để mép header thẳng hàng nội dung.
 */
export const StudioDirectoryHeader: React.FC<StudioDirectoryHeaderProps> = ({
  currentUser,
  onLogout,
  current,
}) => {
  const { t } = useTranslation();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = currentUser?.avatarUrl?.trim();
  useEffect(() => setAvatarFailed(false), [avatarUrl]);
  const role = currentUser?.role?.toUpperCase();
  const isAdmin = role === 'ADMINISTRATOR' || role === 'ADMIN';

  const workspacesChip = (
    <>
      <LayoutGrid className='w-3.5 h-3.5 text-accent-dark' aria-hidden='true' />
      <span>Workspaces</span>
    </>
  );

  return (
    <header className='h-16 bg-white/95 backdrop-blur-md border-b border-stone-200 flex items-center sticky top-0 z-40 shadow-[inset_0_2px_0_var(--studio-accent)]'>
      <PageContainer className='max-w-7xl mx-auto flex items-center justify-between gap-4'>
        <div className='flex items-center min-w-0'>
          {/* Logo dự án giống AppShell: BrandMark + chữ PanelForge + nhãn STUDIO */}
          <div className='flex items-center gap-2 select-none shrink-0'>
            <BrandMark size={26} className='shrink-0' />
            <span className='font-serif text-lg font-medium tracking-tight text-stone-900'>
              {t('workspace.studioHub.brand')}
            </span>
            <span className='hidden sm:inline-flex text-[11px] font-bold tracking-wider uppercase bg-kraft text-sienna px-1.5 py-0.5 rounded'>
              {t('workspace.studioHub.studioBadge')}
            </span>
          </div>
          <div className='h-5 w-px bg-stone-200 mx-3 shrink-0' aria-hidden='true' />
          <nav aria-label='Breadcrumb' className='flex items-center gap-1 text-xs min-w-0'>
            {current ? (
              <>
                <Link
                  to='/workspaces'
                  className={`focus-ring ${chipClass} text-stone-600 bg-white hover:bg-head-wash hover:text-kraft-ink`}
                >
                  {workspacesChip}
                </Link>
                <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
                <span
                  aria-current='page'
                  className={`${chipClass} text-kraft-ink bg-head-wash truncate`}
                >
                  {current}
                </span>
              </>
            ) : (
              <span aria-current='page' className={`${chipClass} text-kraft-ink bg-head-wash`}>
                {workspacesChip}
              </span>
            )}
          </nav>
        </div>

        <div className='flex items-center gap-2.5 shrink-0'>
          {currentUser && (
            <Link
              to='/profile'
              title={t('workspace.shelf.profile')}
              aria-label={`${t('workspace.shelf.profile')}: ${currentUser.name}`}
              className='focus-ring flex items-center gap-2 bg-head-wash/70 hover:bg-head-wash pl-3 pr-1.5 py-1 rounded-full border border-head-line transition-colors text-xs cursor-pointer'
            >
              <span className='font-semibold text-stone-800 truncate max-w-[160px]'>
                {currentUser.name}
              </span>
              {/* Không hiện SystemRole thô (USER) cạnh tên; chỉ gắn nhãn Admin */}
              {isAdmin && (
                <span className='rounded-full bg-kraft px-2 py-0.5 text-xs font-semibold text-kraft-ink'>
                  {t('workspace.studioHub.directory.adminBadge')}
                </span>
              )}
              <div className='w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 overflow-hidden'>
                {avatarUrl && !avatarFailed ? (
                  <img
                    src={avatarUrl}
                    alt=''
                    width={28}
                    height={28}
                    className='w-full h-full object-cover'
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className='text-xs font-bold'>
                    {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </Link>
          )}

          {onLogout && (
            <button
              type='button'
              onClick={onLogout}
              title={t('profile.logout')}
              aria-label={t('profile.logout')}
              className='focus-ring min-w-9 min-h-9 inline-flex items-center justify-center p-2 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 bg-white transition-colors cursor-pointer'
            >
              <LogOut className='w-4 h-4' aria-hidden='true' />
            </button>
          )}
        </div>
      </PageContainer>
    </header>
  );
};
