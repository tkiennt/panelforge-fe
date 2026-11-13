// src/shared/features/script-versions/ScriptVersionDiff.tsx
/**
 * So sánh hai phiên bản kịch bản từng dòng kiểu GitHub. Lưu = commit, gửi duyệt = push:
 * mỗi phiên bản ghi rõ đã gửi duyệt hay mới lưu; có thể so với "bản đang viết" (chưa commit).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ScriptVersionRow,
  type ScriptVersionSummaryDto,
} from '@/services/chapter.service';
import {
  diffRows,
  diffStats,
  toHunks,
  EMPTY_BASE,
  WORKING_COPY,
  type RowLabels,
} from './versionDiff';

export interface ScriptVersionDiffProps {
  chapterId: string;
  /** Bản gốc mặc định (cũ hơn). null = phiên bản trước bản "to", hoặc trống nếu không có. */
  defaultFromId?: string | null;
  /** Bản mới mặc định. null = phiên bản mới nhất; `working` = bản đang viết. */
  defaultToId?: string | null;
  /** Cho chọn "Bản đang viết" (Writer). */
  allowWorkingCopy?: boolean;
}

export const ScriptVersionDiff: React.FC<ScriptVersionDiffProps> = ({
  chapterId,
  defaultFromId = null,
  defaultToId = null,
  allowWorkingCopy = false,
}) => {
  const { t, lang } = useTranslation('production');
  const [versions, setVersions] = useState<ScriptVersionSummaryDto[] | null>(null);
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [fromRows, setFromRows] = useState<ScriptVersionRow[] | null>(null);
  const [toRows, setToRows] = useState<ScriptVersionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels: RowLabels = useMemo(
    () => ({
      page: (n) => t('scriptStudio.versions.rowPage', { n }),
      panel: (n) => t('scriptStudio.gn.panel', { n }),
      caption: t('scriptStudio.gn.caption'),
      sfx: t('scriptStudio.gn.sfx'),
      thought: t('scriptStudio.versions.rowThought'),
    }),
    [t],
  );

  // Danh sách phiên bản + chọn mặc định
  useEffect(() => {
    let cancelled = false;
    setError(null);
    chapterService
      .getScriptVersions(chapterId)
      .then((list) => {
        if (cancelled) return;
        setVersions(list);
        const to = defaultToId ?? list[0]?.id ?? (allowWorkingCopy ? WORKING_COPY : '');
        setToId(to);
        if (defaultFromId) {
          setFromId(defaultFromId);
        } else {
          const toIdx = list.findIndex((v) => v.id === to);
          const base = to === WORKING_COPY ? list[0] : toIdx >= 0 ? list[toIdx + 1] : undefined;
          setFromId(base?.id ?? EMPTY_BASE);
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [chapterId, defaultFromId, defaultToId, allowWorkingCopy]);

  // Nạp hàng của một lựa chọn
  const loadRows = async (id: string): Promise<ScriptVersionRow[]> => {
    if (!id || id === EMPTY_BASE) return [];
    if (id === WORKING_COPY) return (await chapterService.getScriptWorkingCopy(chapterId)).rows;
    return (await chapterService.getScriptVersion(chapterId, id)).rows;
  };

  useEffect(() => {
    if (!fromId) return;
    let cancelled = false;
    setFromRows(null);
    loadRows(fromId)
      .then((rows) => !cancelled && setFromRows(rows))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, fromId]);

  useEffect(() => {
    if (!toId) return;
    let cancelled = false;
    setToRows(null);
    loadRows(toId)
      .then((rows) => !cancelled && setToRows(rows))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, toId]);

  const diff = useMemo(
    () => (fromRows && toRows ? diffRows(fromRows, toRows, labels) : null),
    [fromRows, toRows, labels],
  );
  const hunks = useMemo(() => (diff ? toHunks(diff) : []), [diff]);
  const stats = diff ? diffStats(diff) : null;

  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  const optionLabel = (v: ScriptVersionSummaryDto) =>
    `v${v.versionNumber} · ${v.submittedAt ? t('scriptStudio.versions.pushed') : t('scriptStudio.versions.committed')} · ${dateFormat(v.createdAt)}`;

  if (error) return <p className='p-4 text-xs text-rose-700'>{error}</p>;
  if (!versions)
    return (
      <div className='flex items-center gap-2 p-4 text-xs text-stone-500'>
        <Loader2 className='h-4 w-4 animate-spin' /> {t('scriptStudio.versions.loading')}
      </div>
    );
  if (versions.length === 0 && !allowWorkingCopy)
    return <p className='p-4 text-xs text-stone-500'>{t('scriptStudio.versions.none')}</p>;

  const selectCls =
    'min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800';

  return (
    <div className='flex min-h-0 flex-col' data-testid='script-version-diff'>
      <div className='flex flex-wrap items-center gap-2 border-b border-stone-200 px-3 py-2 text-xs'>
        <label className='flex min-w-0 flex-1 items-center gap-1.5'>
          <span className='shrink-0 text-stone-500'>{t('scriptStudio.versions.from')}</span>
          <select className={selectCls} value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value={EMPTY_BASE}>{t('scriptStudio.versions.emptyBase')}</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {optionLabel(v)}
              </option>
            ))}
          </select>
        </label>
        <label className='flex min-w-0 flex-1 items-center gap-1.5'>
          <span className='shrink-0 text-stone-500'>{t('scriptStudio.versions.to')}</span>
          <select className={selectCls} value={toId} onChange={(e) => setToId(e.target.value)}>
            {allowWorkingCopy && (
              <option value={WORKING_COPY}>{t('scriptStudio.versions.working')}</option>
            )}
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {optionLabel(v)}
              </option>
            ))}
          </select>
        </label>
        {stats && (
          <span className='shrink-0 font-mono'>
            <span className='text-emerald-700'>+{stats.added}</span>{' '}
            <span className='text-rose-700'>−{stats.removed}</span>
          </span>
        )}
      </div>

      <div className='min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5'>
        {!diff ? (
          <div className='flex items-center gap-2 p-4 text-xs text-stone-500'>
            <Loader2 className='h-4 w-4 animate-spin' /> {t('scriptStudio.versions.loading')}
          </div>
        ) : hunks.length === 0 ? (
          <p className='p-4 font-sans text-xs text-stone-500'>
            {t('scriptStudio.versions.noChanges')}
          </p>
        ) : (
          hunks.map((h, hi) => (
            <table key={hi} className='w-full border-collapse'>
              <tbody>
                <tr className='bg-sky-50 text-sky-800'>
                  <td colSpan={4} className='px-2 py-0.5'>
                    @@ −{h.oldStart},{h.oldCount} +{h.newStart},{h.newCount} @@
                  </td>
                </tr>
                {h.lines.map((l, li) => {
                  const bg =
                    l.kind === 'add' ? 'bg-emerald-50' : l.kind === 'del' ? 'bg-rose-50' : '';
                  const sign = l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ' ';
                  return (
                    <tr key={li} className={bg}>
                      <td className='w-10 select-none border-r border-stone-200 px-1 text-right text-stone-400'>
                        {l.oldNo ?? ''}
                      </td>
                      <td className='w-10 select-none border-r border-stone-200 px-1 text-right text-stone-400'>
                        {l.newNo ?? ''}
                      </td>
                      <td
                        className={`w-4 select-none px-1 ${l.kind === 'add' ? 'text-emerald-700' : 'text-rose-700'}`}
                      >
                        {sign}
                      </td>
                      <td
                        className={`whitespace-pre-wrap break-words px-1 ${
                          l.rowType === 'page' || l.rowType === 'panel'
                            ? 'font-bold text-stone-900'
                            : 'text-stone-800'
                        }`}
                      >
                        {l.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))
        )}
      </div>
    </div>
  );
};
