import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { SideDrawer } from './SideDrawer';
import { BoardCard, BOARD_COLUMNS } from './pipelineBoard.types';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';
import { pageService, PageDto } from '@/services/page.service';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { SystemRole, WorkspaceRole } from '@/types';

interface KanbanBoardProps {
  chapterId?: string;
  filterType: 'all' | 'my-tasks' | 'overdue';
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  onOpenCreateAssignment?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  chapterId,
  filterType,
  currentUserRole,
  systemRole,
  userRoles = [],
  currentUserId,
  onShowToast,
  onOpenCreateAssignment,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();

  const [cards, setCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadBoardData = useCallback(async () => {
    if (!chapterId || !seriesId || !workspaceId) {
      setCards([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [assignments, pipelineData, pagesList, membersList] = await Promise.all([
        assignmentService.getAssignments(chapterId),
        pipelineService.getSeriesPipeline(seriesId).catch(() => null),
        pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        workspaceService.getMembers(workspaceId).catch(() => [] as WorkspaceMemberDto[]),
      ]);

      const stagesMap = new Map<string, PipelineStageDto>();
      if (pipelineData?.stages) {
        pipelineData.stages.forEach((s) => stagesMap.set(s.id, s));
      }

      const pagesMap = new Map<string, PageDto>();
      pagesList.forEach((p) => pagesMap.set(p.id, p));

      const membersMap = new Map<string, WorkspaceMemberDto>();
      membersList.forEach((m) => membersMap.set(m.userId, m));

      const mappedCards: BoardCard[] = assignments.map((a) => {
        const stage = stagesMap.get(a.pipelineStageId);
        const member = membersMap.get(a.assigneeUserId);

        let targetLabel = 'Toàn chương';
        if (a.entityType === 'Page') {
          const page = pagesMap.get(a.targetEntityId);
          targetLabel = page ? `Trang ${page.pageNumber}` : 'Trang bản thảo';
        } else if (a.entityType === 'Panel') {
          targetLabel = 'Khung tranh';
        }

        const memberName = member?.fullName || member?.email || 'Chưa gán';
        const initials =
          memberName
            .split(' ')
            .filter(Boolean)
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

        return {
          id: a.id,
          seriesId: a.seriesId,
          chapterId: a.chapterId,
          entityType: a.entityType,
          targetEntityId: a.targetEntityId,
          targetLabel,
          pipelineStageId: a.pipelineStageId,
          stageName: stage?.name || 'Công đoạn',
          stageOrder: stage?.stageOrder || 99,
          stageColor: stage?.colorCode || null,
          assigneeUserId: a.assigneeUserId,
          assigneeName: memberName,
          assigneeEmail: member?.email,
          assigneeAvatarInitials: initials,
          assignedRole: a.assignedRole,
          brief: a.brief || 'Không có tiêu đề',
          referenceNotes: a.referenceNotes,
          dueDate: a.dueDate,
          priority: a.priority,
          status: a.status,
          dependsOnAssignmentId: a.dependsOnAssignmentId,
          dependsOnAssignmentIds:
            a.dependsOnAssignmentIds && a.dependsOnAssignmentIds.length > 0
              ? a.dependsOnAssignmentIds
              : a.dependsOnAssignmentId
                ? [a.dependsOnAssignmentId]
                : [],
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          lastFeedbackComment: a.lastFeedbackComment,
          rawAssignment: a,
        };
      });

      setCards(mappedCards);
    } catch (err: any) {
      console.error('Lỗi khi nạp dữ liệu Pipeline Board:', err);
      setError('Không thể nạp dữ liệu phân công công việc của chương.');
      onShowToast('Lỗi tải dữ liệu', 'Không thể đồng bộ danh sách nhiệm vụ của chương.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, workspaceId, onShowToast]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Lọc thẻ theo filterType
  const [currentTimestamp] = useState(() => Date.now());

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filterType === 'my-tasks') {
        if (!currentUserId) return true;
        return card.assigneeUserId === currentUserId;
      }
      if (filterType === 'overdue') {
        if (!card.dueDate || card.status === 'Approved') return false;
        return new Date(card.dueDate).getTime() < currentTimestamp;
      }
      return true;
    });
  }, [cards, filterType, currentUserId, currentTimestamp]);

  const handleCardClick = (card: BoardCard) => {
    setSelectedCard(card);
    setIsDrawerOpen(true);
  };

  const handleOpenMyWork = (card: BoardCard) => {
    if (workspaceId && seriesId) {
      navigate(
        `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${card.chapterId}&assignmentId=${card.id}`,
      );
    }
  };

  if (!chapterId) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50'>
        <div className='w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3'>
          <AlertCircle className='w-6 h-6' />
        </div>
        <h3 className='text-sm font-bold text-zinc-700 mb-1'>Chưa chọn Chương</h3>
        <p className='text-xs text-zinc-500 max-w-sm'>
          Vui lòng chọn một chương trong danh sách phía trên để xem bảng tiến độ sản xuất Pipeline.
        </p>
      </div>
    );
  }

  if (loading && cards.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-12 text-center'>
        <Loader2 className='w-8 h-8 text-blue-600 animate-spin mb-3' />
        <span className='text-xs font-semibold text-zinc-600'>
          Đang nạp dữ liệu Pipeline từ máy chủ...
        </span>
      </div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-12 text-center'>
        <div className='w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3'>
          <AlertCircle className='w-6 h-6' />
        </div>
        <h3 className='text-sm font-bold text-zinc-800 mb-1'>{error}</h3>
        <button
          type='button'
          onClick={loadBoardData}
          className='mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer'
        >
          <RefreshCw className='w-3.5 h-3.5' />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  return (
    <div className='flex-1 w-full h-full flex flex-col overflow-hidden bg-zinc-100/60'>
      {/* Board Scroll Area */}
      <div className='flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-6'>
        {cards.length === 0 && !loading ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-8 bg-white/70 border border-dashed border-zinc-300 rounded-2xl'>
            <div className='w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3'>
              <Plus className='w-6 h-6' />
            </div>
            <h3 className='text-sm font-bold text-zinc-800 mb-1'>
              Chương này chưa có nhiệm vụ nào được giao
            </h3>
            <p className='text-xs text-zinc-500 max-w-md mb-4'>
              Hãy phân công các công đoạn Kịch bản (Script), Bố cục (Thumbnail), Vẽ nét
              (Pencil/Ink), Tô màu hoặc Chèn chữ để quản lý tiến độ.
            </p>
            {onOpenCreateAssignment && (
              <button
                type='button'
                onClick={onOpenCreateAssignment}
                className='inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Giao Việc Cho Chương Này</span>
              </button>
            )}
          </div>
        ) : (
          <div className='flex gap-5 h-full items-start'>
            {BOARD_COLUMNS.map((column) => {
              const columnCards = filteredCards.filter((c) => c.status === column.status);
              return (
                <KanbanColumn
                  key={column.status}
                  column={column}
                  cards={columnCards}
                  onCardClick={handleCardClick}
                  onOpenMyWork={handleOpenMyWork}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Side Drawer Chi tiết công việc & Submissions */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        card={selectedCard}
        onShowToast={onShowToast}
        onDeleted={(deletedId) => {
          setCards((prev) => prev.filter((c) => c.id !== deletedId));
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
};
