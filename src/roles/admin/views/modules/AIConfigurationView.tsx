import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Download,
  FlaskConical,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  adminService,
  AdminWorkspaceDto,
  AiProviderCredentialDto,
  AiProviderType,
  AiUsageReportItemDto,
  AiUsageRecordDto,
  AiUsageRecordsFilterParams,
  WorkspaceAiConfigDto,
  downloadBlob,
} from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminField,
  AdminModal,
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

const STATUS_OPTIONS: { value: string; labelKey: string; tone: AdminTone }[] = [
  { value: '', labelKey: 'admin.aiConfig.status.all', tone: 'neutral' },
  { value: 'Succeeded', labelKey: 'admin.aiConfig.status.succeeded', tone: 'success' },
  { value: 'Failed', labelKey: 'admin.aiConfig.status.failed', tone: 'danger' },
  { value: 'QuotaExceeded', labelKey: 'admin.aiConfig.status.quotaExceeded', tone: 'warning' },
  {
    value: 'ProviderUnavailable',
    labelKey: 'admin.aiConfig.status.providerUnavailable',
    tone: 'danger',
  },
  { value: 'Disabled', labelKey: 'admin.aiConfig.status.disabled', tone: 'neutral' },
];

const AI_PROVIDER = 'Google Gemini';
// Cùng thứ tự với WorkspaceAiConfig.DefaultAllowedModels (BE): key của project Google mới không gọi được dòng 2.5.
const KNOWN_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-image',
];

const DEFAULT_TEXT_MODEL: Record<AiProviderType, string> = {
  Gemini: 'gemini-3.8-flash',
  Cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
};

const DEFAULT_IMAGE_PLACEHOLDER: Record<AiProviderType, string> = {
  Gemini: 'gemini-2.5-flash-image',
  Cloudflare: '@cf/black-forest-labs/flux-1-schnell',
};

type ShowToast = (m: string, t?: 'success' | 'warning' | 'error') => void;

/* ---------- Shared AI API credentials (GET/POST/PUT/DELETE/test ai-providers) ---------- */

