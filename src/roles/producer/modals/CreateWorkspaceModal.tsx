import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Loader2, HardDrive, Sparkles } from 'lucide-react';
import { workspaceService } from '@/services/workspace.service';
import {
  BYTES_PER_GB,
  INSUFFICIENT_STUDIO_RESOURCES,
  TOKENS_PER_UNIT,
  studioResourcesService,
  type StudioResourcesDto,
} from '@/services/studioResources.service';
import { WorkspaceDto, normalizeWorkspaceRole } from '@/types';
import { Alert, Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

/** Làm tròn xuống 1 chữ số thập phân để mặc định không vượt phần còn lại. */
const floor1 = (n: number) => Math.floor(n * 10) / 10;

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
  const { t, lang } = useTranslation('production');
  const navigate = useNavigate();
  const [name, setName] = useState('');
  // D12: phần chia từ kho Producer (GB, triệu token); null = chưa sửa → dùng mặc định
  const [storageGb, setStorageGb] = useState<string | null>(null);
  const [tokenMillions, setTokenMillions] = useState<string | null>(null);
  const [shortage, setShortage] = useState(false);
  // Hộp tạo Studio còn được mở từ GlobalModals (ngoài QueryClientProvider) nên tự tải, không dùng useQuery.
  const [resources, setResources] = useState<StudioResourcesDto | null>(null);
  const loadResources = useCallback(() => {
    studioResourcesService
      .getMine()
      .then(setResources)
      .catch(() => setResources(null)); // không tải được kho: server vẫn kiểm khi tạo và trả 409 nếu thiếu
  }, []);
  useEffect(() => {
    if (isOpen) loadResources();
  }, [isOpen, loadResources]);
  const pool = resources?.hasPool ? resources : null;
  const remainingGb = pool ? (pool.storage?.remaining ?? 0) / BYTES_PER_GB : 0;
  const remainingMillions = pool ? (pool.tokens?.remaining ?? 0) / TOKENS_PER_UNIT : 0;
  const defaultGb = pool
    ? floor1(Math.min(pool.suggestedStorageBytes / BYTES_PER_GB, remainingGb))
    : 0;
  const defaultMillions = pool
    ? floor1(Math.min(pool.suggestedTokens / TOKENS_PER_UNIT, remainingMillions))
    : 0;
  const gbValue = Number(storageGb ?? defaultGb);
  const millionsValue = Number(tokenMillions ?? defaultMillions);
  const allocationInvalid = !!pool && (!(gbValue > 0) || !(millionsValue > 0));
  const overPool =
    !!pool && (gbValue > remainingGb + 1e-9 || millionsValue > remainingMillions + 1e-9);
  const poolEmpty = !!pool && (remainingGb < 0.1 || remainingMillions < 0.1);
  const showShortage = overPool || poolEmpty || shortage;
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
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
        ...(pool
          ? {
              storageQuotaBytes: Math.round(gbValue * BYTES_PER_GB),
              tokenQuota: Math.round(millionsValue * TOKENS_PER_UNIT),
            }
          : {}),
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
      if ((err as { code?: string })?.code === INSUFFICIENT_STUDIO_RESOURCES) {
        setShortage(true);
        loadResources();
      }
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

        {pool && (
          <fieldset className='rounded-xl border border-stone-200/80 bg-[#FAF9F5] p-3 flex flex-col gap-3'>
            <legend className='px-1 font-semibold text-stone-800'>
              {t('workspace.resources.create.legend')}
            </legend>
            <p className='text-stone-600 leading-relaxed' data-testid='create-studio-pool-left'>
              {t('workspace.resources.create.poolLeft', {
                storage: number.format(remainingGb),
                tokens: number.format(remainingMillions),
              })}
            </p>
            <div className='grid grid-cols-2 gap-3'>
              <label className='flex flex-col gap-1 font-medium text-stone-700'>
                <span className='inline-flex items-center gap-1'>
                  <HardDrive className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  {t('workspace.resources.create.storageGb')}
                </span>
                <input
                  type='number'
                  inputMode='decimal'
                  min={0.1}
                  step={0.1}
                  value={storageGb ?? String(defaultGb)}
                  onChange={(e) => {
                    setStorageGb(e.target.value);
                    setShortage(false);
                  }}
                  className='w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs'
                  disabled={loading}
                />
              </label>
              <label className='flex flex-col gap-1 font-medium text-stone-700'>
                <span className='inline-flex items-center gap-1'>
                  <Sparkles className='w-3.5 h-3.5 text-violet-600' aria-hidden='true' />
                  {t('workspace.resources.create.tokenMillions')}
                </span>
                <input
                  type='number'
                  inputMode='decimal'
                  min={0.1}
                  step={0.1}
                  value={tokenMillions ?? String(defaultMillions)}
                  onChange={(e) => {
                    setTokenMillions(e.target.value);
                    setShortage(false);
                  }}
                  className='w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs'
                  disabled={loading}
                />
              </label>
            </div>
            {showShortage && (
              <Alert
                tone='warning'
                className='text-xs'
                data-testid='create-studio-shortage'
                title={t('workspace.resources.create.shortageTitle')}
              >
                <p>{t('workspace.resources.create.shortageDesc')}</p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={() => navigate('/workspaces/resources?buy=1')}
                    className='focus-ring px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer'
                  >
                    {t('workspace.resources.buyMore')}
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate('/workspaces/resources')}
                    className='focus-ring px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-900 font-semibold cursor-pointer'
                  >
                    {t('workspace.resources.create.reallocate')}
                  </button>
                </div>
              </Alert>
            )}
          </fieldset>
        )}

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
            disabled={loading || !name.trim() || allocationInvalid || overPool || poolEmpty}
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
