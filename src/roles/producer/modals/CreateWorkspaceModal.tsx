import React, { useState } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { workspaceService } from '@/services/workspace.service';
import { WorkspaceDto, normalizeWorkspaceRole } from '@/types';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newWorkspace: WorkspaceDto) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const { t } = useTranslation('production');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [role, setRole] = useState('Producer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('workspace.studioHub.createStudio.errorEmptyName'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const created = await workspaceService.createWorkspace({
        name: trimmedName,
      });

      if (onShowToast) {
        onShowToast(
          t('workspace.studioHub.createStudio.successToastTitle'),
          t('workspace.studioHub.createStudio.successToastDesc', { name: created.name }),
        );
      }
      setName('');
      onSuccess({
        ...created,
        currentUserRole: normalizeWorkspaceRole(created.currentUserRole),
      });
      onClose();
    } catch (err: unknown) {
      console.error('Lỗi khi tạo Workspace:', err);
      const message =
        err instanceof Error
          ? err.message
          : t('workspace.studioHub.createStudio.errorCreateFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      title={
        <div className='flex items-center gap-3'>
          <div
            className='w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 text-xl'
            aria-hidden='true'
          >
            {icon}
          </div>
          <div className='text-left'>
            <span className='font-bold text-stone-900 text-base block font-serif'>
              {t('workspace.studioHub.createStudio.title')}
            </span>
            <span className='text-xs text-stone-500 font-normal block mt-0.5 font-sans'>
              {t('workspace.studioHub.createStudio.subtitle')}
            </span>
          </div>
        </div>
      }
      closeLabel={t('workspace.studioHub.createStudio.cancel')}
    >
      <form onSubmit={handleSubmit} className='flex flex-col gap-4 text-xs font-sans'>
        {error && (
          <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed'>
            {error}
          </div>
        )}

        <div className='flex gap-3'>
          <div className='flex flex-col gap-1 w-20'>
            <label htmlFor='create-studio-icon' className='font-medium text-stone-700'>
              {t('workspace.studioHub.createStudio.iconLabel')}
            </label>
            <select
              id='create-studio-icon'
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className='bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 text-center text-lg focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs cursor-pointer'
            >
              <option value='🏢'>🏢</option>
              <option value='🖋️'>🖋️</option>
              <option value='🎨'>🎨</option>
              <option value='⚡'>⚡</option>
              <option value='⛩️'>⛩️</option>
            </select>
          </div>
          <div className='flex-1 flex flex-col gap-1'>
            <label htmlFor='create-studio-name-input' className='font-medium text-stone-700'>
              {t('workspace.studioHub.createStudio.nameLabel')}
            </label>
            <input
              id='create-studio-name-input'
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workspace.studioHub.createStudio.namePlaceholder')}
              className='w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
              autoFocus
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='create-studio-role-select' className='font-medium text-stone-700'>
            {t('workspace.studioHub.createStudio.roleLabel')}
          </label>
          <select
            id='create-studio-role-select'
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className='w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs cursor-pointer font-medium'
          >
            <option value='Producer'>{t('workspace.studioHub.createStudio.roleProducer')}</option>
            <option value='Lead Artist'>
              {t('workspace.studioHub.createStudio.roleLeadArtist')}
            </option>
            <option value='Editor'>{t('workspace.studioHub.createStudio.roleEditor')}</option>
          </select>
        </div>

        <p className='text-xs text-stone-500 leading-relaxed'>
          {' '}
          {t('workspace.studioHub.createStudio.quotaNote')}{' '}
        </p>

        <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-4 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors'
          >
            {t('workspace.studioHub.createStudio.cancel')}
          </button>
          <button
            type='submit'
            disabled={loading || !name.trim()}
            className='px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />
                <span>{t('workspace.studioHub.createStudio.creating')}</span>
              </>
            ) : (
              <>
                <Rocket className='w-4 h-4' aria-hidden='true' />
                <span>{t('workspace.studioHub.createStudio.submit')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
