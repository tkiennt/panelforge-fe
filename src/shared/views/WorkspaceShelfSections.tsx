import React from 'react';
import { ArrowRight, Check, ListTodo, Mail, X, AlertCircle } from 'lucide-react';
import type { WorkspaceDto } from '@/types';
import { dueTone, type TodayTask } from './workspaceShelfTasks';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface PendingInvitation {
  workspaceId: string;
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  role: string;
  invitedAt: string;
}

/** Lời mời tham gia studio đang chờ (GET /Workspaces/pending-invitations). */
export const PendingInvitations: React.FC<{
  invitations: PendingInvitation[];
  busyId: string | null;
  error: string | null;
  t: T;
  roleLabel: (role: string) => string;
  timeAgo: (date: string) => string;
  onAccept: (inv: PendingInvitation) => void;
  onReject: (inv: PendingInvitation) => void;
}> = ({ invitations, busyId, error, t, roleLabel, timeAgo, onAccept, onReject }) => (
  <section
    className='bg-white border border-orange-200 rounded-xl shadow-xs p-4 sm:p-5 mb-5 space-y-3'
    aria-labelledby='ws-invitations-title'
    data-testid='ws-invitations'
  >
    <div className='flex items-start gap-3'>
      <span className='w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0'>
        <Mail className='w-4 h-4' aria-hidden='true' />
      </span>
      <div>
        <h2 id='ws-invitations-title' className='text-lg font-bold text-stone-900'>
          {t('workspace.shelf.invitations.title')}
          <span className='ml-2 text-sm font-mono text-orange-700'>{invitations.length}</span>
        </h2>
        <p className='text-sm text-stone-600'>{t('workspace.shelf.invitations.subtitle')}</p>
      </div>
    </div>
    {error && (
      <p role='alert' className='text-sm text-rose-700 flex items-center gap-1.5'>
        <AlertCircle className='w-4 h-4' aria-hidden='true' />
        {error}
      </p>
    )}
    <ul className='divide-y divide-stone-100' role='list'>
      {invitations.map((inv) => {
        const busy = busyId === inv.workspaceId;
        return (
          <li
            key={inv.workspaceId}
            className='py-3 flex flex-wrap items-center justify-between gap-3'
          >
            <div className='min-w-0'>
              <p className='text-base font-serif font-bold text-stone-900 truncate'>
                {inv.workspaceName}
              </p>
              <p className='text-sm text-stone-600'>
                {t('workspace.shelf.invitations.from', {
                  owner: inv.ownerName,
                  role: roleLabel(inv.role),
                })}
                <span className='text-xs text-stone-500'> · {timeAgo(inv.invitedAt)}</span>
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <button
                type='button'
                disabled={busy}
                onClick={() => onReject(inv)}
                className='ws-btn-secondary ws-focus inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-semibold disabled:opacity-50'
                aria-label={`${t('workspace.shelf.invitations.reject')}: ${inv.workspaceName}`}
              >
                <X className='w-4 h-4' aria-hidden='true' />
                {t('workspace.shelf.invitations.reject')}
              </button>
              <button
                type='button'
                disabled={busy}
                onClick={() => onAccept(inv)}
                className='ws-btn-primary ws-focus inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold disabled:opacity-50'
                aria-label={`${t('workspace.shelf.invitations.accept')}: ${inv.workspaceName}`}
              >
                <Check className='w-4 h-4' aria-hidden='true' />
                {t('workspace.shelf.invitations.accept')}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

/** "Việc của bạn": việc chưa xong trên mọi studio, lấy từ /workspaces/{id}/my-assignments. */
export const TodayTasks: React.FC<{
  tasks: TodayTask[];
  total: number;
  error: boolean;
  now: number;
  t: T;
  onOpen: (ws: WorkspaceDto) => void;
}> = ({ tasks, total, error, now, t, onOpen }) => (
  <section
    className='bg-white border border-stone-200/80 rounded-xl shadow-xs p-4 sm:p-5 mb-5 space-y-3'
    aria-labelledby='ws-today-title'
    data-testid='ws-today'
  >
    <div className='flex items-start gap-3'>
      <span className='w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0'>
        <ListTodo className='w-4 h-4' aria-hidden='true' />
      </span>
      <div>
        <h2 id='ws-today-title' className='text-lg font-bold text-stone-900'>
          {t('workspace.shelf.today.title')}
          <span className='ml-2 text-sm font-mono text-blue-800'>{total}</span>
        </h2>
        <p className='text-sm text-stone-600'>{t('workspace.shelf.today.subtitle')}</p>
      </div>
    </div>
    {error ? (
      <p className='text-sm text-rose-700'>{t('workspace.shelf.today.error')}</p>
    ) : (
      <ul className='divide-y divide-stone-100' role='list'>
        {tasks.map(({ workspace, assignment: a }) => {
          const tone = dueTone(a.dueDate, now);
          const date = a.dueDate ? new Date(a.dueDate).toLocaleDateString('vi-VN') : '';
          return (
            <li key={a.id} className='py-2.5 flex flex-wrap items-center justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-semibold text-stone-900 truncate'>
                  {a.stageName}
                  <span className='font-normal text-stone-600'>
                    {' '}
                    · {a.seriesTitle} · Ch.{a.chapterNumber}
                    {a.scopeLabel ? ` · ${a.scopeLabel}` : ''}
                  </span>
                </p>
                <p className='text-xs text-stone-500 truncate'>
                  {workspace.name}
                  {a.brief ? ` · ${a.brief}` : ''}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                  tone === 'overdue'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : tone === 'soon'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                {tone === 'overdue'
                  ? t('workspace.shelf.today.overdue')
                  : tone === 'none'
                    ? t('workspace.shelf.today.noDue')
                    : t('workspace.shelf.today.due', { date })}
              </span>
              <button
                type='button'
                onClick={() => onOpen(workspace)}
                className='ws-focus inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-800 rounded'
                aria-label={`${t('workspace.shelf.today.open')}: ${workspace.name}`}
              >
                {t('workspace.shelf.today.open')}
                <ArrowRight className='w-4 h-4' aria-hidden='true' />
              </button>
            </li>
          );
        })}
      </ul>
    )}
    {!error && total > tasks.length && (
      <p className='text-xs text-stone-500'>
        {t('workspace.shelf.today.more', { count: total - tasks.length })}
      </p>
    )}
  </section>
);
