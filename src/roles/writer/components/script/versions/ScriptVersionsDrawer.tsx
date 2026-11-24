// src/roles/writer/components/script/versions/ScriptVersionsDrawer.tsx
/**
 * Lịch sử commit của kịch bản chương (Lưu = commit, Gửi duyệt = push), hiện như git log:
 * mã băm rút gọn, ghi chú, thời gian, nhãn bản đang gửi duyệt. Chọn một bản để xem diff với bản trước nó,
 * hoặc "So với bản đã gửi duyệt" để xem những gì Writer đã sửa sau lần push gần nhất.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  GitCommitVertical,
  GitCompare,
  History,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { chapterService, type ScriptVersionSummaryDto } from '@/services/chapter.service';
import { aiAgentsService, type ContentRevisionDto } from '@/services/aiAgents.service';
import { scriptLineService, type RestoreScriptRevisionResult } from '@/services/scriptLine.service';
import { ScriptVersionDiff } from '@/shared/features/script-versions/ScriptVersionDiff';
import { EMPTY_BASE, WORKING_COPY, shortHash } from '@/shared/features/script-versions/versionDiff';

interface ScriptVersionsDrawerProps {
  chapterId: string;
  seriesId?: string;
  sceneId?: string | null;
  chapterVersion?: number;
  canRestore?: boolean;
  /** Bản đang gửi duyệt (push) — Editor đọc bản này. */
  pushedVersionId?: string | null;
  /** Đổi giá trị để nạp lại danh sách (sau mỗi lần lưu / gửi duyệt / khôi phục). */
  refreshKey?: unknown;
  onRestored?: (result: RestoreScriptRevisionResult) => void | Promise<void>;
  onConflict?: (message: string) => void | Promise<void>;
  onClose: () => void;
}

type Selection = { from: string; to: string } | null;

