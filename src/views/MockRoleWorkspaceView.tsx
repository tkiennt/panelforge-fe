import React, { useState } from 'react';

interface MockRoleWorkspaceViewProps {
  role: string;
  onEnterDemo: (role: string) => void;
}

const roleBadges: Record<string, { title: string; color: string; bg: string }> = {
  writer:   { title: 'Writer // Story Architect',    color: 'bg-indigo-600',  bg: '#4f46e5' },
  artist:   { title: 'Line Artist // Genga Studio', color: 'bg-blue-500',    bg: '#3b82f6' },
  letterer: { title: 'Letterer // Typesetting',      color: 'bg-emerald-600', bg: '#059669' },
  editor:   { title: 'Chief Editor // Desk',         color: 'bg-red-600',     bg: '#dc2626' },
  reader:   { title: 'Early Reader // Focus Group',  color: 'bg-gray-800',    bg: '#1f2937' },
};

const roleConsole: Record<string, string> = {
  writer:   'pgvector lore-check enabled • AI script assistant ready',
  artist:   'canvas integrations loaded • 3D pose library synced',
  letterer: 'font library loaded • balloon templates ready',
  editor:   'diff engine ready • approval queue loaded',
  reader:   'reader preview mode • feedback panel active',
};

export const MockRoleWorkspaceView: React.FC<MockRoleWorkspaceViewProps> = ({ role, onEnterDemo }) => {
  const [activeTab, setActiveTab] = useState('kanban');
  const cfg = roleBadges[role] ?? { title: 'Workspace', color: 'bg-[#171717]', bg: '#171717' };

  return (
    <div className="flex-1 bg-[#FAF8F5] min-h-screen relative">
      {/* Role header */}
      <div className="text-white px-6 py-4 flex items-center justify-between" style={{ backgroundColor: cfg.bg }}>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-white/20 border border-white/40 flex items-center justify-center font-serif font-black text-xl rounded">
            PF
          </div>
          <div>
            <h2 className="font-serif font-bold text-2xl">{cfg.title}</h2>
            <div className="font-mono text-[10px] text-white/80 uppercase tracking-wider">
              PROJECT: CHRONICLES OF ARIA // STATUS: ACTIVE
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {['kanban', 'lore', 'burndown'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase transition-colors border rounded ${
                activeTab === tab ? 'bg-white text-black border-white' : 'border-white/20 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="bg-white border border-[#e7e7e7] rounded-2xl p-8 text-center min-h-[50vh] flex flex-col items-center justify-center space-y-6 soft-shadow-lg">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl border border-[#e7e7e7]"
            style={{ backgroundColor: cfg.bg }}
          >
            {role.charAt(0).toUpperCase()}
          </div>
          <div className="max-w-md">
            <h3 className="font-serif font-bold text-2xl text-[#171717] mb-2">
              {cfg.title} — Interactive Preview
            </h3>
            <p className="text-[#737373] font-sans text-sm leading-relaxed">
              This is a static preview of the <strong className="text-[#171717]">{role.toUpperCase()}</strong> workspace.
              In the full release, this area features real-time WebSocket sync, {roleConsole[role] ?? 'collaborative tools'}.
            </p>
          </div>

          <div className="w-full max-w-2xl bg-[#FAF8F5] border border-[#e7e7e7] rounded-lg p-4 text-left font-mono text-xs text-[#737373] overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-[#171717] text-white px-2 py-0.5 text-[9px] rounded-bl">
              CONSOLE LOG
            </div>
            <div>&gt; System.initRole("<span className="text-[#f97316]">{role}</span>")</div>
            <div>&gt; Connecting to secure WebSocket... <span className="text-emerald-500">OK</span></div>
            <div>&gt; Loading project assets... <span className="text-emerald-500">OK (1.2s)</span></div>
            <div>&gt; {roleConsole[role] ?? 'Initializing workspace...'} <span className="text-emerald-500">READY</span></div>
            <div className="animate-pulse">&gt; Waiting for collaborative input<span className="text-[#f97316]">_</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

