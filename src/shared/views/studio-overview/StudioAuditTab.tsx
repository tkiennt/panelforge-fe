import React from 'react';
import { ArrowRight, Download, RefreshCw, Search, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface StudioAuditTabProps {
  logs: any[];
  loading: boolean;
  filterEntity?: string;
  onFilterChange?: (val: string) => void;
  onRefresh?: () => void;
  workspaceName?: string;
  /** Thành viên Studio để hiện tên thay cho email người thực hiện. */
  members?: Array<{ userId?: string | null; email?: string | null; fullName?: string | null }>;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

type ActionKind = 'CREATE' | 'UPDATE' | 'DELETE' | 'OTHER';
type ActionFilter = 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE';

const ACTION_STYLE: Record<ActionKind, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  OTHER: 'bg-stone-100 text-stone-700 border-stone-200',
};

const logTime = (log: any): string | undefined =>
  log.timestampUtc || log.timestamp || log.createdAt || log.createdUtc;

const actionKindOf = (action: string): ActionKind => {
  const head = action.split('_')[0]?.toUpperCase();
  return head === 'CREATE' || head === 'UPDATE' || head === 'DELETE' ? head : 'OTHER';
};

const initialsOf = (name: string): string =>
  name
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

/** changesJson dạng {"Field":{"old":..,"new":..}}; dữ liệu lạ thì bỏ qua thay vì làm vỡ trang. */
const parseChanges = (raw?: string | null): Array<{ field: string; from: string; to: string }> => {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .filter(([, v]) => v && typeof v === 'object')
      .map(([field, v]: [string, any]) => ({
        field,
        from: v.old == null || v.old === '' ? '—' : String(v.old),
        to: v.new == null || v.new === '' ? '—' : String(v.new),
      }));
  } catch {
    return [];
  }
};

