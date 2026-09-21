import React, { useState } from 'react';
import { SystemRole } from '../types';
import { 
  ChevronRight, 
  Check, 
  MessageSquare, 
  LayoutTemplate, 
  PenTool, 
  Eraser, 
  Type,
  BookOpen,
  Sparkles,
  History,
  Lock
} from 'lucide-react';
import { PermissionButton } from '../components/ui/PermissionButton';
import { PermissionField } from '../components/ui/PermissionField';
import { PermissionGuard } from '../components/ui/PermissionGuard';
import { usePermissions, useProjectPermission } from '../lib/permissions';

interface UnifiedWorkspaceViewProps {
  activeRoles: SystemRole[];
  onShowToast: (title: string, desc: string) => void;
}

const PIPELINE_STEPS = [
  { id: 'script', label: 'Script' },
  { id: 'thumbnail', label: 'Thumbnail' },
  { id: 'pencil', label: 'Pencil' },
  { id: 'ink', label: 'Ink' },
  { id: 'color', label: 'Color' },
  { id: 'letter', label: 'Letter' },
  { id: 'review', label: 'Review' },
];

export function UnifiedWorkspaceView({ activeRoles, onShowToast }: UnifiedWorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<'bible' | 'audit'>('bible');
  const [scriptText, setScriptText] = useState('EXT. NEO-TOKYO STREET - NIGHT\n\nRain pours down on the neon-lit streets. Akira stands at the corner, looking up at the holographic billboards.');

  // Simulated current stage
  const currentStage = 'ink';

  const userRolesString = activeRoles as string[];

  const handleApprove = () => {
    onShowToast("Success", "Stage approved and moved to the next step.");
  };

  const handleApplyAI = () => {
    onShowToast("AI Assistant", "Applied AI suggestions to canvas.");
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FAF8F4] overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 h-14 bg-white border-b border-[#E7E7E7] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
          <span className="text-[#A3A3A3]">Neon Genesis</span>
          <ChevronRight className="w-4 h-4 text-[#D4D4D4]" />
          <span className="text-[#A3A3A3]">Chapter 5</span>
          <ChevronRight className="w-4 h-4 text-[#D4D4D4]" />
          <span>Page 12</span>
        </div>

        {/* Pipeline Stepper */}
        <div className="flex items-center gap-1 hidden md:flex">
          {PIPELINE_STEPS.map((step, idx) => {
            const isPast = PIPELINE_STEPS.findIndex(s => s.id === currentStage) > idx;
            const isCurrent = step.id === currentStage;
            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isCurrent ? 'bg-[#F97316] text-white' : 
                  isPast ? 'bg-[#ECFCCB] text-[#65A30D]' : 'bg-[#F3F3F3] text-[#A3A3A3]'
                }`}>
                  {step.label}
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className={`w-4 h-0.5 ${isPast ? 'bg-[#65A30D]' : 'bg-[#E7E7E7]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div>
          <PermissionButton
            userRoles={userRolesString}
            permissionKey="stage:approve"
            fallbackTitle="Chỉ Editor/Producer mới có quyền duyệt giai đoạn này"
            variant="primary"
            className="h-8 px-4 text-xs flex items-center gap-2"
            onClick={handleApprove}
          >
            <Check className="w-3.5 h-3.5" />
            Approve Stage
          </PermissionButton>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: SCRIPT & HIERARCHY */}
        <div className="w-[300px] shrink-0 bg-white border-r border-[#E7E7E7] flex flex-col h-full overflow-y-auto">
          <div className="p-4 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-[#F97316]" />
            <h3 className="font-serif font-bold text-[#171717]">Script & Hierarchy</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[#737373] uppercase mb-2">Panel 1 Script</h4>
              <PermissionField
                userRoles={userRolesString}
                permissionKey="script:write"
                type="textarea"
                value={scriptText}
                onChange={setScriptText}
                className="h-32"
              />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#737373] uppercase mb-2">Panel 2 Script</h4>
              <PermissionField
                userRoles={userRolesString}
                permissionKey="script:write"
                type="textarea"
                value="CLOSE UP - Akira's eyes widen as he sees the reflection."
                className="h-20"
              />
            </div>
          </div>
        </div>

        {/* COLUMN 2: MAIN CANVAS */}
        <div className="flex-1 flex flex-col relative bg-[#F3F3F3]">
          {/* Dynamic Toolbox */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 bg-white rounded-xl shadow-sm border border-[#E7E7E7]">
            <PermissionButton
              userRoles={userRolesString}
              permissionKey="sketch:write"
              variant="outline"
              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg"
              title="Cọ vẽ (Sketch)"
            >
              <PenTool className="w-4 h-4 text-[#171717]" />
            </PermissionButton>
            <PermissionButton
              userRoles={userRolesString}
              permissionKey="color:write"
              variant="outline"
              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg"
              title="Tô màu (Color)"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500" />
            </PermissionButton>
            <PermissionButton
              userRoles={userRolesString}
              permissionKey="sketch:write"
              variant="outline"
              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg"
              title="Tẩy (Eraser)"
            >
              <Eraser className="w-4 h-4 text-[#171717]" />
            </PermissionButton>
            <div className="w-full h-px bg-[#E7E7E7] my-1" />
            <PermissionButton
              userRoles={userRolesString}
              permissionKey="letter:write"
              variant="outline"
              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg"
              title="Chèn chữ (Letter)"
            >
              <Type className="w-4 h-4 text-[#171717]" />
            </PermissionButton>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-8">
            <PermissionGuard
              userRoles={userRolesString}
              permissionKey="edit_art"
              fallbackMessage="Canvas đang bị khóa (Read-only)"
            >
              <div className="w-[600px] h-[800px] bg-white shadow-md border border-[#D4D4D4] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#171717_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="text-[#A3A3A3] flex flex-col items-center gap-2">
                  <LayoutTemplate className="w-12 h-12 stroke-[1]" />
                  <span className="font-mono text-sm">Artwork Viewer</span>
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>

        {/* COLUMN 3: SIDEBAR TABS */}
        <div className="w-[320px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col h-full z-10">
          <div className="flex border-b border-[#E7E7E7]">
            <button
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'bible' ? 'text-[#171717] border-b-2 border-[#171717]' : 'text-[#A3A3A3] hover:text-[#171717] bg-[#FAF8F4]'
              }`}
              onClick={() => setActiveTab('bible')}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Series Bible
            </button>
            <button
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'audit' ? 'text-[#171717] border-b-2 border-[#171717]' : 'text-[#A3A3A3] hover:text-[#171717] bg-[#FAF8F4]'
              }`}
              onClick={() => setActiveTab('audit')}
            >
              <History className="w-3.5 h-3.5" />
              Audit Log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'bible' ? (
              <div className="p-4 space-y-6">
                <div className="p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#8B5CF6] mb-2">
                    <Sparkles className="w-4 h-4" /> AI Suggestion
                  </h4>
                  <p className="text-xs text-[#525252] leading-relaxed mb-3">
                    Based on the script, consider adding rain effects to the background layer to enhance the neo-tokyo atmosphere.
                  </p>
                  <PermissionButton
                    userRoles={userRolesString}
                    permissionKey="request_ai"
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold text-[#8B5CF6] border-[#DDD6FE] hover:bg-[#EDE9FE]"
                    onClick={handleApplyAI}
                  >
                    Apply AI Suggestion
                  </PermissionButton>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#737373] uppercase mb-3">Active Characters</h4>
                  <div className="flex items-center gap-3 p-3 border border-[#E7E7E7] rounded-lg hover:border-[#171717] cursor-pointer transition-colors">
                    <div className="w-10 h-10 bg-[#E7E7E7] rounded-full flex items-center justify-center font-bold text-[#A3A3A3]">AK</div>
                    <div>
                      <div className="text-sm font-bold text-[#171717]">Akira</div>
                      <div className="text-[10px] text-[#737373] uppercase tracking-wider">Protagonist</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <h4 className="text-xs font-bold text-[#737373] uppercase mb-1">Version History</h4>
                
                <div className="relative pl-4 border-l-2 border-[#E7E7E7] space-y-6">
                  <div className="relative">
                    <div className="absolute w-2 h-2 bg-[#F97316] rounded-full -left-[21px] top-1.5" />
                    <div className="text-[10px] text-[#A3A3A3] font-mono mb-1">Today, 10:42 AM</div>
                    <div className="text-sm font-medium text-[#171717]">Ink layer updated</div>
                    <div className="text-xs text-[#737373]">by Artist (kiennt)</div>
                  </div>
                  <div className="relative">
                    <div className="absolute w-2 h-2 bg-[#D4D4D4] rounded-full -left-[21px] top-1.5" />
                    <div className="text-[10px] text-[#A3A3A3] font-mono mb-1">Yesterday, 16:30 PM</div>
                    <div className="text-sm font-medium text-[#171717]">Script finalized</div>
                    <div className="text-xs text-[#737373]">by Writer (tam)</div>
                  </div>
                  <div className="relative">
                    <div className="absolute w-2 h-2 bg-[#D4D4D4] rounded-full -left-[21px] top-1.5" />
                    <div className="text-[10px] text-[#A3A3A3] font-mono mb-1">Yesterday, 14:00 PM</div>
                    <div className="text-sm font-medium text-[#171717]">Page created</div>
                    <div className="text-xs text-[#737373]">by Producer</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
