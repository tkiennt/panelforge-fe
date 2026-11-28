import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { WorkspaceUsageDto } from '@/services/workspace.service';
import {
  formatBytes,
  GB,
  resourceService,
  ResourceRequest,
  ResourceType,
} from '@/services/resource.service';

const fieldClass =
  'w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600';

/**
 * Producer xin Admin tăng Storage / AI Quota (cấp phát, không mua). Chỉ hiển thị & gửi yêu cầu;
 * Producer không tự đổi quota. Quyền Producer kiểm ở server.
 */
export const RequestResourcesModal: React.FC<{
  workspaceId: string;
  usage: WorkspaceUsageDto;
  onClose: () => void;
}> = ({ workspaceId, usage, onClose }) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [type, setType] = useState<ResourceType>('Storage');
  const [requested, setRequested] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<ResourceRequest[] | null>(null);

  useEffect(() => {
    resourceService
      .getWorkspaceRequests(workspaceId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [workspaceId, sent]);

  const meter =
    type === 'Storage' ? usage.storage : type === 'AiTokens' ? usage.aiTokens : usage.images;
  const fmt = (n: number) =>
    type === 'Storage' ? formatBytes(n, locale) : n.toLocaleString(locale);
  const unlimited = !meter || meter.isUnlimited;
  const pendingSameType = history?.some((r) => r.resourceType === type && r.status === 'Pending');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !meter) return;
    const n = Number(requested);
    const limit = type === 'Storage' ? Math.round(n * GB) : n;
    if (!requested.trim() || !Number.isFinite(n) || limit <= meter.quota)
      return setError(t('workspace.resourceRequest.errorTooLow'));
    if (type !== 'Storage' && !Number.isInteger(n))
      return setError(t('workspace.resourceRequest.errorInteger'));
    if (!reason.trim()) return setError(t('workspace.resourceRequest.errorReason'));
    setSaving(true);
    setError(null);
    try {
      await resourceService.submitRequest(workspaceId, {
        resourceType: type,
        requestedLimit: limit,
        reason: reason.trim(),
      });
      setSent(true);
      setRequested('');
      setReason('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      size='md'
      onClose={() => !saving && onClose()}
      title={t('workspace.resourceRequest.title')}
      description={t('workspace.resourceRequest.description')}
      closeLabel={t('workspace.resourceRequest.close')}
    >
      <form onSubmit={submit} noValidate className='flex flex-col gap-3 text-xs'>
        {sent && (
          <p
            role='status'
            className='p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800'
          >
            {t('workspace.resourceRequest.sent')}
          </p>
        )}
        {error && (
          <p role='alert' className='p-3 rounded-xl bg-red-50 border border-red-200 text-red-700'>
            {error}
          </p>
        )}
        <label className='flex flex-col gap-1 font-medium text-stone-700'>
          {t('workspace.resourceRequest.type')}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as ResourceType);
              setRequested('');
              setError(null);
            }}
            className={fieldClass}
          >
            <option value='Storage'>{t('workspace.resourceRequest.types.Storage')}</option>
            <option value='AiTokens'>{t('workspace.resourceRequest.types.AiTokens')}</option>
            <option value='AiImages'>{t('workspace.resourceRequest.types.AiImages')}</option>
          </select>
        </label>
        <p className='text-stone-600'>
          {unlimited
            ? t('workspace.resourceRequest.unlimited')
            : t('workspace.resourceRequest.current', {
                used: fmt(meter!.used),
                quota: fmt(meter!.quota),
              })}
        </p>
        {!unlimited && (
          <>
            <label className='flex flex-col gap-1 font-medium text-stone-700'>
              {type === 'Storage'
                ? t('workspace.resourceRequest.requestedGb')
                : t('workspace.resourceRequest.requestedCount')}
              <input
                type='number'
                min='0'
                value={requested}
                onChange={(e) => setRequested(e.target.value)}
                className={`${fieldClass} tabular-nums`}
              />
            </label>
            <label className='flex flex-col gap-1 font-medium text-stone-700'>
              {t('workspace.resourceRequest.reason')}
              <textarea
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={fieldClass}
              />
            </label>
            {pendingSameType && (
              <p className='text-amber-700'>{t('workspace.resourceRequest.pendingExists')}</p>
            )}
            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={saving || pendingSameType}
                className='px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
              >
                {saving && <Loader2 className='w-4 h-4 animate-spin' aria-hidden />}
                {t('workspace.resourceRequest.submit')}
              </button>
            </div>
          </>
        )}

        {!!history?.length && (
          <div className='pt-3 border-t border-stone-100'>
            <h3 className='font-semibold text-stone-800 mb-1.5'>
              {t('workspace.resourceRequest.history')}
            </h3>
            <ul className='space-y-1.5'>
              {history.slice(0, 5).map((r) => (
                <li key={r.id} className='flex flex-wrap justify-between gap-2 text-stone-600'>
                  <span>
                    {t(`workspace.resourceRequest.types.${r.resourceType}`)} →{' '}
                    {r.resourceType === 'Storage'
                      ? formatBytes(r.requestedLimit, locale)
                      : r.requestedLimit.toLocaleString(locale)}
                  </span>
                  <span className='font-medium'>
                    {t(`workspace.resourceRequest.status.${r.status}`)}
                    {r.reviewNote ? ` · ${r.reviewNote}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  );
};
