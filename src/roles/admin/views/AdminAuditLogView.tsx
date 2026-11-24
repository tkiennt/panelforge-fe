import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, RefreshCw, AlertCircle } from 'lucide-react';
import {
  adminService,
  AuditLogDto,
  AuditLogFilterParams,
  downloadBlob,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { formatActionLabel, formatEntityLabel, getActionTone } from '@/shared/utils/auditLogUtils';
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
  { value: '', labelKey: 'admin.auditLog.entities.all' },
  { value: 'Session', labelKey: 'admin.auditLog.entities.session' },
  { value: 'User', labelKey: 'admin.auditLog.entities.user' },
  { value: 'Series', labelKey: 'admin.auditLog.entities.series' },
  { value: 'BibleEntry', labelKey: 'admin.auditLog.entities.bibleEntry' },
  { value: 'PipelineStage', labelKey: 'admin.auditLog.entities.pipelineStage' },
  { value: 'Workspace', labelKey: 'admin.auditLog.entities.workspace' },
];

const ACTION_OPTIONS = [
  { value: '', labelKey: 'admin.auditLog.actions.all' },
  { value: 'LOGIN', labelKey: 'admin.auditLog.actions.login' },
  { value: 'LOGOUT', labelKey: 'admin.auditLog.actions.logout' },
  { value: 'SESSIONS_REVOKED', labelKey: 'admin.auditLog.actions.sessionsRevoked' },
  { value: 'REVOKE_SESSION', labelKey: 'admin.auditLog.actions.revokeSession' },
  { value: 'CREATE', labelKey: 'admin.auditLog.actions.create' },
  { value: 'UPDATE', labelKey: 'admin.auditLog.actions.update' },
  { value: 'DELETE', labelKey: 'admin.auditLog.actions.delete' },
  { value: 'ASSIGN_PRODUCER', labelKey: 'admin.auditLog.actions.assignProducer' },
];

