import React, { useState } from 'react';
import { SystemRole } from '../types';
import { ProducerWorkspaceView } from './producer';
import { ProductionPipelineView } from './ProductionPipelineView';
import { WriterStudioView } from './writer';
import { ArtistDeskView } from './artist';
import { LettererCanvasView } from './letterer';
import { EditorDeskView } from './editor';
import { ReaderPortalView } from './reader';

interface UnifiedWorkspaceViewProps {
  activeRoles: SystemRole[];
  onShowToast: (title: string, desc: string) => void;
}

export function UnifiedWorkspaceView({ activeRoles, onShowToast }: UnifiedWorkspaceViewProps) {
  const safeRoles = activeRoles && activeRoles.length > 0 ? activeRoles : ['READER'];
  const [activeTab, setActiveTab] = useState<SystemRole>(safeRoles[0]);

  // If there's only one role, just render its specific view directly
  if (safeRoles.length === 1) {
    const role = safeRoles[0];
    switch (role) {
      case 'PRODUCER':
        return <ProductionPipelineView currentUserRole={role as any} onShowToast={onShowToast} />;
      case 'WRITER':
        return <WriterStudioView onShowToast={onShowToast} />;
      case 'ARTIST':
        return <ArtistDeskView />;
      case 'LETTERER':
        return <LettererCanvasView />;
      case 'EDITOR':
        return <EditorDeskView />;
      case 'READER':
      default:
        return <ReaderPortalView />;
    }
  }

  // Multi-role logic (Tabs interface)
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'PRODUCER':
        return <ProductionPipelineView currentUserRole={activeTab as any} onShowToast={onShowToast} />;
      case 'WRITER':
        return <WriterStudioView onShowToast={onShowToast} />;
      case 'ARTIST':
        return <ArtistDeskView />;
      case 'LETTERER':
        return <LettererCanvasView />;
      case 'EDITOR':
        return <EditorDeskView />;
      case 'READER':
      default:
        return <ReaderPortalView />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FAF8F4]">
      {/* Role Switcher Tabs */}
      <div className="flex bg-white border-b border-[#E5E5E5] p-2 px-6 gap-2 shrink-0 items-center shadow-sm z-10">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-4">Context Switcher:</span>
        {safeRoles.map(role => (
          <button
            key={role}
            onClick={() => setActiveTab(role)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
              activeTab === role 
                ? 'bg-[#171717] text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {role} Workspace
          </button>
        ))}
      </div>
      
      {/* Active Role Content */}
      <div className="flex-1 relative overflow-hidden">
        {renderActiveTabContent()}
      </div>
    </div>
  );
}
