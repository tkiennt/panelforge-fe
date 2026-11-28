import React, { useState } from 'react';
import { Building2, Check, Clock, Mail, UserRound, X } from 'lucide-react';
import { Alert, Button, Modal } from '@/shared/ui';
import type { PendingInvitation } from '@/shared/views/WorkspaceShelfSections';
import { useTranslation } from '@/lib/i18n';
import { studioRoleMeta, toStudioRoleId, type StudioRoleId } from './studioRoles';

interface StudioInvitationListProps {
  invitations: PendingInvitation[];
  busyId: string | null;
  error: string | null;
  timeAgo: (iso: string) => string;
  onAccept: (inv: PendingInvitation) => void;
  onReject: (inv: PendingInvitation) => void;
}

const DUTY_KEYS = ['duty1', 'duty2', 'duty3'] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/**
 * Lời mời vào Studio cho độc giả: mỗi lời mời nói rõ vai trò sẽ làm gì trước khi nhận.
 * Nhận lời mời là lối duy nhất để độc giả thành thành viên Studio (quyết định 2026-11-28).
 */
export const StudioInvitationList: React.FC<StudioInvitationListProps> = ({
  invitations,
  busyId,
  error,
  timeAgo,
  onAccept,
  onReject,
}) => {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<PendingInvitation | null>(null);

  const roleName = (raw: string) => {
    const id = toStudioRoleId(raw);
    return id ? t(`workspace.shelf.role.${id}`) : raw || t('workspace.shelf.role.member');
  };

  const roleChip = (id: StudioRoleId | null, raw: string) => {
    if (!id) {
      return (
        <span className='rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700'>
          {roleName(raw)}
        </span>
      );
    }
    const { Icon, tone } = studioRoleMeta(id);
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}
      >
        <Icon className='w-3.5 h-3.5' aria-hidden='true' />
        {roleName(raw)}
      </span>
    );
  };

  const detailRole = detail ? toStudioRoleId(detail.role) : null;

  return (
    <section aria-labelledby='reader-invitations-title' className='space-y-4'>
      <div className='flex items-end justify-between gap-3'>
        <div>
          <h2
            id='reader-invitations-title'
            className='flex items-center gap-2 font-serif text-xl font-bold text-stone-900'
          >
            <Mail className='w-4 h-4 text-[#EA580C]' aria-hidden='true' />
            {t('workspace.reader.invitations.title')}
            <span className='rounded-full bg-orange-50 px-2 py-0.5 font-mono text-xs font-semibold text-[#EA580C] tabular-nums'>
              {invitations.length}
            </span>
          </h2>
          <p className='mt-1 text-sm text-stone-600'>
            {t('workspace.reader.invitations.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <Alert tone='danger' className='text-sm'>
          {error}
        </Alert>
      )}

      <ul className='grid gap-4 md:grid-cols-2'>
        {invitations.map((inv) => {
          const id = toStudioRoleId(inv.role);
          const busy = busyId === inv.workspaceId;
          return (
            <li
              key={inv.workspaceId}
              className='flex flex-col rounded-xl border border-stone-200/80 bg-white shadow-xs'
            >
              <div className='flex items-start gap-3 p-4'>
                <span className='grid size-11 shrink-0 place-items-center rounded-xl bg-stone-900 font-serif text-sm font-bold text-white'>
                  {initials(inv.workspaceName) || <Building2 className='w-4 h-4' />}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-serif text-lg font-bold text-stone-900'>
                    {inv.workspaceName}
                  </p>
                  <p className='mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500'>
                    <span className='inline-flex items-center gap-1'>
                      <UserRound className='w-3.5 h-3.5' aria-hidden='true' />
                      {t('workspace.reader.invitations.invitedBy', { name: inv.ownerName })}
                    </span>
                    <span className='inline-flex items-center gap-1'>
                      <Clock className='w-3.5 h-3.5' aria-hidden='true' />
                      {timeAgo(inv.invitedAt)}
                    </span>
                  </p>
                </div>
                {roleChip(id, inv.role)}
              </div>

              {id && (
                <div className='mx-4 rounded-lg bg-[#FAF9F5] px-3 py-2.5'>
                  <p className='text-xs font-semibold text-stone-700'>
                    {t('workspace.reader.invitations.whatYouDo')}
                  </p>
                  <p className='mt-1 text-xs leading-relaxed text-stone-600'>
                    {t(`workspace.reader.studioRoles.${id}.summary`)}
                  </p>
                </div>
              )}

              <div className='mt-auto flex flex-wrap items-center justify-end gap-2 p-4'>
                <Button
                  size='sm'
                  variant='ghost'
                  disabled={busy}
                  leadingIcon={<X className='w-4 h-4' />}
                  onClick={() => onReject(inv)}
                >
                  {t('workspace.shelf.invitations.reject')}
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  disabled={busy}
                  onClick={() => setDetail(inv)}
                >
                  {t('workspace.reader.invitations.viewDetail')}
                </Button>
                <Button
                  size='sm'
                  variant='primary'
                  loading={busy}
                  leadingIcon={<Check className='w-4 h-4' />}
                  onClick={() => onAccept(inv)}
                >
                  {t('workspace.reader.invitations.accept')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        size='md'
        title={
          detail
            ? t('workspace.reader.invitations.detailTitle', { studio: detail.workspaceName })
            : ''
        }
        closeLabel={t('workspace.reader.catalog.close')}
        footer={
          detail && (
            <>
              <Button variant='secondary' onClick={() => setDetail(null)}>
                {t('workspace.shelf.cancel')}
              </Button>
              <Button
                variant='primary'
                leadingIcon={<Check className='w-4 h-4' />}
                loading={busyId === detail.workspaceId}
                onClick={() => {
                  const inv = detail;
                  setDetail(null);
                  onAccept(inv);
                }}
              >
                {t('workspace.reader.invitations.acceptAs', { role: roleName(detail.role) })}
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div className='space-y-4 text-sm text-stone-700'>
            <div className='flex flex-wrap items-center gap-2'>
              {roleChip(detailRole, detail.role)}
              <span className='text-xs text-stone-500'>
                {t('workspace.reader.invitations.invitedByEmail', {
                  name: detail.ownerName,
                  email: detail.ownerEmail,
                })}
              </span>
            </div>
            {detailRole && (
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-stone-500'>
                  {t('workspace.reader.invitations.dutiesTitle')}
                </p>
                <ul className='mt-2 space-y-2'>
                  {DUTY_KEYS.map((key) => (
                    <li key={key} className='flex gap-2'>
                      <Check
                        className='mt-0.5 w-4 h-4 shrink-0 text-emerald-600'
                        aria-hidden='true'
                      />
                      <span>{t(`workspace.reader.studioRoles.${detailRole}.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Alert tone='info' className='text-xs'>
              {t('workspace.reader.invitations.afterAccept')}
            </Alert>
          </div>
        )}
      </Modal>
    </section>
  );
};
