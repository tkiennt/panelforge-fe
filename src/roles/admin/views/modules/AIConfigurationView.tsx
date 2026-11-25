import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Download,
  FlaskConical,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  adminService,
  AdminWorkspaceDto,
  AiProviderCredentialDto,
  AiProviderModelDto,
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

// Cùng thứ tự với WorkspaceAiConfig.DefaultAllowedModels (BE): key của project Google mới không gọi được dòng 2.5.
const GEMINI_TEXT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
const GEMINI_IMAGE_MODELS = ['gemini-2.5-flash-image'];

function getProviderModelOptions(
  textProvider: AiProviderCredentialDto | null,
  imageProvider: AiProviderCredentialDto | null,
): string[] {
  const set = new Set<string>();
  if (textProvider) {
    if (textProvider.providerType === 'Gemini') {
      GEMINI_TEXT_MODELS.forEach((m) => set.add(m));
    }
    if (textProvider.textModel?.trim()) set.add(textProvider.textModel.trim());
  }
  if (imageProvider) {
    if (imageProvider.providerType === 'Gemini') {
      GEMINI_IMAGE_MODELS.forEach((m) => set.add(m));
    }
    if (imageProvider.imageModel?.trim()) set.add(imageProvider.imageModel.trim());
  }
  return Array.from(set);
}

const DEFAULT_TEXT_MODEL: Record<AiProviderType, string> = {
  Gemini: 'gemini-3.8-flash',
  Cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
};

const DEFAULT_IMAGE_PLACEHOLDER: Record<AiProviderType, string> = {
  Gemini: 'gemini-2.5-flash-image',
  Cloudflare: '@cf/black-forest-labs/flux-1-schnell',
};

type ShowToast = (m: string, t?: 'success' | 'warning' | 'error') => void;

const ModelCostTag: React.FC<{ modelId: string }> = ({ modelId }) => {
  const { t } = useTranslation();
  const isFree = modelId.startsWith('@cf/');
  return (
    <AdminBadge tone={isFree ? 'success' : 'warning'} className='shrink-0 whitespace-nowrap'>
      {isFree
        ? t('admin.aiConfig.providers.modelBadgeFree')
        : t('admin.aiConfig.providers.modelBadgePaid')}
    </AdminBadge>
  );
};

