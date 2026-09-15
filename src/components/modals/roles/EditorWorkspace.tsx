import React from 'react';
import {
  MessageSquare,
  MousePointer2,
  CheckCircle2,
  XCircle,
  History,
  AlertCircle,
} from 'lucide-react';

interface EditorWorkspaceProps {
  onShowToast: (title: string, desc: string) => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ onShowToast }) => {
  return (
    <>
      {/* Center: Annotation Canvas Area */}
      <div className='flex-1 bg-[#121212] relative overflow-auto flex items-center justify-center p-8 custom-scrollbar'>
        {/* Floating Toolbar for Editor */}
        <div className='absolute top-6 left-6 bg-[#1E1E1E]/90 backdrop-blur-md border border-[#333333] rounded-xl flex flex-col p-1.5 gap-1.5 z-10 shadow-xl'>
          <button
            className='p-2 rounded-lg text-[#F97316] bg-[#333333] hover:bg-[#444444] transition-colors tooltip cursor-pointer'
            title='Select Tool'
          >
            <MousePointer2 className='w-4 h-4' />
          </button>
          <button
            className='p-2 rounded-lg text-[#888888] hover:text-white hover:bg-[#333333] transition-colors tooltip cursor-pointer'
            title='Draw Annotation Box'
          >
            <MessageSquare className='w-4 h-4' />
          </button>
        </div>

        {/* Mocking the Artwork with Annotation */}
        <div className='relative shadow-2xl border border-[#333333] rounded-lg overflow-hidden bg-black max-w-full'>
          <img
            src='https://lh3.googleusercontent.com/aida-public/AB6AXuBRF-X_pK-VNA-EDpW2TbENZXn5jBdsCJEViFUEfD1-cL_s6PpvrNV7Br-yvSJJP7XpLx-Q6po_dSRvBycNhUkNoZrpxI6pCLfmSiu3GY9sfOpdOlnvjkYYCL0y61ttCJ5fLSmT1ICs8y7G9Q6Y5MOdvUJxx1VFnqyY8qN7YBUINiyVOxDKYSL905nG_GxVijlasleWGD3OZipKscljZThMLHG09TocsEdeAvvhlPimteBhQD9Wacq_qA'
            alt='Review Canvas'
            className='w-[700px] h-auto opacity-80 select-none'
          />

          {/* Mocked Editor Annotation Box */}
          <div className='absolute top-[35%] left-[25%] w-[140px] h-[120px] border-2 border-[#EF4444] bg-[#EF4444]/10 cursor-pointer group rounded-sm'>
            {/* Tooltip containing comment */}
            <div className='absolute -top-4 left-full ml-3 bg-white text-[#171717] text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity w-[200px] z-20 pointer-events-none before:absolute before:top-6 before:-left-1.5 before:w-3 before:h-3 before:bg-white before:rotate-45'>
              <div className='flex items-center gap-1.5 font-bold mb-1'>
                <AlertCircle className='w-3.5 h-3.5 text-[#EF4444]' />
                <span className='text-[#EF4444]'>Fix Required</span>
              </div>
              <p className='leading-relaxed font-medium'>
                "Phối cảnh góc tòa nhà này đang bị lệch tụ, làm hỏng tỉ lệ nhân vật."
              </p>
              <div className='text-[9px] font-mono text-[#888888] mt-2 pt-2 border-t border-[#E7E7E7]'>
                - Editor Tatsuki F. (10m ago)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Approval & Version Control */}
      <div className='w-72 bg-[#1A1A1A] border-l border-[#2A2A2A] p-5 flex flex-col justify-between overflow-y-auto'>
        <div>
          <div className='flex items-center gap-2 mb-6'>
            <History className='w-4 h-4 text-[#888888]' />
            <h4 className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
              Version History
            </h4>
          </div>

          {/* Timeline UI */}
          <div className='space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-[#333333]'>
            {/* V2 (Current) */}
            <div className='relative pl-8'>
              <div className='absolute left-1 top-1.5 w-3.5 h-3.5 rounded-full bg-[#F97316] ring-4 ring-[#1A1A1A]'></div>
              <div className='bg-[#242424] p-3 rounded-lg border border-[#F97316] shadow-md'>
                <div className='flex justify-between items-center mb-1'>
                  <span className='text-xs font-bold text-white'>v2.0 (Current)</span>
                  <span className='text-[9px] text-[#888888] font-mono'>10m ago</span>
                </div>
                <div className='text-[10px] text-[#A3A3A3]'>Inker applied perspective fixes.</div>
              </div>
            </div>

            {/* V1 (Previous) */}
            <div className='relative pl-8 group cursor-pointer'>
              <div className='absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-[#555555] group-hover:bg-[#888888] ring-4 ring-[#1A1A1A] transition-colors'></div>
              <div className='bg-[#1E1E1E] p-3 rounded-lg border border-[#333333] group-hover:border-[#555555] transition-colors opacity-70 group-hover:opacity-100'>
                <div className='flex justify-between items-center mb-1'>
                  <span className='text-xs font-medium text-[#E7E7E7]'>v1.0 (Rough Pencil)</span>
                  <span className='text-[9px] text-[#888888] font-mono'>Yesterday</span>
                </div>
                <div className='text-[10px] text-[#888888]'>Initial draft submitted.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Approval Actions */}
        <div className='pt-6 mt-6 border-t border-[#2A2A2A] space-y-2.5 shrink-0'>
          <button
            onClick={() => onShowToast('Approved', 'Art approved. Moving to Lettering stage.')}
            className='w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg'
          >
            <CheckCircle2 className='w-4 h-4' /> Approve Artwork
          </button>
          <button
            onClick={() => onShowToast('Changes Requested', 'Notification sent to Inker.')}
            className='w-full py-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer'
          >
            <XCircle className='w-4 h-4' /> Request Changes
          </button>
        </div>
      </div>
    </>
  );
};
