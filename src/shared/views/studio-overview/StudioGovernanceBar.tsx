import React from 'react';
import {
  HardDrive,
  Cpu,
  History,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { WorkspaceDto, WorkspaceUsageDto } from '@/services/workspace.service';
import { formatBytes, formatGb, formatTokens } from './formatters';

export interface StudioGovernanceBarProps {
  activeWorkspace: WorkspaceDto;
  workspaceUsage: WorkspaceUsageDto | null;
  isResourcesExpanded: boolean;
  onToggleResourcesExpanded: () => void;
  onOpenAuditModal: () => void;
}

export const StudioGovernanceBar: React.FC<StudioGovernanceBarProps> = ({
  activeWorkspace,
  workspaceUsage,
  isResourcesExpanded,
  onToggleResourcesExpanded,
  onOpenAuditModal,
}) => {
  return (
    <div className='pt-2 border-t border-stone-100'>
      {/* Collapsed Summary Bar */}
      <div className='p-3 sm:p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2.5 text-xs'>
          <div className='flex items-center gap-1.5 font-bold text-stone-800 shrink-0'>
            <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
            <span>Tài nguyên Studio:</span>
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
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                  isWarning
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                    : 'bg-white text-stone-700 border-stone-200/80'
                }`}
                title={isUnlimited ? 'Không giới hạn dung lượng' : `Đã dùng ${percent}% dung lượng`}
              >
                <span className='text-stone-500 font-sans'>Lưu trữ:</span>
                <span>
                  {workspaceUsage
                    ? `${formatBytes(used)} / ${isUnlimited ? 'Không giới hạn' : formatBytes(quota)}`
                    : `${formatGb(activeWorkspace.usedStorageBytes)} / ${formatGb(activeWorkspace.storageQuotaBytes)} GB`}
                </span>
                {isWarning && <AlertTriangle className='w-3 h-3 text-amber-600' />}
              </div>
            );
          })()}

          {/* AI Tokens Chip */}
          <div className='px-2.5 py-1 rounded-lg border bg-white border-stone-200/80 font-mono text-[11px] flex items-center gap-1.5 text-stone-700'>
            <Cpu className='w-3.5 h-3.5 text-blue-500 shrink-0' />
            <span className='text-stone-500 font-sans'>Token AI:</span>
            <span>
              {workspaceUsage?.aiTokens
                ? workspaceUsage.aiTokens.isUnlimited
                  ? 'Không giới hạn'
                  : `${formatTokens(workspaceUsage.aiTokens.used)} / ${formatTokens(workspaceUsage.aiTokens.quota)}`
                : 'Chưa cấp quota'}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2 self-end md:self-auto shrink-0'>
          <button
            type='button'
            onClick={onOpenAuditModal}
            className='px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer'
            title='Xem lịch sử audit studio (BR-18)'
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
            <span>{isResourcesExpanded ? 'Thu gọn' : 'Chi tiết tài nguyên'}</span>
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
                <span>Dung Lượng Lưu Trữ</span>
              </div>
              <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                {workspaceUsage
                  ? `${formatBytes(workspaceUsage.storage.used)} / ${
                      workspaceUsage.storage.isUnlimited
                        ? 'Không giới hạn'
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
                      <span>Lưu trữ không giới hạn</span>
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
                  <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                    <span>{isUnlimited ? 'Gói vô hạn dung lượng' : `Đã dùng ${percent}%`}</span>
                    <span className='font-mono text-stone-500 text-[10px]'>
                      {isUnlimited ? 'Không giới hạn' : 'Chặn khi chạm 100%'}
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
                <span>Hạn Mức AI Tokens</span>
              </div>
              {workspaceUsage?.aiTokens ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {formatTokens(workspaceUsage.aiTokens.used)} /{' '}
                  {workspaceUsage.aiTokens.isUnlimited
                    ? 'Không giới hạn'
                    : `${formatTokens(workspaceUsage.aiTokens.quota)}`}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-[10px] font-medium rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-mono shrink-0'>
                  Chưa cấp quota
                </span>
              )}
            </div>

            {workspaceUsage?.aiTokens ? (
              <div className='space-y-2'>
                {workspaceUsage.aiTokens.isUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span>Token AI không giới hạn</span>
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
                <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                  <span>
                    {workspaceUsage.aiTokens.isUnlimited
                      ? 'Token theo tháng'
                      : `Đã dùng ${workspaceUsage.aiTokens.percentUsed ?? 0}%`}
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      workspaceUsage.aiEnabled ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage.aiEnabled ? '● AI Đang bật' : '○ AI Đã tắt'}
                  </span>
                </div>
              </div>
            ) : (
              <div className='pt-1 text-xs leading-relaxed text-stone-500 italic'>
                Liên hệ Admin để cấu hình quota AI Studio
              </div>
            )}
          </div>

          {/* 3. AI Image Generation Meter */}
          <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                <ImageIcon className='w-4 h-4 text-purple-500 shrink-0' />
                <span>Hạn Mức Sinh Ảnh AI</span>
              </div>
              {workspaceUsage?.images ? (
                <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                  {workspaceUsage.images.used.toLocaleString()} /{' '}
                  {workspaceUsage.images.isUnlimited
                    ? 'Không giới hạn'
                    : `${workspaceUsage.images.quota.toLocaleString()} ảnh`}
                </div>
              ) : (
                <span className='whitespace-nowrap px-2 py-0.5 text-[10px] font-medium rounded-full text-purple-700 bg-purple-50 border border-purple-200 font-mono shrink-0'>
                  Chưa cấp quota
                </span>
              )}
            </div>

            {workspaceUsage?.images ? (
              <div className='space-y-2'>
                {workspaceUsage.images.isUnlimited ? (
                  <div className='flex items-center gap-1.5 text-xs text-purple-600 font-medium py-0.5'>
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span>Sinh ảnh không giới hạn</span>
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
                <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                  <span>
                    {workspaceUsage.images.isUnlimited
                      ? 'Ảnh không giới hạn'
                      : `Đã dùng ${workspaceUsage.images.percentUsed ?? 0}%`}
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      workspaceUsage.aiEnabled ? 'text-purple-600' : 'text-stone-400'
                    }`}
                  >
                    {workspaceUsage.aiEnabled ? '● Đang kích hoạt' : '○ AI Đã tắt'}
                  </span>
                </div>
              </div>
            ) : (
              <div className='space-y-1 pt-1'>
                <p className='text-xs leading-relaxed text-stone-500 italic'>
                  Pipeline sinh ảnh AI chưa bật (đã dùng: 0).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
