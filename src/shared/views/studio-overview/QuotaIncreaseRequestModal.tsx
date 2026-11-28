import React, { useEffect, useState } from 'react';
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '@/shared/ui';
import type { WorkspaceUsageDto } from '@/services/workspace.service';
import {
  quotaService,
  type QuotaIncreaseRequestDto,
  type QuotaResourceType,
} from '@/services/quota.service';
import {
  QUOTA_RESOURCE_TYPES,
  formatQuotaValue,
  fromQuotaInput,
} from '@/shared/features/quota/quotaUnits';
import { useTranslation } from '@/lib/i18n';

export interface QuotaIncreaseRequestModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceUsage: WorkspaceUsageDto | null;
  onClose: () => void;
}

const STATUS_TONE = { Pending: 'warning', Approved: 'success', Rejected: 'danger' } as const;

/** Mức đang cấp theo usage; null = Studio chưa được cấp AI. 0 = không giới hạn. */
const currentQuota = (usage: WorkspaceUsageDto | null, type: QuotaResourceType): number | null => {
  const meters: Record<QuotaResourceType, WorkspaceUsageDto['images'] | undefined> = {
    Storage: usage?.storage,
    AiTokens: usage?.aiTokens,
    AiImages: usage?.images,
    AiRequests: usage?.aiRequests,
  };
  const meter = meters[type];
  if (!meter) return null;
  return meter.isUnlimited ? 0 : meter.quota;
};

/** OPS-21: Producer xin Admin tăng một loại hạn mức; Admin duyệt ở màn Tài nguyên. */
export const QuotaIncreaseRequestModal: React.FC<QuotaIncreaseRequestModalProps> = ({
  isOpen,
  workspaceId,
  workspaceUsage,
  onClose,
}) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [type, setType] = useState<QuotaResourceType>('Storage');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<QuotaIncreaseRequestDto[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSent(false);
    quotaService
      .getWorkspaceRequests(workspaceId)
      .then(setHistory)
      .catch((err: Error) => setError(err.message));
  }, [isOpen, workspaceId]);

  const types = QUOTA_RESOURCE_TYPES.filter((ty) => currentQuota(workspaceUsage, ty) !== null);
  const current = currentQuota(workspaceUsage, type);
  const isUnlimited = current === 0;
  const hasPending = history.some((r) => r.resourceType === type && r.status === 'Pending');
  const blocked = isUnlimited || hasPending;

  const describe = (ty: QuotaResourceType, value: number) =>
    value === 0 ? t('workspace.quota.unlimited') : formatQuotaValue(ty, value, locale);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || blocked || current === null) return;
    const requested = fromQuotaInput(type, amount);
    if (requested === null || requested <= current) {
      setError(t('workspace.quota.invalidAmount'));
      return;
    }
    if (!reason.trim()) {
      setError(t('workspace.quota.reasonRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await quotaService.submitRequest(workspaceId, {
        resourceType: type,
        requestedQuota: requested,
        reason: reason.trim(),
      });
      setHistory((prev) => [created, ...prev]);
      setAmount('');
      setReason('');
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title={t('workspace.quota.modalTitle')}
      description={t('workspace.quota.modalDescription')}
      closeLabel={t('workspace.quota.close')}
      size='md'
      footer={
        <>
          <Button variant='secondary' onClick={onClose} disabled={submitting}>
            {t('workspace.quota.cancel')}
          </Button>
          <Button
            type='submit'
            form='quota-increase-form'
            variant='primary'
            loading={submitting}
            disabled={blocked}
          >
            {t('workspace.quota.submit')}
          </Button>
        </>
      }
    >
      <form id='quota-increase-form' noValidate onSubmit={submit} className='space-y-4'>
        <Field label={t('workspace.quota.typeLabel')}>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as QuotaResourceType);
              setAmount('');
              setError(null);
            }}
          >
            {types.map((ty) => (
              <option key={ty} value={ty}>
                {t(`workspace.quota.types.${ty}`)}
              </option>
            ))}
          </Select>
        </Field>

        {current !== null && (
          <p className='text-xs text-stone-600'>
            {t('workspace.quota.current', { value: describe(type, current) })}
          </p>
        )}

        {isUnlimited ? (
          <p className='text-sm text-stone-600'>{t('workspace.quota.unlimitedNote')}</p>
        ) : hasPending ? (
          <p className='p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900'>
            {t('workspace.quota.pendingNote')}
          </p>
        ) : (
          <>
            <Field label={t(`workspace.quota.requestedLabel.${type}`)} required>
              <Input
                type='number'
                min='0'
                step={type === 'Storage' ? '0.5' : '1'}
                inputMode='decimal'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className='tabular-nums'
              />
            </Field>
            <Field label={t('workspace.quota.reasonLabel')} required>
              <Textarea
                rows={3}
                maxLength={1000}
                value={reason}
                placeholder={t('workspace.quota.reasonPlaceholder')}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </>
        )}

        {error && (
          <p className='text-sm font-medium text-rose-700' role='alert'>
            {error}
          </p>
        )}
        {sent && (
          <p className='text-sm font-medium text-emerald-700' role='status'>
            {t('workspace.quota.submitted')}
          </p>
        )}

        <section className='pt-3 border-t border-stone-200/80 space-y-2'>
          <h3 className='text-xs font-semibold text-stone-700'>
            {t('workspace.quota.historyTitle')}
          </h3>
          {history.length === 0 ? (
            <p className='text-xs text-stone-500'>{t('workspace.quota.historyEmpty')}</p>
          ) : (
            <ul className='space-y-2'>
              {history.slice(0, 5).map((r) => (
                <li key={r.id} className='text-xs text-stone-700 space-y-0.5'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge tone={STATUS_TONE[r.status]}>
                      {t(`workspace.quota.status.${r.status}`)}
                    </Badge>
                    <span className='font-medium'>
                      {t(`workspace.quota.types.${r.resourceType}`)}
                    </span>
                    <span className='tabular-nums text-stone-500'>
                      {describe(r.resourceType, r.currentQuota)} →{' '}
                      {describe(r.resourceType, r.requestedQuota)}
                    </span>
                    <span className='text-stone-500 tabular-nums'>
                      {new Date(r.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  {r.status === 'Approved' && r.grantedQuota !== null && (
                    <div className='text-emerald-700'>
                      {t('workspace.quota.granted', {
                        value: describe(r.resourceType, r.grantedQuota),
                      })}
                    </div>
                  )}
                  {r.reviewNote && (
                    <div className='text-stone-500 break-words'>
                      {t('workspace.quota.adminNote', { note: r.reviewNote })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </form>
    </Modal>
  );
};
