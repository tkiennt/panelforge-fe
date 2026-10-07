import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  GitCommit,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  History,
} from 'lucide-react';
import { MangaProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';

// --- Types & Interfaces ---

export type VersionStatus = 'LOCKED' | 'DRAFT';
export type EntityCategory = 'Characters' | 'Locations' | 'Props' | 'Terminology' | 'Style Rules' | 'Plot Facts';

export interface EntityVersion {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  effectiveFromChapter: number;
  
  // Data Fields
  name: string;
  personality?: string;
  speechStyle?: string;
  drawingStyle?: string;
  colorMode?: 'Black & White' | 'Full Color';
  
  // Provenance
  createdAt: string;
  createdBy: string;
  lockedAt?: string;
  lockedBy?: string;
  aiUsageCount: number;
}

export interface BibleEntityExtended {
  id: string;
  category: EntityCategory;
  baseName: string;
  versions: EntityVersion[];
}

export interface SeriesBibleViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  onShowToast?: (title: string, desc: string) => void;
}

// --- Mock Data ---

const INITIAL_ENTITIES: BibleEntityExtended[] = [
  {
    id: 'ent-1',
    category: 'Characters',
    baseName: 'Akira Tanaka',
    versions: [
      {
        id: 'v-1-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 1,
        name: 'Akira Tanaka',
        personality: 'Stoic, determined, fiercely loyal.',
        speechStyle: 'Short, direct sentences.',
        drawingStyle: 'Sharp angles, heavy inking around eyes.',
        colorMode: 'Black & White',
        createdAt: '2026-09-15T10:00:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-16T10:00:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 42,
      },
      {
        id: 'v-1-2',
        versionNumber: 2,
        status: 'DRAFT',
        effectiveFromChapter: 5,
        name: 'Akira Tanaka (Awakened)',
        personality: 'More open, slightly unhinged in battle.',
        speechStyle: 'More expressive, uses sarcasm.',
        drawingStyle: 'Softer facial features with glowing aura.',
        colorMode: 'Black & White',
        createdAt: '2026-10-01T14:30:00Z',
        createdBy: 'Artist User',
        aiUsageCount: 0,
      },
    ],
  },
  {
    id: 'ent-2',
    category: 'Characters',
    baseName: 'Elena Rostova',
    versions: [
      {
        id: 'v-2-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 2,
        name: 'Elena Rostova',
        personality: 'Calculated, elegant, secretly compassionate.',
        speechStyle: 'Highly formal, complex vocabulary.',
        drawingStyle: 'Smooth curves, detailed shading.',
        colorMode: 'Full Color',
        createdAt: '2026-09-20T09:15:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-22T09:15:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 15,
      },
    ],
  },
  {
    id: 'ent-3',
    category: 'Locations',
    baseName: 'Neo-Tokyo Slums',
    versions: [
      {
        id: 'v-3-1',
        versionNumber: 1,
        status: 'LOCKED',
        effectiveFromChapter: 1,
        name: 'Sector 4 Undercity',
        personality: 'Gritty, neon-lit, oppressive atmosphere.',
        drawingStyle: 'High contrast, dense screentones.',
        createdAt: '2026-09-10T10:00:00Z',
        createdBy: 'Producer Admin',
        lockedAt: '2026-09-11T10:00:00Z',
        lockedBy: 'Lead Editor',
        aiUsageCount: 89,
      }
    ]
  }
];

const CATEGORIES: EntityCategory[] = ['Characters', 'Locations', 'Props', 'Terminology', 'Style Rules', 'Plot Facts'];

// --- Main Component ---

