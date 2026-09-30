import React, { useState } from 'react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { MOCK_CARDS } from '../data/mockPipelineData';
import { SystemRole, WorkspaceRole } from '../types';
import { Filter, Users, LayoutTemplate, Plus, ChevronDown, Check, BookOpen } from 'lucide-react';
import { usePermissions } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { CreateChapterModal, ChapterFormData } from '../components/modals/CreateChapterModal';

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
  const effectiveRoles =
    userRoles.length > 0
      ? userRoles
      : [...(systemRole ? [systemRole] : []), ...(currentUserRole ? [currentUserRole] : [])];
  const { hasPermission } = usePermissions(effectiveRoles);
  const [filterType, setFilterType] = useState<'all' | 'my-tasks' | 'overdue'>('all');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState({ id: 'ch5', title: 'Chapter 5: The Awakening' });
  const chaptersList = [
    { id: 'ch5', title: 'Chapter 5: The Awakening' },
    { id: 'ch4', title: 'Chapter 4: Shadows' },
    { id: 'ch3', title: 'Chapter 3: The Gathering' }
  ];

  const handleCreateChapter = async (data: ChapterFormData) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    onShowToast('Chapter Created', `${data.title || 'New Chapter'} has been created and the pipeline is initialized.`);
    setIsChapterModalOpen(false);
  };
  const isReaderOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'READER';

  // If reader accidentally gets here, block them
  if (isReaderMode || isReaderOnly) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-500 mb-4'>
          <span className='font-bold text-xl'>!</span>
        </div>
        <h2 className='text-xl font-bold text-zinc-900 tracking-tight mb-2'>Access Denied</h2>
        <p className='text-sm font-medium text-zinc-500 max-w-md'>
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
      <div className='shrink-0 border-b border-zinc-200 px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white z-20'>
        {/* Left: Title & Context */}
        <div className='flex items-center gap-4'>
          <div className='flex flex-col'>
            <div className='flex items-center gap-3'>
              <div className='relative'>
                <button
                  onClick={() => setIsChapterDropdownOpen(!isChapterDropdownOpen)}
                  className='flex items-center gap-2 text-lg font-bold text-zinc-900 hover:text-zinc-600 transition-colors'
                >
                  <BookOpen className='w-4 h-4 text-orange-600' />
                  {selectedChapter.title}
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isChapterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isChapterDropdownOpen && (
                  <div className='absolute top-full left-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150'>
                    <div className='p-1.5 flex flex-col'>
                      {chaptersList.map(ch => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            setSelectedChapter(ch);
                            setIsChapterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm font-bold rounded-md transition-colors ${selectedChapter.id === ch.id ? 'bg-orange-50 text-orange-600' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                          {ch.title}
                          {selectedChapter.id === ch.id && <Check className='w-4 h-4 text-orange-600' />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Overlay for closing dropdown when clicking outside */}
              {isChapterDropdownOpen && (
                <div 
                  className='fixed inset-0 z-40' 
                  onClick={() => setIsChapterDropdownOpen(false)}
                />
              )}
              <button
                onClick={() => setIsChapterModalOpen(true)}
                className='text-xs font-semibold text-zinc-500 hover:text-orange-600 transition-colors flex items-center gap-1 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200/60'
              >
                <Plus className='w-3 h-3' /> New Chapter
              </button>
              <span className='text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md'>
                In Production
              </span>
            </div>
            <div className='text-xs text-zinc-500 font-medium flex items-center gap-2 mt-1.5'>
              <span>Vol. 1</span>
              <span className='w-1 h-1 rounded-full bg-zinc-300'></span>
              <span>Deadline: Oct 24, 2026</span>
            </div>
          </div>

          {/* Center: Metrics (Streamlined) */}
          <div className='hidden xl:flex items-center gap-6'>
            <div className='flex flex-col'>
              <span className='text-[10px] text-zinc-500 uppercase tracking-wider font-semibold'>
                Completion
              </span>
              <span className='text-sm font-mono font-bold text-zinc-900'>
                {completionPercent}%
              </span>
            </div>
            <div className='h-8 w-px bg-zinc-200'></div>
            <div className='flex flex-col'>
              <span className='text-[10px] text-zinc-500 uppercase tracking-wider font-semibold'>
                Overdue
              </span>
              <span
                className={`text-sm font-mono font-bold ${overdueCards > 0 ? 'text-red-500' : 'text-emerald-600'}`}
              >
                {overdueCards}
              </span>
            </div>
            <div className='h-8 w-px bg-zinc-200'></div>
            <div className='flex flex-col'>
              <span className='text-[10px] text-zinc-500 uppercase tracking-wider font-semibold'>
                AI Pending
              </span>
              <span className='text-sm font-mono font-bold text-orange-600'>{aiAssistedCards}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className='flex items-center gap-4'>
          <div className='flex items-center bg-zinc-100 p-1 rounded-lg'>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'all' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilterType('my-tasks')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'my-tasks' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilterType('overdue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'overdue' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Overdue
            </button>
          </div>

          <div className='flex items-center gap-2 border-l border-zinc-200 pl-4'>
            <button
              className='w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors'
              title='Filter'
            >
              <Filter className='w-4 h-4' />
            </button>
            <button
              className='w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors'
              title='Group by'
            >
              <LayoutTemplate className='w-4 h-4' />
            </button>

            <button
              onClick={() => onShowToast('Chức năng đang phát triển', 'Form tạo thẻ (New Page) sẽ sớm được tích hợp hoàn chỉnh.')}
              disabled={!(currentUserRole === 'PRODUCER' || hasPermission('create_card'))}
              title={
                !(currentUserRole === 'PRODUCER' || hasPermission('create_card'))
                  ? 'Bạn cần quyền Producer hoặc quyền tạo trang để thực hiện thao tác này'
                  : 'Tạo trang mới'
              }
              className='ml-2 h-9 px-4 flex items-center bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
            >
              <Plus className='w-4 h-4 mr-1.5' />
              New Page
            </button>
          </div>
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

      <CreateChapterModal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        onSubmit={handleCreateChapter}
      />
    </div>
  );
};

export const ProductionPipelineView = WorkspaceView;
export type ProductionPipelineViewProps = WorkspaceViewProps;
