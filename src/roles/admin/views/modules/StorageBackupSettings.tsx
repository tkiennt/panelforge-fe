import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminService, AdminWorkspaceDto } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  AdminButton,
  AdminField,
  AdminModal,
  AdminPageHeader,
  AdminStat,
  AdminTableState,
  AdminToast,
} from '../components/AdminUi';
import { adminFieldClass, adminTable, useAdminToast } from '../components/adminUiStyles';

function formatStorage(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function bytesToGb(bytes: number): number {
  if (!bytes || bytes <= 0) return 0;
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(1));
}

const COLS = 6;

export const StorageBackupSettings: React.FC = () => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<AdminWorkspaceDto | null>(null);
  const [newQuotaGb, setNewQuotaGb] = useState<string>('10');
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [updatingQuota, setUpdatingQuota] = useState(false);
  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const loadWorkspaces = React.useCallback(async () => {
    setLoadingWorkspaces(true);
    setLoadError(false);
    try {
      setWorkspaces(await adminService.getWorkspaces());
    } catch (err: any) {
      console.error('Failed to load workspaces:', err);
      setLoadError(true);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleOpenEditQuota = (ws: AdminWorkspaceDto) => {
    setEditingWorkspace(ws);
    setQuotaError(null);
    setNewQuotaGb(ws.storageQuotaBytes > 0 ? bytesToGb(ws.storageQuotaBytes).toString() : '10');
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || updatingQuota) return;

    const gbVal = parseFloat(newQuotaGb);
    if (isNaN(gbVal) || gbVal < 0) {
      setQuotaError(t('admin.storageBackup.modal.invalidQuota'));
      return;
    }
    setQuotaError(null);

    const quotaBytes = Math.round(gbVal * 1024 * 1024 * 1024);
    setUpdatingQuota(true);
    try {
      const updated = await adminService.updateWorkspaceQuota(editingWorkspace.id, quotaBytes);
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setEditingWorkspace(null);
      showToast(
        t('admin.storageBackup.modal.updateSuccess', {
          name: updated.name,
          value: gbVal === 0 ? t('admin.storageBackup.unlimitedLower') : `${gbVal} GB`,
        }),
      );
    } catch (err: any) {
      setQuotaError(err.message || t('admin.storageBackup.modal.updateFailed'));
    } finally {
      setUpdatingQuota(false);
    }
  };

  const totalUsedBytes = workspaces.reduce((acc, w) => acc + (w.usedStorageBytes || 0), 0);
  const totalQuotaBytes = workspaces.reduce((acc, w) => acc + (w.storageQuotaBytes || 0), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.ownerName || '').toLowerCase().includes(q) ||
        (w.ownerEmail || '').toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const newQuotaNum = parseFloat(newQuotaGb);
  const editingUsedOver =
    !!editingWorkspace &&
    newQuotaNum > 0 &&
    editingWorkspace.usedStorageBytes > newQuotaNum * 1024 * 1024 * 1024;

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.storageBackup.title')}
        description={t('admin.storageBackup.description')}
        actions={
          <AdminButton
            onClick={loadWorkspaces}
            isLoading={loadingWorkspaces}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            {t('admin.storageBackup.refresh')}
          </AdminButton>
        }
      />

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <AdminStat
          label={t('admin.storageBackup.stats.studios')}
          value={workspaces.length.toLocaleString(locale)}
        />
        <AdminStat
          label={t('admin.storageBackup.stats.usedStorage')}
          value={formatStorage(totalUsedBytes)}
        />
        <AdminStat
          label={t('admin.storageBackup.stats.totalQuota')}
          value={formatStorage(totalQuotaBytes)}
        />
      </div>

      <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
        <div className='flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line'>
          <div className='relative w-full sm:max-w-xs'>
            <Search
              className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              aria-hidden
            />
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.storageBackup.searchPlaceholder')}
              aria-label={t('admin.storageBackup.searchAriaLabel')}
              className={cn(adminFieldClass, 'pl-9')}
            />
          </div>
          <span className='text-sm text-admin-muted sm:ml-auto tabular-nums'>
            {t('admin.storageBackup.studioCount', {
              filtered: filtered.length,
              total: workspaces.length,
            })}
          </span>
        </div>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.storageBackup.table.colStudio')}</th>
                <th className={adminTable.th}>{t('admin.storageBackup.table.colOwner')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.storageBackup.table.colMembers')}
                </th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.storageBackup.table.colSeries')}
                </th>
                <th className={`${adminTable.th} min-w-[220px]`}>
                  {t('admin.storageBackup.table.colStorage')}
                </th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.storageBackup.table.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loadingWorkspaces ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.storageBackup.table.loading')}
                />
              ) : loadError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message={t('admin.storageBackup.table.loadError')}
                  action={
                    <AdminButton size='sm' onClick={loadWorkspaces}>
                      {t('admin.storageBackup.table.retry')}
                    </AdminButton>
                  }
                />
              ) : workspaces.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='empty'
                  message={t('admin.storageBackup.table.empty')}
                />
              ) : filtered.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='no-results'
                  message={t('admin.storageBackup.table.noResults')}
                  action={
                    <AdminButton size='sm' onClick={() => setSearch('')}>
                      {t('admin.storageBackup.table.clearSearch')}
                    </AdminButton>
                  }
                />
              ) : (
                filtered.map((ws) => {
                  const usedBytes = ws.usedStorageBytes || 0;
                  const quotaBytes = ws.storageQuotaBytes || 0;
                  const percentUsed =
                    quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;
                  const barTone =
                    percentUsed >= 90
                      ? 'bg-red-500'
                      : percentUsed >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';
                  return (
                    <tr key={ws.id} className={adminTable.tr}>
                      <td className={adminTable.td}>
                        <div className='font-semibold text-admin-ink-strong break-words'>
                          {ws.name}
                        </div>
                        <div className='text-xs text-admin-muted tabular-nums'>
                          {t('admin.storageBackup.table.createdAt', {
                            date: new Date(ws.createdAt).toLocaleDateString(locale),
                          })}
                        </div>
                      </td>
                      <td className={adminTable.td}>
                        <div className='font-medium'>{ws.ownerName || '—'}</div>
                        <div className='text-xs text-admin-muted break-all'>{ws.ownerEmail}</div>
                      </td>
                      <td className={`${adminTable.td} text-right tabular-nums`}>
                        {ws.memberCount}
                      </td>
                      <td className={`${adminTable.td} text-right tabular-nums`}>
                        {ws.seriesCount}
                      </td>
                      <td className={adminTable.td}>
                        <div className='flex items-baseline justify-between gap-2 text-sm tabular-nums'>
                          <span className='font-medium'>{formatStorage(usedBytes)}</span>
                          <span className='text-admin-muted'>
                            {quotaBytes > 0
                              ? formatStorage(quotaBytes)
                              : t('admin.storageBackup.unlimited')}
                          </span>
                        </div>
                        {quotaBytes > 0 && (
                          <>
                            <div
                              className='mt-1.5 w-full bg-admin-hover h-1.5 rounded-full overflow-hidden'
                              role='progressbar'
                              aria-valuenow={percentUsed}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={t('admin.storageBackup.table.progressAria', {
                                name: ws.name,
                                percent: percentUsed,
                              })}
                            >
                              <div
                                className={`h-full rounded-full ${barTone}`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                            <div
                              className={cn(
                                'mt-1 text-xs text-right tabular-nums',
                                percentUsed >= 90 ? 'text-red-700 font-medium' : 'text-admin-muted',
                              )}
                            >
                              {t('admin.storageBackup.table.percentUsed', {
                                percent: percentUsed,
                              })}
                              {percentUsed >= 90 ? t('admin.storageBackup.table.almostFull') : ''}
                            </div>
                          </>
                        )}
                      </td>
                      <td className={`${adminTable.td} text-right`}>
                        <AdminButton size='sm' onClick={() => handleOpenEditQuota(ws)}>
                          {t('admin.storageBackup.table.editQuota')}
                        </AdminButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingWorkspace && (
        <AdminModal
          title={t('admin.storageBackup.modal.title')}
          description={
            <>
              {editingWorkspace.name} · {t('admin.storageBackup.modal.usedSuffix')}{' '}
              <span className='tabular-nums'>
                {formatStorage(editingWorkspace.usedStorageBytes)}
              </span>
            </>
          }
          onClose={() => !updatingQuota && setEditingWorkspace(null)}
          footer={
            <>
              <AdminButton onClick={() => setEditingWorkspace(null)} disabled={updatingQuota}>
                {t('admin.storageBackup.modal.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='admin-quota-form'
                variant='primary'
                isLoading={updatingQuota}
              >
                {t('admin.storageBackup.modal.save')}
              </AdminButton>
            </>
          }
        >
          <form id='admin-quota-form' noValidate onSubmit={handleUpdateQuota} className='space-y-3'>
            <AdminField
              label={t('admin.storageBackup.modal.newQuotaLabel')}
              htmlFor='quota-gb'
              required
              hint={t('admin.storageBackup.modal.newQuotaHint')}
              error={quotaError}
            >
              <input
                id='quota-gb'
                type='number'
                min='0'
                step='0.5'
                value={newQuotaGb}
                onChange={(e) => setNewQuotaGb(e.target.value)}
                aria-invalid={!!quotaError}
                className={cn(adminFieldClass, 'tabular-nums')}
                required
              />
            </AdminField>
            <div
              className='flex flex-wrap gap-1.5'
              role='group'
              aria-label={t('admin.storageBackup.modal.presetsAria')}
            >
              {[5, 10, 20, 50, 100].map((gb) => (
                <AdminButton key={gb} size='sm' onClick={() => setNewQuotaGb(gb.toString())}>
                  {gb} GB
                </AdminButton>
              ))}
              <AdminButton size='sm' onClick={() => setNewQuotaGb('0')}>
                {t('admin.storageBackup.unlimited')}
              </AdminButton>
            </div>
            {editingUsedOver && (
              <p className='p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900'>
                {t('admin.storageBackup.modal.overUsedWarning')}
              </p>
            )}
          </form>
        </AdminModal>
      )}
    </>
  );
};
