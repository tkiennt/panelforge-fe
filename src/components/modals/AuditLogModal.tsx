import React from 'react';
import { X, ShieldCheck, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { ProvenanceLogItem } from '../../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ProvenanceLogItem[];
  onShowToast: (title: string, desc: string) => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onShowToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='w-4 h-4 text-[#059669]' />
            <div>
              <h3 className='font-display font-bold text-base text-[#171717]'>
                Full Cryptographic Provenance Audit Log
              </h3>
              <div className='text-[10px] font-mono text-[#888888]'>
                SHA-256 IMMUTABLE PIPELINE LEDGER
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs font-mono'>
          <div className='p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl text-[#059669] flex items-center justify-between'>
            <span className='flex items-center gap-2 font-semibold'>
              <CheckCircle className='w-4 h-4' />
              All Chapter 5 Hashes Cryptographically Verified
            </span>
            <span className='text-[10px] bg-white px-2 py-0.5 rounded border border-[#10B981]/40'>
              ECDSA-P256
            </span>
          </div>

          <div className='divide-y divide-[#E7E7E7] border border-[#E7E7E7] rounded-xl overflow-hidden bg-[#FAF8F4]'>
            {logs.map((log) => (
              <div key={log.id} className='p-3.5 space-y-1 hover:bg-white transition-colors'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#171717]'>{log.actor}</span>
                  <span className='text-[#888888] text-[10px]'>{log.timeAgo}</span>
                </div>
                <p className='text-[11px] text-[#555555] font-sans leading-relaxed'>
                  {log.details}
                </p>
                <div className='flex items-center justify-between pt-1 text-[10px]'>
                  <span className='text-[#888888] bg-white px-1.5 py-0.5 rounded border border-[#E7E7E7]'>
                    {log.hash}
                  </span>
                  <span className={`font-semibold px-2 py-0.2 rounded ${log.statusTagColor}`}>
                    {log.statusTag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between shrink-0'>
          <button
            onClick={() => {
              onShowToast('Manifest Exported', 'Downloaded signed SHA-256 JSON provenance ledger.');
            }}
            className='px-3.5 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer'
          >
            <Download className='w-3.5 h-3.5' />
            <span>Export Signed JSON Ledger</span>
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
