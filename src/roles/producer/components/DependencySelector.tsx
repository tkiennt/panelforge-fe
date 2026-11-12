import React, { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Network,
  Search,
  X,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
} from 'lucide-react';
import { AssignmentDto, WorkflowEntityType } from '@/types/pipeline';
import { PipelineStageDto } from '@/services/pipeline.service';
import { PageDto } from '@/services/page.service';
import { SeriesMemberDto } from '@/services/series.service';
import {
  DependencyGraphModal,
  GraphNodeItem,
} from '@/shared/features/pipeline-board/DependencyGraphModal';

export interface DependencySelectorProps {
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
  currentAssignmentId?: string | null;
  currentBrief?: string;
  currentEntityType?: WorkflowEntityType;
  currentPageId?: string;
  currentPanelId?: string;
  currentStageId?: string;
  stages: PipelineStageDto[];
  pages: PageDto[];
  members: SeriesMemberDto[];
  existingAssignments: AssignmentDto[];
  selectedIds: string[];
  onChange: (newSelectedIds: string[]) => void;
  backendError?: string | null;
}

type FilterPill = 'all' | 'same-page' | 'same-chapter' | 'unapproved' | 'approved';

const STATUS_VIETNAMESE: Record<string, { label: string; badgeCls: string; isApproved: boolean }> =
  {
    approved: {
      label: 'Đã duyệt',
      badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isApproved: true,
    },
    inprogress: {
      label: 'Đang thực hiện',
      badgeCls: 'bg-blue-100 text-blue-800 border-blue-300',
      isApproved: false,
    },
    assigned: {
      label: 'Đã phân công',
      badgeCls: 'bg-stone-100 text-stone-700 border-stone-300',
      isApproved: false,
    },
    submitted: {
      label: 'Đã nộp bài',
      badgeCls: 'bg-amber-100 text-amber-800 border-amber-300',
      isApproved: false,
    },
    underreview: {
      label: 'Đang xét duyệt',
      badgeCls: 'bg-amber-100 text-amber-800 border-amber-300',
      isApproved: false,
    },
    reworkrequired: {
      label: 'Yêu cầu làm lại',
      badgeCls: 'bg-rose-100 text-rose-800 border-rose-300',
      isApproved: false,
    },
    blocked: {
      label: 'Bị chặn',
      badgeCls: 'bg-red-100 text-red-800 border-red-300',
      isApproved: false,
    },
  };

