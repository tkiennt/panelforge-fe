// src/roles/writer/components/script/flow/comic-editor/versioning/VersionHistoryDrawer.tsx
import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  History,
  GitCompare,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { ScriptVersion } from './types';
import { Drawer } from '@/shared/ui';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ScriptVersion[];
  currentVersionId: string;
  onViewVersion: (version: ScriptVersion) => void;
  onCompareVersion: (version: ScriptVersion) => void;
  onRestoreVersion: (version: ScriptVersion) => void;
  canRestore?: boolean;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersionId,
  onViewVersion,
  onCompareVersion,
  onRestoreVersion,
  canRestore = true,
}) => {
  const { lang, t } = useTranslation('writer');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sắp xếp phiên bản mới nhất ở trên cùng
  const sortedVersions = [...versions].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getStatusBadge = (version: ScriptVersion) => {
    switch (version.status) {
      case 'APPROVED':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'>
            <ShieldCheck className='w-3 h-3 text-emerald-600' />
            {t('comicEditor.versioning.statusApproved')}
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300'>
            <Clock className='w-3 h-3 text-blue-600' />
            {t('comicEditor.versioning.statusInReview')}
          </span>
        );
      case 'DRAFT':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300'>
            <FileText className='w-3 h-3 text-amber-600' />
            {t('comicEditor.versioning.statusDraft')}
          </span>
        );
      case 'DEPRECATED':
      default:
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300'>
            {t('comicEditor.versioning.statusDeprecated')}
          </span>
        );
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      closeLabel={t('comicEditor.versioning.drawerClose')}
      title={t('comicEditor.versioning.drawerTitle')}
      footer={
        <div className='flex items-center justify-between text-xs text-slate-500'>
          <span>{t('comicEditor.versioning.savedCount', { count: versions.length })}</span>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs'
          >
            {t('comicEditor.versioning.drawerClose')}
          </button>
        </div>
      }
    >
      <p className='border-b border-[#EBE7DF] px-6 py-3 text-xs text-slate-500'>
        {t('comicEditor.versioning.drawerSubtitle')}
      </p>
      {/* VERSION LIST */}
      <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F3F0E9]'>
        {sortedVersions.length === 0 ? (
          <div className='text-center py-12 text-slate-400'>
            <History className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>{t('comicEditor.versioning.emptyHistory')}</p>
          </div>
        ) : (
          sortedVersions.map((version) => {
            const isCurrent = version.id === currentVersionId;
            const isConfirming = confirmRestoreId === version.id;

            return (
              <div
                key={version.id}
                className={`bg-white rounded-xl border p-4 transition-all shadow-sm flex flex-col gap-3 ${
                  isCurrent
                    ? 'border-[#C2410C] ring-2 ring-[#C2410C]/20'
                    : 'border-[#E5E0D8] hover:border-slate-300'
                }`}
              >
                {/* Top card info */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-base font-black font-mono text-slate-900'>
                      v{version.versionNumber}
                    </span>
                    {getStatusBadge(version)}
                    {isCurrent && (
                      <span className='text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-[#C2410C] border border-[#C2410C]/30 px-1.5 py-0.5 rounded'>
                        {t('comicEditor.versioning.currentBadge')}
                      </span>
                    )}
                  </div>
                  <span className='text-xs text-stone-500 font-mono'>
                    {new Date(version.createdAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Authors & Lock status */}
                <div className='flex items-center gap-3 text-xs text-slate-500 flex-wrap'>
                  <div className='flex items-center gap-1'>
                    <User className='w-3.5 h-3.5 text-slate-400' />
                    <span>
                      {t('comicEditor.versioning.authorLabel', {
                        author: version.createdBy || t('comicEditor.versioning.defaultAuthor'),
                      })}
                    </span>
                  </div>
                  {version.approvedBy && (
                    <div className='flex items-center gap-1 text-emerald-700'>
                      <ShieldCheck className='w-3.5 h-3.5' />
                      <span>
                        {t('comicEditor.versioning.approvedByLabel', {
                          approver: version.approvedBy,
                        })}
                      </span>
                    </div>
                  )}
                  {version.isLocked && (
                    <div className='flex items-center gap-1 text-slate-600 font-medium'>
                      <Lock className='w-3 h-3' />
                      <span>{t('comicEditor.versioning.lockedForProduction')}</span>
                    </div>
                  )}
                </div>

                {/* Feedback / Changelog */}
                {version.changeLog && (
                  <div className='bg-[#FFF9F3] border border-[#FDBA74]/50 rounded-lg p-2.5 text-xs text-amber-950 flex items-start gap-2'>
                    <AlertCircle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                    <div className='flex-1'>
                      <span className='font-bold text-amber-900'>
                        {t('comicEditor.versioning.feedbackNotesLabel')}
                      </span>
                      <span>{version.changeLog}</span>
                    </div>
                  </div>
                )}

                {/* Preview lines count */}
                <div className='text-[11px] text-slate-400 font-mono'>
                  {t('comicEditor.versioning.scriptLength', {
                    chars: version.rawText.length,
                    lines: version.rawText.split('\n').filter(Boolean).length,
                  })}
                </div>

                {/* Actions */}
                <div className='pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap'>
                  <div className='flex items-center gap-2'>
                    {/* Xem bản này */}
                    <button
                      type='button'
                      onClick={() => onViewVersion(version)}
                      className='inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                      title={t('comicEditor.versioning.viewVersionTooltip')}
                    >
                      <Eye className='w-3.5 h-3.5' />
                      <span>{t('comicEditor.versioning.viewVersion')}</span>
                    </button>

                    {/* So sánh với bản hiện tại */}
                    {!isCurrent && (
                      <button
                        type='button'
                        onClick={() => onCompareVersion(version)}
                        className='inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                        title={t('comicEditor.versioning.compareVersionTooltip')}
                      >
                        <GitCompare className='w-3.5 h-3.5' />
                        <span>{t('comicEditor.versioning.compareVersion')}</span>
                      </button>
                    )}
                  </div>

                  {/* Khôi phục bản này */}
                  {!isCurrent && canRestore && (
                    <div>
                      {isConfirming ? (
                        <div className='flex items-center gap-1 animate-in fade-in'>
                          <button
                            type='button'
                            onClick={() => {
                              onRestoreVersion(version);
                              setConfirmRestoreId(null);
                            }}
                            className='px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer'
                          >
                            {t('comicEditor.versioning.confirmRestore')}
                          </button>
                          <button
                            type='button'
                            onClick={() => setConfirmRestoreId(null)}
                            className='px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer'
                          >
                            {t('comicEditor.versioning.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setConfirmRestoreId(version.id)}
                          className='inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                          title={t('comicEditor.versioning.restoreTooltip')}
                        >
                          <RotateCcw className='w-3.5 h-3.5' />
                          <span>{t('comicEditor.versioning.restoreVersion')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
};