export const ScriptVersionsDrawer: React.FC<ScriptVersionsDrawerProps> = ({
  chapterId,
  seriesId,
  sceneId,
  chapterVersion,
  canRestore = false,
  pushedVersionId,
  refreshKey,
  onRestored,
  onConflict,
  onClose,
}) => {
  const { t, lang } = useTranslation('production');
  const [versions, setVersions] = useState<ScriptVersionSummaryDto[] | null>(null);
  const [sceneRevisions, setSceneRevisions] = useState<ContentRevisionDto[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  const loadSceneRevisions = useCallback(async () => {
    if (!seriesId || !sceneId) {
      setSceneRevisions([]);
      return;
    }
    try {
      const list = await aiAgentsService.getSceneRevisions(seriesId, sceneId);
      setSceneRevisions(
        (list ?? [])
          .filter((r) => r.kind === 'Script')
          .sort((a, b) => b.versionNumber - a.versionNumber),
      );
    } catch {
      setSceneRevisions([]);
    }
  }, [seriesId, sceneId]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    chapterService
      .getScriptVersions(chapterId)
      .then((list) => !cancelled && setVersions(list))
      .catch((err) => !cancelled && setError(err.message));
    void loadSceneRevisions();
    return () => {
      cancelled = true;
    };
  }, [chapterId, refreshKey, loadSceneRevisions]);

  const handleRestoreRevision = async (revisionId: string) => {
    if (!sceneId || restoringId) return;
    setRestoringId(revisionId);
    setRestoreError(null);
    try {
      const res = await scriptLineService.restoreScriptRevision(chapterId, sceneId, revisionId, {
        expectedChapterVersion: chapterVersion,
      });
      await onRestored?.(res);
      if (!onRestored) {
        const freshVersions = await chapterService.getScriptVersions(chapterId).catch(() => null);
        if (freshVersions) setVersions(freshVersions);
        await loadSceneRevisions();
      }
    } catch (err: any) {
      if (err?.code === 'CONFLICT' || err?.status === 409) {
        const msg = t('scriptStudio.versions.restoreConflict');
        setRestoreError(msg);
        await onConflict?.(msg);
        await loadSceneRevisions();
      } else {
        setRestoreError(err?.message || t('scriptStudio.gn.saveFailed'));
      }
    } finally {
      setRestoringId(null);
    }
  };

  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pushed = versions?.find((v) => v.id === pushedVersionId);
  const head = versions?.[0];
  const hasUnpushed = !!head && !!pushed && head.contentHash !== pushed.contentHash;

  return (
    <div
      data-testid='script-versions-drawer'
      className='flex h-full w-full shrink-0 flex-col border-l border-[#D8D2C5] bg-[#FCFBF8] shadow-lg xl:w-[460px] 2xl:w-[520px]'
    >
      <div className='flex items-center justify-between gap-3 border-b border-[#D8D2C5] bg-[#F8F6F0] p-4'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <div className='shrink-0 rounded-xl border border-[#F97316]/20 bg-[#FFF2E6] p-2 text-[#C2410C]'>
            <History className='h-4 w-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='truncate font-serif text-sm font-bold text-[#1C1917]'>
              {t('scriptStudio.versions.title')}
            </h3>
            <p className='truncate text-xs text-[#57534E]'>
              {t('scriptStudio.versions.drawerSubtitle')}
            </p>
          </div>
        </div>
        <button
          type='button'
          onClick={onClose}
          aria-label={t('scriptStudio.versions.close')}
          className='cursor-pointer rounded-lg p-1.5 text-[#57534E] transition-colors hover:bg-[#F3F0E9] hover:text-[#1C1917]'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {selection ? (
        <div className='flex min-h-0 flex-1 flex-col'>
          <button
            type='button'
            onClick={() => setSelection(null)}
            className='flex items-center gap-1.5 border-b border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            {t('scriptStudio.versions.back')}
          </button>
          <ScriptVersionDiff
            key={`${selection.from}>${selection.to}:${String(refreshKey ?? '')}`}
            chapterId={chapterId}
            defaultFromId={selection.from}
            defaultToId={selection.to}
            allowWorkingCopy
          />
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='border-b border-stone-200 p-3'>
            <button
              type='button'
              data-testid='compare-with-pushed-btn'
              disabled={!pushedVersionId}
              onClick={() =>
                pushedVersionId && setSelection({ from: pushedVersionId, to: WORKING_COPY })
              }
              className='flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:border-orange-300 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <GitCompare className='h-3.5 w-3.5' />
              {t('scriptStudio.versions.compareWithPushed')}
            </button>
            {hasUnpushed && (
              <p className='mt-2 text-xs text-amber-800'>{t('scriptStudio.versions.unpushed')}</p>
            )}
          </div>

          {sceneRevisions.length > 0 && (
            <div className='border-b border-stone-200 p-3'>
              <p className='mb-2 text-xs font-bold uppercase tracking-wider text-stone-500'>
                {t('scriptStudio.versions.sceneRevisionsTitle')}
              </p>
              {restoreError && (
                <div
                  role='alert'
                  className='mb-2 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800'
                >
                  <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <span>{restoreError}</span>
                </div>
              )}
              <ul className='space-y-1.5'>
                {sceneRevisions.map((rev, idx) => {
                  const isCurrent = idx === 0;
                  const isRestoring = restoringId === rev.id;
                  return (
                    <li
                      key={rev.id}
                      className='flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs'
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5'>
                          <span className='font-semibold text-stone-900'>v{rev.versionNumber}</span>
                          {isCurrent && (
                            <span className='rounded-full bg-emerald-100 px-1.5 py-px text-xs font-bold text-emerald-800'>
                              {t('scriptStudio.versions.currentBadge')}
                            </span>
                          )}
                        </div>
                        <p className='mt-0.5 truncate text-stone-600'>
                          {rev.summary || t('scriptStudio.versions.noMessage')}
                        </p>
                      </div>
                      {!isCurrent && canRestore && (
                        <button
                          type='button'
                          data-testid={`restore-script-revision-${rev.id}`}
                          disabled={!!restoringId}
                          onClick={() => void handleRestoreRevision(rev.id)}
                          className='inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {isRestoring ? (
                            <Loader2 className='h-3 w-3 animate-spin' />
                          ) : (
                            <RotateCcw className='h-3 w-3' />
                          )}
                          <span>
                            {isRestoring
                              ? t('scriptStudio.versions.restoring')
                              : t('scriptStudio.versions.restoreBtn')}
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error ? (
            <p className='p-4 text-xs text-rose-700'>{error}</p>
          ) : !versions ? (
            <div className='flex items-center gap-2 p-4 text-xs text-stone-500'>
              <Loader2 className='h-4 w-4 animate-spin' /> {t('scriptStudio.versions.loading')}
            </div>
          ) : versions.length === 0 ? (
            <p className='p-4 text-xs text-stone-500'>{t('scriptStudio.versions.none')}</p>
          ) : (
            <ol className='py-1'>
              {versions.map((v, i) => {
                const parent = versions[i + 1];
                const isPushed = v.id === pushedVersionId;
                return (
                  <li key={v.id}>
                    <button
                      type='button'
                      title={t('scriptStudio.versions.viewChanges')}
                      onClick={() => setSelection({ from: parent?.id ?? EMPTY_BASE, to: v.id })}
                      className={`flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-stone-50 ${
                        isPushed ? 'bg-orange-50/60' : ''
                      }`}
                    >
                      <GitCommitVertical
                        className={`mt-0.5 h-4 w-4 shrink-0 ${isPushed ? 'text-orange-600' : 'text-stone-400'}`}
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-1.5 text-xs'>
                          <span className='font-semibold text-stone-900'>v{v.versionNumber}</span>
                          <code className='rounded bg-stone-100 px-1 font-mono text-xs text-stone-600'>
                            #{shortHash(v.contentHash)}
                          </code>
                          {isPushed && (
                            <span className='rounded-full bg-orange-600 px-1.5 py-px text-xs font-bold text-white'>
                              {t('scriptStudio.versions.pushedBadge')}
                            </span>
                          )}
                          {i === 0 && !isPushed && (
                            <span className='rounded-full border border-stone-300 px-1.5 py-px text-xs font-bold text-stone-600'>
                              {t('scriptStudio.versions.head')}
                            </span>
                          )}
                        </div>
                        <p className='mt-0.5 truncate text-xs text-stone-700'>
                          {v.message || t('scriptStudio.versions.noMessage')}
                        </p>
                        <p className='mt-0.5 text-xs text-stone-400'>
                          {v.authorName ?? ''} · {dateFormat(v.createdAt)} ·{' '}
                          {v.submittedAt
                            ? t('scriptStudio.versions.pushed')
                            : t('scriptStudio.versions.committed')}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};
