import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, RefreshCw, AlertCircle } from 'lucide-react';
import {
  adminService,
  AuditLogDto,
  AuditLogFilterParams,
  downloadBlob,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminModal,
  AdminPageHeader,
  AdminPagination,
  AdminTableState,
  AdminToast,
  AdminTone,
} from './components/AdminUi';
import { adminFieldClass, adminTable, useAdminToast } from './components/adminUiStyles';

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Series', label: 'Series' },
  { value: 'BibleEntry', label: 'Series Bible' },
  { value: 'PipelineStage', label: 'Công đoạn sản xuất' },
  { value: 'Workspace', label: 'Studio' },
  { value: 'User', label: 'Người dùng' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Chỉnh sửa' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'ASSIGN_PRODUCER', label: 'Cấp quyền tạo Studio' },
];

const actionTone = (act: string): AdminTone => {
  const upper = (act || '').toUpperCase();
  if (upper.includes('CREATE') || upper.includes('ADD')) return 'success';
  if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'danger';
  if (upper.includes('UPDATE') || upper.includes('EDIT')) return 'info';
  if (upper.includes('ASSIGN')) return 'accent';
  return 'neutral';
};

const logTime = (i: AuditLogDto) => new Date(i.timestampUtc || i.createdAt || '');

const formatJson = (raw?: string | null) => {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

export const AdminAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [userEmail, setUserEmail] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [inspectLog, setInspectLog] = useState<AuditLogDto | null>(null);
  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const buildFilterParams = useCallback((): AuditLogFilterParams | null => {
    setDateError(null);
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (fromDate) fromIso = new Date(`${fromDate}T00:00:00Z`).toISOString();
    if (toDate) toIso = new Date(`${toDate}T23:59:59Z`).toISOString();

    if (fromIso && toIso && fromIso > toIso) {
      setDateError('“Đến ngày” phải sau hoặc bằng “Từ ngày”.');
      return null;
    }

    const params: AuditLogFilterParams = { page, pageSize };
    if (userEmail.trim()) params.userEmail = userEmail.trim();
    if (entityName) params.entityName = entityName;
    if (entityId.trim()) params.entityId = entityId.trim();
    if (action) params.action = action;
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;
    return params;
  }, [page, pageSize, userEmail, entityName, entityId, action, fromDate, toDate]);

  const fetchLogs = useCallback(async () => {
    const params = buildFilterParams();
    if (!params) return;

    setLoading(true);
    setLoadError(false);
    try {
      const res = await adminService.getAuditLogs(params);
      setLogs(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      setLoadError(true);
      showToast(err.message || 'Không thể tải nhật ký hệ thống.', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilter = () => {
    setUserEmail('');
    setEntityName('');
    setEntityId('');
    setAction('');
    setFromDate('');
    setToDate('');
    setDateError(null);
    setPage(1);
  };

  const isFiltered = !!(
    userEmail.trim() ||
    entityName ||
    entityId.trim() ||
    action ||
    fromDate ||
    toDate
  );

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    if (!params || exporting) return;

    setExporting(true);
    try {
      const result = await adminService.exportAuditLogs(params);
      downloadBlob(result.blob, result.fileName);
      if (result.isTruncated) {
        showToast(
          `Đã tải ${result.rowCount.toLocaleString('vi-VN')} dòng. File chỉ gồm 10.000 dòng mới nhất.`,
          'warning',
        );
      } else {
        showToast(`Đã xuất ${result.rowCount.toLocaleString('vi-VN')} dòng.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Không xuất được file CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const COLS = 6;

  const actor = (item: AuditLogDto) =>
    item.userEmail || (item.userId ? `ID ${item.userId.substring(0, 8)}…` : 'Hệ thống');

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title='Nhật ký hệ thống'
        description='Lịch sử thao tác thay đổi dữ liệu trên toàn hệ thống.'
        actions={
          <>
            <AdminButton
              onClick={fetchLogs}
              isLoading={loading}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              Làm mới
            </AdminButton>
            <AdminButton
              variant='primary'
              onClick={handleExportCsv}
              isLoading={exporting}
              disabled={loading}
              icon={<Download className='w-4 h-4' />}
              title='Xuất tối đa 10.000 dòng theo bộ lọc hiện tại'
            >
              {exporting ? 'Đang xuất…' : 'Xuất CSV'}
            </AdminButton>
          </>
        }
      />

      <form
        onSubmit={handleApplyFilter}
        className='bg-admin-card border border-admin-line rounded-2xl p-5 space-y-4'
        aria-label='Bộ lọc nhật ký'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4'>
          <AdminField label='Email người thực hiện' htmlFor='audit-email' className='xl:col-span-2'>
            <div className='relative'>
              <Search
                className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
                aria-hidden
              />
              <input
                id='audit-email'
                type='search'
                placeholder='user@example.com'
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className={cn(adminFieldClass, 'pl-9')}
              />
            </div>
          </AdminField>
          <AdminField label='Đối tượng' htmlFor='audit-entity'>
            <select
              id='audit-entity'
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className={adminFieldClass}
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label='Hành động' htmlFor='audit-action'>
            <select
              id='audit-action'
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className={adminFieldClass}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label='Từ ngày' htmlFor='audit-from'>
            <input
              id='audit-from'
              type='date'
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label='Đến ngày' htmlFor='audit-to' error={dateError}>
            <input
              id='audit-to'
              type='date'
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-invalid={!!dateError}
              className={cn(adminFieldClass, dateError && 'border-red-400')}
            />
          </AdminField>
          <AdminField label='Mã đối tượng' htmlFor='audit-entity-id' className='xl:col-span-2'>
            <input
              id='audit-entity-id'
              type='text'
              placeholder='Nhập mã cần tra cứu'
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className={cn(adminFieldClass, 'font-mono')}
            />
          </AdminField>
        </div>
        <div className='flex flex-wrap justify-end gap-2 pt-1'>
          <AdminButton variant='ghost' onClick={handleResetFilter} disabled={!isFiltered}>
            Xóa bộ lọc
          </AdminButton>
          <AdminButton type='submit' variant='primary'>
            Áp dụng
          </AdminButton>
        </div>
      </form>

      <div className='bg-admin-card border border-admin-line rounded-2xl overflow-hidden'>
        <div className='flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-b border-admin-line text-sm text-admin-muted'>
          <label htmlFor='audit-page-size'>Số dòng mỗi trang</label>
          <select
            id='audit-page-size'
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={cn(adminFieldClass, 'w-auto min-h-9')}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>Thời gian</th>
                <th className={adminTable.th}>Người thực hiện</th>
                <th className={adminTable.th}>Hành động</th>
                <th className={adminTable.th}>Đối tượng</th>
                <th className={adminTable.th}>Mô tả</th>
                <th className={`${adminTable.th} text-right`}>
                  <span className='sr-only'>Xem</span>
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading ? (
                <AdminTableState colSpan={COLS} kind='loading' message='Đang tải nhật ký…' />
              ) : loadError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message='Không tải được nhật ký.'
                  action={
                    <AdminButton size='sm' onClick={fetchLogs}>
                      Thử lại
                    </AdminButton>
                  }
                />
              ) : logs.length === 0 ? (
                isFiltered ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='no-results'
                    message='Không có bản ghi phù hợp bộ lọc.'
                    action={
                      <AdminButton size='sm' onClick={handleResetFilter}>
                        Xóa bộ lọc
                      </AdminButton>
                    }
                  />
                ) : (
                  <AdminTableState colSpan={COLS} kind='empty' message='Chưa có bản ghi nào.' />
                )
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className={adminTable.tr}>
                    <td className={`${adminTable.td} whitespace-nowrap tabular-nums`}>
                      <div className='font-medium text-admin-ink-strong'>
                        {logTime(item).toLocaleTimeString('vi-VN')}
                      </div>
                      <div className='text-xs text-admin-muted'>
                        {logTime(item).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-medium min-w-[200px] [overflow-wrap:anywhere]'>
                        {actor(item)}
                      </div>
                      {item.workspaceName && (
                        <div className='text-xs text-admin-muted'>Studio: {item.workspaceName}</div>
                      )}
                    </td>
                    <td className={adminTable.td}>
                      <AdminBadge tone={actionTone(item.action)}>{item.action}</AdminBadge>
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-medium'>{item.entityName}</div>
                      <div
                        className='text-xs text-admin-muted font-mono truncate max-w-[180px]'
                        title={item.entityId}
                      >
                        {item.entityId}
                      </div>
                    </td>
                    <td className={`${adminTable.td} max-w-md`}>
                      <div className='line-clamp-2 break-words' title={item.details || ''}>
                        {item.details || '—'}
                      </div>
                    </td>
                    <td className={`${adminTable.td} text-right`}>
                      <AdminButton size='sm' variant='ghost' onClick={() => setInspectLog(item)}>
                        Xem
                      </AdminButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          shown={logs.length}
          total={totalCount}
          unit='bản ghi'
          disabled={loading}
          onPageChange={setPage}
        />
      </div>

      {inspectLog && (
        <AdminModal
          size='lg'
          title='Chi tiết bản ghi'
          description={`${inspectLog.action} · ${inspectLog.entityName}`}
          onClose={() => setInspectLog(null)}
          footer={<AdminButton onClick={() => setInspectLog(null)}>Đóng</AdminButton>}
        >
          <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm'>
            {[
              ['Thời gian', logTime(inspectLog).toLocaleString('vi-VN')],
              ['Người thực hiện', inspectLog.userEmail || inspectLog.userId || 'Hệ thống'],
              ['Đối tượng', inspectLog.entityName],
              ['Mã đối tượng', inspectLog.entityId],
              ['Studio', inspectLog.workspaceName || '—'],
              ['Địa chỉ IP', inspectLog.ipAddress || '—'],
            ].map(([label, val]) => (
              <div key={label} className='min-w-0'>
                <dt className='text-admin-muted'>{label}</dt>
                <dd className='text-admin-ink break-all tabular-nums'>{val}</dd>
              </div>
            ))}
            <div className='sm:col-span-2'>
              <dt className='text-admin-muted'>Mô tả</dt>
              <dd className='text-admin-ink break-words whitespace-pre-wrap'>
                {inspectLog.details || '—'}
              </dd>
            </div>
          </dl>
          <div className='mt-4'>
            <div className='text-sm font-semibold text-admin-ink mb-1.5'>Dữ liệu thay đổi</div>
            {inspectLog.changesJson ? (
              <pre className='p-4 bg-admin-subtle border border-admin-line text-admin-ink font-mono text-xs rounded-xl overflow-auto max-h-[50vh] leading-relaxed'>
                {formatJson(inspectLog.changesJson)}
              </pre>
            ) : (
              <p className='flex items-center gap-2 text-sm text-admin-muted'>
                <AlertCircle className='w-4 h-4' aria-hidden />
                Bản ghi này không có dữ liệu thay đổi.
              </p>
            )}
          </div>
        </AdminModal>
      )}
    </>
  );
};
