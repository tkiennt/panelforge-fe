import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCheck,
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
  Sliders,
  UserCheck,
} from 'lucide-react';
import {
  workspaceService,
  type AutoAssignMode,
  type AutomationActivityDto,
  type AutomationActivityItemDto,
  type AutomationActivityKind,
  type AutomationSettingsDto,
} from '@/services/workspace.service';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CountChip,
  PageHeader,
} from '@/shared/ui';
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

type ActivityFilterKind = 'ALL' | AutomationActivityKind;

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
        checked ? 'text-accent-dark' : 'text-stone-500'
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
  const [activityFilter, setActivityFilter] = useState<ActivityFilterKind>('ALL');

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

  const parsedDraftLead = Number(leadHoursInput.trim());
  const validDraftLead =
    Number.isInteger(parsedDraftLead) && parsedDraftLead >= 1 && parsedDraftLead <= 168
      ? parsedDraftLead
      : null;
  const parsedDraftEscalation =
    escalationHoursInput.trim() === '' ? null : Number(escalationHoursInput.trim());
  const validDraftEscalation =
    parsedDraftEscalation !== null &&
    Number.isInteger(parsedDraftEscalation) &&
    parsedDraftEscalation >= 1 &&
    parsedDraftEscalation <= 168
      ? parsedDraftEscalation
      : null;

  const isR1Dirty =
    autoNextStage !== savedSettings.autoNextStage || assignMode !== savedSettings.assignMode;
  const isR2Dirty = autoRouteReview !== savedSettings.autoRouteReview;
  const isR3Dirty =
    leadHoursInput.trim() !== String(savedSettings.leadHours) ||
    parsedDraftEscalation !== savedSettings.escalationHours;
  const isDirty = isR1Dirty || isR2Dirty || isR3Dirty;

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
      step: '01',
      trigger: t('workspace.automationTab.triggerApprove'),
      label: t('workspace.automationTab.ruleR1Label'),
      enabled: savedSettings.autoNextStage,
      dirty: canEdit && isR1Dirty,
      icon: GitBranch,
      activeTile: 'bg-accent-soft text-accent-dark',
      badge: savedSettings.autoNextStage
        ? t('workspace.automationTab.ruleOnWithDetail', { detail: savedModeLabel })
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r2',
      step: '02',
      trigger: t('workspace.automationTab.triggerSubmit'),
      label: t('workspace.automationTab.ruleR2Label'),
      enabled: savedSettings.autoRouteReview,
      dirty: canEdit && isR2Dirty,
      icon: UserCheck,
      activeTile: 'bg-blue-50 text-blue-700',
      badge: savedSettings.autoRouteReview
        ? t('workspace.automationTab.ruleOn')
        : t('workspace.automationTab.ruleOff'),
    },
    {
      id: 'r3',
      step: '03',
      trigger: t('workspace.automationTab.triggerDeadline'),
      label: t('workspace.automationTab.ruleR3Label'),
      enabled: savedSettings.escalationHours !== null,
      dirty: canEdit && isR3Dirty,
      icon: Clock,
      activeTile: 'bg-amber-50 text-amber-700',
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
  const filteredActivityItems =
    activityFilter === 'ALL'
      ? activityItems
      : activityItems.filter((item) => item.kind === activityFilter);

  const toggleActivityFilter = (kind: AutomationActivityKind) => {
    setActivityFilter((prev) => (prev === kind ? 'ALL' : kind));
  };

  const renderActivityRow = (item: AutomationActivityItemDto) => {
    const chapterLabel = t('workspace.automationTab.activityChapter', {
      number: item.chapterNumber,
    });
    const relTime = formatRelativeTime(item.occurredAt);

    if (item.kind === 'AutoAssigned') {
      const pageLabel =
        item.pageNumbers && item.pageNumbers.length > 0
          ? formatPageRangeLabel(item.pageNumbers)
          : null;
      return {
        toneClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        accentBorder: '',
        Icon: CheckCircle2,
        chapterLabel,
        stageName: item.stageName?.trim() || null,
        pageLabel,
        assigneeName: item.assigneeName?.trim() || null,
        reason: item.reason?.trim() || null,
        seriesTitle: item.seriesTitle?.trim() || null,
        relTime,
      };
    }
    if (item.kind === 'Escalated') {
      return {
        toneClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        accentBorder: 'border-l-2 border-l-rose-400',
        Icon: Clock,
        chapterLabel,
        stageName: item.stageName?.trim() || null,
        pageLabel: null,
        assigneeName: null,
        reason: item.reason?.trim() || chapterLabel,
        seriesTitle: item.seriesTitle?.trim() || null,
        relTime,
      };
    }
    return {
      toneClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
      accentBorder: 'border-l-2 border-l-amber-400',
      Icon: AlertTriangle,
      chapterLabel,
      stageName: item.stageName?.trim() || null,
      pageLabel: null,
      assigneeName: null,
      reason: item.reason?.trim() || chapterLabel,
      seriesTitle: item.seriesTitle?.trim() || null,
      relTime,
    };
  };

  return (
    <div
      role='tabpanel'
      id='tabpanel-automation'
      aria-labelledby='tab-automation'
      data-testid='studio-automation-tab'
      className='flex w-full flex-col gap-5 animate-in fade-in duration-200'
    >
      {onBackToSeries && (
        <div>
          <button
            type='button'
            onClick={onBackToSeries}
            className='focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sienna hover:bg-head-wash transition-colors cursor-pointer'
          >
            <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{t('workspace.automationTab.backToSeries')}</span>
          </button>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className='flex flex-col gap-5'>
        {/* Unified Option-B 2-tier Header Card: PageHeader + Live 3-Step Pipeline Strip */}
        <Card>
          <PageHeader
            variant='card'
            as='h1'
            icon={<Sliders aria-hidden='true' />}
            eyebrow={workspaceName || t('workspace.automationTab.eyebrow')}
            title={
              <span className='inline-flex flex-wrap items-center gap-2.5'>
                <span>{t('workspace.automationTab.title')}</span>
                <CountChip className='font-sans tabular-nums'>
                  {t('workspace.automationTab.activeRulesCount', {
                    active: activeSavedCount,
                    total: ruleStatuses.length,
                  })}
                </CountChip>
                {!canEdit && (
                  <Badge
                    tone='neutral'
                    icon={<Lock aria-hidden='true' />}
                    data-testid='automation-readonly-badge'
                    className='font-sans font-semibold'
                  >
                    {t('workspace.automationTab.readOnlyBadge')}
                  </Badge>
                )}
              </span>
            }
            description={t('workspace.automationTab.subtitle')}
            actions={
              <div className='flex flex-wrap items-center gap-2'>
                {canEdit && (
                  <Button
                    variant='secondary'
                    size='sm'
                    type='button'
                    data-testid='automation-recommended-preset-btn'
                    disabled={controlsDisabled}
                    onClick={handleApplyRecommendedPreset}
                    title={t('workspace.automationTab.recommendedPresetDesc')}
                    leadingIcon={<CheckCheck className='text-accent-dark' aria-hidden='true' />}
                    className='cursor-pointer whitespace-nowrap'
                  >
                    {t('workspace.automationTab.recommendedPresetBtn')}
                  </Button>
                )}
                {canEdit && isDirty && (
                  <Button
                    variant='secondary'
                    size='sm'
                    type='button'
                    data-testid='automation-reset-btn'
                    disabled={controlsDisabled}
                    onClick={handleResetDraft}
                    leadingIcon={<RotateCcw aria-hidden='true' />}
                    className='cursor-pointer whitespace-nowrap'
                  >
                    {t('workspace.automationTab.resetBtn')}
                  </Button>
                )}
                <Button
                  variant='primary'
                  size='sm'
                  type='submit'
                  data-testid='automation-save-btn'
                  disabled={controlsDisabled}
                  loading={saving}
                  leadingIcon={<Save aria-hidden='true' />}
                  className='cursor-pointer whitespace-nowrap'
                >
                  {saving
                    ? t('workspace.automationTab.savingBtn')
                    : t('workspace.automationTab.saveBtn')}
                </Button>
              </div>
            }
          />

          {/* Docked Tier 2: Live 3-step pipeline strip ("Cách hoạt động") */}
          <section data-testid='automation-how-it-works' className='bg-white'>
            <div className='flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-2 text-xs'>
              <div className='flex min-w-0 items-center gap-2 text-stone-600'>
                <Info className='size-3.5 shrink-0 text-sienna' aria-hidden='true' />
                <span className='shrink-0 font-semibold text-stone-800'>
                  {t('workspace.automationTab.howItWorksHeading')}:
                </span>
                <span className='truncate text-stone-600'>
                  {t('workspace.automationTab.howItWorksFlow')}
                </span>
              </div>
              <span className='inline-flex shrink-0 items-center gap-1.5 text-xs text-stone-500 tabular-nums'>
                <Clock className='size-3.5 text-stone-400 shrink-0' aria-hidden='true' />
                <span>
                  {t('workspace.automationTab.leadReminderSummary', {
                    hours: savedSettings.leadHours,
                  })}
                </span>
              </span>
            </div>

            <div className='grid grid-cols-1 divide-y divide-stone-200/80 md:grid-cols-3 md:divide-x md:divide-y-0'>
              {ruleStatuses.map((rule, idx) => {
                const StepIcon = rule.icon;
                return (
                  <div
                    key={rule.id}
                    data-testid={`automation-rule-status-${rule.id}`}
                    className={`relative flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                      rule.dirty ? 'bg-amber-50/40' : 'bg-white'
                    }`}
                  >
                    <div className='flex min-w-0 items-center gap-2.5'>
                      <span
                        aria-hidden='true'
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                          rule.enabled ? rule.activeTile : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        <StepIcon className='size-4' />
                      </span>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5 text-xs text-stone-500'>
                          <span className='font-mono font-bold text-stone-700'>{rule.step}</span>
                          <span aria-hidden='true'>·</span>
                          <span className='truncate'>{rule.trigger}</span>
                        </div>
                        <div className='truncate text-xs font-bold text-stone-900'>
                          {rule.label}
                        </div>
                      </div>
                    </div>

                    <div className='flex shrink-0 flex-col items-end gap-1'>
                      <Badge
                        tone={rule.enabled ? 'success' : 'neutral'}
                        className='font-semibold tabular-nums'
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            rule.enabled ? 'bg-emerald-600' : 'bg-stone-400'
                          }`}
                          aria-hidden='true'
                        />
                        <span>{rule.badge}</span>
                      </Badge>
                      {rule.dirty && (
                        <span className='text-xs font-semibold text-amber-700'>
                          {t('workspace.automationTab.draftUnsavedTag')}
                        </span>
                      )}
                    </div>

                    {idx < ruleStatuses.length - 1 && (
                      <span
                        aria-hidden='true'
                        className='hidden md:grid place-items-center absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 size-5 rounded-full border border-stone-200 bg-white text-stone-400'
                      >
                        <ArrowRight className='size-3' />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </Card>

        {!canEdit && (
          <Alert tone='neutral' className='text-xs'>
            <div className='flex items-center gap-2'>
              <Lock className='w-3.5 h-3.5 text-stone-500 shrink-0' aria-hidden='true' />
              <span>{t('workspace.automationTab.readOnlyHint')}</span>
            </div>
          </Alert>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'>
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
              <div className='space-y-4'>
                {/* Rule 1: Tự giao công đoạn kế tiếp + assignMode */}
                <Card tone='brand'>
                  <CardHeader
                    icon={<GitBranch />}
                    title={
                      <span className='inline-flex flex-wrap items-center gap-2'>
                        <span>{t('workspace.automationTab.autoNextStageLabel')}</span>
                        <CountChip className='font-medium'>
                          {t('workspace.automationTab.triggerApprove')}
                        </CountChip>
                      </span>
                    }
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
                  <CardBody className='space-y-3.5'>
                    <div className='space-y-2'>
                      <p className='text-xs text-stone-600 leading-relaxed'>
                        {t('workspace.automationTab.autoNextStageDesc')}
                      </p>
                      <p className='rounded-lg border border-head-line bg-[#FAF9F5] px-3 py-2 text-xs text-stone-600 leading-relaxed'>
                        {t('workspace.automationTab.autoNextStageExample')}
                      </p>
                    </div>

                    <div
                      className={`pt-3.5 border-t border-stone-100 space-y-2.5 transition-opacity duration-150 ${
                        autoNextStage ? 'opacity-100' : 'opacity-65'
                      }`}
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='text-xs font-semibold text-stone-800'>
                          {t('workspace.automationTab.assignModeLabel')}
                        </span>
                        {!autoNextStage && (
                          <CountChip className='font-medium'>
                            {t('workspace.automationTab.assignModeInactiveHint')}
                          </CountChip>
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
                    title={
                      <span className='inline-flex flex-wrap items-center gap-2'>
                        <span>{t('workspace.automationTab.autoRouteReviewLabel')}</span>
                        <CountChip className='font-medium'>
                          {t('workspace.automationTab.triggerSubmit')}
                        </CountChip>
                      </span>
                    }
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
                    <p className='rounded-lg border border-head-line bg-[#FAF9F5] px-3 py-2 text-xs text-stone-600 leading-relaxed'>
                      {t('workspace.automationTab.autoRouteReviewExample')}
                    </p>
                  </CardBody>
                </Card>

                {/* Rule 3: Nhắc hạn & báo trễ + Live Deadline Timeline */}
                <Card tone='warning'>
                  <CardHeader
                    icon={<Clock />}
                    title={
                      <span className='inline-flex flex-wrap items-center gap-2'>
                        <span>{t('workspace.automationTab.remindersHeading')}</span>
                        <CountChip className='font-medium'>
                          {t('workspace.automationTab.triggerDeadline')}
                        </CountChip>
                      </span>
                    }
                    titleAs='h2'
                  />
                  <CardBody className='space-y-4'>
                    {/* Live visual deadline timeline */}
                    <div
                      data-testid='automation-deadline-timeline'
                      className='rounded-lg border border-head-line bg-head-wash/70 px-4 py-3 space-y-2'
                    >
                      <div className='text-xs font-semibold text-stone-700'>
                        {t('workspace.automationTab.timelineHeading')}
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-3 items-center gap-2.5'>
                        <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs'>
                          <Bell className='size-3.5 shrink-0 text-amber-700' aria-hidden='true' />
                          <div className='min-w-0'>
                            <div className='font-mono font-bold text-amber-900 tabular-nums'>
                              {validDraftLead !== null
                                ? t('workspace.automationTab.timelineBefore', {
                                    hours: validDraftLead,
                                  })
                                : '—'}
                            </div>
                            <div className='truncate text-xs text-amber-800'>
                              {t('workspace.automationTab.timelineRemindMember')}
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center gap-1.5'>
                          <div className='hidden sm:block h-0.5 flex-1 bg-amber-300' />
                          <span className='mx-auto inline-flex items-center rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-semibold text-white whitespace-nowrap'>
                            {t('workspace.automationTab.timelineDue')}
                          </span>
                          <div
                            className={`hidden sm:block h-0.5 flex-1 ${
                              validDraftEscalation !== null
                                ? 'bg-rose-300'
                                : 'border-t border-dashed border-stone-300'
                            }`}
                          />
                        </div>

                        <div
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                            validDraftEscalation !== null
                              ? 'border-rose-200 bg-rose-50'
                              : 'border-dashed border-stone-300 bg-white/75'
                          }`}
                        >
                          <Clock
                            className={`size-3.5 shrink-0 ${
                              validDraftEscalation !== null ? 'text-rose-700' : 'text-stone-400'
                            }`}
                            aria-hidden='true'
                          />
                          <div className='min-w-0'>
                            <div
                              className={`font-mono font-bold tabular-nums ${
                                validDraftEscalation !== null ? 'text-rose-900' : 'text-stone-500'
                              }`}
                            >
                              {validDraftEscalation !== null
                                ? t('workspace.automationTab.timelineAfter', {
                                    hours: validDraftEscalation,
                                  })
                                : t('workspace.automationTab.switchOff')}
                            </div>
                            <div
                              className={`truncate text-xs ${
                                validDraftEscalation !== null ? 'text-rose-800' : 'text-stone-500'
                              }`}
                            >
                              {t('workspace.automationTab.timelineAlertProducer')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='divide-y divide-stone-100 rounded-lg border border-stone-200/80 bg-[#FAF9F5]/40'>
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
                            <CountChip data-testid='lead-duration-preview' className='tabular-nums'>
                              {leadDurationPreview}
                            </CountChip>
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
                              className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-500'
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
                                  className={`min-h-8 rounded-lg border px-2.5 py-1 text-xs font-semibold font-mono tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
                        <p className='text-xs text-stone-500'>
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
                              <CountChip
                                data-testid='escalation-duration-preview'
                                className='tabular-nums'
                              >
                                {escalationDurationPreview}
                              </CountChip>
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
                                placeholder={t(
                                  'workspace.automationTab.escalationHoursPlaceholder',
                                )}
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
                                  className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-500'
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
                                    className={`min-h-8 rounded-lg border px-2.5 py-1 text-xs font-semibold font-mono tabular-nums transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
                          <p className='text-xs text-stone-500'>
                            {t('workspace.automationTab.escalationHoursHint')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Status / Sticky Save Reminder Bar */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/95 backdrop-blur-xs px-4 py-3 transition-colors ${
                    canEdit && isDirty
                      ? 'sticky bottom-3 z-10 border-amber-300/90 shadow-md'
                      : 'border-stone-200/90 shadow-xs'
                  }`}
                >
                  <div className='text-xs'>
                    {canEdit && isDirty ? (
                      <Badge
                        tone='warning'
                        data-testid='automation-dirty-indicator'
                        className='font-semibold'
                      >
                        <span className='size-1.5 rounded-full bg-amber-500' aria-hidden='true' />
                        <span>{t('workspace.automationTab.dirtyIndicator')}</span>
                      </Badge>
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

                  {canEdit && isDirty && (
                    <div className='flex items-center gap-2 ml-auto'>
                      <Button
                        variant='secondary'
                        size='sm'
                        type='button'
                        disabled={controlsDisabled}
                        onClick={handleResetDraft}
                        leadingIcon={<RotateCcw aria-hidden='true' />}
                        className='cursor-pointer'
                      >
                        {t('workspace.automationTab.resetBtn')}
                      </Button>
                      <Button
                        variant='primary'
                        size='sm'
                        type='submit'
                        disabled={controlsDisabled}
                        loading={saving}
                        leadingIcon={<Save aria-hidden='true' />}
                        className='cursor-pointer'
                      >
                        {saving
                          ? t('workspace.automationTab.savingBtn')
                          : t('workspace.automationTab.saveBtn')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right rail: Immediately visible, filterable Recent Activity */}
          <div className='lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-5'>
            <Card as='section' tone='neutral' data-testid='automation-recent-activity'>
              <CardHeader
                icon={<Activity />}
                title={t('workspace.automationTab.activityHeading')}
                subtitle={t('workspace.automationTab.activityFilterHint')}
                titleAs='h3'
                actions={
                  <>
                    <CountChip>{t('workspace.automationTab.activityLast7Days')}</CountChip>
                    {activityFilter !== 'ALL' && (
                      <button
                        type='button'
                        data-testid='automation-activity-filter-clear'
                        onClick={() => setActivityFilter('ALL')}
                        className='focus-ring rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap'
                      >
                        {t('workspace.automationTab.activityShowAll', {
                          count: activityItems.length,
                        })}
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => void loadActivity()}
                      disabled={activityLoading}
                      aria-label={t('workspace.automationTab.activityRefreshAria')}
                      title={t('workspace.automationTab.activityRefreshAria')}
                      className='focus-ring inline-flex items-center justify-center w-8 h-8 rounded-lg border border-head-line bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-50 transition-colors cursor-pointer'
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
                {/* Clickable 7-day filter stat tiles */}
                <div className='grid grid-cols-3 gap-2.5'>
                  {(
                    [
                      {
                        kind: 'AutoAssigned' as const,
                        testId: 'automation-stat-assigned',
                        label: t('workspace.automationTab.statAutoAssigned'),
                        value: activitySummary.autoAssigned,
                        Icon: CheckCircle2,
                        iconClass: 'text-emerald-600',
                        activeClass: 'border-emerald-400 bg-emerald-50/70',
                      },
                      {
                        kind: 'Skipped' as const,
                        testId: 'automation-stat-skipped',
                        label: t('workspace.automationTab.statSkipped'),
                        value: activitySummary.skipped,
                        Icon: AlertTriangle,
                        iconClass: 'text-amber-600',
                        activeClass: 'border-amber-400 bg-amber-50/70',
                      },
                      {
                        kind: 'Escalated' as const,
                        testId: 'automation-stat-escalated',
                        label: t('workspace.automationTab.statEscalated'),
                        value: activitySummary.escalated,
                        Icon: Clock,
                        iconClass: 'text-rose-600',
                        activeClass: 'border-rose-400 bg-rose-50/70',
                      },
                    ] as const
                  ).map(({ kind, testId, label, value, Icon, iconClass, activeClass }) => {
                    const selected = activityFilter === kind;
                    return (
                      <button
                        key={kind}
                        type='button'
                        aria-pressed={selected}
                        data-testid={testId}
                        onClick={() => toggleActivityFilter(kind)}
                        className={`focus-ring text-left rounded-lg border px-3 py-2.5 space-y-1 transition-colors cursor-pointer ${
                          selected
                            ? activeClass
                            : 'border-stone-200/80 bg-[#FAF9F5] hover:border-stone-300'
                        }`}
                      >
                        <div className='flex items-center gap-1.5 text-xs font-medium text-stone-600'>
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${iconClass}`}
                            aria-hidden='true'
                          />
                          <span className='truncate'>{label}</span>
                        </div>
                        <div className='font-mono text-lg font-bold text-stone-900 tabular-nums leading-none'>
                          {value}
                        </div>
                      </button>
                    );
                  })}
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
                    <p className='mx-auto max-w-xs text-xs text-stone-500 leading-relaxed'>
                      {t('workspace.automationTab.activityEmptyHint')}
                    </p>
                  </div>
                ) : filteredActivityItems.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-head-line bg-[#FAF9F5]/70 px-4 py-6 text-center space-y-2'>
                    <p className='text-xs font-semibold text-stone-700'>
                      {t('workspace.automationTab.activityFilterEmpty')}
                    </p>
                    <button
                      type='button'
                      onClick={() => setActivityFilter('ALL')}
                      className='focus-ring inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer'
                    >
                      {t('workspace.automationTab.activityShowAll', {
                        count: activityItems.length,
                      })}
                    </button>
                  </div>
                ) : (
                  <div className='divide-y divide-stone-100 max-h-[520px] overflow-y-auto -mx-2'>
                    {filteredActivityItems.map((item, idx) => {
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
                          className={`flex items-start justify-between gap-2.5 rounded-lg px-2.5 py-2.5 text-xs hover:bg-stone-50 transition-colors group ${row.accentBorder}`}
                        >
                          <div className='flex items-start gap-2.5 min-w-0 flex-1'>
                            <span
                              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${row.toneClass}`}
                              aria-hidden='true'
                            >
                              <StatusIcon className='w-3.5 h-3.5' />
                            </span>
                            <div className='min-w-0 flex-1 space-y-1'>
                              <div className='flex flex-wrap items-center justify-between gap-1.5'>
                                <div className='flex flex-wrap items-center gap-1.5 min-w-0'>
                                  <span className='font-semibold text-stone-900 group-hover:text-accent-dark'>
                                    {row.chapterLabel}
                                  </span>
                                  {row.stageName && (
                                    <span className='inline-flex items-center rounded-md bg-kraft px-1.5 py-0.5 text-xs font-semibold text-kraft-ink'>
                                      {row.stageName}
                                    </span>
                                  )}
                                  {row.pageLabel && (
                                    <span className='text-xs text-stone-600 tabular-nums'>
                                      {row.pageLabel}
                                    </span>
                                  )}
                                </div>
                                {row.relTime && (
                                  <span className='text-xs text-stone-500 shrink-0'>
                                    {row.relTime}
                                  </span>
                                )}
                              </div>
                              {(row.assigneeName || row.reason) && (
                                <div className='text-xs leading-relaxed text-stone-700 break-words'>
                                  {row.assigneeName && (
                                    <span className='font-semibold text-stone-900'>
                                      {row.assigneeName}
                                    </span>
                                  )}
                                  {row.assigneeName && row.reason && (
                                    <span className='mx-1 text-stone-400' aria-hidden='true'>
                                      ·
                                    </span>
                                  )}
                                  {row.reason && (
                                    <span className='text-stone-600'>{row.reason}</span>
                                  )}
                                </div>
                              )}
                              {row.seriesTitle && (
                                <div className='text-xs text-stone-500 truncate'>
                                  {row.seriesTitle}
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
      </form>
    </div>
  );
};
