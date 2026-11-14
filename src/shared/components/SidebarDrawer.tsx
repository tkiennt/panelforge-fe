import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Drawer } from '@/shared/ui';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function SidebarDrawer({ isOpen, onClose, title, children }: SidebarDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement='left'
      size='sm'
      title={title ?? t('navigation.sidebar.mainNav', 'Navigation menu')}
      closeLabel={t('navigation.header.closeMenu', 'Close navigation menu')}
      data-testid='sidebar-drawer'
      backdropTestId='sidebar-drawer-backdrop'
      className='md:hidden'
    >
      {children}
    </Drawer>
  );
}
