import React from 'react';
import { CommandPaletteModal } from '@/shared/modals/CommandPaletteModal';
import { TwoFactorSetupModal } from '@/shared/features/account/TwoFactorSetupModal';
import { ChangePasswordModal } from '@/shared/features/account/ChangePasswordModal';
import { PageDetailModal } from '@/roles/artist/modals/PageDetailModal';
import { AuditLogModal } from '@/shared/modals/AuditLogModal';
import { NewPageCardModal } from '@/roles/artist/modals/NewPageCardModal';
import { KanbanCard, BibleEntity, MangaProject, SystemRole, KanbanStageKey } from '@/types';

interface GlobalModalsProps {
  // States
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  spreadModalOpen?: boolean;
  setSpreadModalOpen?: (open: boolean) => void;
  auditLogOpen: boolean;
  setAuditLogOpen: (open: boolean) => void;
  newCardOpen: boolean;
  setNewCardOpen: (open: boolean) => void;
  selectedCardForDetail: KanbanCard | null;
  setSelectedCardForDetail: (card: KanbanCard | null) => void;

  // Data
  cards: KanbanCard[];
  entities: BibleEntity[];
  provenanceLogs: any[];
  activeProjectRoles: string[];
  activeWorkspace?: { id?: string; name?: string; currentUserRole?: string } | null;
  activeSeries?: MangaProject | { id?: string; title?: string } | null;
  currentRole?: SystemRole | string;

  // Callbacks
  setCurrentView: (view: string) => void;
  showToast: (title: string, desc: string) => void;
  handleUpdateCardStage: (cardId: string, newStage: KanbanStageKey) => void;
  handleAddCard: (newCard: KanbanCard) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  commandPaletteOpen,
  setCommandPaletteOpen,
  spreadModalOpen: _spreadModalOpen,
  setSpreadModalOpen: _setSpreadModalOpen,
  auditLogOpen,
  setAuditLogOpen,
  newCardOpen,
  setNewCardOpen,
  selectedCardForDetail,
  setSelectedCardForDetail,
  cards,
  entities,
  provenanceLogs,
  activeProjectRoles,
  activeWorkspace,
  activeSeries,
  currentRole,
  setCurrentView,
  showToast,
  handleUpdateCardStage,
  handleAddCard,
}) => {
  return (
    <>
      <PageDetailModal
        card={selectedCardForDetail}
        onClose={() => setSelectedCardForDetail(null)}
        onUpdateStage={handleUpdateCardStage}
        onShowToast={showToast}
      />
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateView={setCurrentView}
        onSelectCard={(c) => setSelectedCardForDetail(c)}
        onSelectEntity={(e) => {
          if (activeWorkspace?.id && activeSeries?.id) {
            setCurrentView(`bible?search=${encodeURIComponent(e.name)}`);
            showToast('Entity Selected', `Navigated to ${e.name}`);
          } else {
            showToast('Chưa chọn bộ truyện', 'Vui lòng mở một bộ truyện để xem Series Bible');
          }
        }}
        cards={cards}
        entities={entities}
        workspaceId={activeWorkspace?.id}
        seriesId={activeSeries?.id}
      />
      <AuditLogModal
        isOpen={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        userRole={activeWorkspace?.currentUserRole || currentRole}
        logs={provenanceLogs}
        onShowToast={showToast}
      />
      <NewPageCardModal
        isOpen={newCardOpen}
        onClose={() => setNewCardOpen(false)}
        onAddCard={handleAddCard}
        onShowToast={showToast}
      />
    </>
  );
};