const CloudflareModelPicker: React.FC<{
  id: string;
  value: string;
  options: AiProviderModelDto[];
  allowEmpty?: boolean;
  placeholder?: string;
  onChange: (next: string) => void;
}> = ({ id, value, options, allowEmpty, placeholder, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = options.filter(
    (m) =>
      !q ||
      m.id.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)),
  );
  const freeList = matches.filter((m) => m.free);
  const paidList = matches.filter((m) => !m.free);
  const trimmedCustom = query.trim();
  const hasExactMatch = options.some((m) => m.id === trimmedCustom);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const renderGroup = (label: string, items: AiProviderModelDto[]) =>
    items.length > 0 ? (
      <div>
        <div className='px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-admin-muted bg-admin-subtle border-y border-admin-line'>
          {label}
        </div>
        {items.map((m) => (
          <button
            key={m.id}
            type='button'
            role='option'
            aria-selected={value === m.id}
            onClick={() => pick(m.id)}
            className={cn(
              'w-full text-left px-3 py-2 text-xs hover:bg-admin-hover transition-colors cursor-pointer',
              value === m.id && 'bg-admin-accent-soft',
            )}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='font-mono font-medium text-admin-ink-strong break-all'>{m.id}</span>
              <AdminBadge
                tone={m.free ? 'success' : 'warning'}
                className='shrink-0 whitespace-nowrap'
              >
                {m.free
                  ? t('admin.aiConfig.providers.modelBadgeFree')
                  : t('admin.aiConfig.providers.modelBadgePaid')}
              </AdminBadge>
            </div>
            {m.description && (
              <div className='mt-0.5 text-admin-muted line-clamp-1'>{m.description}</div>
            )}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className='relative'>
      <button
        id={id}
        type='button'
        role='combobox'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          adminFieldClass,
          'flex items-center justify-between gap-2 text-left cursor-pointer',
        )}
      >
        <span
          className={cn('truncate font-mono text-xs', !value && 'text-admin-muted font-sans')}
        >
          {value || placeholder || t('admin.aiConfig.providers.modelClearImage')}
        </span>
        <ChevronDown className='w-4 h-4 shrink-0 text-admin-muted' aria-hidden />
      </button>

      {open && (
        <div className='absolute left-0 right-0 z-30 mt-1 rounded-xl border border-admin-line bg-admin-card shadow-lg overflow-hidden'>
          <div className='p-2 border-b border-admin-line flex items-center gap-2 bg-admin-field'>
            <Search className='w-4 h-4 text-admin-muted shrink-0' aria-hidden />
            <input
              type='text'
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.aiConfig.providers.modelSearchPlaceholder')}
              className='w-full bg-transparent text-xs text-admin-ink focus:outline-none'
            />
          </div>
          <div role='listbox' className='max-h-60 overflow-y-auto'>
            {allowEmpty && !q && (
              <button
                type='button'
                role='option'
                aria-selected={value === ''}
                onClick={() => pick('')}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs text-admin-muted hover:bg-admin-hover cursor-pointer',
                  value === '' && 'bg-admin-accent-soft text-admin-ink-strong font-medium',
                )}
              >
                {t('admin.aiConfig.providers.modelClearImage')}
              </button>
            )}
            {renderGroup(t('admin.aiConfig.providers.modelGroupFree'), freeList)}
            {renderGroup(t('admin.aiConfig.providers.modelGroupPaid'), paidList)}
            {freeList.length === 0 && paidList.length === 0 && (
              <div className='px-3 py-3 text-xs text-admin-muted text-center'>
                {t('admin.aiConfig.providers.modelNoMatch')}
              </div>
            )}
            {trimmedCustom && !hasExactMatch && (
              <button
                type='button'
                onClick={() => pick(trimmedCustom)}
                className='w-full text-left px-3 py-2 text-xs font-mono border-t border-admin-line text-admin-accent-text hover:bg-admin-hover cursor-pointer'
              >
                {t('admin.aiConfig.providers.modelUseCustom', { value: trimmedCustom })}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Shared AI API credentials (GET/POST/PUT/DELETE/test ai-providers) ---------- */

const AiProvidersPanel: React.FC<{
  providers: AiProviderCredentialDto[];
  workspaces: AdminWorkspaceDto[];
  loading: boolean;
  error: boolean;
  onReload: () => void;
  onMutated: (assignedWorkspaces?: boolean) => void;
  onDefaultUpdated?: (next: AiProviderCredentialDto[]) => void;
  showToast: ShowToast;
}> = ({
  providers,
  workspaces,
  loading,
  error,
  onReload,
  onMutated,
  onDefaultUpdated,
  showToast,
}) => {
  const { t } = useTranslation();
  const [modal, setModal] = useState<
    { kind: 'add' } | { kind: 'edit'; item: AiProviderCredentialDto } | null
  >(null);
  const [deleting, setDeleting] = useState<AiProviderCredentialDto | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingDefaultKind, setSavingDefaultKind] = useState<'text' | 'image' | null>(null);

  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<AiProviderType>('Gemini');
  const [accountId, setAccountId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL.Gemini);
  const [imageModel, setImageModel] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [assignWorkspaceIds, setAssignWorkspaceIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    accountId?: string;
    apiKey?: string;
    textModel?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cfModels, setCfModels] = useState<AiProviderModelDto[]>([]);
  const [cfModelsLoading, setCfModelsLoading] = useState(false);
  const [cfModelsError, setCfModelsError] = useState(false);

  const loadCloudflareModels = useCallback(async (credentialId: string) => {
    if (!adminService.getAiProviderModels) return;
    setCfModelsLoading(true);
    setCfModelsError(false);
    try {
      const list = await adminService.getAiProviderModels(credentialId);
      setCfModels(list || []);
    } catch {
      setCfModels([]);
      setCfModelsError(true);
    } finally {
      setCfModelsLoading(false);
    }
  }, []);

  const openAdd = () => {
    setName('');
    setProviderType('Gemini');
    setAccountId('');
    setApiKey('');
    setTextModel(DEFAULT_TEXT_MODEL.Gemini);
    setImageModel('');
    setIsEnabled(true);
    setAssignWorkspaceIds([]);
    setFieldErrors({});
    setSubmitError(null);
    setCfModels([]);
    setCfModelsError(false);
    setModal({ kind: 'add' });
  };

  const openEdit = (item: AiProviderCredentialDto) => {
    const type: AiProviderType = item.providerType === 'Cloudflare' ? 'Cloudflare' : 'Gemini';
    setName(item.name);
    setProviderType(type);
    setAccountId(item.accountId ?? '');
    setApiKey('');
    setTextModel(item.textModel);
    setImageModel(item.imageModel ?? '');
    setIsEnabled(item.isEnabled);
    setAssignWorkspaceIds([]);
    setFieldErrors({});
    setSubmitError(null);
    setCfModels([]);
    setCfModelsError(false);
    setModal({ kind: 'edit', item });
    if (type === 'Cloudflare') {
      loadCloudflareModels(item.id);
    }
  };

  const handleTypeChange = (next: AiProviderType) => {
    const prevDefaultText = DEFAULT_TEXT_MODEL[providerType];
    const prevDefaultImg = DEFAULT_IMAGE_PLACEHOLDER[providerType];
    setProviderType(next);
    if (!textModel.trim() || textModel === prevDefaultText) {
      setTextModel(DEFAULT_TEXT_MODEL[next]);
    }
    if (next === 'Cloudflare' && (!imageModel.trim() || imageModel === prevDefaultImg)) {
      setImageModel(DEFAULT_IMAGE_PLACEHOLDER.Cloudflare);
    } else if (next === 'Gemini' && imageModel === DEFAULT_IMAGE_PLACEHOLDER.Cloudflare) {
      setImageModel('');
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
        const targetWsIds = [...assignWorkspaceIds];
        const created = await adminService.createAiProvider({
          name: name.trim(),
          providerType,
          accountId: cleanAccount,
          apiKey: apiKey.trim(),
          textModel: textModel.trim(),
          imageModel: cleanImage,
        });
        setApiKey('');
        setAssignWorkspaceIds([]);
        setModal(null);

        if (targetWsIds.length > 0) {
          const results = await Promise.allSettled(
            targetWsIds.map((wsId) => adminService.setWorkspaceAiProvider(wsId, created.id)),
          );
          const failed: string[] = [];
          let firstError = '';
          results.forEach((res, idx) => {
            if (res.status === 'rejected') {
              const wsId = targetWsIds[idx];
              const wsName = workspaces.find((w) => w.id === wsId)?.name ?? wsId;
              failed.push(wsName);
              if (!firstError) firstError = res.reason?.message || '';
            }
          });
          onMutated(true);
          if (failed.length > 0) {
            showToast(
              t('admin.aiConfig.providers.assignPartialError', {
                name: created.name,
                studios: failed.join(', '),
                error: firstError || t('admin.aiConfig.studio.saveFailed'),
              }),
              'error',
            );
          } else {
            showToast(
              t('admin.aiConfig.providers.createAndAssignSuccess', {
                name: created.name,
                count: targetWsIds.length,
              }),
            );
          }
          return;
        }

        showToast(t('admin.aiConfig.providers.createSuccess', { name: created.name }));
        onMutated(false);
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
        onMutated(false);
      }
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

  const currentDefaultTextId = providers.find((p) => p.isDefaultText)?.id ?? '';
  const currentDefaultImageId = providers.find((p) => p.isDefaultImage)?.id ?? '';
  const eligibleDefaultImageProviders = providers.filter(
    (p) => p.isEnabled && !!p.imageModel?.trim(),
  );
  const staleDefaultImage =
    providers.find((p) => p.isDefaultImage && (!p.isEnabled || !p.imageModel?.trim())) ?? null;

  const handleDefaultChange = async (kind: 'text' | 'image', nextId: string | null) => {
    if (savingDefaultKind || !adminService.setDefaultAiProvider) return;
    setSavingDefaultKind(kind);
    try {
      const updated = await adminService.setDefaultAiProvider(kind, nextId);
      if (Array.isArray(updated) && onDefaultUpdated) {
        onDefaultUpdated(updated);
      } else {
        onMutated(true);
      }
      showToast(t('admin.aiConfig.providers.defaultUpdateSuccess'));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingDefaultKind(null);
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
        {!loading && !error && providers.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-4 border-b border-admin-line bg-admin-subtle/40'>
            <AdminField
              label={t('admin.aiConfig.providers.defaultTextLabel')}
              htmlFor='aip-default-text'
              hint={t('admin.aiConfig.providers.defaultTextHint')}
            >
              <select
                id='aip-default-text'
                value={currentDefaultTextId}
                disabled={savingDefaultKind !== null}
                onChange={(e) => handleDefaultChange('text', e.target.value || null)}
                className={adminFieldClass}
              >
                <option value=''>{t('admin.aiConfig.providers.defaultNoneOption')}</option>
                {providers.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={!p.isEnabled && !p.isDefaultText}
                  >
                    {`${p.name} (${p.providerType} · ${p.textModel}${p.keyHint ? ` · ${p.keyHint}` : ''})${!p.isEnabled ? t('admin.aiConfig.studio.credentialDisabledSuffix') : ''}`}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField
              label={t('admin.aiConfig.providers.defaultImageLabel')}
              htmlFor='aip-default-image'
              hint={t('admin.aiConfig.providers.defaultImageHint')}
            >
              <select
                id='aip-default-image'
                value={currentDefaultImageId}
                disabled={savingDefaultKind !== null}
                onChange={(e) => handleDefaultChange('image', e.target.value || null)}
                className={adminFieldClass}
              >
                <option value=''>{t('admin.aiConfig.providers.defaultImageNoneOption')}</option>
                {staleDefaultImage && (
                  <option value={staleDefaultImage.id} disabled>
                    {`${staleDefaultImage.name}${t('admin.aiConfig.studio.imageCredentialInvalidSuffix')}`}
                  </option>
                )}
                {eligibleDefaultImageProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.name} (${p.providerType} · ${p.imageModel}${p.keyHint ? ` · ${p.keyHint}` : ''})`}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
        )}
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
                    <td className={adminTable.td}>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <span className='font-semibold text-admin-ink-strong'>{p.name}</span>
                        {p.isDefaultText && (
                          <AdminBadge tone='accent'>
                            {t('admin.aiConfig.providers.badgeDefaultText')}
                          </AdminBadge>
                        )}
                        {p.isDefaultImage && (
                          <AdminBadge tone='info'>
                            {t('admin.aiConfig.providers.badgeDefaultImage')}
                          </AdminBadge>
                        )}
                      </div>
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

            {modal.kind === 'edit' && providerType === 'Cloudflare' && cfModelsLoading && (
              <p className='text-xs text-admin-muted'>
                {t('admin.aiConfig.providers.modelLoading')}
              </p>
            )}

            {modal.kind === 'edit' && providerType === 'Cloudflare' && cfModelsError && (
              <p className='text-xs text-amber-800'>
                {t('admin.aiConfig.providers.modelLoadFallback')}
              </p>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <AdminField
                label={t('admin.aiConfig.providers.fieldTextModel')}
                htmlFor='aip-text-model'
                required
                error={fieldErrors.textModel}
              >
                {modal.kind === 'edit' &&
                providerType === 'Cloudflare' &&
                !cfModelsLoading &&
                !cfModelsError &&
                cfModels.some((m) => m.kind === 'text') ? (
                  <CloudflareModelPicker
                    id='aip-text-model'
                    value={textModel}
                    options={cfModels.filter((m) => m.kind === 'text')}
                    placeholder={DEFAULT_TEXT_MODEL.Cloudflare}
                    onChange={setTextModel}
                  />
                ) : (
                  <input
                    id='aip-text-model'
                    type='text'
                    maxLength={200}
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value)}
                    placeholder={DEFAULT_TEXT_MODEL[providerType]}
                    className={cn(adminFieldClass, 'font-mono')}
                  />
                )}
              </AdminField>

              <AdminField
                label={t('admin.aiConfig.providers.fieldImageModel')}
                htmlFor='aip-image-model'
                hint={t('admin.aiConfig.providers.fieldImageModelHint')}
              >
                {modal.kind === 'edit' &&
                providerType === 'Cloudflare' &&
                !cfModelsLoading &&
                !cfModelsError &&
                cfModels.some((m) => m.kind === 'image') ? (
                  <CloudflareModelPicker
                    id='aip-image-model'
                    value={imageModel}
                    allowEmpty
                    options={cfModels.filter((m) => m.kind === 'image')}
                    placeholder={DEFAULT_IMAGE_PLACEHOLDER.Cloudflare}
                    onChange={setImageModel}
                  />
                ) : (
                  <input
                    id='aip-image-model'
                    type='text'
                    maxLength={200}
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    placeholder={DEFAULT_IMAGE_PLACEHOLDER[providerType]}
                    className={cn(adminFieldClass, 'font-mono')}
                  />
                )}
              </AdminField>
            </div>

            {providerType === 'Cloudflare' && (
              <div className='space-y-1 text-xs text-admin-muted'>
                {modal.kind === 'add' && <p>{t('admin.aiConfig.providers.cfAddDefaultNote')}</p>}
                <p>{t('admin.aiConfig.providers.cfNeuronNote')}</p>
              </div>
            )}

            {modal.kind === 'add' && workspaces.length > 0 && (
              <fieldset>
                <legend className='text-sm font-semibold text-admin-ink mb-1'>
                  {t('admin.aiConfig.providers.fieldAssignStudios')}
                </legend>
                <p className='text-xs text-admin-muted mb-2'>
                  {t('admin.aiConfig.providers.fieldAssignStudiosHint')}
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1'>
                  {workspaces.map((ws) => {
                    const checked = assignWorkspaceIds.includes(ws.id);
                    return (
                      <label
                        key={ws.id}
                        className={cn(
                          'flex items-center gap-2.5 min-h-10 px-3 rounded-xl border cursor-pointer transition-colors',
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
                            setAssignWorkspaceIds((prev) =>
                              prev.includes(ws.id)
                                ? prev.filter((id) => id !== ws.id)
                                : [...prev, ws.id],
                            )
                          }
                          className='w-4 h-4 accent-[#F97316]'
                        />
                        <span className='text-sm text-admin-ink truncate'>{ws.name}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

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
  workspaces: AdminWorkspaceDto[];
  loadingWs: boolean;
  wsError: boolean;
  onRetryWorkspaces: () => void;
  refreshToken: number;
  onProviderAssigned: () => void;
  showToast: ShowToast;
}> = ({
  providers,
  workspaces,
  loadingWs,
  wsError,
  onRetryWorkspaces,
  refreshToken,
  onProviderAssigned,
  showToast,
}) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const fmt = (n?: number | null) => (n ?? 0).toLocaleString(locale);
  const [workspaceId, setWorkspaceId] = useState('');

  const [config, setConfig] = useState<WorkspaceAiConfigDto | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [credentialId, setCredentialId] = useState('');
  const [imageCredentialId, setImageCredentialId] = useState('');
  const [tokenQuota, setTokenQuota] = useState('0');
  const [imageQuota, setImageQuota] = useState('0');
  const [customModels, setCustomModels] = useState<string[] | null>(null);
  const [errors, setErrors] = useState<{ token?: string; image?: string }>({});
  const activeWorkspaceId = workspaceId || workspaces[0]?.id || '';

  const applyConfig = (c: WorkspaceAiConfigDto) => {
    setConfig(c);
    setIsEnabled(c.isEnabled);
    setCredentialId(c.providerCredentialId ?? '');
    setImageCredentialId(c.imageProviderCredentialId ?? '');
    setTokenQuota(String(c.monthlyTokenQuota ?? 0));
    setImageQuota(String(c.monthlyImageQuota ?? 0));
    setCustomModels(null);
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
    loadConfig(activeWorkspaceId);
  }, [activeWorkspaceId, refreshToken, loadConfig]);

  const defaultTextProvider = providers.find((p) => p.isDefaultText && p.isEnabled) ?? null;
  const defaultImageProvider =
    providers.find((p) => p.isDefaultImage && p.isEnabled && !!p.imageModel?.trim()) ?? null;

  const usingSharedApi = credentialId !== '';
  const selectedProvider = usingSharedApi
    ? providers.find((p) => p.id === credentialId) ?? null
    : null;
  const effectiveTextProvider = usingSharedApi ? selectedProvider : defaultTextProvider;

  const eligibleImageProviders = providers.filter((p) => p.isEnabled && !!p.imageModel?.trim());
  const usingDedicatedImageApi = imageCredentialId !== '';
  const selectedImageProvider = usingDedicatedImageApi
    ? providers.find((p) => p.id === imageCredentialId) ?? null
    : null;
  const isSelectedImageProviderUsable =
    !!selectedImageProvider &&
    selectedImageProvider.isEnabled &&
    !!selectedImageProvider.imageModel?.trim();
  const effectiveImageProvider = usingDedicatedImageApi
    ? selectedImageProvider
    : (defaultImageProvider ?? effectiveTextProvider);

  const modelOptions = getProviderModelOptions(effectiveTextProvider, effectiveImageProvider);
  const savedMatching = (config?.allowedModels || []).filter((m) => modelOptions.includes(m));
  const defaultActiveModels = Array.from(
    new Set(
      [effectiveTextProvider?.textModel, effectiveImageProvider?.imageModel]
        .map((m) => m?.trim())
        .filter((m): m is string => !!m && modelOptions.includes(m)),
    ),
  );
  const activeModels =
    customModels !== null
      ? customModels.filter((m) => modelOptions.includes(m))
      : savedMatching.length > 0
        ? savedMatching
        : defaultActiveModels;

  const cloudflareModelSet = new Set<string>();
  if (effectiveTextProvider?.providerType === 'Cloudflare' && effectiveTextProvider.textModel?.trim()) {
    cloudflareModelSet.add(effectiveTextProvider.textModel.trim());
  }
  if (
    effectiveImageProvider?.providerType === 'Cloudflare' &&
    effectiveImageProvider.imageModel?.trim()
  ) {
    cloudflareModelSet.add(effectiveImageProvider.imageModel.trim());
  }

  const resolveKeyState = (enabled: boolean, credId: string) => {
    if (!credId) {
      if (defaultTextProvider) {
        return {
          label: t('admin.aiConfig.studio.defaultKeyStatus', {
            name: defaultTextProvider.name,
            hint: defaultTextProvider.keyHint || '••••',
          }),
          tone: 'success' as AdminTone,
        };
      }
      if (credId === (config?.providerCredentialId ?? '') && config?.hasApiKey) {
        return {
          label:
            config.apiKeyUsable === false
              ? t('admin.aiConfig.studio.sharedKeyUnavailable')
              : t('admin.aiConfig.studio.defaultKeyStatusFallback', {
                  provider: config.provider || 'AI',
                }),
          tone: (config.apiKeyUsable === false ? 'danger' : 'success') as AdminTone,
        };
      }
      return {
        label: t('admin.aiConfig.studio.noApiSelected'),
        tone: (enabled ? 'warning' : 'neutral') as AdminTone,
      };
    }
    const found = providers.find((p) => p.id === credId);
    if (!found) {
      return {
        label: t('admin.aiConfig.studio.sharedKeyUnavailable'),
        tone: 'danger' as AdminTone,
      };
    }
    return {
      label: t('admin.aiConfig.studio.sharedKeyStatus', {
        name: found.name,
        hint: found.keyHint || '••••',
        state: found.isEnabled
          ? t('admin.aiConfig.providers.statusEnabled')
          : t('admin.aiConfig.providers.statusDisabled'),
      }),
      tone: (found.isEnabled ? 'success' : 'danger') as AdminTone,
    };
  };

  const keyState = resolveKeyState(isEnabled, credentialId);
  const summaryKeyState = resolveKeyState(
    config?.isEnabled ?? false,
    config?.providerCredentialId ?? '',
  );

  const hasMissingBoundOption =
    !!config?.providerCredentialId && !providers.some((p) => p.id === config.providerCredentialId);

  const staleBoundImageId =
    config?.imageProviderCredentialId &&
    !eligibleImageProviders.some((p) => p.id === config.imageProviderCredentialId)
      ? config.imageProviderCredentialId
      : null;
  const staleBoundImageProvider = staleBoundImageId
    ? providers.find((p) => p.id === staleBoundImageId) ?? null
    : null;

  const parseQuota = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || saving) return;
    const token = parseQuota(tokenQuota);
    const image = parseQuota(imageQuota);
    setErrors({
      token: token === null ? t('admin.aiConfig.studio.nonNegativeIntError') : undefined,
      image: image === null ? t('admin.aiConfig.studio.nonNegativeIntError') : undefined,
    });
    if (token === null || image === null) return;

    const prevCredId = config?.providerCredentialId ?? '';
    const credentialChanged = credentialId !== prevCredId;
    const prevImageCredId = config?.imageProviderCredentialId ?? '';
    const imageCredentialChanged = imageCredentialId !== prevImageCredId;

    setSaving(true);
    try {
      if (credentialChanged) {
        await adminService.setWorkspaceAiProvider(activeWorkspaceId, credentialId || null);
      }
      if (imageCredentialChanged) {
        await adminService.setWorkspaceAiImageProvider(
          activeWorkspaceId,
          imageCredentialId || null,
        );
      }
      const updated = await adminService.updateWorkspaceAiConfig(activeWorkspaceId, {
        isEnabled,
        monthlyTokenQuota: token,
        monthlyImageQuota: image,
        allowedModels: activeModels,
      });
      applyConfig(updated);
      if (credentialChanged || imageCredentialChanged) onProviderAssigned();
      showToast(t('admin.aiConfig.studio.saveSuccess'));
    } catch (err: any) {
      showToast(err.message || t('admin.aiConfig.studio.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (wsError)
    return (
      <AdminCard>
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
          {t('admin.aiConfig.studio.loadStudiosError')}
          <AdminButton size='sm' onClick={onRetryWorkspaces}>
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

  const isConfigPending =
    loadingConfig || loadingWs || (!!activeWorkspaceId && !config && !configError);

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
            value={activeWorkspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            disabled={loadingWs || saving}
            aria-label={t('admin.aiConfig.studio.selectStudioAria')}
            className={cn(adminFieldClass, 'w-auto min-w-[180px] sm:min-w-[220px] max-w-full truncate')}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        }
      >
        {isConfigPending ? (
          <p className='text-sm text-admin-muted py-6 text-center'>
            {t('admin.aiConfig.studio.loadingConfig')}
          </p>
        ) : configError ? (
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-700'>
            {t('admin.aiConfig.studio.loadConfigError')}
            <AdminButton size='sm' onClick={() => loadConfig(activeWorkspaceId)}>
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
                  {isEnabled
                    ? t('admin.aiConfig.studio.enableDescOn')
                    : t('admin.aiConfig.studio.enableDescOff')}
                </span>
              </span>
            </label>

            <div
              className='flex flex-wrap items-center gap-2 min-w-0 text-sm text-admin-muted'
              data-testid='ai-key-status'
            >
              {t('admin.aiConfig.studio.keyStatusLabel')}{' '}
              <AdminBadge tone={keyState.tone}>{keyState.label}</AdminBadge>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <AdminField
                label={t('admin.aiConfig.studio.credentialSelectLabel')}
                htmlFor='ai-studio-credential'
                hint={t('admin.aiConfig.studio.credentialSelectHint')}
              >
                <select
                  id='ai-studio-credential'
                  value={credentialId}
                  onChange={(e) => {
                    setCredentialId(e.target.value);
                    setCustomModels(null);
                  }}
                  className={adminFieldClass}
                >
                  <option value=''>
                    {defaultTextProvider
                      ? t('admin.aiConfig.studio.useDefaultWithProvider', {
                          name: defaultTextProvider.name,
                          providerType: defaultTextProvider.providerType,
                        })
                      : t('admin.aiConfig.studio.useDefaultUnset')}
                  </option>
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

              <AdminField
                label={t('admin.aiConfig.studio.imageCredentialSelectLabel')}
                htmlFor='ai-studio-image-credential'
                hint={t('admin.aiConfig.studio.imageCredentialSelectHint')}
                error={
                  usingDedicatedImageApi && !isSelectedImageProviderUsable
                    ? t('admin.aiConfig.studio.sharedImageKeyUnavailable')
                    : undefined
                }
              >
                <select
                  id='ai-studio-image-credential'
                  value={imageCredentialId}
                  onChange={(e) => {
                    setImageCredentialId(e.target.value);
                    setCustomModels(null);
                  }}
                  className={adminFieldClass}
                >
                  <option value=''>
                    {defaultImageProvider
                      ? t('admin.aiConfig.studio.imageUseDefaultWithProvider', {
                          name: defaultImageProvider.name,
                          imageModel: defaultImageProvider.imageModel!,
                        })
                      : t('admin.aiConfig.studio.imageUseDefaultSameAsText')}
                  </option>
                  {staleBoundImageId && (
                    <option value={staleBoundImageId} disabled>
                      {staleBoundImageProvider
                        ? `${staleBoundImageProvider.name}${t('admin.aiConfig.studio.imageCredentialInvalidSuffix')}`
                        : t('admin.aiConfig.studio.imageCredentialMissingOption')}
                    </option>
                  )}
                  {eligibleImageProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.name} (${p.providerType} · ${p.imageModel}${p.keyHint ? ` · ${p.keyHint}` : ''})`}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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

            <fieldset className='min-w-0'>
              <legend className='text-sm font-semibold text-admin-ink mb-2'>
                {t('admin.aiConfig.studio.allowedModels')}
              </legend>
              {modelOptions.length === 0 ? (
                <p className='text-sm text-admin-muted'>
                  {t('admin.aiConfig.studio.allowedModelsEmptyHint')}
                </p>
              ) : (
                <>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0'>
                    {modelOptions.map((m) => {
                      const checked = activeModels.includes(m);
                      return (
                        <label
                          key={m}
                          className={cn(
                            'flex items-center justify-between gap-2 min-w-0 min-h-11 px-3 rounded-xl border cursor-pointer transition-colors',
                            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-admin-accent',
                            checked
                              ? 'border-admin-accent bg-admin-accent-soft'
                              : 'border-admin-line bg-admin-field hover:bg-admin-hover',
                          )}
                        >
                          <span className='flex items-center gap-3 min-w-0'>
                            <input
                              type='checkbox'
                              checked={checked}
                              onChange={() =>
                                setCustomModels(
                                  activeModels.includes(m)
                                    ? activeModels.filter((x) => x !== m)
                                    : [...activeModels, m],
                                )
                              }
                              className='w-4 h-4 shrink-0 accent-[#F97316]'
                            />
                            <span className='text-sm font-mono text-admin-ink truncate'>{m}</span>
                          </span>
                          {cloudflareModelSet.has(m) && <ModelCostTag modelId={m} />}
                        </label>
                      );
                    })}
                  </div>
                  <p className='mt-2 text-xs text-admin-muted'>
                    {t('admin.aiConfig.studio.allowedModelsNote')}
                  </p>
                  {cloudflareModelSet.size > 0 && (
                    <p className='mt-1 text-xs text-admin-muted'>
                      {t('admin.aiConfig.providers.cfNeuronNote')}
                    </p>
                  )}
                </>
              )}
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
            <div className='min-w-0'>
              <dt className='text-admin-muted'>{t('admin.aiConfig.summary.status')}</dt>
              <dd className='mt-1 flex flex-wrap gap-1.5 min-w-0'>
                <AdminBadge tone={config.isEnabled ? 'success' : 'neutral'}>
                  {config.isEnabled
                    ? t('admin.aiConfig.summary.aiEnabled')
                    : t('admin.aiConfig.summary.aiDisabled')}
                </AdminBadge>
                <AdminBadge tone={summaryKeyState.tone} className='items-start text-left'>
                  <KeyRound className='w-3 h-3 shrink-0 mt-0.5' aria-hidden />
                  <span className='min-w-0 [overflow-wrap:anywhere]'>{summaryKeyState.label}</span>
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

  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loadingWs, setLoadingWs] = useState(true);
  const [wsError, setWsError] = useState(false);
  const [studioRefreshToken, setStudioRefreshToken] = useState(0);

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

  const loadWorkspaces = useCallback(async () => {
    setLoadingWs(true);
    setWsError(false);
    try {
      const list = await adminService.getWorkspaces();
      setWorkspaces(list || []);
    } catch {
      setWsError(true);
    } finally {
      setLoadingWs(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
    loadWorkspaces();
  }, [loadProviders, loadWorkspaces]);

  const handleProvidersMutated = useCallback(
    (assignedWorkspaces?: boolean) => {
      loadProviders();
      if (assignedWorkspaces) {
        setStudioRefreshToken((n) => n + 1);
      }
    },
    [loadProviders],
  );

  const handleDefaultUpdated = useCallback((next: AiProviderCredentialDto[]) => {
    setProviders(next);
    setStudioRefreshToken((n) => n + 1);
  }, []);

  return (
    <div className='space-y-6'>
      <AiProvidersPanel
        providers={providers}
        workspaces={workspaces}
        loading={loadingProviders}
        error={providersError}
        onReload={loadProviders}
        onMutated={handleProvidersMutated}
        onDefaultUpdated={handleDefaultUpdated}
        showToast={showToast}
      />
      <StudioAiConfigPanel
        providers={providers}
        workspaces={workspaces}
        loadingWs={loadingWs}
        wsError={wsError}
        onRetryWorkspaces={loadWorkspaces}
        refreshToken={studioRefreshToken}
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
