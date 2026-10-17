import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, History, Loader2, RotateCcw, X } from 'lucide-react';
import {
  scriptLineService,
  type RestoreScriptRevisionResult,
  type SceneScriptLineSummaryDto,
  type ScriptRevisionDetailDto,
} from '@/services/scriptLine.service';
import { aiAgentsService, type ContentRevisionDto } from '@/services/aiAgents.service';
import {
  diffScriptLines,
  type LineDiffRow,
  type LineDiffStatus,
  type LineLike,
} from './scriptDiff';

const STATUS_STYLE: Record<LineDiffStatus, string> = {
  same: 'border-[#E7E7E7] bg-white',
  changed: 'border-amber-300 bg-amber-50',
  added: 'border-emerald-300 bg-emerald-50',
  removed: 'border-rose-300 bg-rose-50',
};

const STATUS_LABEL: Record<LineDiffStatus, string> = {
  same: 'Giống bản hiện tại',
  changed: 'Khác bản hiện tại',
  added: 'Sẽ được bật lại',
  removed: 'Sẽ bị xoá mềm',
};

interface ScriptHistoryModalProps {
  seriesId: string;
  chapterId: string;
  sceneId: string;
  /** versionVector hiện tại của Chapter, gửi làm expectedChapterVersion (BR-11). */
  chapterVersion: number;
  currentLines: SceneScriptLineSummaryDto[];
  /** Producer/Writer và chương còn InProduction. */
  canRestore: boolean;
  nameById?: Record<string, string>;
  onClose: () => void;
  /** Gọi sau khi khôi phục thành công (cha nạp lại script Scene, chapter và đóng/hiện toast). */
  onRestored: (result: RestoreScriptRevisionResult) => void | Promise<void>;
  /** 409: cha tải lại chapter/scene; modal tự tải lại danh sách và KHÔNG tự gửi lại. */
  onConflict?: (message: string) => void | Promise<void>;
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

/**
 * Lịch sử phiên bản script của Scene (UC-13 / BR-08): xem nội dung từng revision, so với bản hiện tại,
 * và khôi phục (tạo revision mới, không xoá lịch sử). Nút "Khôi phục" ẩn khi `isCurrent`, có hộp xác nhận.
 */
export const ScriptHistoryModal: React.FC<ScriptHistoryModalProps> = ({
  seriesId,
  chapterId,
  sceneId,
  chapterVersion,
  currentLines,
  canRestore,
  nameById = {},
  onClose,
  onRestored,
  onConflict,
}) => {
  const [revisions, setRevisions] = useState<ContentRevisionDto[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScriptRevisionDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const all = await aiAgentsService.getSceneRevisions(seriesId, sceneId);
      const scripts = all
        .filter((r) => r.kind === 'Script')
        .sort((a, b) => b.versionNumber - a.versionNumber);
      setRevisions(scripts);
      setSelectedId((prev) => (prev && scripts.some((r) => r.id === prev) ? prev : null));
    } catch (e: any) {
      setListError(e?.message || 'Không thể tải lịch sử phiên bản.');
    } finally {
      setLoadingList(false);
    }
  }, [seriesId, sceneId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setConfirming(false);
    setActionError(null);
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    scriptLineService
      .getScriptRevision(chapterId, sceneId, selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(e?.message || 'Không thể tải nội dung phiên bản.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, sceneId, selectedId]);

  const rows = useMemo(
    () => (detail ? diffScriptLines(detail.lines, currentLines) : []),
    [detail, currentLines],
  );

  const speaker = (id?: string | null) => (id ? (nameById[id] ?? 'Nhân vật (chưa rõ)') : null);

  const handleRestore = async () => {
    if (!detail) return;
    setRestoring(true);
    setActionError(null);
    try {
      const result = await scriptLineService.restoreScriptRevision(chapterId, sceneId, detail.id, {
        expectedChapterVersion: chapterVersion,
      });
      setConfirming(false);
      await onRestored(result);
      await loadList();
      setSelectedId(null);
    } catch (e: any) {
      if (e?.code === 'CONFLICT' || e?.status === 409) {
        // BR-11 / BR-12: tải lại để người dùng xem bản mới nhất rồi tự bấm lại, không tự gửi lại.
        const msg =
          (e?.message ? `${e.message} ` : '') +
          'Dữ liệu đã được tải lại, vui lòng kiểm tra rồi bấm Khôi phục lại nếu vẫn muốn.';
        setActionError(msg);
        setConfirming(false);
        await onConflict?.(msg);
        await loadList();
      } else {
        setActionError(e?.message || 'Không thể khôi phục phiên bản.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const renderLine = (l: (LineLike & { id: string }) | null, emptyText: string) =>
    l ? (
      <div className='space-y-0.5'>
        <div className='text-xs font-mono text-zinc-600 font-semibold'>
          #{l.lineOrder}
          {speaker(l.speakerCharacterId) ? ` · ${speaker(l.speakerCharacterId)}` : ''}
        </div>
        {l.dialogueText && <div className='text-xs text-[#171717] font-medium'>{l.dialogueText}</div>}
        {l.stageDirection && (
          <div className='text-xs italic text-zinc-500'>({l.stageDirection})</div>
        )}
      </div>
    ) : (
      <div className='text-xs text-zinc-400 italic'>{emptyText}</div>
    );

  // Nhấn Esc để đóng (không đóng khi đang khôi phục để tránh bỏ giữa chừng)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !restoring) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, restoring]);

  // Render ở cấp <body>: khi nằm trong vùng nội dung có transform/overflow, `fixed` bị tính theo vùng đó và tiêu đề + nút đóng trôi ra ngoài màn hình
  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Lịch sử phiên bản kịch bản'
      data-testid='script-history-modal'
      className='fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !restoring) onClose();
      }}
    >
      <div className='bg-[#F8F6F0] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden border border-[#E7E7E7]'>
        <div className='px-5 py-3 bg-white border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <History className='w-4 h-4 text-orange-600' />
            <h2 className='font-bold text-sm text-[#171717]'>Lịch sử phiên bản kịch bản</h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='flex-1 min-h-0 flex flex-col md:flex-row'>
          <aside className='md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#E7E7E7] bg-white overflow-y-auto max-h-48 md:max-h-none'>
            {loadingList ? (
              <div className='p-4 text-xs text-zinc-500 flex items-center gap-2'>
                <Loader2 className='w-3.5 h-3.5 animate-spin' /> Đang tải…
              </div>
            ) : listError ? (
              <div className='p-4 text-xs text-rose-700' role='alert'>
                {listError}
              </div>
            ) : revisions.length === 0 ? (
              <div className='p-4 text-xs text-zinc-500' data-testid='script-history-empty'>
                Scene này chưa có phiên bản script nào.
              </div>
            ) : (
              <ul>
                {revisions.map((r, idx) => (
                  <li key={r.id}>
                    <button
                      type='button'
                      data-testid={`script-revision-${r.id}`}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-4 py-2.5 border-b border-[#F3F3F3] cursor-pointer hover:bg-orange-50 ${
                        selectedId === r.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className='flex items-center gap-1.5'>
                        <span className='font-mono text-xs font-bold'>v{r.versionNumber}</span>
                        {idx === 0 && (
                          <span className='text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800'>
                            Hiện tại
                          </span>
                        )}
                        {r.sourceSuggestionId && (
                          <span className='text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800'>
                            AI
                          </span>
                        )}
                      </div>
                      <div className='text-xs text-zinc-700 line-clamp-2 mt-0.5'>{r.summary}</div>
                      <div className='text-xs text-zinc-500 font-mono mt-0.5'>
                        {fmtDate(r.createdAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className='flex-1 min-w-0 flex flex-col'>
            {!selectedId ? (
              <div className='p-8 text-xs text-zinc-500'>
                Chọn một phiên bản để xem nội dung và so với bản hiện tại.
              </div>
            ) : loadingDetail ? (
              <div className='p-8 text-xs text-zinc-500 flex items-center gap-2'>
                <Loader2 className='w-3.5 h-3.5 animate-spin' /> Đang tải nội dung…
              </div>
            ) : detailError ? (
              <div className='p-8 text-xs text-rose-700' role='alert'>
                {detailError}
              </div>
            ) : detail ? (
              <>
                <div className='px-5 py-3 bg-white border-b border-[#E7E7E7] flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <div className='text-xs font-bold'>
                      v{detail.versionNumber} · {detail.summary}
                    </div>
                    <div className='text-xs text-zinc-500 font-mono'>
                      {fmtDate(detail.createdAt)}
                      {detail.createdBy ? ` · ${detail.createdBy}` : ''}
                    </div>
                  </div>
                  {detail.isCurrent ? (
                    <span
                      data-testid='script-revision-current-badge'
                      className='text-xs font-semibold text-emerald-700'
                    >
                      Đây là bản hiện tại
                    </span>
                  ) : canRestore ? (
                    <button
                      type='button'
                      data-testid='script-restore-btn'
                      disabled={restoring}
                      onClick={() => setConfirming(true)}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl cursor-pointer disabled:opacity-50'
                    >
                      <RotateCcw className='w-3.5 h-3.5' /> Khôi phục phiên bản này
                    </button>
                  ) : null}
                </div>

                {confirming && (
                  <div
                    data-testid='script-restore-confirm'
                    className='mx-5 mt-3 p-3 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-2'
                  >
                    <p>
                      Khôi phục về <strong>v{detail.versionNumber}</strong>? Hệ thống tạo một phiên
                      bản mới có nội dung của bản này; không xoá lịch sử. Đề xuất AI đang chờ có thể
                      thành lỗi thời và chữ lettering gắn dòng bị đổi sẽ hiện lỗi thời.
                    </p>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        data-testid='script-restore-confirm-btn'
                        disabled={restoring}
                        onClick={() => void handleRestore()}
                        className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-600 text-white font-semibold cursor-pointer disabled:opacity-50'
                      >
                        {restoring && <Loader2 className='w-3 h-3 animate-spin' />}
                        Xác nhận khôi phục
                      </button>
                      <button
                        type='button'
                        disabled={restoring}
                        onClick={() => setConfirming(false)}
                        className='px-3 py-1 rounded-lg border border-amber-300 bg-white font-semibold cursor-pointer'
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}

                {actionError && (
                  <div
                    role='alert'
                    data-testid='script-restore-error'
                    className='mx-5 mt-3 p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2'
                  >
                    <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className='flex-1 overflow-y-auto p-5 space-y-2'>
                  <div className='grid grid-cols-2 gap-3 text-xs font-mono font-bold uppercase tracking-wider text-zinc-600'>
                    <span>v{detail.versionNumber}</span>
                    <span>Bản hiện tại</span>
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      data-testid={`script-diff-row-${row.status}`}
                      className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${STATUS_STYLE[row.status]}`}
                    >
                      {renderLine(row.revision, 'Không có trong phiên bản này')}
                      {renderLine(row.current, 'Đã bị xoá ở bản hiện tại')}
                      {row.status !== 'same' && (
                        <div className='col-span-2 text-xs font-semibold text-zinc-600'>
                          {STATUS_LABEL[row.status]}
                        </div>
                      )}
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <p className='text-xs text-zinc-500'>Phiên bản này không có dòng nào.</p>
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
