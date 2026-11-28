import React from 'react';
import { X, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { WorkspaceDto } from '@/services/workspace.service';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

export interface WorkspaceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: WorkspaceDto | null;
  filterEntity: string;
  onFilterEntityChange: (val: string) => void;
  onSearch: () => void;
  loading: boolean;
  logs: any[];
}

export const WorkspaceAuditModal: React.FC<WorkspaceAuditModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  filterEntity,
  onFilterEntityChange,
  onSearch,
  loading,
  logs,
}) => {
  const { t, lang } = useTranslation();
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='xl'
      title={t('workspace.auditModal.title')}
    >
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div>
            <div className='flex items-center gap-2 mb-0.5'>
              <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-xs font-bold'>
                PRODUCER // AUDIT TRAIL
              </span>
              <span className='text-xs text-[#888888] font-mono'>BR-18 Provenance Guarantee</span>
            </div>
            <h3 className='text-sm font-bold text-[#171717]'>
              {t('workspace.auditModal.heading', { name: activeWorkspace?.name || '' })}
            </h3>
          </div>
          <button onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Filter */}
        <div className='flex items-center gap-3 text-xs'>
          <input
            type='text'
            placeholder={t('workspace.auditModal.filterPlaceholder')}
            value={filterEntity}
            onChange={(e) => onFilterEntityChange(e.target.value)}
            className='px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs w-64 focus:outline-none focus:border-[#F97316]'
          />
          <button
            onClick={onSearch}
            className='px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] hover:bg-[#F3F1EB] font-semibold flex items-center gap-1.5 cursor-pointer'
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('common.actions.search')}</span>
          </button>
        </div>

        {/* Audit Logs Table */}
        <div className='overflow-y-auto flex-1 border border-[#E7E7E7] rounded-xl text-xs'>
          <table className='w-full text-left'>
            <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-xs text-[#737373] sticky top-0'>
              <tr>
                <th className='py-2.5 px-3'>{t('workspace.auditModal.colAction')}</th>
                <th className='py-2.5 px-3'>{t('workspace.auditModal.colEntity')}</th>
                <th className='py-2.5 px-3'>{t('workspace.auditModal.colActor')}</th>
                <th className='py-2.5 px-3'>{t('workspace.auditModal.colTime')}</th>
                <th className='py-2.5 px-3'>{t('workspace.auditModal.colDetails')}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {loading ? (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-[#888888]'>
                    <RefreshCw className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                    <span>{t('workspace.auditModal.loading')}</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-[#888888]'>
                    {t('workspace.auditModal.empty')}
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className='hover:bg-[#FAF8F5]'>
                    <td className='py-2.5 px-3 font-mono font-semibold text-[#171717]'>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
                          log.action?.includes('CREATE')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action?.includes('DELETE')
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className='py-2.5 px-3 font-mono text-xs text-[#555555]'>
                      {log.entityName} {log.entityId ? `#${log.entityId.substring(0, 6)}` : ''}
                    </td>
                    <td className='py-2.5 px-3 text-[#555555]'>
                      {log.userEmail || log.userId || t('workspace.auditModal.systemActor')}
                    </td>
                    <td className='py-2.5 px-3 font-mono text-xs text-[#888888] whitespace-nowrap'>
                      {new Date(log.createdAtUtc).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
                    </td>
                    <td className='py-2.5 px-3 font-mono text-xs text-[#737373] max-w-xs truncate'>
                      {log.changesJson || log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export interface EditMemberAccessModalProps {
  member: any;
  onClose: () => void;
  role: string;
  onRoleChange: (r: string) => void;
  onSave: () => void;
  error?: string | null;
  saving?: boolean;
}

const EDITABLE_ROLES = ['PRODUCER', 'WRITER', 'ARTIST', 'LETTERER', 'EDITOR'] as const;
const ROLE_LABEL_KEY: Record<(typeof EDITABLE_ROLES)[number], string> = {
  PRODUCER: 'members.crewTab.roleProducer',
  WRITER: 'members.crewTab.roleWriter',
  ARTIST: 'members.crewTab.roleArtist',
  LETTERER: 'members.crewTab.roleLetterer',
  EDITOR: 'members.crewTab.roleEditor',
};

export const EditMemberAccessModal: React.FC<EditMemberAccessModalProps> = ({
  member,
  onClose,
  role,
  onRoleChange,
  onSave,
  error,
  saving = false,
}) => {
  const { t } = useTranslation();
  if (!member) return null;
  const memberName = member.fullName || member.name || member.email;

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      closeLabel={t('members.crewTab.editAccess.cancel')}
      size='md'
      dismissible={!saving}
      title={t('members.crewTab.editAccess.title', { name: memberName })}
      description={t('members.crewTab.editAccess.description')}
      footer={
        <div className='flex items-center justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            disabled={saving}
            className='focus-ring min-h-9 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 cursor-pointer'
          >
            {t('members.crewTab.editAccess.cancel')}
          </button>
          <button
            type='button'
            onClick={onSave}
            disabled={saving}
            data-testid='edit-member-role-save'
            className='focus-ring min-h-9 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-orange-700 disabled:opacity-50 cursor-pointer'
          >
            {saving ? t('members.crewTab.editAccess.saving') : t('members.crewTab.editAccess.save')}
          </button>
        </div>
      }
    >
      <div className='space-y-4'>
        {error && (
          <div
            role='alert'
            data-testid='edit-member-role-error'
            className='flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700'
          >
            <AlertTriangle className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
            <span>{error}</span>
          </div>
        )}

        <fieldset>
          <legend className='mb-2 text-xs font-semibold text-stone-600'>
            {t('members.crewTab.editAccess.roleLabel')}
          </legend>
          <div className='grid gap-2 sm:grid-cols-2'>
            {EDITABLE_ROLES.map((roleKey) => {
              const isSelected = role.toUpperCase() === roleKey;
              return (
                <label
                  key={roleKey}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-studio has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-300 ${
                    isSelected
                      ? 'border-orange-300 bg-accent-soft'
                      : 'border-stone-200 bg-white hover:border-head-line hover:bg-stone-50'
                  }`}
                >
                  <input
                    type='radio'
                    name='memberRole'
                    value={roleKey}
                    checked={isSelected}
                    onChange={() => onRoleChange(roleKey)}
                    className='mt-0.5 accent-orange-600'
                  />
                  <span className='min-w-0'>
                    <span
                      className={`block text-sm font-semibold ${isSelected ? 'text-accent-dark' : 'text-stone-900'}`}
                    >
                      {t(ROLE_LABEL_KEY[roleKey])}
                    </span>
                    <span className='mt-0.5 block text-xs text-stone-500'>
                      {t(`members.crewTab.editAccess.hints.${roleKey}`)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};
