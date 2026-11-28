import React from 'react';
import {
  HardDrive,
  Cpu,
  History,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  ArrowUpCircle,
} from 'lucide-react';
import { WorkspaceDto, WorkspaceUsageDto } from '@/services/workspace.service';
import { useTranslation } from '@/lib/i18n';
import { formatBytes, formatTokens } from './formatters';

export interface StudioGovernanceBarProps {
  activeWorkspace: WorkspaceDto;
  workspaceUsage: WorkspaceUsageDto | null;
  isResourcesExpanded: boolean;
  onToggleResourcesExpanded: () => void;
  onOpenAuditModal: () => void;
  /** OPS-21: có thì hiện nút "Xin tăng hạn mức" (chỉ Producer). */
  onRequestQuotaIncrease?: () => void;
}

export const StudioGovernanceBar: React.FC<StudioGovernanceBarProps> = ({
  activeWorkspace,
  workspaceUsage,
  isResourcesExpanded,
  onToggleResourcesExpanded,
  onOpenAuditModal,
  onRequestQuotaIncrease,
}) => {
  const { t, lang } = useTranslation();
  const numberFmt = new Intl.NumberFormat(lang);

  const storageUsed = workspaceUsage
    ? workspaceUsage.storage.used
    : activeWorkspace.usedStorageBytes || 0;
  const storageQuota = workspaceUsage
    ? workspaceUsage.storage.quota
    : activeWorkspace.storageQuotaBytes || 0;
  const storageIsUnlimited = (workspaceUsage?.storage.isUnlimited ?? false) || storageQuota <= 0;
  const storagePercent = storageIsUnlimited
    ? 0
    : storageQuota > 0 && storageUsed > 0
      ? Math.min(100, Math.max(0, Math.round((storageUsed / storageQuota) * 100)))
      : 0;
  const storageIsWarning = !storageIsUnlimited && storagePercent >= 75;

  const aiTokens = workspaceUsage?.aiTokens ?? null;
  const aiTokensUnlimited = !!aiTokens && (aiTokens.isUnlimited || aiTokens.quota <= 0);
  const aiTokensPercent =
    !aiTokens || aiTokensUnlimited
      ? 0
      : typeof aiTokens.percentUsed === 'number' && Number.isFinite(aiTokens.percentUsed)
        ? Math.min(100, Math.max(0, Math.round(aiTokens.percentUsed)))
        : Math.min(100, Math.max(0, Math.round((aiTokens.used / aiTokens.quota) * 100)));

  const images = workspaceUsage?.images ?? null;
  const imagesUnlimited = !!images && (images.isUnlimited || images.quota <= 0);
  const imagesPercent =
    !images || imagesUnlimited
      ? 0
      : typeof images.percentUsed === 'number' && Number.isFinite(images.percentUsed)
        ? Math.min(100, Math.max(0, Math.round(images.percentUsed)))
        : Math.min(100, Math.max(0, Math.round((images.used / images.quota) * 100)));

  return (
    <div className='pt-2 border-t border-stone-100' data-testid='studio-governance-bar'>
      {/* Collapsed Summary Bar */}
      <div className='p-3 sm:p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2.5 text-xs'>
          <div className='flex items-center gap-1.5 font-bold text-stone-800 shrink-0'>
            <HardDrive className='w-4 h-4 text-orange-500 shrink-0' aria-hidden='true' />
            <span>{t('workspace.governance.resourcesLabel')}</span>
          </div>

          {/* Storage Chip */}
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
              storageIsWarning
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                : 'bg-white text-stone-700 border-stone-200/80'
            }`}
            title={
              storageIsUnlimited
                ? t('workspace.governance.unlimitedStorageTitle')
                : t('workspace.governance.usedPercentTitle', { percent: storagePercent })
            }
          >
            <span className='text-stone-500 font-sans'>
              {t('workspace.governance.storageShort')}
            </span>
            <span>
              {`${formatBytes(storageUsed)} / ${
                storageIsUnlimited ? t('workspace.governance.unlimited') : formatBytes(storageQuota)
              }`}
            </span>
            {storageIsWarning && (
              <AlertTriangle className='w-3.5 h-3.5 text-amber-600' aria-hidden='true' />
            )}
          </div>

          {/* AI Tokens Chip */}
          <div className='px-2.5 py-1 rounded-lg border bg-white border-stone-200/80 font-mono text-xs flex items-center gap-1.5 text-stone-700'>
            <Cpu className='w-3.5 h-3.5 text-blue-500 shrink-0' aria-hidden='true' />
            <span className='text-stone-500 font-sans'>
              {t('workspace.governance.aiTokenShort')}
            </span>
            <span>
              {aiTokens
                ? aiTokensUnlimited
                  ? t('workspace.governance.unlimited')
                  : `${formatTokens(aiTokens.used)} / ${formatTokens(aiTokens.quota)}`
                : t('workspace.governance.noQuota')}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2 self-end md:self-auto shrink-0'>
          {onRequestQuotaIncrease && (
            <button
              type='button'
              onClick={onRequestQuotaIncrease}
              className='px-2.5 py-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:bg-orange-50 border border-orange-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer'
            >
              <ArrowUpCircle className='w-3.5 h-3.5' />
              <span>{t('workspace.quota.requestButton')}</span>
            </button>
          )}
          <button
            type='button'
            onClick={onOpenAuditModal}
            className='px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer'
            title={t('workspace.governance.auditTitle')}
          >
            <History className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
            <span>{t('workspace.governance.auditTrail')}</span>
          </button>

          <button
            type='button'
            onClick={onToggleResourcesExpanded}
            aria-expanded={isResourcesExpanded}
            className='px-3 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs'
          >
            <span>
              {isResourcesExpanded
                ? t('workspace.governance.collapse')
                : t('workspace.governance.expandDetails')}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isResourcesExpanded ? 'rotate-180' : ''
              }`}
              aria-hidden='true'
            />
          </button>
        </div>
      </div>

      {/* Expanded Detailed Quota Meters */}
      {isResourcesExpanded && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3.5 animate-in fade-in duration-150'>
          {/* 1. Storage Meter */}
          <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                <HardDrive className='w-4 h-4 text-orange-500 shrink-0' aria-hidden='true' />
                <span>{t('workspace.governance.storageHeading')}</span>
              </div>
              <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                {`${formatBytes(storageUsed)} / ${
                  storageIsUnlimited
                    ? t('workspace.governance.unlimited')
                    : formatBytes(storageQuota)
                }`}
              </div>
            </div>

            <div className='space-y-2'>
              {storageIsUnlimited ? (
                <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                  <CheckCircle2 className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>{t('workspace.governance.storageUnlimitedText')}</span>
                </div>
              ) : (
                <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storagePercent >= 90
                        ? 'bg-red-500'
                        : storagePercent >= 75
                          ? 'bg-amber-500'
                          : 'bg-orange-500'
                    }`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              )}
              <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                <span>
                  {storageIsUnlimited
                    ? t('workspace.governance.unlimitedPlan')
                    : t('workspace.governance.usedPercent', { percent: storagePercent })}
                </span>
                <span className='font-mono text-stone-500 text-xs'>
                  {storageIsUnlimited
                    ? t('workspace.governance.unlimited')
                    : t('workspace.governance.blockAt100')}
                </span>
              </div>
            </div>
          </div>

          {/* 2. AI Token Meter */}
          <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                <Cpu className='w-4 h-4 text-blue-500 shrink-0' aria-hidden='true' />
                <span>{t('workspace.governance.aiTokenHeading')}</span>
              </div>
              {aiTokens ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {formatTokens(aiTokens.used)} /{' '}
                  {aiTokensUnlimited
                    ? t('workspace.governance.unlimited')
                    : `${formatTokens(aiTokens.quota)}`}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-xs font-medium rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-mono shrink-0'>
                  {t('workspace.governance.noQuota')}
                </span>
              )}
            </div>

            {aiTokens ? (
              <div className='space-y-2'>
                {aiTokensUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' aria-hidden='true' />
                    <span>{t('workspace.governance.aiTokenUnlimitedText')}</span>
                  </div>
                ) : (
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        aiTokensPercent >= 90 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${aiTokensPercent}%`,
                      }}
                    />
                  </div>
                )}
                <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                  <span>
                    {aiTokensUnlimited
                      ? t('workspace.governance.monthlyTokens')
                      : t('workspace.governance.usedPercent', {
                          percent: aiTokensPercent,
                        })}
                  </span>
                  <span
                    className={`font-semibold text-xs ${
                      workspaceUsage?.aiEnabled ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage?.aiEnabled
                      ? t('workspace.governance.aiOn')
                      : t('workspace.governance.aiOff')}
                  </span>
                </div>
              </div>
            ) : (
              <div className='pt-1 text-xs leading-relaxed text-stone-500 italic'>
                {t('workspace.governance.contactAdminQuota')}
              </div>
            )}
          </div>

          {/* 3. AI Image Generation Meter */}
          <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                <ImageIcon className='w-4 h-4 text-purple-500 shrink-0' aria-hidden='true' />
                <span>{t('workspace.governance.aiImageHeading')}</span>
              </div>
              {images ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {numberFmt.format(images.used)} /{' '}
                  {imagesUnlimited
                    ? t('workspace.governance.unlimited')
                    : t('workspace.governance.imageQuotaCount', {
                        count: numberFmt.format(images.quota),
                      })}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-xs font-medium rounded-full text-purple-700 bg-purple-50 border border-purple-200 font-mono shrink-0'>
                  {t('workspace.governance.noQuota')}
                </span>
              )}
            </div>

            {images ? (
              <div className='space-y-2'>
                {imagesUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-purple-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' aria-hidden='true' />
                    <span>{t('workspace.governance.imageUnlimitedText')}</span>
                  </div>
                ) : (
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        imagesPercent >= 90
                          ? 'bg-red-500'
                          : imagesPercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${imagesPercent}%`,
                      }}
                    />
                  </div>
                )}
                <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                  <span>
                    {imagesUnlimited
                      ? t('workspace.governance.unlimitedImages')
                      : t('workspace.governance.usedPercent', {
                          percent: imagesPercent,
                        })}
                  </span>
                  <span
                    className={`font-semibold text-xs ${
                      workspaceUsage?.aiEnabled ? 'text-purple-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage?.aiEnabled
                      ? t('workspace.governance.imageActive')
                      : t('workspace.governance.aiOff')}
                  </span>
                </div>
              </div>
            ) : (
              <div className='space-y-1 pt-1'>
                <p className='text-xs leading-relaxed text-stone-500 italic'>
                  {t('workspace.governance.imageNotEnabled')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
