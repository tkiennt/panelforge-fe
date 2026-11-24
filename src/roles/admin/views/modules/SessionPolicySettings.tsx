import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  adminService,
  WorkspaceSessionPolicyDto,
  UpdateWorkspaceSessionPolicyRequest,
  AiUsageReportItemDto,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminCard, AdminPageHeader, AdminToast } from '../components/AdminUi';
import { adminFieldClass, adminFocusRing, useAdminToast } from '../components/adminUiStyles';

type Limit = { enabled: boolean; value: string };
type Errors = { lifetime?: string; idle?: string; max?: string };

const DEFAULTS = { lifetime: '1440', idle: '60', max: '3' };

const fromPolicy = (v: number | null | undefined, fallback: string): Limit =>
  v !== null && v !== undefined
    ? { enabled: true, value: String(v) }
    : { enabled: false, value: fallback };

const PolicyRow: React.FC<{
  id: string;
  title: string;
  description: string;
  unit: string;
  limit: Limit;
  onChange: (l: Limit) => void;
  presets: { label: string; value: number }[];
  min: number;
  max: number;
  error?: string;
  extra?: React.ReactNode;
}> = ({ id, title, description, unit, limit, onChange, presets, min, max, error, extra }) => {
  const { t } = useTranslation();
  return (
    <div className='py-5 first:pt-0 last:pb-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4'>
      <label htmlFor={`${id}-toggle`} className='flex items-start gap-3 cursor-pointer self-start'>
        <input
          id={`${id}-toggle`}
          type='checkbox'
          checked={limit.enabled}
          onChange={(e) => onChange({ ...limit, enabled: e.target.checked })}
          className='mt-0.5 w-5 h-5 accent-[#F97316] cursor-pointer'
        />
        <span>
          <span className='block text-sm font-semibold text-admin-ink-strong'>{title}</span>
          <span className='block text-sm text-admin-muted'>{description}</span>
        </span>
      </label>
      <div className='space-y-2'>
        {limit.enabled ? (
          <>
            <div className='flex flex-wrap items-center gap-2'>
              <input
                id={`${id}-value`}
                type='number'
                min={min}
                max={max}
                inputMode='numeric'
                value={limit.value}
                onChange={(e) => onChange({ ...limit, value: e.target.value })}
                aria-label={`${title} (${unit})`}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                className={cn(adminFieldClass, 'w-36 tabular-nums', error && 'border-red-400')}
              />
              <span className='text-sm text-admin-muted'>{unit}</span>
            </div>
            {error && (
              <p id={`${id}-error`} role='alert' className='text-xs text-red-700'>
                {error}
              </p>
            )}
            <div
              className='flex flex-wrap gap-1.5'
              role='group'
              aria-label={t('admin.sessionPolicy.presetsAria')}
            >
              {presets.map((p) => {
                const active = Number(limit.value) === p.value;
                return (
                  <button
                    key={p.value}
                    type='button'
                    aria-pressed={active}
                    onClick={() => onChange({ ...limit, value: String(p.value) })}
                    className={cn(
                      'min-h-9 px-3 rounded-lg border text-xs transition-colors cursor-pointer',
                      adminFocusRing,
                      active
                        ? 'border-admin-accent bg-admin-accent-soft text-admin-ink-strong font-semibold'
                        : 'border-admin-line bg-admin-field text-admin-ink hover:bg-admin-hover',
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {extra}
          </>
        ) : (
          <p className='text-sm text-admin-muted pt-0.5'>{t('admin.sessionPolicy.unlimited')}</p>
        )}
      </div>
    </div>
  );
};

export const SessionPolicySettings: React.FC = () => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [lifetime, setLifetime] = useState<Limit>({ enabled: false, value: DEFAULTS.lifetime });
  const [idle, setIdle] = useState<Limit>({ enabled: false, value: DEFAULTS.idle });
  const [maxSessions, setMaxSessions] = useState<Limit>({ enabled: false, value: DEFAULTS.max });
  const [errors, setErrors] = useState<Errors>({});

  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const usageList: AiUsageReportItemDto[] = await adminService.getAiUsage();
      const list = (usageList || []).map((item) => ({
        id: item.workspaceId,
        name: item.workspaceName || `Studio ${item.workspaceId.substring(0, 6)}`,
      }));
      setWorkspaces(list);
      setSelectedWorkspaceId((prev) => prev || list[0]?.id || '');
    } catch (err: any) {
      showToast(
        t('admin.sessionPolicy.toast.loadStudiosFailed', { message: err.message }),
        'warning',
      );
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const applyPolicy = (p: WorkspaceSessionPolicyDto) => {
    setLifetime(fromPolicy(p.sessionLifetimeMinutes, DEFAULTS.lifetime));
    setIdle(fromPolicy(p.idleTimeoutMinutes, DEFAULTS.idle));
    setMaxSessions(fromPolicy(p.maxConcurrentSessions, DEFAULTS.max));
    setErrors({});
  };

  const fetchPolicy = useCallback(async (wsId: string) => {
    if (!wsId) return;
    setLoadingPolicy(true);
    setPolicyError(false);
    try {
      applyPolicy(await adminService.getWorkspaceSessionPolicy(wsId));
    } catch {
      setPolicyError(true);
    } finally {
      setLoadingPolicy(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) fetchPolicy(selectedWorkspaceId);
  }, [selectedWorkspaceId, fetchPolicy]);

  const toInt = (l: Limit) => (/^\d+$/.test(l.value.trim()) ? Number(l.value.trim()) : NaN);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || savingPolicy) return;

    const lifetimeVal = lifetime.enabled ? toInt(lifetime) : null;
    const idleVal = idle.enabled ? toInt(idle) : null;
    const maxVal = maxSessions.enabled ? toInt(maxSessions) : null;

    const next: Errors = {};
    if (lifetimeVal !== null && (isNaN(lifetimeVal) || lifetimeVal < 5 || lifetimeVal > 43200))
      next.lifetime = t('admin.sessionPolicy.errors.lifetimeRange');
    if (idleVal !== null) {
      if (isNaN(idleVal) || idleVal < 1) next.idle = t('admin.sessionPolicy.errors.idleMin');
      else if (lifetimeVal !== null && !isNaN(lifetimeVal) && idleVal > lifetimeVal)
        next.idle = t('admin.sessionPolicy.errors.idleExceedsLifetime');
    }
    if (maxVal !== null && (isNaN(maxVal) || maxVal < 1 || maxVal > 100))
      next.max = t('admin.sessionPolicy.errors.maxRange');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSavingPolicy(true);
    try {
      // BE yêu cầu gửi đủ 3 field; null = bỏ giới hạn đó
      const payload: UpdateWorkspaceSessionPolicyRequest = {
        sessionLifetimeMinutes: lifetimeVal,
        idleTimeoutMinutes: idleVal,
        maxConcurrentSessions: maxVal,
      };
      applyPolicy(await adminService.updateWorkspaceSessionPolicy(selectedWorkspaceId, payload));
      showToast(t('admin.sessionPolicy.toast.saveSuccess'));
    } catch (err: any) {
      showToast(err.message || t('admin.sessionPolicy.toast.saveFailed'), 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const lifetimeMins = toInt(lifetime);

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.sessionPolicy.title')}
        description={t('admin.sessionPolicy.description')}
        actions={
          <AdminButton
            onClick={() => selectedWorkspaceId && fetchPolicy(selectedWorkspaceId)}
            isLoading={loadingPolicy}
            disabled={!selectedWorkspaceId}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            {t('admin.sessionPolicy.refresh')}
          </AdminButton>
        }
      />

      {!loadingWorkspaces && workspaces.length === 0 ? (
        <AdminCard>
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-admin-muted'>
            {t('admin.sessionPolicy.empty')}
            <AdminButton size='sm' onClick={fetchWorkspaces}>
              {t('admin.sessionPolicy.reload')}
            </AdminButton>
          </div>
        </AdminCard>
      ) : (
        <form onSubmit={handleSave} noValidate className='max-w-5xl space-y-4'>
          <AdminCard
            title={t('admin.sessionPolicy.cardTitle')}
            actions={
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                disabled={loadingWorkspaces || savingPolicy}
                aria-label={t('admin.sessionPolicy.selectStudioAria')}
                className={cn(adminFieldClass, 'w-auto min-w-[220px] max-w-full')}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
                {workspaces.length === 0 && (
                  <option value=''>{t('admin.sessionPolicy.loadingOption')}</option>
                )}
              </select>
            }
          >
            {loadingPolicy || loadingWorkspaces ? (
              <p className='text-sm text-admin-muted py-6 text-center'>
                {t('admin.sessionPolicy.loadingPolicy')}
              </p>
            ) : policyError ? (
              <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
                {t('admin.sessionPolicy.loadPolicyError')}
                <AdminButton size='sm' onClick={() => fetchPolicy(selectedWorkspaceId)}>
                  {t('admin.sessionPolicy.retry')}
                </AdminButton>
              </div>
            ) : (
              <div className='divide-y divide-admin-line'>
                <PolicyRow
                  id='lifetime'
                  title={t('admin.sessionPolicy.lifetime.title')}
                  description={t('admin.sessionPolicy.lifetime.description')}
                  unit={t('admin.sessionPolicy.lifetime.unit')}
                  limit={lifetime}
                  onChange={setLifetime}
                  min={5}
                  max={43200}
                  error={errors.lifetime}
                  presets={[
                    { label: t('admin.sessionPolicy.presets.h2'), value: 120 },
                    { label: t('admin.sessionPolicy.presets.h8'), value: 480 },
                    { label: t('admin.sessionPolicy.presets.d1'), value: 1440 },
                    { label: t('admin.sessionPolicy.presets.d7'), value: 10080 },
                    { label: t('admin.sessionPolicy.presets.d30'), value: 43200 },
                  ]}
                  extra={
                    !isNaN(lifetimeMins) && lifetimeMins >= 60 ? (
                      <p className='text-xs text-admin-muted tabular-nums'>
                        {t('admin.sessionPolicy.lifetime.approxHours', {
                          hours: (lifetimeMins / 60).toLocaleString(locale, {
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </p>
                    ) : null
                  }
                />
                <PolicyRow
                  id='idle'
                  title={t('admin.sessionPolicy.idle.title')}
                  description={t('admin.sessionPolicy.idle.description')}
                  unit={t('admin.sessionPolicy.idle.unit')}
                  limit={idle}
                  onChange={setIdle}
                  min={1}
                  max={lifetime.enabled && !isNaN(lifetimeMins) ? lifetimeMins : 43200}
                  error={errors.idle}
                  presets={[
                    { label: t('admin.sessionPolicy.presets.m15'), value: 15 },
                    { label: t('admin.sessionPolicy.presets.m30'), value: 30 },
                    { label: t('admin.sessionPolicy.presets.h1'), value: 60 },
                    { label: t('admin.sessionPolicy.presets.h2'), value: 120 },
                  ]}
                  extra={
                    <p className='text-xs text-admin-muted'>
                      {t('admin.sessionPolicy.idle.delayNote')}
                    </p>
                  }
                />
                <PolicyRow
                  id='max'
                  title={t('admin.sessionPolicy.maxSessions.title')}
                  description={t('admin.sessionPolicy.maxSessions.description')}
                  unit={t('admin.sessionPolicy.maxSessions.unit')}
                  limit={maxSessions}
                  onChange={setMaxSessions}
                  min={1}
                  max={100}
                  error={errors.max}
                  presets={[
                    { label: '1', value: 1 },
                    { label: '2', value: 2 },
                    { label: '3', value: 3 },
                    { label: '5', value: 5 },
                  ]}
                />
              </div>
            )}
          </AdminCard>

          <p className='text-sm text-admin-muted'>{t('admin.sessionPolicy.strictestNote')}</p>

          <div className='flex justify-end gap-2'>
            <AdminButton
              onClick={() => fetchPolicy(selectedWorkspaceId)}
              disabled={savingPolicy || loadingPolicy || !selectedWorkspaceId}
            >
              {t('admin.sessionPolicy.reset')}
            </AdminButton>
            <AdminButton
              type='submit'
              variant='primary'
              isLoading={savingPolicy}
              disabled={loadingPolicy || policyError || !selectedWorkspaceId}
            >
              {t('admin.sessionPolicy.save')}
            </AdminButton>
          </div>
        </form>
      )}
    </>
  );
};
