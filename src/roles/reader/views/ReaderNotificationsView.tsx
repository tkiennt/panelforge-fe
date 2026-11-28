import React, { useEffect, useState } from 'react';
import { workspaceService } from '@/services/workspace.service';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { NotificationCenterView } from '@/shared/views/NotificationCenterView';
import type { PendingInvitation } from '@/shared/views/WorkspaceShelfSections';
import { useTranslation } from '@/lib/i18n';
import { StudioInvitationList } from '../components/StudioInvitationList';

interface ReaderNotificationsViewProps {
  /** Độc giả vừa nhận lời mời: tài khoản thành thành viên Studio, sang màn chào theo vai trò. */
  onJoinedStudio: (invitation: PendingInvitation) => Promise<void>;
}

/** Thông báo của độc giả, kèm lời mời vào Studio đang chờ (nhận lời mời là lối duy nhất sang Studio). */
export const ReaderNotificationsView: React.FC<ReaderNotificationsViewProps> = ({
  onJoinedStudio,
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    workspaceService
      .getPendingInvitations()
      .then((list) => active && setInvitations(list || []))
      .catch((err: Error) => {
        if (active) setError(err?.message || t('workspace.shelf.invitations.error'));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const timeAgo = (date: string) => {
    const days = Math.floor((now - new Date(date).getTime()) / 86400000);
    if (days <= 0) return t('workspace.today');
    if (days === 1) return t('workspace.yesterday');
    return t('workspace.daysAgo', { count: days });
  };

  const accept = async (inv: PendingInvitation) => {
    setBusyId(inv.workspaceId);
    setError(null);
    try {
      await workspaceService.acceptInvitation(inv.workspaceId);
    } catch (err) {
      setError((err as Error)?.message || t('workspace.shelf.invitations.error'));
      setBusyId(null);
      return;
    }
    // Đã là thành viên: bỏ lời mời khỏi danh sách trước, để lỗi chuyển trang không để lại nút nhận lần nữa.
    setInvitations((prev) => prev.filter((i) => i.workspaceId !== inv.workspaceId));
    setBusyId(null);
    await onJoinedStudio(inv);
  };

  const reject = async (inv: PendingInvitation) => {
    const ok = await confirm({
      title: t('workspace.shelf.invitations.rejectConfirmTitle'),
      description: t('workspace.shelf.invitations.rejectConfirm', { name: inv.workspaceName }),
      confirmText: t('workspace.shelf.invitations.reject'),
      cancelText: t('workspace.shelf.cancel'),
      variant: 'warning',
    });
    if (!ok) return;
    setBusyId(inv.workspaceId);
    setError(null);
    try {
      await workspaceService.rejectInvitation(inv.workspaceId);
      setInvitations((prev) => prev.filter((i) => i.workspaceId !== inv.workspaceId));
    } catch (err) {
      setError((err as Error)?.message || t('workspace.shelf.invitations.error'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className='w-full flex-1'>
      {invitations.length > 0 && (
        <div className='mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8'>
          <StudioInvitationList
            invitations={invitations}
            busyId={busyId}
            error={error}
            timeAgo={timeAgo}
            onAccept={(inv) => void accept(inv)}
            onReject={(inv) => void reject(inv)}
          />
        </div>
      )}
      <NotificationCenterView />
    </main>
  );
};
