import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  adminService,
  WorkspaceSessionPolicyDto,
  UpdateWorkspaceSessionPolicyRequest,
  AiUsageReportItemDto,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
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
}> = ({ id, title, description, unit, limit, onChange, presets, min, max, error, extra }) => (
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
          <div className='flex flex-wrap gap-1.5' role='group' aria-label='Giá trị gợi ý'>
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
        <p className='text-sm text-admin-muted pt-0.5'>Không giới hạn</p>
      )}
    </div>
  </div>
);

export const SessionPolicySettings: React.FC = () => {
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
      showToast('Không tải được danh sách Studio: ' + err.message, 'warning');
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [showToast]);

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
      next.lifetime = 'Nhập từ 5 đến 43.200 phút (30 ngày).';
    if (idleVal !== null) {
      if (isNaN(idleVal) || idleVal < 1) next.idle = 'Nhập từ 1 phút trở lên.';
      else if (lifetimeVal !== null && !isNaN(lifetimeVal) && idleVal > lifetimeVal)
        next.idle = 'Không được lớn hơn thời hạn phiên.';
    }
    if (maxVal !== null && (isNaN(maxVal) || maxVal < 1 || maxVal > 100))
      next.max = 'Nhập từ 1 đến 100.';
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
      showToast('Đã lưu chính sách phiên. Áp dụng từ lần đăng nhập tiếp theo.');
    } catch (err: any) {
      showToast(err.message || 'Không lưu được chính sách phiên.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const lifetimeMins = toInt(lifetime);

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title='Chính sách phiên'
        description='Giới hạn thời gian đăng nhập và số thiết bị cho thành viên của từng Studio.'
        actions={
          <AdminButton
            onClick={() => selectedWorkspaceId && fetchPolicy(selectedWorkspaceId)}
            isLoading={loadingPolicy}
            disabled={!selectedWorkspaceId}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            Làm mới
          </AdminButton>
        }
      />

      {!loadingWorkspaces && workspaces.length === 0 ? (
        <AdminCard>
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-admin-muted'>
            Chưa có Studio nào để cấu hình.
            <AdminButton size='sm' onClick={fetchWorkspaces}>
              Tải lại
            </AdminButton>
          </div>
        </AdminCard>
      ) : (
        <form onSubmit={handleSave} noValidate className='max-w-5xl space-y-4'>
          <AdminCard
            title='Giới hạn phiên'
            actions={
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                disabled={loadingWorkspaces || savingPolicy}
                aria-label='Chọn Studio'
                className={cn(adminFieldClass, 'w-auto min-w-[220px] max-w-full')}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
                {workspaces.length === 0 && <option value=''>Đang tải…</option>}
              </select>
            }
          >
            {loadingPolicy || loadingWorkspaces ? (
              <p className='text-sm text-admin-muted py-6 text-center'>Đang tải chính sách…</p>
            ) : policyError ? (
              <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
                Không tải được chính sách của Studio này.
                <AdminButton size='sm' onClick={() => fetchPolicy(selectedWorkspaceId)}>
                  Thử lại
                </AdminButton>
              </div>
            ) : (
              <div className='divide-y divide-admin-line'>
                <PolicyRow
                  id='lifetime'
                  title='Thời hạn phiên tối đa'
                  description='Sau thời gian này kể từ lúc đăng nhập, người dùng phải đăng nhập lại.'
                  unit='phút'
                  limit={lifetime}
                  onChange={setLifetime}
                  min={5}
                  max={43200}
                  error={errors.lifetime}
                  presets={[
                    { label: '2 giờ', value: 120 },
                    { label: '8 giờ', value: 480 },
                    { label: '1 ngày', value: 1440 },
                    { label: '7 ngày', value: 10080 },
                    { label: '30 ngày', value: 43200 },
                  ]}
                  extra={
                    !isNaN(lifetimeMins) && lifetimeMins >= 60 ? (
                      <p className='text-xs text-admin-muted tabular-nums'>
                        ≈{' '}
                        {(lifetimeMins / 60).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}{' '}
                        giờ
                      </p>
                    ) : null
                  }
                />
                <PolicyRow
                  id='idle'
                  title='Tự đăng xuất khi không hoạt động'
                  description='Phiên bị thu hồi nếu người dùng không thao tác trong khoảng này.'
                  unit='phút'
                  limit={idle}
                  onChange={setIdle}
                  min={1}
                  max={lifetime.enabled && !isNaN(lifetimeMins) ? lifetimeMins : 43200}
                  error={errors.idle}
                  presets={[
                    { label: '15 phút', value: 15 },
                    { label: '30 phút', value: 30 },
                    { label: '1 giờ', value: 60 },
                    { label: '2 giờ', value: 120 },
                  ]}
                  extra={
                    <p className='text-xs text-admin-muted'>
                      Giá trị dưới 30 phút có thể chậm tối đa 30 phút mới có hiệu lực.
                    </p>
                  }
                />
                <PolicyRow
                  id='max'
                  title='Số thiết bị đăng nhập cùng lúc'
                  description='Khi vượt giới hạn, phiên đăng nhập cũ nhất sẽ bị đăng xuất.'
                  unit='thiết bị'
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

          <p className='text-sm text-admin-muted'>
            Người dùng thuộc nhiều Studio sẽ áp dụng giới hạn chặt nhất.
          </p>

          <div className='flex justify-end gap-2'>
            <AdminButton
              onClick={() => fetchPolicy(selectedWorkspaceId)}
              disabled={savingPolicy || loadingPolicy || !selectedWorkspaceId}
            >
              Hoàn tác
            </AdminButton>
            <AdminButton
              type='submit'
              variant='primary'
              isLoading={savingPolicy}
              disabled={loadingPolicy || policyError || !selectedWorkspaceId}
            >
              Lưu chính sách
            </AdminButton>
          </div>
        </form>
      )}
    </>
  );
};