const AiProvidersPanel: React.FC<{
  providers: AiProviderCredentialDto[];
  loading: boolean;
  error: boolean;
  onReload: () => void;
  onMutated: () => void;
  showToast: ShowToast;
}> = ({ providers, loading, error, onReload, onMutated, showToast }) => {
  const { t } = useTranslation();
  const [modal, setModal] = useState<
    { kind: 'add' } | { kind: 'edit'; item: AiProviderCredentialDto } | null
  >(null);
  const [deleting, setDeleting] = useState<AiProviderCredentialDto | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<AiProviderType>('Gemini');
  const [accountId, setAccountId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL.Gemini);
  const [imageModel, setImageModel] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    accountId?: string;
    apiKey?: string;
    textModel?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openAdd = () => {
    setName('');
    setProviderType('Gemini');
    setAccountId('');
    setApiKey('');
    setTextModel(DEFAULT_TEXT_MODEL.Gemini);
    setImageModel('');
    setIsEnabled(true);
    setFieldErrors({});
    setSubmitError(null);
    setModal({ kind: 'add' });
  };

  const openEdit = (item: AiProviderCredentialDto) => {
    setName(item.name);
    setProviderType(item.providerType === 'Cloudflare' ? 'Cloudflare' : 'Gemini');
    setAccountId(item.accountId ?? '');
    setApiKey('');
    setTextModel(item.textModel);
    setImageModel(item.imageModel ?? '');
    setIsEnabled(item.isEnabled);
    setFieldErrors({});
    setSubmitError(null);
    setModal({ kind: 'edit', item });
  };

  const handleTypeChange = (next: AiProviderType) => {
    const prevDefault = DEFAULT_TEXT_MODEL[providerType];
    setProviderType(next);
    if (!textModel.trim() || textModel === prevDefault) {
      setTextModel(DEFAULT_TEXT_MODEL[next]);
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || submitting) return;

    const errs: typeof fieldErrors = {};
    if (!name.trim() || name.trim().length > 100) {
      errs.name = t('admin.aiConfig.providers.validationName');
    }
    if (providerType === 'Cloudflare' && !accountId.trim()) {
      errs.accountId = t('admin.aiConfig.providers.validationAccountId');
    }
    if (modal.kind === 'add' && !apiKey.trim()) {
      errs.apiKey = t('admin.aiConfig.providers.validationApiKey');
    }
    if (!textModel.trim() || textModel.trim().length > 200) {
      errs.textModel = t('admin.aiConfig.providers.validationTextModel');
    }
    setFieldErrors(errs);
    setSubmitError(null);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const cleanAccount = providerType === 'Cloudflare' ? accountId.trim() || null : null;
      const cleanImage = imageModel.trim() || null;
      if (modal.kind === 'add') {
        const created = await adminService.createAiProvider({
          name: name.trim(),
          providerType,
          accountId: cleanAccount,
          apiKey: apiKey.trim(),
          textModel: textModel.trim(),
          imageModel: cleanImage,
        });
        setApiKey('');
        setModal(null);
        showToast(t('admin.aiConfig.providers.createSuccess', { name: created.name }));
      } else {
        const updated = await adminService.updateAiProvider(modal.item.id, {
          name: name.trim(),
          accountId: cleanAccount,
          apiKey: apiKey.trim() || null,
          textModel: textModel.trim(),
          imageModel: cleanImage,
          isEnabled,
        });
        setApiKey('');
        setModal(null);
        showToast(t('admin.aiConfig.providers.updateSuccess', { name: updated.name }));
      }
      onMutated();
    } catch (err: any) {
      setSubmitError(err.message || t('admin.aiConfig.studio.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (item: AiProviderCredentialDto) => {
    if (testingId) return;
    setTestingId(item.id);
    try {
      await adminService.testAiProvider(item.id);
      showToast(t('admin.aiConfig.providers.testSuccess', { name: item.name }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    const target = deleting;
    try {
      await adminService.deleteAiProvider(target.id);
      setDeleting(null);
      showToast(t('admin.aiConfig.providers.deleteSuccess', { name: target.name }));
      onMutated();
    } catch (err: any) {
      setDeleting(null);
      showToast(err.message, 'error');
    } finally {
      setDeletingBusy(false);
    }
  };

  const COLS = 7;

  return (
    <>
      <AdminCard
        title={t('admin.aiConfig.providers.cardTitle')}
        description={t('admin.aiConfig.providers.cardDesc')}
        bodyClassName='p-0'
        actions={
          <AdminButton
            variant='primary'
            size='sm'
            icon={<Plus className='w-4 h-4' />}
            onClick={openAdd}
          >
            {t('admin.aiConfig.providers.addButton')}
          </AdminButton>
        }
      >
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.aiConfig.providers.colName')}</th>
                <th className={adminTable.th}>{t('admin.aiConfig.providers.colType')}</th>
                <th className={adminTable.th}>{t('admin.aiConfig.providers.colKeyHint')}</th>
                <th className={adminTable.th}>{t('admin.aiConfig.providers.colModels')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.aiConfig.providers.colStudios')}
                </th>
                <th className={adminTable.th}>{t('admin.aiConfig.providers.colStatus')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.aiConfig.providers.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.aiConfig.providers.loading')}
                />
              ) : error ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message={t('admin.aiConfig.providers.loadError')}
                  action={
                    <AdminButton size='sm' onClick={onReload}>
                      {t('admin.aiConfig.providers.retry')}
                    </AdminButton>
                  }
                />
              ) : providers.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='empty'
                  message={t('admin.aiConfig.providers.empty')}
                />
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className={adminTable.tr}>
                    <td className={`${adminTable.td} font-semibold text-admin-ink-strong`}>
                      {p.name}
                    </td>
                    <td className={adminTable.td}>
                      <AdminBadge tone={p.providerType === 'Cloudflare' ? 'info' : 'accent'}>
                        {p.providerType}
                      </AdminBadge>
                      {p.accountId && (
                        <div
                          className='mt-1 text-xs text-admin-muted font-mono truncate max-w-[160px]'
                          title={p.accountId}
                        >
                          {p.accountId}
                        </div>
                      )}
                    </td>
                    <td className={`${adminTable.td} font-mono text-xs whitespace-nowrap`}>
                      {p.keyHint || '—'}
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-mono text-xs text-admin-ink-strong'>{p.textModel}</div>
                      <div className='font-mono text-xs text-admin-muted'>
                        {p.imageModel || t('admin.aiConfig.providers.imageDefault')}
                      </div>
                    </td>
                    <td className={`${adminTable.td} text-right tabular-nums`}>
                      {p.workspaceCount}
                    </td>
                    <td className={adminTable.td}>
                      <AdminBadge tone={p.isEnabled ? 'success' : 'neutral'}>
                        {p.isEnabled
                          ? t('admin.aiConfig.providers.statusEnabled')
                          : t('admin.aiConfig.providers.statusDisabled')}
                      </AdminBadge>
                    </td>
                    <td className={`${adminTable.td} text-right whitespace-nowrap`}>
                      <div className='inline-flex items-center justify-end gap-1.5'>
                        <AdminButton
                          size='sm'
                          icon={<FlaskConical className='w-3.5 h-3.5' />}
                          isLoading={testingId === p.id}
                          disabled={!!testingId && testingId !== p.id}
                          onClick={() => handleTest(p)}
                        >
                          {t('admin.aiConfig.providers.testButton')}
                        </AdminButton>
                        <AdminButton
                          size='sm'
                          icon={<Pencil className='w-3.5 h-3.5' />}
                          onClick={() => openEdit(p)}
                        >
                          {t('admin.aiConfig.providers.editButton')}
                        </AdminButton>
                        <AdminButton
                          size='sm'
                          variant='danger'
                          icon={<Trash2 className='w-3.5 h-3.5' />}
                          onClick={() => setDeleting(p)}
                        >
                          {t('admin.aiConfig.providers.deleteButton')}
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {modal && (
        <AdminModal
          title={
            modal.kind === 'add'
              ? t('admin.aiConfig.providers.modalAddTitle')
              : t('admin.aiConfig.providers.modalEditTitle')
          }
          size='lg'
          onClose={() => !submitting && setModal(null)}
          footer={
            <>
              <AdminButton onClick={() => setModal(null)} disabled={submitting}>
                {t('admin.aiConfig.providers.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='ai-provider-form'
                variant='primary'
                isLoading={submitting}
              >
                {t('admin.aiConfig.providers.save')}
              </AdminButton>
            </>
          }
        >
          <form id='ai-provider-form' onSubmit={handleSubmitModal} noValidate className='space-y-4'>
            {submitError && (
              <div
                role='alert'
                className='flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700'
              >
                <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' aria-hidden />
                <span>{submitError}</span>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <AdminField
                label={t('admin.aiConfig.providers.fieldName')}
                htmlFor='aip-name'
                required
                error={fieldErrors.name}
              >
                <input
                  id='aip-name'
                  type='text'
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('admin.aiConfig.providers.fieldNamePlaceholder')}
                  className={adminFieldClass}
                />
              </AdminField>

              <AdminField
                label={t('admin.aiConfig.providers.fieldType')}
                htmlFor='aip-type'
                required
                hint={
                  modal.kind === 'edit' ? t('admin.aiConfig.providers.fieldTypeLockedHint') : null
                }
              >
                <select
                  id='aip-type'
                  value={providerType}
                  disabled={modal.kind === 'edit'}
                  onChange={(e) => handleTypeChange(e.target.value as AiProviderType)}
                  className={adminFieldClass}
                >
                  <option value='Gemini'>Gemini</option>
                  <option value='Cloudflare'>Cloudflare</option>
                </select>
              </AdminField>
            </div>

            {providerType === 'Cloudflare' && (
              <AdminField
                label={t('admin.aiConfig.providers.fieldAccountId')}
                htmlFor='aip-account-id'
                required
                hint={t('admin.aiConfig.providers.fieldAccountIdHint')}
                error={fieldErrors.accountId}
              >
                <input
                  id='aip-account-id'
                  type='text'
                  maxLength={100}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={cn(adminFieldClass, 'font-mono')}
                />
              </AdminField>
            )}

            <AdminField
              label={t('admin.aiConfig.providers.fieldApiKey')}
              htmlFor='aip-api-key'
              required={modal.kind === 'add'}
              hint={
                modal.kind === 'add'
                  ? t('admin.aiConfig.providers.fieldApiKeyCreateHint')
                  : t('admin.aiConfig.providers.fieldApiKeyEditHint', {
                      hint: modal.item.keyHint || '••••',
                    })
              }
              error={fieldErrors.apiKey}
            >
              <input
                id='aip-api-key'
                type='password'
                autoComplete='off'
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={modal.kind === 'edit' ? modal.item.keyHint || '••••••••' : undefined}
                className={cn(adminFieldClass, 'font-mono')}
              />
            </AdminField>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <AdminField
                label={t('admin.aiConfig.providers.fieldTextModel')}
                htmlFor='aip-text-model'
                required
                error={fieldErrors.textModel}
              >
                <input
                  id='aip-text-model'
                  type='text'
                  maxLength={200}
                  value={textModel}
                  onChange={(e) => setTextModel(e.target.value)}
                  placeholder={DEFAULT_TEXT_MODEL[providerType]}
                  className={cn(adminFieldClass, 'font-mono')}
                />
              </AdminField>

              <AdminField
                label={t('admin.aiConfig.providers.fieldImageModel')}
                htmlFor='aip-image-model'
                hint={t('admin.aiConfig.providers.fieldImageModelHint')}
              >
                <input
                  id='aip-image-model'
                  type='text'
                  maxLength={200}
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder={DEFAULT_IMAGE_PLACEHOLDER[providerType]}
                  className={cn(adminFieldClass, 'font-mono')}
                />
              </AdminField>
            </div>

            {modal.kind === 'edit' && (
              <label className='flex items-center gap-3 cursor-pointer pt-1'>
                <input
                  type='checkbox'
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className='w-4 h-4 accent-[#F97316]'
                />
                <span className='text-sm font-medium text-admin-ink'>
                  {t('admin.aiConfig.providers.fieldEnabled')}
                </span>
              </label>
            )}
          </form>
        </AdminModal>
      )}

      {deleting && (
        <AdminModal
          title={t('admin.aiConfig.providers.deleteModalTitle')}
          onClose={() => !deletingBusy && setDeleting(null)}
          footer={
            <>
              <AdminButton onClick={() => setDeleting(null)} disabled={deletingBusy}>
                {t('admin.aiConfig.providers.cancel')}
              </AdminButton>
              <AdminButton
                variant='danger'
                isLoading={deletingBusy}
                onClick={handleConfirmDelete}
              >
                {t('admin.aiConfig.providers.deleteConfirmButton')}
              </AdminButton>
            </>
          }
        >
          <p className='text-sm text-admin-ink'>
            {t('admin.aiConfig.providers.deleteModalConfirm', { name: deleting.name })}
          </p>
        </AdminModal>
      )}
    </>
  );
};

/* ---------- Per-Studio AI configuration (GET/PUT ai-config + PUT ai-provider) ---------- */

const StudioAiConfigPanel: React.FC<{
  providers: AiProviderCredentialDto[];
  onProviderAssigned: () => void;
  showToast: ShowToast;
}> = ({ providers, onProviderAssigned, showToast }) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const fmt = (n?: number | null) => (n ?? 0).toLocaleString(locale);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loadingWs, setLoadingWs] = useState(true);
  const [wsError, setWsError] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');

  const [config, setConfig] = useState<WorkspaceAiConfigDto | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [credentialId, setCredentialId] = useState('');
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
    setCredentialId(c.providerCredentialId ?? '');
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
      token: token === null ? t('admin.aiConfig.studio.nonNegativeIntError') : undefined,
      image: image === null ? t('admin.aiConfig.studio.nonNegativeIntError') : undefined,
    });
    if (token === null || image === null) return;

    const prevCredId = config?.providerCredentialId ?? '';
    const credentialChanged = credentialId !== prevCredId;

    setSaving(true);
    try {
      if (credentialChanged) {
        await adminService.setWorkspaceAiProvider(workspaceId, credentialId || null);
      }
      const updated = await adminService.updateWorkspaceAiConfig(workspaceId, {
        provider: AI_PROVIDER,
        apiKey: apiKey.trim() || undefined,
        isEnabled,
        monthlyTokenQuota: token,
        monthlyImageQuota: image,
        allowedModels: models,
      });
      applyConfig(updated);
      if (credentialChanged) onProviderAssigned();
      showToast(t('admin.aiConfig.studio.saveSuccess'));
    } catch (err: any) {
      showToast(err.message || t('admin.aiConfig.studio.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = Array.from(new Set([...KNOWN_MODELS, ...(config?.allowedModels || [])]));
  const boundProvider = config?.providerCredentialId
    ? providers.find((p) => p.id === config.providerCredentialId)
    : null;

  const keyState = config?.providerCredentialId
    ? boundProvider && boundProvider.isEnabled
      ? {
          label: t('admin.aiConfig.studio.sharedKeyActive', {
            name: boundProvider.name,
            hint: boundProvider.keyHint || '••••',
          }),
          tone: 'success' as AdminTone,
        }
      : { label: t('admin.aiConfig.studio.sharedKeyUnavailable'), tone: 'danger' as AdminTone }
    : !config?.hasApiKey
      ? { label: t('admin.aiConfig.studio.keyMissing'), tone: 'warning' as AdminTone }
      : config.apiKeyUsable === false
        ? { label: t('admin.aiConfig.studio.keyUnusable'), tone: 'danger' as AdminTone }
        : { label: t('admin.aiConfig.studio.keyPresent'), tone: 'success' as AdminTone };

  const hasMissingBoundOption =
    !!config?.providerCredentialId && !providers.some((p) => p.id === config.providerCredentialId);

  if (wsError)
    return (
      <AdminCard>
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
          {t('admin.aiConfig.studio.loadStudiosError')}
          <AdminButton size='sm' onClick={loadWorkspaces}>
            {t('admin.aiConfig.studio.retry')}
          </AdminButton>
        </div>
      </AdminCard>
    );

  if (!loadingWs && workspaces.length === 0)
    return (
      <AdminCard>
        <p className='text-sm text-admin-muted'>{t('admin.aiConfig.studio.emptyStudios')}</p>
      </AdminCard>
    );

  return (
    <form
      onSubmit={handleSave}
      noValidate
      className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start'
    >
      <AdminCard
        title={t('admin.aiConfig.studio.cardTitle')}
        actions={
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            disabled={loadingWs || saving}
            aria-label={t('admin.aiConfig.studio.selectStudioAria')}
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
          <p className='text-sm text-admin-muted py-6 text-center'>
            {t('admin.aiConfig.studio.loadingConfig')}
          </p>
        ) : configError ? (
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
            {t('admin.aiConfig.studio.loadConfigError')}
            <AdminButton size='sm' onClick={() => loadConfig(workspaceId)}>
              {t('admin.aiConfig.studio.retry')}
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
                  {t('admin.aiConfig.studio.enableTitle')}
                </span>
                <span className='block text-sm text-admin-muted'>
                  {t('admin.aiConfig.studio.enableDesc')}
                </span>
              </span>
            </label>

            <div
              className='flex items-center gap-2 text-sm text-admin-muted'
              data-testid='ai-key-status'
            >
              {t('admin.aiConfig.studio.keyStatusLabel')}{' '}
              <AdminBadge tone={keyState.tone}>{keyState.label}</AdminBadge>
            </div>

            <AdminField
              label={t('admin.aiConfig.studio.credentialSelectLabel')}
              htmlFor='ai-studio-credential'
              hint={t('admin.aiConfig.studio.credentialSelectHint')}
            >
              <select
                id='ai-studio-credential'
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                className={adminFieldClass}
              >
                <option value=''>{t('admin.aiConfig.studio.useLegacyKey')}</option>
                {hasMissingBoundOption && (
                  <option value={config!.providerCredentialId!} disabled>
                    {t('admin.aiConfig.studio.credentialMissingOption')}
                  </option>
                )}
                {providers.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={!p.isEnabled && p.id !== config?.providerCredentialId}
                  >
                    {`${p.name} (${p.providerType} · ${p.textModel}${p.keyHint ? ` · ${p.keyHint}` : ''})${!p.isEnabled ? t('admin.aiConfig.studio.credentialDisabledSuffix') : ''}`}
                  </option>
                ))}
              </select>
            </AdminField>

            {credentialId !== '' && (
              <p className='text-xs text-admin-muted'>
                {t('admin.aiConfig.studio.legacyFieldsSharedNote')}
              </p>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <AdminField label={t('admin.aiConfig.studio.providerLabel')} htmlFor='ai-provider'>
                <input id='ai-provider' value={AI_PROVIDER} readOnly className={adminFieldClass} />
              </AdminField>
              <AdminField
                label={t('admin.aiConfig.studio.apiKeyLabel')}
                htmlFor='ai-key'
                hint={
                  config?.hasApiKey
                    ? t('admin.aiConfig.studio.apiKeyHintExisting')
                    : t('admin.aiConfig.studio.apiKeyHintNew')
                }
              >
                <input
                  id='ai-key'
                  type='password'
                  autoComplete='off'
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    config?.hasApiKey ? '••••••••' : t('admin.aiConfig.studio.apiKeyPlaceholder')
                  }
                  className={cn(adminFieldClass, 'font-mono')}
                />
              </AdminField>
              <AdminField
                label={t('admin.aiConfig.studio.tokenQuotaLabel')}
                htmlFor='ai-token-quota'
                required
                hint={t('admin.aiConfig.studio.zeroUnlimited')}
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
                label={t('admin.aiConfig.studio.imageQuotaLabel')}
                htmlFor='ai-image-quota'
                required
                hint={t('admin.aiConfig.studio.zeroUnlimited')}
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
              <legend className='text-sm font-semibold text-admin-ink mb-2'>
                {t('admin.aiConfig.studio.allowedModels')}
              </legend>
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
                {t('admin.aiConfig.studio.allowedModelsNote')}
              </p>
            </fieldset>

            <div className='flex justify-end gap-2 pt-4 border-t border-admin-line'>
              <AdminButton
                onClick={() => config && applyConfig(config)}
                disabled={saving || !config}
              >
                {t('admin.aiConfig.studio.reset')}
              </AdminButton>
              <AdminButton type='submit' variant='primary' isLoading={saving}>
                {t('admin.aiConfig.studio.save')}
              </AdminButton>
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard title={t('admin.aiConfig.summary.title')}>
        {config && !loadingConfig ? (
          <dl className='space-y-4 text-sm'>
            <div>
              <dt className='text-admin-muted'>{t('admin.aiConfig.summary.status')}</dt>
              <dd className='mt-1 flex flex-wrap gap-1.5'>
                <AdminBadge tone={config.isEnabled ? 'success' : 'neutral'}>
                  {config.isEnabled
                    ? t('admin.aiConfig.summary.aiEnabled')
                    : t('admin.aiConfig.summary.aiDisabled')}
                </AdminBadge>
                <AdminBadge tone={keyState.tone}>
                  <KeyRound className='w-3 h-3' aria-hidden />
                  {keyState.label}
                </AdminBadge>
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>{t('admin.aiConfig.summary.tokensUsed')}</dt>
              <dd className='text-lg font-semibold text-admin-ink-strong tabular-nums'>
                {fmt(config.usedTokensCurrentMonth)}
                <span className='text-sm font-normal text-admin-muted'>
                  {' '}
                  /{' '}
                  {config.monthlyTokenQuota
                    ? fmt(config.monthlyTokenQuota)
                    : t('admin.aiConfig.summary.unlimited')}
                </span>
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>{t('admin.aiConfig.summary.imagesGenerated')}</dt>
              <dd className='text-lg font-semibold text-admin-ink-strong tabular-nums'>
                {fmt(config.usedImagesCurrentMonth)}
                <span className='text-sm font-normal text-admin-muted'>
                  {' '}
                  /{' '}
                  {config.monthlyImageQuota
                    ? fmt(config.monthlyImageQuota)
                    : t('admin.aiConfig.summary.unlimited')}
                </span>
              </dd>
            </div>
            {config.lastResetAt && (
              <div>
                <dt className='text-admin-muted'>{t('admin.aiConfig.summary.lastReset')}</dt>
                <dd className='tabular-nums'>
                  {new Date(config.lastResetAt).toLocaleDateString(locale)}
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

const CredentialsTabPanel: React.FC<{ showToast: ShowToast }> = ({ showToast }) => {
  const [providers, setProviders] = useState<AiProviderCredentialDto[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState(false);

  const loadProviders = useCallback(async () => {
    if (!adminService.getAiProviders) {
      setLoadingProviders(false);
      return;
    }
    setLoadingProviders(true);
    setProvidersError(false);
    try {
      const list = await adminService.getAiProviders();
      setProviders(list || []);
    } catch {
      setProvidersError(true);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return (
    <div className='space-y-6'>
      <AiProvidersPanel
        providers={providers}
        loading={loadingProviders}
        error={providersError}
        onReload={loadProviders}
        onMutated={loadProviders}
        showToast={showToast}
      />
      <StudioAiConfigPanel
        providers={providers}
        onProviderAssigned={loadProviders}
        showToast={showToast}
      />
    </div>
  );
};

/* ---------- Usage reports & call records ---------- */

const UsageReportsPanel: React.FC<{ showToast: ShowToast }> = ({ showToast }) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const fmt = (n?: number | null) => (n ?? 0).toLocaleString(locale);
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
      setDateError(t('admin.aiConfig.reports.dateRangeError'));
      return null;
    }
    const params: AiUsageRecordsFilterParams = { page, pageSize };
    if (filterFeature.trim()) params.feature = filterFeature.trim();
    if (filterStatus) params.status = filterStatus;
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;
    return params;
  }, [page, pageSize, filterFeature, filterStatus, filterFrom, filterTo, t]);

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
      showToast(err.message || t('admin.aiConfig.reports.loadFailed'), 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [buildFilterParams, showToast, t]);

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
          ? t('admin.aiConfig.reports.exportTruncated', { count: fmt(result.rowCount) })
          : t('admin.aiConfig.reports.exportSuccess', { count: fmt(result.rowCount) }),
        result.isTruncated ? 'warning' : 'success',
      );
    } catch (err: any) {
      showToast(err.message || t('admin.aiConfig.reports.exportFailed'), 'error');
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
          label={t('admin.aiConfig.reports.statCalls')}
          value={fmt(sum('callCount'))}
          hint={t('admin.aiConfig.reports.statCallsHint', { count: fmt(sum('succeededCount')) })}
        />
        <AdminStat label={t('admin.aiConfig.reports.statTokens')} value={fmt(sum('totalTokens'))} />
        <AdminStat
          label={t('admin.aiConfig.reports.statCost')}
          value={`$${sum('totalCostUsd').toFixed(4)}`}
          hint={t('admin.aiConfig.reports.statCostHint')}
        />
        <AdminStat
          label={t('admin.aiConfig.reports.statBlockedFailed')}
          value={`${fmt(sum('blockedCount'))} / ${fmt(sum('failedCount'))}`}
        />
      </div>

      <form
        onSubmit={handleApplyFilter}
        className='bg-admin-card border border-admin-line rounded-2xl p-5 space-y-4'
        aria-label={t('admin.aiConfig.reports.filterAriaLabel')}
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          <AdminField label={t('admin.aiConfig.reports.featureLabel')} htmlFor='ai-f-feature'>
            <input
              id='ai-f-feature'
              type='text'
              placeholder={t('admin.aiConfig.reports.featurePlaceholder')}
              value={filterFeature}
              onChange={(e) => setFilterFeature(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={t('admin.aiConfig.reports.statusLabel')} htmlFor='ai-f-status'>
            <select
              id='ai-f-status'
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={adminFieldClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label={t('admin.aiConfig.reports.fromDateLabel')} htmlFor='ai-f-from'>
            <input
              id='ai-f-from'
              type='date'
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField
            label={t('admin.aiConfig.reports.toDateLabel')}
            htmlFor='ai-f-to'
            error={dateError}
          >
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
            {t('admin.aiConfig.reports.resetFilter')}
          </AdminButton>
          <AdminButton
            onClick={handleExportCsv}
            isLoading={exportingCsv}
            disabled={loadingRecords}
            icon={<Download className='w-4 h-4' />}
          >
            {t('admin.aiConfig.reports.exportCsv')}
          </AdminButton>
          <AdminButton type='submit' variant='primary'>
            {t('admin.aiConfig.reports.applyFilter')}
          </AdminButton>
        </div>
      </form>

      <div className='bg-admin-card border border-admin-line rounded-2xl overflow-hidden'>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.aiConfig.reports.colTime')}</th>
                <th className={adminTable.th}>{t('admin.aiConfig.reports.colFeature')}</th>
                <th className={adminTable.th}>{t('admin.aiConfig.reports.colProviderModel')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.aiConfig.reports.colTokens')}
                </th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.aiConfig.reports.colCost')}
                </th>
                <th className={adminTable.th}>{t('admin.aiConfig.reports.colStatus')}</th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loadingRecords ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.aiConfig.reports.loading')}
                />
              ) : recordsError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message={t('admin.aiConfig.reports.loadError')}
                  action={
                    <AdminButton size='sm' onClick={fetchRecords}>
                      {t('admin.aiConfig.reports.retry')}
                    </AdminButton>
                  }
                />
              ) : records.length === 0 ? (
                isFiltered ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='no-results'
                    message={t('admin.aiConfig.reports.noResults')}
                  />
                ) : (
                  <AdminTableState
                    colSpan={COLS}
                    kind='empty'
                    message={t('admin.aiConfig.reports.empty')}
                  />
                )
              ) : (
                records.map((rec) => {
                  const st = STATUS_OPTIONS.find((s) => s.value === rec.status);
                  return (
                    <tr key={rec.id} className={adminTable.tr}>
                      <td className={`${adminTable.td} whitespace-nowrap tabular-nums`}>
                        <div className='font-medium text-admin-ink-strong'>
                          {new Date(rec.occurredAtUtc).toLocaleTimeString(locale)}
                        </div>
                        <div className='text-xs text-admin-muted'>
                          {new Date(rec.occurredAtUtc).toLocaleDateString(locale)}
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
                          {t('admin.aiConfig.reports.tokensBreakdown', {
                            prompt: fmt(rec.promptTokens),
                            completion: fmt(rec.completionTokens),
                          })}
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
                          {st ? t(st.labelKey) : rec.status}
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
          unit={t('admin.aiConfig.reports.unit')}
          disabled={loadingRecords}
          onPageChange={setPage}
        />
      </div>
    </>
  );
};

export const AIConfigurationView: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'reports'>('credentials');
  const { toast, show: showToast, clear: clearToast } = useAdminToast();
  const [reloadKey, setReloadKey] = useState(0);

  const tabs = [
    { id: 'credentials' as const, label: t('admin.aiConfig.tabs.credentials') },
    { id: 'reports' as const, label: t('admin.aiConfig.tabs.reports') },
  ];

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />
      <AdminPageHeader
        title={t('admin.aiConfig.title')}
        description={t('admin.aiConfig.description')}
        actions={
          <AdminButton
            onClick={() => setReloadKey((k) => k + 1)}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            {t('admin.aiConfig.refresh')}
          </AdminButton>
        }
      />

      <div
        role='tablist'
        aria-label={t('admin.aiConfig.tabs.ariaLabel')}
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
        <CredentialsTabPanel key={reloadKey} showToast={showToast} />
      ) : (
        <UsageReportsPanel key={reloadKey} showToast={showToast} />
      )}
    </>
  );
};
