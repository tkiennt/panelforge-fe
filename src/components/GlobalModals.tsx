import React from 'react';
import { CommandPaletteModal } from './modals/CommandPaletteModal';
import { LoginModal } from './modals/LoginModal';
import { RegisterModal } from './modals/RegisterModal';
import { TwoFactorSetupModal } from './modals/TwoFactorSetupModal';
import { ChangePasswordModal } from './modals/ChangePasswordModal';
import { SpreadWorkbenchModal } from '@/roles/artist/modals/SpreadWorkbenchModal';
import { PageDetailModal } from '@/roles/artist/modals/PageDetailModal';
import { AuditLogModal } from './modals/AuditLogModal';
import { NewPageCardModal } from '@/roles/artist/modals/NewPageCardModal';
import { KanbanCard, BibleEntity, MangaProject, SystemRole, KanbanStageKey } from '../types';

interface GlobalModalsProps {
  // States
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  spreadModalOpen: boolean;
  setSpreadModalOpen: (open: boolean) => void;
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

  // Callbacks
  setCurrentView: (view: string) => void;
  showToast: (title: string, desc: string) => void;
  handleUpdateCardStage: (cardId: string, newStage: KanbanStageKey) => void;
  handleAddCard: (newCard: KanbanCard) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  commandPaletteOpen,
  setCommandPaletteOpen,
  spreadModalOpen,
  setSpreadModalOpen,
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
  setCurrentView,
  showToast,
  handleUpdateCardStage,
  handleAddCard,
}) => {
  return (
    <>
      <SpreadWorkbenchModal
        isOpen={spreadModalOpen}
        onClose={() => setSpreadModalOpen(false)}
        onShowToast={showToast}
        userRole={activeProjectRoles[0] || 'ARTIST'}
      />
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
          setCurrentView('bible');
          showToast('Entity Selected', `Navigated to ${e.name}`);
        }}
        cards={cards}
        entities={entities}
      />
      <AuditLogModal
        isOpen={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
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