export const DependencySelector: React.FC<DependencySelectorProps> = ({
  workspaceId,
  seriesId,
  chapterId,
  chapterNumber,
  currentAssignmentId,
  currentBrief,
  currentEntityType,
  currentPageId,
  currentPanelId,
  currentStageId,
  stages,
  pages,
  members,
  existingAssignments,
  selectedIds,
  onChange,
  backendError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPill>('all');
  const [showDagTooltip, setShowDagTooltip] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [showAllUnapproved, setShowAllUnapproved] = useState(false);

  // Stage hiện tại đang chọn
  const currentStage = useMemo(
    () => stages.find((s) => s.id === currentStageId),
    [stages, currentStageId],
  );

  // Stage trước trong pipeline nếu có
  const priorPipelineStage = useMemo(() => {
    if (!currentStage || typeof currentStage.stageOrder !== 'number') return null;
    const sorted = [...stages].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
    const currentIndex = sorted.findIndex((s) => s.id === currentStage.id);
    return currentIndex > 0 ? sorted[currentIndex - 1] : null;
  }, [stages, currentStage]);

  // Map nhanh ID thành thông tin ngữ cảnh
  const pageMap = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const getStatusMeta = (status: string | number) => {
    const key = String(status).toLowerCase();
    return (
      STATUS_VIETNAMESE[key] || {
        label: String(status),
        badgeCls: 'bg-stone-100 text-stone-700 border-stone-300',
        isApproved: key === 'approved',
      }
    );
  };

  const getAssignmentContext = useCallback(
    (a: AssignmentDto) => {
      const stage = stageMap.get(a.pipelineStageId);
      const stageName = stage?.name || a.stageName || 'Pipeline';
      const chText = chapterNumber ? `Chương ${chapterNumber}` : 'Chương này';

      if (a.entityType === 'Page' && a.targetEntityId) {
        const page = pageMap.get(a.targetEntityId);
        const pageText = page ? `Trang ${page.pageNumber}` : 'Trang';
        return `${chText} · ${pageText} · ${stageName}`;
      }
      if (a.entityType === 'Panel' && a.targetEntityId) {
        return `${chText} · Khung #${a.targetEntityId.slice(0, 6)} · ${stageName}`;
      }
      return `${chText} · Toàn chương · ${stageName}`;
    },
    [chapterNumber, pageMap, stageMap],
  );

  const getAssigneeName = useCallback(
    (userId: string) => {
      const m = memberMap.get(userId);
      return m ? m.fullName || m.email.split('@')[0] : 'Chưa gán';
    },
    [memberMap],
  );

  // Loại trừ chính nó nếu đang chỉnh sửa (selfId)
  const selectableAssignments = useMemo(() => {
    return existingAssignments.filter((a) => a.id !== currentAssignmentId);
  }, [existingAssignments, currentAssignmentId]);

  // Kiểm tra chu trình phụ thuộc (Cycle Detection)
  const cycleMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!currentAssignmentId) return map;

    // Xây dựng đồ thị hướng
    const adj = new Map<string, string[]>();
    for (const a of existingAssignments) {
      const deps =
        a.dependsOnAssignmentIds || (a.dependsOnAssignmentId ? [a.dependsOnAssignmentId] : []);
      adj.set(a.id, deps);
    }

    // Với mỗi candidate, kiểm tra xem có đường đi từ candidate -> currentAssignmentId hay không
    for (const candidate of selectableAssignments) {
      const visited = new Set<string>();
      const queue = [candidate.id];
      let hasCycle = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === currentAssignmentId) {
          hasCycle = true;
          break;
        }
        if (!visited.has(curr)) {
          visited.add(curr);
          const neighbors = adj.get(curr) || [];
          for (const n of neighbors) {
            if (!visited.has(n)) queue.push(n);
          }
        }
      }
      map.set(candidate.id, hasCycle);
    }
    return map;
  }, [existingAssignments, currentAssignmentId, selectableAssignments]);

  // Phân tích lý do gợi ý liên quan
  const analyzedAssignments = useMemo(() => {
    return selectableAssignments.map((a) => {
      let isRelated = false;
      const reasons: string[] = [];

      // Kiểm tra cùng trang/panel
      if (currentPageId && a.entityType === 'Page' && a.targetEntityId === currentPageId) {
        const page = pageMap.get(currentPageId);
        reasons.push(`Cùng Trang ${page?.pageNumber ?? ''}`);
        isRelated = true;
      } else if (
        currentPanelId &&
        a.entityType === 'Panel' &&
        a.targetEntityId === currentPanelId
      ) {
        reasons.push('Cùng Khung hình');
        isRelated = true;
      }

      // Kiểm tra quan hệ giai đoạn trước trong pipeline
      const aStage = stageMap.get(a.pipelineStageId);
      if (
        currentStage &&
        aStage &&
        typeof currentStage.stageOrder === 'number' &&
        typeof aStage.stageOrder === 'number'
      ) {
        if (aStage.stageOrder === currentStage.stageOrder - 1) {
          reasons.push('Giai đoạn trước trong pipeline');
          isRelated = true;
        } else if (aStage.stageOrder < currentStage.stageOrder) {
          reasons.push('Công đoạn trước trong pipeline');
          isRelated = true;
        }
      }

      return {
        assignment: a,
        isRelated,
        reasonText: reasons.join(' · '),
        hasCycle: cycleMap.get(a.id) || false,
      };
    });
  }, [
    selectableAssignments,
    currentPageId,
    currentPanelId,
    currentStage,
    pageMap,
    stageMap,
    cycleMap,
  ]);

  // Toggle selection an toàn (không bị double toggle)
  const handleToggle = (id: string) => {
    if (cycleMap.get(id)) return;
    const exists = selectedIds.includes(id);
    const next = exists ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    onChange(next);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  // Danh sách các công việc đã chọn đầy đủ
  const selectedAssignmentsList = useMemo(() => {
    return selectedIds
      .map((id) => existingAssignments.find((a) => a.id === id))
      .filter((a): a is AssignmentDto => Boolean(a));
  }, [selectedIds, existingAssignments]);

  const selectedApprovedCount = useMemo(
    () => selectedAssignmentsList.filter((a) => getStatusMeta(a.status).isApproved).length,
    [selectedAssignmentsList],
  );
  const selectedUnapprovedList = useMemo(
    () => selectedAssignmentsList.filter((a) => !getStatusMeta(a.status).isApproved),
    [selectedAssignmentsList],
  );
  const selectedUnapprovedCount = selectedUnapprovedList.length;

  // Lọc tìm kiếm và tab lọc (giữ nguyên selectedIds không bị mất)
  const filteredItems = useMemo(() => {
    return analyzedAssignments.filter(({ assignment: a }) => {
      // 1. Text filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const stageName = (stageMap.get(a.pipelineStageId)?.name || '').toLowerCase();
        const page = pageMap.get(a.targetEntityId);
        const pageNumberStr = page ? `trang ${page.pageNumber}` : '';
        const assignee = getAssigneeName(a.assigneeUserId).toLowerCase();
        const brief = (a.brief || '').toLowerCase();
        const idStr = a.id.toLowerCase();

        const match =
          brief.includes(query) ||
          stageName.includes(query) ||
          pageNumberStr.includes(query) ||
          assignee.includes(query) ||
          idStr.includes(query);

        if (!match) return false;
      }

      // 2. Filter pill
      if (activeFilter === 'same-page') {
        if (!currentPageId) return false;
        return a.targetEntityId === currentPageId;
      }
      if (activeFilter === 'same-chapter') {
        return a.entityType === 'Chapter';
      }
      if (activeFilter === 'unapproved') {
        return !getStatusMeta(a.status).isApproved;
      }
      if (activeFilter === 'approved') {
        return getStatusMeta(a.status).isApproved;
      }

      return true;
    });
  }, [
    analyzedAssignments,
    searchTerm,
    activeFilter,
    currentPageId,
    pageMap,
    stageMap,
    getAssigneeName,
  ]);

  // Chia thành 2 nhóm: "Gợi ý liên quan" và "Các công việc khác"
  const { relatedGroup, otherGroup } = useMemo(() => {
    const related: typeof filteredItems = [];
    const others: typeof filteredItems = [];

    for (const item of filteredItems) {
      if (item.isRelated) {
        related.push(item);
      } else {
        others.push(item);
      }
    }
    return { relatedGroup: related, otherGroup: others };
  }, [filteredItems]);

  // Đếm nhanh cho filter pills
  const counts = useMemo(() => {
    let samePage = 0;
    let sameChapter = 0;
    let unapproved = 0;
    let approved = 0;

    for (const { assignment: a } of analyzedAssignments) {
      if (currentPageId && a.targetEntityId === currentPageId) samePage++;
      if (a.entityType === 'Chapter') sameChapter++;
      if (getStatusMeta(a.status).isApproved) approved++;
      else unapproved++;
    }
    return {
      all: analyzedAssignments.length,
      samePage,
      sameChapter,
      unapproved,
      approved,
    };
  }, [analyzedAssignments, currentPageId]);

  // Data cho sơ đồ đồ thị
  const graphNodes: GraphNodeItem[] = useMemo(() => {
    return selectedAssignmentsList.map((a) => ({
      id: a.id,
      brief: a.brief,
      status: a.status,
      stageName: stageMap.get(a.pipelineStageId)?.name || 'Pipeline',
      assigneeName: getAssigneeName(a.assigneeUserId),
      contextText: getAssignmentContext(a),
    }));
  }, [selectedAssignmentsList, stageMap, getAssigneeName, getAssignmentContext]);

  return (
    <div className='space-y-3.5 pt-2 border-t border-[#E7E7E7]'>
      {/* 1. Header & Mô tả dễ hiểu (Req 2) */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <div>
          <div className='flex items-center gap-1.5'>
            <label className='block font-bold text-stone-900 text-xs'>
              Cần hoàn thành trước · Không bắt buộc
            </label>
            <div className='relative'>
              <button
                type='button'
                onClick={() => setShowDagTooltip((prev) => !prev)}
                onBlur={() => setShowDagTooltip(false)}
                className='text-stone-400 hover:text-stone-700 transition-colors p-0.5 rounded cursor-pointer'
                aria-label='Tìm hiểu về quy tắc phụ thuộc công việc'
              >
                <HelpCircle className='w-3.5 h-3.5' />
              </button>
              {showDagTooltip && (
                <div className='absolute z-50 left-0 top-full mt-1.5 w-72 p-3 bg-stone-900 text-stone-100 text-[11px] rounded-xl shadow-xl border border-stone-700 leading-relaxed animate-in fade-in'>
                  <strong className='text-orange-400 block mb-1'>Đồ thị phụ thuộc (DAG):</strong>
                  Phân công này sẽ ở trạng thái chờ cho đến khi tất cả các công việc được chọn tại
                  đây đạt trạng thái <strong>Đã duyệt (Approved)</strong>. Bạn có thể chọn nhiều
                  công việc tiền đề mà không bắt buộc theo thứ tự tuyến tính.
                </div>
              )}
            </div>
          </div>
          <p className='text-[11px] text-stone-500 mt-0.5'>
            Chọn những công việc phải được duyệt trước khi công việc này có thể bắt đầu.
          </p>
        </div>

        {/* Nút Xem sơ đồ phụ thuộc (Req 8) */}
        <button
          type='button'
          onClick={() => setIsGraphModalOpen(true)}
          className='px-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-orange-50 text-stone-700 hover:text-[#EA580C] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0'
        >
          <Network className='w-3.5 h-3.5 text-[#F97316]' />
          <span>Xem sơ đồ phụ thuộc</span>
        </button>
      </div>

      {/* Thông tin quy trình pipeline bắt buộc nếu có (Req 2) */}
      {priorPipelineStage && (
        <div className='p-2.5 bg-orange-50/60 border border-orange-200 rounded-xl text-[11px] text-orange-900 flex items-start gap-2'>
          <Info className='w-3.5 h-3.5 text-[#F97316] shrink-0 mt-0.5' />
          <div>
            <strong>Quy trình Pipeline:</strong> Công đoạn này nằm sau{' '}
            <strong>{priorPipelineStage.name}</strong>. Việc chọn thêm công việc tiền đề ở danh sách
            dưới đây là tuỳ chọn mở rộng (không bắt buộc).
          </div>
        </div>
      )}

      {/* Hiển thị lỗi backend nếu có ngay cạnh phần lựa chọn (Req 9) */}
      {backendError && (
        <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2'>
          <AlertTriangle className='w-4 h-4 text-red-600 shrink-0 mt-0.5' />
          <div className='leading-relaxed font-medium'>{backendError}</div>
        </div>
      )}

      {/* 2. Khu vực "Đã chọn (N)" dễ nhìn (Req 5) */}
      {selectedAssignmentsList.length > 0 && (
        <div className='p-3 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-bold text-xs text-stone-800 flex items-center gap-1.5'>
              <span>Đã chọn ({selectedAssignmentsList.length})</span>
            </span>
            <button
              type='button'
              onClick={() => onChange([])}
              className='text-[10px] text-stone-500 hover:text-red-600 transition-colors cursor-pointer'
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className='flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1'>
            {selectedAssignmentsList.map((a) => {
              const statusMeta = getStatusMeta(a.status);
              return (
                <div
                  key={a.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shadow-2xs ${
                    statusMeta.isApproved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  {statusMeta.isApproved ? (
                    <CheckCircle2 className='w-3 h-3 text-emerald-600 shrink-0' />
                  ) : (
                    <Clock className='w-3 h-3 text-amber-600 shrink-0' />
                  )}
                  <span className='font-semibold truncate max-w-[180px]'>
                    {a.brief || '[Không có tiêu đề]'}
                  </span>
                  <span className='text-[10px] font-mono text-stone-500'>({statusMeta.label})</span>
                  <button
                    type='button'
                    onClick={(e) => handleRemove(a.id, e)}
                    aria-label={`Bỏ chọn công việc ${a.brief}`}
                    className='ml-0.5 text-stone-400 hover:text-stone-800 p-0.5 rounded cursor-pointer transition-colors'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Hiển thị ảnh hưởng ngay sau khi chọn (Req 6) */}
      <div
        className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
          selectedAssignmentsList.length === 0
            ? 'bg-[#FAF8F5] border-[#E7E5E4] text-stone-600'
            : selectedUnapprovedCount === 0
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}
      >
        {selectedAssignmentsList.length === 0 ? (
          <div className='flex items-center gap-2'>
            <Info className='w-4 h-4 text-stone-400 shrink-0' />
            <span>Chưa chọn công việc cần hoàn thành trước.</span>
          </div>
        ) : selectedUnapprovedCount === 0 ? (
          <div className='space-y-0.5'>
            <div className='font-bold flex items-center gap-1.5 text-emerald-900'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
              <span>
                Đã chọn {selectedAssignmentsList.length} công việc · Tất cả đã được duyệt.
              </span>
            </div>
            <p className='text-[11px] text-emerald-800 pl-5'>
              Các công việc được chọn đều đã duyệt. Điều kiện phụ thuộc đã được đáp ứng.
            </p>
          </div>
        ) : (
          <div className='space-y-1.5'>
            <div className='font-bold flex items-center gap-1.5 text-amber-900'>
              <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
              <span>
                Đã chọn {selectedAssignmentsList.length} công việc · {selectedApprovedCount} đã
                duyệt · {selectedUnapprovedCount} chưa duyệt.
              </span>
            </div>
            <div className='text-[11px] text-amber-900 pl-5 space-y-1'>
              <p>
                Công việc mới phải chờ{' '}
                <strong>
                  &ldquo;{selectedUnapprovedList[0]?.brief}&rdquo;
                  {selectedUnapprovedCount > 1
                    ? ` và ${selectedUnapprovedCount - 1} việc khác`
                    : ''}
                </strong>{' '}
                được duyệt trước khi bắt đầu.
              </p>

              {/* Nút xem chi tiết danh sách chưa duyệt nếu có nhiều hơn 1 việc */}
              {selectedUnapprovedCount > 1 && (
                <div>
                  <button
                    type='button'
                    onClick={() => setShowAllUnapproved((prev) => !prev)}
                    className='text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline inline-flex items-center gap-1 cursor-pointer'
                  >
                    <span>
                      {showAllUnapproved
                        ? 'Thu gọn danh sách chưa duyệt'
                        : `Xem đầy đủ ${selectedUnapprovedCount} việc chưa duyệt`}
                    </span>
                    {showAllUnapproved ? (
                      <ChevronUp className='w-3 h-3' />
                    ) : (
                      <ChevronDown className='w-3 h-3' />
                    )}
                  </button>

                  {showAllUnapproved && (
                    <ul className='mt-1 space-y-1 pl-2 border-l-2 border-amber-300 text-[11px] text-amber-900'>
                      {selectedUnapprovedList.map((item) => (
                        <li key={item.id} className='flex items-center justify-between gap-2'>
                          <span className='truncate'>• {item.brief}</span>
                          <span className='font-mono text-[10px] text-amber-700 shrink-0'>
                            ({getStatusMeta(item.status).label})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Ô tìm kiếm & Bộ lọc (Req 5) */}
      <div className='space-y-2'>
        <div className='relative'>
          <Search className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Tìm theo tên công việc, mã hoặc trang…'
            className='w-full pl-9 pr-8 py-2 bg-white border border-[#E7E7E7] rounded-xl text-xs focus:outline-none focus:border-[#F97316] placeholder:text-stone-400'
          />
          {searchTerm && (
            <button
              type='button'
              onClick={() => setSearchTerm('')}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className='flex items-center gap-1.5 flex-wrap text-[11px]'>
          <button
            type='button'
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-[#E7E7E7] hover:bg-stone-50'
            }`}
          >
            Tất cả ({counts.all})
          </button>

          {currentPageId && counts.samePage > 0 && (
            <button
              type='button'
              onClick={() => setActiveFilter('same-page')}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                activeFilter === 'same-page'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-[#E7E7E7] hover:bg-stone-50'
              }`}
            >
              Cùng trang ({counts.samePage})
            </button>
          )}

          {counts.sameChapter > 0 && (
            <button
              type='button'
              onClick={() => setActiveFilter('same-chapter')}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                activeFilter === 'same-chapter'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-[#E7E7E7] hover:bg-stone-50'
              }`}
            >
              Toàn chương ({counts.sameChapter})
            </button>
          )}

          <button
            type='button'
            onClick={() => setActiveFilter('unapproved')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              activeFilter === 'unapproved'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-stone-600 border-[#E7E7E7] hover:bg-stone-50'
            }`}
          >
            Chưa duyệt ({counts.unapproved})
          </button>

          <button
            type='button'
            onClick={() => setActiveFilter('approved')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              activeFilter === 'approved'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-stone-600 border-[#E7E7E7] hover:bg-stone-50'
            }`}
          >
            Đã duyệt ({counts.approved})
          </button>
        </div>
      </div>

      {/* 5. Danh sách Checkbox phân nhóm (Req 3, Req 4, Req 9) */}
      <div className='border border-[#E7E7E7] rounded-xl p-2.5 bg-white space-y-4 max-h-72 overflow-y-auto custom-scrollbar'>
        {selectableAssignments.length === 0 ? (
          <div className='py-8 text-center text-stone-400 text-xs'>
            Chương này chưa có công việc nào khác để chọn làm tiền đề.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='py-8 text-center text-stone-400 text-xs'>
            Không tìm thấy công việc nào khớp với tìm kiếm.
          </div>
        ) : (
          <>
            {/* Nhóm 1: Gợi ý liên quan (Req 4) */}
            {relatedGroup.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center gap-1.5 px-1'>
                  <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                  <span className='font-bold text-stone-800 text-xs uppercase tracking-wider'>
                    Gợi ý liên quan ({relatedGroup.length})
                  </span>
                </div>
                <div className='space-y-1.5'>
                  {relatedGroup.map(({ assignment: a, reasonText, hasCycle }) =>
                    renderAssignmentRow(a, reasonText, hasCycle),
                  )}
                </div>
              </div>
            )}

            {/* Nhóm 2: Các công việc khác (Req 4) */}
            {otherGroup.length > 0 && (
              <div className='space-y-2'>
                {relatedGroup.length > 0 && (
                  <div className='flex items-center gap-1.5 px-1 pt-2 border-t border-stone-100'>
                    <Layers className='w-3.5 h-3.5 text-stone-400' />
                    <span className='font-bold text-stone-600 text-xs uppercase tracking-wider'>
                      Các công việc khác ({otherGroup.length})
                    </span>
                  </div>
                )}
                <div className='space-y-1.5'>
                  {otherGroup.map(({ assignment: a, reasonText, hasCycle }) =>
                    renderAssignmentRow(a, reasonText, hasCycle),
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Sơ đồ phụ thuộc (Req 8) */}
      {isGraphModalOpen && (
        <DependencyGraphModal
          isOpen={isGraphModalOpen}
          onClose={() => setIsGraphModalOpen(false)}
          targetTask={{
            title: currentBrief || '[Chưa nhập tiêu đề brief]',
            stageName: currentStage?.name || 'Pipeline Stage',
            contextText:
              currentEntityType === 'Page' && currentPageId
                ? `Trang ${pageMap.get(currentPageId)?.pageNumber || ''}`
                : currentEntityType === 'Panel'
                  ? 'Theo Khung hình'
                  : 'Toàn chương',
            assigneeName: 'Người được phân công',
            isCreating: true,
          }}
          dependencies={graphNodes}
        />
      )}
    </div>
  );

  // Helper render từng dòng công việc
  function renderAssignmentRow(a: AssignmentDto, reasonText?: string, hasCycle?: boolean) {
    const isSelected = selectedIds.includes(a.id);
    const statusMeta = getStatusMeta(a.status);
    const contextStr = getAssignmentContext(a);
    const assigneeStr = getAssigneeName(a.assigneeUserId);

    // Mở chi tiết trong tab mới mà KHÔNG tick checkbox, KHÔNG submit form (Req 3)
    const handleOpenDetail = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const url = `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${chapterId}&assignmentId=${a.id}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <div
        key={a.id}
        data-testid={`dep-item-${a.id}`}
        role='checkbox'
        aria-checked={isSelected}
        aria-disabled={hasCycle}
        tabIndex={hasCycle ? -1 : 0}
        onClick={() => handleToggle(a.id)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle(a.id);
          }
        }}
        className={`p-3 rounded-xl border text-xs transition-all relative select-none ${
          hasCycle
            ? 'opacity-50 bg-stone-50 border-stone-200 cursor-not-allowed'
            : isSelected
              ? 'bg-orange-50/70 border-orange-300 shadow-2xs cursor-pointer'
              : 'bg-white hover:bg-stone-50/80 border-[#E7E7E7] hover:border-stone-300 cursor-pointer'
        }`}
      >
        <div className='flex items-start gap-3'>
          {/* Checkbox box với vùng bấm đủ lớn (Req 3) */}
          <div className='pt-0.5'>
            <input
              type='checkbox'
              checked={isSelected}
              disabled={hasCycle}
              onChange={() => handleToggle(a.id)}
              onClick={(e) => e.stopPropagation()}
              className='w-4 h-4 rounded border-stone-300 text-[#F97316] focus:ring-[#F97316] cursor-pointer'
            />
          </div>

          {/* Nội dung thông tin chính (Req 3) */}
          <div className='flex-1 min-w-0 space-y-1.5'>
            {/* Hàng 1: Lý do gợi ý & Tên công việc */}
            <div>
              {reasonText && (
                <div className='text-[10px] font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mb-1 border border-orange-200'>
                  <Sparkles className='w-2.5 h-2.5' />
                  <span>{reasonText}</span>
                </div>
              )}
              <h4 className='font-semibold text-stone-900 text-xs leading-snug'>
                {a.brief || '[Không có mô tả brief]'}
              </h4>
            </div>

            {/* Hàng 2: Ngữ cảnh (Chương, trang/panel, giai đoạn) & Người phụ trách */}
            <div className='flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[11px] text-stone-600 font-sans'>
              <span className='font-medium text-stone-700'>{contextStr}</span>
              <span className='text-stone-300'>•</span>
              <span className='flex items-center gap-1 text-stone-700'>
                <User className='w-3 h-3 text-stone-400' />
                <span>{assigneeStr}</span>
              </span>
              <span className='text-stone-300'>•</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${statusMeta.badgeCls}`}
              >
                {statusMeta.label}
              </span>
            </div>

            {/* Hàng 3: Ảnh hưởng khi chọn & ID rút gọn & Nút xem chi tiết (Req 3) */}
            <div className='pt-1 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap'>
              <div className='flex items-center gap-1.5 text-[11px]'>
                {statusMeta.isApproved ? (
                  <span className='text-emerald-700 font-medium flex items-center gap-1'>
                    <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                    <span>Đã đáp ứng điều kiện phụ thuộc</span>
                  </span>
                ) : (
                  <span className='text-amber-800 font-medium flex items-center gap-1'>
                    <Clock className='w-3 h-3 text-amber-600' />
                    <span>Phải chờ việc này được duyệt</span>
                  </span>
                )}
                <span className='text-stone-300'>•</span>
                <span className='font-mono text-[10px] text-stone-400'>#{a.id.slice(0, 8)}</span>
              </div>

              {/* Nút riêng Xem chi tiết ↗ (Req 3) */}
              <button
                type='button'
                onClick={handleOpenDetail}
                className='text-[11px] font-medium text-stone-600 hover:text-[#EA580C] hover:underline flex items-center gap-1 p-1 rounded transition-colors cursor-pointer'
                title='Xem chi tiết công việc trong tab mới'
              >
                <span>Xem chi tiết</span>
                <ExternalLink className='w-3 h-3' />
              </button>
            </div>

            {/* Cảnh báo nếu tạo vòng lặp chu trình (Req 9) */}
            {hasCycle && (
              <div className='p-1.5 bg-red-50 border border-red-200 text-red-800 rounded text-[10px] flex items-center gap-1'>
                <AlertTriangle className='w-3 h-3 text-red-600 shrink-0' />
                <span>Không thể chọn vì lựa chọn này tạo vòng lặp phụ thuộc chu trình.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};
