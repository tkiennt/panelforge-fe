import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  GitBranch,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';
import {
  workspaceService,
  type AutoAssignMode,
  type AutomationActivityDto,
  type AutomationActivityItemDto,
  type AutomationSettingsDto,
} from '@/services/workspace.service';
import { Alert, Card, CardBody, CardHeader, PageHeader } from '@/shared/ui';
import { formatPageRangeLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { formatRelativeTime } from '@/lib/format';
import { useTranslation } from '@/lib/i18n';

export interface StudioAutomationTabProps {
  workspaceId?: string;
  workspaceName?: string;
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
  <label
    className={`inline-flex items-center gap-2 shrink-0 min-h-9 select-none ${
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    }`}
  >
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
        } ${disabled ? 'opacity-50' : ''}`}
      />
      <span
        aria-hidden='true'
        className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  </label>
);

export const StudioAutomationTab: React.FC<StudioAutomationTabProps> = ({
  workspaceId,
  workspaceName,
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
      step: 1,
      label: t('workspace.automationTab.ruleR1Label'),
      enabled: savedSettings.autoNextStage,
      badge: savedSettings.autoNextStage
        ? t('workspace.automationTab.ruleOnWithDetail', { detail: savedModeLabel })
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r2',
      step: 2,
      label: t('workspace.automationTab.ruleR2Label'),
      enabled: savedSettings.autoRouteReview,
      badge: savedSettings.autoRouteReview
        ? t('workspace.automationTab.ruleOn')
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r3',
      step: 3,
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

  const activeSavedCount = ruleStatuses.filter((r) => r.enabled).length;
  const activitySummary = activity?.last7Days ?? { autoAssigned: 0, skipped: 0, escalated: 0 };
  const activityItems = activity?.items ?? [];

  const renderActivityRow = (item: AutomationActivityItemDto) => {
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
        toneClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        Icon: CheckCircle2,
        primary: parts.join(' · '),
        secondary: [item.seriesTitle, formatRelativeTime(item.occurredAt)]
          .filter(Boolean)
          .join(' · '),
      };
    }
    if (item.kind === 'Escalated') {
      return {
        toneClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        Icon: Clock,
        primary: item.reason || chapterLabel,
        secondary: [item.seriesTitle, chapterLabel, formatRelativeTime(item.occurredAt)]
          .filter(Boolean)
          .join(' · '),
      };
    }
    return {
      toneClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
      Icon: AlertTriangle,
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
      className='mx-auto flex w-full max-w-7xl flex-col gap-5 animate-in fade-in duration-200'
    >
      {onBackToSeries && (
        <div>
          <button
            type='button'
            onClick={onBackToSeries}
            className='inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sienna hover:bg-head-wash transition-colors cursor-pointer'
          >
            <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{t('workspace.automationTab.backToSeries')}</span>
          </button>
        </div>
      )}

      <PageHeader
        as='h1'
        icon={<Sparkles />}
        eyebrow={workspaceName || t('workspace.automationTab.eyebrow')}
        title={
          <span className='inline-flex flex-wrap items-center gap-2.5'>
            <span>{t('workspace.automationTab.title')}</span>
            <span className='inline-flex items-center rounded-full bg-kraft px-2.5 py-0.5 font-sans text-xs font-semibold text-kraft-ink tabular-nums'>
              {t('workspace.automationTab.activeRulesCount', {
                active: activeSavedCount,
                total: ruleStatuses.length,
              })}
            </span>
            {!canEdit && (
              <span
                data-testid='automation-readonly-badge'
                className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 font-sans text-xs font-semibold text-stone-700'
              >
                <Lock className='w-3 h-3 text-stone-500' aria-hidden='true' />
                <span>{t('workspace.automationTab.readOnlyBadge')}</span>
              </span>
            )}
          </span>
        }
        description={t('workspace.automationTab.subtitle')}
        actions={
          canEdit ? (
            <button
              type='button'
              data-testid='automation-recommended-preset-btn'
              disabled={controlsDisabled}
              onClick={handleApplyRecommendedPreset}
              title={t('workspace.automationTab.recommendedPresetDesc')}
              className='inline-flex items-center gap-1.5 min-h-9 rounded-lg border border-head-line bg-head-wash hover:bg-kraft/70 px-3.5 py-2 text-xs font-semibold text-sienna transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
            >
              <Wand2 className='w-3.5 h-3.5 text-accent-dark shrink-0' aria-hidden='true' />
              <span>{t('workspace.automationTab.recommendedPresetBtn')}</span>
            </button>
          ) : undefined
        }
      />

      {!canEdit && (
        <Alert tone='neutral' className='text-xs'>
          <div className='flex items-center gap-2'>
            <Lock className='w-3.5 h-3.5 text-stone-500 shrink-0' aria-hidden='true' />
            <span>{t('workspace.automationTab.readOnlyHint')}</span>
          </div>
        </Alert>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* Left column: Automation rule configuration */}
        <div className='lg:col-span-7 flex flex-col gap-4'>
          {loadError && (
            <Alert tone='danger' data-testid='automation-load-error' className='text-xs'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' aria-hidden='true' />
                <span>{loadError}</span>
              </div>
              <button
                type='button'
                onClick={() => void loadSettings()}
                className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 transition-colors cursor-pointer shrink-0'
              >
                <RefreshCw className='w-3.5 h-3.5' aria-hidden='true' />
                <span>{t('workspace.automationTab.retryBtn')}</span>
              </button>
            </Alert>
          )}

          {saveError && (
            <Alert tone='danger' data-testid='automation-save-error' className='text-xs'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' aria-hidden='true' />
                <span>{saveError}</span>
              </div>
              {isConflict && (
                <button
                  type='button'
                  data-testid='automation-reload-btn'
                  disabled={loading}
                  onClick={() => void loadSettings()}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 disabled:opacity-50 transition-colors cursor-pointer shrink-0'
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden='true'
                  />
                  <span>{t('workspace.automationTab.reloadBtn')}</span>
                </button>
              )}
            </Alert>
          )}

          {loading && !loadError ? (
            <Card>
              <CardBody className='py-12 text-center text-xs text-stone-500'>
                <Loader2 className='w-5 h-5 animate-spin text-orange-600 mx-auto mb-2' />
                <span>{t('workspace.automationTab.loading')}</span>
              </CardBody>
            </Card>
          ) : (
            <form noValidate onSubmit={handleSubmit} className='space-y-4'>
              {/* Rule 1: Tự giao công đoạn kế tiếp + assignMode */}
              <Card tone='brand'>
                <CardHeader
                  icon={<GitBranch />}
                  title={t('workspace.automationTab.autoNextStageLabel')}
                  titleAs='h2'
                  actions={
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
                  }
                />
                <CardBody className='space-y-4'>
                  <div className='space-y-2'>
                    <p className='text-xs text-stone-600 leading-relaxed'>
                      {t('workspace.automationTab.autoNextStageDesc')}
                    </p>
                    <p className='border-l-2 border-head-line pl-3 text-xs text-stone-500 leading-relaxed'>
                      {t('workspace.automationTab.autoNextStageExample')}
                    </p>
                  </div>

                  <div
                    className={`pt-4 border-t border-stone-100 space-y-2.5 transition-opacity duration-150 ${
                      autoNextStage ? 'opacity-100' : 'opacity-65'
                    }`}
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span className='text-xs font-semibold text-stone-800'>
                        {t('workspace.automationTab.assignModeLabel')}
                      </span>
                      {!autoNextStage && (
                        <span className='inline-flex items-center rounded-full bg-kraft/70 px-2.5 py-0.5 text-[11px] font-medium text-kraft-ink'>
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
                                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/15'
                                : selected
                                  ? 'border-stone-300 bg-stone-50'
                                  : 'border-stone-200 bg-white hover:bg-stone-50/70'
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
                            <div className='space-y-0.5 min-w-0'>
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
                </CardBody>
              </Card>

              {/* Rule 2: Gợi ý người duyệt */}
              <Card tone='info'>
                <CardHeader
                  icon={<UserCheck />}
                  title={t('workspace.automationTab.autoRouteReviewLabel')}
                  titleAs='h2'
                  actions={
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
                  }
                />
                <CardBody className='space-y-2'>
                  <p className='text-xs text-stone-600 leading-relaxed'>
                    {t('workspace.automationTab.autoRouteReviewDesc')}
                  </p>
                  <p className='border-l-2 border-head-line pl-3 text-xs text-stone-500 leading-relaxed'>
                    {t('workspace.automationTab.autoRouteReviewExample')}
                  </p>
                </CardBody>
              </Card>

              {/* Rule 3: Nhắc hạn & báo trễ */}
              <Card tone='warning'>
                <CardHeader
                  icon={<Clock />}
                  title={t('workspace.automationTab.remindersHeading')}
                  titleAs='h2'
                />
                <CardBody className='p-0 divide-y divide-stone-100'>
                  {/* Sub-section 1: Nhắc trước hạn */}
                  <div className='p-4 space-y-2.5'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <label
                        htmlFor='automation-lead-hours'
                        className='text-xs font-semibold text-stone-900'
                      >
                        {t('workspace.automationTab.leadHoursLabel')}
                      </label>
                      {leadDurationPreview && (
                        <span
                          data-testid='lead-duration-preview'
                          className='rounded-full bg-kraft px-2.5 py-0.5 text-[11px] font-semibold text-kraft-ink tabular-nums'
                        >
                          {leadDurationPreview}
                        </span>
                      )}
                    </div>
                    <div className='flex flex-wrap items-center gap-2.5'>
                      <div className='relative w-32 shrink-0'>
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
                          className='w-full min-h-9 rounded-lg border border-stone-300 bg-white pl-3 pr-10 py-1.5 text-sm font-medium text-stone-900 tabular-nums focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed'
                        />
                        <span
                          aria-hidden='true'
                          className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400'
                        >
                          {t('workspace.automationTab.hoursUnit')}
                        </span>
                      </div>
                      <div className='flex flex-wrap items-center gap-1.5'>
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
                              className={`min-h-8 rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                active
                                  ? 'border-orange-400 bg-orange-50 text-orange-800'
                                  : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                              }`}
                            >
                              {t('workspace.automationTab.quickChipHours', { hours: h })}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className='text-[11px] text-stone-500'>
                      {t('workspace.automationTab.leadHoursHint')}
                    </p>
                  </div>

                  {/* Sub-section 2: Báo Producer khi trễ quá hạn */}
                  <div className='p-4 space-y-3'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='space-y-0.5'>
                        <span className='text-xs font-semibold text-stone-900 block'>
                          {t('workspace.automationTab.escalationToggleLabel')}
                        </span>
                        <p className='text-xs text-stone-500 leading-relaxed'>
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
                    </div>

                    <div
                      className={`pt-2.5 border-t border-stone-100 space-y-2.5 transition-opacity duration-150 ${
                        escalationEnabled ? 'opacity-100' : 'opacity-65'
                      }`}
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <label
                          htmlFor='automation-escalation-hours'
                          className='text-xs font-semibold text-stone-800'
                        >
                          {t('workspace.automationTab.escalationHoursLabel')}
                        </label>
                        {escalationDurationPreview && (
                          <span
                            data-testid='escalation-duration-preview'
                            className='rounded-full bg-kraft px-2.5 py-0.5 text-[11px] font-semibold text-kraft-ink tabular-nums'
                          >
                            {escalationDurationPreview}
                          </span>
                        )}
                      </div>
                      <div className='flex flex-wrap items-center gap-2.5'>
                        <div
                          className={`relative flex-1 min-w-[200px] ${
                            escalationEnabled ? 'max-w-[140px]' : 'max-w-[320px]'
                          }`}
                        >
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
                            className={`w-full min-h-9 rounded-lg border border-stone-300 bg-white py-1.5 text-sm font-medium text-stone-900 tabular-nums placeholder:text-xs placeholder:font-normal placeholder:text-stone-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed ${
                              escalationEnabled ? 'pl-3 pr-10' : 'px-3'
                            }`}
                          />
                          {escalationEnabled && (
                            <span
                              aria-hidden='true'
                              className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400'
                            >
                              {t('workspace.automationTab.hoursUnit')}
                            </span>
                          )}
                        </div>
                        <div className='flex flex-wrap items-center gap-1.5'>
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
                                className={`min-h-8 rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  active
                                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                                    : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                                }`}
                              >
                                {t('workspace.automationTab.quickChipHours', { hours: h })}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <p className='text-[11px] text-stone-500'>
                        {t('workspace.automationTab.escalationHoursHint')}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Save Action Bar — becomes sticky only when there are unsaved changes */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/95 backdrop-blur-xs px-4 py-3 transition-colors ${
                  canEdit && isDirty
                    ? 'sticky bottom-3 z-10 border-amber-300/90 shadow-md'
                    : 'border-stone-200/90 shadow-xs'
                }`}
              >
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
                    <span className='inline-flex items-center gap-1.5 text-stone-500'>
                      <CheckCircle2
                        className='w-3.5 h-3.5 text-emerald-600 shrink-0'
                        aria-hidden='true'
                      />
                      <span>{t('workspace.automationTab.savedIndicator')}</span>
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
                      className='inline-flex items-center gap-1.5 min-h-9 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <RotateCcw className='w-3.5 h-3.5' aria-hidden='true' />
                      <span>{t('workspace.automationTab.resetBtn')}</span>
                    </button>
                  )}

                  <button
                    type='submit'
                    data-testid='automation-save-btn'
                    disabled={controlsDisabled}
                    className='inline-flex items-center gap-2 min-h-9 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {saving ? (
                      <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />
                    ) : (
                      <Save className='w-4 h-4' aria-hidden='true' />
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

        {/* Right rail: Saved rule status & Recent automated activity */}
        <div className='lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-5'>
          {/* Card 1: Cách hoạt động & Trạng thái đang lưu */}
          <Card as='section' tone='brand' data-testid='automation-how-it-works'>
            <CardHeader
              icon={<Info />}
              title={t('workspace.automationTab.howItWorksHeading')}
              titleAs='h3'
              actions={
                <span className='rounded-full bg-kraft px-2 py-0.5 text-[11px] font-semibold text-kraft-ink tabular-nums'>
                  {activeSavedCount}/{ruleStatuses.length}
                </span>
              }
            />
            <CardBody className='space-y-4'>
              <p className='rounded-lg border border-head-line/70 bg-head-wash/50 px-3.5 py-2.5 text-xs text-stone-700 leading-relaxed'>
                {t('workspace.automationTab.howItWorksFlow')}
              </p>

              <div className='space-y-2'>
                <div className='text-[11px] font-semibold uppercase tracking-wider text-sienna'>
                  {t('workspace.automationTab.savedRulesLabel')}
                </div>
                <div className='divide-y divide-stone-100 rounded-lg border border-stone-200/80 bg-white'>
                  {ruleStatuses.map((rule) => (
                    <div
                      key={rule.id}
                      data-testid={`automation-rule-status-${rule.id}`}
                      className='flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs'
                    >
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <span
                          aria-hidden='true'
                          className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums ${
                            rule.enabled ? 'bg-kraft text-kraft-ink' : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {rule.step}
                        </span>
                        <span className='font-medium text-stone-800 truncate'>{rule.label}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 tabular-nums ${
                          rule.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-500 border border-stone-200/80'
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
                <p className='flex items-center gap-1.5 pt-0.5 text-xs text-stone-500 tabular-nums'>
                  <Clock className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
                  <span>
                    {t('workspace.automationTab.leadReminderSummary', {
                      hours: savedSettings.leadHours,
                    })}
                  </span>
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Hoạt động gần đây */}
          <Card as='section' tone='neutral' data-testid='automation-recent-activity'>
            <CardHeader
              icon={<Activity />}
              title={t('workspace.automationTab.activityHeading')}
              titleAs='h3'
              actions={
                <>
                  <span className='rounded-full bg-kraft px-2 py-0.5 text-[11px] font-semibold text-kraft-ink'>
                    {t('workspace.automationTab.activityLast7Days')}
                  </span>
                  <button
                    type='button'
                    onClick={() => void loadActivity()}
                    disabled={activityLoading}
                    aria-label={t('workspace.automationTab.activityRefreshAria')}
                    title={t('workspace.automationTab.activityRefreshAria')}
                    className='inline-flex items-center justify-center w-8 h-8 rounded-lg border border-head-line bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-50 transition-colors cursor-pointer'
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`}
                      aria-hidden='true'
                    />
                  </button>
                </>
              }
            />
            <CardBody className='space-y-4'>
              {/* 7-day summary strip */}
              <div className='grid grid-cols-3 gap-2.5'>
                <div
                  data-testid='automation-stat-assigned'
                  className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] px-3 py-2.5 space-y-1'
                >
                  <div className='flex items-center gap-1.5 text-[11px] font-medium text-stone-600'>
                    <CheckCircle2
                      className='w-3.5 h-3.5 text-emerald-600 shrink-0'
                      aria-hidden='true'
                    />
                    <span className='truncate'>
                      {t('workspace.automationTab.statAutoAssigned')}
                    </span>
                  </div>
                  <div className='text-lg font-bold text-stone-900 tabular-nums leading-none'>
                    {activitySummary.autoAssigned}
                  </div>
                </div>
                <div
                  data-testid='automation-stat-skipped'
                  className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] px-3 py-2.5 space-y-1'
                >
                  <div className='flex items-center gap-1.5 text-[11px] font-medium text-stone-600'>
                    <AlertTriangle
                      className='w-3.5 h-3.5 text-amber-600 shrink-0'
                      aria-hidden='true'
                    />
                    <span className='truncate'>{t('workspace.automationTab.statSkipped')}</span>
                  </div>
                  <div className='text-lg font-bold text-stone-900 tabular-nums leading-none'>
                    {activitySummary.skipped}
                  </div>
                </div>
                <div
                  data-testid='automation-stat-escalated'
                  className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] px-3 py-2.5 space-y-1'
                >
                  <div className='flex items-center gap-1.5 text-[11px] font-medium text-stone-600'>
                    <Clock className='w-3.5 h-3.5 text-rose-600 shrink-0' aria-hidden='true' />
                    <span className='truncate'>{t('workspace.automationTab.statEscalated')}</span>
                  </div>
                  <div className='text-lg font-bold text-stone-900 tabular-nums leading-none'>
                    {activitySummary.escalated}
                  </div>
                </div>
              </div>

              {activityError ? (
                <Alert tone='danger' className='text-xs'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' aria-hidden='true' />
                    <span>{activityError}</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => void loadActivity()}
                    className='inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 transition-colors cursor-pointer shrink-0'
                  >
                    <RefreshCw className='w-3 h-3' aria-hidden='true' />
                    <span>{t('workspace.automationTab.retryBtn')}</span>
                  </button>
                </Alert>
              ) : activityLoading && !activity ? (
                <div className='py-8 text-center text-xs text-stone-500'>
                  <Loader2 className='w-4 h-4 animate-spin text-orange-600 mx-auto mb-1.5' />
                  <span>{t('workspace.automationTab.activityLoading')}</span>
                </div>
              ) : activityItems.length === 0 ? (
                <div className='rounded-lg border border-dashed border-head-line bg-[#FAF9F5]/70 px-4 py-7 text-center space-y-1.5'>
                  <div className='mx-auto grid size-9 place-items-center rounded-xl bg-head-wash text-sienna'>
                    <Activity className='w-4 h-4' aria-hidden='true' />
                  </div>
                  <p className='text-xs font-semibold text-stone-800'>
                    {t('workspace.automationTab.activityEmpty')}
                  </p>
                  <p className='mx-auto max-w-xs text-[11px] text-stone-500 leading-relaxed'>
                    {t('workspace.automationTab.activityEmptyHint')}
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-stone-100 max-h-96 overflow-y-auto -mx-2'>
                  {activityItems.map((item, idx) => {
                    const row = renderActivityRow(item);
                    const StatusIcon = row.Icon;
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
                        <div className='flex items-start gap-2.5 min-w-0'>
                          <span
                            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${row.toneClass}`}
                            aria-hidden='true'
                          >
                            <StatusIcon className='w-3.5 h-3.5' />
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
                        <ChevronRight
                          className='w-3.5 h-3.5 text-stone-400 group-hover:text-orange-600 shrink-0 mt-1'
                          aria-hidden='true'
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
