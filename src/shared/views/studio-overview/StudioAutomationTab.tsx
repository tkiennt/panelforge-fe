import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  workspaceService,
  type AutoAssignMode,
  type AutomationSettingsDto,
} from '@/services/workspace.service';
import { useTranslation } from '@/lib/i18n';

export interface StudioAutomationTabProps {
  workspaceId?: string;
  canEdit: boolean;
  onShowToast?: (title: string, desc: string) => void;
  onBackToSeries?: () => void;
}

export const StudioAutomationTab: React.FC<StudioAutomationTabProps> = ({
  workspaceId,
  canEdit,
  onShowToast,
  onBackToSeries,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const [autoNextStage, setAutoNextStage] = useState(false);
  const [assignMode, setAssignMode] = useState<AutoAssignMode>('KeepPageOwner');
  const [autoRouteReview, setAutoRouteReview] = useState(false);
  const [leadHoursInput, setLeadHoursInput] = useState('24');
  const [escalationHoursInput, setEscalationHoursInput] = useState('');
  const [rowVersion, setRowVersion] = useState<number | null>(null);

  const applySettings = useCallback((dto: AutomationSettingsDto) => {
    setAutoNextStage(Boolean(dto.autoNextStage));
    setAssignMode(dto.assignMode === 'BalanceOnly' ? 'BalanceOnly' : 'KeepPageOwner');
    setAutoRouteReview(Boolean(dto.autoRouteReview));
    setLeadHoursInput(String(dto.leadHours ?? 24));
    setEscalationHoursInput(
      dto.escalationHours === null || dto.escalationHours === undefined
        ? ''
        : String(dto.escalationHours),
    );
    setRowVersion(dto.rowVersion ?? null);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setIsConflict(false);
    try {
      const dto = await workspaceService.getAutomationSettings(workspaceId);
      applySettings(dto);
    } catch (err: any) {
      setLoadError(err?.message || t('workspace.automationTab.loadErrorFallback'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, applySettings, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const clearFeedback = () => {
    if (saveError && !isConflict) setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !workspaceId || saving) return;

    const parsedLead = Number(leadHoursInput.trim());
    if (!Number.isInteger(parsedLead) || parsedLead < 1 || parsedLead > 168) {
      setIsConflict(false);
      setSaveError(t('workspace.automationTab.validationLeadHours'));
      return;
    }

    const trimmedEscalation = escalationHoursInput.trim();
    let parsedEscalation: number | null = null;
    if (trimmedEscalation !== '') {
      const num = Number(trimmedEscalation);
      if (!Number.isInteger(num) || num < 1 || num > 168) {
        setIsConflict(false);
        setSaveError(t('workspace.automationTab.validationEscalationHours'));
        return;
      }
      parsedEscalation = num;
    }

    setSaving(true);
    setSaveError(null);
    setIsConflict(false);
    try {
      const updated = await workspaceService.updateAutomationSettings(workspaceId, {
        autoNextStage,
        assignMode,
        autoRouteReview,
        leadHours: parsedLead,
        escalationHours: parsedEscalation,
        rowVersion,
      });
      applySettings(updated);
      onShowToast?.(
        t('workspace.automationTab.saveSuccessTitle'),
        t('workspace.automationTab.saveSuccessDesc'),
      );
    } catch (err: any) {
      const conflict = err?.status === 409 || String(err?.code || '').toLowerCase() === 'conflict';
      setIsConflict(conflict);
      const msg = conflict
        ? t('workspace.automationTab.conflictMessage')
        : err?.message || t('workspace.automationTab.saveErrorFallback');
      setSaveError(msg);
      if (!conflict) {
        onShowToast?.(t('workspace.automationTab.saveErrorTitle'), msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const controlsDisabled = !canEdit || loading || saving;

  return (
    <div
      role='tabpanel'
      id='tabpanel-automation'
      aria-labelledby='tab-automation'
      data-testid='studio-automation-tab'
      className='flex flex-col gap-5 max-w-3xl animate-in fade-in duration-200'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          {onBackToSeries && (
            <button
              type='button'
              onClick={onBackToSeries}
              className='mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer'
            >
              <ArrowLeft className='w-3.5 h-3.5' />
              <span>{t('workspace.automationTab.backToSeries')}</span>
            </button>
          )}
          <div className='flex items-center gap-2.5'>
            <Sparkles className='w-5 h-5 text-orange-600' />
            <h2 className='text-xl font-bold text-stone-900'>
              {t('workspace.automationTab.title')}
            </h2>
            {!canEdit && (
              <span
                data-testid='automation-readonly-badge'
                className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700'
              >
                <Lock className='w-3 h-3 text-stone-500' />
                <span>{t('workspace.automationTab.readOnlyBadge')}</span>
              </span>
            )}
          </div>
          <p className='text-xs text-stone-500 mt-1'>{t('workspace.automationTab.subtitle')}</p>
        </div>
      </div>

      {!canEdit && (
        <div className='flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-100/70 px-4 py-2.5 text-xs text-stone-700'>
          <Lock className='w-3.5 h-3.5 text-stone-500 shrink-0' />
          <span>{t('workspace.automationTab.readOnlyHint')}</span>
        </div>
      )}

      {loadError && (
        <div
          role='alert'
          data-testid='automation-load-error'
          className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800'
        >
          <div className='flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
            <span>{loadError}</span>
          </div>
          <button
            type='button'
            onClick={() => void loadSettings()}
            className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 cursor-pointer'
          >
            <RefreshCw className='w-3.5 h-3.5' />
            <span>{t('workspace.automationTab.retryBtn')}</span>
          </button>
        </div>
      )}

      {saveError && (
        <div
          role='alert'
          data-testid='automation-save-error'
          className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800'
        >
          <div className='flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
            <span>{saveError}</span>
          </div>
          {isConflict && (
            <button
              type='button'
              data-testid='automation-reload-btn'
              disabled={loading}
              onClick={() => void loadSettings()}
              className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 disabled:opacity-50 cursor-pointer'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('workspace.automationTab.reloadBtn')}</span>
            </button>
          )}
        </div>
      )}

      {loading && !loadError ? (
        <div className='bg-white border border-stone-200 rounded-xl p-10 text-center text-xs text-stone-500 shadow-xs'>
          <Loader2 className='w-5 h-5 animate-spin text-orange-600 mx-auto mb-2' />
          <span>{t('workspace.automationTab.loading')}</span>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} className='space-y-4'>
          {/* R1: Tự giao công đoạn kế tiếp + assignMode */}
          <div className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4'>
            <label className='flex items-start justify-between gap-4 cursor-pointer'>
              <div className='space-y-0.5'>
                <span className='text-sm font-semibold text-stone-900'>
                  {t('workspace.automationTab.autoNextStageLabel')}
                </span>
                <p className='text-xs text-stone-500'>
                  {t('workspace.automationTab.autoNextStageDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                role='switch'
                aria-label={t('workspace.automationTab.autoNextStageLabel')}
                checked={autoNextStage}
                disabled={controlsDisabled}
                onChange={(e) => {
                  clearFeedback();
                  setAutoNextStage(e.target.checked);
                }}
                className='h-5 w-5 accent-orange-600 shrink-0 mt-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
              />
            </label>

            <div className='pt-3 border-t border-stone-100 space-y-2'>
              <div className='text-xs font-semibold text-stone-800'>
                {t('workspace.automationTab.assignModeLabel')}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {(
                  [
                    [
                      'KeepPageOwner',
                      t('workspace.automationTab.modeKeepPageOwner'),
                      t('workspace.automationTab.modeKeepPageOwnerDesc'),
                    ],
                    [
                      'BalanceOnly',
                      t('workspace.automationTab.modeBalanceOnly'),
                      t('workspace.automationTab.modeBalanceOnlyDesc'),
                    ],
                  ] as const
                ).map(([mode, title, desc]) => {
                  const selected = assignMode === mode;
                  return (
                    <label
                      key={mode}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                        selected
                          ? 'border-orange-500 bg-orange-50/50'
                          : 'border-stone-200 bg-stone-50/50'
                      } ${controlsDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-stone-300'}`}
                    >
                      <input
                        type='radio'
                        name='assignMode'
                        value={mode}
                        aria-label={title}
                        aria-describedby={`assign-mode-desc-${mode}`}
                        checked={selected}
                        disabled={controlsDisabled}
                        onChange={() => {
                          clearFeedback();
                          setAssignMode(mode);
                        }}
                        className='mt-0.5 accent-orange-600 disabled:cursor-not-allowed'
                      />
                      <div className='space-y-0.5'>
                        <div className='font-semibold text-stone-900'>{title}</div>
                        <div
                          id={`assign-mode-desc-${mode}`}
                          className='text-stone-500 leading-relaxed'
                        >
                          {desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* R2: Gợi ý người duyệt */}
          <div className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs'>
            <label className='flex items-start justify-between gap-4 cursor-pointer'>
              <div className='space-y-0.5'>
                <span className='text-sm font-semibold text-stone-900'>
                  {t('workspace.automationTab.autoRouteReviewLabel')}
                </span>
                <p className='text-xs text-stone-500'>
                  {t('workspace.automationTab.autoRouteReviewDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                role='switch'
                aria-label={t('workspace.automationTab.autoRouteReviewLabel')}
                checked={autoRouteReview}
                disabled={controlsDisabled}
                onChange={(e) => {
                  clearFeedback();
                  setAutoRouteReview(e.target.checked);
                }}
                className='h-5 w-5 accent-orange-600 shrink-0 mt-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
              />
            </label>
          </div>

          {/* R3: Nhắc hạn & leo thang */}
          <div className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold text-stone-900'>
              <Clock className='w-4 h-4 text-orange-600' />
              <span>{t('workspace.automationTab.remindersHeading')}</span>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label
                  htmlFor='automation-lead-hours'
                  className='block text-xs font-semibold text-stone-800 mb-1'
                >
                  {t('workspace.automationTab.leadHoursLabel')}
                </label>
                <input
                  id='automation-lead-hours'
                  type='number'
                  min={1}
                  max={168}
                  step={1}
                  value={leadHoursInput}
                  disabled={controlsDisabled}
                  onChange={(e) => {
                    clearFeedback();
                    setLeadHoursInput(e.target.value);
                  }}
                  className='w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed'
                />
                <p className='mt-1 text-[11px] text-stone-500'>
                  {t('workspace.automationTab.leadHoursHint')}
                </p>
              </div>

              <div>
                <label
                  htmlFor='automation-escalation-hours'
                  className='block text-xs font-semibold text-stone-800 mb-1'
                >
                  {t('workspace.automationTab.escalationHoursLabel')}
                </label>
                <input
                  id='automation-escalation-hours'
                  type='number'
                  min={1}
                  max={168}
                  step={1}
                  placeholder={t('workspace.automationTab.escalationHoursPlaceholder')}
                  value={escalationHoursInput}
                  disabled={controlsDisabled}
                  onChange={(e) => {
                    clearFeedback();
                    setEscalationHoursInput(e.target.value);
                  }}
                  className='w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed'
                />
                <p className='mt-1 text-[11px] text-stone-500'>
                  {t('workspace.automationTab.escalationHoursHint')}
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-end gap-3 pt-1'>
            <button
              type='submit'
              data-testid='automation-save-btn'
              disabled={controlsDisabled}
              className='inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
              <span>
                {saving
                  ? t('workspace.automationTab.savingBtn')
                  : t('workspace.automationTab.saveBtn')}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
