import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminService, AdminWorkspaceDto } from '@/services/admin.service';
import { cn } from '@/lib/utils';
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
      console.error('Lỗi tải danh sách Workspace:', err);
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
      setQuotaError('Nhập dung lượng từ 0 GB trở lên.');
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
        `Đã cập nhật hạn mức “${updated.name}” thành ${gbVal === 0 ? 'không giới hạn' : `${gbVal} GB`}.`,
      );
    } catch (err: any) {
      setQuotaError(err.message || 'Không cập nhật được hạn mức.');
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
        title='Lưu trữ & quota'
        description='Dung lượng đã dùng và hạn mức lưu trữ của từng Studio.'
        actions={
          <AdminButton
            onClick={loadWorkspaces}
            isLoading={loadingWorkspaces}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            Làm mới
          </AdminButton>
        }
      />

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <AdminStat label='Studio' value={workspaces.length.toLocaleString('vi-VN')} />
        <AdminStat label='Dung lượng đã dùng' value={formatStorage(totalUsedBytes)} />
        <AdminStat label='Tổng hạn mức đã cấp' value={formatStorage(totalQuotaBytes)} />
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
              placeholder='Tìm Studio hoặc chủ sở hữu'
              aria-label='Tìm Studio'
              className={cn(adminFieldClass, 'pl-9')}
            />
          </div>
          <span className='text-sm text-admin-muted sm:ml-auto tabular-nums'>
            {filtered.length} / {workspaces.length} Studio
          </span>
        </div>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>Studio</th>
                <th className={adminTable.th}>Chủ sở hữu</th>
                <th className={`${adminTable.th} text-right`}>Thành viên</th>
                <th className={`${adminTable.th} text-right`}>Series</th>
                <th className={`${adminTable.th} min-w-[220px]`}>Dung lượng</th>
                <th className={`${adminTable.th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loadingWorkspaces ? (
                <AdminTableState colSpan={COLS} kind='loading' message='Đang tải Studio…' />
              ) : loadError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message='Không tải được danh sách Studio.'
                  action={
                    <AdminButton size='sm' onClick={loadWorkspaces}>
                      Thử lại
                    </AdminButton>
                  }
                />
              ) : workspaces.length === 0 ? (
                <AdminTableState colSpan={COLS} kind='empty' message='Chưa có Studio nào.' />
              ) : filtered.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='no-results'
                  message='Không có Studio phù hợp.'
                  action={
                    <AdminButton size='sm' onClick={() => setSearch('')}>
                      Xóa tìm kiếm
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
                          Tạo {new Date(ws.createdAt).toLocaleDateString('vi-VN')}
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
                            {quotaBytes > 0 ? formatStorage(quotaBytes) : 'Không giới hạn'}
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
                              aria-label={`${ws.name}: đã dùng ${percentUsed}%`}
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
                              {percentUsed}% đã dùng{percentUsed >= 90 ? ' · sắp đầy' : ''}
                            </div>
                          </>
                        )}
                      </td>
                      <td className={`${adminTable.td} text-right`}>
                        <AdminButton size='sm' onClick={() => handleOpenEditQuota(ws)}>
                          Sửa hạn mức
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
          title='Sửa hạn mức lưu trữ'
          description={
            <>
              {editingWorkspace.name} · đã dùng{' '}
              <span className='tabular-nums'>
                {formatStorage(editingWorkspace.usedStorageBytes)}
              </span>
            </>
          }
          onClose={() => !updatingQuota && setEditingWorkspace(null)}
          footer={
            <>
              <AdminButton onClick={() => setEditingWorkspace(null)} disabled={updatingQuota}>
                Hủy
              </AdminButton>
              <AdminButton
                type='submit'
                form='admin-quota-form'
                variant='primary'
                isLoading={updatingQuota}
              >
                Lưu hạn mức
              </AdminButton>
            </>
          }
        >
          <form id='admin-quota-form' noValidate onSubmit={handleUpdateQuota} className='space-y-3'>
            <AdminField
              label='Hạn mức mới (GB)'
              htmlFor='quota-gb'
              required
              hint='Nhập 0 để không giới hạn.'
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
            <div className='flex flex-wrap gap-1.5' role='group' aria-label='Giá trị gợi ý'>
              {[5, 10, 20, 50, 100].map((gb) => (
                <AdminButton key={gb} size='sm' onClick={() => setNewQuotaGb(gb.toString())}>
                  {gb} GB
                </AdminButton>
              ))}
              <AdminButton size='sm' onClick={() => setNewQuotaGb('0')}>
                Không giới hạn
              </AdminButton>
            </div>
            {editingUsedOver && (
              <p className='p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900'>
                Hạn mức thấp hơn dung lượng đã dùng. Studio sẽ không tải lên thêm được cho đến khi
                giải phóng dung lượng hoặc được cấp thêm.
              </p>
            )}
          </form>
        </AdminModal>
      )}
    </>
  );
};
