import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, KeyRound, MonitorSmartphone, RefreshCw, Wallet } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { adminDetailService } from '@/services/adminDetail.service';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminStat,
  AdminTableState,
} from '../../components/AdminUi';
import { adminTable } from '../../components/adminUiStyles';
import { useLocale } from '../resources/resourceFormat';
import { ActivityList, BackButton, InfoRow } from './DetailUi';
import { EmailVerificationCard } from './EmailVerificationCard';
import { formatDateTime } from './detailFormat';

/**
 * Admin → Người dùng → Chi tiết (OPS-30): hồ sơ, phiên đăng nhập còn hiệu lực, Studio tham gia, Ví, AI tháng này
 * và Nhật ký gần đây. Phân quyền vẫn làm ở bảng Người dùng; tài khoản chưa xác thực email có thẻ xử lý riêng.
 */
export const AdminUserDetailView: React.FC<{
  userId: string;
  onBack: () => void;
  onOpenStudio: (workspaceId: string) => void;
  onOpenAudit: (email: string) => void;
}> = ({ userId, onBack, onOpenStudio, onOpenAudit }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: () => adminDetailService.getUser(userId),
  });

  if (isLoading || error || !data) {
    return (
      <div className='space-y-4'>
        <BackButton label={t('admin.details.user.back')} onClick={onBack} />
        <table className='w-full'>
          <tbody>
            <AdminTableState
              colSpan={1}
              kind={isLoading ? 'loading' : 'error'}
              message={isLoading ? t('admin.details.loading') : (error as Error)?.message}
              action={
                !isLoading && (
                  <AdminButton size='sm' onClick={() => refetch()}>
                    {t('admin.details.retry')}
                  </AdminButton>
                )
              }
            />
          </tbody>
        </table>
      </div>
    );
  }

  const u = data;
  const n = (v: number) => v.toLocaleString(locale);
  const vnd = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND' }).format(v);

  return (
    <div className='space-y-6'>
      <BackButton label={t('admin.details.user.back')} onClick={onBack} />
      <AdminPageHeader
        title={u.fullName || u.email}
        description={u.email}
        actions={
          <>
            <AdminButton onClick={() => onOpenAudit(u.email)}>
              {t('admin.details.openAudit')}
            </AdminButton>
            <AdminButton
              onClick={() => refetch()}
              isLoading={isFetching}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              {t('admin.details.refresh')}
            </AdminButton>
          </>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <AdminBadge tone={u.isActive ? 'success' : 'danger'}>
          {u.isActive ? t('admin.details.user.active') : t('admin.details.user.locked')}
        </AdminBadge>
        {u.isPendingInvitation && (
          <AdminBadge tone='warning'>{t('admin.details.user.pendingInvitation')}</AdminBadge>
        )}
        {!u.isEmailConfirmed && !u.isPendingInvitation && (
          <AdminBadge tone='warning'>{t('admin.users.table.emailUnverified')}</AdminBadge>
        )}
        {u.canCreateStudio && (
          <AdminBadge tone='accent'>{t('admin.users.roles.producer')}</AdminBadge>
        )}
        <AdminBadge>{u.role}</AdminBadge>
      </div>

      {!u.isEmailConfirmed && <EmailVerificationCard user={u} />}

      <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'>
        <AdminStat
          label={t('admin.details.user.sessions')}
          value={n(u.activeSessions.length)}
          hint={t('admin.details.user.lastActive', {
            time: formatDateTime(u.lastActiveAt, locale),
          })}
          icon={<MonitorSmartphone className='w-4 h-4' />}
        />
        <AdminStat
          label={t('admin.details.user.studios')}
          value={n(u.memberships.length)}
          icon={<KeyRound className='w-4 h-4' />}
        />
        <AdminStat
          label={t('admin.details.user.walletBalance')}
          value={u.wallet ? vnd(u.wallet.balanceVnd) : '—'}
          hint={
            u.wallet
              ? t('admin.details.user.walletHint', {
                  topUp: vnd(u.wallet.topUpTotalVnd),
                  unlocked: n(u.wallet.unlockedEditions),
                })
              : t('admin.details.user.noWallet')
          }
          icon={<Wallet className='w-4 h-4' />}
        />
        <AdminStat
          label={t('admin.details.user.aiThisMonth')}
          value={n(u.aiUsageThisMonth.tokens)}
          hint={t('admin.details.aiCallsHint', {
            calls: n(u.aiUsageThisMonth.calls),
            failed: n(u.aiUsageThisMonth.failedCalls),
          })}
          icon={<Cpu className='w-4 h-4' />}
        />
      </div>

      <div className='grid gap-6 grid-cols-1 xl:grid-cols-2'>
        <AdminCard title={t('admin.details.user.profile')}>
          <dl className='divide-y divide-admin-line/70'>
            <InfoRow label={t('admin.users.detailsModal.phoneNumber')}>
              <span className='tabular-nums'>{u.phoneNumber || '—'}</span>
            </InfoRow>
            <InfoRow label={t('admin.users.detailsModal.twoFactor')}>
              {u.twoFactorEnabled
                ? t('admin.users.table.twoFactorEnabled')
                : t('admin.users.table.twoFactorDisabled')}
            </InfoRow>
            <InfoRow label={t('admin.users.detailsModal.emailVerification')}>
              {u.isEmailConfirmed
                ? t('admin.users.table.emailVerified')
                : t('admin.users.table.emailUnverified')}
            </InfoRow>
            <InfoRow label={t('admin.users.detailsModal.createdAt')}>
              <span className='tabular-nums'>{formatDateTime(u.createdAt, locale)}</span>
            </InfoRow>
            <InfoRow label={t('admin.details.user.pendingTopUps')}>
              <span className='tabular-nums'>{n(u.wallet?.pendingTopUps ?? 0)}</span>
            </InfoRow>
            <InfoRow label={t('admin.users.detailsModal.accountId')}>
              <span className='font-mono text-xs break-all select-all'>{u.id}</span>
            </InfoRow>
          </dl>
        </AdminCard>

        <AdminCard title={t('admin.details.user.memberships')} bodyClassName='p-0'>
          {u.memberships.length === 0 ? (
            <p className='p-5 text-sm text-admin-muted'>{t('admin.details.user.noMemberships')}</p>
          ) : (
            <ul className='divide-y divide-admin-line/70'>
              {u.memberships.map((m) => (
                <li key={m.workspaceId} className='flex flex-wrap items-center gap-3 px-5 py-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='font-semibold text-admin-ink-strong truncate'>
                      {m.workspaceName}
                    </div>
                    <div className='text-xs text-admin-muted tabular-nums'>
                      {t('admin.details.joinedAt', { time: formatDateTime(m.joinedAt, locale) })}
                    </div>
                  </div>
                  <AdminBadge>{t(`workspace.roles.${m.role.toLowerCase()}`)}</AdminBadge>
                  {m.isOwner && <AdminBadge tone='accent'>{t('workspace.owner')}</AdminBadge>}
                  {m.status !== 'Active' && (
                    <AdminBadge tone='warning'>
                      {t(`admin.details.memberStatus.${m.status}`)}
                    </AdminBadge>
                  )}
                  <AdminButton size='sm' onClick={() => onOpenStudio(m.workspaceId)}>
                    {t('admin.details.user.openStudio')}
                  </AdminButton>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard title={t('admin.details.user.activeSessions')} bodyClassName='p-0'>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.details.user.colDevice')}</th>
                <th className={adminTable.th}>{t('admin.details.user.colIp')}</th>
                <th className={adminTable.th}>{t('admin.details.user.colStarted')}</th>
                <th className={adminTable.th}>{t('admin.details.user.colLastActive')}</th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {u.activeSessions.length === 0 ? (
                <AdminTableState
                  colSpan={4}
                  kind='empty'
                  message={t('admin.details.user.noSessions')}
                />
              ) : (
                u.activeSessions.map((s) => (
                  <tr key={s.sessionId} className={adminTable.tr}>
                    <td className={adminTable.td}>
                      <div>{s.deviceName || t('admin.details.user.unknownDevice')}</div>
                      {s.userAgent && (
                        <div className='text-xs text-admin-muted break-all max-w-md'>
                          {s.userAgent}
                        </div>
                      )}
                    </td>
                    <td className={`${adminTable.td} font-mono text-xs`}>{s.ipAddress || '—'}</td>
                    <td className={`${adminTable.td} tabular-nums whitespace-nowrap`}>
                      {formatDateTime(s.startedAt, locale)}
                    </td>
                    <td className={`${adminTable.td} tabular-nums whitespace-nowrap`}>
                      {formatDateTime(s.lastActiveAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard title={t('admin.details.recentActivity')}>
        <ActivityList
          items={u.recentActivity}
          locale={locale}
          emptyLabel={t('admin.details.noActivity')}
        />
      </AdminCard>
    </div>
  );
};