export const SeriesBibleView: React.FC<SeriesBibleViewProps> = ({ activeProject, onShowToast }) => {
  const [entities, setEntities] = useState<BibleEntityExtended[]>(INITIAL_ENTITIES);
  const { addLockedCharacter } = useWorkspace();
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entities[0].id);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ Characters: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'DRAFT'>('ALL');

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    selectedEntity ? selectedEntity.versions[selectedEntity.versions.length - 1].id : null
  );

  const activeVersion = selectedEntity?.versions.find((v) => v.id === selectedVersionId);
  const isLocked = activeVersion?.status === 'LOCKED';

  // --- Actions ---

  const handleSelectEntity = (entId: string) => {
    setSelectedEntityId(entId);
    const ent = entities.find((e) => e.id === entId);
    if (ent && ent.versions.length > 0) {
      setSelectedVersionId(ent.versions[ent.versions.length - 1].id);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUpdateField = (field: keyof EntityVersion, value: any) => {
    if (!selectedEntity || !activeVersion || isLocked) return;

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: ent.versions.map((ver) => {
            if (ver.id !== activeVersion.id) return ver;
            return { ...ver, [field]: value };
          }),
        };
      })
    );
  };

  const handleLockVersion = () => {
    if (!selectedEntity || !activeVersion || isLocked) return;

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: ent.versions.map((ver) => {
            if (ver.id !== activeVersion.id) return ver;
            
            // Add to Global State when locked
            addLockedCharacter({
              id: activeVersion.id,
              name: activeVersion.name,
              version: `v${activeVersion.versionNumber}`,
              colorMode: activeVersion.colorMode || 'Black & White'
            });

            return { 
              ...ver, 
              status: 'LOCKED', 
              lockedAt: new Date().toISOString(),
              lockedBy: 'Current User' // Mocked user
            };
          }),
        };
      })
    );
    if (onShowToast) onShowToast("Version Locked", "This version is now read-only.");
  };

  const handleCreateSupersedingVersion = () => {
    if (!selectedEntity || !activeVersion) return;

    const hasDraft = selectedEntity.versions.some((v) => v.status === 'DRAFT');
    if (hasDraft) {
      if (onShowToast) onShowToast("Draft Exists", "Please lock or delete the existing draft first.");
      return;
    }

    const newVersionNumber = Math.max(...selectedEntity.versions.map((v) => v.versionNumber)) + 1;
    const newVersionId = `v-${selectedEntity.id}-${newVersionNumber}-${Date.now()}`;

    const newVersion: EntityVersion = {
      ...activeVersion,
      id: newVersionId,
      versionNumber: newVersionNumber,
      status: 'DRAFT',
      effectiveFromChapter: activeVersion.effectiveFromChapter + 1,
      createdAt: new Date().toISOString(),
      createdBy: 'Current User',
      lockedAt: undefined,
      lockedBy: undefined,
      aiUsageCount: 0,
    };

    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== selectedEntity.id) return ent;
        return {
          ...ent,
          versions: [...ent.versions, newVersion],
        };
      })
    );
    setSelectedVersionId(newVersionId);
    if (onShowToast) onShowToast("Draft Created", "A new superseding draft has been created.");
  };

  const filteredEntities = entities.filter(ent => {
    if (searchQuery && !ent.baseName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'ALL') {
      const latestVer = ent.versions[ent.versions.length - 1];
      if (latestVer.status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen w-full bg-[#FAF8F5] text-zinc-800 font-sans">
      
      {/* ========================================================= */}
      {/* ZONE 1: Sidebar Navigation (Entity Explorer)              */}
      {/* ========================================================= */}
      <div className="w-80 shrink-0 bg-white border-r border-zinc-200 flex flex-col z-10">
        <div className="p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            Series Bible
          </h2>
          
          {/* Search & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex bg-[#FAF8F5] rounded-lg p-1 border border-zinc-200">
              {['ALL', 'LOCKED', 'DRAFT'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${
                    statusFilter === status ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {CATEGORIES.map(category => {
            const categoryEntities = filteredEntities.filter(e => e.category === category);
            if (categoryEntities.length === 0) return null;
            
            const isExpanded = expandedCategories[category];
            
            return (
              <div key={category} className="mb-2">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors uppercase tracking-wider"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {category} ({categoryEntities.length})
                </button>
                
                {isExpanded && (
                  <div className="pl-4 pr-2 mt-1 space-y-1">
                    {categoryEntities.map(ent => {
                      const isSelected = ent.id === selectedEntityId;
                      const latestVersion = ent.versions[ent.versions.length - 1];
                      return (
                        <button
                          key={ent.id}
                          onClick={() => handleSelectEntity(ent.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                            isSelected 
                              ? 'bg-zinc-100 text-orange-500 shadow-sm border border-orange-500/30' 
                              : 'text-zinc-700 hover:bg-zinc-50 border border-transparent'
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{ent.baseName}</span>
                          {latestVersion.status === 'LOCKED' ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content & Right Sidebar Container */}
      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!selectedEntity || !activeVersion ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              Select an entity to view its Canon Spec Sheet.
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* ZONE 2: Version Timeline & Control                        */}
              {/* ========================================================= */}
              <div className="shrink-0 bg-white border-b border-zinc-200 px-6 py-4 flex flex-col justify-center z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
                    <GitCommit className="w-5 h-5 text-orange-600" />
                    {selectedEntity.baseName}
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    {/* Chapter Metadata Tag */}
                    <div className="flex items-center gap-2 bg-[#FAF8F5] border border-zinc-200 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-500">Effective from Ch.</span>
                      <span className="text-orange-600 font-bold">{activeVersion.effectiveFromChapter}</span>
                    </div>

                    {/* Strict Control Actions */}
                    {isLocked ? (
                      <button
                        onClick={handleCreateSupersedingVersion}
                        className="px-4 py-2 bg-transparent border border-orange-500 text-orange-600 hover:bg-orange-50 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Create Superseding Version
                      </button>
                    ) : (
                      <button
                        onClick={handleLockVersion}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-4 h-4" /> Lock Version
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
                  {selectedEntity.versions.map((ver, idx) => {
                    const isSelected = ver.id === selectedVersionId;
                    const isNodeLocked = ver.status === 'LOCKED';
                    
                    return (
                      <div key={ver.id} className="flex items-center shrink-0">
                        <button
                          onClick={() => setSelectedVersionId(ver.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono border transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-zinc-100 border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                              : 'bg-[#FAF8F5] border-zinc-200 text-zinc-500 hover:border-zinc-400'
                          }`}
                        >
                          {isNodeLocked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-amber-500" />
                          )}
                          <span>v{ver.versionNumber}</span>
                        </button>
                        
                        {idx < selectedEntity.versions.length - 1 && (
                          <div className="w-8 h-px bg-slate-700 mx-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ========================================================= */}
              {/* ZONE 3: Character Sheet Area (Structured Data)            */}
              {/* ========================================================= */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  
                  {isLocked ? (
                    <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                      <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-400">Locked Version (Read-Only)</h4>
                        <p className="text-xs text-emerald-500/80 mt-1">
                          This entity version is finalized and serves as immutable ground truth for AI Generation. Form fields are disabled.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">Draft Version (Editable)</h4>
                        <p className="text-xs text-amber-500/80 mt-1">
                          You are editing a draft version. AI generation will NOT use this version until it is explicitly Locked.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* Left Column: Text Fields */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2">Text Properties</h4>
                      
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={activeVersion.name}
                          onChange={(e) => handleUpdateField('name', e.target.value)}
                          disabled={isLocked}
                          className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all"
                        />
                      </div>

                      {selectedEntity.category === 'Characters' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                              Color Mode
                            </label>
                            <select
                              value={activeVersion.colorMode || 'Black & White'}
                              onChange={(e) => handleUpdateField('colorMode', e.target.value)}
                              disabled={isLocked}
                              className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all appearance-none"
                            >
                              <option value="Black & White">Black & White (Screentone)</option>
                              <option value="Full Color">Full Color (Webtoon)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                              Personality & Traits
                            </label>
                            <textarea
                              rows={3}
                              value={activeVersion.personality || ''}
                              onChange={(e) => handleUpdateField('personality', e.target.value)}
                              disabled={isLocked}
                              className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                              Speech Style
                            </label>
                            <textarea
                              rows={2}
                              value={activeVersion.speechStyle || ''}
                              onChange={(e) => handleUpdateField('speechStyle', e.target.value)}
                              disabled={isLocked}
                              className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all resize-none"
                            />
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          Drawing Style & Details
                        </label>
                        <textarea
                          rows={4}
                          value={activeVersion.drawingStyle || ''}
                          onChange={(e) => handleUpdateField('drawingStyle', e.target.value)}
                          disabled={isLocked}
                          className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Right Column: Visual Reference Zones */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2">AI Visual Grounding</h4>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* 1. Action Sketches */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>1. Action Sketches</span>
                            {isLocked && <Lock className="w-3 h-3 text-zinc-400" />}
                          </label>
                          <div className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                            isLocked 
                              ? 'border-zinc-200 bg-zinc-50/50 opacity-60 cursor-not-allowed' 
                              : 'border-zinc-300 hover:border-orange-500 bg-white hover:bg-orange-500/10 cursor-pointer'
                          }`}>
                            <ImageIcon className="w-6 h-6 text-zinc-300 mb-2" />
                            <span className="text-xs text-zinc-500 font-medium">
                              {isLocked ? 'Zone Locked' : 'Upload Action References'}
                            </span>
                          </div>
                        </div>

                        {/* 2. Emotion Sketches */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>2. Emotion Sketches</span>
                            {isLocked && <Lock className="w-3 h-3 text-zinc-400" />}
                          </label>
                          <div className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                            isLocked 
                              ? 'border-zinc-200 bg-zinc-50/50 opacity-60 cursor-not-allowed' 
                              : 'border-zinc-300 hover:border-orange-500 bg-white hover:bg-orange-500/10 cursor-pointer'
                          }`}>
                            <ImageIcon className="w-6 h-6 text-zinc-300 mb-2" />
                            <span className="text-xs text-zinc-500 font-medium">
                              {isLocked ? 'Zone Locked' : 'Upload Emotion References'}
                            </span>
                          </div>
                        </div>

                        {/* 3. Movement Sketches */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>3. Movement Turnarounds</span>
                            {isLocked && <Lock className="w-3 h-3 text-zinc-400" />}
                          </label>
                          <div className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                            isLocked 
                              ? 'border-zinc-200 bg-zinc-50/50 opacity-60 cursor-not-allowed' 
                              : 'border-zinc-300 hover:border-orange-500 bg-white hover:bg-orange-500/10 cursor-pointer'
                          }`}>
                            <ImageIcon className="w-6 h-6 text-zinc-300 mb-2" />
                            <span className="text-xs text-zinc-500 font-medium">
                              {isLocked ? 'Zone Locked' : 'Upload Turnaround References'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* ZONE 4: Provenance & Audit Panel                          */}
        {/* ========================================================= */}
        <div className="w-80 shrink-0 bg-white border-l border-zinc-200 flex flex-col z-10">
          <div className="p-4 border-b border-zinc-200">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Provenance & Audit
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeVersion ? (
              <>
                {/* AI Consistency Metric */}
                <div className="bg-[#FAF8F5] border border-zinc-200 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">AI Metric</h5>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-sm">{activeVersion.aiUsageCount}</span>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-800 font-medium">Consistency Checks</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Used as evidence in finding resolution</p>
                    </div>
                  </div>
                </div>

                {/* Audit Log */}
                <div>
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Audit Log
                  </h5>
                  
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-zinc-100 ml-1">
                    
                    <div className="relative pl-6">
                      <div className="absolute w-2 h-2 rounded-full bg-orange-500 left-1 top-1.5 -ml-px ring-4 ring-white"></div>
                      <p className="text-[11px] font-mono text-zinc-400">{new Date(activeVersion.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-zinc-700 mt-1">Draft Created by <span className="font-semibold text-zinc-800">{activeVersion.createdBy}</span></p>
                    </div>

                    {activeVersion.lockedAt && (
                      <div className="relative pl-6">
                        <div className="absolute w-2 h-2 rounded-full bg-emerald-500 left-1 top-1.5 -ml-px ring-4 ring-white"></div>
                        <p className="text-[11px] font-mono text-zinc-400">{new Date(activeVersion.lockedAt).toLocaleString()}</p>
                        <p className="text-xs text-zinc-700 mt-1">Version Locked by <span className="font-semibold text-zinc-800">{activeVersion.lockedBy}</span></p>
                      </div>
                    )}
                    
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-400 text-center py-10">
                No version selected.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
