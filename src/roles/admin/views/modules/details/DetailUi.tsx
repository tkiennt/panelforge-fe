import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { AuditLogDto } from '@/services/admin.service';
import { formatActionLabel, formatEntityLabel, getActionTone } from '@/shared/utils/auditLogUtils';
import { AdminBadge, AdminButton } from '../../components/AdminUi';
import { formatDateTime } from './detailFormat';

export const BackButton: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => (
  <AdminButton
    variant='ghost'
    size='sm'
    onClick={onClick}
    icon={<ArrowLeft className='w-4 h-4' />}
    className='-ml-3'
  >
    {label}
  </AdminButton>
);

/** Hàng nhãn / giá trị trong thẻ thông tin. */
export const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className='grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 py-2.5'>
    <dt className='text-sm text-admin-muted'>{label}</dt>
    <dd className='text-sm text-admin-ink min-w-0 break-words'>{children}</dd>
  </div>
);

/** Danh sách Nhật ký hệ thống gần đây (đọc từ audit_logs, BR-18). */
export const ActivityList: React.FC<{
  items: AuditLogDto[];
  locale: string;
  emptyLabel: string;
  showActor?: boolean;
}> = ({ items, locale, emptyLabel, showActor }) => {
  if (items.length === 0) return <p className='text-sm text-admin-muted'>{emptyLabel}</p>;
  return (
    <ol className='divide-y divide-admin-line/70'>
      {items.map((log) => (
        <li key={log.id} className='py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <span className='text-xs text-admin-muted tabular-nums whitespace-nowrap'>
            {formatDateTime(log.timestampUtc ?? log.createdAt, locale)}
          </span>
          <AdminBadge tone={getActionTone(log.action)}>{formatActionLabel(log.action)}</AdminBadge>
          <span className='text-sm text-admin-ink'>{formatEntityLabel(log.entityName)}</span>
          {showActor && log.userEmail && (
            <span className='text-xs text-admin-muted break-all'>{log.userEmail}</span>
          )}
        </li>
      ))}
    </ol>
  );
};

export const SummaryNumber: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className='min-w-0'>
    <div className='text-xs text-admin-muted'>{label}</div>
    <div className='text-lg font-semibold text-admin-ink-strong tabular-nums'>{value}</div>
  </div>
);
