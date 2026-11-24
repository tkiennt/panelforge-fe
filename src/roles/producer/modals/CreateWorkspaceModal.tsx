import React, { useState } from 'react';
import { X, Layers, Plus, Loader2 } from 'lucide-react';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';
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
  const [quotaGb, setQuotaGb] = useState('300');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('producer.createWorkspaceModal.nameRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const quotaBytes = (parseFloat(quotaGb) || 300) * 1024 * 1024 * 1024;
      const created = await workspaceService.createWorkspace({
        name: trimmedName,
        storageQuotaBytes: quotaBytes,
      });

      if (onShowToast) {
        onShowToast(
          t('producer.createWorkspaceModal.toastSuccessTitle'),
          t('producer.createWorkspaceModal.toastSuccessDesc', { name: created.name }),
        );
      }
      setName('');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo Workspace:', err);
      setError(err.message || t('producer.createWorkspaceModal.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      title={t('producer.createWorkspaceModal.title')}
      description={t('producer.createWorkspaceModal.description')}
      closeLabel={t('producer.createWorkspaceModal.closeLabel')}
    >
      <div className='relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-xs'>
        {/* Header */}
        <div className='p-5 border-b border-stone-200 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 text-xl'>
              {icon}
            </div>
            <div>
              <h3 className='font-bold text-stone-900 text-base'>
                {t('producer.createWorkspaceModal.title')}
              </h3>
              <p className='text-xs text-stone-500'>
                {t('producer.createWorkspaceModal.description')}
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('producer.createWorkspaceModal.closeLabel')}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-6 flex flex-col gap-4'>
          {error && (
            <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed'>
              {error}
            </div>
          )}

          <div className='flex gap-3'>
            <div className='flex flex-col gap-1 w-20'>
              <label className='font-semibold text-stone-700'>Icon</label>
              <select
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
              <label className='font-semibold text-stone-700'>
                {t('producer.createWorkspaceModal.studioNameLabel')}
              </label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('producer.createWorkspaceModal.studioNamePlaceholder')}
                className='w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                autoFocus
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='font-semibold text-stone-700'>
              {t('producer.createWorkspaceModal.roleLabel')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className='w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs cursor-pointer'
            >
              <option value='Producer'>{t('producer.createWorkspaceModal.roleProducer')}</option>
              <option value='Lead Artist'>
                {t('producer.createWorkspaceModal.roleLeadArtist')}
              </option>
              <option value='Editor'>{t('producer.createWorkspaceModal.roleEditor')}</option>
            </select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='font-semibold text-stone-700'>
              {t('producer.createWorkspaceModal.storageLabel')}
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { gb: '100', tier: 'Indie Basic' },
                { gb: '300', tier: 'Pro Team' },
                { gb: '500', tier: 'Enterprise' },
              ].map((item) => (
                <label
                  key={item.gb}
                  className={`border rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer text-center transition-all ${
                    quotaGb === item.gb
                      ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className='font-bold text-stone-900 text-sm'>{item.gb} GB</span>
                  <span className='text-[10px] text-stone-500'>{item.tier}</span>
                  <input
                    type='radio'
                    name='studio_quota'
                    value={item.gb}
                    checked={quotaGb === item.gb}
                    onChange={() => setQuotaGb(item.gb)}
                    className='sr-only'
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100'>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-4 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors'
            >
              {t('producer.createWorkspaceModal.cancel')}
            </button>
            <button
              type='submit'
              disabled={loading || !name.trim()}
              className='px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>{t('producer.createWorkspaceModal.creating')}</span>
                </>
              ) : (
                <>
                  <Plus className='w-4 h-4' />
                  <span>{t('producer.createWorkspaceModal.submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
