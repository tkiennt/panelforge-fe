import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import type { AssignmentDto } from '@/types';
import {
  buildChanges,
  emptyDraftItem,
  errorMessage,
  isRegionInputValid,
  type DraftItem,
  type WorkActions,
} from './collaborationRules';

interface ReviewDecisionPanelProps {
  chapterId: string;
  assignment: AssignmentDto;
  actions: Pick<WorkActions, 'canOpenReview' | 'canDecide' | 'approveBlockedReason'>;
  onChanged: (updated?: AssignmentDto) => void;
  onToast?: (title: string, desc: string) => void;
}

/**
 * Cổng duyệt của Editor/Producer (CF3 bước 2, 6, 7): mở review, duyệt, hoặc trả về kèm comment bắt buộc (BR-06)
 * và danh sách yêu cầu sửa (mỗi yêu cầu có thể khoanh vùng theo phần trăm của ảnh).
 */
export const ReviewDecisionPanel: React.FC<ReviewDecisionPanelProps> = ({
  chapterId,
  assignment,
  actions,
  onChanged,
  onToast,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [nextKey, setNextKey] = useState(1);

  if (!actions.canOpenReview && !actions.canDecide) return null;

  const run = async (action: () => Promise<AssignmentDto>, doneTitle: string, doneDesc: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      onToast?.(doneTitle, doneDesc);
      setReturning(false);
      setComment('');
      setItems([]);
      onChanged(updated);
    } catch (err) {
      const msg = errorMessage(err, 'Thao tác thất bại.');
      setError(msg);
      onToast?.('Không thể thực hiện', msg);
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (key: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Mỗi dòng đã nhập mô tả mà vùng nhập dở/sai thì chặn gửi, để không bị Backend trả 400
  const itemsValid = items.every((i) => i.description.trim() === '' || isRegionInputValid(i));
  const canSendReturn = comment.trim() !== '' && itemsValid;

  return (
    <div
      className='p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5'
      data-testid='review-decision-panel'
    >
      <div className='text-[11px] font-bold text-indigo-900 flex items-center gap-1.5'>
        <Search className='w-3.5 h-3.5' />
        Xét duyệt công đoạn
      </div>

      {error && (
        <div
          role='alert'
          className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-center gap-1.5'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {actions.canOpenReview && (
        <button
          type='button'
          disabled={busy}
          onClick={() =>
            void run(
              () => assignmentService.openReview(chapterId, assignment.id),
              'Đã mở xét duyệt',
              'Việc chuyển sang UnderReview.',
            )
          }
          className='px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer'
        >
          {busy ? <Loader2 className='w-3 h-3 animate-spin' /> : <Search className='w-3 h-3' />}
          Mở xét duyệt
        </button>
      )}

      {actions.canDecide && !returning && (
        <div className='space-y-1.5'>
          {actions.approveBlockedReason && (
            <p className='text-[11px] text-amber-700 flex items-start gap-1.5'>
              <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
              <span>{actions.approveBlockedReason}</span>
            </p>
          )}
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              disabled={busy || !!actions.approveBlockedReason}
              title={actions.approveBlockedReason ?? 'Duyệt cổng, mở công đoạn kế tiếp'}
              onClick={() =>
                void run(
                  () => assignmentService.approveAssignment(chapterId, assignment.id),
                  'Đã duyệt',
                  'Công đoạn kế tiếp của các Panel này đã mở.',
                )
              }
              className='px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {busy ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <CheckCircle2 className='w-3 h-3' />
              )}
              Duyệt
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => setReturning(true)}
              className='px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer'
            >
              <RotateCcw className='w-3 h-3' />
              Trả về để sửa
            </button>
          </div>
        </div>
      )}

      {actions.canDecide && returning && (
        <div className='space-y-2' data-testid='return-form'>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            aria-label='Lý do trả về'
            placeholder='Lý do trả về (bắt buộc)'
            className='w-full p-2 border border-[#E7E7E7] rounded-lg text-[11px] bg-white focus:outline-none focus:border-[#F97316]'
          />

          {items.map((item, index) => (
            <div
              key={item.key}
              className='p-2 bg-white border border-[#E7E7E7] rounded-lg space-y-1.5'
            >
              <div className='flex gap-2'>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  aria-label={`Mô tả yêu cầu sửa ${index + 1}`}
                  placeholder={`Yêu cầu sửa ${index + 1}: cần sửa gì?`}
                  className='flex-1 px-2 py-1 border border-[#E7E7E7] rounded text-[11px]'
                />
                <button
                  type='button'
                  aria-label={`Xoá yêu cầu sửa ${index + 1}`}
                  onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  className='p-1 text-zinc-500 hover:text-red-600 cursor-pointer'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>
              <div className='flex flex-wrap items-center gap-1.5 text-[10px] text-[#737373] font-mono'>
                <span>Vùng (% ảnh, tuỳ chọn):</span>
                {(['x', 'y', 'w', 'h'] as const).map((field) => (
                  <input
                    key={field}
                    value={item[field]}
                    onChange={(e) => updateItem(item.key, { [field]: e.target.value })}
                    aria-label={`Vùng ${field} của yêu cầu sửa ${index + 1}`}
                    placeholder={field}
                    inputMode='decimal'
                    className='w-12 px-1.5 py-0.5 border border-[#E7E7E7] rounded text-center'
                  />
                ))}
                <span>Hạn:</span>
                <input
                  type='date'
                  value={item.dueDate}
                  onChange={(e) => updateItem(item.key, { dueDate: e.target.value })}
                  aria-label={`Hạn của yêu cầu sửa ${index + 1}`}
                  className='px-1.5 py-0.5 border border-[#E7E7E7] rounded'
                />
              </div>
              {item.description.trim() !== '' && !isRegionInputValid(item) && (
                <p className='text-[10px] text-red-600'>
                  Vùng phải nhập đủ x, y, rộng, cao (0–100), rộng và cao &gt; 0, không vượt khỏi
                  ảnh.
                </p>
              )}
            </div>
          ))}

          <button
            type='button'
            onClick={() => {
              setItems((prev) => [...prev, emptyDraftItem(nextKey)]);
              setNextKey((k) => k + 1);
            }}
            className='px-2.5 py-1 rounded-lg border border-dashed border-zinc-400 text-[11px] font-semibold flex items-center gap-1 hover:bg-white cursor-pointer'
          >
            <Plus className='w-3 h-3' />
            Thêm yêu cầu sửa cụ thể
          </button>
          <p className='text-[10px] text-[#888888]'>
            Không thêm yêu cầu nào thì hệ thống tạo một yêu cầu sửa từ chính lý do trả về.
          </p>

          <div className='flex gap-2'>
            <button
              type='button'
              disabled={busy || !canSendReturn}
              onClick={() =>
                void run(
                  () =>
                    assignmentService.requestChanges(chapterId, assignment.id, {
                      comment: comment.trim(),
                      changes: buildChanges(items).length > 0 ? buildChanges(items) : undefined,
                    }),
                  'Đã trả về để sửa',
                  'Người nhận sẽ nhận được thông báo.',
                )
              }
              className='px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {busy && <Loader2 className='w-3 h-3 animate-spin' />}
              Gửi trả về
            </button>
            <button
              type='button'
              onClick={() => setReturning(false)}
              className='px-3 py-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[11px] font-semibold cursor-pointer'
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