const actionTone = (act: string): AdminTone => getActionTone(act);

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
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
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
  const [hideSystemLogs, setHideSystemLogs] = useState(false);

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
      setDateError(t('admin.auditLog.errors.dateRange'));
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
  }, [page, pageSize, userEmail, entityName, entityId, action, fromDate, toDate, t]);

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
      showToast(err.message || t('admin.auditLog.errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, showToast, t]);

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
    setHideSystemLogs(false);
    setDateError(null);
    setPage(1);
  };

  const isFiltered = !!(
    userEmail.trim() ||
    entityName ||
    entityId.trim() ||
    action ||
    fromDate ||
    toDate ||
    hideSystemLogs
  );

  const displayedLogs = useMemo(() => {
    if (!hideSystemLogs) return logs;
    return logs.filter((item) => Boolean(item.userEmail || item.userId));
  }, [logs, hideSystemLogs]);

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    if (!params || exporting) return;

    setExporting(true);
    try {
      const result = await adminService.exportAuditLogs(params);
      downloadBlob(result.blob, result.fileName);
      if (result.isTruncated) {
        showToast(
          t('admin.auditLog.toast.exportTruncated', {
            count: result.rowCount.toLocaleString(locale),
          }),
          'warning',
        );
      } else {
        showToast(
          t('admin.auditLog.toast.exportSuccess', {
            count: result.rowCount.toLocaleString(locale),
          }),
          'success',
        );
      }
    } catch (err: any) {
      showToast(err.message || t('admin.auditLog.errors.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const COLS = 6;

  const actor = (item: AuditLogDto) =>
    item.userEmail ||
    (item.userId ? `ID ${item.userId.substring(0, 8)}…` : t('admin.auditLog.systemActor'));

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.auditLog.title')}
        description={t('admin.auditLog.description')}
        actions={
          <>
            <AdminButton
              onClick={fetchLogs}
              isLoading={loading}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              {t('admin.auditLog.refresh')}
            </AdminButton>
            <AdminButton
              variant='primary'
              onClick={handleExportCsv}
              isLoading={exporting}
              disabled={loading}
              icon={<Download className='w-4 h-4' />}
              title={t('admin.auditLog.exportTitle')}
            >
              {exporting ? t('admin.auditLog.exporting') : t('admin.auditLog.exportCsv')}
            </AdminButton>
          </>
        }
      />

      <form
        onSubmit={handleApplyFilter}
        className='bg-admin-card border border-admin-line rounded-2xl p-5 space-y-4'
        aria-label={t('admin.auditLog.filterAriaLabel')}
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4'>
          <AdminField
            label={t('admin.auditLog.fields.actorEmail')}
            htmlFor='audit-email'
            className='xl:col-span-2'
          >
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
          <AdminField label={t('admin.auditLog.fields.entity')} htmlFor='audit-entity'>
            <select
              id='audit-entity'
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className={adminFieldClass}
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label={t('admin.auditLog.fields.action')} htmlFor='audit-action'>
            <select
              id='audit-action'
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className={adminFieldClass}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label={t('admin.auditLog.fields.fromDate')} htmlFor='audit-from'>
            <input
              id='audit-from'
              type='date'
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField
            label={t('admin.auditLog.fields.toDate')}
            htmlFor='audit-to'
            error={dateError}
          >
            <input
              id='audit-to'
              type='date'
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-invalid={!!dateError}
              className={cn(adminFieldClass, dateError && 'border-red-400')}
            />
          </AdminField>
          <AdminField
            label={t('admin.auditLog.fields.entityId')}
            htmlFor='audit-entity-id'
            className='xl:col-span-2'
          >
            <input
              id='audit-entity-id'
              type='text'
              placeholder={t('admin.auditLog.fields.entityIdPlaceholder')}
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className={cn(adminFieldClass, 'font-mono')}
            />
          </AdminField>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
          <label
            htmlFor='audit-hide-system'
            className='inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-admin-muted hover:text-admin-ink select-none'
            title={t('admin.auditLog.fields.hideSystemTitle')}
          >
            <input
              id='audit-hide-system'
              type='checkbox'
              checked={hideSystemLogs}
              onChange={(e) => setHideSystemLogs(e.target.checked)}
              className='w-4 h-4 rounded border-admin-line text-amber-600 focus:ring-amber-500'
            />
            <span>{t('admin.auditLog.fields.hideSystem')}</span>
          </label>
          <div className='flex flex-wrap justify-end gap-2'>
            <AdminButton variant='ghost' onClick={handleResetFilter} disabled={!isFiltered}>
              {t('admin.auditLog.fields.resetFilter')}
            </AdminButton>
            <AdminButton type='submit' variant='primary'>
              {t('admin.auditLog.fields.applyFilter')}
            </AdminButton>
          </div>
        </div>
      </form>

      <div className='bg-admin-card border border-admin-line rounded-2xl overflow-hidden'>
        <div className='flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-b border-admin-line text-sm text-admin-muted'>
          <label htmlFor='audit-page-size'>{t('admin.auditLog.fields.pageSize')}</label>
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
                <th className={adminTable.th}>{t('admin.auditLog.table.colTime')}</th>
                <th className={adminTable.th}>{t('admin.auditLog.table.colActor')}</th>
                <th className={adminTable.th}>{t('admin.auditLog.table.colAction')}</th>
                <th className={adminTable.th}>{t('admin.auditLog.table.colEntity')}</th>
                <th className={adminTable.th}>{t('admin.auditLog.table.colDescription')}</th>
                <th className={`${adminTable.th} text-right`}>
                  <span className='sr-only'>{t('admin.auditLog.table.colView')}</span>
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.auditLog.table.loading')}
                />
              ) : loadError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message={t('admin.auditLog.table.loadError')}
                  action={
                    <AdminButton size='sm' onClick={fetchLogs}>
                      {t('admin.auditLog.table.retry')}
                    </AdminButton>
                  }
                />
              ) : displayedLogs.length === 0 ? (
                isFiltered ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='no-results'
                    message={t('admin.auditLog.table.noResults')}
                    action={
                      <AdminButton size='sm' onClick={handleResetFilter}>
                        {t('admin.auditLog.fields.resetFilter')}
                      </AdminButton>
                    }
                  />
                ) : (
                  <AdminTableState
                    colSpan={COLS}
                    kind='empty'
                    message={t('admin.auditLog.table.empty')}
                  />
                )
              ) : (
                displayedLogs.map((item) => (
                  <tr key={item.id} className={adminTable.tr}>
                    <td className={`${adminTable.td} whitespace-nowrap tabular-nums`}>
                      <div className='font-medium text-admin-ink-strong'>
                        {logTime(item).toLocaleTimeString(locale)}
                      </div>
                      <div className='text-xs text-admin-muted'>
                        {logTime(item).toLocaleDateString(locale)}
                      </div>
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-medium min-w-[200px] [overflow-wrap:anywhere]'>
                        {actor(item)}
                      </div>
                      {item.workspaceName && (
                        <div className='text-xs text-admin-muted'>
                          {t('admin.auditLog.studioPrefix', { name: item.workspaceName })}
                        </div>
                      )}
                    </td>
                    <td className={adminTable.td}>
                      <AdminBadge tone={actionTone(item.action)} title={item.action}>
                        {formatActionLabel(item.action)}
                      </AdminBadge>
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-medium'>{formatEntityLabel(item.entityName)}</div>
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
                        {t('admin.auditLog.table.colView')}
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
          shown={displayedLogs.length}
          total={totalCount}
          unit={t('admin.auditLog.table.unit')}
          disabled={loading}
          onPageChange={setPage}
        />
      </div>

      {inspectLog && (
        <AdminModal
          size='lg'
          title={t('admin.auditLog.detailModal.title')}
          description={`${formatActionLabel(inspectLog.action)} (${inspectLog.action}) · ${formatEntityLabel(inspectLog.entityName)}`}
          onClose={() => setInspectLog(null)}
          footer={
            <AdminButton onClick={() => setInspectLog(null)}>
              {t('admin.auditLog.detailModal.close')}
            </AdminButton>
          }
        >
          <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm'>
            {[
              [t('admin.auditLog.detailModal.time'), logTime(inspectLog).toLocaleString(locale)],
              [
                t('admin.auditLog.detailModal.actor'),
                inspectLog.userEmail || inspectLog.userId || t('admin.auditLog.systemActor'),
              ],
              [
                t('admin.auditLog.detailModal.action'),
                `${formatActionLabel(inspectLog.action)} (${inspectLog.action})`,
              ],
              [
                t('admin.auditLog.detailModal.entity'),
                `${formatEntityLabel(inspectLog.entityName)} (${inspectLog.entityName})`,
              ],
              [t('admin.auditLog.detailModal.entityId'), inspectLog.entityId],
              [t('admin.auditLog.detailModal.studio'), inspectLog.workspaceName || '—'],
              [t('admin.auditLog.detailModal.ipAddress'), inspectLog.ipAddress || '—'],
            ].map(([label, val]) => (
              <div key={label} className='min-w-0'>
                <dt className='text-admin-muted'>{label}</dt>
                <dd className='text-admin-ink break-all tabular-nums'>{val}</dd>
              </div>
            ))}
            <div className='sm:col-span-2'>
              <dt className='text-admin-muted'>{t('admin.auditLog.detailModal.description')}</dt>
              <dd className='text-admin-ink break-words whitespace-pre-wrap'>
                {inspectLog.details || '—'}
              </dd>
            </div>
          </dl>
          <div className='mt-4'>
            <div className='text-sm font-semibold text-admin-ink mb-1.5'>
              {t('admin.auditLog.detailModal.changesData')}
            </div>
            {inspectLog.changesJson ? (
              <pre className='p-4 bg-admin-subtle border border-admin-line text-admin-ink font-mono text-xs rounded-xl overflow-auto max-h-[50vh] leading-relaxed'>
                {formatJson(inspectLog.changesJson)}
              </pre>
            ) : (
              <p className='flex items-center gap-2 text-sm text-admin-muted'>
                <AlertCircle className='w-4 h-4' aria-hidden />
                {t('admin.auditLog.detailModal.noChanges')}
              </p>
            )}
          </div>
        </AdminModal>
      )}
    </>
  );
};
