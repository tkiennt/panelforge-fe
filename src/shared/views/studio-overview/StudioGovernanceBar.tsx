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
import { formatBytes, formatGb, formatTokens } from './formatters';

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
  const { t } = useTranslation();

  return (
    <div className='pt-2 border-t border-stone-100'>
      {/* Collapsed Summary Bar */}
      <div className='p-3 sm:p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2.5 text-xs'>
          <div className='flex items-center gap-1.5 font-bold text-stone-800 shrink-0'>
            <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
            <span>{t('workspace.governance.resourcesLabel')}</span>
          </div>

          {/* Storage Chip */}
          {(() => {
            const used = workspaceUsage
              ? workspaceUsage.storage.used
              : activeWorkspace.usedStorageBytes || 0;
            const quota = workspaceUsage
              ? workspaceUsage.storage.quota
              : activeWorkspace.storageQuotaBytes || 0;
            const isUnlimited = workspaceUsage?.storage.isUnlimited ?? false;
            const percent = isUnlimited
              ? 0
              : quota > 0 && used > 0
                ? Math.min(100, Math.max(0, Math.round((used / quota) * 100)))
                : 0;
            const isWarning = !isUnlimited && percent >= 75;

            return (
              <div
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                  isWarning
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                    : 'bg-white text-stone-700 border-stone-200/80'
                }`}
                title={
                  isUnlimited
                    ? t('workspace.governance.unlimitedStorageTitle')
                    : t('workspace.governance.usedPercentTitle', { percent })
                }
              >
                <span className='text-stone-500 font-sans'>
                  {t('workspace.governance.storageShort')}
                </span>
                <span>
                  {workspaceUsage
                    ? `${formatBytes(used)} / ${isUnlimited ? t('workspace.governance.unlimited') : formatBytes(quota)}`
                    : `${formatGb(activeWorkspace.usedStorageBytes)} / ${formatGb(activeWorkspace.storageQuotaBytes)} GB`}
                </span>
                {isWarning && <AlertTriangle className='w-3 h-3 text-amber-600' />}
              </div>
            );
          })()}

          {/* AI Tokens Chip */}
          <div className='px-2.5 py-1 rounded-lg border bg-white border-stone-200/80 font-mono text-xs flex items-center gap-1.5 text-stone-700'>
            <Cpu className='w-3.5 h-3.5 text-blue-500 shrink-0' />
            <span className='text-stone-500 font-sans'>
              {t('workspace.governance.aiTokenShort')}
            </span>
            <span>
              {workspaceUsage?.aiTokens
                ? workspaceUsage.aiTokens.isUnlimited
                  ? t('workspace.governance.unlimited')
                  : `${formatTokens(workspaceUsage.aiTokens.used)} / ${formatTokens(workspaceUsage.aiTokens.quota)}`
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
            <History className='w-3.5 h-3.5 text-stone-400' />
            <span>Audit Trail</span>
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
                <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
                <span>{t('workspace.governance.storageHeading')}</span>
              </div>
              <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                {workspaceUsage
                  ? `${formatBytes(workspaceUsage.storage.used)} / ${
                      workspaceUsage.storage.isUnlimited
                        ? t('workspace.governance.unlimited')
                        : formatBytes(workspaceUsage.storage.quota)
                    }`
                  : `${formatGb(activeWorkspace.usedStorageBytes)} / ${formatGb(
                      activeWorkspace.storageQuotaBytes,
                    )} GB`}
              </div>
            </div>

            {(() => {
              const used = workspaceUsage
                ? workspaceUsage.storage.used
                : activeWorkspace.usedStorageBytes || 0;
              const quota = workspaceUsage
                ? workspaceUsage.storage.quota
                : activeWorkspace.storageQuotaBytes || 0;
              const isUnlimited = workspaceUsage?.storage.isUnlimited ?? false;
              const percent = isUnlimited
                ? 0
                : quota > 0 && used > 0
                  ? Math.min(100, Math.max(0, Math.round((used / quota) * 100)))
                  : 0;

              return (
                <div className='space-y-2'>
                  {isUnlimited ? (
                    <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                      <CheckCircle2 className='w-3.5 h-3.5' />
                      <span>{t('workspace.governance.storageUnlimitedText')}</span>
                    </div>
                  ) : (
                    <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 90
                            ? 'bg-red-500'
                            : percent >= 75
                              ? 'bg-amber-500'
                              : 'bg-orange-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                  <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                    <span>
                      {isUnlimited
                        ? t('workspace.governance.unlimitedPlan')
                        : t('workspace.governance.usedPercent', { percent })}
                    </span>
                    <span className='font-mono text-stone-500 text-xs'>
                      {isUnlimited
                        ? t('workspace.governance.unlimited')
                        : t('workspace.governance.blockAt100')}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 2. AI Token Meter */}
          <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                <Cpu className='w-4 h-4 text-blue-500 shrink-0' />
                <span>{t('workspace.governance.aiTokenHeading')}</span>
              </div>
              {workspaceUsage?.aiTokens ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {formatTokens(workspaceUsage.aiTokens.used)} /{' '}
                  {workspaceUsage.aiTokens.isUnlimited
                    ? t('workspace.governance.unlimited')
                    : `${formatTokens(workspaceUsage.aiTokens.quota)}`}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-xs font-medium rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-mono shrink-0'>
                  {t('workspace.governance.noQuota')}
                </span>
              )}
            </div>

            {workspaceUsage?.aiTokens ? (
              <div className='space-y-2'>
                {workspaceUsage.aiTokens.isUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span>{t('workspace.governance.aiTokenUnlimitedText')}</span>
                  </div>
                ) : (
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.aiTokens.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.aiTokens.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                )}
                <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                  <span>
                    {workspaceUsage.aiTokens.isUnlimited
                      ? t('workspace.governance.monthlyTokens')
                      : t('workspace.governance.usedPercent', {
                          percent: workspaceUsage.aiTokens.percentUsed ?? 0,
                        })}
                  </span>
                  <span
                    className={`font-semibold text-xs ${
                      workspaceUsage.aiEnabled ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage.aiEnabled
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
                <ImageIcon className='w-4 h-4 text-purple-500 shrink-0' />
                <span>{t('workspace.governance.aiImageHeading')}</span>
              </div>
              {workspaceUsage?.images ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {workspaceUsage.images.used.toLocaleString()} /{' '}
                  {workspaceUsage.images.isUnlimited
                    ? t('workspace.governance.unlimited')
                    : t('workspace.governance.imageQuotaCount', {
                        count: workspaceUsage.images.quota.toLocaleString(),
                      })}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-xs font-medium rounded-full text-purple-700 bg-purple-50 border border-purple-200 font-mono shrink-0'>
                  {t('workspace.governance.noQuota')}
                </span>
              )}
            </div>

            {workspaceUsage?.images ? (
              <div className='space-y-2'>
                {workspaceUsage.images.isUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-purple-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span>{t('workspace.governance.imageUnlimitedText')}</span>
                  </div>
                ) : (
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.images.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : (workspaceUsage.images.percentUsed ?? 0) >= 75
                            ? 'bg-amber-500'
                            : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.images.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                )}
                <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                  <span>
                    {workspaceUsage.images.isUnlimited
                      ? t('workspace.governance.unlimitedImages')
                      : t('workspace.governance.usedPercent', {
                          percent: workspaceUsage.images.percentUsed ?? 0,
                        })}
                  </span>
                  <span
                    className={`font-semibold text-xs ${
                      workspaceUsage.aiEnabled ? 'text-purple-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage.aiEnabled
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
