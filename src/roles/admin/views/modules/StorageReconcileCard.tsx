import React, { useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { quotaService, type StorageReconcileReportDto } from '@/services/quota.service';
import { formatBytes } from '@/shared/views/studio-overview/formatters';
import { useTranslation } from '@/lib/i18n';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminModal,
  AdminTableState,
} from '../components/AdminUi';
import { adminTable } from '../components/adminUiStyles';

const COLS = 6;

/**
 * OPS-22 (C6): Admin quét kho file, xem dung lượng thật của từng Studio và file mồ côi, rồi mới quyết định ghi số mới.
 * Không có thao tác xoá file nào ở đây.
 */
export const StorageReconcileCard: React.FC<{ onApplied: () => void }> = ({ onApplied }) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [report, setReport] = useState<StorageReconcileReportDto | null>(null);
  const [running, setRunning] = useState<'scan' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = async (apply: boolean) => {
    setRunning(apply ? 'apply' : 'scan');
    setError(null);
    try {
      const result = await quotaService.reconcileStorage(apply);
      setReport(result);
      if (apply) {
        setConfirming(false);
        onApplied();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const rows = (report?.workspaces ?? []).filter(
    (w) => w.recordedBytes !== w.computedBytes || w.orphanFiles > 0 || w.missingFiles > 0,
  );
  const changedCount = (report?.workspaces ?? []).filter(
    (w) => w.recordedBytes !== w.computedBytes,
  ).length;
  const canApply = !!report && !report.applied && changedCount > 0;

  return (
    <AdminCard
      title={t('admin.resources.reconcile.title')}
      description={t('admin.resources.reconcile.description')}
      bodyClassName='p-0'
      actions={
        <>
          <AdminButton
            onClick={() => run(false)}
            isLoading={running === 'scan'}
            disabled={running !== null}
            icon={<ScanSearch className='w-4 h-4' />}
          >
            {report ? t('admin.resources.reconcile.rescan') : t('admin.resources.reconcile.scan')}
          </AdminButton>
          {canApply && (
            <AdminButton
              variant='primary'
              onClick={() => setConfirming(true)}
              disabled={running !== null}
            >
              {t('admin.resources.reconcile.apply')}
            </AdminButton>
          )}
        </>
      }
    >
      {error && (
        <p
          className='m-5 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800'
          role='alert'
        >
          {error}
        </p>
      )}

      {!report ? (
        <p className='px-5 py-4 text-sm text-admin-muted'>{t('admin.resources.reconcile.idle')}</p>
      ) : (
        <>
          <div className='px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-admin-muted border-b border-admin-line'>
            <span className='tabular-nums'>
              {t('admin.resources.reconcile.scanned', {
                files: report.scannedFiles.toLocaleString(locale),
                size: formatBytes(report.scannedBytes),
                time: new Date(report.scannedAt).toLocaleString(locale),
              })}
            </span>
            {report.applied && (
              <AdminBadge tone='success'>{t('admin.resources.reconcile.applied')}</AdminBadge>
            )}
            {report.unattributedFiles > 0 && (
              <span className='tabular-nums'>
                {t('admin.resources.reconcile.unattributed', {
                  count: report.unattributedFiles,
                  size: formatBytes(report.unattributedBytes),
                })}
              </span>
            )}
          </div>

          <div className={adminTable.wrap}>
            <table className={adminTable.table}>
              <thead className={adminTable.thead}>
                <tr>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colStudio')}</th>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colRecorded')}</th>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colComputed')}</th>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colOrphans')}</th>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colMissing')}</th>
                  <th className={adminTable.th}>{t('admin.resources.reconcile.colDerived')}</th>
                </tr>
              </thead>
              <tbody className={adminTable.tbody}>
                {rows.length === 0 ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='empty'
                    message={t('admin.resources.reconcile.allMatch')}
                  />
                ) : (
                  rows.map((w) => (
                    <tr key={w.workspaceId} className={adminTable.tr}>
                      <td className={adminTable.td}>
                        <span className='font-semibold text-admin-ink-strong break-words'>
                          {w.name}
                        </span>
                      </td>
                      <td className={`${adminTable.td} tabular-nums`}>
                        {formatBytes(w.recordedBytes)}
                      </td>
                      <td className={`${adminTable.td} tabular-nums`}>
                        <span
                          className={
                            w.recordedBytes !== w.computedBytes
                              ? 'font-semibold text-amber-800'
                              : ''
                          }
                        >
                          {formatBytes(w.computedBytes)}
                        </span>
                      </td>
                      <td className={`${adminTable.td} tabular-nums`}>
                        {w.orphanFiles > 0
                          ? t('admin.resources.reconcile.filesAndSize', {
                              count: w.orphanFiles,
                              size: formatBytes(w.orphanBytes),
                            })
                          : '—'}
                      </td>
                      <td className={`${adminTable.td} tabular-nums`}>
                        {w.missingFiles > 0 ? (
                          <AdminBadge tone='danger'>{w.missingFiles}</AdminBadge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${adminTable.td} tabular-nums text-admin-muted`}>
                        {formatBytes(w.derivedBytes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {report.orphanSamples.length > 0 && (
            <details className='px-5 py-3 border-t border-admin-line text-sm'>
              <summary className='cursor-pointer font-medium text-admin-ink'>
                {t('admin.resources.reconcile.samplesTitle', {
                  count: report.orphanSamples.length,
                })}
              </summary>
              {report.orphanSamplesTruncated && (
                <p className='mt-2 text-xs text-admin-muted'>
                  {t('admin.resources.reconcile.samplesTruncated')}
                </p>
              )}
              <ul className='mt-2 space-y-1 max-h-72 overflow-y-auto'>
                {report.orphanSamples.map((f) => (
                  <li key={f.key} className='flex gap-3 text-xs'>
                    <span className='font-mono break-all text-admin-ink'>{f.key}</span>
                    <span className='ml-auto shrink-0 tabular-nums text-admin-muted'>
                      {formatBytes(f.sizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {confirming && (
        <AdminModal
          title={t('admin.resources.reconcile.confirmTitle')}
          description={t('admin.resources.reconcile.confirmDescription', { count: changedCount })}
          onClose={() => running === null && setConfirming(false)}
          footer={
            <>
              <AdminButton onClick={() => setConfirming(false)} disabled={running !== null}>
                {t('admin.resources.cancel')}
              </AdminButton>
              <AdminButton
                variant='primary'
                onClick={() => run(true)}
                isLoading={running === 'apply'}
              >
                {t('admin.resources.reconcile.apply')}
              </AdminButton>
            </>
          }
        >
          <p className='text-sm text-admin-muted'>{t('admin.resources.reconcile.confirmNote')}</p>
        </AdminModal>
      )}
    </AdminCard>
  );
};
