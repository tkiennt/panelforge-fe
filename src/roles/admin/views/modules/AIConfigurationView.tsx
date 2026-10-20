import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, KeyRound } from 'lucide-react';
import {
  adminService,
  AdminWorkspaceDto,
  AiUsageReportItemDto,
  AiUsageRecordDto,
  AiUsageRecordsFilterParams,
  WorkspaceAiConfigDto,
  downloadBlob,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  AdminPagination,
  AdminStat,
  AdminTableState,
  AdminToast,
  AdminTone,
} from '../components/AdminUi';
import {
  adminFieldClass,
  adminFocusRing,
  adminTable,
  useAdminToast,
} from '../components/adminUiStyles';

const STATUS_OPTIONS: { value: string; label: string; tone: AdminTone }[] = [
  { value: '', label: 'Tất cả', tone: 'neutral' },
  { value: 'Succeeded', label: 'Thành công', tone: 'success' },
  { value: 'Failed', label: 'Thất bại', tone: 'danger' },
  { value: 'QuotaExceeded', label: 'Vượt quota', tone: 'warning' },
  { value: 'ProviderUnavailable', label: 'Nhà cung cấp lỗi', tone: 'danger' },
  { value: 'Disabled', label: 'AI đang tắt', tone: 'neutral' },
];

const PROVIDERS = ['Google Gemini', 'OpenAI', 'Anthropic Claude'];
const KNOWN_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'claude-3-5-sonnet', 'gpt-4o'];

const fmt = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN');

type ShowToast = (m: string, t?: 'success' | 'warning' | 'error') => void;

/* ---------- Per-Studio AI configuration (GET/PUT ai-config) ---------- */

