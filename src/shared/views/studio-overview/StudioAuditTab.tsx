import React from 'react';
import { Download, Check, Lock, History } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface StudioAuditTabProps {
  logs: any[];
  loading: boolean;
  filterEntity?: string;
  onFilterChange?: (val: string) => void;
  onRefresh?: () => void;
  workspaceName?: string;
}

export const StudioAuditTab: React.FC<StudioAuditTabProps> = ({
  logs,
  loading,
  filterEntity = '',
  workspaceName,
}) => {
  const { t, lang } = useTranslation();

  // Mốc "bây giờ" cố định cho một lần mount, để render thuần (react-hooks/purity).
  const [now] = React.useState(() => Date.now());
  const filteredLogs = React.useMemo(() => {
    if (!filterEntity.trim()) return logs;
    const q = filterEntity.toLowerCase().trim();
    return logs.filter((log) => {
      const entity = (log.entityName || log.targetType || '').toLowerCase();
      const action = (log.action || log.operation || '').toLowerCase();
      const user = (log.actorName || log.userName || log.userEmail || '').toLowerCase();
      const desc = (log.description || log.details || '').toLowerCase();
      return entity.includes(q) || action.includes(q) || user.includes(q) || desc.includes(q);
    });
  }, [logs, filterEntity]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      t('workspace.auditTab.csvTime'),
      t('workspace.auditTab.csvActor'),
      t('workspace.auditTab.csvAction'),
      t('workspace.auditTab.csvTarget'),
      t('workspace.auditTab.csvDetails'),
    ];
    const rows = filteredLogs.map((log) => [
      `"${log.timestamp || log.createdAt || log.createdUtc || ''}"`,
      `"${log.actorName || log.userName || log.userEmail || t('members.audit.systemActor')}"`,
      `"${log.action || log.operation || ''}"`,
      `"${log.entityName || log.targetType || ''}"`,
      `"${(log.description || log.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Studio_Audit_${workspaceName || 'Log'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    try {
      const then = new Date(timestamp).getTime();
      const diffMs = now - then;
      if (isNaN(diffMs) || diffMs < 0) return timestamp;

      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return t('members.audit.justNow');
      if (diffMins < 60) return t('members.audit.minutesAgo', { count: diffMins });

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return t('members.audit.hoursAgo', { count: diffHours });

      const diffDays = Math.floor(diffHours / 24);
      return t('members.audit.daysAgo', { count: diffDays });
    } catch {
      return timestamp;
    }
  };

  return (
    <div
      role='tabpanel'
      id='tabpanel-audit'
      aria-labelledby='tab-audit'
      className='flex flex-col gap-5 animate-in fade-in duration-200'
    >
      {/* Stitch Audit Header */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold text-stone-900'>{t('members.audit.title')}</h2>
          <p className='text-xs text-stone-500 mt-0.5'>{t('members.audit.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={handleExportCsv}
          className='inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-lg text-xs shadow-2xs font-medium cursor-pointer transition-colors'
          title={t('members.audit.exportCsvTitle')}
        >
          <Download className='w-4 h-4 text-orange-600' />
          <span>{t('members.audit.exportCsvBtn')}</span>
        </button>
      </div>

      {/* Stitch Activity Log Card */}
      <div className='bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col divide-y divide-stone-100 text-xs'>
        {loading ? (
          <div className='py-12 text-center text-xs text-stone-500'>
            {t('members.audit.loading')}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className='py-12 text-center text-xs text-stone-500'>{t('members.audit.empty')}</div>
        ) : (
          filteredLogs.map((log, idx) => {
            const actionText = (log.action || log.operation || '').toLowerCase();
            const isApproved =
              actionText.includes('approve') ||
              actionText.includes('duyệt') ||
              actionText.includes('hoàn tất') ||
              actionText.includes('complete');
            const isLockOrRole =
              actionText.includes('lock') ||
              actionText.includes('khóa') ||
              actionText.includes('role') ||
              actionText.includes('quyền') ||
              actionText.includes('assign');

            const actor =
              log.actorName || log.userName || log.userEmail || t('members.audit.systemActor');
            const actionDesc = log.action || log.operation || '';
            const relativeTime = formatRelativeTime(
              log.timestamp || log.createdAt || log.createdUtc,
            );
            const detailDesc =
              log.description ||
              log.details ||
              (log.entityName ? `${t('workspace.auditTab.colTarget')}: ${log.entityName}` : '');

            return (
              <div
                key={log.id || `${log.timestamp}-${idx}`}
                className='py-3 flex items-start gap-3'
              >
                {isApproved ? (
                  <div className='w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5'>
                    <Check className='w-4 h-4' />
                  </div>
                ) : isLockOrRole ? (
                  <div className='w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5'>
                    <Lock className='w-4 h-4' />
                  </div>
                ) : (
                  <div className='w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5'>
                    <History className='w-4 h-4' />
                  </div>
                )}

                <div className='flex-1 flex flex-col gap-0.5'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-stone-900 text-xs'>
                      {actor} — {actionDesc}
                    </span>
                    <span className='text-xs text-stone-400'>{relativeTime}</span>
                  </div>
                  {detailDesc && <p className='text-stone-500 text-xs'>{detailDesc}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
