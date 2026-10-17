import React, { useState } from 'react';
import { Settings, X, ChevronUp, ChevronDown } from 'lucide-react';

export type DemoRole =
  'producer' | 'writer' | 'artist' | 'letterer' | 'editor' | 'reader' | 'administrator';

interface RoleDemoBarProps {
  activeRole: DemoRole | null;
  onRoleSelect: (role: DemoRole) => void;
  onExitDemo: () => void;
}

export const RoleDemoBar: React.FC<RoleDemoBarProps> = ({
  activeRole,
  onRoleSelect,
  onExitDemo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const roles = [
    {
      id: 'administrator',
      label: 'Dev Mode (All Access)',
      color: 'bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-600',
    },
    { id: 'producer', label: 'Producer', color: 'bg-[#F97316] hover:bg-[#EA580C] text-white' },
    { id: 'writer', label: 'Writer', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    { id: 'artist', label: 'Line Artist', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { id: 'letterer', label: 'Letterer', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { id: 'editor', label: 'Chief Editor', color: 'bg-red-600 hover:bg-red-700 text-white' },
    { id: 'reader', label: 'Reader', color: 'bg-gray-800 hover:bg-black text-white' },
  ];

  return (
    <div className='fixed bottom-4 right-4 z-[100] font-sans'>
      {isExpanded ? (
        <div className='bg-white border border-[#E7E7E7] rounded-xl shadow-2xl p-4 w-[280px] flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200'>
          <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-2'>
            <div className='flex items-center gap-2 text-[#171717]'>
              <div className='w-2 h-2 rounded-full bg-[#10B981] animate-pulse'></div>
              <span className='text-xs font-bold uppercase tracking-wider'>Dev Mode Panel</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className='text-[#A3A3A3] hover:text-[#171717] p-1 rounded hover:bg-[#F3F3F3] transition-colors'
            >
              <ChevronDown className='w-4 h-4' />
            </button>
          </div>

          <div className='flex flex-col gap-1.5'>
            {roles.map((r) => {
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onRoleSelect(r.id as DemoRole)}
                  className={`w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-transparent transition-all text-left ${r.color} ${
                    isActive
                      ? 'ring-2 ring-offset-1 ring-[#171717] opacity-100 font-black scale-[1.02]'
                      : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div className='border-t border-[#E7E7E7] pt-2 mt-1'>
            <button
              onClick={() => {
                onExitDemo();
                setIsExpanded(false);
              }}
              className='w-full px-3 py-2 bg-[#F3F3F3] hover:bg-[#E7E7E7] text-[#171717] text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5'
            >
              <X className='w-3.5 h-3.5' /> Exit Dev Mode
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className='bg-[#171717] hover:bg-black text-white rounded-full p-3 shadow-lg flex items-center justify-center gap-2 group transition-transform hover:scale-105 active:scale-95'
        >
          <Settings className='w-5 h-5 group-hover:rotate-45 transition-transform duration-300' />
          {activeRole && (
            <span className='text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full'>
              {activeRole}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
