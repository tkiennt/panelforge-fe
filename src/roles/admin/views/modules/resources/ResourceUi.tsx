import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminBadge } from '../../components/AdminUi';
import { formatAmount, useLocale } from './resourceFormat';
import {
  QuotaIncreaseRequestStatus,
  QuotaResourceType,
  ResourceHealth,
  UsageMeter,
} from '@/services/quota.service';

/** Thanh mức dùng: số đã dùng / giới hạn, % và màu theo ngưỡng cảnh báo. Không chỉ dựa vào màu (có % và nhãn). */
export const UsageBar: React.FC<{
  meter: UsageMeter;
  type: QuotaResourceType;
  warningPercent: number;
  label: string;
}> = ({ meter, type, warningPercent, label }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const pct = meter.percentUsed ?? 0;
  const tone =
    pct >= 100 ? 'bg-red-500' : pct >= warningPercent ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className='min-w-[140px]'>
      <div className='flex items-baseline justify-between gap-2 text-sm tabular-nums'>
        <span className='font-medium'>{formatAmount(type, meter.used, locale)}</span>
        <span className='text-admin-muted text-xs'>
          {meter.isUnlimited
            ? t('admin.resources.unlimited')
            : `/ ${formatAmount(type, meter.quota, locale)}`}
        </span>
      </div>
      {!meter.isUnlimited && (
        <>
          <div
            className='mt-1 w-full bg-admin-hover h-1.5 rounded-full overflow-hidden'
            role='progressbar'
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          >
            <div
              className={`h-full rounded-full ${tone}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div
            className={cn(
              'mt-0.5 text-xs text-right tabular-nums',
              pct >= 100 ? 'text-red-700 font-medium' : 'text-admin-muted',
            )}
          >
            {pct.toLocaleString(locale, { maximumFractionDigits: 1 })}%
          </div>
        </>
      )}
    </div>
  );
};

export const HealthBadge: React.FC<{ health: ResourceHealth }> = ({ health }) => {
  const { t } = useTranslation();
  if (health === 'Exhausted')
    return (
      <AdminBadge tone='danger'>
        <XCircle className='w-3.5 h-3.5' aria-hidden />
        {t('admin.resources.health.Exhausted')}
      </AdminBadge>
    );
  if (health === 'NearLimit')
    return (
      <AdminBadge tone='warning'>
        <AlertTriangle className='w-3.5 h-3.5' aria-hidden />
        {t('admin.resources.health.NearLimit')}
      </AdminBadge>
    );
  return (
    <AdminBadge tone='success'>
      <CheckCircle2 className='w-3.5 h-3.5' aria-hidden />
      {t('admin.resources.health.Ok')}
    </AdminBadge>
  );
};

const STATUS_TONE: Record<
  QuotaIncreaseRequestStatus,
  'warning' | 'success' | 'danger' | 'neutral'
> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

export const RequestStatusBadge: React.FC<{ status: QuotaIncreaseRequestStatus }> = ({
  status,
}) => {
  const { t } = useTranslation();
  return (
    <AdminBadge tone={STATUS_TONE[status]}>
      {t(`admin.resources.requestStatus.${status}`)}
    </AdminBadge>
  );
};
