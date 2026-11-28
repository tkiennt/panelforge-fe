import React from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Building2, PartyPopper } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { studioRoleMeta, toStudioRoleId } from '../components/studioRoles';

/** Dữ liệu lời mời vừa nhận, truyền qua `location.state` từ trang Thông báo. */
export interface StudioWelcomeState {
  workspaceName: string;
  role: string;
  ownerName?: string;
}

const FIRST_STEP_KEYS = ['firstStep1', 'firstStep2', 'firstStep3'] as const;

/**
 * Màn chào sau khi độc giả nhận lời mời vào Studio: nói rõ vai trò và việc đầu tiên cần làm,
 * rồi mới mở khu Studio. Mở trực tiếp (không có state) thì sang danh sách Studio.
 */
export const StudioWelcomeView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const state = useLocation().state as StudioWelcomeState | null;

  if (!workspaceId || !state?.workspaceName) return <Navigate to='/workspaces' replace />;

  const roleId = toStudioRoleId(state.role);
  const meta = roleId ? studioRoleMeta(roleId) : null;
  const roleName = roleId ? t(`workspace.shelf.role.${roleId}`) : state.role;
  const RoleIcon = meta?.Icon ?? Building2;

  return (
    <main className='w-full flex-1'>
      <section className='border-b border-stone-200/80 bg-white'>
        <div className='mx-auto max-w-4xl px-4 py-10 text-center sm:px-6'>
          <span className='mx-auto grid size-14 place-items-center rounded-2xl bg-orange-50 text-[#EA580C]'>
            <PartyPopper className='w-4 h-4' aria-hidden='true' />
          </span>
          <p className='mt-4 text-xs font-bold uppercase tracking-widest text-[#EA580C]'>
            {t('workspace.reader.welcome.eyebrow')}
          </p>
          <h1 className='mt-2 font-serif text-3xl font-bold text-stone-900'>
            {t('workspace.reader.welcome.title', { studio: state.workspaceName })}
          </h1>
          <p className='mx-auto mt-3 max-w-xl text-sm text-stone-600'>
            {state.ownerName
              ? t('workspace.reader.welcome.subtitleWithOwner', {
                  owner: state.ownerName,
                  role: roleName,
                })
              : t('workspace.reader.welcome.subtitle', { role: roleName })}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
              meta?.tone ?? 'bg-stone-100 text-stone-700 ring-stone-200'
            }`}
          >
            <RoleIcon className='w-4 h-4' aria-hidden='true' />
            {roleName}
          </span>
        </div>
      </section>

      <div className='mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_16rem]'>
        <section
          aria-labelledby='welcome-steps'
          className='rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs'
        >
          <h2 id='welcome-steps' className='font-serif text-lg font-bold text-stone-900'>
            {t('workspace.reader.welcome.stepsTitle')}
          </h2>
          {roleId ? (
            <ol className='mt-4 space-y-4'>
              {FIRST_STEP_KEYS.map((key, i) => (
                <li key={key} className='flex gap-3'>
                  <span className='grid size-7 shrink-0 place-items-center rounded-full bg-stone-900 font-mono text-xs font-bold text-white'>
                    {i + 1}
                  </span>
                  <p className='pt-1 text-sm text-stone-700'>
                    {t(`workspace.reader.studioRoles.${roleId}.${key}`)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className='mt-3 text-sm text-stone-600'>
              {t('workspace.reader.welcome.genericStep')}
            </p>
          )}
          <Button
            variant='primary'
            className='mt-6'
            trailingIcon={<ArrowRight className='w-4 h-4' />}
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
          >
            {t('workspace.reader.welcome.enterStudio')}
          </Button>
        </section>

        <aside className='space-y-3 rounded-xl border border-stone-200/80 bg-[#FAF9F5] p-5 text-sm text-stone-600'>
          <BookOpen className='w-4 h-4 text-stone-500' aria-hidden='true' />
          <p className='font-semibold text-stone-900'>
            {t('workspace.reader.welcome.stillReaderTitle')}
          </p>
          <p className='text-xs leading-relaxed'>{t('workspace.reader.welcome.stillReaderDesc')}</p>
          <Link
            to='/catalog'
            className='inline-flex items-center gap-1 text-xs font-semibold text-[#EA580C] hover:underline'
          >
            {t('workspace.reader.welcome.backToCatalog')}
            <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
          </Link>
        </aside>
      </div>
    </main>
  );
};
