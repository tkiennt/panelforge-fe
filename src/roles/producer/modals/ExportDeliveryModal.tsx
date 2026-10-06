import React, { useState } from 'react';
import {
  X,
  Download,
  FileCheck,
  Printer,
  Smartphone,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { MangaProject } from '@/types';

interface ExportDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: MangaProject;
  onShowToast: (title: string, desc: string) => void;
}

export const ExportDeliveryModal: React.FC<ExportDeliveryModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  onShowToast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<
    'tankobon' | 'webtoon' | 'cbz' | 'provenance'
  >('tankobon');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleStartExport = () => {
    setExporting(true);
    setProgress(15);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setExporting(false);
          onShowToast(
            'Export Complete',
            `${activeProject?.title || 'Project'} exported as ${selectedFormat.toUpperCase()} package.`,
          );
          onClose();
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Download className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Export Delivery Package
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form Content */}
        <div className='p-6 space-y-5'>
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Select Output Specification
            </label>
            <div className='space-y-2.5'>
              {/* Option 1: Tankōbon Print Master */}
              <div
                onClick={() => setSelectedFormat('tankobon')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedFormat === 'tankobon'
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E7E7E7] bg-[#FAF8F4] hover:bg-white'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white border border-[#E7E7E7] flex items-center justify-center text-[#F97316]'>
                    <Printer className='w-5 h-5' />
                  </div>
                  <div>
                    <div className='text-xs font-bold text-[#171717]'>
                      Tankōbon Master (B5 • 600 DPI CMYK)
                    </div>
                    <div className='text-[11px] text-[#555555]'>
                      Kodansha/Shueisha press-ready PDF with bleed &amp; trim registers
                    </div>
                  </div>
                </div>
                <input
                  type='radio'
                  checked={selectedFormat === 'tankobon'}
                  onChange={() => setSelectedFormat('tankobon')}
                  className='accent-[#F97316]'
                />
              </div>

              {/* Option 2: Digital Webtoon Infinite Scroll */}
              <div
                onClick={() => setSelectedFormat('webtoon')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedFormat === 'webtoon'
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E7E7E7] bg-[#FAF8F4] hover:bg-white'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white border border-[#E7E7E7] flex items-center justify-center text-[#0EA5E9]'>
                    <Smartphone className='w-5 h-5' />
                  </div>
                  <div>
                    <div className='text-xs font-bold text-[#171717]'>
                      Webtoon Mobile Vertical Slices
                    </div>
                    <div className='text-[11px] text-[#555555]'>
                      800px width continuous vertical format for digital apps
                    </div>
                  </div>
                </div>
                <input
                  type='radio'
                  checked={selectedFormat === 'webtoon'}
                  onChange={() => setSelectedFormat('webtoon')}
                  className='accent-[#F97316]'
                />
              </div>

              {/* Option 3: CBZ E-Reader Archive */}
              <div
                onClick={() => setSelectedFormat('cbz')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedFormat === 'cbz'
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E7E7E7] bg-[#FAF8F4] hover:bg-white'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white border border-[#E7E7E7] flex items-center justify-center text-[#8B5CF6]'>
                    <BookOpen className='w-5 h-5' />
                  </div>
                  <div>
                    <div className='text-xs font-bold text-[#171717]'>
                      Digital Comic Archive (CBZ / EPUB3)
                    </div>
                    <div className='text-[11px] text-[#555555]'>
                      Lossless PNG package with Right-to-Left (RTL) reading metadata
                    </div>
                  </div>
                </div>
                <input
                  type='radio'
                  checked={selectedFormat === 'cbz'}
                  onChange={() => setSelectedFormat('cbz')}
                  className='accent-[#F97316]'
                />
              </div>

              {/* Option 4: Cryptographic Provenance Manifest */}
              <div
                onClick={() => setSelectedFormat('provenance')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedFormat === 'provenance'
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E7E7E7] bg-[#FAF8F4] hover:bg-white'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-lg bg-white border border-[#E7E7E7] flex items-center justify-center text-[#10B981]'>
                    <ShieldCheck className='w-5 h-5' />
                  </div>
                  <div>
                    <div className='text-xs font-bold text-[#171717]'>
                      SHA-256 Provenance &amp; AI Vector Manifest
                    </div>
                    <div className='text-[11px] text-[#555555]'>
                      Signed cryptographic audit JSON with LoRA checkpoint hashes
                    </div>
                  </div>
                </div>
                <input
                  type='radio'
                  checked={selectedFormat === 'provenance'}
                  onChange={() => setSelectedFormat('provenance')}
                  className='accent-[#F97316]'
                />
              </div>
            </div>
          </div>

          {/* Progress Bar when exporting */}
          {exporting && (
            <div className='p-4 bg-[#F8F6F0] rounded-xl border border-[#E7E7E7] space-y-2'>
              <div className='flex items-center justify-between text-xs font-mono'>
                <span className='flex items-center gap-2 font-semibold text-[#171717]'>
                  <Loader2 className='w-4 h-4 animate-spin text-[#F97316]' />
                  Compiling 600 DPI separations...
                </span>
                <span className='font-bold text-[#F97316]'>{progress}%</span>
              </div>
              <div className='w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden'>
                <div
                  className='bg-[#F97316] h-full transition-all duration-300'
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
          <button
            onClick={onClose}
            className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
          >
            Cancel
          </button>
          <button
            onClick={handleStartExport}
            disabled={exporting}
            className='px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
          >
            <Download className='w-4 h-4' />
            <span>{exporting ? 'Generating Master Package...' : 'Download Master Package'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