const StudioAiConfigPanel: React.FC<{ showToast: ShowToast }> = ({ showToast }) => {
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loadingWs, setLoadingWs] = useState(true);
  const [wsError, setWsError] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');

  const [config, setConfig] = useState<WorkspaceAiConfigDto | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [apiKey, setApiKey] = useState('');
  const [tokenQuota, setTokenQuota] = useState('0');
  const [imageQuota, setImageQuota] = useState('0');
  const [models, setModels] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ token?: string; image?: string }>({});

  const loadWorkspaces = useCallback(async () => {
    setLoadingWs(true);
    setWsError(false);
    try {
      const list = await adminService.getWorkspaces();
      setWorkspaces(list || []);
      setWorkspaceId((prev) => prev || list?.[0]?.id || '');
    } catch {
      setWsError(true);
    } finally {
      setLoadingWs(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const applyConfig = (c: WorkspaceAiConfigDto) => {
    setConfig(c);
    setIsEnabled(c.isEnabled);
    setProvider(c.provider || PROVIDERS[0]);
    setApiKey('');
    setTokenQuota(String(c.monthlyTokenQuota ?? 0));
    setImageQuota(String(c.monthlyImageQuota ?? 0));
    setModels(c.allowedModels || []);
    setErrors({});
  };

  const loadConfig = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingConfig(true);
    setConfigError(false);
    try {
      applyConfig(await adminService.getWorkspaceAiConfig(id));
    } catch {
      setConfig(null);
      setConfigError(true);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadConfig(workspaceId);
  }, [workspaceId, loadConfig]);

  const parseQuota = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || saving) return;
    const token = parseQuota(tokenQuota);
    const image = parseQuota(imageQuota);
    setErrors({
      token: token === null ? 'Nhập số nguyên không âm.' : undefined,
      image: image === null ? 'Nhập số nguyên không âm.' : undefined,
    });
    if (token === null || image === null) return;

    setSaving(true);
    try {
      const updated = await adminService.updateWorkspaceAiConfig(workspaceId, {
        provider,
        apiKey: apiKey.trim() || undefined,
        isEnabled,
        monthlyTokenQuota: token,
        monthlyImageQuota: image,
        allowedModels: models,
      });
      applyConfig(updated);
      showToast('Đã lưu cấu hình AI.');
    } catch (err: any) {
      showToast(err.message || 'Không lưu được cấu hình AI.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = Array.from(new Set([...KNOWN_MODELS, ...(config?.allowedModels || [])]));
  const providerOptions = PROVIDERS.includes(provider) ? PROVIDERS : [provider, ...PROVIDERS];

  if (wsError)
    return (
      <AdminCard>
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
          Không tải được danh sách Studio.
          <AdminButton size='sm' onClick={loadWorkspaces}>
            Thử lại
          </AdminButton>
        </div>
      </AdminCard>
    );

  if (!loadingWs && workspaces.length === 0)
    return (
      <AdminCard>
        <p className='text-sm text-admin-muted'>Chưa có Studio nào để cấu hình AI.</p>
      </AdminCard>
    );

  return (
    <form
      onSubmit={handleSave}
      noValidate
      className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start'
    >
      <AdminCard
        title='Cấu hình theo Studio'
        actions={
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            disabled={loadingWs || saving}
            aria-label='Chọn Studio'
            className={cn(adminFieldClass, 'w-auto min-w-[220px] max-w-full')}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        }
      >
        {loadingConfig || loadingWs ? (
          <p className='text-sm text-admin-muted py-6 text-center'>Đang tải cấu hình…</p>
        ) : configError ? (
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
            Không tải được cấu hình AI của Studio này.
            <AdminButton size='sm' onClick={() => loadConfig(workspaceId)}>
              Thử lại
            </AdminButton>
          </div>
        ) : (
          <div className='space-y-6 max-w-3xl'>
            <label className='flex items-start gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className='mt-0.5 w-5 h-5 accent-[#F97316]'
              />
              <span>
                <span className='block text-sm font-semibold text-admin-ink'>
                  Bật AI cho Studio
                </span>
                <span className='block text-sm text-admin-muted'>
                  Khi tắt, mọi yêu cầu AI của Studio sẽ bị từ chối.
                </span>
              </span>
            </label>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <AdminField label='Nhà cung cấp' htmlFor='ai-provider'>
                <select
                  id='ai-provider'
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={adminFieldClass}
                >
                  {providerOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField
                label='API key'
                htmlFor='ai-key'
                hint={
                  config?.hasApiKey
                    ? 'Để trống nếu giữ nguyên khóa đã lưu.'
                    : 'Khóa được kiểm tra với nhà cung cấp trước khi lưu.'
                }
              >
                <input
                  id='ai-key'
                  type='password'
                  autoComplete='off'
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config?.hasApiKey ? '••••••••' : 'Nhập API key'}
                  className={cn(adminFieldClass, 'font-mono')}
                />
              </AdminField>
              <AdminField
                label='Quota token mỗi tháng'
                htmlFor='ai-token-quota'
                required
                hint='0 = không giới hạn'
                error={errors.token}
              >
                <input
                  id='ai-token-quota'
                  type='number'
                  min={0}
                  inputMode='numeric'
                  value={tokenQuota}
                  onChange={(e) => setTokenQuota(e.target.value)}
                  aria-invalid={!!errors.token}
                  className={cn(adminFieldClass, 'tabular-nums')}
                />
              </AdminField>
              <AdminField
                label='Quota sinh ảnh mỗi tháng'
                htmlFor='ai-image-quota'
                required
                hint='0 = không giới hạn'
                error={errors.image}
              >
                <input
                  id='ai-image-quota'
                  type='number'
                  min={0}
                  inputMode='numeric'
                  value={imageQuota}
                  onChange={(e) => setImageQuota(e.target.value)}
                  aria-invalid={!!errors.image}
                  className={cn(adminFieldClass, 'tabular-nums')}
                />
              </AdminField>
            </div>

            <fieldset>
              <legend className='text-sm font-semibold text-admin-ink mb-2'>Model được phép</legend>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {modelOptions.map((m) => {
                  const checked = models.includes(m);
                  return (
                    <label
                      key={m}
                      className={cn(
                        'flex items-center gap-3 min-h-11 px-3 rounded-xl border cursor-pointer transition-colors',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-admin-accent',
                        checked
                          ? 'border-admin-accent bg-admin-accent-soft'
                          : 'border-admin-line bg-admin-field hover:bg-admin-hover',
                      )}
                    >
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() =>
                          setModels((prev) =>
                            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                          )
                        }
                        className='w-4 h-4 accent-[#F97316]'
                      />
                      <span className='text-sm font-mono text-admin-ink'>{m}</span>
                    </label>
                  );
                })}
              </div>
              <p className='mt-2 text-xs text-admin-muted'>
                Không chọn model nào thì giữ nguyên danh sách hiện tại.
              </p>
            </fieldset>

            <div className='flex justify-end gap-2 pt-4 border-t border-admin-line'>
              <AdminButton
                onClick={() => config && applyConfig(config)}
                disabled={saving || !config}
              >
                Hoàn tác
              </AdminButton>
              <AdminButton type='submit' variant='primary' isLoading={saving}>
                Lưu cấu hình
              </AdminButton>
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard title='Tháng này'>
        {config && !loadingConfig ? (
          <dl className='space-y-4 text-sm'>
            <div>
              <dt className='text-admin-muted'>Trạng thái</dt>
              <dd className='mt-1 flex flex-wrap gap-1.5'>
                <AdminBadge tone={config.isEnabled ? 'success' : 'neutral'}>
                  {config.isEnabled ? 'AI đang bật' : 'AI đang tắt'}
                </AdminBadge>
                <AdminBadge tone={config.hasApiKey ? 'success' : 'warning'}>
                  <KeyRound className='w-3 h-3' aria-hidden />
                  {config.hasApiKey ? 'Đã có API key' : 'Chưa có API key'}
                </AdminBadge>
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>Token đã dùng</dt>
              <dd className='text-lg font-semibold text-admin-ink-strong tabular-nums'>
                {fmt(config.usedTokensCurrentMonth)}
                <span className='text-sm font-normal text-admin-muted'>
                  {' '}
                  / {config.monthlyTokenQuota ? fmt(config.monthlyTokenQuota) : 'không giới hạn'}
                </span>
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>Ảnh đã sinh</dt>
              <dd className='text-lg font-semibold text-admin-ink-strong tabular-nums'>
                {fmt(config.usedImagesCurrentMonth)}
                <span className='text-sm font-normal text-admin-muted'>
                  {' '}
                  / {config.monthlyImageQuota ? fmt(config.monthlyImageQuota) : 'không giới hạn'}
                </span>
              </dd>
            </div>
            {config.lastResetAt && (
              <div>
                <dt className='text-admin-muted'>Đặt lại gần nhất</dt>
                <dd className='tabular-nums'>
                  {new Date(config.lastResetAt).toLocaleDateString('vi-VN')}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className='text-sm text-admin-muted'>—</p>
        )}
      </AdminCard>
    </form>
  );
};

/* ---------- Usage reports & call records ---------- */

const UsageReportsPanel: React.FC<{ showToast: ShowToast }> = ({ showToast }) => {
  const [reports, setReports] = useState<AiUsageReportItemDto[]>([]);
  const [records, setRecords] = useState<AiUsageRecordDto[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [filterFeature, setFilterFeature] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [dateError, setDateError] = useState<string | null>(null);

  const buildFilterParams = useCallback((): AiUsageRecordsFilterParams | null => {
    setDateError(null);
    let fromIso: string | undefined;
    let toIso: string | undefined;
    if (filterFrom) fromIso = new Date(`${filterFrom}T00:00:00Z`).toISOString();
    if (filterTo) toIso = new Date(`${filterTo}T23:59:59Z`).toISOString();
    if (fromIso && toIso && fromIso > toIso) {
      setDateError('“Đến ngày” phải sau hoặc bằng “Từ ngày”.');
      return null;
    }
    const params: AiUsageRecordsFilterParams = { page, pageSize };
    if (filterFeature.trim()) params.feature = filterFeature.trim();
    if (filterStatus) params.status = filterStatus;
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;
    return params;
  }, [page, pageSize, filterFeature, filterStatus, filterFrom, filterTo]);

  const fetchReports = useCallback(async () => {
    try {
      let fromIso: string | undefined;
      let toIso: string | undefined;
      if (filterFrom) fromIso = new Date(`${filterFrom}T00:00:00Z`).toISOString();
      if (filterTo) toIso = new Date(`${filterTo}T23:59:59Z`).toISOString();
      const data = await adminService.getAiUsage({ from: fromIso, to: toIso });
      setReports(data || []);
    } catch (err: any) {
      console.warn('Cannot fetch AI usage report:', err);
    }
  }, [filterFrom, filterTo]);

  const fetchRecords = useCallback(async () => {
    const params = buildFilterParams();
    if (!params) return;
    setLoadingRecords(true);
    setRecordsError(false);
    try {
      const res = await adminService.getAiUsageRecords(params);
      setRecords(res.items || []);
      setTotalRecords(res.totalCount || 0);
    } catch (err: any) {
      setRecordsError(true);
      showToast(err.message || 'Không thể tải lịch sử gọi AI.', 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [buildFilterParams, showToast]);

  useEffect(() => {
    fetchReports();
    fetchRecords();
  }, [fetchReports, fetchRecords]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
    fetchRecords();
  };

  const handleResetFilter = () => {
    setFilterFeature('');
    setFilterStatus('');
    setFilterFrom('');
    setFilterTo('');
    setDateError(null);
    setPage(1);
  };

  const isFiltered = !!(filterFeature.trim() || filterStatus || filterFrom || filterTo);

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    if (!params || exportingCsv) return;
    setExportingCsv(true);
    try {
      const result = await adminService.exportAiUsage(params);
      downloadBlob(result.blob, result.fileName);
      showToast(
        result.isTruncated
          ? `Đã tải ${fmt(result.rowCount)} bản ghi. File chỉ gồm 10.000 dòng mới nhất.`
          : `Đã xuất ${fmt(result.rowCount)} bản ghi.`,
        result.isTruncated ? 'warning' : 'success',
      );
    } catch (err: any) {
      showToast(err.message || 'Không xuất được file CSV.', 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const sum = (k: keyof AiUsageReportItemDto) =>
    reports.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
  const COLS = 6;

  return (
    <>
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <AdminStat
          label='Lượt gọi AI'
          value={fmt(sum('callCount'))}
          hint={`${fmt(sum('succeededCount'))} thành công`}
        />
        <AdminStat label='Token đã dùng' value={fmt(sum('totalTokens'))} />
        <AdminStat
          label='Chi phí ước tính'
          value={`$${sum('totalCostUsd').toFixed(4)}`}
          hint='Theo bảng giá nhà cung cấp'
        />
        <AdminStat
          label='Bị chặn / lỗi'
          value={`${fmt(sum('blockedCount'))} / ${fmt(sum('failedCount'))}`}
        />
      </div>

      <form
        onSubmit={handleApplyFilter}
        className='bg-admin-card border border-admin-line rounded-2xl p-5 space-y-4'
        aria-label='Bộ lọc lịch sử AI'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          <AdminField label='Tính năng' htmlFor='ai-f-feature'>
            <input
              id='ai-f-feature'
              type='text'
              placeholder='Ví dụ: BibleGrounding'
              value={filterFeature}
              onChange={(e) => setFilterFeature(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label='Trạng thái' htmlFor='ai-f-status'>
            <select
              id='ai-f-status'
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={adminFieldClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label='Từ ngày' htmlFor='ai-f-from'>
            <input
              id='ai-f-from'
              type='date'
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label='Đến ngày' htmlFor='ai-f-to' error={dateError}>
            <input
              id='ai-f-to'
              type='date'
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              aria-invalid={!!dateError}
              className={cn(adminFieldClass, dateError && 'border-red-400')}
            />
          </AdminField>
        </div>
        <div className='flex flex-wrap justify-end gap-2'>
          <AdminButton variant='ghost' onClick={handleResetFilter} disabled={!isFiltered}>
            Xóa bộ lọc
          </AdminButton>
          <AdminButton
            onClick={handleExportCsv}
            isLoading={exportingCsv}
            disabled={loadingRecords}
            icon={<Download className='w-4 h-4' />}
          >
            Xuất CSV
          </AdminButton>
          <AdminButton type='submit' variant='primary'>
            Áp dụng
          </AdminButton>
        </div>
      </form>

      <div className='bg-admin-card border border-admin-line rounded-2xl overflow-hidden'>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>Thời gian</th>
                <th className={adminTable.th}>Tính năng</th>
                <th className={adminTable.th}>Nhà cung cấp / Model</th>
                <th className={`${adminTable.th} text-right`}>Token</th>
                <th className={`${adminTable.th} text-right`}>Chi phí</th>
                <th className={adminTable.th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loadingRecords ? (
                <AdminTableState colSpan={COLS} kind='loading' message='Đang tải lịch sử…' />
              ) : recordsError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message='Không tải được lịch sử gọi AI.'
                  action={
                    <AdminButton size='sm' onClick={fetchRecords}>
                      Thử lại
                    </AdminButton>
                  }
                />
              ) : records.length === 0 ? (
                isFiltered ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='no-results'
                    message='Không có lượt gọi phù hợp bộ lọc.'
                  />
                ) : (
                  <AdminTableState colSpan={COLS} kind='empty' message='Chưa có lượt gọi AI nào.' />
                )
              ) : (
                records.map((rec) => {
                  const st = STATUS_OPTIONS.find((s) => s.value === rec.status);
                  return (
                    <tr key={rec.id} className={adminTable.tr}>
                      <td className={`${adminTable.td} whitespace-nowrap tabular-nums`}>
                        <div className='font-medium text-admin-ink-strong'>
                          {new Date(rec.occurredAtUtc).toLocaleTimeString('vi-VN')}
                        </div>
                        <div className='text-xs text-admin-muted'>
                          {new Date(rec.occurredAtUtc).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className={adminTable.td}>
                        <div className='font-medium'>{rec.feature}</div>
                        {rec.workspaceId && (
                          <div
                            className='text-xs text-admin-muted font-mono'
                            title={rec.workspaceId}
                          >
                            Studio {rec.workspaceId.substring(0, 8)}…
                          </div>
                        )}
                      </td>
                      <td className={adminTable.td}>
                        <div className='font-medium'>{rec.provider}</div>
                        <div className='text-xs text-admin-muted font-mono'>{rec.model || '—'}</div>
                      </td>
                      <td className={`${adminTable.td} text-right tabular-nums whitespace-nowrap`}>
                        <div className='font-medium'>{fmt(rec.totalTokens)}</div>
                        <div className='text-xs text-admin-muted'>
                          {fmt(rec.promptTokens)} vào · {fmt(rec.completionTokens)} ra
                        </div>
                      </td>
                      <td className={`${adminTable.td} text-right tabular-nums whitespace-nowrap`}>
                        ${(rec.costUsd || 0).toFixed(5)}
                        {rec.durationMs ? (
                          <div className='text-xs text-admin-muted'>{fmt(rec.durationMs)} ms</div>
                        ) : null}
                      </td>
                      <td className={adminTable.td}>
                        <AdminBadge tone={st?.tone ?? 'neutral'}>
                          {st?.label ?? rec.status}
                        </AdminBadge>
                        {rec.errorMessage && (
                          <div
                            className='mt-1 text-xs text-red-700 max-w-xs line-clamp-2 break-words'
                            title={rec.errorMessage}
                          >
                            {rec.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          shown={records.length}
          total={totalRecords}
          unit='lượt gọi'
          disabled={loadingRecords}
          onPageChange={setPage}
        />
      </div>
    </>
  );
};

export const AIConfigurationView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'reports'>('credentials');
  const { toast, show: showToast, clear: clearToast } = useAdminToast();
  const [reloadKey, setReloadKey] = useState(0);

  const tabs = [
    { id: 'credentials' as const, label: 'Cấu hình' },
    { id: 'reports' as const, label: 'Báo cáo sử dụng' },
  ];

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />
      <AdminPageHeader
        title='Cấu hình AI'
        description='Nhà cung cấp, model và quota AI của từng Studio.'
        actions={
          <AdminButton
            onClick={() => setReloadKey((k) => k + 1)}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            Làm mới
          </AdminButton>
        }
      />

      <div
        role='tablist'
        aria-label='Cấu hình AI'
        className='inline-flex gap-1 p-1 rounded-xl border border-admin-line bg-admin-card'
      >
        {tabs.map((t) => {
          const active = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => setActiveSubTab(t.id)}
              className={cn(
                'min-h-10 px-4 rounded-lg text-sm transition-colors cursor-pointer',
                adminFocusRing,
                active
                  ? 'bg-admin-accent-soft text-admin-ink-strong font-semibold'
                  : 'text-admin-muted hover:text-admin-ink hover:bg-admin-hover',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'credentials' ? (
        <StudioAiConfigPanel key={reloadKey} showToast={showToast} />
      ) : (
        <UsageReportsPanel key={reloadKey} showToast={showToast} />
      )}
    </>
  );
};
