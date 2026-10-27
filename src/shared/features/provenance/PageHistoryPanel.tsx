import React, { useCallback, useEffect, useState } from 'react';
import { GitCompare, History, Loader2, RotateCcw } from 'lucide-react';
import {
  pageService,
  type PageDto,
  type PageHistoryDto,
  type PageVersionCompareDto,
} from '@/services/page.service';
import { canRestorePage, formatDateTime } from './provenanceRules';

interface PageHistoryPanelProps {
  chapterId: string;
  viewerRole?: string | null;
}

const CHANGE_STYLE: Record<string, string> = {
  Added: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Removed: 'text-rose-700 bg-rose-50 border-rose-200',
  Modified: 'text-amber-700 bg-amber-50 border-amber-200',
};

const CHANGE_LABEL: Record<string, string> = { Added: 'Thêm', Removed: 'Xoá', Modified: 'Sửa' };

/**
 * CF4 4.3 (UC-18, US-12): lịch sử canvas từng trang. Xem các event (mới nhất trước), so sánh một version với hiện tại theo
 * elementId, và khôi phục (Producer/Artist) bằng event mới — không xoá lịch sử. Gửi expectedPageVersion; 409 thì nạp lại.
 */
export const PageHistoryPanel: React.FC<PageHistoryPanelProps> = ({ chapterId, viewerRole }) => {
  const canRestore = canRestorePage(viewerRole);
  const [pages, setPages] = useState<PageDto[] | null>(null);
  const [pageId, setPageId] = useState('');
  const [history, setHistory] = useState<PageHistoryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState<PageVersionCompareDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    pageService.getPagesByChapter(chapterId).then((list) => {
      if (!alive) return;
      const sorted = [...list].sort((a, b) => a.pageNumber - b.pageNumber);
      setPages(sorted);
      setPageId(sorted[0]?.id ?? '');
    });
    return () => {
      alive = false;
    };
  }, [chapterId]);

  const loadHistory = useCallback(async (id: string) => {
    setHistory(null);
    setCompare(null);
    setError(null);
    try {
      setHistory(await pageService.getPageHistory(id, 1, 100));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (pageId) loadHistory(pageId);
  }, [pageId, loadHistory]);

  const handleCompare = async (version: number) => {
    if (!history) return;
    setBusy(true);
    setError(null);
    try {
      setCompare(await pageService.comparePageVersions(pageId, version, history.currentVersion));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!history) return;
    if (!window.confirm(`Khôi phục trang về phiên bản v${version}? Lịch sử cũ vẫn được giữ.`))
      return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await pageService.restorePageVersion(pageId, version, history.currentVersion);
      setNotice(
        r.changes === 0
          ? `Trang đã giống bản v${version}, không có gì thay đổi.`
          : `Đã khôi phục về v${version} (${r.changes} thay đổi, phiên bản mới v${r.newVersion}).`,
      );
      await loadHistory(pageId);
    } catch (e: any) {
      // Nạp lại trước (loadHistory xoá lỗi cũ) rồi mới báo; không tự gửi lại
      if (e.code === 'CONFLICT') await loadHistory(pageId);
      setError(
        e.code === 'CONFLICT'
          ? 'Trang vừa được người khác sửa. Đã nạp lại lịch sử, hãy kiểm tra rồi thử lại.'
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };

  if (!pages) {
    return (
      <div className='py-12 flex justify-center'>
        <Loader2 className='w-5 h-5 animate-spin text-orange-500' />
      </div>
    );
  }
  if (pages.length === 0) {
    return (
      <div className='py-12 text-center text-xs text-[#888888]'>Chương chưa có trang nào.</div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2 text-xs'>
        <History className='w-4 h-4 text-orange-500' />
        <label htmlFor='page-history-select' className='font-semibold text-[#171717]'>
          Trang
        </label>
        <select
          id='page-history-select'
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className='border border-[#E7E7E7] rounded-lg px-2 py-1 bg-white'
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              Trang {p.pageNumber}
            </option>
          ))}
        </select>
        {history && (
          <span className='text-[#737373]'>Phiên bản hiện tại: v{history.currentVersion}</span>
        )}
      </div>

      {error && (
        <div
          role='alert'
          className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'
        >
          {error}
        </div>
      )}
      {notice && (
        <div className='p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl'>
          {notice}
        </div>
      )}

      {compare && (
        <div
          className='p-3 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] text-xs space-y-2'
          data-testid='page-compare'
        >
          <div className='font-semibold text-[#171717]'>
            So sánh v{compare.left} → v{compare.right}: +{compare.added} / −{compare.removed} / ~
            {compare.modified}
            {compare.canvasChanged && ' · khổ canvas đổi'}
          </div>
          {compare.elements.length === 0 ? (
            <div className='text-[#737373]'>Không có khác biệt element.</div>
          ) : (
            <ul className='space-y-1'>
              {compare.elements.map((d) => (
                <li key={d.elementId} className='flex items-center gap-2'>
                  <span
                    className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${CHANGE_STYLE[d.change]}`}
                  >
                    {CHANGE_LABEL[d.change]}
                  </span>
                  <span className='font-mono text-[11px]'>{d.elementType}</span>
                  <span className='text-[#737373]'>{d.elementId.slice(0, 8)}</span>
                  {d.changedFields.length > 0 && (
                    <span className='text-[#555555]'>({d.changedFields.join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!history ? (
        !error && (
          <div className='py-8 flex justify-center'>
            <Loader2 className='w-5 h-5 animate-spin text-orange-500' />
          </div>
        )
      ) : (
        <ul className='divide-y divide-[#E7E7E7] border border-[#E7E7E7] rounded-xl'>
          {history.items.map((h) => (
            <li
              key={h.version}
              className='p-2.5 flex items-center gap-3 text-xs'
              data-testid={`page-event-${h.version}`}
            >
              <span className='font-mono font-bold text-[#171717] w-10 shrink-0'>v{h.version}</span>
              <div className='flex-1 min-w-0'>
                <div className='text-[#171717] truncate'>{h.summary}</div>
                <div className='text-[11px] text-[#737373]'>
                  {h.actorName || 'Hệ thống'} · {formatDateTime(h.occurredAtUtc)}
                </div>
              </div>
              {h.version < history.currentVersion && (
                <div className='flex gap-1 shrink-0'>
                  <button
                    type='button'
                    disabled={busy}
                    onClick={() => handleCompare(h.version)}
                    className='px-2 py-1 rounded border border-[#E7E7E7] text-[#555555] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50'
                  >
                    <GitCompare className='w-3.5 h-3.5' /> So với hiện tại
                  </button>
                  {canRestore && (
                    <button
                      type='button'
                      disabled={busy}
                      onClick={() => handleRestore(h.version)}
                      className='px-2 py-1 rounded border border-orange-300 text-orange-700 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50'
                    >
                      <RotateCcw className='w-3.5 h-3.5' /> Khôi phục
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