export const StudioAuditTab: React.FC<StudioAuditTabProps> = ({
  logs,
  loading,
  onRefresh,
  workspaceName,
  members = [],
}) => {
  const { t, lang } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState('ALL');
  const [actionFilter, setActionFilter] = React.useState<ActionFilter>('ALL');
  // Mốc "bây giờ" cố định cho một lần mount, để render thuần (react-hooks/purity).
  const [now] = React.useState(() => Date.now());

  const nameByEmail = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.email && m.fullName) map.set(m.email.toLowerCase(), m.fullName);
    }
    return map;
  }, [members]);
  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.userId && m.fullName) map.set(m.userId.toLowerCase(), m.fullName);
    }
    return map;
  }, [members]);

  /** Giá trị thay đổi: ISO → ngày giờ theo ngôn ngữ; GUID → tên thành viên hoặc mã rút gọn. */
  const formatChangeValue = (value: string): { text: string; title?: string } => {
    if (ISO_DATETIME_RE.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return {
          text: new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' }).format(d),
          title: value,
        };
      }
    }
    if (GUID_RE.test(value)) {
      return { text: nameById.get(value.toLowerCase()) ?? `#${value.slice(0, 8)}`, title: value };
    }
    return { text: value };
  };

  const actorOf = (log: any): string => {
    const email: string | undefined = log.userEmail || undefined;
    return (
      (email && nameByEmail.get(email.toLowerCase())) ||
      log.actorName ||
      log.userName ||
      email ||
      t('members.audit.systemActor')
    );
  };
  const entityLabel = (name: string) =>
    name ? t(`members.audit.entities.${name}`, name) : t('members.audit.systemActor');
  const actionLabel = (kind: ActionKind, raw: string) =>
    kind === 'CREATE'
      ? t('members.audit.actionCreate')
      : kind === 'UPDATE'
        ? t('members.audit.actionUpdate')
        : kind === 'DELETE'
          ? t('members.audit.actionDelete')
          : raw;
  const fieldLabel = (field: string) => t(`members.audit.fields.${field}`, field);

  const entityOptions = React.useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityName).filter(Boolean) as string[])).sort(),
    [logs],
  );

  const filteredLogs = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    return logs.filter((log) => {
      const action: string = log.action || log.operation || '';
      if (actionFilter !== 'ALL' && actionKindOf(action) !== actionFilter) return false;
      if (entityFilter !== 'ALL' && log.entityName !== entityFilter) return false;
      if (!q) return true;
      const haystack = [
        actorOf(log),
        log.userEmail,
        action,
        log.entityName,
        entityLabel(log.entityName || ''),
        log.details,
        log.changesJson,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, query, entityFilter, actionFilter, nameByEmail]);

  const isFiltering = query.trim() !== '' || entityFilter !== 'ALL' || actionFilter !== 'ALL';
  const clearFilters = () => {
    setQuery('');
    setEntityFilter('ALL');
    setActionFilter('ALL');
  };

  const dayKey = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toDateString();
  };
  const dayHeading = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const today = new Date(now);
    const yesterday = new Date(now - 86_400_000);
    if (d.toDateString() === today.toDateString()) return t('members.audit.today');
    if (d.toDateString() === yesterday.toDateString()) return t('members.audit.yesterday');
    return new Intl.DateTimeFormat(lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  };
  const timeOf = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(d);
  };
  const fullTimeOf = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeStyle: 'medium' }).format(d);
  };

  const groups = React.useMemo(() => {
    const out: Array<{ key: string; iso?: string; items: any[] }> = [];
    for (const log of filteredLogs) {
      const iso = logTime(log);
      const key = dayKey(iso);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(log);
      else out.push({ key, iso, items: [log] });
    }
    return out;
  }, [filteredLogs]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      t('workspace.auditTab.csvTime'),
      t('workspace.auditTab.csvActor'),
      t('workspace.auditTab.csvAction'),
      t('workspace.auditTab.csvTarget'),
      t('workspace.auditTab.csvDetails'),
    ];
    const rows = filteredLogs.map((log) => [
      esc(logTime(log)),
      esc(actorOf(log)),
      esc(log.action || log.operation),
      esc(log.entityName || log.targetType),
      esc(log.changesJson || log.description || log.details),
    ]);
    const csvContent = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Studio_Audit_${workspaceName || 'Log'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const actionChips: Array<{ id: ActionFilter; label: string }> = [
    { id: 'ALL', label: t('members.audit.actionAll') },
    { id: 'CREATE', label: t('members.audit.actionCreate') },
    { id: 'UPDATE', label: t('members.audit.actionUpdate') },
    { id: 'DELETE', label: t('members.audit.actionDelete') },
  ];

  return (
    <div
      role='tabpanel'
      id='tabpanel-audit'
      aria-labelledby='tab-audit'
      className='flex flex-col gap-4 animate-in fade-in duration-200'
    >
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='font-serif text-2xl font-bold text-stone-900'>
            {t('members.audit.title')}
          </h2>
          <p className='mt-1 text-sm text-stone-600'>{t('members.audit.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          {onRefresh && (
            <button
              type='button'
              onClick={onRefresh}
              disabled={loading}
              className='focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs transition-studio hover:border-head-line hover:text-stone-900 disabled:opacity-50 cursor-pointer'
            >
              <RefreshCw
                className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden='true'
              />
              <span>{t('members.audit.refresh')}</span>
            </button>
          )}
          <button
            type='button'
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            title={t('members.audit.exportCsvTitle')}
            className='focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs transition-studio hover:border-head-line hover:text-stone-900 disabled:opacity-50 cursor-pointer'
          >
            <Download className='size-3.5 text-orange-600' aria-hidden='true' />
            <span>{t('members.audit.exportCsvBtn')}</span>
          </button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative w-full sm:w-72'>
          <Search
            className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400'
            aria-hidden='true'
          />
          <input
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('members.audit.searchPlaceholder')}
            aria-label={t('members.audit.searchPlaceholder')}
            className='focus-ring w-full min-h-9 rounded-lg border border-stone-200 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-stone-900 shadow-2xs placeholder:text-stone-400 focus:border-accent'
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          aria-label={t('members.audit.entityFilterLabel')}
          className='focus-ring min-h-9 cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs hover:border-head-line'
        >
          <option value='ALL'>{t('members.audit.entityAll')}</option>
          {entityOptions.map((name) => (
            <option key={name} value={name}>
              {entityLabel(name)}
            </option>
          ))}
        </select>
        <div className='flex flex-wrap items-center gap-1' role='group'>
          {actionChips.map((chip) => {
            const active = actionFilter === chip.id;
            return (
              <button
                key={chip.id}
                type='button'
                aria-pressed={active}
                onClick={() => setActionFilter(chip.id)}
                className={`focus-ring min-h-8 rounded-full border px-3 text-xs font-medium transition-studio cursor-pointer ${
                  active
                    ? 'border-orange-200 bg-accent-soft text-accent-dark font-semibold'
                    : 'border-stone-200 bg-white text-stone-600 hover:text-stone-900'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {!loading && logs.length > 0 && (
          <span className='ml-auto text-xs text-stone-500'>
            {t('members.audit.showingRecent', { count: logs.length })}
          </span>
        )}
      </div>

      <div className='rounded-xl border border-stone-200/80 bg-white shadow-xs'>
        {loading ? (
          <ul className='divide-y divide-stone-100' aria-busy='true'>
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className='flex items-center gap-3 px-4 py-3.5'>
                <span className='size-8 shrink-0 animate-pulse rounded-full bg-stone-100' />
                <span className='h-3 flex-1 animate-pulse rounded bg-stone-100' />
                <span className='h-3 w-12 animate-pulse rounded bg-stone-100' />
              </li>
            ))}
            <li className='sr-only'>{t('members.audit.loading')}</li>
          </ul>
        ) : logs.length === 0 ? (
          <div className='py-14 text-center text-sm text-stone-500'>{t('members.audit.empty')}</div>
        ) : filteredLogs.length === 0 ? (
          <div className='flex flex-col items-center gap-3 py-14 text-center text-sm text-stone-500'>
            <span>{t('members.audit.noMatch')}</span>
            {isFiltering && (
              <button
                type='button'
                onClick={clearFilters}
                className='focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-head-line bg-accent-soft px-3 text-xs font-semibold text-accent-dark cursor-pointer'
              >
                <X className='size-3.5' aria-hidden='true' />
                {t('members.audit.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key || 'unknown'} aria-label={dayHeading(group.iso)}>
              <h3 className='sticky top-0 z-[1] border-b border-stone-100 bg-stone-50/95 px-4 py-2 text-xs font-semibold text-stone-600 first:rounded-t-xl'>
                {dayHeading(group.iso)}
              </h3>
              <ul className='divide-y divide-stone-100'>
                {group.items.map((log, idx) => {
                  const action: string = log.action || log.operation || '';
                  const kind = actionKindOf(action);
                  const actor = actorOf(log);
                  const iso = logTime(log);
                  const changes = parseChanges(log.changesJson);
                  const entityId: string = log.entityId || '';
                  return (
                    <li
                      key={log.id || `${iso}-${idx}`}
                      className='flex items-start gap-3 px-4 py-3 hover:bg-stone-50/60'
                    >
                      <span
                        className='grid size-8 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-bold text-[#C2410C]'
                        aria-hidden='true'
                      >
                        {initialsOf(actor)}
                      </span>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
                          <span
                            className='font-semibold text-stone-900'
                            title={log.userEmail || undefined}
                          >
                            {actor}
                          </span>
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${ACTION_STYLE[kind]}`}
                          >
                            {actionLabel(kind, action)}
                          </span>
                          <span className='text-stone-700'>
                            {entityLabel(log.entityName || '')}
                          </span>
                          {entityId && (
                            <code
                              className='rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-500'
                              title={t('members.audit.idTitle', { id: entityId })}
                            >
                              #{entityId.slice(0, 8)}
                            </code>
                          )}
                        </div>
                        {changes.length > 0 && (
                          <ul className='mt-1.5 flex flex-wrap gap-1.5'>
                            {changes.map((c) => (
                              <li
                                key={c.field}
                                className='inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-xs text-stone-600 ring-1 ring-stone-200/80'
                              >
                                <span className='font-medium text-stone-700'>
                                  {fieldLabel(c.field)}:
                                </span>
                                <span
                                  className='line-through decoration-stone-300'
                                  title={formatChangeValue(c.from).title}
                                >
                                  {formatChangeValue(c.from).text}
                                </span>
                                <ArrowRight className='size-3 text-stone-400' aria-hidden='true' />
                                <span
                                  className='font-semibold text-stone-900'
                                  title={formatChangeValue(c.to).title}
                                >
                                  {formatChangeValue(c.to).text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <time
                        dateTime={iso}
                        title={fullTimeOf(iso)}
                        className='shrink-0 pt-0.5 text-xs tabular-nums text-stone-500'
                      >
                        {timeOf(iso)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
};
