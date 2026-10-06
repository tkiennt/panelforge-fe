import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareWarning } from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import type { ChangeRequestDto } from '@/types';
import { describeRegion, errorMessage, isOverdue, isReviewerRole } from './collaborationRules';

interface ChangeRequestPanelProps {
  chapterId: string;
  changeRequests: ChangeRequestDto[];
  userId?: string | null;
  workspaceRole?: string | null;
  onChanged: () => void;
  onToast?: (title: string, desc: string) => void;
}

type Form = { id: string; kind: 'resolve' | 'reopen' | 'reject' };

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  Open: { label: 'Cần sửa', className: 'bg-red-50 text-red-700 border-red-200' },
  Resolved: {
    label: 'Đã sửa, chờ xác minh',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Verified: {
    label: 'Đã xác minh',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Rejected: {
    label: 'Đã đóng (không sửa)',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
};

const FORM_LABEL: Record<
  Form['kind'],
  { placeholder: string; confirm: string; required: boolean }
> = {
  resolve: {
    placeholder: 'Ghi chú đã sửa gì (tuỳ chọn)',
    confirm: 'Xác nhận đã sửa',
    required: false,
  },
  reopen: { placeholder: 'Vì sao chưa đạt? (bắt buộc)', confirm: 'Mở lại', required: true },
  reject: {
    placeholder: 'Lý do chấp nhận phản đối, không sửa (bắt buộc)',
    confirm: 'Đóng yêu cầu',
    required: true,
  },
};

/**
 * Yêu cầu sửa của một việc (CF3 bước 7–9). Người chịu trách nhiệm bấm "Đã sửa"; Editor/Producer (khác người chịu trách nhiệm)
 * xác minh, mở lại hoặc đóng. Quyền thật do Backend kiểm, nút chỉ ẩn/hiện cho đúng người.
 */
export const ChangeRequestPanel: React.FC<ChangeRequestPanelProps> = ({
  chapterId,
  changeRequests,
  userId,
  workspaceRole,
  onChanged,
  onToast,
}) => {
  const [form, setForm] = useState<Form | null>(null);
  const [text, setText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (changeRequests.length === 0) return null;

  const reviewer = isReviewerRole(workspaceRole);

  const run = async (cr: ChangeRequestDto, action: () => Promise<unknown>, doneTitle: string) => {
    setBusyId(cr.id);
    setError(null);
    try {
      await action();
      onToast?.(doneTitle, cr.description);
      setForm(null);
      setText('');
      onChanged();
    } catch (err) {
      const msg = errorMessage(err, 'Thao tác thất bại.');
      setError(msg);
      onToast?.('Không thể thực hiện', msg);
    } finally {
      setBusyId(null);
    }
  };

  const openForm = (id: string, kind: Form['kind']) => {
    setForm({ id, kind });
    setText('');
    setError(null);
  };

  const confirm = (cr: ChangeRequestDto) => {
    if (!form) return;
    const value = text.trim();
    if (form.kind === 'resolve')
      return run(
        cr,
        () => assignmentService.resolveChangeRequest(chapterId, cr.id, value || undefined),
        'Đã báo sửa xong',
      );
    if (form.kind === 'reopen')
      return run(
        cr,
        () => assignmentService.reopenChangeRequest(chapterId, cr.id, value),
        'Đã mở lại yêu cầu',
      );
    return run(
      cr,
      () => assignmentService.rejectChangeRequest(chapterId, cr.id, value),
      'Đã đóng yêu cầu',
    );
  };

  return (
    <div className='space-y-2' data-testid='change-request-panel'>
      <div className='flex items-center gap-1.5 text-[11px] font-bold text-[#171717]'>
        <MessageSquareWarning className='w-3.5 h-3.5 text-[#F97316]' />
        <span>Yêu cầu sửa ({changeRequests.length})</span>
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

      <ul className='space-y-2'>
        {changeRequests.map((cr) => {
          const st = String(cr.status);
          const style = STATUS_STYLE[st] ?? STATUS_STYLE.Open;
          const region = describeRegion(cr.regionJson);
          const isResponsible = !!userId && cr.responsibleUserId === userId;
          const canReview = reviewer && !isResponsible;
          const overdue = st === 'Open' && isOverdue(cr.dueDate);
          const active = form?.id === cr.id ? form : null;

          return (
            <li
              key={cr.id}
              className='p-2.5 rounded-lg bg-white border border-[#E7E7E7] text-[11px] space-y-1.5'
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='text-[#171717] font-medium leading-relaxed'>{cr.description}</p>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold text-[10px] shrink-0 ${style.className}`}
                >
                  {style.label}
                </span>
              </div>

              {(region || cr.dueDate) && (
                <div className='flex flex-wrap gap-x-3 text-[#737373] font-mono'>
                  {region && <span>Vùng: {region}</span>}
                  {cr.dueDate && (
                    <span className={overdue ? 'text-red-600 font-bold' : ''}>
                      Hạn {new Date(cr.dueDate).toLocaleDateString('vi-VN')}
                      {overdue ? ' (quá hạn)' : ''}
                    </span>
                  )}
                </div>
              )}

              {cr.resolutionNote && (
                <p className='text-[#555555]'>
                  <strong>Ghi chú sửa:</strong> {cr.resolutionNote}
                </p>
              )}
              {cr.reviewerComment && (
                <p className='text-[#555555]'>
                  <strong>Phản hồi của Editor:</strong> {cr.reviewerComment}
                </p>
              )}

              {active ? (
                <div className='space-y-1.5 pt-1'>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={FORM_LABEL[active.kind].placeholder}
                    rows={2}
                    aria-label={FORM_LABEL[active.kind].placeholder}
                    className='w-full p-2 border border-[#E7E7E7] rounded-lg text-[11px] focus:outline-none focus:border-[#F97316]'
                  />
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => void confirm(cr)}
                      disabled={
                        busyId === cr.id || (FORM_LABEL[active.kind].required && text.trim() === '')
                      }
                      className='px-2.5 py-1 rounded-lg bg-[#171717] text-white font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1'
                    >
                      {busyId === cr.id && <Loader2 className='w-3 h-3 animate-spin' />}
                      {FORM_LABEL[active.kind].confirm}
                    </button>
                    <button
                      type='button'
                      onClick={() => setForm(null)}
                      className='px-2.5 py-1 rounded-lg border border-[#E7E7E7] font-semibold cursor-pointer'
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                <div className='flex flex-wrap gap-2 pt-0.5'>
                  {st === 'Open' && isResponsible && (
                    <button
                      type='button'
                      onClick={() => openForm(cr.id, 'resolve')}
                      className='px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold flex items-center gap-1 cursor-pointer'
                    >
                      <CheckCircle2 className='w-3 h-3' />
                      Đã sửa
                    </button>
                  )}
                  {st === 'Resolved' && canReview && (
                    <>
                      <button
                        type='button'
                        disabled={busyId === cr.id}
                        onClick={() =>
                          void run(
                            cr,
                            () => assignmentService.verifyChangeRequest(chapterId, cr.id),
                            'Đã xác minh',
                          )
                        }
                        className='px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold disabled:opacity-50 cursor-pointer'
                      >
                        Xác minh đạt
                      </button>
                      <button
                        type='button'
                        onClick={() => openForm(cr.id, 'reopen')}
                        className='px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-semibold cursor-pointer'
                      >
                        Chưa đạt, mở lại
                      </button>
                    </>
                  )}
                  {st === 'Open' && canReview && (
                    <button
                      type='button'
                      onClick={() => openForm(cr.id, 'reject')}
                      className='px-2.5 py-1 rounded-lg border border-[#E7E7E7] hover:bg-zinc-50 font-semibold cursor-pointer'
                    >
                      Chấp nhận phản đối
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
