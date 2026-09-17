import React from 'react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { RoleKey, MOCK_CARDS } from '../data/mockPipelineData';
import { Filter, Users, LayoutTemplate, Plus } from 'lucide-react';

interface ProductionPipelineViewProps {
  currentUserRole: RoleKey;
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

export const ProductionPipelineView: React.FC<ProductionPipelineViewProps> = ({
  currentUserRole,
  onShowToast,
  isReaderMode = false,
}) => {
  // If reader accidentally gets here, block them
  if (isReaderMode || currentUserRole === 'READER') {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#EF4444] mb-4'>
          <span className='font-bold text-xl'>!</span>
        </div>
        <h2 className='text-xl font-heading font-semibold text-[#171717] mb-2'>Access Denied</h2>
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
      {/* Sub-header / Board Controls */}
      <div className='shrink-0 border-b border-[#E7E7E7] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-20 shadow-sm'>
        {/* Left: Title & KPIs */}
        <div className='flex items-center gap-6'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <h1 className='text-xl font-heading font-bold text-[#171717]'>
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
            <button className='px-3 py-1 text-xs font-semibold rounded bg-white shadow-2xs text-[#171717]'>
              Kanban
            </button>
            <button className='px-3 py-1 text-xs font-semibold rounded text-[#737373] hover:text-[#171717]'>
              List
            </button>
            <button className='px-3 py-1 text-xs font-semibold rounded text-[#737373] hover:text-[#171717]'>
              Burndown
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

          {(currentUserRole === 'PRODUCER' || currentUserRole === 'ADMINISTRATOR') && (
            <button className='h-8 px-3 rounded-lg bg-[#F97316] text-white flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-[#EA580C] shadow-2xs transition-colors ml-2'>
              <Plus className='w-4 h-4' />
              New Page
            </button>
          )}
        </div>
      </div>

      {/* Board Area */}
      <KanbanBoard currentUserRole={currentUserRole} onShowToast={onShowToast} />
    </div>
  );
};
