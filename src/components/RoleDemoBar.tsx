import React from 'react';

export type DemoRole = 'producer' | 'writer' | 'artist' | 'letterer' | 'editor' | 'reader' | 'administrator';

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
  const roles = [
    { id: 'landing', label: 'Landing Page', color: 'bg-gray-100 hover:bg-gray-200 text-gray-800' },
    { id: 'administrator', label: 'Dev Mode (All Access)', color: 'bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-600 shadow-[0_0_8px_rgba(250,204,21,0.6)]' },
    { id: 'producer', label: 'Producer', color: 'bg-[#F97316] hover:bg-[#EA580C] text-white' },
    { id: 'writer', label: 'Writer', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    { id: 'artist', label: 'Line Artist', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { id: 'letterer', label: 'Letterer', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { id: 'editor', label: 'Chief Editor', color: 'bg-red-600 hover:bg-red-700 text-white' },
    { id: 'reader', label: 'Reader', color: 'bg-gray-800 hover:bg-black text-white' },
  ];

  return (
    <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-[95%] max-w-5xl bg-white border-2 border-[#171717] rounded-xl shadow-manga-lg p-2 flex flex-col md:flex-row items-center justify-between gap-3'>
      <div className='flex items-center space-x-3 px-2'>
        <div className='animate-pulse w-3 h-3 rounded-full bg-[#F97316] border border-[#171717]'></div>
        <span className='font-mono text-xs font-bold text-[#171717] uppercase tracking-widest whitespace-nowrap'>
          DEV BAR
        </span>
        <span className='hidden md:inline text-xs text-gray-400 font-mono'>|</span>
        <span className='hidden md:inline text-xs text-gray-600 font-sans font-semibold'>
          Select Role Identity:
        </span>
      </div>

      <div className='flex flex-wrap items-center justify-center gap-2'>
        {roles.map((r) => {
          const isActive = activeRole === r.id || (activeRole === null && r.id === 'landing');
          return (
            <button
              key={r.id}
              onClick={() => {
                if (r.id === 'landing') {
                  onExitDemo();
                } else {
                  onRoleSelect(r.id as DemoRole);
                }
              }}
              className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded border border-[#171717] transition-transform active:scale-95 ${r.color} ${
                isActive
                  ? 'ring-2 ring-offset-1 ring-[#171717] opacity-100'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
