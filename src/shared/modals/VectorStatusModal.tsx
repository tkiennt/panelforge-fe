import React from 'react';
import {
  X,
  Sparkles,
  Cpu,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface VectorStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc: string) => void;
}

export const VectorStatusModal: React.FC<VectorStatusModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-md bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center'>
              <Sparkles className='w-3.5 h-3.5' />
            </div>
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Manga LoRA Engine v4.2 Status
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-4'>
          <div className='p-3.5 bg-[#F3E8FF]/40 rounded-xl border border-[#8B5CF6]/30 flex items-center justify-between'>
            <div>
              <div className='text-xs font-bold text-[#6D28D9] font-mono uppercase'>
                Active Checkpoint
              </div>
              <div className='text-sm font-bold text-[#171717] mt-0.5'>
                V-Rockstar-v4.2-safetensors
              </div>
            </div>
            <span className='px-2.5 py-0.5 rounded bg-[#10B981] text-white text-xs font-mono font-bold'>
              SYNCHRONIZED
            </span>
          </div>

          {/* Telemetry Metrics */}
          <div className='grid grid-cols-2 gap-3 text-xs font-mono'>
            <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7]'>
              <span className='text-[#888888] block text-xs uppercase'>
                Continuity Vector Drift
              </span>
              <strong className='text-base text-[#171717] mt-0.5 block'>&lt; 0.04 σ</strong>
              <span className='text-xs text-[#059669] font-semibold'>Zero Anomaly</span>
            </div>

            <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7]'>
              <span className='text-[#888888] block text-xs uppercase'>
                Prompt Inversion Latency
              </span>
              <strong className='text-base text-[#171717] mt-0.5 block'>1.18s / cut</strong>
              <span className='text-xs text-[#059669] font-semibold'>Sub-second ready</span>
            </div>

            <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7]'>
              <span className='text-[#888888] block text-xs uppercase'>Model Anchors Enforced</span>
              <strong className='text-base text-[#171717] mt-0.5 block'>14 Characters</strong>
              <span className='text-xs text-[#555555]'>Series Bible Locked</span>
            </div>

            <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7]'>
              <span className='text-[#888888] block text-xs uppercase'>
                Screentone Density Spec
              </span>
              <strong className='text-base text-[#171717] mt-0.5 block'>600 DPI Dot Screen</strong>
              <span className='text-xs text-[#555555]'>Moiré-free verified</span>
            </div>
          </div>

          {/* Model Anchors List */}
          <div>
            <div className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Primary Character Anchors
            </div>
            <div className='space-y-1.5 text-xs'>
              <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] flex items-center justify-between font-mono'>
                <span className='text-[#171717] font-semibold'>Zor (Cybernetic Renegade)</span>
                <span className='text-[#6D28D9] font-bold'>Weight: 0.85 (99.4% Match)</span>
              </div>
              <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] flex items-center justify-between font-mono'>
                <span className='text-[#171717] font-semibold'>
                  Stanley &ldquo;Stan&rdquo; (Netrunner)
                </span>
                <span className='text-[#6D28D9] font-bold'>Weight: 0.75 (98.8% Match)</span>
              </div>
              <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] flex items-center justify-between font-mono'>
                <span className='text-[#171717] font-semibold'>Militech Titan-X Cyber-arm</span>
                <span className='text-[#6D28D9] font-bold'>Weight: 0.95 (99.7% Match)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
          <button
            onClick={() => {
              onShowToast('Vector Re-indexed', 'Refreshed 1,248 LoRA embeddings across Chapter 5.');
              onClose();
            }}
            className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer'
          >
            <RefreshCw className='w-3.5 h-3.5' />
            <span>Re-calibrate Model Anchors</span>
          </button>
          <button
            onClick={onClose}
            className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
