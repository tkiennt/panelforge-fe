import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminService, AdminWorkspaceDto, AdminPaymentConfigDto } from '@/services/admin.service';
import {
  paymentService,
  toBankAccountName,
  POPULAR_VIETNAM_BANKS,
} from '@/services/payment.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminModal,
  AdminPageHeader,
  AdminTableState,
  AdminToast,
} from '../components/AdminUi';
import { adminFieldClass, adminTable, useAdminToast } from '../components/adminUiStyles';

const COLS = 4;

interface BankForm {
  bankBin: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

/**
 * Admin: cấu hình thanh toán VietQR/SePay.
 * - Hệ thống (SePay webhook key, tài khoản nhận mặc định): chỉ đọc, đổi qua env SePay__* trên server.
 * - Từng Studio: tài khoản thụ hưởng, dùng chung API bank-settings với Publisher.
 */
export const PaymentSettings: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AdminPaymentConfigDto | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminWorkspaceDto | null>(null);
  const [form, setForm] = useState<BankForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [cfg, ws] = await Promise.all([
        adminService.getPaymentConfig(),
        adminService.getWorkspaces(),
      ]);
      setConfig(cfg);
      setWorkspaces(ws);
    } catch (err) {
      console.error('Failed to load payment config:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.ownerName || '').toLowerCase().includes(q) ||
        (w.bankAccountNo || '').includes(q),
    );
  }, [workspaces, search]);

  const openEdit = (ws: AdminWorkspaceDto) => {
    const bin = ws.bankBin || POPULAR_VIETNAM_BANKS[0].bin;
    setEditing(ws);
    setFormError(null);
    setForm({
      bankBin: bin,
      bankName: ws.bankName || POPULAR_VIETNAM_BANKS.find((b) => b.bin === bin)?.name || '',
      bankAccountNo: ws.bankAccountNo || '',
      bankAccountName: ws.bankAccountName || '',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form || saving) return;
    if (!/^\d{6,19}$/.test(form.bankAccountNo.trim())) {
      setFormError(t('admin.payments.modal.invalidAccountNo'));
      return;
    }
    if (form.bankAccountName.trim().length < 3) {
      setFormError(t('admin.payments.modal.invalidAccountName'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const saved = await paymentService.updateBankSettings(editing.id, {
        bankBin: form.bankBin,
        bankName: form.bankName,
        bankAccountNo: form.bankAccountNo.trim(),
        bankAccountName: form.bankAccountName.trim(),
      });
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === editing.id
            ? {
                ...w,
                bankBin: saved.bankBin,
                bankName: saved.bankName,
                bankAccountNo: saved.bankAccountNo,
                bankAccountName: saved.bankAccountName,
              }
            : w,
        ),
      );
      showToast(t('admin.payments.modal.saved', { name: editing.name }));
      setEditing(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err) || t('admin.payments.modal.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const statusPill = (ok: boolean, okText: string, badText: string) => (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border',
        ok
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-900 border-amber-200',
      )}
    >
      {ok ? okText : badText}
    </span>
  );

  const webhookUrl = config ? `${window.location.origin}${config.webhookPath}` : '';

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.payments.title')}
        description={t('admin.payments.description')}
        actions={
          <AdminButton onClick={load} isLoading={loading} icon={<RefreshCw className='w-4 h-4' />}>
            {t('admin.payments.refresh')}
          </AdminButton>
        }
      />

      <AdminCard
        title={t('admin.payments.system.title')}
        description={t('admin.payments.system.description')}
        bodyClassName='p-5'
      >
        {config ? (
          <dl className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm'>
            <div>
              <dt className='text-admin-muted'>{t('admin.payments.system.webhookKey')}</dt>
              <dd className='mt-1'>
                {statusPill(
                  config.webhookApiKeyConfigured,
                  t('admin.payments.system.configured'),
                  t('admin.payments.system.missing'),
                )}
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>{t('admin.payments.system.webhookUrl')}</dt>
              <dd className='mt-1 font-mono break-all'>{webhookUrl}</dd>
            </div>
            <div>
              <dt className='text-admin-muted'>{t('admin.payments.system.defaultBank')}</dt>
              <dd className='mt-1 font-mono'>
                {config.defaultBankName} · {config.defaultBankAccountNo}
                <div className='text-admin-muted'>{config.defaultBankAccountName}</div>
              </dd>
            </div>
            <div>
              <dt className='text-admin-muted'>{t('admin.payments.system.defaultBankStatus')}</dt>
              <dd className='mt-1'>
                {statusPill(
                  !config.defaultBankIsPlaceholder,
                  t('admin.payments.system.realAccount'),
                  t('admin.payments.system.placeholder'),
                )}
              </dd>
            </div>
            <p className='md:col-span-2 text-xs text-admin-muted'>
              {t('admin.payments.system.envHint')}
            </p>
          </dl>
        ) : (
          <p className='text-sm text-admin-muted'>
            {loading ? t('admin.payments.table.loading') : t('admin.payments.table.loadError')}
          </p>
        )}
      </AdminCard>

      <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
        <div className='flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line'>
          <div className='relative w-full sm:max-w-xs'>
            <Search
              className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              aria-hidden
            />
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.payments.searchPlaceholder')}
              aria-label={t('admin.payments.searchPlaceholder')}
              className={cn(adminFieldClass, 'pl-9')}
            />
          </div>
        </div>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.payments.table.colStudio')}</th>
                <th className={adminTable.th}>{t('admin.payments.table.colOwner')}</th>
                <th className={adminTable.th}>{t('admin.payments.table.colBank')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.payments.table.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.payments.table.loading')}
                />
              ) : loadError ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='error'
                  message={t('admin.payments.table.loadError')}
                  action={
                    <AdminButton size='sm' onClick={load}>
                      {t('admin.payments.refresh')}
                    </AdminButton>
                  }
                />
              ) : filtered.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='empty'
                  message={t('admin.payments.table.empty')}
                />
              ) : (
                filtered.map((ws) => (
                  <tr key={ws.id} className={adminTable.tr}>
                    <td className={adminTable.td}>
                      <div className='font-semibold text-admin-ink-strong break-words'>
                        {ws.name}
                      </div>
                    </td>
                    <td className={adminTable.td}>
                      <div className='font-medium'>{ws.ownerName || '—'}</div>
                      <div className='text-xs text-admin-muted break-all'>{ws.ownerEmail}</div>
                    </td>
                    <td className={adminTable.td}>
                      {ws.bankAccountNo ? (
                        <>
                          <div className='font-mono'>
                            {ws.bankName || ws.bankBin} · {ws.bankAccountNo}
                          </div>
                          <div className='text-xs text-admin-muted'>{ws.bankAccountName}</div>
                        </>
                      ) : (
                        <span className='text-admin-muted'>
                          {t('admin.payments.table.usesDefault')}
                        </span>
                      )}
                    </td>
                    <td className={`${adminTable.td} text-right`}>
                      <AdminButton size='sm' onClick={() => openEdit(ws)}>
                        {t('admin.payments.table.edit')}
                      </AdminButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && form && (
        <AdminModal
          title={t('admin.payments.modal.title')}
          description={editing.name}
          onClose={() => !saving && setEditing(null)}
          footer={
            <>
              <AdminButton onClick={() => setEditing(null)} disabled={saving}>
                {t('admin.payments.modal.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='admin-bank-form'
                variant='primary'
                isLoading={saving}
              >
                {t('admin.payments.modal.save')}
              </AdminButton>
            </>
          }
        >
          <form id='admin-bank-form' noValidate onSubmit={save} className='space-y-3'>
            <AdminField label={t('admin.payments.modal.bank')} htmlFor='admin-bank-bin' required>
              <select
                id='admin-bank-bin'
                value={form.bankBin}
                onChange={(e) => {
                  const found = POPULAR_VIETNAM_BANKS.find((b) => b.bin === e.target.value);
                  setForm({
                    ...form,
                    bankBin: e.target.value,
                    bankName: found ? found.name : form.bankName,
                  });
                }}
                className={adminFieldClass}
              >
                {!POPULAR_VIETNAM_BANKS.some((b) => b.bin === form.bankBin) && (
                  <option value={form.bankBin}>
                    {form.bankName || form.bankBin} ({form.bankBin})
                  </option>
                )}
                {POPULAR_VIETNAM_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField
              label={t('admin.payments.modal.accountNo')}
              htmlFor='admin-bank-no'
              required
            >
              <input
                id='admin-bank-no'
                inputMode='numeric'
                value={form.bankAccountNo}
                onChange={(e) =>
                  setForm({ ...form, bankAccountNo: e.target.value.replace(/\D/g, '') })
                }
                className={cn(adminFieldClass, 'font-mono')}
              />
            </AdminField>
            <AdminField
              label={t('admin.payments.modal.accountName')}
              htmlFor='admin-bank-name'
              required
              error={formError}
            >
              <input
                id='admin-bank-name'
                value={form.bankAccountName}
                onChange={(e) =>
                  setForm({ ...form, bankAccountName: toBankAccountName(e.target.value) })
                }
                aria-invalid={!!formError}
                className={cn(adminFieldClass, 'font-mono uppercase')}
              />
            </AdminField>
            <p className='p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900'>
              {t('admin.payments.modal.sepayWarning')}
            </p>
          </form>
        </AdminModal>
      )}
    </>
  );
};
