import React, { useState, useMemo } from 'react';
import { X, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type {
  ChapterDto,
  ScriptCommentDto,
  ScriptVersionDetailDto,
  ScriptVersionRow,
} from '@/services/chapter.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { ScriptCommentItemCard } from './ScriptCommentCard';
import { ScriptVersionDiff } from '@/shared/features/script-versions/ScriptVersionDiff';
import { EMPTY_BASE, rowLineId } from '@/shared/features/script-versions/versionDiff';

export interface ScriptReviewSidePanelProps {
  chapter: ChapterDto | null;
  comments: ScriptCommentDto[];
  pushedVersion?: ScriptVersionDetailDto | null;
  liveRows?: ScriptVersionRow[];
  activeLineId?: string | null;
  canResolve?: boolean;
  onResolveComment?: (commentId: string) => Promise<void> | void;
  onSelectComment?: (comment: ScriptCommentDto) => void;
  onClose?: () => void;
  findings?: ConsistencyFindingDto[];
  onRunCheck?: () => Promise<void> | void;
  loadingCheck?: boolean;
  className?: string;
  initialTab?: 'comments' | 'changes' | 'checks';
}

export const ScriptReviewSidePanel: React.FC<ScriptReviewSidePanelProps> = ({
  chapter,
  comments,
  pushedVersion,
  liveRows = [],
  activeLineId,
  canResolve = false,
  onResolveComment,
  onSelectComment,
  onClose,
  findings = [],
  onRunCheck,
  loadingCheck = false,
  className = '',
  initialTab = 'comments',
}) => {
  const [tab, setTab] = useState<'comments' | 'changes' | 'checks'>(initialTab);

  const openCommentsCount = useMemo(
    () => comments.filter((c) => !c.resolvedAt).length,
    [comments],
  );

  // Tra cứu hàng theo scriptLineId
  const lineIndex = useMemo(() => {
    const map = new Map<string, ScriptVersionRow>();
    const rows = pushedVersion?.rows ?? liveRows;
    rows.forEach((r) => {
      const id = rowLineId(r);
      if (id) map.set(id, r);
    });
    return map;
  }, [pushedVersion?.rows, liveRows]);

  const getLocationLabel = (c: ScriptCommentDto): string => {
    if (!c.scriptLineId) return 'Góp ý chung';
    const row = lineIndex.get(c.scriptLineId);
    if (!row) return 'Góp ý chung';
    return row.panel > 0 ? `Trang ${row.page} · Panel ${row.panel}` : `Trang ${row.page}`;
  };

  const getStaleness = (c: ScriptCommentDto): 'removed' | 'changed' | null => {
    if (!c.scriptLineId) return null;
    const row = lineIndex.get(c.scriptLineId);
    if (!row && pushedVersion) return 'removed';
    if (row && c.quotedText && row.text && !row.text.includes(c.quotedText)) return 'changed';
    return null;
  };

  return (
    <aside
      data-testid='script-review-side-panel'
      className={`flex flex-col h-full bg-white border-l border-stone-200 shrink-0 w-full lg:w-[28rem] min-h-0 select-none ${className}`}
    >
      {/* Tab bar */}
      <div className='flex items-center justify-between border-b border-stone-200 px-2 shrink-0 bg-white'>
        <div role='tablist' className='flex gap-1'>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'comments'}
            onClick={() => setTab('comments')}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              tab === 'comments'
                ? 'border-orange-500 text-orange-800'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Góp ý ({openCommentsCount})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'changes'}
            onClick={() => setTab('changes')}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              tab === 'changes'
                ? 'border-orange-500 text-orange-800'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Thay đổi
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'checks'}
            onClick={() => setTab('checks')}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              tab === 'checks'
                ? 'border-orange-500 text-orange-800'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Kiểm tra
          </button>
        </div>

        {onClose && (
          <button
            type='button'
            onClick={onClose}
            title='Đóng bảng nhận xét'
            className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors mr-1'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
        {tab === 'comments' ? (
          comments.length === 0 ? (
            <div className='p-8 text-center text-xs text-stone-500'>
              Chưa có góp ý nào từ Biên tập viên cho chương này.
            </div>
          ) : (
            <div className='p-3 space-y-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar'>
              {comments.map((c) => {
                const location = getLocationLabel(c);
                const stale = getStaleness(c);
                const isSelected = activeLineId === c.scriptLineId;
                return (
                  <div key={c.id} className='space-y-1.5'>
                    <div className='flex items-center justify-between px-1 text-xs text-stone-500'>
                      <span className='font-semibold text-stone-700'>{location}</span>
                      {stale && (
                        <span className='rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800'>
                          {stale === 'removed' ? 'Dòng đã bị xoá' : 'Nội dung đã đổi'}
                        </span>
                      )}
                    </div>
                    <ScriptCommentItemCard
                      comment={c}
                      canResolve={canResolve}
                      onResolve={onResolveComment}
                      isSelected={isSelected}
                      onSelect={() => onSelectComment?.(c)}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : tab === 'changes' ? (
          chapter?.id && pushedVersion ? (
            <>
              <p className='border-b border-stone-200 px-3 py-2 text-xs text-stone-500'>
                {chapter.previousSubmittedVersionId
                  ? 'So sánh với bản gửi duyệt trước đó'
                  : 'Bản gửi duyệt đầu tiên của chương'}
              </p>
              <ScriptVersionDiff
                key={`${chapter.previousSubmittedVersionId ?? EMPTY_BASE}>${pushedVersion.version.id}`}
                chapterId={chapter.id}
                defaultFromId={chapter.previousSubmittedVersionId ?? EMPTY_BASE}
                defaultToId={pushedVersion.version.id}
              />
            </>
          ) : (
            <div className='p-8 text-center text-xs text-stone-500'>
              Chưa có bản gửi duyệt nào để đối chiếu thay đổi.
            </div>
          )
        ) : (
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>Kiểm tra nhất quán</h3>
                <p className='text-xs text-stone-500 mt-0.5'>
                  Luật kiểm tra tính nhất quán dòng thoại và thực thể Bible.
                </p>
              </div>
              {onRunCheck && (
                <button
                  type='button'
                  onClick={() => void onRunCheck()}
                  disabled={loadingCheck}
                  className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 cursor-pointer transition-colors shrink-0'
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${loadingCheck ? 'animate-spin text-orange-600' : ''}`}
                  />
                  <span>Kiểm tra lại</span>
                </button>
              )}
            </div>

            {findings.length === 0 ? (
              <div className='p-6 text-center text-xs text-stone-500 rounded-xl bg-stone-50 border border-stone-200/60'>
                <CheckCircle2 className='w-5 h-5 text-emerald-600 mx-auto mb-1.5' />
                Không phát hiện vấn đề nhất quán nào.
              </div>
            ) : (
              <ul className='space-y-2'>
                {findings.map((f) => (
                  <li
                    key={f.id}
                    onClick={() =>
                      f.scriptLineId &&
                      onSelectComment?.({
                        id: f.id,
                        scriptLineId: f.scriptLineId,
                      } as any)
                    }
                    className='p-3 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-amber-50/50 hover:border-amber-300 transition-colors cursor-pointer text-xs'
                  >
                    <div className='flex items-center justify-between text-stone-700 font-semibold mb-1'>
                      <span className='inline-flex items-center gap-1.5 text-amber-700'>
                        <ShieldCheck className='w-3.5 h-3.5' />
                        {f.ruleCode || 'Vấn đề'}
                      </span>
                      <span className='text-[11px] text-stone-400'>{f.status}</span>
                    </div>
                    <p className='text-stone-800'>{f.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
