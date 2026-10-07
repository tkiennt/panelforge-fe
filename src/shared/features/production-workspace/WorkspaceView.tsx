import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KanbanBoard } from '@/shared/features/pipeline-board/KanbanBoard';
import { MOCK_CARDS } from '@/mocks/mockPipelineData';
import { SystemRole, WorkspaceRole } from '@/types';
import { Filter, Users, LayoutTemplate, Plus } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/shared/components/ui/Button';

export interface WorkspaceViewProps {
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  currentUserRole,
  systemRole,
  userRoles = [],
  onShowToast,
  isReaderMode = false,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const effectiveRoles =
    userRoles.length > 0
      ? userRoles
      : [...(systemRole ? [systemRole] : []), ...(currentUserRole ? [currentUserRole] : [])];
  const { hasPermission } = usePermissions(effectiveRoles);
  const [filterType, setFilterType] = useState<'all' | 'my-tasks' | 'overdue'>('all');
  const isReaderOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'READER';

  // If reader accidentally gets here, block them
  if (isReaderMode || isReaderOnly) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#EF4444] mb-4'>
          <span className='font-bold text-xl'>!</span>
        </div>
        <h2 className='text-xl font-serif font-semibold text-[#171717] mb-2'>Access Denied</h2>
        <p className='text-sm text-[#737373] max-w-md'>
          Bạn không có quyền truy cập khu vực sản xuất. Vui lòng quay lại màn hình xem ấn phẩm dành
          cho độc giả.
        </p>
      </div>
    );
  }

  // Calculate KPIs
  const totalCards = MOCK_CARDS.length;
  const approvedCards = MOCK_CARDS.filter((c) => c.stage === 'approved').length;
  const completionPercent = Math.round((approvedCards / totalCards) * 100) || 0;

  const overdueCards = MOCK_CARDS.filter((c) => {
    const diff = new Date(c.deadline).getTime() - new Date().getTime();
    return diff < 0 && c.stage !== 'approved';
  }).length;

  const aiAssistedCards = MOCK_CARDS.filter((c) => c.isAIAssisted && c.stage === 'review').length;

  return (
    <div className='w-full h-full flex flex-col bg-white'>
      {/* Demo Notice Banner */}
      <div className='shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 z-30'>
        <div className='flex items-center gap-2'>
          <span className='font-mono font-bold text-[10px] uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded'>
            Mô phỏng Demo
          </span>
          <span>
            Bảng Kanban này hiển thị dữ liệu mẫu tham khảo. Để nhận việc, bắt đầu làm, tải artwork
            SHA-256 và nộp bài thật với Backend API, vui lòng chuyển sang bàn làm việc thật.
          </span>
        </div>
        {workspaceId && seriesId && (
          <button
            type='button'
            onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work`)}
            className='font-semibold text-amber-950 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0'
          >
            Đến &quot;Công việc của tôi&quot; →
          </button>
        )}
      </div>

      {/* Sub-header / Board Controls */}
      <div className='shrink-0 border-b border-[#E7E7E7] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-20 shadow-sm'>
        {/* Left: Title & KPIs */}
        <div className='flex items-center gap-6'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <h1 className='text-xl font-serif font-bold text-[#171717]'>
                Chapter 5: The Awakening
              </h1>
              <span className='text-[10px] font-bold uppercase tracking-wider text-[#10B981] bg-[#D1FAE5] border border-[#A7F3D0] px-2 py-0.5 rounded-full'>
                In Production
              </span>
            </div>
            <div className='text-sm text-[#737373] font-medium flex items-center gap-4'>
              <span>Vol. 1</span>
              <span className='w-1 h-1 rounded-full bg-[#D4D4D4]'></span>
              <span>Deadline: Oct 24, 2026</span>
            </div>
          </div>

          <div className='hidden lg:flex items-center gap-3 pl-6 border-l border-[#E7E7E7]'>
            <div className='flex flex-col'>
              <span className='text-[10px] text-[#737373] uppercase tracking-wider font-semibold'>
                Completion
              </span>
              <span className='text-sm font-mono font-bold text-[#171717]'>
                {completionPercent}%
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-[10px] text-[#737373] uppercase tracking-wider font-semibold'>
                Overdue
              </span>
              <span
                className={`text-sm font-mono font-bold ${overdueCards > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}
              >
                {overdueCards}
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-[10px] text-[#737373] uppercase tracking-wider font-semibold'>
                AI Pending
              </span>
              <span className='text-sm font-mono font-bold text-[#8B5CF6]'>{aiAssistedCards}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className='flex items-center gap-3'>
          <div className='flex items-center bg-[#F3F3F3] p-1 rounded-lg border border-[#E7E7E7]'>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filterType === 'all' ? 'bg-white shadow-2xs text-[#171717]' : 'text-[#737373] hover:text-[#171717]'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilterType('my-tasks')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filterType === 'my-tasks' ? 'bg-white shadow-2xs text-[#171717]' : 'text-[#737373] hover:text-[#171717]'}`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilterType('overdue')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filterType === 'overdue' ? 'bg-white shadow-2xs text-[#171717]' : 'text-[#737373] hover:text-[#171717]'}`}
            >
              Overdue
            </button>
          </div>

          <button
            className='w-8 h-8 rounded-lg border border-[#E7E7E7] flex items-center justify-center text-[#737373] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors bg-white shadow-2xs'
            title='Filter'
          >
            <Filter className='w-4 h-4' />
          </button>
          <button
            className='w-8 h-8 rounded-lg border border-[#E7E7E7] flex items-center justify-center text-[#737373] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors bg-white shadow-2xs'
            title='Group by'
          >
            <LayoutTemplate className='w-4 h-4' />
          </button>

          <Button
            variant='primary'
            disabled={!(currentUserRole === 'PRODUCER' || hasPermission('create_card'))}
            title={
              !(currentUserRole === 'PRODUCER' || hasPermission('create_card'))
                ? 'Bạn cần quyền Producer hoặc quyền tạo trang để thực hiện thao tác này'
                : 'Tạo trang mới'
            }
            className='h-8 px-3 ml-2 text-xs'
          >
            <Plus className='w-4 h-4 mr-1.5' />
            New Page
          </Button>
        </div>
      </div>

      {/* Board Area */}
      <KanbanBoard
        currentUserRole={currentUserRole}
        systemRole={systemRole}
        userRoles={effectiveRoles}
        onShowToast={onShowToast}
        filterType={filterType}
      />
    </div>
  );
};

export const ProductionPipelineView = WorkspaceView;
export type ProductionPipelineViewProps = WorkspaceViewProps;
