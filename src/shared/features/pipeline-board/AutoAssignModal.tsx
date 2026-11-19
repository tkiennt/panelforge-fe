import React, { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import type {
  AutoAssignPlanDto,
  AutoAssignPlanLotDto,
  StageTaskLotRequest,
} from '@/services/assignment.service';
import type { WorkspaceMemberDto } from '@/services/workspace.service';

export interface EditableAutoAssignLot extends AutoAssignPlanLotDto {
  clientKey: string;
}

/** Rút gọn dãy số trang tăng dần thành dạng "1–8, 11". */
function formatCompactPageNumbers(pageNumbers: number[]): string {
  const nums = [...new Set(pageNumbers.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  if (nums.length === 0) return '';
  if (nums.length === 1) return String(nums[0]);

  const ranges: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const cur = nums[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = cur;
      prev = cur;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(', ');
}

/** Gộp các lô cùng công đoạn và cùng người nhận trước khi gửi POST /task-grid/lots. */
function mergeAutoAssignLots(lots: EditableAutoAssignLot[]): StageTaskLotRequest[] {
  const merged = new Map<string, StageTaskLotRequest>();
  for (const lot of lots) {
    if (!lot.assigneeUserId || lot.taskIds.length === 0) continue;
    const key = `${lot.pipelineStageId}::${lot.assigneeUserId}`;
    const existing = merged.get(key);
    if (existing) {
      const seen = new Set(existing.taskIds);
      for (const id of lot.taskIds) {
        if (!seen.has(id)) {
          existing.taskIds.push(id);
          seen.add(id);
        }
      }
    } else {
      merged.set(key, {
        pipelineStageId: lot.pipelineStageId,
        assigneeUserId: lot.assigneeUserId,
        taskIds: [...lot.taskIds],
      });
    }
  }
  return [...merged.values()];
}

export interface AutoAssignModalProps {
  isOpen: boolean;
  plan: AutoAssignPlanDto | null;
  loading: boolean;
  submitting: boolean;
  errorMessage: string | null;
  isConflict: boolean;
  activeMembers: WorkspaceMemberDto[];
  getMemberName: (userId?: string | null) => string;
  onClose: () => void;
  onReloadPlan: () => void;
  onConfirm: (lots: StageTaskLotRequest[]) => void;
}

export const AutoAssignModal: React.FC<AutoAssignModalProps> = ({
  isOpen,
  plan,
  loading,
  submitting,
  errorMessage,
  isConflict,
  activeMembers,
  getMemberName,
  onClose,
  onReloadPlan,
  onConfirm,
}) => {
  const { t } = useTranslation('pipeline');
  const [syncedPlan, setSyncedPlan] = useState<AutoAssignPlanDto | null>(null);
  const [editableLots, setEditableLots] = useState<EditableAutoAssignLot[]>([]);

  if (plan !== syncedPlan) {
    setSyncedPlan(plan);
    setEditableLots(
      plan
        ? (plan.lots ?? []).map((lot, idx) => ({
            ...lot,
            taskIds: [...(lot.taskIds ?? [])],
            pageNumbers: [...(lot.pageNumbers ?? [])],
            clientKey: `${lot.pipelineStageId}:${lot.assigneeUserId}:${idx}`,
          }))
        : [],
    );
  }

  const openTaskCountByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const lot of plan?.lots ?? []) {
      if (lot.assigneeUserId && typeof lot.openTaskCount === 'number') {
        map.set(lot.assigneeUserId, lot.openTaskCount);
      }
    }
    return map;
  }, [plan]);

  const groupedStages = useMemo(() => {
    const groups = new Map<
      string,
      {
        pipelineStageId: string;
        stageName: string;
        assignedRole: string;
        lots: EditableAutoAssignLot[];
        totalCells: number;
      }
    >();
    for (const lot of editableLots) {
      const existing = groups.get(lot.pipelineStageId);
      if (existing) {
        existing.lots.push(lot);
        existing.totalCells += lot.taskIds.length;
      } else {
        groups.set(lot.pipelineStageId, {
          pipelineStageId: lot.pipelineStageId,
          stageName: lot.stageName,
          assignedRole: lot.assignedRole,
          lots: [lot],
          totalCells: lot.taskIds.length,
        });
      }
    }
    return [...groups.values()];
  }, [editableLots]);

  const mergedPayload = useMemo(() => mergeAutoAssignLots(editableLots), [editableLots]);
  const totalCells = useMemo(
    () => mergedPayload.reduce((sum, lot) => sum + lot.taskIds.length, 0),
    [mergedPayload],
  );
  const willMerge = mergedPayload.length < editableLots.length;
  const skippedStages = plan?.skipped ?? [];
  const hadInitialLots = (plan?.lots?.length ?? 0) > 0;

  const formatScopeLabel = (pageNumbers: number[]) => {
    if (!pageNumbers || pageNumbers.length === 0) {
      return t('taskGridV3.autoAssign.wholeChapter', 'Cả chương');
    }
    const compact = formatCompactPageNumbers(pageNumbers);
    if (!compact) return t('taskGridV3.autoAssign.wholeChapter', 'Cả chương');
    if (!compact.includes('–') && !compact.includes(',')) {
      return t('taskGridV3.autoAssign.singlePage', { page: compact }, 'Trang {page}');
    }
    return t('taskGridV3.autoAssign.pageRange', { ranges: compact }, 'Trang {ranges}');
  };

  const handleChangeAssignee = (clientKey: string, nextUserId: string) => {
    const member = activeMembers.find((m) => m.userId === nextUserId);
    const nextName = member ? member.fullName || member.email.split('@')[0] : '';
    setEditableLots((prev) =>
      prev.map((lot) =>
        lot.clientKey === clientKey
          ? { ...lot, assigneeUserId: nextUserId, assigneeName: nextName }
          : lot,
      ),
    );
  };

  const handleRemoveLot = (clientKey: string) => {
    setEditableLots((prev) => prev.filter((lot) => lot.clientKey !== clientKey));
  };

  const canConfirm = !loading && !submitting && mergedPayload.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      size='lg'
      dismissible={!submitting}
      title={t('taskGridV3.autoAssign.title', 'Xem trước Giao tự động')}
      description={t(
        'taskGridV3.autoAssign.description',
        'Kiểm tra đề xuất phân bổ trước khi lưu. Bạn có thể đổi người nhận hoặc bỏ bớt lô.',
      )}
      closeLabel={t('taskGridV3.autoAssign.closeLabel', 'Đóng hộp thoại giao tự động')}
      onClose={onClose}
      footer={
        <div className='flex w-full flex-wrap items-center justify-between gap-2'>
          <div className='text-xs text-stone-600'>
            {mergedPayload.length > 0 && (
              <span>
                {t(
                  'taskGridV3.autoAssign.summary',
                  { taskCount: totalCells, lotCount: mergedPayload.length },
                  '{taskCount} ô sẽ được giao thành {lotCount} lô',
                )}
                {willMerge && (
                  <span className='ml-1 text-stone-500'>
                    {t(
                      'taskGridV3.autoAssign.mergedNotice',
                      '(tự động gộp lô cùng công đoạn & người nhận)',
                    )}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              disabled={submitting}
              onClick={onClose}
              className='rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50 cursor-pointer'
            >
              {t('taskGridV3.autoAssign.cancelBtn', 'Huỷ')}
            </button>
            <button
              type='button'
              data-testid='auto-assign-confirm-btn'
              disabled={!canConfirm}
              onClick={() => onConfirm(mergedPayload)}
              className='inline-flex items-center gap-1.5 rounded-lg bg-[#171717] hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {submitting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
              <span>
                {submitting
                  ? t('taskGridV3.autoAssign.confirmingBtn', 'Đang giao...')
                  : totalCells > 0
                    ? t(
                        'taskGridV3.autoAssign.confirmBtn',
                        { count: totalCells },
                        'Xác nhận giao ({count} ô)',
                      )
                    : t('taskGridV3.autoAssign.confirmBtnEmpty', 'Xác nhận giao')}
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div className='space-y-4'>
        {errorMessage && (
          <div
            role='alert'
            data-testid='auto-assign-error'
            className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-2'
          >
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-4 w-4 shrink-0 text-rose-600 mt-0.5' />
              <div className='space-y-1 min-w-0'>
                <div className='font-medium whitespace-pre-line break-words'>{errorMessage}</div>
                {isConflict && (
                  <div className='text-rose-700'>
                    {t(
                      'taskGridV3.autoAssign.conflictHint',
                      'Lưới công việc đã thay đổi trong lúc bạn xem trước. Tải lại kế hoạch để cập nhật các ô chưa giao mới nhất.',
                    )}
                  </div>
                )}
              </div>
            </div>
            {(isConflict || !plan) && (
              <div>
                <button
                  type='button'
                  data-testid='auto-assign-reload-btn'
                  disabled={loading || submitting}
                  onClick={onReloadPlan}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 disabled:opacity-50 cursor-pointer'
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('taskGridV3.autoAssign.reloadPlanBtn', 'Tải lại kế hoạch')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className='py-10 text-center text-xs text-stone-500'>
            <Loader2 className='h-5 w-5 animate-spin mx-auto mb-2 text-[#F97316]' />
            <span>
              {t('taskGridV3.autoAssign.loading', 'Đang tính toán kế hoạch giao tự động...')}
            </span>
          </div>
        ) : plan ? (
          <>
            {groupedStages.length === 0 ? (
              <div
                data-testid='auto-assign-empty'
                className='rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center space-y-2 text-xs text-stone-600'
              >
                <div>
                  {hadInitialLots
                    ? t(
                        'taskGridV3.autoAssign.emptyAllRemoved',
                        'Bạn đã bỏ toàn bộ lô khỏi kế hoạch. Tải lại kế hoạch nếu muốn khôi phục.',
                      )
                    : t(
                        'taskGridV3.autoAssign.emptyNoUnassigned',
                        'Không có ô chưa giao nào sẵn sàng để giao tự động.',
                      )}
                </div>
                {hadInitialLots && (
                  <button
                    type='button'
                    data-testid='auto-assign-reload-empty-btn'
                    disabled={loading || submitting}
                    onClick={onReloadPlan}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-800 cursor-pointer'
                  >
                    <RefreshCw className='h-3 w-3' />
                    <span>{t('taskGridV3.autoAssign.reloadPlanBtn', 'Tải lại kế hoạch')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className='space-y-3'>
                {groupedStages.map((group) => (
                  <section
                    key={group.pipelineStageId}
                    data-testid={`auto-assign-stage-${group.pipelineStageId}`}
                    className='rounded-xl border border-stone-200 bg-white overflow-hidden'
                  >
                    <div className='flex items-center justify-between gap-2 border-b border-stone-200 bg-[#FAF8F5] px-3.5 py-2'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-bold text-stone-900'>{group.stageName}</span>
                        {group.assignedRole && (
                          <span className='rounded bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-mono text-stone-700'>
                            {group.assignedRole}
                          </span>
                        )}
                      </div>
                      <span className='text-[11px] font-mono font-semibold text-stone-600'>
                        {t(
                          'taskGridV3.autoAssign.cellCount',
                          { count: group.totalCells },
                          '{count} ô',
                        )}
                      </span>
                    </div>

                    <div className='divide-y divide-stone-100'>
                      {group.lots.map((lot) => {
                        const scopeLabel = formatScopeLabel(lot.pageNumbers);
                        const roleUpper = lot.assignedRole
                          ? String(lot.assignedRole).trim().toUpperCase()
                          : '';
                        const eligible = roleUpper
                          ? activeMembers.filter(
                              (m) =>
                                String(m.role || '')
                                  .trim()
                                  .toUpperCase() === roleUpper,
                            )
                          : activeMembers;
                        const hasCurrentInEligible = eligible.some(
                          (m) => m.userId === lot.assigneeUserId,
                        );
                        const fallbackLabel =
                          lot.assigneeName?.trim() || getMemberName(lot.assigneeUserId);
                        const openCount = openTaskCountByUserId.get(lot.assigneeUserId);

                        return (
                          <div
                            key={lot.clientKey}
                            data-testid={`auto-assign-lot-${lot.clientKey}`}
                            className='flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 text-xs'
                          >
                            <div className='min-w-0 flex-1 space-y-1'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <span className='font-semibold text-stone-900'>{scopeLabel}</span>
                                <span className='rounded bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-stone-700'>
                                  {t(
                                    'taskGridV3.autoAssign.cellCount',
                                    { count: lot.taskIds.length },
                                    '{count} ô',
                                  )}
                                </span>
                                {openCount !== undefined && (
                                  <span className='text-[11px] text-stone-500'>
                                    {t(
                                      'taskGridV3.autoAssign.openTaskCount',
                                      { count: openCount },
                                      'đang có {count} việc',
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className='flex items-center gap-2'>
                              <select
                                aria-label={t(
                                  'taskGridV3.autoAssign.assigneeSelectLabel',
                                  { stage: lot.stageName, scope: scopeLabel },
                                  'Người nhận cho {stage} ({scope})',
                                )}
                                value={lot.assigneeUserId}
                                disabled={submitting}
                                onChange={(e) =>
                                  handleChangeAssignee(lot.clientKey, e.target.value)
                                }
                                className='rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-900 min-w-[160px] disabled:opacity-50'
                              >
                                {!hasCurrentInEligible && lot.assigneeUserId && (
                                  <option value={lot.assigneeUserId}>{fallbackLabel}</option>
                                )}
                                {eligible.map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.fullName || m.email.split('@')[0]}
                                  </option>
                                ))}
                              </select>

                              <button
                                type='button'
                                disabled={submitting}
                                aria-label={t(
                                  'taskGridV3.autoAssign.removeLotLabel',
                                  { stage: lot.stageName, scope: scopeLabel },
                                  'Bỏ lô {stage} ({scope})',
                                )}
                                onClick={() => handleRemoveLot(lot.clientKey)}
                                className='inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 px-2 py-1 text-[11px] font-medium text-stone-600 disabled:opacity-50 cursor-pointer'
                              >
                                <Trash2 className='h-3 w-3' />
                                <span>{t('taskGridV3.autoAssign.removeLotBtn', 'Bỏ lô')}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {skippedStages.length > 0 && (
              <section
                data-testid='auto-assign-skipped'
                className='rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1.5 text-xs'
              >
                <div className='flex items-center gap-1.5 font-bold text-amber-900'>
                  <AlertTriangle className='h-3.5 w-3.5 text-amber-600 shrink-0' />
                  <span>
                    {t(
                      'taskGridV3.autoAssign.skippedTitle',
                      { count: skippedStages.length },
                      'Công đoạn bỏ qua ({count})',
                    )}
                  </span>
                </div>
                <ul className='space-y-1 text-amber-900'>
                  {skippedStages.map((s) => (
                    <li
                      key={s.pipelineStageId}
                      className='flex flex-wrap items-baseline justify-between gap-2 rounded bg-white/70 border border-amber-200/70 px-2.5 py-1.5'
                    >
                      <span className='font-semibold'>
                        {s.stageName}{' '}
                        <span className='font-mono font-normal text-amber-800'>
                          (
                          {t(
                            'taskGridV3.autoAssign.cellCount',
                            { count: s.taskCount },
                            '{count} ô',
                          )}
                          )
                        </span>
                      </span>
                      <span className='text-amber-800'>{s.reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
};
