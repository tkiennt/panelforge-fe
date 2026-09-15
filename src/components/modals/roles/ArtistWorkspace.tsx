import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

interface ArtistWorkspaceProps {
  onClose: () => void;
  onShowToast: (title: string, desc: string) => void;
}

export const ArtistWorkspace: React.FC<ArtistWorkspaceProps> = ({ onClose, onShowToast }) => {
  const [zoom, setZoom] = useState(100);
  const [showPerspective, setShowPerspective] = useState(true);
  const [showInkingPass, setShowInkingPass] = useState(true);

  return (
    <>
      {/* Main Stage Canvas */}
      <div className='flex-1 bg-[#121212] relative overflow-auto flex items-center justify-center p-8 custom-scrollbar'>
        <div
          className='relative transition-all duration-200 shadow-2xl border border-[#333333] rounded-lg overflow-hidden bg-black'
          style={{ width: `${(zoom / 100) * 820}px`, maxWidth: '100%' }}
        >
          <img
            src='https://lh3.googleusercontent.com/aida-public/AB6AXuBRF-X_pK-VNA-EDpW2TbENZXn5jBdsCJEViFUEfD1-cL_s6PpvrNV7Br-yvSJJP7XpLx-Q6po_dSRvBycNhUkNoZrpxI6pCLfmSiu3GY9sfOpdOlnvjkYYCL0y61ttCJ5fLSmT1ICs8y7G9Q6Y5MOdvUJxx1VFnqyY8qN7YBUINiyVOxDKYSL905nG_GxVijlasleWGD3OZipKscljZThMLHG09TocsEdeAvvhlPimteBhQD9Wacq_qA'
            alt='Pages 18-19 Climax Spread'
            className='w-full h-auto block select-none'
          />

          {/* Perspective 3D Grid Overlay */}
          {showPerspective && (
            <div className='absolute inset-0 pointer-events-none opacity-40'>
              <svg className='w-full h-full' viewBox='0 0 1000 600'>
                <line
                  x1='0'
                  y1='600'
                  x2='600'
                  y2='280'
                  stroke='#00FFFF'
                  strokeWidth='1'
                  strokeDasharray='3 3'
                />
                <line
                  x1='1000'
                  y1='600'
                  x2='600'
                  y2='280'
                  stroke='#00FFFF'
                  strokeWidth='1'
                  strokeDasharray='3 3'
                />
                <line
                  x1='0'
                  y1='0'
                  x2='600'
                  y2='280'
                  stroke='#00FFFF'
                  strokeWidth='1'
                  strokeDasharray='3 3'
                />
                <line
                  x1='1000'
                  y1='0'
                  x2='600'
                  y2='280'
                  stroke='#00FFFF'
                  strokeWidth='1'
                  strokeDasharray='3 3'
                />
                <circle cx='600' cy='280' r='4' fill='#00FFFF' />
              </svg>
            </div>
          )}

          {/* Spine gutter divider line */}
          <div className='absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-red-500/40 pointer-events-none'>
            <span className='absolute top-2 left-1 bg-red-600/80 text-white font-mono text-[9px] px-1 rounded'>
              Spine Gutter (3mm)
            </span>
          </div>
        </div>

        {/* Floating Zoom Controls */}
        <div className='absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1E1E1E]/90 backdrop-blur-md border border-[#333333] px-3 py-1.5 rounded-full flex items-center gap-3 text-xs font-mono shadow-xl'>
          <button
            onClick={() => setZoom(Math.max(60, zoom - 15))}
            className='hover:text-[#F97316] transition-colors p-1'
          >
            <ZoomOut className='w-3.5 h-3.5' />
          </button>
          <span>{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(180, zoom + 15))}
            className='hover:text-[#F97316] transition-colors p-1'
          >
            <ZoomIn className='w-3.5 h-3.5' />
          </button>
          <span className='text-[#555555]'>|</span>
          <button
            onClick={() => setZoom(100)}
            className='hover:text-white text-[#888888] transition-colors text-[10px]'
          >
            Reset
          </button>
        </div>
      </div>

      {/* Right Sidebar Control Drawer */}
      <div className='w-72 bg-[#1A1A1A] border-l border-[#2A2A2A] p-5 flex flex-col justify-between overflow-y-auto'>
        <div className='space-y-5'>
          <div>
            <h4 className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Layer & Rigging Pass
            </h4>
            <div className='space-y-2 text-xs'>
              <label className='flex items-center justify-between p-2.5 rounded-lg bg-[#242424] border border-[#333333] cursor-pointer hover:border-[#F97316] transition-colors'>
                <span className='flex items-center gap-2'>
                  <Layers className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>3D Perspective Rig</span>
                </span>
                <input
                  type='checkbox'
                  checked={showPerspective}
                  onChange={(e) => setShowPerspective(e.target.checked)}
                  className='accent-[#F97316]'
                />
              </label>
              <label className='flex items-center justify-between p-2.5 rounded-lg bg-[#242424] border border-[#333333] cursor-pointer hover:border-[#F97316] transition-colors'>
                <span className='flex items-center gap-2'>
                  <Sparkles className='w-3.5 h-3.5 text-[#8B5CF6]' />
                  <span>LoRA Infill Inks</span>
                </span>
                <input
                  type='checkbox'
                  checked={showInkingPass}
                  onChange={(e) => setShowInkingPass(e.target.checked)}
                  className='accent-[#F97316]'
                />
              </label>
            </div>
          </div>

          <div>
            <h4 className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Inker Annotations
            </h4>
            <div className='p-3 bg-[#242424] rounded-lg border border-[#333333] text-xs space-y-2'>
              <div className='flex items-center justify-between font-mono text-[10px] text-[#888888]'>
                <span>Kenji S. (Key Inker)</span>
                <span>1h ago</span>
              </div>
              <p className='text-[11px] text-[#CCCCCC] leading-relaxed'>
                "Aligned vanishing points for Shibuya crosswalk. G-pen pressure calibrated to 0.45mm
                on Zor's cyber-arm."
              </p>
            </div>
          </div>

          <div className='p-3 bg-[#242424] rounded-lg border border-[#333333] text-xs font-mono space-y-1.5'>
            <div className='text-[#888888] text-[10px] uppercase'>Cryptographic Audit</div>
            <div className='text-[11px] text-[#10B981] font-semibold flex items-center gap-1'>
              <CheckCircle2 className='w-3.5 h-3.5' />
              <span>SHA-256 Passed</span>
            </div>
            <div className='text-[9px] text-[#777777] break-all'>hash: 9f4a12ec84b301aef02...</div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className='pt-4 border-t border-[#2A2A2A] space-y-2'>
          <button
            onClick={() => {
              onShowToast('Spread Approved', 'Pages 18–19 signed off for tone layer.');
              onClose();
            }}
            className='w-full py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer'
          >
            Sign-off Master Spread
          </button>
          <button
            onClick={onClose}
            className='w-full py-2 bg-[#2A2A2A] hover:bg-[#333333] text-xs font-semibold text-[#CCCCCC] rounded-lg transition-colors cursor-pointer'
          >
            Close Workbench
          </button>
        </div>
      </div>
    </>
  );
};
