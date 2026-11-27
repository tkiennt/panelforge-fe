import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  workspaceService,
  type AutoAssignMode,
  type AutomationActivityDto,
  type AutomationActivityItemDto,
  type AutomationSettingsDto,
} from '@/services/workspace.service';
import { formatPageRangeLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { formatRelativeTime } from '@/lib/format';
import { useTranslation } from '@/lib/i18n';

export interface StudioAutomationTabProps {
  workspaceId?: string;
  canEdit: boolean;
  onShowToast?: (title: string, desc: string) => void;
  onBackToSeries?: () => void;
}

interface SavedRuleSnapshot {
  autoNextStage: boolean;
  assignMode: AutoAssignMode;
  autoRouteReview: boolean;
  leadHours: number;
  escalationHours: number | null;
}

const RECENT_ACTIVITY_TAKE = 20;
const QUICK_HOUR_OPTIONS = [12, 24, 48, 72] as const;

interface PillSwitchProps {
  checked: boolean;
  disabled: boolean;
  ariaLabel: string;
  onLabel: string;
  offLabel: string;
  onChange: (checked: boolean) => void;
  testId?: string;
}

const PillSwitch: React.FC<PillSwitchProps> = ({
  checked,
  disabled,
  ariaLabel,
  onLabel,
  offLabel,
  onChange,
  testId,
}) => (
  <span className='inline-flex items-center gap-2 shrink-0 min-h-9'>
    <span
      aria-hidden='true'
      className={`text-xs font-semibold tabular-nums ${
        checked ? 'text-orange-700' : 'text-stone-500'
      }`}
    >
      {checked ? onLabel : offLabel}
    </span>
    <span className='relative inline-flex items-center'>
      <input
        type='checkbox'
        role='switch'
        data-testid={testId}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className='sr-only peer'
      />
      <span
        aria-hidden='true'
        className={`w-11 h-6 rounded-full transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40 ${
          checked ? 'bg-orange-600' : 'bg-stone-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      />
      <span
        aria-hidden='true'
        className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  </span>
);

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

  const [savedSettings, setSavedSettings] = useState<SavedRuleSnapshot>({
    autoNextStage: false,
    assignMode: 'KeepPageOwner',
    autoRouteReview: false,
    leadHours: 24,
    escalationHours: null,
  });

  const [activity, setActivity] = useState<AutomationActivityDto | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const applySettings = useCallback((dto: AutomationSettingsDto) => {
    const normalizedAutoNext = Boolean(dto.autoNextStage);
    const normalizedMode: AutoAssignMode =
      dto.assignMode === 'BalanceOnly' ? 'BalanceOnly' : 'KeepPageOwner';
    const normalizedAutoReview = Boolean(dto.autoRouteReview);
    const normalizedLead = dto.leadHours ?? 24;
    const normalizedEscalation =
      dto.escalationHours === null || dto.escalationHours === undefined
        ? null
        : dto.escalationHours;

    setAutoNextStage(normalizedAutoNext);
    setAssignMode(normalizedMode);
    setAutoRouteReview(normalizedAutoReview);
    setLeadHoursInput(String(normalizedLead));
    setEscalationHoursInput(normalizedEscalation === null ? '' : String(normalizedEscalation));
    setRowVersion(dto.rowVersion ?? null);
    setSavedSettings({
      autoNextStage: normalizedAutoNext,
      assignMode: normalizedMode,
      autoRouteReview: normalizedAutoReview,
      leadHours: normalizedLead,
      escalationHours: normalizedEscalation,
    });
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

  const loadActivity = useCallback(async () => {
    if (!workspaceId) return;
    setActivityLoading(true);
    setActivityError(null);
    try {
      const dto = await workspaceService.getAutomationActivity(workspaceId, RECENT_ACTIVITY_TAKE);
      setActivity(dto);
    } catch (err: any) {
      setActivityError(err?.message || t('workspace.automationTab.activityLoadErrorFallback'));
    } finally {
      setActivityLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

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
  const escalationEnabled = escalationHoursInput.trim() !== '';

  const draftEscalationNormalized =
    escalationHoursInput.trim() === '' ? null : Number(escalationHoursInput.trim());
  const isDirty =
    autoNextStage !== savedSettings.autoNextStage ||
    assignMode !== savedSettings.assignMode ||
    autoRouteReview !== savedSettings.autoRouteReview ||
    leadHoursInput.trim() !== String(savedSettings.leadHours) ||
    draftEscalationNormalized !== savedSettings.escalationHours;

  const formatHoursHuman = (rawInput: string): string | null => {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;
    const hours = Number(trimmed);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) return null;
    if (hours < 24) {
      return t('workspace.automationTab.durationHoursOnly', { hours });
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0) {
      return t('workspace.automationTab.durationExactDays', { days });
    }
    return t('workspace.automationTab.durationDaysAndHours', { days, hours: remHours });
  };

  const leadDurationPreview = formatHoursHuman(leadHoursInput);
  const escalationDurationPreview = formatHoursHuman(escalationHoursInput);

  const handleApplyRecommendedPreset = () => {
    if (controlsDisabled) return;
    clearFeedback();
    setAutoNextStage(true);
    setAssignMode('KeepPageOwner');
    setAutoRouteReview(true);
    setLeadHoursInput('24');
    setEscalationHoursInput('24');
  };

  const handleResetDraft = () => {
    if (controlsDisabled) return;
    setSaveError(null);
    setIsConflict(false);
    setAutoNextStage(savedSettings.autoNextStage);
    setAssignMode(savedSettings.assignMode);
    setAutoRouteReview(savedSettings.autoRouteReview);
    setLeadHoursInput(String(savedSettings.leadHours));
    setEscalationHoursInput(
      savedSettings.escalationHours === null ? '' : String(savedSettings.escalationHours),
    );
  };

  const savedModeLabel =
    savedSettings.assignMode === 'BalanceOnly'
      ? t('workspace.automationTab.modeBalanceOnly')
      : t('workspace.automationTab.modeKeepPageOwner');

  const ruleStatuses = [
    {
      id: 'r1',
      label: t('workspace.automationTab.ruleR1Label'),
      enabled: savedSettings.autoNextStage,
      badge: savedSettings.autoNextStage
        ? t('workspace.automationTab.ruleOnWithDetail', { detail: savedModeLabel })
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r2',
      label: t('workspace.automationTab.ruleR2Label'),
      enabled: savedSettings.autoRouteReview,
      badge: savedSettings.autoRouteReview
        ? t('workspace.automationTab.ruleOn')
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r3',
      label: t('workspace.automationTab.ruleR3Label'),
      enabled: savedSettings.escalationHours !== null,
      badge:
        savedSettings.escalationHours !== null
          ? t('workspace.automationTab.ruleOnWithDetail', {
              detail: t('workspace.automationTab.ruleR3HoursDetail', {
                hours: savedSettings.escalationHours,
              }),
            })
          : t('workspace.automationTab.ruleOff'),
    },
  ];

  const activitySummary = activity?.last7Days ?? { autoAssigned: 0, skipped: 0, escalated: 0 };
  const activityItems = activity?.items ?? [];

  const renderActivitySummaryLine = (item: AutomationActivityItemDto) => {
    const chapterLabel = t('workspace.automationTab.activityChapter', {
      number: item.chapterNumber,
    });
    if (item.kind === 'AutoAssigned') {
      const pageLabel =
        item.pageNumbers && item.pageNumbers.length > 0
          ? formatPageRangeLabel(item.pageNumbers)
          : null;
      const parts = [
        chapterLabel,
        item.stageName,
        pageLabel,
        item.assigneeName,
        item.reason,
      ].filter((part): part is string => Boolean(part && part.trim()));
      return {
        icon: '✅',
        primary: parts.join(' · '),
        secondary: [item.seriesTitle, formatRelativeTime(item.occurredAt)]
          .filter(Boolean)
          .join(' · '),
      };
    }
    if (item.kind === 'Escalated') {
      return {
        icon: '⏰',
        primary: item.reason || chapterLabel,
        secondary: [item.seriesTitle, chapterLabel, formatRelativeTime(item.occurredAt)]
          .filter(Boolean)
          .join(' · '),
      };
    }
    return {
      icon: '⚠️',
      primary: item.reason || chapterLabel,
      secondary: [item.seriesTitle, chapterLabel, formatRelativeTime(item.occurredAt)]
        .filter(Boolean)
        .join(' · '),
    };
  };

  return (
    <div
      role='tabpanel'
      id='tabpanel-automation'
      aria-labelledby='tab-automation'
      data-testid='studio-automation-tab'
      className='flex flex-col gap-5 animate-in fade-in duration-200'
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

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'>
        <div className='lg:col-span-7 flex flex-col gap-4'>
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
              {canEdit && (
                <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200/80 bg-orange-50/50 px-4 py-3 text-xs'>
                  <div className='flex items-center gap-2 text-stone-700'>
                    <Wand2 className='w-4 h-4 text-orange-600 shrink-0' />
                    <span>{t('workspace.automationTab.recommendedPresetDesc')}</span>
                  </div>
                  <button
                    type='button'
                    data-testid='automation-recommended-preset-btn'
                    disabled={controlsDisabled}
                    onClick={handleApplyRecommendedPreset}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white hover:bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-orange-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
                  >
                    <Sparkles className='w-3.5 h-3.5 text-orange-600' />
                    <span>{t('workspace.automationTab.recommendedPresetBtn')}</span>
                  </button>
                </div>
              )}

              {/* R1: Tự giao công đoạn kế tiếp + assignMode */}
              <div className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4'>
                <label
                  className={`flex items-start justify-between gap-4 ${
                    controlsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className='space-y-1.5'>
                    <span className='text-sm font-semibold text-stone-900 block'>
                      {t('workspace.automationTab.autoNextStageLabel')}
                    </span>
                    <p className='text-xs text-stone-600 leading-relaxed'>
                      {t('workspace.automationTab.autoNextStageDesc')}
                    </p>
                    <p className='text-[11px] text-stone-500 italic bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5'>
                      {t('workspace.automationTab.autoNextStageExample')}
                    </p>
                  </div>
                  <PillSwitch
                    checked={autoNextStage}
                    disabled={controlsDisabled}
                    ariaLabel={t('workspace.automationTab.autoNextStageLabel')}
                    onLabel={t('workspace.automationTab.switchOn')}
                    offLabel={t('workspace.automationTab.switchOff')}
                    onChange={(checked) => {
                      clearFeedback();
                      setAutoNextStage(checked);
                    }}
                  />
                </label>

                <div
                  className={`pt-3 border-t border-stone-100 space-y-2.5 transition-opacity duration-150 ${
                    autoNextStage ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='text-xs font-semibold text-stone-800'>
                      {t('workspace.automationTab.assignModeLabel')}
                    </div>
                    {!autoNextStage && (
                      <span className='inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-600'>
                        {t('workspace.automationTab.assignModeInactiveHint')}
                      </span>
                    )}
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
                      const activeSelected = selected && autoNextStage;
                      return (
                        <label
                          key={mode}
                          data-testid={`assign-mode-card-${mode}`}
                          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors duration-150 ${
                            activeSelected
                              ? 'border-orange-500 bg-orange-50/50'
                              : selected
                                ? 'border-stone-300 bg-stone-100/60'
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
                <label
                  className={`flex items-start justify-between gap-4 ${
                    controlsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className='space-y-1.5'>
                    <span className='text-sm font-semibold text-stone-900 block'>
                      {t('workspace.automationTab.autoRouteReviewLabel')}
                    </span>
                    <p className='text-xs text-stone-600 leading-relaxed'>
                      {t('workspace.automationTab.autoRouteReviewDesc')}
                    </p>
                    <p className='text-[11px] text-stone-500 italic bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5'>
                      {t('workspace.automationTab.autoRouteReviewExample')}
                    </p>
                  </div>
                  <PillSwitch
                    checked={autoRouteReview}
                    disabled={controlsDisabled}
                    ariaLabel={t('workspace.automationTab.autoRouteReviewLabel')}
                    onLabel={t('workspace.automationTab.switchOn')}
                    offLabel={t('workspace.automationTab.switchOff')}
                    onChange={(checked) => {
                      clearFeedback();
                      setAutoRouteReview(checked);
                    }}
                  />
                </label>
              </div>

              {/* R3: Nhắc hạn & báo trễ */}
              <div className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4'>
                <div className='flex items-center gap-2 text-sm font-semibold text-stone-900'>
                  <Clock className='w-4 h-4 text-orange-600' />
                  <span>{t('workspace.automationTab.remindersHeading')}</span>
                </div>

                <div className='rounded-lg border border-stone-200/80 bg-stone-50/50 p-3.5 space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <label
                      htmlFor='automation-lead-hours'
                      className='text-xs font-semibold text-stone-800'
                    >
                      {t('workspace.automationTab.leadHoursLabel')}
                    </label>
                    {leadDurationPreview && (
                      <span
                        data-testid='lead-duration-preview'
                        className='rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-semibold text-orange-700 tabular-nums'
                      >
                        {leadDurationPreview}
                      </span>
                    )}
                  </div>
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
                    className='w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 tabular-nums disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed'
                  />
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-[11px] text-stone-500'>
                      {t('workspace.automationTab.leadHoursHint')}
                    </p>
                    <div className='flex items-center gap-1'>
                      {QUICK_HOUR_OPTIONS.map((h) => {
                        const active = leadHoursInput.trim() === String(h);
                        return (
                          <button
                            key={h}
                            type='button'
                            disabled={controlsDisabled}
                            onClick={() => {
                              clearFeedback();
                              setLeadHoursInput(String(h));
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              active
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                            }`}
                          >
                            {t('workspace.automationTab.quickChipHours', { hours: h })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className='rounded-lg border border-stone-200/80 bg-stone-50/50 p-3.5 space-y-3'>
                  <label
                    className={`flex items-start justify-between gap-4 ${
                      controlsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className='space-y-0.5'>
                      <span className='text-xs font-semibold text-stone-900 block'>
                        {t('workspace.automationTab.escalationToggleLabel')}
                      </span>
                      <p className='text-[11px] text-stone-500 leading-relaxed'>
                        {t('workspace.automationTab.escalationToggleDesc')}
                      </p>
                    </div>
                    <PillSwitch
                      testId='automation-escalation-switch'
                      checked={escalationEnabled}
                      disabled={controlsDisabled}
                      ariaLabel={t('workspace.automationTab.escalationToggleLabel')}
                      onLabel={t('workspace.automationTab.switchOn')}
                      offLabel={t('workspace.automationTab.switchOff')}
                      onChange={(checked) => {
                        clearFeedback();
                        setEscalationHoursInput(checked ? '24' : '');
                      }}
                    />
                  </label>

                  <div
                    className={`pt-2.5 border-t border-stone-200/70 space-y-2 transition-opacity duration-150 ${
                      escalationEnabled ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <label
                        htmlFor='automation-escalation-hours'
                        className='text-xs font-semibold text-stone-800'
                      >
                        {t('workspace.automationTab.escalationHoursLabel')}
                      </label>
                      {escalationDurationPreview && (
                        <span
                          data-testid='escalation-duration-preview'
                          className='rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-semibold text-orange-700 tabular-nums'
                        >
                          {escalationDurationPreview}
                        </span>
                      )}
                    </div>
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
                      className='w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 tabular-nums placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed'
                    />
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-[11px] text-stone-500'>
                        {t('workspace.automationTab.escalationHoursHint')}
                      </p>
                      <div className='flex items-center gap-1'>
                        {QUICK_HOUR_OPTIONS.map((h) => {
                          const active = escalationHoursInput.trim() === String(h);
                          return (
                            <button
                              key={h}
                              type='button'
                              data-testid={`escalation-quick-chip-${h}`}
                              disabled={controlsDisabled}
                              onClick={() => {
                                clearFeedback();
                                setEscalationHoursInput(String(h));
                              }}
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                active
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                              }`}
                            >
                              {t('workspace.automationTab.quickChipHours', { hours: h })}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
                <div className='text-xs'>
                  {canEdit && isDirty ? (
                    <span
                      data-testid='automation-dirty-indicator'
                      className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-semibold text-amber-800'
                    >
                      <span className='w-1.5 h-1.5 rounded-full bg-amber-500' aria-hidden='true' />
                      <span>{t('workspace.automationTab.dirtyIndicator')}</span>
                    </span>
                  ) : (
                    <span className='text-stone-500'>
                      {t('workspace.automationTab.savedIndicator')}
                    </span>
                  )}
                </div>

                <div className='flex items-center gap-2.5 ml-auto'>
                  {canEdit && isDirty && (
                    <button
                      type='button'
                      data-testid='automation-reset-btn'
                      disabled={controlsDisabled}
                      onClick={handleResetDraft}
                      className='inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <RotateCcw className='w-3.5 h-3.5' />
                      <span>{t('workspace.automationTab.resetBtn')}</span>
                    </button>
                  )}

                  <button
                    type='submit'
                    data-testid='automation-save-btn'
                    disabled={controlsDisabled}
                    className='inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {saving ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Save className='w-4 h-4' />
                    )}
                    <span>
                      {saving
                        ? t('workspace.automationTab.savingBtn')
                        : t('workspace.automationTab.saveBtn')}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className='lg:col-span-5 flex flex-col gap-5'>
          {/* Khối 1: Cách hoạt động */}
          <section
            data-testid='automation-how-it-works'
            className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3.5'
          >
            <div className='flex items-center gap-2 text-sm font-semibold text-stone-900'>
              <Info className='w-4 h-4 text-orange-600 shrink-0' />
              <h3>{t('workspace.automationTab.howItWorksHeading')}</h3>
            </div>
            <p className='text-xs text-stone-600 leading-relaxed bg-stone-50 border border-stone-100 rounded-lg px-3.5 py-2.5'>
              {t('workspace.automationTab.howItWorksFlow')}
            </p>
            <div className='space-y-2 pt-1'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-stone-500'>
                {t('workspace.automationTab.savedRulesLabel')}
              </div>
              <div className='space-y-1.5'>
                {ruleStatuses.map((rule) => (
                  <div
                    key={rule.id}
                    data-testid={`automation-rule-status-${rule.id}`}
                    className='flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/70 px-3 py-2 text-xs'
                  >
                    <span className='font-medium text-stone-800'>{rule.label}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                        rule.enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rule.enabled ? 'bg-emerald-600' : 'bg-stone-400'
                        }`}
                        aria-hidden='true'
                      />
                      <span>{rule.badge}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className='text-[11px] text-stone-500'>
                {t('workspace.automationTab.leadReminderSummary', {
                  hours: savedSettings.leadHours,
                })}
              </p>
            </div>
          </section>

          {/* Khối 2: Hoạt động gần đây */}
          <section
            data-testid='automation-recent-activity'
            className='bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4'
          >
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 text-sm font-semibold text-stone-900'>
                <Activity className='w-4 h-4 text-orange-600 shrink-0' />
                <h3>{t('workspace.automationTab.activityHeading')}</h3>
              </div>
              <button
                type='button'
                onClick={() => void loadActivity()}
                disabled={activityLoading}
                aria-label={t('workspace.automationTab.activityRefreshAria')}
                className='inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white hover:bg-stone-50 p-1.5 text-stone-600 disabled:opacity-50 cursor-pointer'
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Hàng đầu: số đếm 7 ngày */}
            <div className='rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2.5 space-y-2'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-stone-500'>
                {t('workspace.automationTab.activityLast7Days')}
              </div>
              <div className='grid grid-cols-3 gap-2 text-xs'>
                <div
                  data-testid='automation-stat-assigned'
                  className='flex items-center justify-between rounded-md bg-white border border-stone-200/80 px-2.5 py-1.5'
                >
                  <span className='text-stone-600 truncate'>
                    ✅ {t('workspace.automationTab.statAutoAssigned')}
                  </span>
                  <span className='font-bold text-stone-900 ml-1'>
                    {activitySummary.autoAssigned}
                  </span>
                </div>
                <div
                  data-testid='automation-stat-skipped'
                  className='flex items-center justify-between rounded-md bg-white border border-stone-200/80 px-2.5 py-1.5'
                >
                  <span className='text-stone-600 truncate'>
                    ⚠️ {t('workspace.automationTab.statSkipped')}
                  </span>
                  <span className='font-bold text-stone-900 ml-1'>{activitySummary.skipped}</span>
                </div>
                <div
                  data-testid='automation-stat-escalated'
                  className='flex items-center justify-between rounded-md bg-white border border-stone-200/80 px-2.5 py-1.5'
                >
                  <span className='text-stone-600 truncate'>
                    ⏰ {t('workspace.automationTab.statEscalated')}
                  </span>
                  <span className='font-bold text-stone-900 ml-1'>{activitySummary.escalated}</span>
                </div>
              </div>
            </div>

            {activityError ? (
              <div
                role='alert'
                className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800'
              >
                <div className='flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
                  <span>{activityError}</span>
                </div>
                <button
                  type='button'
                  onClick={() => void loadActivity()}
                  className='inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 cursor-pointer'
                >
                  <RefreshCw className='w-3 h-3' />
                  <span>{t('workspace.automationTab.retryBtn')}</span>
                </button>
              </div>
            ) : activityLoading && !activity ? (
              <div className='py-8 text-center text-xs text-stone-500'>
                <Loader2 className='w-4 h-4 animate-spin text-orange-600 mx-auto mb-1.5' />
                <span>{t('workspace.automationTab.activityLoading')}</span>
              </div>
            ) : activityItems.length === 0 ? (
              <div className='py-8 text-center text-xs text-stone-500'>
                {t('workspace.automationTab.activityEmpty')}
              </div>
            ) : (
              <div className='divide-y divide-stone-100 max-h-96 overflow-y-auto -mx-2'>
                {activityItems.map((item, idx) => {
                  const row = renderActivitySummaryLine(item);
                  const targetUrl = workspaceId
                    ? `/workspaces/${encodeURIComponent(workspaceId)}/series/${encodeURIComponent(item.seriesId)}/workspace?chapterId=${encodeURIComponent(item.chapterId)}&board=grid-v3`
                    : '#';
                  return (
                    <Link
                      key={`${item.kind}-${item.chapterId}-${item.occurredAt}-${idx}`}
                      to={targetUrl}
                      data-testid='automation-activity-item'
                      className='flex items-start justify-between gap-2.5 rounded-lg px-2 py-2.5 text-xs hover:bg-stone-50 transition-colors group'
                    >
                      <div className='flex items-start gap-2 min-w-0'>
                        <span className='shrink-0 leading-5' aria-hidden='true'>
                          {row.icon}
                        </span>
                        <div className='min-w-0 space-y-0.5'>
                          <div className='font-medium text-stone-800 group-hover:text-orange-700 leading-relaxed break-words'>
                            {row.primary}
                          </div>
                          {row.secondary && (
                            <div className='text-[11px] text-stone-500 truncate'>
                              {row.secondary}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className='w-3.5 h-3.5 text-stone-400 group-hover:text-orange-600 shrink-0 mt-1' />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
