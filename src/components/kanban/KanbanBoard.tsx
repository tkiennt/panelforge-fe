import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { SideDrawer } from './SideDrawer';
import {
  PIPELINE_STAGES,
  MOCK_CARDS,
  PipelineCard,
  RoleKey,
  StageKey,
} from '../../data/mockPipelineData';

interface KanbanBoardProps {
  currentUserRole: RoleKey;
  currentUserId?: string; // For assignee checks
  onShowToast: (title: string, desc: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  currentUserRole,
  currentUserId = 'user-1',
  onShowToast,
}) => {
  const [cards, setCards] = useState<PipelineCard[]>(MOCK_CARDS);
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null);
  const [drawerCard, setDrawerCard] = useState<PipelineCard | null>(null);

  // Setup DnD Sensors (distinguish between click and drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag distance to activate, allows clicking on cards
      },
    }),
  );

  // --- BUSINESS LOGIC ---

  const checkIsLocked = (card: PipelineCard) => {
    if (!card.blockedBy || card.blockedBy.length === 0) return false;
    // Check if any blocking card is NOT in 'approved' stage
    return card.blockedBy.some((blockerId) => {
      const blocker = cards.find((c) => c.id === blockerId);
      return blocker && blocker.stage !== 'approved';
    });
  };

  const canDragCard = (card: PipelineCard) => {
    // Producer & Editor can move anything
    if (
      currentUserRole === 'PRODUCER' ||
      currentUserRole === 'EDITOR' ||
      currentUserRole === 'ADMINISTRATOR'
    )
      return true;
    // Others can only move their own assigned cards
    return card.assigneeId === currentUserId;
  };

  // --- DND HANDLERS ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return; // Dropped outside

    const cardId = active.id as string;
    const newStage = over.id as StageKey;

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    if (card.stage === newStage) return; // No change

    // Check dependency lock again on drop (just in case)
    if (checkIsLocked(card)) {
      onShowToast(
        'Chặn thao tác',
        'Không thể di chuyển thẻ đang bị khoá bởi dependency chưa hoàn tất.',
      );
      return;
    }

    // Apply the move
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stage: newStage } : c)));
    onShowToast(
      'Thành công',
      `Chuyển thẻ ${card.identifier} sang ${PIPELINE_STAGES.find((s) => s.id === newStage)?.label}.`,
    );

    // Automation simulations
    if (newStage === 'review') {
      onShowToast('Auto-Assign', `Thẻ đã được chuyển vào Review Queue của Editor.`);
    }
    if (newStage === 'approved') {
      if (card.type === 'panel') {
        onShowToast('Kiểm tra tự động', 'Đang xác minh tính toàn vẹn của trang (Simulated).');
      }
    }
  };

  return (
    <div className='flex-1 w-full h-full flex overflow-hidden'>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className='flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-[#F3F3F3] p-6'>
          <div className='flex gap-6 h-full items-start'>
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={cards.filter((c) => c.stage === stage.id)}
                currentUserRole={currentUserRole}
                onCardClick={setDrawerCard}
                checkIsLocked={checkIsLocked}
                canDragCard={canDragCard}
              />
            ))}
          </div>
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.4' } },
            }),
          }}
        >
          {activeCard ? (
            <div className='rotate-3 scale-105 opacity-90 shadow-2xl'>
              <KanbanCard
                card={activeCard}
                currentUserRole={currentUserRole}
                onClick={() => {}}
                isLocked={false}
                canDrag={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SideDrawer
        isOpen={!!drawerCard}
        onClose={() => setDrawerCard(null)}
        card={drawerCard}
        currentUserRole={currentUserRole}
      />
    </div>
  );
};
